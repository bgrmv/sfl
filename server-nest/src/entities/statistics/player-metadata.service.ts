import { createHash } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  accumulatePlayerCareerMetadata,
  accumulatePlayerSeasonMetadata,
  applyGame,
  compareMetadata,
  IGameMetadata,
  IPlayerMetadata,
  MetadataDifference,
  METADATA_DEFAULT,
  rebuildGameSequence,
  revertGame,
  SeasonGameInput,
} from '@sfl/domain';
import { ClientSession, FlattenMaps, Model, Types } from 'mongoose';
import { FileLoggerService } from 'src/shared/services/logger.service';
import { EnumGameStatus, Game, IGame } from '../games/game.schema';
import { Player } from '../players/players.schema';
import { TransactionService } from './transaction.service';

/** A game as the statistics see it: only a published game has a contribution. */
export interface GameSnapshot {
  id: string;
  season: number;
  status: EnumGameStatus;
  metadata: IGameMetadata;
}

export interface GameChange {
  /** The game before the change; `null` for a created game. */
  before?: GameSnapshot | null;
  /** The game after the change; `null` for a deleted game. */
  after?: GameSnapshot | null;
}

export interface SeasonVerificationReport {
  seasonId: number;
  playersCount: number;
  applied: boolean;
  differences: { playerId: string; differences: MetadataDifference[] }[];
}

const MAX_REPAIR_ATTEMPTS = 3;

class SeasonChangedError extends Error {}

const freshSeason = (stored?: Partial<IPlayerMetadata>): IPlayerMetadata => {
  const base = structuredClone(METADATA_DEFAULT) as IPlayerMetadata;
  return {
    ...base,
    ...stored,
    ancientRatingSystem: {
      ...base.ancientRatingSystem,
      ...stored?.ancientRatingSystem,
    },
    positionalRatingSystem: {
      ...base.positionalRatingSystem,
      ...stored?.positionalRatingSystem,
    },
  };
};

const careerOf = (seasons: Record<string, IPlayerMetadata>): IPlayerMetadata =>
  // The keys are years: the integer keys go in ascending order
  Object.values(seasons).reduce(
    (career, season) => accumulatePlayerCareerMetadata(career, season),
    METADATA_DEFAULT,
  );

/**
 * Recalculation of the player season and career metadata from the published
 * games. Depends only on the models, so both `games` and `players` use it
 * without depending on each other (S3.3).
 */
@Injectable()
export class PlayerMetadataService {
  constructor(
    @InjectModel(Player.name)
    private playerModel: Model<Player>,

    @InjectModel(Game.name)
    private gameModel: Model<IGame>,

    private readonly logger: FileLoggerService,

    private readonly transactions: TransactionService,
  ) {}

  /**
   * Changes the statistics of the players of one game by the contribution of
   * the game, not by a recalculation of the season (ADR 0017): the old
   * version of the game is subtracted, the new one is added, the order
   * dependent fields are rebuilt for the affected players only. Idempotent:
   * a game already counted (is in `gamesIds`) is not added twice.
   */
  async applyGameChange(
    { before, after }: GameChange,
    session?: ClientSession,
  ): Promise<void> {
    const oldGame = before?.status === EnumGameStatus.Published ? before : null;
    const newGame = after?.status === EnumGameStatus.Published ? after : null;
    const playerIds = new Set([
      ...Object.keys(oldGame?.metadata?.players ?? {}),
      ...Object.keys(newGame?.metadata?.players ?? {}),
    ]);
    const seasons = new Set(
      [oldGame?.season, newGame?.season].filter(s => s !== undefined),
    );

    for (const playerId of playerIds) {
      const player = await this.playerModel
        .findById(playerId, { metadata: 1 })
        .session(session ?? null)
        .lean()
        .exec();
      if (!player) {
        this.logger.error('Player of the game is not found', { playerId });
        continue;
      }

      const stored = (player.metadata?.bySeason ?? {}) as Record<
        string,
        IPlayerMetadata
      >;
      const bySeason: Record<string, IPlayerMetadata> = { ...stored };
      const $set: Record<string, unknown> = {};

      for (const season of seasons) {
        const updated = await this.applyToSeason(
          playerId,
          season,
          freshSeason(stored[season]),
          oldGame,
          newGame,
          session,
        );
        bySeason[season] = updated;
        $set[`metadata.bySeason.${season}`] = updated;
      }

      $set['metadata.byCareer'] = careerOf(bySeason);
      await this.playerModel.updateOne(
        { _id: playerId },
        { $set },
        { session },
      );
    }
  }

  private async applyToSeason(
    playerId: string,
    season: number,
    original: IPlayerMetadata,
    oldGame: GameSnapshot | null,
    newGame: GameSnapshot | null,
    session?: ClientSession,
  ): Promise<IPlayerMetadata> {
    let result = original;
    const counted = new Set(original.gamesIds);
    const input = (game: GameSnapshot): SeasonGameInput => ({
      id: game.id,
      metadata: game.metadata,
    });

    const before = oldGame?.season === season ? oldGame : null;
    const beforeInput = before?.metadata?.players?.[playerId];
    if (before && beforeInput && counted.has(before.id)) {
      result = revertGame(result, beforeInput, input(before));
      counted.delete(before.id);
    }

    const after = newGame?.season === season ? newGame : null;
    const afterInput = after?.metadata?.players?.[playerId];
    if (after && afterInput && !counted.has(after.id)) {
      result = applyGame(result, afterInput, input(after));
      counted.add(after.id);
    }

    // Only the games that are counted, in the order of their numbers
    const games = counted.size
      ? await (this.gameModel
          .find(
            { _id: { $in: [...counted] }, season },
            {
              number: 1,
              'metadata.captainFirstDraft': 1,
              'metadata.captainSecondDraft': 1,
              [`metadata.players.${playerId}`]: 1,
            },
          )
          .sort({ number: 1 })
          .session(session ?? null)
          .lean()
          .exec() as unknown as Promise<
          { _id: Types.ObjectId; metadata: IGameMetadata }[]
        >)
      : [];

    const rebuilt = rebuildGameSequence(
      result,
      games
        .filter(game => game.metadata?.players?.[playerId])
        .map(game => ({
          id: String(game._id),
          metadata: game.metadata,
          player: game.metadata.players[playerId],
        })),
    );

    // Stored shape of the full calculation: a season without games is the
    // default (with `totalPoints: 0`), a season with games has no `totalPoints`
    if (!counted.size) return freshSeason();
    const stored: Partial<IPlayerMetadata> & { totalPoints?: number } = {
      ...rebuilt,
    };
    delete stored.totalPoints;
    return stored as IPlayerMetadata;
  }

  /**
   * Calculates the season of every player from scratch (the pure functions of
   * `@sfl/domain` over the published games). Reads without a session.
   */
  async calculateSeasonFromScratch(
    season: number,
  ): Promise<Map<string, IPlayerMetadata>> {
    const games = await this.gameModel
      .find(
        { season, status: EnumGameStatus.Published },
        { number: 1, metadata: 1 },
      )
      .sort({ number: 1 })
      .lean()
      .exec();

    const result = new Map<string, IPlayerMetadata>();
    for (const game of games) {
      for (const [playerId, input] of Object.entries(
        game.metadata?.players ?? {},
      )) {
        if (!input) continue;
        result.set(
          playerId,
          accumulatePlayerSeasonMetadata(
            result.get(playerId) ?? METADATA_DEFAULT,
            input,
            { id: String(game._id), metadata: game.metadata },
          ),
        );
      }
    }
    return result;
  }

  /**
   * Verifies the stored statistics of the season against a calculation from
   * scratch; with `apply` writes the calculated values (one `bulkWrite` in a
   * short transaction), if the games of the season did not change meanwhile.
   */
  async verifySeason(
    season: number,
    apply = false,
  ): Promise<SeasonVerificationReport> {
    for (let attempt = 1; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
      const fingerprint = await this.seasonFingerprint(season);
      const calculated = await this.calculateSeasonFromScratch(season);
      const playerIds = await this.findSeasonPlayerIds(season);
      const players = await this.playerModel
        .find({ _id: { $in: playerIds } }, { metadata: 1 })
        .lean()
        .exec();

      const differences: SeasonVerificationReport['differences'] = [];
      const fixes = new Map<string, IPlayerMetadata>();

      for (const player of players) {
        const playerId = String(player._id);
        const stored = (player.metadata?.bySeason ?? {}) as Record<
          string,
          IPlayerMetadata
        >;
        const season$ = calculated.get(playerId) ?? freshSeason();
        const career = careerOf({ ...stored, [season]: season$ });

        const found = [
          ...compareMetadata(stored[season], season$, `bySeason.${season}`),
          ...compareMetadata(player.metadata?.byCareer, career, 'byCareer'),
        ];
        if (!found.length) continue;

        differences.push({ playerId, differences: found });
        fixes.set(playerId, season$);
      }

      const report = {
        seasonId: season,
        playersCount: players.length,
        applied: false,
        differences,
      };
      if (!apply || !fixes.size) return report;

      try {
        await this.transactions.run(async session => {
          const now = await this.seasonFingerprint(season, session);
          if (now !== fingerprint) throw new SeasonChangedError();

          // The players are read again inside the transaction: a game of
          // another season saved meanwhile must not be lost in the career
          const fresh = await this.playerModel
            .find({ _id: { $in: [...fixes.keys()] } }, { metadata: 1 })
            .session(session)
            .lean()
            .exec();
          const writes = fresh.map(player => {
            const season$ = fixes.get(String(player._id));
            const bySeason = (player.metadata?.bySeason ?? {}) as Record<
              string,
              IPlayerMetadata
            >;
            return {
              updateOne: {
                filter: { _id: player._id },
                update: {
                  $set: {
                    [`metadata.bySeason.${season}`]: season$,
                    'metadata.byCareer': careerOf({
                      ...bySeason,
                      [season]: season$,
                    }),
                  },
                },
              },
            };
          });
          await this.playerModel.bulkWrite(writes as never, { session });
        });
        return { ...report, applied: true };
      } catch (error) {
        if (!(error instanceof SeasonChangedError)) throw error;
        this.logger.info('The season changed during the verification', {
          season,
          attempt,
        });
      }
    }

    throw new ConflictException(
      'The games of the season keep changing, try again later',
    );
  }

  /** A hash of the ids and the last changes of the games of the season: any change shows. */
  private async seasonFingerprint(
    season: number,
    session?: ClientSession,
  ): Promise<string> {
    const rows = await this.gameModel.aggregate(
      [
        { $match: { season } },
        { $sort: { _id: 1 } },
        { $project: { updatedAt: 1 } },
      ],
      { session },
    );
    const hash = createHash('sha1');
    for (const row of rows) {
      hash.update(
        `${row._id}:${row.updatedAt ? new Date(row.updatedAt).toISOString() : ''};`,
      );
    }
    return `${rows.length}:${hash.digest('hex')}`;
  }

  async recalculatePlayersSeasonAndCareerMetadata(
    season: number,
    playerIds: string[],
    session?: ClientSession,
  ): Promise<void> {
    const failed: { playerId: string; error: string }[] = [];

    // Sequentially and awaited: the caller gets the response only when done.
    for (const playerId of playerIds) {
      try {
        await this.recalculateSeasonMetadata(playerId, season, session);
      } catch (error) {
        // Inside a transaction: fail fast and keep the original error, so withTransaction
        // can see TransientTransactionError and retry; the transaction is dead anyway
        if (session) throw error;
        failed.push({
          playerId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (failed.length) {
      this.logger.error('Failed to recalculate season metadata for players', {
        season,
        failed,
      });

      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'Failed to recalculate metadata for some players',
        failed,
      });
    }
  }

  /**
   * Everybody who has a game or stored metadata in the season, so a full
   * recalculation also clears the players whose games were removed.
   */
  async findSeasonPlayerIds(
    season: number,
    session?: ClientSession,
  ): Promise<string[]> {
    const fromGames = await this.gameModel
      .distinct('statistics.playerId', { season })
      .session(session ?? null)
      .exec();
    const withMetadata = await this.playerModel
      .find({ [`metadata.bySeason.${season}`]: { $exists: true } }, { _id: 1 })
      .session(session ?? null)
      .lean()
      .exec();

    return [
      ...new Set([
        ...fromGames.map(id => String(id)),
        ...withMetadata.map(({ _id }) => String(_id)),
      ]),
    ];
  }

  private async recalculateSeasonMetadata(
    playerId: string,
    season: number,
    session?: ClientSession,
  ): Promise<void> {
    this.logger.info('Recalculate season metadata for player', {
      _id: playerId,
      season,
    });
    const seasonData = (await this.gameModel.aggregate(
      [
        {
          $sort: {
            number: 1,
          },
        },
        {
          $match: {
            season,
            // Only a published game counts (GLOSSARY: Game status)
            status: EnumGameStatus.Published,
            [`metadata.players.${playerId}`]: {
              $exists: 1,
              $ne: null,
            },
          },
        },
      ],
      { maxTimeMS: 60000, allowDiskUse: true, session },
    )) as (IGame & { _id: Types.ObjectId })[];

    try {
      const seasonMetadata = seasonData
        .map(seasonGame => ({
          ...seasonGame,
          id: seasonGame._id.toString(),
        }))
        .reduce((curr, game) => {
          const playerMetadata = game.metadata.players[playerId];
          return accumulatePlayerSeasonMetadata(curr, playerMetadata, game);
        }, METADATA_DEFAULT);

      await this.playerModel.updateOne(
        { _id: playerId },
        { $set: { [`metadata.bySeason.${season}`]: seasonMetadata } },
        { session },
      );

      await this.recalculateCareerMetadata(playerId, session);
    } catch (error) {
      this.logger.error('Failed to recalculate season metadata for player', {
        _id: playerId,
        season,
        error,
      });

      throw error;
    }
  }

  protected async recalculateCareerMetadata(
    playerId: string,
    session?: ClientSession,
  ): Promise<void> {
    const seasonsMetadata: FlattenMaps<Record<number, IPlayerMetadata>> =
      (
        await this.playerModel
          .findById({ _id: playerId })
          .session(session ?? null)
          .exec()
      ).toJSON().metadata?.bySeason ?? {};

    try {
      const accumulatedPlayerCareerMetadata = Object.values(seasonsMetadata)
        // All numbers keys go in order
        // .sort(([seasonA], [seasonB]) => Number(seasonA) - Number(seasonB))
        // .map(([, metadata]) => metadata)
        .reduce((curr, seasonMetdata) => {
          return accumulatePlayerCareerMetadata(curr, seasonMetdata);
        }, METADATA_DEFAULT);

      await this.playerModel.updateOne(
        { _id: playerId },
        { $set: { 'metadata.byCareer': accumulatedPlayerCareerMetadata } },
        { session },
      );
    } catch (error) {
      this.logger.error('Failed to recalculate career metadata for player', {
        _id: playerId,
        error,
      });

      throw error;
    }
  }
}
