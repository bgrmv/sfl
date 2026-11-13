import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
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
      throw new ConflictException(
        'A game with this number and season already exists',
      );
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
        throw new InternalServerErrorException('Created game is not found');
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
      await this.gameModel.findOneAndUpdate({ _id }, game).exec();

      return await this.runMetadataFlow(game);
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
      const updatedGame = await this.gameModel
        .findOneAndReplace({ _id }, game)
        .exec();

      if (!updatedGame) {
        throw new NotFoundException('Game is not found');
      }

      return await this.runMetadataFlow(
        updatedGame.toJSON({
          flattenObjectIds: false,
        }),
      );
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

    const game = await this.gameModel.findOneAndDelete({ _id }).exec();

    if (!game) {
      throw new NotFoundException('Game is not found');
    }

    await this.playersService.recalculatePlayersSeasonAndCareerMetadata(
      game.season,
      game.statistics.map(s => s.playerId.toString()),
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
        { new: true },
      )
      .exec();

    await this.playersService.recalculatePlayersSeasonAndCareerMetadata(
      game.season,
      game.statistics.map(s => s.playerId.toString()),
    );

    return gameWithMetadata.toJSON();
  }

  private async calculateGameMetadata(game: IGame): Promise<IGameMetadata> {
    this.logger.info('Calculate game metadata', { _id: game.id, game });

    // Helpers
    const teamFirstIdHelper = game.teams.at(0).id.toString();
    const teamSecondIdHelper = game.teams.at(1).id.toString();

    // Common
    // Rules of the league: GLOSSARY.md (a head goal weighs 2, an own goal
    // goes to the opponent and costs its author a point)
    const sumOf = (pick: (stat: PlayerStatistic) => number): number =>
      game.statistics.reduce((curr, stat) => curr + (pick(stat) ?? 0), 0);
    const scoredGoals = (stat: PlayerStatistic): number =>
      (stat.goalsByLeg ?? 0) +
      (stat.goalsByHead ?? 0) * 2 +
      (stat.goalsByPenalty ?? 0);

    const totalPlayers: number = new Set(
      game.statistics.map(s => s.playerId.toString()),
    ).size;
    const totalGoalsByLeg: number = sumOf(s => s.goalsByLeg);
    const totalGoalsByHead: number = sumOf(s => s.goalsByHead);
    const totalGoalsByPenalty: number = sumOf(s => s.goalsByPenalty);
    const totalGoalsByAuto: number = sumOf(s => s.goalsByAuto);
    const totalPasses: number = sumOf(s => s.passes);

    // Score
    const score: [number, number] = game.statistics.reduce(
      (curr, next) => {
        const own = scoredGoals(next);
        const auto = next.goalsByAuto ?? 0;

        if (next.teamId.toString() === teamFirstIdHelper) {
          return [curr.at(0) + own, curr.at(1) + auto];
        } else if (next.teamId.toString() === teamSecondIdHelper) {
          return [curr.at(0) + auto, curr.at(1) + own];
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

    // Goals of the game: everything on the scoreboard, own goals included
    const totalGoals: number = scoreFirstDraft + scoreSecondDraft;
    // Points of the players: goals and passes, minus own goals
    const totalPoints: number =
      sumOf(scoredGoals) + totalPasses - totalGoalsByAuto;

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

    // Captains: exactly one per draft
    const captainsOf = (teamId: string): string[] =>
      game.statistics
        .filter(stat => stat.isCaptain && stat.teamId.toString() === teamId)
        .map(stat => stat.playerId.toString());
    const captainsFirst = [...new Set(captainsOf(teamFirstIdHelper))];
    const captainsSecond = [...new Set(captainsOf(teamSecondIdHelper))];
    if (captainsFirst.length !== 1 || captainsSecond.length !== 1) {
      throw new BadRequestException('Each team needs exactly one captain');
    }

    const captainFirstDraft: string = captainsFirst[0];
    const captainSecondDraft: string = captainsSecond[0];

    const captainWon: string | null = scoreIsDraw
      ? null
      : isTeamFromFirstDraftWon
        ? captainFirstDraft
        : captainSecondDraft;
    const captainLost: string | null = scoreIsDraw
      ? null
      : isTeamFromFirstDraftLost
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
      .filter(stat => stat.teamId.toString() === teamFirstIdHelper)
      .map(stat => stat.playerId.toString());
    const playerIdsOfSecondDraft = game.statistics
      .filter(stat => stat.teamId.toString() === teamSecondIdHelper)
      .map(stat => stat.playerId.toString());

    // MVPs: a player who plays for both teams is one player, rows are summed.
    // The leaders of a tie all get it; with nothing scored there is no leader.
    const leadersBy = (pick: (stat: PlayerStatistic) => number): string[] => {
      const totals = new Map<string, number>();
      for (const stat of game.statistics) {
        const id = stat.playerId.toString();
        totals.set(id, (totals.get(id) ?? 0) + (pick(stat) ?? 0));
      }
      const max = Math.max(0, ...totals.values());

      return max === 0
        ? []
        : [...totals].filter(([, total]) => total === max).map(([id]) => id);
    };

    const mvpByPassesIds: string[] = leadersBy(s => s.passes);
    const mvpByGoalsIds: string[] = leadersBy(scoredGoals);
    const mvpByGoalsHeadIds: string[] = leadersBy(s => s.goalsByHead);

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
      s => s.playerId.toString() === playerId,
    );
    const isPlayerInBothTeams = statistics.length === 2;

    // A transfer plays for both teams: the rows of both teams are summed
    const statistic = statistics.reduce(
      (acc, next) => ({
        playerId: next.playerId.toString(),
        teamId: next.teamId.toString(),

        passes: acc.passes + (next.passes ?? 0),
        goalsByLeg: acc.goalsByLeg + (next.goalsByLeg ?? 0),
        goalsByHead: acc.goalsByHead + (next.goalsByHead ?? 0),
        goalsByAuto: acc.goalsByAuto + (next.goalsByAuto ?? 0),
        goalsByPenalty: acc.goalsByPenalty + (next.goalsByPenalty ?? 0),

        isMVP: acc.isMVP || next.isMVP,
        isCaptain: acc.isCaptain || next.isCaptain,
        isTransfer: acc.isTransfer || next.isTransfer,
        position: acc.position || next.position,
      }),
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
        isMvpByGoals: gameMetadata.mvpByGoalsIds.includes(playerId),

        asCaptain: statistic.isCaptain,
        asFirstDraft,
        asSecondDraft,
        asTransfer: statistic.isTransfer,
        hasPosition: statistic.position,
        // The result is the result of the draft; a transfer has none
        hasWon: isPlayerInBothTeams
          ? false
          : asFirstDraft
            ? gameMetadata.scoreFirstDraft > gameMetadata.scoreSecondDraft
            : gameMetadata.scoreSecondDraft > gameMetadata.scoreFirstDraft,
        hasLose: isPlayerInBothTeams
          ? false
          : asFirstDraft
            ? gameMetadata.scoreFirstDraft < gameMetadata.scoreSecondDraft
            : gameMetadata.scoreSecondDraft < gameMetadata.scoreFirstDraft,
        hasDraw: isPlayerInBothTeams ? false : gameMetadata.scoreIsDraw,
      };

      const totalPasses = statistic.passes;
      const totalGoalsByLeg = statistic.goalsByLeg;
      const totalGoalsByHead = statistic.goalsByHead;
      const totalGoalsByPenalty = statistic.goalsByPenalty;
      const totalGoalsByAuto = statistic.goalsByAuto;
      // A head goal weighs 2; an own goal is not a goal of its author
      const totalGoals =
        totalGoalsByLeg + totalGoalsByHead * 2 + totalGoalsByPenalty;

      const playerCommonTotalsMetadata: IPlayerCommonTotalsMetadata = {
        totalPasses,
        totalGoalsByLeg,
        totalGoalsByHead,
        totalGoalsByPenalty,
        totalGoalsByAuto,
        totalGoals,
        totalPoints: totalGoals + totalPasses - totalGoalsByAuto,
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
