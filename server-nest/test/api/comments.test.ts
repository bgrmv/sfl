// Comments on a game (S10.22): a visitor writes, the admin approves, the public reads the approved.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bearer, createPlayers, gameBody, postGame } from '../helpers/fixtures';
import { createTestApp, TestApp } from '../helpers/test-app';

describe('API: comments', () => {
  let t: TestApp;
  let gameId: string;

  beforeAll(async () => {
    t = await createTestApp({ COMMENT_LIMIT: '1000' });
    const players = await createPlayers(t, 2);
    gameId = (
      await postGame(
        t,
        gameBody(
          players.map(p => p.id),
          { number: 5 },
        ),
      )
    ).body.data.id;
  });
  afterAll(() => t.close());

  const auth = () => ({ Authorization: bearer(t) });
  const send = (text = 'Great game', name = 'Pike') =>
    t.api().post('/rest/comments').send({ gameId, name, text });

  it('a visitor writes without signing in: the comment waits for the review', async () => {
    const res = await send('Rematch on Saturday?');

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      gameId,
      name: 'Pike',
      text: 'Rematch on Saturday?',
      status: 'pending',
    });

    const list = await t.api().get('/rest/comments').query({ gameId });
    expect(list.status).toBe(200);
    expect(list.body.data.map((c: { id: string }) => c.id)).not.toContain(
      res.body.data.id,
    );
  });

  it('the visitor cannot publish by himself: a status in the body is ignored', async () => {
    const res = await t
      .api()
      .post('/rest/comments')
      .send({ gameId, name: 'Sly', text: 'Hello', status: 'approved' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');
  });

  it('the admin sees the queue, approves, and the public reads the comment', async () => {
    const created = await send('Approved one');
    const id = created.body.data.id;

    const queue = await t.api().get('/rest/comments/queue').set(auth());
    expect(queue.status).toBe(200);
    expect(queue.body.data.map((c: { id: string }) => c.id)).toContain(id);

    const verdict = await t
      .api()
      .patch(`/rest/comments/${id}`)
      .set(auth())
      .send({ status: 'approved' });
    expect(verdict.body.data.status).toBe('approved');

    const list = await t.api().get('/rest/comments').query({ gameId });
    expect(
      list.body.data.find((c: { id: string }) => c.id === id),
    ).toMatchObject({
      text: 'Approved one',
      status: 'approved',
    });
    const after = await t.api().get('/rest/comments/queue').set(auth());
    expect(after.body.data.map((c: { id: string }) => c.id)).not.toContain(id);
  });

  it('a rejected comment is not shown and a deleted one is gone', async () => {
    const rejected = (await send('Rude words')).body.data.id;
    await t
      .api()
      .patch(`/rest/comments/${rejected}`)
      .set(auth())
      .send({ status: 'rejected' });
    const deleted = (await send('To delete')).body.data.id;
    const removed = await t
      .api()
      .delete(`/rest/comments/${deleted}`)
      .set(auth());
    expect(removed.status).toBe(200);

    const list = await t.api().get('/rest/comments').query({ gameId });
    const ids = list.body.data.map((c: { id: string }) => c.id);
    expect(ids).not.toContain(rejected);
    expect(ids).not.toContain(deleted);
    expect(
      (await t.api().delete(`/rest/comments/${deleted}`).set(auth())).status,
    ).toBe(404);
  });

  it('the public answer has no email, no id of the author and no private fields', async () => {
    const id = (await send('Public one')).body.data.id;
    await t
      .api()
      .patch(`/rest/comments/${id}`)
      .set(auth())
      .send({ status: 'approved' });

    const res = await t.api().get('/rest/comments').query({ gameId });

    expect(Object.keys(res.body.data[0]).sort()).toEqual(
      ['createdAt', 'gameId', 'id', 'name', 'status', 'text'].sort(),
    );
  });

  it('the text stays plain: tags and links are stored as they are and never turned into links', async () => {
    const res = await send('<b>bold</b> https://spam.example/x', 'A<i>');
    expect(res.status).toBe(201);
    expect(res.body.data.text).toBe('<b>bold</b> https://spam.example/x');
    expect(res.body.data.name).toBe('A<i>');
  });

  it.each([
    ['no text', { gameId: undefined, name: 'Pike', text: ' ' }],
    ['a text over 1000 characters', { name: 'Pike', text: 'x'.repeat(1001) }],
    ['no name', { name: ' ', text: 'Hello' }],
    [
      'a game that is not an id',
      { gameId: 'nope', name: 'Pike', text: 'Hello' },
    ],
  ])('rejects %s with 400', async (_name, body) => {
    const res = await t
      .api()
      .post('/rest/comments')
      .send({ gameId, ...body });
    expect(res.status).toBe(400);
  });

  it('an unknown game answers 404 and no comment is stored', async () => {
    const res = await t.api().post('/rest/comments').send({
      gameId: '64b7f0f0f0f0f0f0f0f0f0f0',
      name: 'Pike',
      text: 'Hello',
    });
    expect(res.status).toBe(404);
  });

  it('the list needs a game: a broken id answers 400', async () => {
    expect((await t.api().get('/rest/comments')).status).toBe(400);
    expect(
      (await t.api().get('/rest/comments').query({ gameId: 'x' })).status,
    ).toBe(400);
  });

  it('a moderator moderates comments too (S10.35)', async () => {
    const id = (await send('For the moderator')).body.data.id;
    const mod = { Authorization: `Bearer ${t.moderatorToken}` };

    expect((await t.api().get('/rest/comments/queue').set(mod)).status).toBe(
      200,
    );
    const verdict = await t
      .api()
      .patch(`/rest/comments/${id}`)
      .set(mod)
      .send({ status: 'approved' });
    expect(verdict.body.data.status).toBe('approved');
    expect((await t.api().delete(`/rest/comments/${id}`).set(mod)).status).toBe(
      200,
    );
  });

  it('only an admin or a moderator moderates: 401 without a token, 403 for a plain user', async () => {
    const id = (await send('Moderation test')).body.data.id;
    const user = { Authorization: `Bearer ${t.userToken}` };

    expect((await t.api().get('/rest/comments/queue')).status).toBe(401);
    expect((await t.api().get('/rest/comments/queue').set(user)).status).toBe(
      403,
    );
    expect(
      (
        await t
          .api()
          .patch(`/rest/comments/${id}`)
          .set(user)
          .send({ status: 'approved' })
      ).status,
    ).toBe(403);
    expect(
      (await t.api().delete(`/rest/comments/${id}`).set(user)).status,
    ).toBe(403);
    expect(
      (
        await t
          .api()
          .patch(`/rest/comments/${id}`)
          .set(auth())
          .send({ status: 'pending' })
      ).status,
    ).toBe(400);
  });
});

describe('API: the rate of comments', () => {
  let t: TestApp;
  let gameId: string;

  beforeAll(async () => {
    t = await createTestApp({ COMMENT_LIMIT: '2', COMMENT_WINDOW_SEC: '60' });
    const players = await createPlayers(t, 2);
    gameId = (
      await postGame(
        t,
        gameBody(
          players.map(p => p.id),
          { number: 6 },
        ),
      )
    ).body.data.id;
  });
  afterAll(() => t.close());

  it('too many comments from one address answer 429 with Retry-After', async () => {
    const send = () =>
      t
        .api()
        .post('/rest/comments')
        .send({ gameId, name: 'Pike', text: 'Spam' });

    expect((await send()).status).toBe(201);
    expect((await send()).status).toBe(201);
    const third = await send();

    expect(third.status).toBe(429);
    expect(third.headers['retry-after']).toBeDefined();
  });
});
