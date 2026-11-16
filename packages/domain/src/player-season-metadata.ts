import {
  IGameMetadata,
  IPlayerCommonTotalsMetadata,
  IPlayerMetadata,
  IPlayerMetadataByGame,
} from './metadata.js';
import { getMaxRepeatedCountHelper } from './player-common-metadata.js';

export function getPointsByPosition({
  hasPosition,
  hasDraw,
  hasWon,
  hasLose,
}: IPlayerMetadataByGame): -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 {
  // No bonus without a position, in a draw, or without a result (a transfer)
  if (hasDraw || !hasPosition || (!hasWon && !hasLose)) {
    return 0;
  }

  const positiveOrNegative = hasWon ? 1 : -1;

  switch (true) {
    case hasPosition.startsWith('GK'):
      return (positiveOrNegative * 4) as -4 | 4;
    case hasPosition.startsWith('DEF'):
      return (positiveOrNegative * 3) as -3 | 3;
    case hasPosition.startsWith('MID'):
      return (positiveOrNegative * 2) as -2 | 2;
    case hasPosition.startsWith('FRWD'):
      return (positiveOrNegative * 1) as -1 | 1;
    default:
      return 0;
  }
}

/** What a season needs to know about a game: its id and the metadata of the game. */
export interface SeasonGameInput {
  id: string | { toString(): string };
  metadata: Pick<
    IGameMetadata,
    | 'scoreFirstDraft'
    | 'scoreSecondDraft'
    | 'captainFirstDraft'
    | 'captainSecondDraft'
  >;
}

type GameInput = IPlayerMetadataByGame & IPlayerCommonTotalsMetadata;

/** What one game adds to the additive fields of a season (ADR 0017, group a). */
function contributionOf(input: GameInput, game: SeasonGameInput) {
  const gameMetadata = game.metadata;
  const plusMinus = input.asFirstDraft
    ? gameMetadata.scoreFirstDraft - gameMetadata.scoreSecondDraft
    : gameMetadata.scoreSecondDraft - gameMetadata.scoreFirstDraft;

  // A draw and a transfer (no result) give 0
  const lastResult = input.hasWon ? 1 : input.hasLose ? -1 : 0;

  // Old rating system: a pass 1, a leg goal 1, a penalty 1, a head goal 2,
  // an own goal -1
  const ancientTotalPoints =
    input.totalPasses +
    input.totalGoalsByLeg +
    input.totalGoalsByPenalty +
    input.totalGoalsByHead * 2 -
    input.totalGoalsByAuto;

  return {
    totalPasses: input.totalPasses,
    totalGoalsByLeg: input.totalGoalsByLeg,
    totalGoalsByHead: input.totalGoalsByHead,
    totalGoalsByPenalty: input.totalGoalsByPenalty,
    totalGoalsByAuto: input.totalGoalsByAuto,
    totalGoals: input.totalGoals,

    totalGames: 1,
    totalWonGames: +input.hasWon,
    totalDraws: +input.hasDraw,
    totalLostGames: +input.hasLose,

    totalMvp: +input.isMvp,
    totalMvpByGoals: +input.isMvpByGoals,
    totalMvpByPasses: +input.isMvpByPasses,

    totalPlayedAsTransfer: +input.asTransfer,
    totalPlayedAsCaptain: +input.asCaptain,
    totalPlayedAsFirstDraft: +input.asFirstDraft,
    totalPlayedAsSecondDraft: +input.asSecondDraft,

    plusMinus,
    lastResult,
    ancientTotalPoints,
    // New rating system: the same points plus the bonus of the position
    positionalTotalPoints: ancientTotalPoints + getPointsByPosition(input),
  };
}

function shiftGame(
  original: IPlayerMetadata,
  input: GameInput,
  game: SeasonGameInput,
  sign: 1 | -1,
): IPlayerMetadata {
  const c = contributionOf(input, game);
  // The default metadata has `totalPoints`, a season with games never had it:
  // keep the shape of the stored seasons (the golden master compares it)
  const rest: IPlayerMetadata & { totalPoints?: number } = { ...original };
  delete rest.totalPoints;
  const add = (value: number, delta: number) => value + sign * delta;

  return {
    ...rest,

    totalPasses: add(original.totalPasses, c.totalPasses),
    totalGoalsByLeg: add(original.totalGoalsByLeg, c.totalGoalsByLeg),
    totalGoalsByHead: add(original.totalGoalsByHead, c.totalGoalsByHead),
    totalGoalsByPenalty: add(
      original.totalGoalsByPenalty,
      c.totalGoalsByPenalty,
    ),
    totalGoalsByAuto: add(original.totalGoalsByAuto, c.totalGoalsByAuto),
    totalGoals: add(original.totalGoals, c.totalGoals),

    totalGames: add(original.totalGames, c.totalGames),
    totalWonGames: add(original.totalWonGames, c.totalWonGames),
    totalDraws: add(original.totalDraws, c.totalDraws),
    totalLostGames: add(original.totalLostGames, c.totalLostGames),

    totalMvp: add(original.totalMvp, c.totalMvp),
    totalMvpByGoals: add(original.totalMvpByGoals, c.totalMvpByGoals),
    totalMvpByPasses: add(original.totalMvpByPasses, c.totalMvpByPasses),

    totalPlayedAsTransfer: add(
      original.totalPlayedAsTransfer,
      c.totalPlayedAsTransfer,
    ),
    totalPlayedAsCaptain: add(
      original.totalPlayedAsCaptain,
      c.totalPlayedAsCaptain,
    ),
    totalPlayedAsFirstDraft: add(
      original.totalPlayedAsFirstDraft,
      c.totalPlayedAsFirstDraft,
    ),
    totalPlayedAsSecondDraft: add(
      original.totalPlayedAsSecondDraft,
      c.totalPlayedAsSecondDraft,
    ),

    ancientRatingSystem: {
      plusMinus: add(original.ancientRatingSystem.plusMinus, c.plusMinus),
      lastResult: add(original.ancientRatingSystem.lastResult, c.lastResult),
      totalPoints: add(
        original.ancientRatingSystem.totalPoints,
        c.ancientTotalPoints,
      ),
    },
    positionalRatingSystem: {
      plusMinus: add(original.positionalRatingSystem.plusMinus, c.plusMinus),
      lastResult: add(
        original.positionalRatingSystem.lastResult,
        c.lastResult,
      ),
      totalPoints: add(
        original.positionalRatingSystem.totalPoints,
        c.positionalTotalPoints,
      ),
    },
  };
}

/**
 * Adds the contribution of one game to the additive fields of a season
 * (ADR 0017, group a: counters and rating sums). The lists and streaks are
 * not touched: they depend on the order of the games, see `rebuildGameSequence`.
 */
export function applyGame(
  original: IPlayerMetadata,
  input: GameInput,
  game: SeasonGameInput,
): IPlayerMetadata {
  return shiftGame(original, input, game, 1);
}

/** Subtracts what `applyGame` added for the same game. */
export function revertGame(
  original: IPlayerMetadata,
  input: GameInput,
  game: SeasonGameInput,
): IPlayerMetadata {
  return shiftGame(original, input, game, -1);
}

/** A game of the player, as the lists and streaks of a season need it. */
export interface SeasonSequenceGameInput {
  id: string | { toString(): string };
  metadata: Pick<IGameMetadata, 'captainFirstDraft' | 'captainSecondDraft'>;
  player: Pick<
    IPlayerMetadataByGame,
    'hasWon' | 'hasLose' | 'asCaptain' | 'asFirstDraft'
  >;
}

/**
 * Rebuilds the order-dependent fields of a season (ADR 0017, group c): the
 * lists of games and results, the captains and the streaks. `games` are all
 * published games of the player in the season, ordered by game number.
 */
export function rebuildGameSequence(
  original: IPlayerMetadata,
  games: SeasonSequenceGameInput[],
): IPlayerMetadata {
  const gamesResults: (1 | 0 | -1)[] = games.map(({ player }) =>
    player.hasWon ? 1 : player.hasLose ? -1 : 0,
  );

  return {
    ...original,

    gamesResults,
    gamesIds: games.map(({ id }) => id.toString()),

    gamesMaxWinStreak: getMaxRepeatedCountHelper(gamesResults, 1),
    gamesMaxDraftStreak: getMaxRepeatedCountHelper(gamesResults, 0),
    gamesMaxLostStreak: getMaxRepeatedCountHelper(gamesResults, -1),

    captainedGamesIds: games
      .filter(({ player }) => player.asCaptain)
      .map(({ id }) => id.toString()),
    captainedByPlayersIds: games
      .filter(({ player }) => !player.asCaptain)
      .map(({ player, metadata }) =>
        player.asFirstDraft
          ? metadata.captainFirstDraft
          : metadata.captainSecondDraft,
      ),
  };
}

export function accumulatePlayerSeasonMetadata(
  original: IPlayerMetadata,
  input: GameInput,
  game: SeasonGameInput,
): IPlayerMetadata {
  const added = applyGame(original, input, game);
  const lr = input.hasWon ? 1 : input.hasLose ? -1 : 0;
  const gamesResults: (1 | 0 | -1)[] = [...original.gamesResults, lr];
  const gameId = game.id.toString();

  return {
    ...added,

    gamesResults,
    gamesIds: original.gamesIds.concat([gameId]),

    gamesMaxWinStreak: getMaxRepeatedCountHelper(gamesResults, 1),
    gamesMaxDraftStreak: getMaxRepeatedCountHelper(gamesResults, 0),
    gamesMaxLostStreak: getMaxRepeatedCountHelper(gamesResults, -1),

    captainedGamesIds: input.asCaptain
      ? original.captainedGamesIds.concat([gameId])
      : original.captainedGamesIds,
    captainedByPlayersIds: input.asCaptain
      ? original.captainedByPlayersIds
      : original.captainedByPlayersIds.concat([
          input.asFirstDraft
            ? game.metadata.captainFirstDraft
            : game.metadata.captainSecondDraft,
        ]),
  };
}
