// One game is edited by one admin at a time (S10.54, ADR 0015): a lease in the database.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';

import {
  bearer,
  createPlayers,
  gameBody,
  lockGame,
  moderator,
} from '../helpers/fixtures';
import { ADMIN_PASSWORD, createTestApp, TestApp } from '../helpers/test-app';

describe('API: the lease of a game', () => {
  let t: TestApp;
  let ids: [string, string];
  let secondAdmin: string;
  let counter = 0;

  beforeAll(async () => {
    t = await createTestApp();
    const players = await createPlayers(t, 2);
    ids = [players[0].id, players[1].id];

    // A second admin
    const role = await t.model('Role').findOne({ name: 'ADMIN' }).lean();
    await t.model('User').create({
      email: 'second@sfl.test',
      name: 'Second',
      password: (await import('../../src/shared/utils/string')).sha512Legacy(
        ADMIN_PASSWORD,
      ),
      roles: [role._id],
    });
    secondAdmin = `Bearer ${
      (
        await t
          .api()
          .post('/rest/auth/sign-in')
          .send({ email: 'second@sfl.test', password: ADMIN_PASSWORD })
      ).body.data.accessToken
    }`;
  });
  afterAll(() => t.close());

  const admin = () => ({ Authorization: bearer(t) });
  const draft = async () =>
    (
      await t
        .api()
        .post('/rest/games')
        .set(admin())
        .send(gameBody(ids, { number: ++counter, status: 'draft' }))
    ).body.data.id as string;
  const gameOf = async (id: string) =>
    (await t.api().get(`/rest/games/${id}`).set(admin())).body.data;
  const put = (id: string, headers: Record<string, string>, extra = {}) =>
    t
      .api()
      .put(`/rest/games/${id}`)
      .set(headers)
      .send(gameBody(ids, { number: counter, status: 'draft', ...extra }));

  it('the first admin takes the game, the second one gets 409 with the name of the owner', async () => {
    const id = await draft();

    const mine = await lockGame(t, id);
    expect(mine.status).toBe(201);
    expect(mine.body.data.lock).toMatchObject({ name: 'Admin' });

    const theirs = await lockGame(t, id, secondAdmin);
    expect(theirs.status).toBe(409);
    expect(theirs.body.error.message).toContain('Admin');
  });

  it('the holder renews the lease and the expiry moves on', async () => {
    const id = await draft();
    const first = (await lockGame(t, id)).body.data.lock.expiresAt;
    await new Promise(resolve => setTimeout(resolve, 20));

    const again = await lockGame(t, id);

    expect(again.status).toBe(201);
    expect(new Date(again.body.data.lock.expiresAt).getTime()).toBeGreaterThan(
      new Date(first).getTime(),
    );
  });

  it('a lease without a pulse expires and the game is free for another admin', async () => {
    const id = await draft();
    await lockGame(t, id);
    await t
      .model('Game')
      .updateOne(
        { _id: id },
        { $set: { 'lock.expiresAt': new Date(Date.now() - 1000) } },
      );

    const other = await lockGame(t, id, secondAdmin);

    expect(other.status).toBe(201);
    expect(other.body.data.lock.name).toBe('Second');
  });

  it('only the holder saves: no lease, an expired lease and the lease of another answer 409', async () => {
    const id = await draft();
    expect((await put(id, admin())).status).toBe(409);

    await lockGame(t, id);
    expect((await put(id, { Authorization: secondAdmin })).status).toBe(409);
    expect((await put(id, admin())).status).toBe(200);

    await t
      .model('Game')
      .updateOne(
        { _id: id },
        { $set: { 'lock.expiresAt': new Date(Date.now() - 1000) } },
      );
    expect((await put(id, admin())).status).toBe(409);
  });

  it('the version grows with every save, an old version is refused with 412', async () => {
    const id = await draft();
    await lockGame(t, id);
    const version = (await gameOf(id)).version;

    const saved = await t
      .api()
      .put(`/rest/games/${id}`)
      .set({ ...admin(), 'If-Match': String(version) })
      .send(gameBody(ids, { number: counter, status: 'draft', link: 'a' }));
    expect(saved.status).toBe(200);
    expect(saved.body.data.version).toBe(version + 1);

    const stale = await t
      .api()
      .patch(`/rest/games/${id}`)
      .set({ ...admin(), 'If-Match': String(version) })
      .send({ ...gameBody(ids, { number: counter, status: 'draft' }), id });
    expect(stale.status).toBe(412);
    expect((await gameOf(id)).version).toBe(version + 1);
  });

  it('the holder releases the game and another admin takes it at once', async () => {
    const id = await draft();
    await lockGame(t, id);

    const released = await t
      .api()
      .delete(`/rest/games/${id}/lock`)
      .set(admin());
    expect(released.status).toBe(200);
    expect((await gameOf(id)).lock ?? null).toBeNull();
    expect((await lockGame(t, id, secondAdmin)).status).toBe(201);

    // The first admin releases a lease that is not his: nothing changes
    await t.api().delete(`/rest/games/${id}/lock`).set(admin());
    expect((await gameOf(id)).lock).toMatchObject({ name: 'Second' });
  });

  it('a published game cannot be taken, a missing one is 404, a broken id 400', async () => {
    const id = await draft();
    await t.api().post(`/rest/games/${id}/confirm`).set(admin());
    await t
      .api()
      .post(`/rest/games/${id}/confirm`)
      .set({ Authorization: moderator(t) });

    expect((await lockGame(t, id)).status).toBe(409);
    expect((await lockGame(t, new Types.ObjectId().toString())).status).toBe(
      404,
    );
    expect((await lockGame(t, 'nope')).status).toBe(400);
  });

  it('the public and a moderator do not see the lease; only an admin takes it', async () => {
    const id = await draft();
    await lockGame(t, id);

    expect((await lockGame(t, id, moderator(t))).status).toBe(403);
    expect((await lockGame(t, id, `Bearer ${t.userToken}`)).status).toBe(403);
    expect((await t.api().post(`/rest/games/${id}/lock`)).status).toBe(401);
    const seenByModerator = await t
      .api()
      .get(`/rest/games/${id}`)
      .set({ Authorization: moderator(t) });
    expect(seenByModerator.body.data.lock).toMatchObject({ name: 'Admin' });
  });

  it('a change of the content takes the confirmations back and keeps the lease', async () => {
    const id = await draft();
    await t.api().post(`/rest/games/${id}/confirm`).set(admin());
    await lockGame(t, id);

    expect((await put(id, admin(), { link: 'changed' })).status).toBe(200);

    const game = await gameOf(id);
    expect(game.confirmations ?? []).toHaveLength(0);
    expect(game.lock).toMatchObject({ name: 'Admin' });
  });
});
