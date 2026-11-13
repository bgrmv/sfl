// The shape of the API, declared once as zod schemas. The client and the
// server validate with the same code and take their types from here (z.infer).
// The words and the rules are the ones of GLOSSARY.md.
//
// `zod/mini`, not the classic `zod`: the classic API cannot be tree-shaken and
// would add about 90 kB (gzip) to the client bundle, mini about 7 kB.
import * as z from 'zod/mini';

import {
  EnumGameStatus,
  EnumPlayerPosition,
  EnumTeamColor,
} from './enums.js';

const text = z.string().check(z.trim());
/** `null` and a missing value become an empty string (the API never stores null text). */
const textOrEmpty = z.pipe(
  z.nullish(z.string()),
  z.transform(value => (value ?? '').trim()),
);

// ---- Player statistic ------------------------------------------------------

const count = z.int().check(z.gte(0));

/**
 * What one player did in one game. A transfer has a row per team. `position` is
 * empty only in a game that is not published yet. Games saved before own goals
 * were counted have no `goalsByAuto`: it is 0.
 */
export const playerStatisticSchema = z.object({
  playerId: text,
  teamId: text,
  goalsByLeg: count,
  goalsByHead: count,
  goalsByAuto: z._default(count, 0),
  goalsByPenalty: count,
  passes: count,
  isMVP: z.boolean(),
  isTransfer: z.boolean(),
  isCaptain: z.boolean(),
  position: z.pipe(
    z.nullish(z.enum(EnumPlayerPosition)),
    z.transform(value => value ?? null),
  ),
});

// ---- Team --------------------------------------------------------------------

// Responses use loose objects at run time: a field the schema does not know is
// kept, not dropped, so checking a response at the client boundary never loses
// data. The types come from the strict `*Shape` (a loose type has an index
// signature that spoils property access).

/** A team as the server sends it. */
export const teamShape = z.object({
  id: text,
  name: z.string(),
  color: z.enum(EnumTeamColor),
  description: z.nullish(z.string()),
  logo: z.nullish(z.string()),
});
export const teamSchema = z.looseObject(teamShape.shape);

const teamFields = {
  name: z.string().check(z.trim(), z.minLength(3)),
  color: z.enum(EnumTeamColor),
  description: textOrEmpty,
  logo: textOrEmpty,
};

/** A new team (`POST /teams`). */
export const teamInputSchema = z.object(teamFields);
/** A team inside a game: the same plus its id. */
export const teamInGameInputSchema = z.object({ id: text, ...teamFields });

// ---- Player ------------------------------------------------------------------

/**
 * The person behind a player. `id`, `email` and `surname` are sent to an ADMIN
 * only; everybody else gets `name` and `avatar` (S8.10).
 */
export const playerUserShape = z.object({
  id: z.optional(z.string()),
  email: z.optional(z.string()),
  name: z.optional(z.string()),
  surname: z.optional(z.string()),
  avatar: z.optional(z.string()),
});
export const playerUserSchema = z.looseObject(playerUserShape.shape);

/** A player as the server sends it. */
export const playerShape = z.object({
  id: z.string(),
  nickname: z.string(),
  number: z.optional(z.number()),
  avatar: z.optional(z.string()),
  isCaptain: z._default(z.boolean(), false),
  user: playerUserShape,
});
export const playerSchema = z.looseObject({
  ...playerShape.shape,
  user: playerUserSchema,
});
export const playersSchema = z.array(playerSchema);

// ---- Game --------------------------------------------------------------------

/**
 * A game as the server sends it. Dates are ISO strings on the wire. `metadata`
 * is calculated by the server; its shape is typed once the domain package
 * exists (S3.1), until then it is `any`.
 */
export const gameShape = z.object({
  id: z.string(),
  number: z.number(),
  season: z.number(),
  playedAt: z.string(),
  createdAt: z.optional(z.string()),
  updatedAt: z.optional(z.string()),
  status: z.enum(EnumGameStatus),
  teams: z.array(teamShape),
  statistics: z.array(playerStatisticSchema),
  link: z._default(z.string(), ''),
  description: z._default(z.string(), ''),
  notes: z._default(z.tuple([z.string(), z.string()]), ['', '']),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: z.optional(z.any()),
});
export const gameSchema = z.looseObject({
  ...gameShape.shape,
  teams: z.array(teamSchema),
  statistics: z.array(z.looseObject(playerStatisticSchema.shape)),
});
export const gamesSchema = z.array(gameSchema);

const gameInputFields = {
  number: z.int().check(z.gte(1), z.lte(53)),
  season: z.int().check(z.gte(2010)),
  playedAt: z.pipe(
    z.iso.datetime({ offset: true }),
    z.transform(value => new Date(value)),
  ),
  status: z.enum(EnumGameStatus),
  teams: z.tuple([teamInGameInputSchema, teamInGameInputSchema]),
  link: text,
  description: text,
  notes: z.tuple([text, text]),
  statistics: z.array(playerStatisticSchema),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: z.optional(z.any()),
};

export type GameToCheck = {
  status: EnumGameStatus;
  teams: { id: string }[];
  statistics: {
    playerId: string;
    teamId: string;
    isCaptain: boolean;
    position?: EnumPlayerPosition | null;
  }[];
};

/**
 * Rules of a game that depend on several fields (GLOSSARY: Captain, Position,
 * Game status). The messages are shown to the user; the client form uses the
 * same rules through `gameRuleViolations`.
 */
export const GAME_RULE_MESSAGES = {
  captain: 'Each team needs exactly one captain',
  team: 'A statistic refers to a team that is not in the game',
  position: 'A published game needs a position for every player',
} as const;

export type GameRule = keyof typeof GAME_RULE_MESSAGES;

/** One broken rule and what it is about: the team or the player. */
export interface GameRuleViolation {
  rule: GameRule;
  teamId?: string;
  playerId?: string;
}

/** Every place where a game breaks a rule; empty when the game is fine. */
export function gameRuleViolations(game: GameToCheck): GameRuleViolation[] {
  const violations: GameRuleViolation[] = [];

  for (const team of game.teams) {
    const captains = new Set(
      game.statistics
        .filter(stat => stat.isCaptain && stat.teamId === team.id)
        .map(stat => stat.playerId),
    );
    if (captains.size !== 1) {
      violations.push({ rule: 'captain', teamId: team.id });
    }
  }

  for (const stat of game.statistics) {
    if (!game.teams.some(team => team.id === stat.teamId)) {
      violations.push({ rule: 'team', playerId: stat.playerId });
    }
  }

  if (game.status === EnumGameStatus.Published) {
    for (const stat of game.statistics) {
      if (!stat.position) {
        violations.push({ rule: 'position', playerId: stat.playerId });
      }
    }
  }

  return violations;
}

const gameRules = z.superRefine<GameToCheck>((game, ctx) => {
  // One issue per broken rule, whatever the number of places
  for (const rule of new Set(gameRuleViolations(game).map(v => v.rule))) {
    ctx.addIssue({ code: 'custom', message: GAME_RULE_MESSAGES[rule] });
  }
});

/** A game to create or replace (`POST /games`, `PUT /games/:id`). */
export const gameInputSchema = z.object(gameInputFields).check(gameRules);
/** A game to update (`PATCH /games/:id`): the same plus its id. */
export const gameUpdateInputSchema = z
  .object({ id: text, ...gameInputFields })
  .check(gameRules);

// ---- Sign in -----------------------------------------------------------------

export const signInSchema = z.object({
  email: z.string(),
  password: z.string(),
});
