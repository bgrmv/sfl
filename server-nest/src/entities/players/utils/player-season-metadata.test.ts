// What a Game adds to a player's Season (GLOSSARY: Old / New rating system,
// Plus-minus, Last result). Where the code differs from a rule, the test is
// written for the rule and marked `it.fails` with the item of S3.11.
import {
  EnumPlayerPosition,
  METADATA_BY_GAME_DEFAULT,
  METADATA_COMMON_TOTALS_GAME_DEFAULT,
  METADATA_DEFAULT,
} from '../constants/player-career-metadata';
import {
  accumulatePlayerSeasonMetadata,
  getPointsByPosition,
} from './player-season-metadata';

const { Goalkeeper, Defender, Midfielder, ForwardStriker } = EnumPlayerPosition;

/** What one game gave to the player (as the game metadata flow computes it). */
const played = (overrides: Record<string, unknown> = {}) =>
  ({
    ...METADATA_BY_GAME_DEFAULT,
    ...METADATA_COMMON_TOTALS_GAME_DEFAULT,
    asFirstDraft: true,
    ...overrides,
  }) as any;

const won = { hasWon: true };
const lost = { hasLose: true };
const draw = { hasDraw: true };

const gameOf = (scoreFirst = 0, scoreSecond = 0, id = 'game-1') =>
  ({
    id,
    metadata: {
      scoreFirstDraft: scoreFirst,
      scoreSecondDraft: scoreSecond,
      captainFirstDraft: 'captain-white',
      captainSecondDraft: 'captain-red',
    },
  }) as any;

const add = (
  input: Record<string, unknown>,
  game = gameOf(),
  original = METADATA_DEFAULT,
) => accumulatePlayerSeasonMetadata(original, played(input), game);

describe('getPointsByPosition: bonus of the New rating system', () => {
  it.each([
    [Goalkeeper, 4],
    [Defender, 3],
    [Midfielder, 2],
    [ForwardStriker, 1],
  ])('a %s gets +%i for a win and -%i for a loss', (hasPosition, weight) => {
    expect(getPointsByPosition(played({ hasPosition, ...won }))).toBe(weight);
    expect(getPointsByPosition(played({ hasPosition, ...lost }))).toBe(-weight);
  });

  it('a draw gives no bonus', () => {
    expect(
      getPointsByPosition(played({ hasPosition: Goalkeeper, ...draw })),
    ).toBe(0);
  });

  it('a player without a position gets no bonus', () => {
    expect(getPointsByPosition(played({ ...won }))).toBe(0);
  });
});

describe('Season: results of a player', () => {
  it('a win, a draw and a loss are counted separately', () => {
    expect(add(won)).toMatchObject({
      totalGames: 1,
      totalWonGames: 1,
      totalDraws: 0,
      totalLostGames: 0,
    });
    expect(add(draw)).toMatchObject({ totalWonGames: 0, totalDraws: 1 });
    expect(add(lost)).toMatchObject({ totalLostGames: 1, totalDraws: 0 });
  });

  it('the games and their results are listed in order', () => {
    const afterWin = add(won, gameOf(1, 0, 'g1'));
    const afterLoss = add(lost, gameOf(0, 1, 'g2'), afterWin);

    expect(afterLoss.gamesIds).toEqual(['g1', 'g2']);
    expect(afterLoss.gamesResults).toEqual([1, -1]);
  });

  it('streaks: the longest run of wins, draws and losses', () => {
    const results = [won, won, draw, lost, lost, lost, won];
    const season = results.reduce(
      (acc, result, i) => add(result, gameOf(0, 0, `g${i}`), acc),
      METADATA_DEFAULT,
    );

    expect(season).toMatchObject({
      gamesMaxWinStreak: 2,
      gamesMaxDraftStreak: 1,
      gamesMaxLostStreak: 3,
    });
  });

  it('a transfer gets no result and the game counts as a transfer game', () => {
    const season = add({ asTransfer: true, asSecondDraft: true });

    expect(season).toMatchObject({
      totalGames: 1,
      totalWonGames: 0,
      totalLostGames: 0,
      totalDraws: 0,
      totalPlayedAsTransfer: 1,
    });
  });

  // GLOSSARY: Last result gives a transfer 0; S3.11 A11 (now -1)
  it.fails('a transfer has a Last result of 0', () => {
    const season = add({ asTransfer: true, asSecondDraft: true });

    expect(season.ancientRatingSystem.lastResult).toBe(0);
    expect(season.gamesResults).toEqual([0]);
  });
});

describe('Season: Old rating system', () => {
  it('points: a pass 1, a leg goal 1, a penalty 1, a head goal 2', () => {
    const season = add({
      totalPasses: 1,
      totalGoalsByLeg: 1,
      totalGoalsByPenalty: 1,
      totalGoalsByHead: 1,
    });

    expect(season.ancientRatingSystem.totalPoints).toBe(5);
  });

  it('plus-minus is the goal difference of the team of the player', () => {
    expect(add(won, gameOf(5, 2)).ancientRatingSystem.plusMinus).toBe(3);
    expect(
      add({ ...lost, asFirstDraft: false, asSecondDraft: true }, gameOf(5, 2))
        .ancientRatingSystem.plusMinus,
    ).toBe(-3);
  });

  it('last result: +1 for a win, 0 for a draw, -1 for a loss', () => {
    expect(add(won).ancientRatingSystem.lastResult).toBe(1);
    expect(add(draw).ancientRatingSystem.lastResult).toBe(0);
    expect(add(lost).ancientRatingSystem.lastResult).toBe(-1);
  });

  it('the points of the games add up over the season', () => {
    const first = add({ totalPasses: 2 }, gameOf(0, 0, 'g1'));
    const second = add({ totalGoalsByLeg: 1 }, gameOf(0, 0, 'g2'), first);

    expect(second.ancientRatingSystem.totalPoints).toBe(3);
  });
});

describe('Season: New rating system', () => {
  it('points: the same points as the Old system plus the bonus of the position', () => {
    const season = add({
      ...won,
      hasPosition: Defender,
      totalPasses: 1,
      totalGoalsByLeg: 1,
    });

    expect(season.positionalRatingSystem.totalPoints).toBe(2 + 3);
  });

  it('a loss of a goalkeeper costs 4', () => {
    const season = add({ ...lost, hasPosition: Goalkeeper });

    expect(season.positionalRatingSystem.totalPoints).toBe(-4);
  });

  // GLOSSARY: both systems exist side by side; S3.11 A12: the New system adds
  // its points to the totals of the Old one
  it.fails('is counted from its own totals, not from the Old system', () => {
    // game 1: a goalkeeper wins with 5 passes: Old 5, New 5 + 4
    const first = add(
      { ...won, hasPosition: Goalkeeper, totalPasses: 5 },
      gameOf(1, 0, 'g1'),
    );
    const second = add({ totalPasses: 1 }, gameOf(0, 0, 'g2'), first);

    expect(second.ancientRatingSystem.totalPoints).toBe(6);
    expect(second.positionalRatingSystem.totalPoints).toBe(10);
  });

  it.fails('plus-minus and Last result are its own too', () => {
    const first = add(won, gameOf(2, 0, 'g1'));
    const other = {
      ...first,
      ancientRatingSystem: {
        ...first.ancientRatingSystem,
        plusMinus: 100,
        lastResult: 100,
      },
    };
    const second = add(won, gameOf(1, 0, 'g2'), other);

    expect(second.positionalRatingSystem.plusMinus).toBe(3);
    expect(second.positionalRatingSystem.lastResult).toBe(2);
  });

  // GLOSSARY: Head goal is x2 everywhere; S3.11 A12
  it.fails('a head goal weighs 2', () => {
    const season = add({ totalGoalsByHead: 1 });

    expect(season.positionalRatingSystem.totalPoints).toBe(2);
  });

  // GLOSSARY: Transfer gets no result, so no bonus; S3.11 A11
  it.fails('a transfer gets no bonus or penalty of the position', () => {
    const season = add({
      asTransfer: true,
      asSecondDraft: true,
      hasPosition: Goalkeeper,
    });

    expect(season.positionalRatingSystem.totalPoints).toBe(0);
  });
});

describe('Season: captains', () => {
  it('the games as a captain are counted and the captain is not "captained by" anybody', () => {
    const season = add({ asCaptain: true });

    expect(season.totalPlayedAsCaptain).toBe(1);
    expect(season.captainedByPlayersIds).toEqual([]);
  });

  it('a player is "captained by" the captain of the draft they played for', () => {
    const first = add({ asFirstDraft: true }, gameOf(0, 0, 'g1'));
    const second = add(
      { asFirstDraft: false, asSecondDraft: true },
      gameOf(0, 0, 'g2'),
      first,
    );

    expect(second.captainedByPlayersIds).toEqual([
      'captain-white',
      'captain-red',
    ]);
  });

  it('the games per draft are counted', () => {
    const season = add({ asFirstDraft: true });

    expect(season).toMatchObject({
      totalPlayedAsFirstDraft: 1,
      totalPlayedAsSecondDraft: 0,
    });
  });

  // S3.11 A13: the game is appended to the list of all games
  it.fails(
    'the list of captained games holds only the games as a captain',
    () => {
      const first = add({}, gameOf(0, 0, 'g1'));
      const second = add({ asCaptain: true }, gameOf(0, 0, 'g2'), first);

      expect(second.captainedGamesIds).toEqual(['g2']);
    },
  );
});

describe('Season: MVP and goals totals', () => {
  it('the three kinds of MVP are counted separately', () => {
    const season = add({ isMvp: true, isMvpByGoals: true });

    expect(season).toMatchObject({
      totalMvp: 1,
      totalMvpByGoals: 1,
      totalMvpByPasses: 0,
    });
  });

  it('goals and passes add up over the games', () => {
    const season = add({
      totalGoalsByLeg: 2,
      totalGoalsByHead: 1,
      totalGoalsByPenalty: 1,
      totalGoals: 4,
      totalPasses: 3,
    });

    expect(season).toMatchObject({
      totalGoalsByLeg: 2,
      totalGoalsByHead: 1,
      totalGoalsByPenalty: 1,
      totalGoals: 4,
      totalPasses: 3,
    });
  });
});
