// The log of the actions of an admin (S10.21): who, what, when.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ADMIN_EMAIL } from '../helpers/test-app';
import { bearer, createPlayers, gameBody } from '../helpers/fixtures';
import { createTestApp, TestApp } from '../helpers/test-app';

describe('API: the audit log', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  const auth = () => ({ Authorization: bearer(t) });
  const log = async () =>
    (await t.api().get('/rest/audit').set(auth())).body.data as {
      id: string;
      actor: string;
      method: string;
      route: string;
      status: number;
      at: string;
    }[];

  it('writes down who changed what: the admin, the method, the route, the status, the time', async () => {
    const players = await createPlayers(t, 2);
    const created = await t
      .api()
      .post('/rest/games')
      .set(auth())
      .send(
        gameBody(
          players.map(p => p.id),
          { number: 11, status: 'draft' },
        ),
      );
    expect(created.status).toBe(201);

    const entry = (await log()).find(
      e => e.method === 'POST' && e.route === '/rest/games',
    );
    expect(entry).toMatchObject({
      actor: ADMIN_EMAIL,
      method: 'POST',
      route: '/rest/games',
      status: 201,
    });
    expect(Date.now() - new Date(entry!.at).getTime()).toBeLessThan(60_000);
  });

  it('the route is the pattern, without the ids and the query', async () => {
    const [player] = await createPlayers(t, 1);
    await t
      .api()
      .patch(`/rest/players/${player.id}?x=1`)
      .set(auth())
      .send({ nickname: 'Renamed' });

    const routes = (await log()).map(e => e.route);
    expect(routes).toContain('/rest/players/:id');
    expect(JSON.stringify(routes)).not.toContain(player.id);
    expect(JSON.stringify(routes)).not.toContain('x=1');
  });

  it('a failed change is written with its status, a read is not written at all', async () => {
    await t.api().post('/rest/games').set(auth()).send({ number: 0 });
    await t.api().get('/rest/games');
    await t.api().get('/rest/players');

    const entries = await log();
    expect(entries.some(e => e.status === 400)).toBe(true);
    expect(entries.every(e => e.method !== 'GET')).toBe(true);
  });

  it('the newest first, at most 50, and the log itself is only for the admin', async () => {
    const entries = await log();
    const times = entries.map(e => new Date(e.at).getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(entries.length).toBeLessThanOrEqual(50);

    expect((await t.api().get('/rest/audit')).status).toBe(401);
    expect(
      (
        await t
          .api()
          .get('/rest/audit')
          .set({ Authorization: `Bearer ${t.userToken}` })
      ).status,
    ).toBe(403);
  });

  it('nobody writes into it: no body, no secrets, only the facts', async () => {
    const entry = (await log())[0];
    expect(Object.keys(entry).sort()).toEqual(
      ['actor', 'at', 'id', 'method', 'route', 'status'].sort(),
    );
  });
});
