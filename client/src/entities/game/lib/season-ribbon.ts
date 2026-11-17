import { format, isSameDay } from 'date-fns';
import { nextSaturday } from '@shared/lib/saturdays';
import type { RibbonCell } from '@shared/ui/kit';
import { EnumGameStatus } from '../model/game-status';
import type { IGameDTO } from '../model/game';
import { buildSeasonCards } from '../model/season-cards';

/**
 * The season as a ribbon of Saturdays: a played game with its score and winner, a draft,
 * the next Saturday, planned ones, and past Saturdays that have no record.
 */
export function seasonRibbon(
  games: readonly IGameDTO[],
  season: number,
  today: Date,
): RibbonCell[] {
  const next = nextSaturday(today);
  // Placeholders already in the store are dropped: the cards are rebuilt from real games
  const real = games.filter(g => g.status !== EnumGameStatus.Furture);

  return buildSeasonCards([...real], season).map(card => {
    const base = { number: card.number, date: format(card.playedAt, 'd MMM') };

    if (card.status === EnumGameStatus.Published) {
      const m = card.metadata ?? {};
      const winner = card.teams.find(t => t.id === m.teamWon)?.name;
      return {
        ...base,
        state: 'played' as const,
        score: `${m.scoreFirstDraft ?? 0}:${m.scoreSecondDraft ?? 0}`,
        mark: winner ?? '=',
        link: `/games/details/${season}/${card.number}`,
      };
    }
    if (card.status === EnumGameStatus.Skipped) {
      return {
        ...base,
        state: 'skipped' as const,
        score: null,
        mark: 'skip',
        link: null,
      };
    }
    if (card.status !== EnumGameStatus.Furture) {
      return {
        ...base,
        state: 'draft' as const,
        score: null,
        mark: 'draft',
        link: `/games/details/${season}/${card.number}`,
      };
    }
    const state = isSameDay(card.playedAt, next)
      ? ('next' as const)
      : card.playedAt > today
        ? ('future' as const)
        : ('missed' as const);
    return { ...base, state, score: null, mark: '', link: null };
  });
}
