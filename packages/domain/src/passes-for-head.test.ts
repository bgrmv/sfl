// A pass before a goal by head is worth 2 (GLOSSARY, decision of the owner 2026-11-17, S10.27).
// The order of the goals says which passes they were: without it a pass is 1.
import { describe, expect, it } from 'vitest';

import {
  calculateGameMetadata,
  calculatePlayerGameResultMetadata,
  type GameInput,
} from './game-metadata.js';
import { applyGame } from './player-season-metadata.js';
import { METADATA_DEFAULT } from './metadata.js';

const stat = (playerId: string, teamId: string, over = {}) => ({
  playerId,
  teamId,
  isCaptain: ['a', 'x'].includes(playerId),
  position: null,
  ...over,
});

// a scores with the head after the pass of b, scores with the leg after the pass of c
const base: GameInput = {
  teams: [{ id: 'T1' }, { id: 'T2' }],
  statistics: [
    stat('a', 'T1', { goalsByHead: 1, goalsByLeg: 1 }),
    stat('b', 'T1', { passes: 1 }),
    stat('c', 'T1', { passes: 1 }),
    stat('x', 'T2', {}),
  ],
};
const events = [
  { kind: 'head' as const, teamId: 'T1', authorId: 'a', assistIds: ['b'] },
  { kind: 'goal' as const, teamId: 'T1', authorId: 'a', assistIds: ['c'] },
];

const result = (playerId: string, game: GameInput) =>
  calculatePlayerGameResultMetadata(playerId, {
    ...game,
    metadata: calculateGameMetadata(game),
  });

describe('a pass before a goal by head', () => {
  it('weighs 2 for the passer, a pass before a leg goal stays 1', () => {
    const game = { ...base, events };

    expect(result('b', game).totalPoints).toBe(2);
    expect(result('c', game).totalPoints).toBe(1);
    expect(result('b', game).totalPassesForHead).toBe(1);
    expect(result('c', game).totalPassesForHead).toBeUndefined();
  });

  it('is 1 without the order of the goals: nothing changes for a game without events', () => {
    expect(result('b', base).totalPoints).toBe(1);
    expect(result('b', base).totalPassesForHead).toBeUndefined();
  });

  it('the points of the author and of the game do not change but the game counts the extra point', () => {
    const plain = result('a', base);
    const withEvents = result('a', { ...base, events });

    expect(withEvents.totalPoints).toBe(plain.totalPoints);
    expect(
      calculateGameMetadata({ ...base, events }).totalPoints,
    ).toBe(calculateGameMetadata(base).totalPoints + 1);
  });

  it('a pass before a penalty or an own goal is 1', () => {
    const game: GameInput = {
      teams: base.teams,
      statistics: [
        stat('a', 'T1', { goalsByPenalty: 1 }),
        stat('b', 'T1', { passes: 1 }),
        stat('x', 'T2', { goalsByAuto: 0 }),
      ],
      events: [
        { kind: 'penalty', teamId: 'T1', authorId: 'a', assistIds: ['b'] },
      ],
    };

    expect(result('b', game).totalPoints).toBe(1);
  });

  it('counts the extra point in both rating systems of the season', () => {
    const input = result('b', { ...base, events });
    const season = applyGame(
      METADATA_DEFAULT,
      { ...input, hasWon: false, hasLose: false, hasDraw: true } as never,
      {
        id: 'g1',
        metadata: {
          scoreFirstDraft: 2,
          scoreSecondDraft: 0,
          captainFirstDraft: 'a',
          captainSecondDraft: 'x',
        } as never,
      },
    );

    expect(season.ancientRatingSystem.totalPoints).toBe(2);
    expect(season.positionalRatingSystem.totalPoints).toBeGreaterThanOrEqual(2);
  });
});
