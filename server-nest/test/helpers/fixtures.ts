import { TestApp } from './test-app';

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
      user: { email: `player-${counter}@sfl.test`, name: 'Test' },
    };
  });

  const res = await t
    .api()
    .post('/rest/players')
    .set('Authorization', bearer(t))
    .send(body);

  return res.body as { id: string; nickname: string }[];
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
      stat(playerIds[0], TEAM_WHITE.id, { isCaptain: true, goalsByLeg: 2 }),
      stat(playerIds[1], TEAM_RED.id, { isCaptain: true, goalsByLeg: 1 }),
    ],
    ...overrides,
  };
}
