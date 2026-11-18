// The shape of the API, declared once as zod schemas. The client and the
// server validate with the same code and take their types from here (z.infer).
// The words and the rules are the ones of GLOSSARY.md.
//
// `zod/mini`, not the classic `zod`: the classic API cannot be tree-shaken and
// would add about 90 kB (gzip) to the client bundle, mini about 7 kB.
import * as z from 'zod/mini';

import { EnumGameStatus, EnumPlayerPosition, EnumTeamColor } from './enums.js';

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

/**
 * What the edit dialog of a player changes (S3.16). The form checks it with
 * `validateStandardSchema`; the messages are the ones shown under the field.
 */
export const playerEditFormSchema = z.object({
  nickname: z.string().check(z.trim(), z.minLength(1, 'Nickname is required')),
  number: z
    .int('Number is from 1 to 999')
    .check(z.gte(1, 'Number is from 1 to 999'), z.lte(999, 'Number is from 1 to 999')),
  user: z.object({
    email: z.email('Enter a valid email').check(z.trim()),
    name: text,
    surname: text,
  }),
});
export type PlayerEditForm = z.infer<typeof playerEditFormSchema>;

// ---- Media (photos, S10.19) --------------------------------------------------

/** Types of photo the API accepts; the server checks the bytes, not the name. */
export const MEDIA_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
/** The largest photo, in bytes. */
export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;

const objectIdText = z.string().check(z.regex(/^[0-9a-f]{24}$/i, 'Not an id'));

/** A photo as the server sends it; the file is at `GET /media/:id/file`. */
export const mediaShape = z.object({
  id: z.string(),
  mime: z.enum(MEDIA_MIME_TYPES),
  size: z.number(),
  caption: z._default(z.string(), ''),
  gameId: z.nullish(z.string()),
  playerId: z.nullish(z.string()),
  createdAt: z.optional(z.string()),
});
export const mediaSchema = z.looseObject(mediaShape.shape);
export const mediasSchema = z.array(mediaSchema);

/**
 * What the admin sends with the file (`POST /media`, multipart: the fields are
 * strings, an empty string means "none") and to change it (`PATCH /media/:id`).
 */
export const mediaInputSchema = z.object({
  caption: z.optional(z.string().check(z.trim(), z.maxLength(200, 'The caption is up to 200 characters'))),
  gameId: z.optional(z.nullable(objectIdText)),
  playerId: z.optional(z.nullable(objectIdText)),
});

// ---- Comments on a game (S10.22) -----------------------------------------------

export const COMMENT_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];

/** A comment as the server sends it: no email, no id of the author. */
export const commentShape = z.object({
  id: z.string(),
  gameId: z.string(),
  name: z.string(),
  text: z.string(),
  status: z.enum(COMMENT_STATUSES),
  createdAt: z.optional(z.string()),
});
export const commentSchema = z.looseObject(commentShape.shape);
export const commentsSchema = z.array(commentSchema);

/**
 * What a visitor sends. There is no "site" field: on the reference site it only
 * attracted spam. The text is plain text, the page never turns it into links.
 */
/** The longest comment, in characters. */
export const COMMENT_TEXT_MAX = 1000;

export const commentInputSchema = z.object({
  gameId: objectIdText,
  name: z
    .string()
    .check(z.trim(), z.minLength(1, 'Enter your name'), z.maxLength(40, 'The name is up to 40 characters')),
  text: z
    .string()
    .check(z.trim(), z.minLength(2, 'Write a comment'), z.maxLength(COMMENT_TEXT_MAX, 'The comment is up to 1000 characters')),
});

/** What the admin sends to the queue: the verdict. */
export const commentModerationSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

// ---- Game --------------------------------------------------------------------

// ---- The order of the goals (S10.27) ---------------------------------------------

export const GAME_EVENT_KINDS = ['goal', 'head', 'penalty', 'own'] as const;
export type GameEventKind = (typeof GAME_EVENT_KINDS)[number];

/**
 * One goal in the order it was scored: `n` from 1; `teamId` is the team the goal
 * counts for (for an own goal the team of the rivals of the author); `assistIds`
 * are the passers (up to 3), for an own goal the participants (up to 4). A pass
 * before a goal by head weighs 2 (GLOSSARY).
 */
export const gameEventSchema = z.object({
  n: z.int().check(z.gte(1)),
  kind: z.enum(GAME_EVENT_KINDS),
  teamId: text,
  authorId: text,
  assistIds: z.array(text).check(z.maxLength(4)),
});
export type GameEvent = z.infer<typeof gameEventSchema>;

/** A confirmation of a draft: who and when. The public answer has no confirmations. */
export const gameConfirmationShape = z.object({
  accountId: z.optional(z.string()),
  at: z.string(),
});

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
  // Only for admins and moderators (S10.35, S10.54)
  version: z.optional(z.number()),
  lock: z.nullish(z.looseObject({ name: z.string(), expiresAt: z.string() })),
  confirmations: z.optional(z.array(gameConfirmationShape)),
  revoked: z.optional(z.looseObject({ reason: z.string(), at: z.string() })),
  statistics: z.array(playerStatisticSchema),
  /** The order of the goals; absent in a game whose order is not known. */
  events: z.optional(z.array(gameEventSchema)),
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
  events: z.optional(z.array(gameEventSchema)),
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

  // A skipped week has no game to check
  if (game.status === EnumGameStatus.Skipped) {
    return violations;
  }

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

/** A game with its goals in order, as far as the events are checked. */
export interface GameEventsToCheck {
  teams: { id: string }[];
  statistics: {
    playerId: string;
    teamId: string;
    goalsByLeg?: number;
    goalsByHead?: number;
    goalsByPenalty?: number;
    goalsByAuto?: number;
    passes?: number;
  }[];
  events?: GameEvent[];
}

export interface GameEventViolation {
  /** Dotted, as the issues of the API: `events.2.assistIds.0`, `statistics.<playerId>.passes`. */
  path: string;
  message: string;
}

const KIND_FIELD = {
  goal: 'goalsByLeg',
  head: 'goalsByHead',
  penalty: 'goalsByPenalty',
  own: 'goalsByAuto',
} as const;

/**
 * Every place where the order of the goals disagrees with the totals of the
 * players (S10.27): the goals of each kind of each scorer and the passes of each
 * player must be exactly those of the events. The participants of an own goal are
 * not passes. A game without events has no violations.
 */
export function gameEventViolations(
  game: GameEventsToCheck,
): GameEventViolation[] {
  if (!game.events) return [];
  const out: GameEventViolation[] = [];
  const add = (path: string, message: string) => out.push({ path, message });

  const teamIds = game.teams.map(team => team.id);
  const teamsOf = new Map<string, Set<string>>();
  for (const stat of game.statistics) {
    const set = teamsOf.get(stat.playerId) ?? new Set<string>();
    set.add(stat.teamId);
    teamsOf.set(stat.playerId, set);
  }

  const seen = new Map<string, number>();
  const passes = new Map<string, number>();
  game.events.forEach((event, i) => {
    if (event.n !== i + 1) {
      add(`events.${i}.n`, 'The goals are numbered 1, 2, 3 in the order given');
    }
    if (!teamIds.includes(event.teamId)) {
      add(`events.${i}.teamId`, 'The goal is credited to a team that is not in the game');
    }

    const authorTeams = teamsOf.get(event.authorId);
    const rivals = teamIds.filter(id => id !== event.teamId);
    const authorOk =
      !!authorTeams &&
      (event.kind === 'own'
        ? rivals.some(id => authorTeams.has(id))
        : authorTeams.has(event.teamId));
    if (!authorOk) {
      add(
        `events.${i}.authorId`,
        event.kind === 'own'
          ? 'The author of an own goal plays for the rivals of the team of the goal'
          : 'The scorer plays for the team of the goal',
      );
    }

    // The goals of a scorer by kind: more than the totals is the extra goal
    const key = `${event.authorId}|${event.kind}`;
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    const expected = game.statistics
      .filter(stat => stat.playerId === event.authorId)
      .reduce((sum, stat) => sum + (stat[KIND_FIELD[event.kind]] ?? 0), 0);
    if (count > expected) {
      add(`events.${i}.authorId`, 'The player has no more goals of this kind in the totals');
    }

    const max = event.kind === 'own' ? 4 : 3;
    if (event.assistIds.length > max) {
      add(`events.${i}.assistIds`, `A goal has up to ${max} ${event.kind === 'own' ? 'participants' : 'passers'}`);
    }
    const inGoal = new Set<string>();
    event.assistIds.forEach((id, j) => {
      if (id === event.authorId) {
        add(`events.${i}.assistIds.${j}`, 'A player does not pass to himself');
      } else if (inGoal.has(id)) {
        add(`events.${i}.assistIds.${j}`, 'A player is named once in a goal');
      } else if (!teamsOf.get(id)?.has(event.teamId)) {
        add(`events.${i}.assistIds.${j}`, 'The passer plays for the team of the goal');
      }
      inGoal.add(id);
      if (event.kind !== 'own') passes.set(id, (passes.get(id) ?? 0) + 1);
    });
  });

  // The totals of the players
  const totalGoals = game.statistics.reduce(
    (sum, stat) =>
      sum +
      (stat.goalsByLeg ?? 0) +
      (stat.goalsByHead ?? 0) +
      (stat.goalsByPenalty ?? 0) +
      (stat.goalsByAuto ?? 0),
    0,
  );
  if (totalGoals !== game.events.length) {
    add('events', `The totals have ${totalGoals} goals, the order has ${game.events.length}`);
  }
  for (const [playerId] of teamsOf) {
    for (const kind of GAME_EVENT_KINDS) {
      const field = KIND_FIELD[kind];
      const expected = game.statistics
        .filter(stat => stat.playerId === playerId)
        .reduce((sum, stat) => sum + (stat[field] ?? 0), 0);
      if ((seen.get(`${playerId}|${kind}`) ?? 0) < expected) {
        add(`statistics.${playerId}.${field}`, 'The order of the goals has fewer goals than the totals');
      }
    }
    const expectedPasses = game.statistics
      .filter(stat => stat.playerId === playerId)
      .reduce((sum, stat) => sum + (stat.passes ?? 0), 0);
    if ((passes.get(playerId) ?? 0) !== expectedPasses) {
      add(`statistics.${playerId}.passes`, 'The passes of the order of the goals differ from the totals');
    }
  }
  return out;
}

const gameRules = z.superRefine<GameToCheck & GameEventsToCheck>((game, ctx) => {
  // One issue per broken rule, whatever the number of places
  for (const rule of new Set(gameRuleViolations(game).map(v => v.rule))) {
    ctx.addIssue({ code: 'custom', message: GAME_RULE_MESSAGES[rule] });
  }
  // The order of the goals: every place has its own issue with a path (S10.27)
  if (game.status !== EnumGameStatus.Skipped) {
    for (const { path, message } of gameEventViolations(game)) {
      ctx.addIssue({
        code: 'custom',
        message,
        path: path.split('.').map(part => (/^\d+$/.test(part) ? Number(part) : part)),
      });
    }
  }
});

/** A game to create or replace (`POST /games`, `PUT /games/:id`). */
export const gameInputSchema = z.object(gameInputFields).check(gameRules);
/** A game to update (`PATCH /games/:id`): the same plus its id. */
export const gameUpdateInputSchema = z
  .object({ id: text, ...gameInputFields })
  .check(gameRules);

/** The reason of a revoke of the publication (S10.35): required, it goes to the log. */
export const gameRevokeSchema = z.object({
  reason: z
    .string()
    .check(
      z.trim(),
      z.minLength(3, 'Write the reason of the revoke'),
      z.maxLength(500, 'The reason is up to 500 characters'),
    ),
});

// ---- Sign in -----------------------------------------------------------------

export const signInSchema = z.object({
  email: z.string(),
  password: z.string(),
});

// ---- Connect an account to a player (S8.13, ADR 0021) ------------------------

/** The admin makes a one-day link for a player. */
export const invitationInputSchema = z.object({
  playerId: z.string().check(z.regex(/^[0-9a-f]{24}$/i)),
});
export type InvitationInput = z.infer<typeof invitationInputSchema>;

/** Shown once, at creation: the database keeps only the hash of the token. */
export const invitationSchema = z.object({
  id: z.string(),
  token: z.string(),
  url: z.string(),
  expiresAt: z.string(),
});
export type InvitationDTO = z.infer<typeof invitationSchema>;

/** What the page of the link shows: the card of the player and the time left, nothing private. */
export const invitationPreviewSchema = z.object({
  player: z.object({
    nickname: z.string(),
    name: z.string(),
    surname: z.string(),
  }),
  expiresAt: z.string(),
});
export type InvitationPreview = z.infer<typeof invitationPreviewSchema>;

/** One link in the list of the admin: the status is computed, "expired" follows from `expiresAt`. */
export const INVITATION_STATUSES = [
  'active',
  'used',
  'expired',
  'revoked',
] as const;

export const invitationListItemSchema = z.object({
  id: z.string(),
  player: z.object({
    id: z.string(),
    nickname: z.string(),
    name: z.string(),
    surname: z.string(),
  }),
  status: z.enum(INVITATION_STATUSES),
  createdAt: z.string(),
  expiresAt: z.string(),
  usedAt: z.optional(z.string()),
  revokedAt: z.optional(z.string()),
});
export type InvitationListItem = z.infer<typeof invitationListItemSchema>;

/** `linkedPlayerIds`: the players who already have a Google account; nothing of the account itself. */
export const invitationListSchema = z.object({
  items: z.array(invitationListItemSchema),
  linkedPlayerIds: z.array(z.string()),
});
export type InvitationList = z.infer<typeof invitationListSchema>;

// ---- Access levels of users (admin) ------------------------------------------

/**
 * The roles an admin can give. A person with none of them has the level of a
 * guest: reads what is public (GUEST is not stored, it is the absence of a role).
 */
export const ASSIGNABLE_ROLES = ['ADMIN', 'MODERATOR', 'USER'] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const userRolesInputSchema = z.object({
  roles: z.array(z.enum(ASSIGNABLE_ROLES)),
});
export type UserRolesInput = z.infer<typeof userRolesInputSchema>;

/** A row of the list of accounts for the admin: no email, no Google data. */
export const adminUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  surname: z.string(),
  nickname: z.optional(z.string()),
  roles: z.array(z.string()),
  hasGoogle: z.boolean(),
});
export type AdminUser = z.infer<typeof adminUserSchema>;
export const adminUsersSchema = z.array(adminUserSchema);
