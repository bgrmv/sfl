import { describe, expect, it } from 'vitest';

import { EnumGameStatus, EnumPlayerPosition, EnumTeamColor } from './enums.js';
import {
  GAME_RULE_MESSAGES,
  gameInputSchema,
  gameRuleViolations,
  gameSchema,
  gameUpdateInputSchema,
  playerEditFormSchema,
  playerSchema,
  playerStatisticSchema,
  signInSchema,
  teamInputSchema,
} from './schemas.js';

const stat = (overrides: Record<string, unknown> = {}) => ({
  playerId: 'p1',
  teamId: 'team1',
  goalsByLeg: 0,
  goalsByHead: 0,
  goalsByAuto: 0,
  goalsByPenalty: 0,
  passes: 0,
  isMVP: false,
  isTransfer: false,
  isCaptain: false,
  position: EnumPlayerPosition.Goalkeeper,
  ...overrides,
});

const team = (n: number) => ({
  id: `team${n}`,
  name: `Team ${n}`,
  color: EnumTeamColor.Red,
  description: null,
  logo: null,
});

const game = (overrides: Record<string, unknown> = {}) => ({
  number: 3,
  season: 2025,
  playedAt: '2025-05-10T17:00:00.000Z',
  status: EnumGameStatus.Published,
  teams: [team(1), team(2)],
  link: '',
  description: '',
  notes: ['', ''],
  statistics: [
    stat({ playerId: 'p1', teamId: 'team1', isCaptain: true }),
    stat({ playerId: 'p2', teamId: 'team2', isCaptain: true }),
  ],
  ...overrides,
});

const messagesOf = (
  schema: { safeParse: (v: unknown) => any },
  value: unknown,
) => {
  const result = schema.safeParse(value);
  return result.success
    ? []
    : result.error.issues.map((issue: { message: string }) => issue.message);
};

describe('playerStatisticSchema', () => {
  it('accepts a statistic', () => {
    expect(playerStatisticSchema.safeParse(stat()).success).toBe(true);
  });

  it('a game saved before own goals has no goalsByAuto: it is 0', () => {
    const { goalsByAuto, ...old } = stat();
    expect(goalsByAuto).toBe(0);

    expect(playerStatisticSchema.parse(old).goalsByAuto).toBe(0);
  });

  it('a missing position is null (a game that is not published yet)', () => {
    const { position, ...noPosition } = stat();
    expect(position).toBeDefined();

    expect(playerStatisticSchema.parse(noPosition).position).toBeNull();
  });

  it.each([
    ['negative goals', { goalsByLeg: -1 }],
    ['fractional passes', { passes: 1.5 }],
    ['unknown position', { position: 'LW' }],
    ['no player', { playerId: undefined }],
  ])('rejects %s', (_name, overrides) => {
    expect(playerStatisticSchema.safeParse(stat(overrides)).success).toBe(
      false,
    );
  });
});

describe('teamInputSchema', () => {
  const input = {
    name: 'Red team',
    color: 'RED',
    description: null,
    logo: null,
  };

  it('null description and logo become an empty string', () => {
    expect(teamInputSchema.parse(input)).toMatchObject({
      description: '',
      logo: '',
    });
  });

  it.each([
    ['a short name', { name: 'ab' }],
    ['an unknown colour', { color: 'BLUE' }],
    ['no name', { name: undefined }],
  ])('rejects %s', (_name, overrides) => {
    expect(teamInputSchema.safeParse({ ...input, ...overrides }).success).toBe(
      false,
    );
  });
});

describe('gameInputSchema', () => {
  it('accepts a game and turns playedAt into a Date', () => {
    const parsed = gameInputSchema.parse(game());

    expect(parsed.playedAt).toBeInstanceOf(Date);
    expect(parsed.playedAt.toISOString()).toBe('2025-05-10T17:00:00.000Z');
    expect(parsed.teams[0].description).toBe('');
  });

  it('a date with an offset is accepted too', () => {
    expect(
      gameInputSchema.safeParse(game({ playedAt: '2025-05-10T20:00:00+03:00' }))
        .success,
    ).toBe(true);
  });

  it.each([
    ['number 0', { number: 0 }],
    ['number 54', { number: 54 }],
    ['season 2009', { season: 2009 }],
    ['a date that is not ISO', { playedAt: 'yesterday' }],
    ['an unknown status', { status: 'furture' }],
    ['one team', { teams: [team(1)] }],
    ['notes of one string', { notes: [''] }],
  ])('rejects %s', (_name, overrides) => {
    expect(gameInputSchema.safeParse(game(overrides)).success).toBe(false);
  });

  it('rules: exactly one captain per team', () => {
    const noCaptain = game({
      statistics: [
        stat({ isCaptain: true }),
        stat({ playerId: 'p2', teamId: 'team2' }),
      ],
    });

    expect(messagesOf(gameInputSchema, noCaptain)).toContain(
      GAME_RULE_MESSAGES.captain,
    );
  });

  it('rules: a statistic of a team that is not in the game', () => {
    const ghost = game({
      statistics: [
        ...game().statistics,
        stat({ playerId: 'p3', teamId: 'team9' }),
      ],
    });

    expect(messagesOf(gameInputSchema, ghost)).toContain(
      GAME_RULE_MESSAGES.team,
    );
  });

  it('a skipped week is accepted without statistics', () => {
    expect(
      gameInputSchema.safeParse(game({ status: 'skipped', statistics: [] }))
        .success,
    ).toBe(true);
    expect(gameSchema.safeParse({ ...game(), id: 'g1', status: 'skipped' }).success).toBe(true);
  });

  it('rules: a published game needs a position for every player, a draft does not', () => {
    const rows = [
      stat({ isCaptain: true }),
      stat({
        playerId: 'p2',
        teamId: 'team2',
        isCaptain: true,
        position: null,
      }),
    ];

    expect(messagesOf(gameInputSchema, game({ statistics: rows }))).toEqual([
      GAME_RULE_MESSAGES.position,
    ]);
    expect(
      gameInputSchema.safeParse(game({ statistics: rows, status: 'draft' }))
        .success,
    ).toBe(true);
  });
});

describe('gameUpdateInputSchema', () => {
  it('needs the id of the game and applies the same rules', () => {
    expect(gameUpdateInputSchema.safeParse(game()).success).toBe(false);
    expect(gameUpdateInputSchema.safeParse(game({ id: 'g1' })).success).toBe(
      true,
    );
    expect(
      messagesOf(gameUpdateInputSchema, game({ id: 'g1', statistics: [] })),
    ).toContain(GAME_RULE_MESSAGES.captain);
  });
});

describe('gameSchema (what the server sends)', () => {
  const sent = {
    id: 'g1',
    number: 3,
    season: 2025,
    playedAt: '2025-05-10T17:00:00.000Z',
    status: 'published',
    teams: [team(1), team(2)],
    statistics: [stat()],
    notes: ['', ''],
    metadata: { anything: 'the server calculated' },
  };

  it('keeps the date as a string and the metadata as it is', () => {
    const parsed = gameSchema.parse(sent);

    expect(parsed.playedAt).toBe('2025-05-10T17:00:00.000Z');
    expect(parsed.metadata).toEqual({ anything: 'the server calculated' });
  });

  it('an old game without link and description gets empty ones', () => {
    expect(gameSchema.parse(sent)).toMatchObject({ link: '', description: '' });
  });

  it('rejects an unknown status and a missing id', () => {
    expect(gameSchema.safeParse({ ...sent, status: 'furture' }).success).toBe(
      false,
    );
    expect(gameSchema.safeParse({ ...sent, id: undefined }).success).toBe(
      false,
    );
  });
});

describe('playerSchema (what the server sends)', () => {
  it('a public player has no email, surname and user id', () => {
    const parsed = playerSchema.parse({
      id: 'p1',
      nickname: 'Bomber',
      user: { name: 'Gerd' },
    });

    expect(parsed.user).toEqual({ name: 'Gerd' });
    expect(parsed.isCaptain).toBe(false);
  });

  it('an admin gets the whole user', () => {
    const user = { id: 'u1', email: 'a@sfl.test', name: 'A', surname: 'B' };

    expect(
      playerSchema.parse({ id: 'p1', nickname: 'x', isCaptain: true, user })
        .user,
    ).toEqual(user);
  });

  it('rejects a player without a nickname', () => {
    expect(playerSchema.safeParse({ id: 'p1', user: {} }).success).toBe(false);
  });
});

describe('signInSchema', () => {
  it('accepts email and password, rejects a missing password', () => {
    expect(
      signInSchema.safeParse({ email: 'a@b.c', password: 'x' }).success,
    ).toBe(true);
    expect(signInSchema.safeParse({ email: 'a@b.c' }).success).toBe(false);
  });
});

describe('gameRuleViolations (the rules the client form uses too)', () => {
  const rows = (overrides: Record<string, unknown> = {}) => game(overrides);
  const check = (g: ReturnType<typeof game>) =>
    gameRuleViolations(
      g as unknown as Parameters<typeof gameRuleViolations>[0],
    );

  it('a good game has no violations', () => {
    expect(check(rows())).toEqual([]);
  });

  it('names the team that has no captain and the team that has two', () => {
    const g = rows({
      statistics: [
        stat({ playerId: 'p1', teamId: 'team1', isCaptain: true }),
        stat({ playerId: 'p3', teamId: 'team1', isCaptain: true }),
        stat({ playerId: 'p2', teamId: 'team2' }),
      ],
    });

    expect(check(g)).toEqual([
      { rule: 'captain', teamId: 'team1' },
      { rule: 'captain', teamId: 'team2' },
    ]);
  });

  it('names every player of a published game who has no position', () => {
    const g = rows({
      statistics: [
        stat({ playerId: 'p1', isCaptain: true, position: null }),
        stat({ playerId: 'p2', teamId: 'team2', isCaptain: true }),
        stat({ playerId: 'p3', teamId: 'team2', position: null }),
      ],
    });

    expect(check(g)).toEqual([
      { rule: 'position', playerId: 'p1' },
      { rule: 'position', playerId: 'p3' },
    ]);
  });

  it('a draft needs no positions', () => {
    const g = rows({
      status: 'draft',
      statistics: [
        stat({ playerId: 'p1', isCaptain: true, position: null }),
        stat({
          playerId: 'p2',
          teamId: 'team2',
          isCaptain: true,
          position: null,
        }),
      ],
    });

    expect(check(g)).toEqual([]);
  });

  it('a skipped game needs no captains, no positions and no statistics', () => {
    expect(check(rows({ status: 'skipped', statistics: [] }))).toEqual([]);
  });

  it('names a player of a team that is not in the game', () => {
    const g = rows({
      statistics: [
        ...rows().statistics,
        stat({ playerId: 'p9', teamId: 'team9' }),
      ],
    });

    expect(check(g)).toContainEqual({ rule: 'team', playerId: 'p9' });
  });
});

describe('gameSchema is loose: an unknown field of the server is kept', () => {
  it('keeps extra fields of a game, a team and a statistic', () => {
    const parsed = gameSchema.parse({
      id: 'g1',
      number: 1,
      season: 2025,
      playedAt: '2025-05-10T17:00:00.000Z',
      status: 'draft',
      teams: [{ ...team(1), extraTeam: 1 }],
      statistics: [{ ...stat(), extraStat: 2 }],
      extraGame: 3,
    }) as Record<string, any>;

    expect(parsed.extraGame).toBe(3);
    expect(parsed.teams[0].extraTeam).toBe(1);
    expect(parsed.statistics[0].extraStat).toBe(2);
  });
});

describe('API response', () => {
  it('maps statuses to stable codes', async () => {
    const { apiErrorCodeFor } = await import('./api-response.js');
    expect(
      [400, 401, 403, 404, 409, 429, 500, 503, 418].map(apiErrorCodeFor),
    ).toEqual([
      'BAD_REQUEST',
      'UNAUTHORIZED',
      'FORBIDDEN',
      'NOT_FOUND',
      'CONFLICT',
      'TOO_MANY_REQUESTS',
      'INTERNAL_ERROR',
      'INTERNAL_ERROR',
      'BAD_REQUEST',
    ]);
  });

  it('accepts the error body of the API', async () => {
    const { apiErrorSchema } = await import('./api-response.js');
    const error = { status: 404, code: 'NOT_FOUND', message: 'No game' };
    expect(apiErrorSchema.safeParse(error).success).toBe(true);
    expect(apiErrorSchema.safeParse({ ...error, code: 'NOPE' }).success).toBe(
      false,
    );
  });
});

describe('Result', async () => {
  const { ok, err, fromSerialized, fromPromise } = await import('./result.js');
  type E = { code: string };
  const parse = (s: string) =>
    /^\d+$/.test(s)
      ? ok<number, E>(Number(s))
      : err<number, E>({ code: 'NaN' });

  it('maps a success and skips a failure (short-circuit)', () => {
    expect(
      parse('2')
        .map(n => n * 2)
        .unwrapOr(0),
    ).toBe(4);
    const failed = parse('x').map(n => n * 2);
    expect(failed.ok).toBe(false);
    expect(failed.unwrapOr(-1)).toBe(-1);
  });

  it('chains with andThen and stops at the first error', () => {
    const calls: string[] = [];
    const result = parse('x')
      .andThen(n => {
        calls.push('second');
        return ok<number, E>(n + 1);
      })
      .mapErr(e => `error ${e.code}`);

    expect(calls).toEqual([]);
    expect(result.match({ ok: String, err: e => e })).toBe('error NaN');
  });

  it('narrows by the discriminator ok', () => {
    const result = parse('7');
    if (result.ok) {
      expect(result.value).toBe(7);
    } else {
      throw new Error('expected a success');
    }
  });

  it('survives the JSON round trip', () => {
    const wire = JSON.parse(JSON.stringify(parse('5')));
    expect(wire).toEqual({ ok: true, data: 5 });
    expect(fromSerialized<number, E>(wire).unwrapOr(0)).toBe(5);

    const failed = JSON.parse(JSON.stringify(parse('x')));
    expect(failed).toEqual({ ok: false, error: { code: 'NaN' } });
    expect(fromSerialized<number, E>(failed).ok).toBe(false);
  });

  it('turns a rejected promise into an Err', async () => {
    const result = await fromPromise(Promise.reject(new Error('boom')), e => ({
      code: (e as Error).message,
    }));
    expect(result.match({ ok: () => 'ok', err: e => e.code })).toBe('boom');
  });
});

describe('playerEditFormSchema (the form of the player dialog, S3.16)', () => {
  const ok = {
    nickname: ' Bomber ',
    number: 9,
    user: { email: 'gerd@sfl.test', name: 'Gerd', surname: '' },
  };

  it('accepts a player and trims the texts', () => {
    const parsed = playerEditFormSchema.safeParse(ok);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.nickname).toBe('Bomber');
  });

  it.each([
    ['an empty nickname', { ...ok, nickname: '  ' }, 'Nickname is required'],
    ['number 0', { ...ok, number: 0 }, 'Number is from 1 to 999'],
    ['number 1000', { ...ok, number: 1000 }, 'Number is from 1 to 999'],
    ['a fraction', { ...ok, number: 1.5 }, 'Number is from 1 to 999'],
    [
      'a bad email',
      { ...ok, user: { ...ok.user, email: 'nope' } },
      'Enter a valid email',
    ],
  ])('rejects %s with a readable message', (_name, body, message) => {
    const parsed = playerEditFormSchema.safeParse(body);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map(i => i.message)).toContain(message);
  });
});
