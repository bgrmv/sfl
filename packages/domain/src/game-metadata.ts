// Rules of the league for one Game: score, result, captains, MVP and what a
// player gets out of it (GLOSSARY.md). Pure: plain objects in, metadata out.
import {
  EnumPlayerPosition,
  IGameMetadata,
  IPlayerCommonTotalsMetadata,
  IPlayerGameResultMetadata,
  IPlayerMetadataByGame,
  METADATA_BY_GAME_DEFAULT,
  METADATA_COMMON_TOTALS_GAME_DEFAULT,
} from './metadata.js';

type IdLike = string | { toString(): string };

/** A row of the statistics of a game (the ids may be strings or database ids). */
export interface GamePlayerStatistic {
  playerId: IdLike;
  teamId: IdLike;
  goalsByLeg?: number;
  goalsByHead?: number;
  goalsByPenalty?: number;
  goalsByAuto?: number;
  passes?: number;
  isMVP?: boolean;
  isTransfer?: boolean;
  isCaptain?: boolean;
  position?: EnumPlayerPosition | null;
}

export interface GameInput {
  teams: [{ id: IdLike }, { id: IdLike }] | { id: IdLike }[];
  statistics: GamePlayerStatistic[];
}

export type GameMetadataErrorCode = 'UNKNOWN_TEAM' | 'CAPTAINS_COUNT';

/** The data of the game breaks a rule of the league; the caller maps it to its own error. */
export class GameMetadataError extends Error {
  constructor(
    readonly code: GameMetadataErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'GameMetadataError';
  }
}

interface AggregatedStatistic {
  playerId: string;
  teamId: string;
  passes: number;
  goalsByLeg: number;
  goalsByHead: number;
  goalsByAuto: number;
  goalsByPenalty: number;
  isMVP: boolean;
  isCaptain: boolean;
  isTransfer: boolean;
  position: EnumPlayerPosition | null;
}

export function calculateGameMetadata(game: GameInput): IGameMetadata {
  const teamFirstIdHelper = game.teams.at(0)!.id.toString();
  const teamSecondIdHelper = game.teams.at(1)!.id.toString();

  // Rules of the league: GLOSSARY.md (a head goal weighs 2, an own goal
  // goes to the opponent and costs its author a point)
  const sumOf = (
    pick: (stat: GamePlayerStatistic) => number | undefined,
  ): number =>
    game.statistics.reduce((curr, stat) => curr + (pick(stat) ?? 0), 0);
  const scoredGoals = (stat: GamePlayerStatistic): number =>
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
  const score: [number, number] = [0, 0];
  for (const next of game.statistics) {
    const own = scoredGoals(next);
    const auto = next.goalsByAuto ?? 0;

    if (next.teamId.toString() === teamFirstIdHelper) {
      score[0] += own;
      score[1] += auto;
    } else if (next.teamId.toString() === teamSecondIdHelper) {
      score[0] += auto;
      score[1] += own;
    } else {
      throw new GameMetadataError(
        'UNKNOWN_TEAM',
        'Unexpected error occurred while calculating score metadata',
      );
    }
  }
  const scoreIsDraw: boolean = score[0] === score[1];
  const scoreFirstDraft: number = score[0];
  const scoreSecondDraft: number = score[1];

  // Goals of the game: everything on the scoreboard, own goals included
  const totalGoals: number = scoreFirstDraft + scoreSecondDraft;
  // Points of the players: goals and passes, minus own goals
  const totalPoints: number =
    sumOf(scoredGoals) + totalPasses - totalGoalsByAuto;

  // Team
  const teamWon: string | null = scoreIsDraw
    ? null
    : score[0] > score[1]
      ? teamFirstIdHelper
      : teamSecondIdHelper;

  const teamLost: string | null = scoreIsDraw
    ? null
    : score[0] < score[1]
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
    throw new GameMetadataError(
      'CAPTAINS_COUNT',
      'Each team needs exactly one captain',
    );
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
  const leadersBy = (
    pick: (stat: GamePlayerStatistic) => number | undefined,
  ): string[] => {
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

  const mvpListIds: string[] = game.statistics.reduce<string[]>(
    (curr, next) => (next.isMVP ? [...curr, next.playerId.toString()] : curr),
    [],
  );

  return {
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
}

/** What one player got out of a game whose metadata is already calculated. */
export function calculatePlayerGameResultMetadata(
  playerId: string,
  game: GameInput & { metadata: IGameMetadata },
  now: () => Date = () => new Date(),
): IPlayerGameResultMetadata {
  let playerGameResultMetadata: IPlayerGameResultMetadata = {
    ...METADATA_BY_GAME_DEFAULT,
    ...METADATA_COMMON_TOTALS_GAME_DEFAULT,
    errors: [],
  };

  const dateError = now();
  const gameMetadata: IGameMetadata = game.metadata;

  const statistics = game.statistics.filter(
    s => s.playerId.toString() === playerId,
  );
  const isPlayerInBothTeams = statistics.length === 2;

  // A transfer plays for both teams: the rows of both teams are summed
  const statistic = statistics.reduce<AggregatedStatistic>(
    (acc, next) => ({
      playerId: next.playerId.toString(),
      teamId: next.teamId.toString(),

      passes: acc.passes + (next.passes ?? 0),
      goalsByLeg: acc.goalsByLeg + (next.goalsByLeg ?? 0),
      goalsByHead: acc.goalsByHead + (next.goalsByHead ?? 0),
      goalsByAuto: acc.goalsByAuto + (next.goalsByAuto ?? 0),
      goalsByPenalty: acc.goalsByPenalty + (next.goalsByPenalty ?? 0),

      isMVP: acc.isMVP || !!next.isMVP,
      isCaptain: acc.isCaptain || !!next.isCaptain,
      isTransfer: acc.isTransfer || !!next.isTransfer,
      position: acc.position || next.position || null,
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
    },
  );

  try {
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
    playerGameResultMetadata = {
      ...METADATA_BY_GAME_DEFAULT,
      ...METADATA_COMMON_TOTALS_GAME_DEFAULT,
      errors: [
        ...playerGameResultMetadata.errors,
        {
          name: 'player game result metadata crashed',
          message: error instanceof Error ? error.message : String(error),
          date: dateError,
        },
      ],
    };
  }

  return playerGameResultMetadata;
}
