import { describe, expect, it } from 'vitest';
import type { GameEvent } from '@sfl/schemas';
import { applyEvents, renumber, scoreAfter, type OrderRow } from './goal-order';

const row = (playerId: string, teamId: string): OrderRow => ({
  playerId,
  teamId,
  goalsByLeg: 9,
  goalsByHead: 9,
  goalsByPenalty: 9,
  goalsByAuto: 9,
  passes: 9,
});

const rows = [row('a', 'w'), row('b', 'w'), row('c', 'r'), row('d', 'r')];

const ev = (
  n: number,
  kind: GameEvent['kind'],
  teamId: string,
  authorId: string,
  assistIds: string[] = [],
): GameEvent => ({ n, kind, teamId, authorId, assistIds });

describe('goal order of the match wizard (S10.67)', () => {
  it('sets the totals of the players from the order, passes of an own goal are not passes', () => {
    const out = applyEvents(rows, [
      ev(1, 'goal', 'w', 'a', ['b']),
      ev(2, 'head', 'w', 'b', ['a']),
      ev(3, 'penalty', 'r', 'c'),
      ev(4, 'own', 'w', 'c', ['d']),
    ]);
    const of = (id: string) => out.find(r => r.playerId === id)!;

    expect(of('a')).toMatchObject({ goalsByLeg: 1, goalsByHead: 0, passes: 1 });
    expect(of('b')).toMatchObject({ goalsByHead: 1, goalsByLeg: 0, passes: 1 });
    expect(of('c')).toMatchObject({
      goalsByPenalty: 1,
      goalsByAuto: 1,
      passes: 0,
    });
    expect(of('d')).toMatchObject({ goalsByAuto: 0, passes: 0 });
  });

  it('a player of both teams (transfer) gets the goal on the row of the right team', () => {
    const both = [row('a', 'w'), row('a', 'r'), row('c', 'r')];
    const out = applyEvents(both, [
      ev(1, 'goal', 'r', 'a'),
      ev(2, 'own', 'w', 'a'),
    ]);

    expect(out[0]).toMatchObject({ goalsByLeg: 0, goalsByAuto: 0 });
    expect(out[1]).toMatchObject({ goalsByLeg: 1, goalsByAuto: 1 });
  });

  it('the score after every goal, an own goal counts for the team of the event', () => {
    const score = scoreAfter(
      [
        ev(1, 'goal', 'w', 'a'),
        ev(2, 'own', 'r', 'a'),
        ev(3, 'head', 'w', 'b'),
      ],
      ['w', 'r'],
    );

    expect(score).toEqual([
      [1, 0],
      [1, 1],
      [2, 1],
    ]);
  });

  it('renumbers the goals from 1 after one is removed or moved', () => {
    const out = renumber([ev(3, 'goal', 'w', 'a'), ev(7, 'goal', 'r', 'c')]);

    expect(out.map(e => e.n)).toEqual([1, 2]);
  });
});
