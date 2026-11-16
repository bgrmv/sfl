import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  accumulatePlayerCareerMetadata,
  accumulatePlayerSeasonMetadata,
  IPlayerMetadata,
  METADATA_DEFAULT,
} from '@sfl/domain';
import { FlattenMaps, Model, Types } from 'mongoose';
import { FileLoggerService } from 'src/shared/services/logger.service';
import { EnumGameStatus, Game, IGame } from '../games/game.schema';
import { Player } from '../players/players.schema';

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
  ) {}

  async recalculatePlayersSeasonAndCareerMetadata(
    season: number,
    playerIds: string[],
  ): Promise<void> {
    const failed: { playerId: string; error: string }[] = [];

    // Sequentially and awaited: the caller gets the response only when done.
    for (const playerId of playerIds) {
      try {
        await this.recalculateSeasonMetadata(playerId, season);
      } catch (error) {
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

  private async recalculateSeasonMetadata(
    playerId: string,
    season: number,
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
      { maxTimeMS: 60000, allowDiskUse: true },
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
      );

      await this.recalculateCareerMetadata(playerId);
    } catch (error) {
      this.logger.error('Failed to recalculate season metadata for player', {
        _id: playerId,
        season,
        error,
      });

      throw error;
    }
  }

  protected async recalculateCareerMetadata(playerId: string): Promise<void> {
    const seasonsMetadata: FlattenMaps<Record<number, IPlayerMetadata>> =
      (await this.playerModel.findById({ _id: playerId }).exec()).toJSON()
        .metadata?.bySeason ?? {};

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
      );
    } catch (error) {
      console.error(error);
      this.logger.error('Failed to recalculate career metadata for player', {
        _id: playerId,
        error,
      });
    }
  }
}
