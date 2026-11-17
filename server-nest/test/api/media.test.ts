// Photos of games and players (S10.19): the admin uploads, everybody sees.
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bearer, createPlayers, isSuccess } from '../helpers/fixtures';
import { createTestApp, TestApp } from '../helpers/test-app';

/** 1x1 PNG. */
export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('API: media', () => {
  let t: TestApp;
  let dir: string;
  let playerId: string;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'sfl-media-'));
    t = await createTestApp({ MEDIA_DIR: dir });
    playerId = (await createPlayers(t, 1))[0].id;
  });
  afterAll(async () => {
    await t.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const auth = () => ({ Authorization: bearer(t) });
  const upload = (
    content: Buffer = PNG,
    fields: Record<string, string> = {},
    name = 'photo.png',
  ) => {
    const req = t.api().post('/rest/media').set(auth());
    for (const [key, value] of Object.entries(fields)) req.field(key, value);
    return req.attach('file', content, name);
  };

  it('an admin uploads a photo with a caption and a player', async () => {
    const res = await upload(PNG, { caption: ' Final ', playerId });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      mime: 'image/png',
      size: PNG.length,
      caption: 'Final',
      playerId,
    });
    expect(res.body.data.id).toMatch(/^[0-9a-f]{24}$/);
    // The stored name never leaves the server
    expect(JSON.stringify(res.body)).not.toMatch(/\.png|file"|path/i);
    expect(readdirSync(dir)).toHaveLength(1);
  });

  it('the list is public, filtered by player and game', async () => {
    await upload(PNG, { caption: 'No player' });

    const res = await t.api().get('/rest/media').query({ playerId });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(
      res.body.data.every((m: { playerId: string }) => m.playerId === playerId),
    ).toBe(true);

    const all = await t.api().get('/rest/media');
    expect(all.body.data.length).toBeGreaterThan(res.body.data.length);
  });

  it('the file is public and raw: the type, nosniff and a long cache', async () => {
    const created = await upload();

    const res = await t
      .api()
      .get(`/rest/media/${created.body.data.id}/file`)
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', c => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cache-control']).toContain('immutable');
    expect(Buffer.compare(res.body, PNG)).toBe(0);
  });

  it.each([
    ['text renamed to .png', Buffer.from('<script>alert(1)</script>'), {}],
    ['a GIF', Buffer.from('GIF89a......'), {}],
    ['a bad game id', PNG, { gameId: 'nope' }],
    ['a caption over 200 characters', PNG, { caption: 'x'.repeat(201) }],
  ])('rejects %s with 400', async (_name, content, fields) => {
    const res = await upload(content, fields);

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('rejects a request without a file and a file over the limit', async () => {
    const none = await t
      .api()
      .post('/rest/media')
      .set(auth())
      .field('caption', 'x');
    expect(none.status).toBe(400);

    const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);
    expect((await upload(big)).status).toBe(413);
  });

  it('nothing is stored for a rejected file', async () => {
    const before = readdirSync(dir).length;
    await upload(Buffer.from('not an image'));
    expect(readdirSync(dir)).toHaveLength(before);
  });

  it('an admin changes the caption and the links, and deletes with the file', async () => {
    const created = await upload(PNG, { caption: 'Old', playerId });
    const id = created.body.data.id;

    const patched = await t
      .api()
      .patch(`/rest/media/${id}`)
      .set(auth())
      .send({ caption: 'New', playerId: null });
    expect(patched.status).toBe(200);
    expect(patched.body.data).toMatchObject({ caption: 'New', playerId: null });

    const before = readdirSync(dir).length;
    const removed = await t.api().delete(`/rest/media/${id}`).set(auth());
    expect(isSuccess(removed.status)).toBe(true);
    expect(readdirSync(dir)).toHaveLength(before - 1);
    expect((await t.api().get(`/rest/media/${id}/file`)).status).toBe(404);
    expect((await t.api().delete(`/rest/media/${id}`).set(auth())).status).toBe(
      404,
    );
  });

  it('a broken id answers 400, an unknown one 404', async () => {
    expect((await t.api().get('/rest/media/not-an-id/file')).status).toBe(400);
    expect(
      (await t.api().get('/rest/media/64b7f0f0f0f0f0f0f0f0f0f0/file')).status,
    ).toBe(404);
  });

  it('only an admin writes: 401 without a token, 403 for a plain user', async () => {
    const created = await upload();
    const id = created.body.data.id;
    const user = { Authorization: `Bearer ${t.userToken}` };

    expect(
      (await t.api().post('/rest/media').attach('file', PNG, 'a.png')).status,
    ).toBe(401);
    expect(
      (await t.api().post('/rest/media').set(user).attach('file', PNG, 'a.png'))
        .status,
    ).toBe(403);
    expect(
      (
        await t
          .api()
          .patch(`/rest/media/${id}`)
          .set(user)
          .send({ caption: 'x' })
      ).status,
    ).toBe(403);
    expect((await t.api().delete(`/rest/media/${id}`).set(user)).status).toBe(
      403,
    );
    expect(existsSync(dir)).toBe(true);
  });
});
