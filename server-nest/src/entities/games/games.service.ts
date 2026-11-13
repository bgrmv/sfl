import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FileLoggerService } from 'src/shared/services/logger.service';
import { PlayersService } from '../players';
import {
  IPlayerCommonTotalsMetadata,
  IPlayerMetadataByGame,
  METADATA_BY_GAME_DEFAULT,
  METADATA_COMMON_TOTALS_GAME_DEFAULT,
} from '../players/constants/player-career-metadata';
import {
  Game,
  IGame,
  IGameMetadata,
  IPlayerGameResultMetadata,
  PlayerStatistic,
} from './game.schema';

@Injectable()
export class GamesService {
  constructor(
    @InjectModel(Game.name)
    private readonly gameModel: Model<IGame>,

    private readonly playersService: PlayersService,

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
      throw ConflictException;
    }

    try {
      await this.gameModel.create(game);
      const createdGame = await this.gameModel
        .findOne({
          number: game.number,
          season: game.season,
        })
        .exec();

      if (!createdGame) {
        throw BadRequestException;
      }

      return await this.runMetadataFlow(
        createdGame.toJSON({
          flattenObjectIds: false,
        }),
      );
    } catch (error) {
      this.logger.error('Failed to create game', {
        season: game.season,
        number: game.number,
        error,
      });
      throw new InternalServerErrorException('Unexpected error occurred');
    }
  }

  async update(_id: string, game: IGame) {
    this.logger.info('Update game', { _id });

    if (!(await this.gameModel.exists({ _id }))) {
      throw BadRequestException;
    }

    try {
      await this.gameModel.findOneAndUpdate({ _id }, game).exec();

      return await this.runMetadataFlow(game);
    } catch (error) {
      this.logger.error('Failed to update game', { _id, error });
      throw new InternalServerErrorException('Unexpected error occurred');
    }
  }

  async replace(_id: string, game: IGame) {
    try {
      const updatedGame = await this.gameModel
        .findOneAndReplace({ _id }, game)
        .exec();

      if (!updatedGame) {
        throw BadRequestException;
      }

      return await this.runMetadataFlow(
        updatedGame.toJSON({
          flattenObjectIds: false,
        }),
      );
    } catch (error) {
      this.logger.error('Failed to replace game', { _id, error });
      throw new InternalServerErrorException('Unexpected error occurred');
    }
  }

  async delete(_id: string): Promise<boolean> {
    this.logger.info('Delete game', { _id });

    const game = await this.gameModel.findOneAndDelete({ _id }).exec();

    if (!game) {
      throw BadRequestException;
    }

    await this.playersService.recalculatePlayersSeasonAndCareerMetadata(
      game.season,
      game.statistics.map((s) => s.playerId.toString()),
    );

    return !!game;
  }

  private async runMetadataFlow(game: WithId<IGame>): Promise<WithId<IGame>> {
    const metadata = await this.calculateGameMetadata(game);

    const playersMetadata = await this.recalculateGamePlayersMetadata({
      ...game,
      metadata,
    });

    const gameWithMetadata = await this.gameModel
      .findOneAndUpdate(
        { _id: game.id },
        {
          metadata: {
            ...metadata,
            players: playersMetadata,
          },
        },
      )
      .exec();

    await this.playersService.recalculatePlayersSeasonAndCareerMetadata(
      game.season,
      game.statistics.map((s) => s.playerId.toString()),
    );

    return gameWithMetadata.toJSON();
  }

  private async calculateGameMetadata(game: IGame): Promise<IGameMetadata> {
    this.logger.info('Calculate game metadata', { _id: game.id, game });

    // Helpers
    const teamFirstIdHelper = game.teams.at(0).id.toString();
    const teamSecondIdHelper = game.teams.at(1).id.toString();

    // Common
    const totalPlayers: number = new Set(
      game.statistics.map((s) => s.playerId.toString()),
    ).size;
    const totalGoalsByLeg: number = game.statistics.reduce(
      (curr, next) => curr + next.goalsByLeg,
      0,
    );
    const totalGoalsByHead: number = game.statistics.reduce(
      (curr, next) => curr + next.goalsByHead,
      0,
    );
    const totalGoalsByPenalty: number = game.statistics.reduce(
      (curr, next) => curr + next.goalsByPenalty,
      0,
    );
    const totalGoalsByAuto: number = game.statistics.reduce(
      (curr) => curr + 0, // TODO (next.goalAuto ?? 0),
      0,
    );
    const totalPasses: number = game.statistics.reduce(
      (curr, next) => curr + next.passes,
      0,
    );

    const totalGoals: number =
      totalGoalsByLeg + totalGoalsByHead * 2 + totalGoalsByPenalty;
    const totalPoints: number = totalGoals + totalPasses;

    // Score
    const score: [number, number] = game.statistics.reduce(
      (curr, next) => {
        const currentScore =
          (next.goalsByLeg ?? 0) +
          (next.goalsByHead ?? 0) * 2 +
          (next.goalsByPenalty ?? 0);

        if (next.teamId.toString() === teamFirstIdHelper) {
          return [curr.at(0) + currentScore, curr.at(1)];
        } else if (next.teamId.toString() === teamSecondIdHelper) {
          return [curr.at(0), curr.at(1) + currentScore];
        } else {
          throw new InternalServerErrorException(
            'Unexpected error occurred while calculating score metadata',
          );
        }
      },
      [0, 0],
    );
    const scoreIsDraw: boolean = score.at(0) === score.at(1);
    const scoreFirstDraft: number = score.at(0);
    const scoreSecondDraft: number = score.at(1);

    // Team
    const teamWon: string | null = scoreIsDraw
      ? null
      : score.at(0) > score.at(1)
        ? teamFirstIdHelper
        : teamSecondIdHelper;

    const teamLost: string | null = scoreIsDraw
      ? null
      : score.at(0) < score.at(1)
        ? teamFirstIdHelper
        : teamSecondIdHelper;

    const isTeamFromFirstDraftWon = scoreFirstDraft > scoreSecondDraft;
    const isTeamFromFirstDraftLost = scoreFirstDraft < scoreSecondDraft;
    const isTeamFromSecondDraftWon = scoreFirstDraft < scoreSecondDraft;
    const isTeamFromSecondDraftLost = scoreFirstDraft > scoreSecondDraft;

    // Captains
    const captainFirstDraft: string = game.statistics
      .find(
        (stat) =>
          stat.isCaptain && stat.teamId.toString() === teamFirstIdHelper,
      )!
      .playerId.toString();

    const captainSecondDraft: string = game.statistics
      .find(
        (stat) =>
          stat.isCaptain && stat.teamId.toString() === teamSecondIdHelper,
      )!
      .playerId.toString();

    const captainWon: string | null =
      scoreFirstDraft > scoreSecondDraft
        ? captainFirstDraft
        : captainSecondDraft;
    const captainLost: string | null =
      scoreFirstDraft < scoreSecondDraft
        ? captainFirstDraft
        : captainSecondDraft;

    const isCaptainFirstDraftWon: boolean =
      !scoreIsDraw && captainWon === captainFirstDraft;
    const isCaptainFirstDraftDraw: boolean = scoreIsDraw;
    const isCaptainFirstDraftLost: boolean =
      !scoreIsDraw && captainLost === captainFirstDraft;

    const isCaptainSecondDraftWon: boolean =
      !scoreIsDraw && captainWon === captainSecondDraft;
    const isCaptainSecondDraftDraw: boolean = scoreIsDraw;
    const isCaptainSecondDraftLost: boolean =
      !scoreIsDraw && captainLost === captainSecondDraft;

    // Players
    const playerIdsOfFirstDraft = game.statistics
      .filter((stat) => stat.teamId.toString() === teamFirstIdHelper)
      .map((stat) => stat.playerId.toString());
    const playerIdsOfSecondDraft = game.statistics
      .filter((stat) => stat.teamId.toString() === teamSecondIdHelper)
      .map((stat) => stat.playerId.toString());

    // MVPs
    // mvpByPassesIds
    const maxPassesNumberHelper = [
      ...new Set(
        game.statistics
          .map((stat) => stat.passes)
          .sort((pass1, pass2) => pass2 - pass1),
      ),
    ].at(0);

    const mvpByPassesIds: string[] = !maxPassesNumberHelper
      ? []
      : game.statistics
          .filter((stat) => stat.passes === maxPassesNumberHelper)
          .map((stat) => stat.playerId.toString());

    // mvpByGoalsIds
    const maxGoalNumberHelper = [
      ...new Set(
        game.statistics
          .map((stat) => stat.goalsByHead)
          .sort((goal1, goal2) => goal2 - goal1),
      ),
    ].at(0);

    const mvpByGoalsIds: string[] = !maxGoalNumberHelper
      ? []
      : game.statistics
          .filter((stat) => stat.goalsByHead === maxGoalNumberHelper)
          .map((stat) => stat.playerId.toString());

    // mvpByGoalsHeadIds
    const maxGoalsHeadNumberHelper = [
      ...new Set(
        game.statistics
          .map((stat) => stat.goalsByHead)
          .sort((goalHead1, goalHead2) => goalHead2 - goalHead1),
      ),
    ].at(0);

    const mvpByGoalsHeadIds: string[] = !maxGoalsHeadNumberHelper
      ? []
      : game.statistics
          .filter((stat) => stat.goalsByHead === maxGoalsHeadNumberHelper)
          .map((stat) => stat.playerId.toString());

    // mvpListIds
    const mvpListIds: string[] = game.statistics.reduce(
      (curr, next) => (next.isMVP ? [...curr, next.playerId.toString()] : curr),
      [],
    );

    const metadata: IGameMetadata = {
      // Common
      totalPasses,
      totalPlayers,
      totalGoalsByLeg,
      totalGoalsByHead,
      totalGoalsByPenalty,
      totalGoalsByAuto,
      totalGoals,
      totalPoints,

      // Score
      score,
      scoreIsDraw,
      scoreFirstDraft,
      scoreSecondDraft,

      // Team
      teamWon,
      teamLost,
      isTeamFromFirstDraftWon,
      isTeamFromFirstDraftLost,
      isTeamFromSecondDraftWon,
      isTeamFromSecondDraftLost,

      // Captains
      captainFirstDraft,
      captainSecondDraft,
      captainWon,
      captainLost,
      isCaptainFirstDraftWon,
      isCaptainFirstDraftDraw,
      isCaptainFirstDraftLost,
      isCaptainSecondDraftWon,
      isCaptainSecondDraftDraw,
      isCaptainSecondDraftLost,

      playerIdsOfFirstDraft,
      playerIdsOfSecondDraft,

      // MVP
      mvpByGoalsIds,
      mvpByGoalsHeadIds,
      mvpByPassesIds,
      mvpListIds,

      players: {},
    };

    return metadata;
  }

  private async recalculateGamePlayersMetadata(
    game: IGame,
  ): Promise<Record<string, IPlayerGameResultMetadata>> {
    const players = {};
    // Todo: this might be slow, probably need to optimize
    for (const stat of game.statistics) {
      players[stat.playerId.toString()] =
        await this.calculatePlayerGameResultMetadata(
          stat.playerId.toString(),
          game,
        );
    }
    return players;
  }

  private async calculatePlayerGameResultMetadata(
    playerId: string,
    game: WithId<IGame>,
  ): Promise<IPlayerGameResultMetadata> {
    this.logger.info('Calculate player game result metadata', {
      _id: playerId,
    });

    let playerGameResultMetadata: IPlayerGameResultMetadata = {
      ...METADATA_BY_GAME_DEFAULT,
      ...METADATA_COMMON_TOTALS_GAME_DEFAULT,
      errors: [],
    };

    // Helpers
    const dateError = new Date();

    const gameMetadata: IGameMetadata = game.metadata;

    const statistics: PlayerStatistic[] = game.statistics.filter(
      (s) => s.playerId.toString() === playerId,
    );
    const isPlayerInBothTeams = statistics.length === 2;

    // Player can be transfered and play for both team
    const statistic = isPlayerInBothTeams
      ? statistics.at(0)
      : statistics.reduce(
          (acc, next) => {
            return {
              playerId: next.playerId.toString(),
              teamId: next.teamId.toString(),

              passes: acc.passes + next.passes,
              goalsByLeg: acc.goalsByLeg + next.goalsByLeg,
              goalsByHead: acc.goalsByHead + next.goalsByHead,
              goalsByAuto: acc.goalsByAuto + next.goalsByAuto,
              goalsByPenalty: acc.goalsByPenalty + next.goalsByPenalty,

              isMVP: acc.isMVP || next.isMVP,
              isCaptain: acc.isCaptain || next.isCaptain,
              isTransfer: acc.isTransfer || next.isTransfer,
              position: acc.position || next.position,
            };
          },
          {
            playerId: '',
            teamId: '',

            passes: 0,
            goalsByLeg: 0,
            goalsByHead: 0,
            goalsByAuto: 0,
            goalsByPenalty: 0,

            isMVP: false,
            isCaptain: false,
            isTransfer: false,
            position: null,
          } as PlayerStatistic,
        );

    // Previous metadata to recalculate

    // Todo: this might be slow, probably need to optimize

    try {
      // TODO move to helpers
      const isTeamFromFirstDraftWon =
        gameMetadata.scoreFirstDraft > gameMetadata.scoreSecondDraft;
      const isTeamFromSecondDraftWon =
        gameMetadata.scoreFirstDraft < gameMetadata.scoreSecondDraft;

      const asFirstDraft = isPlayerInBothTeams
        ? true
        : gameMetadata.playerIdsOfFirstDraft.includes(playerId);
      const asSecondDraft = isPlayerInBothTeams
        ? true
        : gameMetadata.playerIdsOfSecondDraft.includes(playerId);

      const playerMetadataByGame: IPlayerMetadataByGame = {
        ...METADATA_BY_GAME_DEFAULT,

        isMvp: gameMetadata.mvpListIds.includes(playerId),
        isMvpByPasses: gameMetadata.mvpByPassesIds.includes(playerId),
        isMvpByGoals:
          gameMetadata.mvpByGoalsIds.includes(playerId) ||
          gameMetadata.mvpByGoalsHeadIds.includes(playerId),

        asCaptain: statistic.isCaptain,
        asFirstDraft,
        asSecondDraft,
        asTransfer: statistic.isTransfer,
        hasPosition: statistic.position,
        hasWon: isPlayerInBothTeams
          ? false
          : asFirstDraft && isTeamFromFirstDraftWon,
        hasLose: isPlayerInBothTeams
          ? false
          : asFirstDraft && isTeamFromSecondDraftWon,
        hasDraw: isPlayerInBothTeams ? false : gameMetadata.scoreIsDraw,
      };

      const totalPasses = statistic.passes;
      const totalGoalsByLeg = statistic.goalsByLeg;
      const totalGoalsByHead = statistic.goalsByHead;
      const totalGoalsByPenalty = statistic.goalsByHead;
      const totalGoalsByAuto = 0;
      const totalGoals =
        totalGoalsByLeg + totalGoalsByHead + totalGoalsByPenalty;

      const playerCommonTotalsMetadata: IPlayerCommonTotalsMetadata = {
        totalPasses,
        totalGoalsByLeg,
        totalGoalsByHead,
        totalGoalsByPenalty,
        totalGoalsByAuto,
        totalGoals,
        totalPoints:
          totalGoalsByLeg +
          totalGoalsByHead +
          totalGoalsByPenalty +
          totalPasses,
      };

      playerGameResultMetadata = {
        ...playerGameResultMetadata,
        ...playerMetadataByGame,
        ...playerCommonTotalsMetadata,
      };
    } catch (error) {
      this.logger.error('Player game result metadata crashed', {
        _id: playerId.toString(),
        error,
      });

      playerGameResultMetadata = {
        ...METADATA_BY_GAME_DEFAULT,
        ...METADATA_COMMON_TOTALS_GAME_DEFAULT,
        errors: [
          ...playerGameResultMetadata.errors,
          {
            name: 'player game result metadata crashed',
            message: error.message,
            date: dateError,
          },
        ],
      };
    }

    return playerGameResultMetadata;
  }
}
