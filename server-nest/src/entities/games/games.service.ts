import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  calculateGameMetadata,
  calculatePlayerGameResultMetadata,
  GameMetadataError,
} from '@sfl/domain';
import { gameRuleViolations, GAME_RULE_MESSAGES } from '@sfl/schemas';
import { ClientSession, Model } from 'mongoose';
import { FileLoggerService } from 'src/shared/services/logger.service';
import {
  GameSnapshot,
  PlayerMetadataService,
  TransactionService,
} from '../statistics';
import {
  EnumGameStatus,
  Game,
  IGame,
  IGameMetadata,
  IPlayerGameResultMetadata,
} from './game.schema';

/** A list without a season is capped: a game weighs about 18 KB. */
export const DEFAULT_GAMES_LIMIT = 100;
export const MAX_GAMES_LIMIT = 500;

const toSnapshot = (
  game: {
    id?: string;
    _id?: unknown;
    season: number;
    status: IGame['status'];
    metadata?: IGameMetadata;
  } | null,
): GameSnapshot | null =>
  game
    ? {
        id: String(game._id ?? game.id),
        season: game.season,
        status: game.status,
        metadata: game.metadata,
      }
    : null;

@Injectable()
export class GamesService {
  constructor(
    @InjectModel(Game.name)
    private readonly gameModel: Model<IGame>,

    private readonly playerMetadata: PlayerMetadataService,

    private readonly transactions: TransactionService,

    private readonly logger: FileLoggerService,
  ) {}

  async findById(_id: string) {
    this.logger.info('Find game by id', { _id });
    return await this.gameModel.findById({ _id }).exec();
  }

  /**
   * Without a season the list is the newest first and capped (a game weighs
   * about 18 KB, the league has about 2 400 of them): `DEFAULT_GAMES_LIMIT`
   * unless the caller asks for less or more, up to `MAX_GAMES_LIMIT`.
   */
  async find(
    game: Partial<IGame>,
    { limit, offset }: { limit?: number; offset?: number } = {},
  ) {
    this.logger.info('Find games with', { ...game, limit, offset });
    const cap = limit ?? (game.season ? undefined : DEFAULT_GAMES_LIMIT);
    const query = this.gameModel
      .find({ ...game })
      // A season reads in the order of its Saturdays, the whole list newest first
      .sort(game.season ? { number: 1 } : { season: -1, number: -1 })
      .skip(offset ?? 0);
    return await (cap ? query.limit(cap) : query).exec();
  }

  /** The status `published` comes only from the confirmations (S10.35). */
  private assertNotPublished(game: { status?: string }) {
    if (game.status === EnumGameStatus.Published) {
      throw new BadRequestException(
        'A game is published by two confirmations, not by saving it',
      );
    }
  }

  async create(game: IGame) {
    this.logger.info('Create game', game);
    this.assertNotPublished(game);
    if (
      await this.gameModel.findOne({
        number: game.number,
        season: game.season,
      })
    ) {
      throw new ConflictException(
        'A game with this number and season already exists',
      );
    }

    try {
      // The game and the metadata of its players are saved together (S3.5)
      return await this.transactions.run(async session => {
        await this.gameModel.create([game], { session });
        const createdGame = await this.gameModel
          .findOne({
            number: game.number,
            season: game.season,
          })
          .session(session)
          .exec();

        if (!createdGame) {
          throw new InternalServerErrorException('Created game is not found');
        }

        return await this.runMetadataFlow(
          createdGame.toJSON({
            flattenObjectIds: false,
          }) as unknown as WithId<IGame>,
          session,
        );
      });
    } catch (error) {
      this.logger.error('Failed to create game', {
        season: game.season,
        number: game.number,
        error,
      });
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Unexpected error occurred');
    }
  }

  /** A published game is changed after a revoke, never in place. */
  private async assertEditable(_id: string, game: { status?: string }) {
    this.assertNotPublished(game);
    const stored = await this.gameModel.findById(_id).select('status').exec();
    if (!stored) throw new NotFoundException('Game is not found');
    if (stored.status === EnumGameStatus.Published) {
      throw new ConflictException(
        'Revoke the published game before changing it',
      );
    }
  }

  async update(_id: string, game: IGame) {
    this.logger.info('Update game', { _id });
    await this.assertEditable(_id, game);

    try {
      return await this.transactions.run(async session => {
        const before = await this.gameModel
          // A change of the content takes the confirmations back
          .findOneAndUpdate({ _id }, { ...game, confirmations: [] })
          .session(session)
          .exec();

        // Deleted by someone else since the check above
        if (!before) throw new NotFoundException('Game is not found');

        const updated = await this.gameModel
          .findById(_id)
          .session(session)
          .exec();

        return await this.runMetadataFlow(
          updated.toJSON({
            flattenObjectIds: false,
          }) as unknown as WithId<IGame>,
          session,
          toSnapshot(before),
        );
      });
    } catch (error) {
      this.logger.error('Failed to update game', { _id, error });
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Unexpected error occurred');
    }
  }

  async replace(_id: string, game: IGame) {
    await this.assertEditable(_id, game);
    try {
      return await this.transactions.run(async session => {
        const updatedGame = await this.gameModel
          .findOneAndReplace({ _id }, game)
          .session(session)
          .exec();

        if (!updatedGame) {
          throw new NotFoundException('Game is not found');
        }

        // Without `new: true` Mongoose returns the previous version of the game
        const replaced = await this.gameModel
          .findById(_id)
          .session(session)
          .exec();

        return await this.runMetadataFlow(
          replaced.toJSON({
            flattenObjectIds: false,
          }) as unknown as WithId<IGame>,
          session,
          toSnapshot(updatedGame),
        );
      });
    } catch (error) {
      this.logger.error('Failed to replace game', { _id, error });
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Unexpected error occurred');
    }
  }

  /**
   * A person confirms a draft as filled in correctly. The second confirmation of
   * another person publishes the game in the same transaction (S10.35).
   */
  async confirm(_id: string, accountId: string) {
    return await this.transactions.run(async session => {
      const game = await this.gameModel.findById(_id).session(session).exec();
      if (!game) throw new NotFoundException('Game is not found');
      if (game.status !== EnumGameStatus.Draft) {
        throw new ConflictException('Only a draft is confirmed');
      }
      if ((game.confirmations ?? []).some(c => c.accountId === accountId)) {
        throw new ConflictException('You have already confirmed this game');
      }

      // The rules of a published game: one captain per team, a position for everybody
      // Plain JSON: the ids of the teams and of the players are strings, as the rules expect
      const plain = JSON.parse(JSON.stringify(game.toJSON()));
      const violations = gameRuleViolations({
        status: EnumGameStatus.Published,
        teams: plain.teams,
        statistics: plain.statistics,
      });
      if (violations.length) {
        throw new BadRequestException(
          [...new Set(violations.map(v => GAME_RULE_MESSAGES[v.rule]))].join(
            '; ',
          ),
        );
      }

      const confirmations = [
        ...(game.confirmations ?? []).map(c => ({
          accountId: c.accountId,
          at: c.at,
        })),
        { accountId, at: new Date() },
      ];
      const published = new Set(confirmations.map(c => c.accountId)).size >= 2;

      const updated = await this.gameModel
        .findOneAndUpdate(
          { _id },
          {
            $set: {
              confirmations,
              ...(published ? { status: EnumGameStatus.Published } : {}),
            },
          },
          { returnDocument: 'after' },
        )
        .session(session)
        .exec();

      return await this.runMetadataFlow(
        updated.toJSON({ flattenObjectIds: false }) as unknown as WithId<IGame>,
        session,
        toSnapshot(game),
      );
    });
  }

  /** A person takes his own confirmation back; a published game becomes a draft again. */
  async unconfirm(_id: string, accountId: string) {
    return await this.transactions.run(async session => {
      const game = await this.gameModel.findById(_id).session(session).exec();
      if (!game) throw new NotFoundException('Game is not found');
      if (!(game.confirmations ?? []).some(c => c.accountId === accountId)) {
        throw new NotFoundException('You have not confirmed this game');
      }

      const updated = await this.gameModel
        .findOneAndUpdate(
          { _id },
          {
            $set: {
              confirmations: (game.confirmations ?? []).filter(
                c => c.accountId !== accountId,
              ),
              status: EnumGameStatus.Draft,
            },
          },
          { returnDocument: 'after' },
        )
        .session(session)
        .exec();

      return await this.runMetadataFlow(
        updated.toJSON({ flattenObjectIds: false }) as unknown as WithId<IGame>,
        session,
        toSnapshot(game),
      );
    });
  }

  /** The publication is taken back with a reason: a draft, no confirmations, out of the ratings. */
  async revoke(_id: string, accountId: string, reason: string) {
    return await this.transactions.run(async session => {
      const game = await this.gameModel.findById(_id).session(session).exec();
      if (!game) throw new NotFoundException('Game is not found');
      if (game.status !== EnumGameStatus.Published) {
        throw new ConflictException('Only a published game is revoked');
      }

      const updated = await this.gameModel
        .findOneAndUpdate(
          { _id },
          {
            $set: {
              status: EnumGameStatus.Draft,
              confirmations: [],
              revoked: { reason, accountId, at: new Date() },
            },
          },
          { returnDocument: 'after' },
        )
        .session(session)
        .exec();

      return await this.runMetadataFlow(
        updated.toJSON({ flattenObjectIds: false }) as unknown as WithId<IGame>,
        session,
        toSnapshot(game),
      );
    });
  }

  async delete(_id: string): Promise<boolean> {
    this.logger.info('Delete game', { _id });

    return await this.transactions.run(async session => {
      const game = await this.gameModel
        .findOneAndDelete({ _id })
        .session(session)
        .exec();

      if (!game) {
        throw new NotFoundException('Game is not found');
      }

      await this.playerMetadata.applyGameChange(
        { before: toSnapshot(game), after: null },
        session,
      );

      return true;
    });
  }

  private async runMetadataFlow(
    game: WithId<IGame>,
    session?: ClientSession,
    before: GameSnapshot | null = null,
  ): Promise<WithId<IGame>> {
    // A skipped week has no teams data, so there is nothing to calculate (S10.18)
    let update: Record<string, unknown> = { $unset: { metadata: '' } };
    if (game.status !== EnumGameStatus.Skipped) {
      const metadata = this.calculateGameMetadata(game);
      const players = this.recalculateGamePlayersMetadata({
        ...game,
        metadata,
      });
      update = { metadata: { ...metadata, players } };
    }
    const gameWithMetadata = await this.gameModel
      .findOneAndUpdate({ _id: game.id }, update, { new: true })
      .session(session ?? null)
      .exec();

    // The contribution of the old version is subtracted, of the new one added (ADR 0017)
    await this.playerMetadata.applyGameChange(
      { before, after: toSnapshot(gameWithMetadata) },
      session,
    );

    return gameWithMetadata.toJSON();
  }

  private calculateGameMetadata(game: IGame): IGameMetadata {
    this.logger.info('Calculate game metadata', { _id: game.id, game });

    try {
      return calculateGameMetadata(game);
    } catch (error) {
      if (error instanceof GameMetadataError) {
        throw error.code === 'CAPTAINS_COUNT'
          ? new BadRequestException(error.message)
          : new InternalServerErrorException(error.message);
      }
      throw error;
    }
  }

  private recalculateGamePlayersMetadata(
    game: IGame,
  ): Record<string, IPlayerGameResultMetadata> {
    const players = {};
    for (const stat of game.statistics) {
      players[stat.playerId.toString()] =
        this.calculatePlayerGameResultMetadata(stat.playerId.toString(), game);
    }
    return players;
  }

  private calculatePlayerGameResultMetadata(
    playerId: string,
    game: WithId<IGame>,
  ): IPlayerGameResultMetadata {
    this.logger.info('Calculate player game result metadata', {
      _id: playerId,
    });

    const metadata = calculatePlayerGameResultMetadata(playerId, game);
    if (metadata.errors.length) {
      this.logger.error('Player game result metadata crashed', {
        _id: playerId,
        errors: metadata.errors,
      });
    }

    return metadata;
  }
}
