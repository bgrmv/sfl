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

  async find(game: Partial<IGame>) {
    this.logger.info('Find games with', game);
    return await this.gameModel.find({ ...game }).exec();
  }

  async create(game: IGame) {
    this.logger.info('Create game', game);
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

  async update(_id: string, game: IGame) {
    this.logger.info('Update game', { _id });

    if (!(await this.gameModel.exists({ _id }))) {
      throw new NotFoundException('Game is not found');
    }

    try {
      return await this.transactions.run(async session => {
        const before = await this.gameModel
          .findOneAndUpdate({ _id }, game)
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
