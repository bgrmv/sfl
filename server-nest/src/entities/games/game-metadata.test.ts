// League rules for a Game: score, result, captains, MVP and what a player gets
// out of it. The vocabulary is GLOSSARY.md. Where the code still differs from
// a rule, the test is written for the rule and marked `it.fails` with the item
// of S3.11: fixing the code turns it red, then `.fails` is dropped.
import { EnumPlayerPosition } from '../players/constants/player-career-metadata';
import { GamesService } from './games.service';

const WHITE = 'team-white'; // first draft
const RED = 'team-red'; // second draft

const service = new GamesService(
  {} as never,
  {} as never,
  {
    info: vi.fn(),
    error: vi.fn(),
  } as never,
);

const calcGame = (game: any) => (service as any).calculateGameMetadata(game);
const calcPlayer = (playerId: string, game: any) =>
  (service as any).calculatePlayerGameResultMetadata(playerId, game);

const stat = (
  playerId: string,
  teamId: string,
  overrides: Record<string, unknown> = {},
) => ({
  playerId,
  teamId,
  goalsByLeg: 0,
  goalsByHead: 0,
  goalsByAuto: 0,
  goalsByPenalty: 0,
  passes: 0,
  isMVP: false,
  isTransfer: false,
  isCaptain: false,
  position: null,
  ...overrides,
});

/** Captains: `white-cap` and `red-cap`, plus whatever the case adds. */
const game = (...extra: ReturnType<typeof stat>[]) => ({
  id: 'game-1',
  teams: [{ id: WHITE }, { id: RED }],
  statistics: [
    stat('white-cap', WHITE, { isCaptain: true }),
    stat('red-cap', RED, { isCaptain: true }),
    ...extra,
  ],
});

/** Overrides of the captains' own statistics. */
const withCaptains = (white: object, red: object, ...extra: any[]) => {
  const g = game(...extra);
  g.statistics[0] = { ...g.statistics[0], ...white };
  g.statistics[1] = { ...g.statistics[1], ...red };
  return g;
};

/** The player's result in a game: first game metadata, then the player's. */
const resultOf = async (playerId: string, g: ReturnType<typeof game>) =>
  calcPlayer(playerId, { ...g, metadata: await calcGame(g) });

describe('Game: score', () => {
  it('a leg goal and a penalty count 1 each', async () => {
    const m = await calcGame(
      withCaptains({ goalsByLeg: 2, goalsByPenalty: 1 }, { goalsByLeg: 1 }),
    );

    expect(m.score).toEqual([3, 1]);
  });

  it('a head goal counts 2', async () => {
    const m = await calcGame(withCaptains({ goalsByHead: 2 }, {}));

    expect(m.score).toEqual([4, 0]);
    expect(m.totalGoals).toBe(4);
  });

  it('the goals of all players of a team add up', async () => {
    const m = await calcGame(
      game(
        stat('white-2', WHITE, { goalsByLeg: 1 }),
        stat('red-2', RED, { goalsByLeg: 2 }),
      ),
    );

    expect(m.score).toEqual([1, 2]);
    expect(m.scoreFirstDraft).toBe(1);
    expect(m.scoreSecondDraft).toBe(2);
  });

  it('a game without goals is a 0:0 draw', async () => {
    const m = await calcGame(game());

    expect(m).toMatchObject({
      score: [0, 0],
      scoreIsDraw: true,
      teamWon: null,
      teamLost: null,
      totalGoals: 0,
      totalPoints: 0,
    });
  });

  it('a pass is a point but not a goal', async () => {
    const m = await calcGame(withCaptains({ passes: 3 }, {}));

    expect(m).toMatchObject({ totalPasses: 3, totalGoals: 0, totalPoints: 3 });
  });

  it('a statistic of a team that is not in the game is an error', async () => {
    await expect(
      calcGame(game(stat('ghost', 'team-blue', { goalsByLeg: 1 }))),
    ).rejects.toThrow();
  });

  // GLOSSARY: Own goal; S3.11 A5
  it.fails('an own goal counts for the opponent team', async () => {
    const m = await calcGame(withCaptains({ goalsByAuto: 1 }, {}));

    expect(m.score).toEqual([0, 1]);
  });
});

describe('Game: result of the teams', () => {
  it('the team with the bigger score wins, the other loses', async () => {
    const m = await calcGame(
      withCaptains({ goalsByLeg: 2 }, { goalsByLeg: 1 }),
    );

    expect(m).toMatchObject({
      teamWon: WHITE,
      teamLost: RED,
      isTeamFromFirstDraftWon: true,
      isTeamFromFirstDraftLost: false,
      isTeamFromSecondDraftWon: false,
      isTeamFromSecondDraftLost: true,
    });
  });

  it('the second draft can win too', async () => {
    const m = await calcGame(withCaptains({}, { goalsByLeg: 1 }));

    expect(m).toMatchObject({
      teamWon: RED,
      teamLost: WHITE,
      isTeamFromSecondDraftWon: true,
    });
  });

  it('a draw has neither a winner nor a loser', async () => {
    const m = await calcGame(
      withCaptains({ goalsByLeg: 1 }, { goalsByLeg: 1 }),
    );

    expect(m).toMatchObject({
      scoreIsDraw: true,
      teamWon: null,
      teamLost: null,
      isTeamFromFirstDraftWon: false,
      isTeamFromSecondDraftWon: false,
    });
  });
});

describe('Game: captains', () => {
  it('each draft has its captain; the winning captain is the winner', async () => {
    const m = await calcGame(withCaptains({ goalsByLeg: 1 }, {}));

    expect(m).toMatchObject({
      captainFirstDraft: 'white-cap',
      captainSecondDraft: 'red-cap',
      captainWon: 'white-cap',
      captainLost: 'red-cap',
      isCaptainFirstDraftWon: true,
      isCaptainSecondDraftLost: true,
    });
  });

  it('in a draw both captains have a draw', async () => {
    const m = await calcGame(game());

    expect(m).toMatchObject({
      isCaptainFirstDraftDraw: true,
      isCaptainSecondDraftDraw: true,
      isCaptainFirstDraftWon: false,
      isCaptainSecondDraftLost: false,
    });
  });

  // S3.11 A4: captainWon and captainLost both point at the second captain
  it.fails('in a draw there is no winning and no losing captain', async () => {
    const m = await calcGame(game());

    expect(m.captainWon).toBeNull();
    expect(m.captainLost).toBeNull();
  });

  // S3.11 A7: a draft without a captain is a rejected game, not a crash
  it.fails('a game without a captain in a draft is rejected', async () => {
    const g = game();
    g.statistics[1].isCaptain = false;

    await expect(calcGame(g)).rejects.toMatchObject({ status: 400 });
  });
});

describe('Game: MVP', () => {
  it('the player named by the organizer is MVP', async () => {
    const m = await calcGame(game(stat('star', WHITE, { isMVP: true })));

    expect(m.mvpListIds).toEqual(['star']);
  });

  it('the pass leader is MVP by passes; leaders in a tie all are', async () => {
    const m = await calcGame(
      withCaptains(
        { passes: 2 },
        { passes: 2 },
        stat('x', WHITE, { passes: 1 }),
      ),
    );

    expect(m.mvpByPassesIds.sort()).toEqual(['red-cap', 'white-cap']);
  });

  it('without passes there is no MVP by passes', async () => {
    const m = await calcGame(game());

    expect(m.mvpByPassesIds).toEqual([]);
  });

  it('without goals there is no MVP by goals', async () => {
    const m = await calcGame(game());

    expect(m.mvpByGoalsIds).toEqual([]);
  });

  // S3.11 A3: mvpByGoalsIds looks at head goals only
  it.fails(
    'the goal leader is MVP by goals, whatever the kind of goals',
    async () => {
      const m = await calcGame(
        withCaptains({ goalsByLeg: 3 }, { goalsByLeg: 1 }),
      );

      expect(m.mvpByGoalsIds).toEqual(['white-cap']);
    },
  );

  // GLOSSARY: Head goal is x2 in MVP by goals; S3.11 A3/A6
  it.fails(
    'a head goal is worth two leg goals for the MVP by goals',
    async () => {
      const m = await calcGame(
        withCaptains({ goalsByLeg: 2 }, { goalsByHead: 1 }),
      );

      expect(m.mvpByGoalsIds.sort()).toEqual(['red-cap', 'white-cap']);
    },
  );
});

describe('Player in a Game: result', () => {
  it('a player of the winning first draft wins, of the losing second draft loses', async () => {
    const g = withCaptains({ goalsByLeg: 1 }, {}, stat('white-2', WHITE));

    expect(await resultOf('white-2', g)).toMatchObject({
      hasWon: true,
      hasLose: false,
      hasDraw: false,
      asFirstDraft: true,
      asSecondDraft: false,
    });
  });

  it('everybody has a draw when the score is a draw', async () => {
    const r = await resultOf('white-cap', game());

    expect(r).toMatchObject({ hasDraw: true, hasWon: false, hasLose: false });
  });

  // S3.11 A1: hasWon and hasLose are computed for the first draft only
  it.fails('a player of the winning second draft wins', async () => {
    const g = withCaptains({}, { goalsByLeg: 3 }, stat('red-2', RED));

    expect(await resultOf('red-2', g)).toMatchObject({
      hasWon: true,
      hasLose: false,
      asSecondDraft: true,
    });
  });

  it.fails('a player of the losing second draft loses', async () => {
    const g = withCaptains({ goalsByLeg: 3 }, {}, stat('red-2', RED));

    expect(await resultOf('red-2', g)).toMatchObject({
      hasLose: true,
      hasWon: false,
    });
  });

  it('a captain is marked as captain, a player with a position keeps it', async () => {
    const g = game(
      stat('keeper', WHITE, { position: EnumPlayerPosition.Goalkeeper }),
    );

    expect(await resultOf('white-cap', g)).toMatchObject({
      asCaptain: true,
      hasPosition: null,
    });
    expect(await resultOf('keeper', g)).toMatchObject({
      asCaptain: false,
      hasPosition: EnumPlayerPosition.Goalkeeper,
    });
  });

  it('the MVP flags of the game reach the player', async () => {
    const g = withCaptains(
      { passes: 1 },
      {},
      stat('star', RED, { isMVP: true }),
    );

    expect(await resultOf('star', g)).toMatchObject({
      isMvp: true,
      isMvpByPasses: false,
    });
    expect(await resultOf('white-cap', g)).toMatchObject({
      isMvp: false,
      isMvpByPasses: true,
    });
  });
});

describe('Player in a Game: goals and points', () => {
  it('passes and leg goals add up to the points', async () => {
    const g = withCaptains({ goalsByLeg: 2, passes: 3 }, {});

    expect(await resultOf('white-cap', g)).toMatchObject({
      totalGoalsByLeg: 2,
      totalPasses: 3,
      totalGoals: 2,
      totalPoints: 5,
    });
  });

  // S3.11 A2: the penalty is read from the head goals
  it.fails('a penalty is counted as a penalty goal', async () => {
    const g = withCaptains({ goalsByPenalty: 2 }, {});

    expect(await resultOf('white-cap', g)).toMatchObject({
      totalGoalsByPenalty: 2,
      totalGoals: 2,
    });
  });

  // GLOSSARY: Head goal is x2 everywhere; S3.11 A2/A6 (the penalty bug
  // copies the head goals, so only a case with all three kinds tells them apart)
  it.fails(
    'a head goal weighs 2, a leg goal and a penalty 1, for the player',
    async () => {
      const g = withCaptains(
        { goalsByLeg: 1, goalsByHead: 1, goalsByPenalty: 1, passes: 1 },
        {},
      );

      expect(await resultOf('white-cap', g)).toMatchObject({
        totalGoals: 4,
        totalPoints: 5,
      });
    },
  );

  // GLOSSARY: Own goal gives the author -1 point; S3.11 A5
  it.fails('an own goal costs the author a point', async () => {
    const g = withCaptains({ goalsByAuto: 1, passes: 1 }, {});

    expect(await resultOf('white-cap', g)).toMatchObject({
      totalGoalsByAuto: 1,
      totalPoints: 0,
    });
  });
});

describe('Player in a Game: transfer (plays for both teams)', () => {
  const transferGame = () =>
    withCaptains(
      { goalsByLeg: 2 },
      {},
      stat('guest', WHITE, { goalsByLeg: 1, passes: 1 }),
      stat('guest', RED, { goalsByLeg: 1 }),
    );

  it('neither wins, loses nor draws, and plays for both drafts', async () => {
    expect(await resultOf('guest', transferGame())).toMatchObject({
      hasWon: false,
      hasLose: false,
      hasDraw: false,
      asFirstDraft: true,
      asSecondDraft: true,
    });
  });

  // GLOSSARY: Transfer; S3.11 A11: only the first row of the statistics is used
  it.fails(
    'goals and passes of both teams count for the transfer',
    async () => {
      expect(await resultOf('guest', transferGame())).toMatchObject({
        totalGoalsByLeg: 2,
        totalPasses: 1,
        totalPoints: 3,
      });
    },
  );

  it('the goals of a transfer go to the team they were scored for', async () => {
    const m = await calcGame(transferGame());

    expect(m.score).toEqual([3, 1]);
  });
});

describe('Game: statistics of one player on both sides', () => {
  it('the players of each draft are listed by draft', async () => {
    const m = await calcGame(game(stat('white-2', WHITE), stat('red-2', RED)));

    expect(m.playerIdsOfFirstDraft).toEqual(['white-cap', 'white-2']);
    expect(m.playerIdsOfSecondDraft).toEqual(['red-cap', 'red-2']);
    expect(m.totalPlayers).toBe(4);
  });

  it('a transfer is one player, listed in both drafts', async () => {
    const m = await calcGame(game(stat('guest', WHITE), stat('guest', RED)));

    expect(m.totalPlayers).toBe(3);
    expect(m.playerIdsOfFirstDraft).toContain('guest');
    expect(m.playerIdsOfSecondDraft).toContain('guest');
  });
});
