import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isDeepStrictEqual } from 'node:util';
import {
  calculateGameMetadata,
  calculatePlayerGameResultMetadata,
  GameMetadataError,
} from '@sfl/domain';
import mongoose, { Model } from 'mongoose';
import { FileLoggerService } from 'src/shared/services/logger.service';
import {
  EnumGameStatus,
  Game,
  IGame,
  IGameMetadata,
} from '../games/game.schema';
import { Player } from '../players';
import {
  GameOverrides,
  PlayerMetadataService,
  TransactionService,
} from '../statistics';

/** Games per transaction: short transactions, not one giant one (ADR 0017, S3.5). */
const GAMES_PER_TRANSACTION = 10;

export interface RecalculateGamesOptions {
  /** Without it the run only reports what would change (S3.14). */
  apply: boolean;
}

/** Only the rules of a game; a failed write is a `failedBatches` entry. */
export type SkipReason =
  'CAPTAINS_COUNT' | 'UNKNOWN_TEAM' | 'MISSING_POSITION' | 'INVALID_GAME';

export interface SkippedGame {
  gameId: string;
  season: number;
  number: number;
  reason: SkipReason;
  message: string;
}

export interface FailedBatch {
  gameIds: string[];
  error: string;
}

export interface RecalculateGamesReport {
  applied: boolean;
  gamesTotal: number;
  /** Games whose stored metadata is changed (applied) or would be (dry run). */
  gamesChanged: number;
  /** Players whose season or career totals are, or would be, changed. */
  playersChanged: number;
  skipped: SkippedGame[];
  failedBatches: FailedBatch[];
  seasons: { seasonId: number; playersChanged: number }[];
}

interface PlannedGame {
  id: string;
  season: number;
  number: number;
  metadata: IGameMetadata;
}

const plain = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

@Injectable()
export class MigrationsService {
  constructor(
    @InjectModel(Player.name)
    private playerModel: Model<Player>,

    @InjectModel(Game.name)
    private gameModel: Model<IGame>,

    private readonly playerMetadata: PlayerMetadataService,

    private readonly transactions: TransactionService,

    private readonly logger: FileLoggerService,
  ) {}

  /**
   * S3.14: recalculates the stored metadata of every game by the current rules
   * (`@sfl/domain`), then the season and career totals of the players. The
   * statuses of the games are never changed (GLOSSARY, ADR 0015). A game that
   * fails the rules is skipped with the reason. Idempotent. Games are written
   * in batches, one short transaction per batch; the players of a season are
   * fixed by the verification of S3.27 (one short transaction).
   */
  async recalculateGames({
    apply,
  }: RecalculateGamesOptions): Promise<RecalculateGamesReport> {
    const games = await this.gameModel
      .find()
      .sort({ season: 1, number: 1 })
      .lean()
      .exec();

    const skipped: SkippedGame[] = [];
    const changed: PlannedGame[] = [];

    for (const game of games) {
      const id = String(game._id);
      const skip = (reason: SkipReason, message: string) =>
        skipped.push({
          gameId: id,
          season: game.season,
          number: game.number,
          reason,
          message,
        });

      let metadata: IGameMetadata;
      try {
        if (!Array.isArray(game.statistics) || !Array.isArray(game.teams)) {
          throw new TypeError('The game has no teams or statistics');
        }
        if (
          game.status === EnumGameStatus.Published &&
          game.statistics.some(stat => !stat.position)
        ) {
          skip(
            'MISSING_POSITION',
            'A published game needs a position of every player',
          );
          continue;
        }

        const input = { ...game, id };
        const gameMetadata = calculateGameMetadata(input);
        const players: IGameMetadata['players'] = {};
        for (const playerId of new Set(
          game.statistics.map(stat => String(stat.playerId)),
        )) {
          players[playerId] = calculatePlayerGameResultMetadata(playerId, {
            ...input,
            metadata: gameMetadata,
          });
        }
        metadata = { ...gameMetadata, players };
      } catch (error) {
        if (error instanceof GameMetadataError) {
          skip(error.code, error.message);
        } else if (error instanceof TypeError) {
          skip('INVALID_GAME', error.message);
        } else {
          throw error;
        }
        continue;
      }

      if (isDeepStrictEqual(plain(game.metadata ?? {}), plain(metadata))) {
        continue;
      }
      changed.push({
        id,
        season: game.season,
        number: game.number,
        metadata,
      });
    }

    let written = changed;
    const failedBatches: FailedBatch[] = [];
    if (apply) {
      const result = await this.writeGames(changed);
      written = result.written;
      failedBatches.push(...result.failedBatches);
      if (changed.length && !written.length) {
        throw new InternalServerErrorException({
          statusCode: 500,
          message: 'No batch of games could be written',
          failedBatches,
        });
      }
    }

    const seasons = [...new Set(games.map(game => game.season))].sort(
      (a, b) => a - b,
    );
    const players = new Set<string>();
    const bySeason: RecalculateGamesReport['seasons'] = [];
    for (const season of seasons) {
      // A dry run has not written the games: the verification sees them as planned
      const overrides: GameOverrides | undefined = apply
        ? undefined
        : new Map(
            changed
              .filter(game => game.season === season)
              .map(game => [game.id, { metadata: game.metadata }]),
          );
      const report = await this.playerMetadata.verifySeason(
        season,
        apply,
        overrides,
      );
      report.differences.forEach(({ playerId }) => players.add(playerId));
      bySeason.push({
        seasonId: season,
        playersChanged: report.differences.length,
      });
    }

    this.logger.info('Recalculate the metadata of the games', {
      apply,
      gamesTotal: games.length,
      gamesChanged: written.length,
      skipped: skipped.length,
      failedBatches: failedBatches.length,
    });

    return {
      applied: apply,
      gamesTotal: games.length,
      gamesChanged: written.length,
      playersChanged: players.size,
      skipped,
      failedBatches,
      seasons: bySeason,
    };
  }

  private async writeGames(
    changed: PlannedGame[],
  ): Promise<{ written: PlannedGame[]; failedBatches: FailedBatch[] }> {
    const written: PlannedGame[] = [];
    const failedBatches: FailedBatch[] = [];
    for (let i = 0; i < changed.length; i += GAMES_PER_TRANSACTION) {
      const batch = changed.slice(i, i + GAMES_PER_TRANSACTION);
      try {
        await this.transactions.run(async session => {
          await this.gameModel.bulkWrite(
            batch.map(game => ({
              updateOne: {
                filter: { _id: game.id },
                update: { $set: { metadata: game.metadata } },
              },
            })) as never,
            { session },
          );
        });
        written.push(...batch);
      } catch (error) {
        this.logger.error('Failed to write a batch of games', { error });
        failedBatches.push({
          gameIds: batch.map(game => game.id),
          error: (error instanceof Error
            ? `${error.name}: ${error.message}`
            : String(error)
          ).slice(0, 200),
        });
      }
    }
    return { written, failedBatches };
  }

  async convertPlayerUserToUUID(): Promise<Player[]> {
    const cursor = this.playerModel.find().cursor();

    await cursor.eachAsync(async doc => {
      doc.user = new mongoose.Types.UUID(doc.user.toString());
      return await doc.save();
    });

    return await this.playerModel.find().exec();
  }
}
