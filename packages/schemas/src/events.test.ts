// The order of the goals must match the totals of the players (S10.27).
import { describe, expect, it } from 'vitest';

import {
  gameEventViolations,
  gameInputSchema,
  type GameEventsToCheck,
} from './schemas.js';

const stat = (playerId: string, teamId: string, over = {}) => ({
  playerId,
  teamId,
  isCaptain: false,
  goalsByLeg: 0,
  goalsByHead: 0,
  goalsByPenalty: 0,
  goalsByAuto: 0,
  passes: 0,
  ...over,
});

// T1: a scores with the head (pass of b) and with the leg (pass of c); T2: x scores a penalty
const game = (over: Partial<GameEventsToCheck> = {}): GameEventsToCheck => ({
  teams: [{ id: 'T1' }, { id: 'T2' }],
  statistics: [
    stat('a', 'T1', { goalsByHead: 1, goalsByLeg: 1, isCaptain: true }),
    stat('b', 'T1', { passes: 1 }),
    stat('c', 'T1', { passes: 1 }),
    stat('x', 'T2', { goalsByPenalty: 1, isCaptain: true }),
  ],
  events: [
    { n: 1, kind: 'head', teamId: 'T1', authorId: 'a', assistIds: ['b'] },
    { n: 2, kind: 'penalty', teamId: 'T2', authorId: 'x', assistIds: [] },
    { n: 3, kind: 'goal', teamId: 'T1', authorId: 'a', assistIds: ['c'] },
  ],
  ...over,
});

const paths = (g: GameEventsToCheck) =>
  gameEventViolations(g).map(v => v.path);

describe('gameEventViolations', () => {
  it('a game without events has none, and so has a full match', () => {
    expect(gameEventViolations(game({ events: undefined }))).toEqual([]);
    expect(gameEventViolations(game())).toEqual([]);
  });

  it('an empty list does not match a game with goals', () => {
    expect(paths(game({ events: [] }))).toContain('events');
  });

  it('an extra goal is named by its place', () => {
    const g = game();
    g.events!.push({ n: 4, kind: 'goal', teamId: 'T1', authorId: 'a', assistIds: [] });

    expect(paths(g)).toContain('events.3.authorId');
  });

  it('a goal that is missing is named by the player and the kind', () => {
    const g = game();
    g.events!.pop();

    expect(paths(g)).toEqual(expect.arrayContaining(['events', 'statistics.a.goalsByLeg']));
  });

  it('a pass to the scorer himself is a violation', () => {
    const g = game();
    g.events![0].assistIds = ['a'];

    expect(paths(g)).toContain('events.0.assistIds.0');
  });

  it('a pass from a player of the other team is a violation', () => {
    const g = game();
    g.events![0].assistIds = ['x'];

    expect(paths(g)).toContain('events.0.assistIds.0');
  });

  it('four passers instead of three, and the same player twice in one goal', () => {
    const g = game();
    g.statistics[1] = stat('b', 'T1', { passes: 2 });
    g.events![0].assistIds = ['b', 'b'];
    expect(paths(g)).toContain('events.0.assistIds.1');

    const many = game();
    many.events![0].assistIds = ['b', 'c', 'q', 'r'];
    expect(paths(many)).toContain('events.0.assistIds');
  });

  it('the passes of the players must be the passes of the events', () => {
    const g = game();
    g.statistics[1] = stat('b', 'T1', { passes: 2 });

    expect(paths(g)).toContain('statistics.b.passes');
  });

  it('the goals are numbered 1, 2, 3 in the order given', () => {
    const g = game();
    g.events![1].n = 7;

    expect(paths(g)).toContain('events.1.n');
  });

  it('a goal is credited to a team of the game, scored by a player of that team', () => {
    const g = game();
    g.events![0].teamId = 'T9';
    expect(paths(g)).toContain('events.0.teamId');

    const wrong = game();
    wrong.events![2] = { n: 3, kind: 'goal', teamId: 'T2', authorId: 'a', assistIds: [] };
    expect(paths(wrong)).toContain('events.2.authorId');
  });

  it('an own goal is credited to the other team and its participants are up to four', () => {
    const g: GameEventsToCheck = {
      teams: [{ id: 'T1' }, { id: 'T2' }],
      statistics: [
        stat('a', 'T1', { goalsByAuto: 1, isCaptain: true }),
        stat('b', 'T2', { isCaptain: true }),
        stat('c', 'T2', {}),
      ],
      events: [{ n: 1, kind: 'own', teamId: 'T2', authorId: 'a', assistIds: ['b', 'c'] }],
    };
    expect(gameEventViolations(g)).toEqual([]);

    g.events![0].teamId = 'T1';
    expect(paths(g)).toContain('events.0.authorId');
  });

  it('a pass before a penalty is allowed', () => {
    const g = game();
    g.statistics[3] = stat('x', 'T2', { goalsByPenalty: 1, isCaptain: true });
    g.statistics.push(stat('y', 'T2', { passes: 1 }));
    g.events![1].assistIds = ['y'];

    expect(gameEventViolations(g)).toEqual([]);
  });

  it('a player of both teams (transfer) scores for the team of the goal', () => {
    const g: GameEventsToCheck = {
      teams: [{ id: 'T1' }, { id: 'T2' }],
      statistics: [
        stat('a', 'T1', { goalsByLeg: 1, isCaptain: true }),
        stat('a', 'T2', { goalsByLeg: 1 }),
        stat('x', 'T2', { isCaptain: true }),
      ],
      events: [
        { n: 1, kind: 'goal', teamId: 'T1', authorId: 'a', assistIds: [] },
        { n: 2, kind: 'goal', teamId: 'T2', authorId: 'a', assistIds: [] },
      ],
    };

    expect(gameEventViolations(g)).toEqual([]);
  });
});

describe('gameInputSchema with events', () => {
  const body = {
    number: 1,
    season: 2024,
    playedAt: '2024-09-01T10:00:00.000Z',
    status: 'draft',
    teams: [
      { id: 'T1', name: 'White', color: 'WHITE', description: '', logo: '' },
      { id: 'T2', name: 'Red', color: 'RED', description: '', logo: '' },
    ],
    link: '',
    description: '',
    notes: ['', ''],
    statistics: [
      stat('a', 'T1', { goalsByLeg: 1, isCaptain: true, position: 'GK', isMVP: false, isTransfer: false }),
      stat('x', 'T2', { isCaptain: true, position: 'DEF', isMVP: false, isTransfer: false }),
    ],
  };

  it('a game with events that match is accepted, one that does not is refused with the path', () => {
    const ok = gameInputSchema.safeParse({
      ...body,
      events: [{ n: 1, kind: 'goal', teamId: 'T1', authorId: 'a', assistIds: [] }],
    });
    expect(ok.success).toBe(true);

    const bad = gameInputSchema.safeParse({ ...body, events: [] });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues.map(i => i.path.join('.'))).toContain('events');
  });

  it('a game without events is as before', () => {
    expect(gameInputSchema.safeParse(body).success).toBe(true);
  });
});
