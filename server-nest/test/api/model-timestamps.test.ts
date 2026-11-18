import { createTestApp, TestApp } from '../helpers/test-app';
import { bearer, isSuccess } from '../helpers/fixtures';

describe('Model: required game keys and creation dates (S3.33, audit data-model-2026-11-18)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(() => t.close());

  it('rejects a game without a number or a season at the schema level', async () => {
    const base = {
      playedAt: new Date(),
      status: 'new',
      teams: [],
      statistics: [],
    };

    await expect(
      t.model('Game').create({ ...base, season: 2026 }),
    ).rejects.toThrow(/number/);
    await expect(
      t.model('Game').create({ ...base, number: 1 }),
    ).rejects.toThrow(/season/);
  });

  it('stamps createdAt and updatedAt on a new player and its user, without showing them in the API', async () => {
    const res = await t
      .api()
      .post('/rest/players')
      .set('Authorization', bearer(t))
      .send({
        players: [
          { nickname: 'Dated', number: 31, user: { email: 'dated@sfl.test' } },
        ],
      });

    expect(isSuccess(res.status)).toBe(true);
    const [created] = res.body.data;
    expect(created).not.toHaveProperty('createdAt');
    expect(created).not.toHaveProperty('updatedAt');
    expect(created.user).not.toHaveProperty('createdAt');

    const player = await t.model('Player').findById(created.id).lean();
    const user = await t
      .model('User')
      .findOne({ email: 'dated@sfl.test' })
      .lean();
    expect(player.createdAt).toBeInstanceOf(Date);
    expect(player.updatedAt).toBeInstanceOf(Date);
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  it('moves updatedAt but not createdAt on a change', async () => {
    const player = await t
      .model('Player')
      .findOne({ nickname: 'Dated' })
      .lean();
    await new Promise(r => setTimeout(r, 15));

    await t.model('Player').updateOne({ _id: player._id }, { number: 32 });

    const after = await t.model('Player').findById(player._id).lean();
    expect(after.createdAt).toEqual(player.createdAt);
    expect(after.updatedAt.getTime()).toBeGreaterThan(
      player.updatedAt.getTime(),
    );
  });
});
