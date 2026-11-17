import {
  BadRequestException,
  ConflictException,
  HttpException,
  PreconditionFailedException,
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
import mongoose, { ClientSession, Model } from 'mongoose';
import { IUser, User } from '../users/users.schema';
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

/** The lease of a game lasts this long and is renewed by the pulse of the editor (ADR 0015). */
export const LOCK_TTL_MS = 2 * 60 * 1000;

/** A list without a season is capped: a game weighs about 18 KB. */
export const DEFAULT_GAMES_LIMIT = 100;
export const MAX_GAMES_LIMIT = 500;

/** Who saves a game: the account and the version he saw (`If-Match`). */
export interface Editor {
  accountId: string;
  ifMatch?: string;
}

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

    @InjectModel(User.name)
    private readonly userModel: Model<IUser>,

    private readonly playerMetadata: PlayerMetadataService,

    private readonly transactions: TransactionService,

    private readonly logger: FileLoggerService,
  ) {}

  async findById(_id: string) {
    this.logger.info('Find game by id', { _id });
    return await this.gameModel.findOne({ _id, deletedAt: null }).exec();
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
      .find({ ...game, deletedAt: null })
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
        deletedAt: null,
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
            deletedAt: null,
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

  /**
   * A game is changed by the holder of its lease, in the version he saw, and
   * only while it is not published (S10.54, S10.35). Returns the stored game.
   */
  private async assertEditable(
    _id: string,
    game: { status?: string },
    editor: Editor,
  ) {
    this.assertNotPublished(game);
    const stored = await this.gameModel
      .findOne({ _id, deletedAt: null })
      .exec();
    if (!stored) throw new NotFoundException('Game is not found');
    if (stored.status === EnumGameStatus.Published) {
      throw new ConflictException(
        'Revoke the published game before changing it',
      );
    }

    const lock = stored.lock;
    const held =
      lock &&
      lock.accountId === editor.accountId &&
      lock.expiresAt > new Date();
    if (!held) {
      throw new ConflictException('Take the game before you change it');
    }
    if (
      editor.ifMatch !== undefined &&
      Number(editor.ifMatch) !== (stored.version ?? 1)
    ) {
      throw new PreconditionFailedException(
        'The game was changed since you opened it',
      );
    }
    return stored;
  }

  /**
   * Takes the lease or renews it: one atomic update that succeeds only when the
   * game is free, expired or already his (ADR 0015).
   */
  async lock(_id: string, accountId: string) {
    const now = new Date();
    const user = await this.userModel
      .findById(new mongoose.Types.UUID(accountId))
      .select('name email')
      .lean()
      .exec();
    const name = user?.name || user?.email || 'Someone';

    const taken = await this.gameModel
      .findOneAndUpdate(
        {
          _id,
          deletedAt: null,
          status: { $ne: EnumGameStatus.Published },
          $or: [
            { lock: null },
            { lock: { $exists: false } },
            { 'lock.expiresAt': { $lt: now } },
            { 'lock.accountId': accountId },
          ],
        },
        {
          $set: {
            lock: {
              accountId,
              name,
              acquiredAt: now,
              expiresAt: new Date(now.getTime() + LOCK_TTL_MS),
            },
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
    if (taken) return taken;

    const stored = await this.gameModel
      .findOne({ _id, deletedAt: null })
      .exec();
    if (!stored) throw new NotFoundException('Game is not found');
    if (stored.status === EnumGameStatus.Published) {
      throw new ConflictException(
        'Revoke the published game before changing it',
      );
    }
    throw new ConflictException(
      `${stored.lock?.name ?? 'Someone'} is editing this game until ${stored.lock?.expiresAt.toISOString()}`,
    );
  }

  /** Only the holder releases; the lease of another stays. */
  async unlock(_id: string, accountId: string) {
    await this.gameModel
      .updateOne({ _id, 'lock.accountId': accountId }, { $set: { lock: null } })
      .exec();
    return null;
  }

  async update(_id: string, game: IGame, editor: Editor) {
    this.logger.info('Update game', { _id });
    await this.assertEditable(_id, game, editor);

    try {
      return await this.transactions.run(async session => {
        const before = await this.gameModel
          // A change of the content takes the confirmations back and raises the version
          .findOneAndUpdate(
            { _id },
            { $set: { ...game, confirmations: [] }, $inc: { version: 1 } },
          )
          .session(session)
          .exec();

        // Deleted by someone else since the check above
        if (!before) throw new NotFoundException('Game is not found');

        const updated = await this.gameModel
          .findOne({ _id, deletedAt: null })
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

  async replace(_id: string, game: IGame, editor: Editor) {
    const stored = await this.assertEditable(_id, game, editor);
    try {
      return await this.transactions.run(async session => {
        const updatedGame = await this.gameModel
          .findOneAndReplace(
            { _id },
            {
              ...game,
              confirmations: [],
              version: (stored.version ?? 1) + 1,
              lock: stored.lock,
            },
          )
          .session(session)
          .exec();

        if (!updatedGame) {
          throw new NotFoundException('Game is not found');
        }

        // Without `new: true` Mongoose returns the previous version of the game
        const replaced = await this.gameModel
          .findOne({ _id, deletedAt: null })
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
      const game = await this.gameModel
        .findOne({ _id, deletedAt: null })
        .session(session)
        .exec();
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
      const game = await this.gameModel
        .findOne({ _id, deletedAt: null })
        .session(session)
        .exec();
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
      const game = await this.gameModel
        .findOne({ _id, deletedAt: null })
        .session(session)
        .exec();
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

  /**
   * The game is hidden, not destroyed (S10.2): it leaves the lists and the
   * statistics, becomes a draft without confirmations and can be restored.
   */
  async delete(_id: string): Promise<boolean> {
    this.logger.info('Delete game', { _id });

    return await this.transactions.run(async session => {
      const game = await this.gameModel
        .findOne({ _id, deletedAt: null })
        .session(session)
        .exec();

      if (!game) {
        throw new NotFoundException('Game is not found');
      }

      await this.playerMetadata.applyGameChange(
        { before: toSnapshot(game), after: null },
        session,
      );
      await this.gameModel
        .updateOne(
          { _id },
          {
            $set: {
              deletedAt: new Date(),
              status: EnumGameStatus.Draft,
              confirmations: [],
              lock: null,
            },
          },
        )
        .session(session)
        .exec();

      return true;
    });
  }

  /** The deleted games, the newest first: for the admin who restores one. */
  async findDeleted() {
    return await this.gameModel
      .find({ deletedAt: { $ne: null } })
      .sort({ deletedAt: -1 })
      .limit(MAX_GAMES_LIMIT)
      .exec();
  }

  /** A deleted game comes back as a draft: two people confirm it again. */
  async restore(_id: string) {
    const restored = await this.gameModel
      .findOneAndUpdate(
        { _id, deletedAt: { $ne: null } },
        { $unset: { deletedAt: '' }, $inc: { version: 1 } },
        { returnDocument: 'after' },
      )
      .exec();
    if (!restored) throw new NotFoundException('Game is not found');
    return restored;
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
