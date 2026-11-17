import { TestApp } from './test-app';

export const moderator = (t: TestApp) => `Bearer ${t.moderatorToken}`;

export const bearer = (t: TestApp) => `Bearer ${t.token}`;

export const isSuccess = (status: number) => status >= 200 && status < 300;

let counter = 0;

/** Creates players through the API, returns them with populated users. */
export async function createPlayers(t: TestApp, count: number) {
  const body = Array.from({ length: count }, () => {
    counter += 1;
    return {
      nickname: `player-${counter}`,
      number: counter,
      user: {
        email: `player-${counter}@sfl.test`,
        name: 'Test',
        surname: 'Secret',
      },
    };
  });

  const res = await t
    .api()
    .post('/rest/players')
    .set('Authorization', bearer(t))
    .send({ players: body });

  return res.body.data as { id: string; nickname: string }[];
}

const team = (id: string, name: string, color: 'WHITE' | 'RED') => ({
  id,
  name,
  color,
  description: '',
  logo: '',
});

export const TEAM_WHITE = team(
  '64b7f0f0f0f0f0f0f0f0aa01',
  'White team',
  'WHITE',
);
export const TEAM_RED = team('64b7f0f0f0f0f0f0f0f0aa02', 'Red team', 'RED');

export const stat = (
  playerId: string,
  teamId: string,
  overrides: Record<string, unknown> = {},
) => ({
  playerId,
  teamId,
  goalsByLeg: 0,
  goalsByHead: 0,
  goalsByAuto: 0,
  goalsByPenalty: 0,
  passes: 0,
  isMVP: false,
  isTransfer: false,
  isCaptain: false,
  position: null,
  ...overrides,
});

/** A valid game body: white captain scores 2 with the leg, red captain 1. */
export function gameBody(
  playerIds: [string, string],
  overrides: Record<string, unknown> = {},
) {
  return {
    number: 1,
    season: 2024,
    playedAt: '2024-09-01T10:00:00.000Z',
    status: 'published',
    teams: [TEAM_WHITE, TEAM_RED],
    link: '',
    description: '',
    notes: ['', ''],
    metadata: {},
    statistics: [
      stat(playerIds[0], TEAM_WHITE.id, {
        isCaptain: true,
        goalsByLeg: 2,
        position: 'GK',
      }),
      stat(playerIds[1], TEAM_RED.id, {
        isCaptain: true,
        goalsByLeg: 1,
        position: 'FRWD',
      }),
    ],
    ...overrides,
  };
}

/**
 * A game as a league does it (S10.35): the body is saved as a draft and published
 * by two confirmations of two people. A body with another status is saved as it is.
 * Answers like `POST /games`: the status and the body of the saved game.
 */
export async function postGame(t: TestApp, body: Record<string, unknown>) {
  const wantsPublished = body.status === 'published';
  const created = await t
    .api()
    .post('/rest/games')
    .set('Authorization', bearer(t))
    .send(wantsPublished ? { ...body, status: 'draft' } : body);
  if (!wantsPublished || !isSuccess(created.status)) return created;

  const published = await confirmTwice(t, created.body.data.id);
  created.body.data = published.body.data;
  return created;
}

/** The admin and the moderator confirm the game: the second one publishes it. */
export async function confirmTwice(t: TestApp, id: string) {
  await t
    .api()
    .post(`/rest/games/${id}/confirm`)
    .set('Authorization', bearer(t));
  return await t
    .api()
    .post(`/rest/games/${id}/confirm`)
    .set('Authorization', moderator(t));
}

/** The published game goes back to a draft: its numbers leave the ratings. */
export async function revokeGame(t: TestApp, id: string, reason = 'A mistake') {
  return await t
    .api()
    .post(`/rest/games/${id}/revoke`)
    .set('Authorization', bearer(t))
    .send({ reason });
}

/** The admin takes the lease of a game: only the holder saves it (S10.54). */
export async function lockGame(t: TestApp, id: string, token = bearer(t)) {
  return await t
    .api()
    .post(`/rest/games/${id}/lock`)
    .set('Authorization', token);
}
