// A game becomes published only by two confirmations of two people (S10.35, GLOSSARY).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  bearer,
  confirmTwice,
  createPlayers,
  gameBody,
  lockGame,
  moderator,
  revokeGame,
} from '../helpers/fixtures';
import { createTestApp, TestApp } from '../helpers/test-app';

describe('API: publishing a game by two confirmations', () => {
  let t: TestApp;
  let ids: [string, string];
  let counter = 0;

  beforeAll(async () => {
    t = await createTestApp();
    const players = await createPlayers(t, 2);
    ids = [players[0].id, players[1].id];
  });
  afterAll(() => t.close());

  const admin = () => ({ Authorization: bearer(t) });
  const mod = () => ({ Authorization: moderator(t) });
  const user = () => ({ Authorization: `Bearer ${t.userToken}` });

  const draft = async (overrides: Record<string, unknown> = {}) => {
    const res = await t
      .api()
      .post('/rest/games')
      .set(admin())
      .send(
        gameBody(ids, { number: ++counter, status: 'draft', ...overrides }),
      );
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    return res.body.data.id as string;
  };
  const confirm = (id: string, headers = admin()) =>
    t.api().post(`/rest/games/${id}/confirm`).set(headers);
  const gameOf = async (id: string, headers = admin()) =>
    (await t.api().get(`/rest/games/${id}`).set(headers)).body.data;
  const playerPoints = async () => {
    const res = await t.api().get(`/rest/players/${ids[0]}`).set(admin());
    return res.body.data.metadata?.bySeason?.['2024']?.totalGames ?? 0;
  };

  it('nobody saves a game as published: the status comes only from the confirmations', async () => {
    const created = await t
      .api()
      .post('/rest/games')
      .set(admin())
      .send(gameBody(ids, { number: ++counter, status: 'published' }));
    expect(created.status).toBe(400);

    const id = await draft();
    const put = await t
      .api()
      .put(`/rest/games/${id}`)
      .set(admin())
      .send(gameBody(ids, { number: counter, status: 'published' }));
    const patch = await t
      .api()
      .patch(`/rest/games/${id}`)
      .set(admin())
      .send({ ...gameBody(ids, { number: counter }), id, status: 'published' });
    expect([put.status, patch.status]).toEqual([400, 400]);
    expect((await gameOf(id)).status).toBe('draft');
  });

  it('one confirmation is not enough, the second one of another person publishes', async () => {
    const id = await draft();
    const before = await playerPoints();

    const first = await confirm(id, admin());
    expect(first.status).toBe(201);
    expect(first.body.data.status).toBe('draft');
    expect(first.body.data.confirmations).toHaveLength(1);
    expect(await playerPoints()).toBe(before);

    const second = await confirm(id, mod());
    expect(second.body.data.status).toBe('published');
    expect(second.body.data.confirmations).toHaveLength(2);
    expect(second.body.data.metadata.scoreFirstDraft).toBe(2);
    expect(await playerPoints()).toBe(before + 1);
  });

  it('one person cannot confirm twice', async () => {
    const id = await draft();
    await confirm(id, admin());

    const again = await confirm(id, admin());

    expect(again.status).toBe(409);
    expect((await gameOf(id)).status).toBe('draft');
  });

  it('a game that breaks a rule is not confirmed: positions are needed for the publication', async () => {
    const id = await draft({
      statistics: gameBody(ids).statistics.map(s => ({ ...s, position: null })),
    });

    const res = await confirm(id);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('position');
  });

  it('only a draft is confirmed: a new game and a published one answer 409', async () => {
    const id = await draft({ status: 'new' });
    expect((await confirm(id)).status).toBe(409);

    const published = await draft();
    await confirmTwice(t, published);
    expect((await confirm(published, admin())).status).toBe(409);
  });

  it('a change of the draft clears the confirmations', async () => {
    const id = await draft();
    await confirm(id, admin());
    expect((await gameOf(id)).confirmations).toHaveLength(1);
    await lockGame(t, id);

    const put = await t
      .api()
      .put(`/rest/games/${id}`)
      .set(admin())
      .send(
        gameBody(ids, {
          number: counter,
          status: 'draft',
          description: 'Fixed',
        }),
      );
    expect(put.status).toBe(200);
    expect((await gameOf(id)).confirmations ?? []).toHaveLength(0);

    await confirm(id, admin());
    await t
      .api()
      .patch(`/rest/games/${id}`)
      .set(admin())
      .send({
        ...gameBody(ids, { number: counter, status: 'draft' }),
        id,
        link: 'x',
      });
    expect((await gameOf(id)).confirmations ?? []).toHaveLength(0);
  });

  it('a published game is not edited: it is revoked first', async () => {
    const id = await draft();
    await confirmTwice(t, id);

    const put = await t
      .api()
      .put(`/rest/games/${id}`)
      .set(admin())
      .send(gameBody(ids, { number: counter, status: 'draft' }));
    const patch = await t
      .api()
      .patch(`/rest/games/${id}`)
      .set(admin())
      .send({ ...gameBody(ids, { number: counter, status: 'draft' }), id });

    expect([put.status, patch.status]).toEqual([409, 409]);
    expect((await gameOf(id)).status).toBe('published');
  });

  it('a revoke needs a reason, returns the game to a draft, clears the confirmations and the ratings', async () => {
    const id = await draft();
    const before = await playerPoints();
    await confirmTwice(t, id);
    expect(await playerPoints()).toBe(before + 1);

    expect((await revokeGame(t, id, '')).status).toBe(400);
    const res = await revokeGame(t, id, 'The score was wrong');

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: 'draft' });
    expect(res.body.data.confirmations ?? []).toHaveLength(0);
    expect(res.body.data.revoked).toMatchObject({
      reason: 'The score was wrong',
    });
    expect(await playerPoints()).toBe(before);
    expect((await revokeGame(t, id)).status).toBe(409);
  });

  it('a person takes his own confirmation back: a published game becomes a draft again', async () => {
    const id = await draft();
    const before = await playerPoints();
    await confirmTwice(t, id);

    const res = await t.api().delete(`/rest/games/${id}/confirm`).set(mod());

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('draft');
    expect(res.body.data.confirmations).toHaveLength(1);
    expect(await playerPoints()).toBe(before);
    expect(
      (await t.api().delete(`/rest/games/${id}/confirm`).set(mod())).status,
    ).toBe(404);
  });

  it('the public sees only published games, an admin and a moderator see all', async () => {
    const hidden = await draft();
    const shown = await draft();
    await confirmTwice(t, shown);

    const list = await t.api().get('/rest/games').query({ season: 2024 });
    const publicIds = list.body.data.map((g: { id: string }) => g.id);
    expect(publicIds).toContain(shown);
    expect(publicIds).not.toContain(hidden);
    expect(
      list.body.data.every((g: { status: string }) => g.status === 'published'),
    ).toBe(true);
    expect((await t.api().get(`/rest/games/${hidden}`)).status).toBe(404);
    expect((await t.api().get(`/rest/games/${shown}`)).status).toBe(200);

    for (const headers of [admin(), mod()]) {
      const all = await t
        .api()
        .get('/rest/games')
        .query({ season: 2024 })
        .set(headers);
      expect(all.body.data.map((g: { id: string }) => g.id)).toContain(hidden);
    }
    const asUser = await t.api().get(`/rest/games/${hidden}`).set(user());
    expect(asUser.status).toBe(404);
  });

  it('the public answer has no accounts of the confirmers', async () => {
    const id = await draft();
    await confirmTwice(t, id);

    const publicGame = await gameOf(id, {} as never);
    expect(publicGame.confirmations).toBeUndefined();
    expect(publicGame.revoked).toBeUndefined();
    expect((await gameOf(id)).confirmations[0]).toHaveProperty('accountId');
  });

  it('who may do what: a moderator confirms and does not revoke, a user does neither', async () => {
    const id = await draft();

    expect((await confirm(id, user())).status).toBe(403);
    expect((await t.api().post(`/rest/games/${id}/confirm`)).status).toBe(401);
    await confirmTwice(t, id);
    expect(
      (
        await t
          .api()
          .post(`/rest/games/${id}/revoke`)
          .set(mod())
          .send({ reason: 'x y z' })
      ).status,
    ).toBe(403);
    expect(
      (
        await t
          .api()
          .post(`/rest/games/${id}/revoke`)
          .set(user())
          .send({ reason: 'x y z' })
      ).status,
    ).toBe(403);
    expect(
      (await t.api().post('/rest/games/not-an-id/confirm').set(admin())).status,
    ).toBe(400);
    expect(
      (
        await t
          .api()
          .post('/rest/games/64b7f0f0f0f0f0f0f0f0f0f0/confirm')
          .set(admin())
      ).status,
    ).toBe(404);
  });
});
