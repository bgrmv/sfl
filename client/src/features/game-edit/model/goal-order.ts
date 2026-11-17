import type { GameEvent } from '@sfl/schemas';

// The order of the goals of a game (S10.27, S10.67): the wizard builds the list of
// the goals, the totals of the players are derived from it, so they cannot disagree.

/** The part of a row of the statistics that the order sets. */
export interface OrderRow {
  playerId: string;
  teamId: string;
  goalsByLeg: number;
  goalsByHead: number;
  goalsByPenalty: number;
  goalsByAuto?: number;
  passes: number;
}

const FIELD = {
  goal: 'goalsByLeg',
  head: 'goalsByHead',
  penalty: 'goalsByPenalty',
  own: 'goalsByAuto',
} as const;

/** The goals are numbered 1, 2, 3 in the order given. */
export const renumber = (events: readonly GameEvent[]): GameEvent[] =>
  events.map((event, i) => ({ ...event, n: i + 1 }));

/**
 * The totals of the players as the order says: every goal and pass of the rows is
 * counted from the events. A goal goes to the row of the author in the team of the
 * goal (an own goal: in a rival team); a pass to the row of the passer in the team of
 * the goal. The participants of an own goal are not passes.
 */
export function applyEvents<T extends OrderRow>(
  rows: readonly T[],
  events: readonly GameEvent[],
): T[] {
  const out = rows.map(r => ({
    ...r,
    goalsByLeg: 0,
    goalsByHead: 0,
    goalsByPenalty: 0,
    goalsByAuto: 0,
    passes: 0,
  }));

  for (const event of events) {
    const own = event.kind === 'own';
    const author = out.find(
      r =>
        r.playerId === event.authorId &&
        (own ? r.teamId !== event.teamId : r.teamId === event.teamId),
    );
    if (author) author[FIELD[event.kind]] += 1;

    if (own) continue;
    for (const id of event.assistIds) {
      const passer = out.find(
        r => r.playerId === id && r.teamId === event.teamId,
      );
      if (passer) passer.passes += 1;
    }
  }
  return out;
}

/** The score `[first, second]` after every goal; the goal counts for `event.teamId`. */
export function scoreAfter(
  events: readonly GameEvent[],
  teamIds: readonly [string, string],
): [number, number][] {
  const score: [number, number] = [0, 0];
  return events.map(event => {
    const side = teamIds.indexOf(event.teamId);
    if (side >= 0) score[side] += 1;
    return [score[0], score[1]];
  });
}
