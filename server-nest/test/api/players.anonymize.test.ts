// Anonymization of a player (S8.4): the person leaves, the statistics stay.
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bearer, gameBody, isSuccess, postGame } from '../helpers/fixtures';
import { createTestApp, TestApp } from '../helpers/test-app';

describe('API: anonymize a player (S8.4)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  const auth = () => ({ Authorization: bearer(t) });

  async function createPlayer(n: string) {
    const res = await t
      .api()
      .post('/rest/players')
      .set(auth())
      .send({
        players: [
          {
            nickname: `Hawk ${n}`,
            number: 7,
            user: { email: `${n}@sfl.test`, name: 'Gerd', surname: 'Secret' },
          },
        ],
      });
    const { id } = res.body.data[0] as { id: string };
    const full = await t.api().get(`/rest/players/${id}`).set(auth());
    return full.body.data as { id: string; user: { id: string } };
  }

  it('removes the name, surname, email and nickname, keeps the number and the id', async () => {
    const player = await createPlayer('a1');

    const res = await t
      .api()
      .post(`/rest/players/${player.id}/anonymize`)
      .set(auth());

    expect(isSuccess(res.status)).toBe(true);
    expect(res.body.data).toMatchObject({
      id: player.id,
      number: 7,
      nickname: expect.stringMatching(/^Former player/),
    });
    expect(res.body.data.user).toMatchObject({ name: '', surname: '' });
    expect(res.body.data.user.email).toMatch(/@sfl\.invalid$/);
    expect(JSON.stringify(res.body)).not.toMatch(/Hawk|Gerd|Secret|a1@sfl/);

    const stored = await t
      .model('User')
      .findById(new Types.UUID(player.user.id))
      .lean();
    expect(stored.email).toMatch(/@sfl\.invalid$/);
    expect(stored.age).toBeUndefined();
    expect(stored.avatar ?? '').toBe('');
  });

  it('the old email and password do not sign in any more', async () => {
    const player = await createPlayer('a2');
    await t.api().post(`/rest/players/${player.id}/anonymize`).set(auth());

    const res = await t
      .api()
      .post('/rest/auth/sign-in')
      .send({ email: 'a2@sfl.test', password: 'whatever-password' });
    expect(res.status).toBe(401);
  });

  it('the games and the statistics of the player stay', async () => {
    const player = await createPlayer('a3');
    const other = await createPlayer('a4');
    const game = await postGame(
      t,
      gameBody([player.id, other.id], { number: 9 }),
    );
    expect(isSuccess(game.status)).toBe(true);

    await t.api().post(`/rest/players/${player.id}/anonymize`).set(auth());

    const after = await t.api().get(`/rest/games/${game.body.data.id}`);
    expect(
      after.body.data.statistics.map((s: { playerId: string }) => s.playerId),
    ).toContain(player.id);
    const stats = await t.api().get(`/rest/players/${player.id}`);
    expect(stats.status).toBe(200);
  });

  it('the photos of the player stay, but without the link to the person', async () => {
    const player = await createPlayer('a5');
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    const photo = await t
      .api()
      .post('/rest/media')
      .set(auth())
      .field('playerId', player.id)
      .attach('file', png, 'a.png');

    await t.api().post(`/rest/players/${player.id}/anonymize`).set(auth());

    const list = await t
      .api()
      .get('/rest/media')
      .query({ playerId: player.id });
    expect(list.body.data).toHaveLength(0);
    const all = await t.api().get('/rest/media');
    expect(
      all.body.data.find((m: { id: string }) => m.id === photo.body.data.id),
    ).toMatchObject({
      playerId: null,
    });
  });

  it('is idempotent, 404 for an unknown player, 400 for a broken id, 403 for a plain user', async () => {
    const player = await createPlayer('a6');
    const url = `/rest/players/${player.id}/anonymize`;

    expect(isSuccess((await t.api().post(url).set(auth())).status)).toBe(true);
    expect(isSuccess((await t.api().post(url).set(auth())).status)).toBe(true);
    expect(
      (
        await t
          .api()
          .post('/rest/players/64b7f0f0f0f0f0f0f0f0f0f0/anonymize')
          .set(auth())
      ).status,
    ).toBe(404);
    expect(
      (await t.api().post('/rest/players/nope/anonymize').set(auth())).status,
    ).toBe(400);
    expect(
      (
        await t
          .api()
          .post(url)
          .set({ Authorization: `Bearer ${t.userToken}` })
      ).status,
    ).toBe(403);
  });
});
