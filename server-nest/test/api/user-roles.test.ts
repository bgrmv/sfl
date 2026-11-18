import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bearer, createPlayers } from '../helpers/fixtures';
import { ADMIN_EMAIL, createTestApp, TestApp } from '../helpers/test-app';

// Access levels of users: only ADMIN lists accounts and changes their roles

/** The ids of users are UUIDs: a string has to be cast before a query. */
const uuid = (id: string) => new Types.UUID(id);

describe('API: roles of users', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  const list = (token = bearer(t)) =>
    t.api().get('/rest/users').set('Authorization', token);
  const setRoles = (id: string, roles: unknown, token = bearer(t)) =>
    t
      .api()
      .patch(`/rest/users/${id}/roles`)
      .set('Authorization', token)
      .send({ roles });
  const userIdOf = async (email: string) =>
    String((await t.model('User').findOne({ email }))!._id);
  const rolesOf = async (id: string) => {
    const user = await t.model('User').findById(uuid(id)).populate('roles');
    return (user.roles as unknown as { name: string }[])
      .map(r => r.name)
      .sort();
  };

  async function newAccount() {
    const [player] = await createPlayers(t, 1);
    const row = await t.model('Player').findById(player.id);
    return { player, userId: String(row.user) };
  }

  describe('the list', () => {
    it('shows name, nickname and roles, never an email or Google data', async () => {
      const { player, userId } = await newAccount();
      await t
        .model('User')
        .updateOne({ _id: uuid(userId) }, { googleSub: 'sub-secret' });

      const res = await list();

      expect(res.status).toBe(200);
      const row = res.body.data.find((u: { id: string }) => u.id === userId);
      expect(row).toMatchObject({
        name: 'Test',
        surname: 'Secret',
        nickname: player.nickname,
        hasGoogle: true,
      });
      expect(Array.isArray(row.roles)).toBe(true);
      const text = JSON.stringify(res.body);
      expect(text).not.toContain('@sfl.test');
      expect(text).not.toContain('sub-secret');
    });

    it('is closed to a moderator and a user', async () => {
      expect((await list(`Bearer ${t.moderatorToken}`)).status).toBe(403);
      expect((await list(`Bearer ${t.userToken}`)).status).toBe(403);
    });
  });

  describe('changing roles', () => {
    it('is for ADMIN only: a moderator cannot even make himself an admin', async () => {
      const { userId } = await newAccount();
      const moderatorId = await userIdOf('moderator@sfl.test');

      expect(
        (await setRoles(userId, ['USER'], `Bearer ${t.moderatorToken}`)).status,
      ).toBe(403);
      expect(
        (await setRoles(moderatorId, ['ADMIN'], `Bearer ${t.moderatorToken}`))
          .status,
      ).toBe(403);
      expect(
        (await setRoles(userId, ['USER'], `Bearer ${t.userToken}`)).status,
      ).toBe(403);
      expect(await rolesOf(moderatorId)).toEqual(['MODERATOR']);
    });

    it('gives and takes roles', async () => {
      const { userId } = await newAccount();

      const res = await setRoles(userId, ['MODERATOR', 'USER']);

      expect(res.status).toBe(200);
      expect(res.body.data.roles.sort()).toEqual(['MODERATOR', 'USER']);
      expect(await rolesOf(userId)).toEqual(['MODERATOR', 'USER']);
    });

    it('lets a person have no role: the level of a guest', async () => {
      const { userId } = await newAccount();

      const res = await setRoles(userId, []);

      expect(res.status).toBe(200);
      expect(await rolesOf(userId)).toEqual([]);
    });

    it('repeats a role once', async () => {
      const { userId } = await newAccount();

      await setRoles(userId, ['USER', 'USER']);

      expect(await rolesOf(userId)).toEqual(['USER']);
    });

    it.each([
      ['a role that does not exist', ['SUPERUSER']],
      ['a service role', ['QA']],
      ['GUEST (it is not stored)', ['GUEST']],
      ['not a list', 'ADMIN'],
    ])('rejects %s', async (_name, roles) => {
      const { userId } = await newAccount();

      const res = await setRoles(userId, roles);

      expect(res.status).toBe(400);
    });

    it('answers 404 for an unknown user and 400 for a bad id', async () => {
      expect(
        (await setRoles('b21439b9-87ff-4646-b9e1-780797c887e8', ['USER']))
          .status,
      ).toBe(404);
      expect((await setRoles('not-an-id', ['USER'])).status).toBe(400);
    });

    it('does not let an admin take the admin role from himself', async () => {
      const adminId = await userIdOf(ADMIN_EMAIL);

      const res = await setRoles(adminId, ['USER']);

      expect(res.status).toBe(400);
      expect(await rolesOf(adminId)).toContain('ADMIN');
    });

    it('ends the sessions of the person: the new level works at once on the next refresh', async () => {
      const { userId } = await newAccount();
      const before =
        (await t.model('User').findById(uuid(userId)))!.tokenVersion ?? 0;

      await setRoles(userId, ['MODERATOR']);

      const after = (await t.model('User').findById(uuid(userId))).tokenVersion;
      expect(after).toBe(before + 1);
    });
  });
});
