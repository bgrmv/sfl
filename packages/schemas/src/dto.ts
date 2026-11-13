// Types of the API: taken from the schemas, never written by hand twice.
import type * as z from 'zod/mini';

import type {
  gameInputSchema,
  gameShape,
  gameUpdateInputSchema,
  playerShape,
  playerStatisticSchema,
  playerUserShape,
  signInSchema,
  teamInGameInputSchema,
  teamInputSchema,
  teamShape,
} from './schemas.js';

/** A team of a game as it travels over the API. */
export type TeamDTO = z.infer<typeof teamShape>;
/** What one player did in one game (a transfer has a row per team). */
export type PlayerStatisticDTO = z.infer<typeof playerStatisticSchema>;
/** The person behind a player; `id`, `email`, `surname` for an ADMIN only (S8.10). */
export type PlayerUserDTO = z.infer<typeof playerUserShape>;
/** A player as it travels over the API. */
export type PlayerDTO = z.infer<typeof playerShape>;
/** A game as it travels over the API: dates are ISO strings. */
export type GameDTO = z.infer<typeof gameShape>;

/** What the client sends to create a team. */
export type TeamInput = z.input<typeof teamInputSchema>;
export type TeamInGameInput = z.input<typeof teamInGameInputSchema>;
/** What the client sends to create or replace a game (before validation). */
export type GameInput = z.input<typeof gameInputSchema>;
/** The same after validation: `playedAt` is a Date. */
export type GameInputParsed = z.output<typeof gameInputSchema>;
export type GameUpdateInput = z.input<typeof gameUpdateInputSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
