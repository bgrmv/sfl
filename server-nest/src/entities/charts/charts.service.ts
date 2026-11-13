import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Game, IGame } from '../games/game.schema';
import { Player } from '../players';

@Injectable()
export class ChartsService {
  constructor(
    @InjectModel(Player.name)
    private playerModel: Model<Player>,

    @InjectModel(Game.name)
    private gameModel: Model<IGame>,
  ) {}

  async topTotalPointsPlayers({
    season,
    limit = 20,
  }: {
    season: number;
    limit: number;
  }): Promise<
    {
      id: string;
      nickname: string;
      user: {
        name?: string;
      };
      ancientRatingSystem: {
        plusMinus: number;
        lastResult: number;
        totalPoints: number;
      };
    }[]
  > {
    return await this.playerModel
      .aggregate(
        [
          {
            $match: {
              [`metadata.bySeason.${season}.ancientRatingSystem.totalPoints`]: {
                $exists: 1,
                $ne: null,
                $gt: 0,
              },
            },
          },
          {
            $project: {
              _id: '$_id',
              id: '$_id',
              user: '$user',
              nickname: '$nickname',
              totalPoints: `$metadata.bySeason.${season}.ancientRatingSystem.totalPoints`,
            },
          },
          {
            $sort: {
              totalPoints: -1,
            },
          },
          { $limit: limit },
          {
            $lookup: {
              from: 'users',
              localField: 'user',
              foreignField: '_id',
              as: 'user',
            },
          },
          { $unwind: '$user' },
          // Public data: only what the chart labels need (S8.10). A whitelist, so
          // that a new user field never leaks (a nested $set would merge, not replace)
          {
            $project: {
              _id: 0,
              id: 1,
              nickname: 1,
              totalPoints: 1,
              user: { name: '$user.name' },
            },
          },
        ],
        { maxTimeMS: 60000, allowDiskUse: true },
      )
      .exec();
  }

  async topAncientRatingSystemPlayers({
    season,
    limit = 20,
  }: {
    season: number;
    limit: number;
  }): Promise<
    {
      id: string;
      nickname: string;
      user: {
        name?: string;
      };
      ancientRatingSystem: {
        plusMinus: number;
        lastResult: number;
        totalPoints: number;
      };
    }[]
  > {
    return await this.playerModel
      .aggregate(
        [
          {
            $match: {
              [`metadata.bySeason.${season}.ancientRatingSystem.totalPoints`]: {
                $exists: 1,
                $ne: null,
                $gt: 0,
              },
            },
          },
          {
            $project: {
              _id: '$_id',
              id: '$_id',
              user: '$user',
              nickname: '$nickname',
              ancientRatingSystem: `$metadata.bySeason.${season}.ancientRatingSystem`,
            },
          },
          {
            $sort: {
              'ancientRatingSystem.totalPoints': -1,
              'ancientRatingSystem.plusMinus': -1,
              'ancientRatingSystem.lastResult': -1,
            },
          },
          { $limit: limit },
          {
            $lookup: {
              from: 'users',
              localField: 'user',
              foreignField: '_id',
              as: 'user',
            },
          },
          { $unwind: '$user' },
          // Public data: only what the chart labels need (S8.10). A whitelist, so
          // that a new user field never leaks (a nested $set would merge, not replace)
          {
            $project: {
              _id: 0,
              id: 1,
              nickname: 1,
              ancientRatingSystem: 1,
              user: { name: '$user.name' },
            },
          },
        ],
        { maxTimeMS: 60000, allowDiskUse: true },
      )
      .exec();
  }
}
