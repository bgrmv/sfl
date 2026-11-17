import { describe, expect, it } from 'vitest';
import { EnumGameStatus } from '../model/game-status';
import type { IGameDTO } from '../model/game';
import { seasonRibbon } from './season-ribbon';

const game = (
  number: number,
  status: string,
  a: number,
  b: number,
  teamWon: string | null,
): IGameDTO =>
  ({
    id: `g${number}`,
    number,
    season: 2026,
    status,
    playedAt: new Date(2026, 0, 3 + (number - 5) * 7),
    teams: [
      { id: 't1', name: 'BMW' },
      { id: 't2', name: 'HONDA' },
    ],
    statistics: [],
    metadata: { scoreFirstDraft: a, scoreSecondDraft: b, teamWon },
  }) as unknown as IGameDTO;

describe('seasonRibbon', () => {
  // Season 2026 starts on the first Saturday after 1 Dec 2025 (6 Dec): game 5 is 3 Jan 2026
  const today = new Date(2026, 0, 12); // Monday: games 1..6 are in the past, 7 is 17 Jan
  const cells = seasonRibbon(
    [
      game(5, EnumGameStatus.Published, 4, 1, 't1'),
      game(6, EnumGameStatus.Published, 2, 2, null),
      game(4, EnumGameStatus.Draft, 0, 0, null),
    ],
    2026,
    today,
  );
  const cell = (n: number) => cells.find(c => c.number === n)!;

  it('has a cell for every Saturday of the season', () => {
    expect(cells.length).toBeGreaterThanOrEqual(52);
    expect(cells[0].number).toBe(1);
  });

  it('shows the score and the winner of a played game and links to it', () => {
    expect(cell(5)).toMatchObject({
      state: 'played',
      score: '4:1',
      mark: 'BMW',
      link: '/games/details/2026/5',
    });
  });

  it('marks a draw with a sign, not with colour', () => {
    expect(cell(6)).toMatchObject({ state: 'played', score: '2:2', mark: '=' });
  });

  it('a draft is not a result: no score, but it links to the game', () => {
    expect(cell(4)).toMatchObject({ state: 'draft', score: null });
    expect(cell(4).link).toBe('/games/details/2026/4');
  });

  it('a past Saturday without a game has no record', () => {
    expect(cell(2)).toMatchObject({ state: 'missed', score: null, link: null });
  });

  it('the coming Saturday is next, later ones are planned', () => {
    expect(cell(7).state).toBe('next');
    expect(cell(8).state).toBe('future');
    expect(cells.filter(c => c.state === 'next')).toHaveLength(1);
  });
});
