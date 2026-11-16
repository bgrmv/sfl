// Incremental season statistics (ADR 0017): applyGame / revertGame change the
// additive fields, rebuildGameSequence the order-dependent ones; together they
// must give exactly what the full accumulation over the games gives.
import {
  METADATA_BY_GAME_DEFAULT,
  METADATA_COMMON_TOTALS_GAME_DEFAULT,
  METADATA_DEFAULT,
  type IPlayerMetadata,
} from './metadata.js';
import {
  accumulatePlayerSeasonMetadata,
  applyGame,
  rebuildGameSequence,
  revertGame,
} from './player-season-metadata.js';

// Deterministic generator: the same seed, the same games
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

const POSITIONS = [null, 'GK', 'DEF', 'MID', 'FRWD'] as const;

function generateGames(seed: number, count: number) {
  const rnd = random(seed);
  const int = (max: number) => Math.floor(rnd() * (max + 1));
  const pick = <T>(items: readonly T[]) => items[int(items.length - 1)];

  return Array.from({ length: count }, (_, index) => {
    const asFirstDraft = rnd() < 0.5;
    const asTransfer = rnd() < 0.1;
    const outcome = pick(['won', 'draw', 'lose'] as const);
    const asCaptain = rnd() < 0.2;
    const goals = {
      totalGoalsByLeg: int(3),
      totalGoalsByHead: int(2),
      totalGoalsByPenalty: int(1),
      totalGoalsByAuto: int(1),
    };
    const input = {
      ...METADATA_BY_GAME_DEFAULT,
      ...METADATA_COMMON_TOTALS_GAME_DEFAULT,
      ...goals,
      totalGoals:
        goals.totalGoalsByLeg +
        goals.totalGoalsByHead +
        goals.totalGoalsByPenalty,
      totalPasses: int(4),
      asFirstDraft,
      asSecondDraft: !asFirstDraft,
      asCaptain,
      asTransfer,
      hasWon: !asTransfer && outcome === 'won',
      hasDraw: !asTransfer && outcome === 'draw',
      hasLose: !asTransfer && outcome === 'lose',
      hasPosition: pick(POSITIONS),
      isMvp: rnd() < 0.1,
      isMvpByGoals: rnd() < 0.1,
      isMvpByPasses: rnd() < 0.1,
    } as any;
    const game = {
      id: `game-${index + 1}`,
      metadata: {
        scoreFirstDraft: int(6),
        scoreSecondDraft: int(6),
        captainFirstDraft: `captain-${int(3)}`,
        captainSecondDraft: `captain-${int(3) + 4}`,
      },
    };
    return { input, game };
  });
}

type Played = ReturnType<typeof generateGames>[number];

const sequenceOf = ({ input, game }: Played) => ({
  id: game.id,
  metadata: game.metadata,
  player: input,
});

const full = (played: Played[]): IPlayerMetadata =>
  played.reduce(
    (season, { input, game }) =>
      accumulatePlayerSeasonMetadata(season, input, game),
    METADATA_DEFAULT,
  );

const incremental = (played: Played[]): IPlayerMetadata =>
  rebuildGameSequence(
    played.reduce(
      (season, { input, game }) => applyGame(season, input, game),
      METADATA_DEFAULT,
    ),
    played.map(sequenceOf),
  );

const shuffle = <T>(items: T[], seed: number) => {
  const rnd = random(seed);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const SEEDS = Array.from({ length: 25 }, (_, i) => i + 1);

describe('applyGame and revertGame (additive fields)', () => {
  it('adds the contribution of one game', () => {
    const [played] = generateGames(7, 1);
    const result = applyGame(METADATA_DEFAULT, played.input, played.game);

    expect(result.totalGames).toBe(1);
    expect(result.totalPasses).toBe(played.input.totalPasses);
  });

  it('does not touch the order-dependent fields', () => {
    const [played] = generateGames(7, 1);
    const result = applyGame(METADATA_DEFAULT, played.input, played.game);

    expect(result.gamesIds).toEqual([]);
    expect(result.gamesResults).toEqual([]);
    expect(result.gamesMaxWinStreak).toBe(0);
  });

  it('does not change the original', () => {
    const [played] = generateGames(7, 1);
    const before = structuredClone(METADATA_DEFAULT);

    applyGame(METADATA_DEFAULT, played.input, played.game);

    expect(METADATA_DEFAULT).toEqual(before);
  });

  it.each(SEEDS)('apply then revert returns the original (seed %i)', seed => {
    const [base, extra] = [generateGames(seed, 6), generateGames(seed + 100, 1)];
    const season = incremental(base);
    const [{ input, game }] = extra;

    const result = revertGame(applyGame(season, input, game), input, game);

    expect(result).toEqual(season);
  });

  it.each(SEEDS)('the order of the games does not matter (seed %i)', seed => {
    const played = generateGames(seed, 12);
    const apply = (list: Played[]) =>
      list.reduce(
        (season, { input, game }) => applyGame(season, input, game),
        METADATA_DEFAULT,
      );

    expect(apply(shuffle(played, seed))).toEqual(apply(played));
  });

  it.each(SEEDS)('revert of every game gives zeros (seed %i)', seed => {
    const played = generateGames(seed, 8);
    const added = played.reduce(
      (season, { input, game }) => applyGame(season, input, game),
      METADATA_DEFAULT,
    );

    const result = shuffle(played, seed + 1).reduce(
      (season, { input, game }) => revertGame(season, input, game),
      added,
    );

    // A season with games has no `totalPoints` (the shape of the stored seasons)
    const { totalPoints: _legacy, ...zeros } = METADATA_DEFAULT as any;
    expect(result).toEqual(zeros);
  });
});

describe('incremental equals the full accumulation', () => {
  it.each(SEEDS)('game by game (seed %i)', seed => {
    const played = generateGames(seed, 15);

    expect(incremental(played)).toEqual(full(played));
  });

  it.each(SEEDS)('after a game is removed (seed %i)', seed => {
    const played = generateGames(seed, 10);
    const removed = played[seed % played.length];
    const withAll = incremental(played);

    const result = rebuildGameSequence(
      revertGame(withAll, removed.input, removed.game),
      played.filter(p => p !== removed).map(sequenceOf),
    );

    expect(result).toEqual(full(played.filter(p => p !== removed)));
  });

  it.each(SEEDS)('after a game is replaced (seed %i)', seed => {
    const played = generateGames(seed, 10);
    const [replacement] = generateGames(seed + 500, 1);
    const index = seed % played.length;
    const changed = { ...replacement, game: { ...replacement.game, id: played[index].game.id } };
    const next = played.map((p, i) => (i === index ? changed : p));

    const result = rebuildGameSequence(
      applyGame(
        revertGame(incremental(played), played[index].input, played[index].game),
        changed.input,
        changed.game,
      ),
      next.map(sequenceOf),
    );

    expect(result).toEqual(full(next));
  });

  it('an empty season is the default', () => {
    expect(incremental([])).toEqual(METADATA_DEFAULT);
  });
});

describe('rebuildGameSequence', () => {
  it('rebuilds lists and streaks only', () => {
    const played = generateGames(3, 5);
    const additive = played.reduce(
      (season, { input, game }) => applyGame(season, input, game),
      METADATA_DEFAULT,
    );

    const result = rebuildGameSequence(additive, played.map(sequenceOf));

    expect(result.gamesIds).toEqual(played.map(p => p.game.id));
    expect({ ...result, gamesIds: [] }).toMatchObject({
      totalGames: additive.totalGames,
    });
  });
});
