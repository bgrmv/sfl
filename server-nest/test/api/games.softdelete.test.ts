// A deleted game is hidden, not destroyed (S10.2): out of the lists and the
// statistics, restorable by an admin as a draft that two people confirm again.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  bearer,
  confirmTwice,
  createPlayers,
  gameBody,
  postGame,
} from '../helpers/fixtures';
import { createTestApp, TestApp } from '../helpers/test-app';

describe('API: soft delete of a game', () => {
  let t: TestApp;
  let ids: [string, string];

  beforeAll(async () => {
    t = await createTestApp();
    const players = await createPlayers(t, 2);
    ids = [players[0].id, players[1].id];
  });
  afterAll(() => t.close());

  const admin = () => ({ Authorization: bearer(t) });
  const season = 2031;
  const create = async (number: number, status = 'draft') =>
    (await postGame(t, gameBody(ids, { number, season, status }))).body.data
      .id as string;
  const remove = (id: string) =>
    t.api().delete(`/rest/games/${id}`).set(admin());
  const totalGames = async () => {
    const res = await t
      .api()
      .get(`/rest/players/${ids[0]}`)
      .query({ includeMetadata: true });
    return res.body.data.metadata?.bySeason?.[season]?.totalGames ?? 0;
  };

  it('a deleted game leaves the lists, by id it is 404, the record stays', async () => {
    const id = await create(1);

    expect((await remove(id)).status).toBe(200);

    const list = await t
      .api()
      .get('/rest/games')
      .query({ season })
      .set(admin());
    expect(list.body.data.map((g: { id: string }) => g.id)).not.toContain(id);
    expect((await t.api().get(`/rest/games/${id}`).set(admin())).status).toBe(
      404,
    );
    expect(await t.model('Game').countDocuments({ _id: id })).toBe(1);
  });

  it('a deleted published game leaves the statistics', async () => {
    const id = await create(2);
    await confirmTwice(t, id);
    expect(await totalGames()).toBe(1);

    await remove(id);

    expect(await totalGames()).toBe(0);
  });

  it('the number of a deleted game is free again', async () => {
    const id = await create(3);
    await remove(id);

    const again = await postGame(
      t,
      gameBody(ids, { number: 3, season, status: 'draft' }),
    );

    expect(again.status).toBe(201);
  });

  it('a deleted game is not confirmed, locked or changed', async () => {
    const id = await create(4);
    await remove(id);

    for (const [method, path] of [
      ['post', `/rest/games/${id}/confirm`],
      ['post', `/rest/games/${id}/lock`],
      ['delete', `/rest/games/${id}`],
    ] as const) {
      const res = await t.api()[method](path).set(admin());
      expect(res.status, path).toBe(404);
    }
  });

  it('the admin sees the deleted games and restores one as a draft', async () => {
    const id = await create(5);
    await confirmTwice(t, id);
    await remove(id);
    expect(await totalGames()).toBe(0);

    const deleted = await t.api().get('/rest/games/deleted').set(admin());
    expect(deleted.status).toBe(200);
    expect(deleted.body.data.map((g: { id: string }) => g.id)).toContain(id);

    const restored = await t
      .api()
      .post(`/rest/games/${id}/restore`)
      .set(admin());
    expect(restored.status).toBe(201);
    expect(restored.body.data).toMatchObject({ status: 'draft' });
    expect(restored.body.data.deletedAt).toBeUndefined();
    // Back in the lists, but not in the statistics until two people confirm
    expect(await totalGames()).toBe(0);
    expect((await t.api().get(`/rest/games/${id}`).set(admin())).status).toBe(
      200,
    );

    await confirmTwice(t, id);
    expect(await totalGames()).toBe(1);
  });

  it('a game that is not deleted is not restored; a taken number is 409', async () => {
    const live = await create(6);
    expect(
      (await t.api().post(`/rest/games/${live}/restore`).set(admin())).status,
    ).toBe(404);

    const old = await create(7);
    await remove(old);
    await create(7);
    expect(
      (await t.api().post(`/rest/games/${old}/restore`).set(admin())).status,
    ).toBe(409);
  });

  it('only the admin sees and restores deleted games', async () => {
    const id = await create(8);
    await remove(id);

    expect((await t.api().get('/rest/games/deleted')).status).toBe(401);
    expect(
      (
        await t
          .api()
          .get('/rest/games/deleted')
          .set('Authorization', `Bearer ${t.moderatorToken}`)
      ).status,
    ).toBe(403);
  });
});
