import { describe, expect, it } from 'vitest';

import { EnumGameStatus } from '../../constants';
import { IGameDTO } from '../../types';
import { buildSeasonCards, placeholderCard } from './season-cards';

describe('season cards', () => {
  it('fills every Saturday with a placeholder and keeps played games', () => {
    const played = { id: 'real-2', number: 2, season: 2025 } as IGameDTO;
    const cards = buildSeasonCards([played], 2025);

    expect(cards.length).toBeGreaterThanOrEqual(52);
    expect(cards[0].id).toBe('game-card-2025-1');
    expect(cards[1]).toBe(played);
    expect(
      cards.every(card => card.id === 'real-2' || card.playedAt.getDay() === 6),
    ).toBe(true);
  });

  it('a placeholder is an empty future game', () => {
    const card = placeholderCard({
      season: 2025,
      number: 7,
      playedAt: new Date(),
    });

    expect(card).toMatchObject({
      status: EnumGameStatus.Furture,
      teams: [],
      statistics: [],
    });
  });

  it('the first card is the first Saturday after 1 December, in any time zone', () => {
    // 1 December 2018 is a Saturday: the season starts a week later
    const [first] = buildSeasonCards([], 2019);

    expect([
      first.playedAt.getFullYear(),
      first.playedAt.getMonth(),
      first.playedAt.getDate(),
    ]).toEqual([2018, 11, 8]);
  });
});
