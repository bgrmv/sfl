import { Types } from 'mongoose';
import { createTestApp, TestApp } from '../helpers/test-app';
import { bearer, isSuccess } from '../helpers/fixtures';

// Birth date and country are stored for the future profile (S10.33, S10.44), but
// no response shows them until the visibility settings exist (S8.4).
describe('API: birth date and country of a user are stored and hidden (S3.33)', () => {
  let t: TestApp;
  let playerId: string;
  let userId: string;

  beforeAll(async () => {
    t = await createTestApp();
    const res = await t
      .api()
      .post('/rest/players')
      .set('Authorization', bearer(t))
      .send({
        players: [
          { nickname: 'Born', number: 41, user: { email: 'born@sfl.test' } },
        ],
      });
    playerId = res.body.data[0].id;
    const player = await t.model('Player').findById(playerId).lean();
    userId = String(player.user);
  });

  afterAll(() => t.close());

  const patch = (body: object) =>
    t
      .api()
      .patch(`/rest/players/${playerId}`)
      .set('Authorization', bearer(t))
      .send(body);
  const stored = () => t.model('User').findById(new Types.UUID(userId)).lean();

  it('an admin sets both; they are stored as a date and an ISO code', async () => {
    const res = await patch({
      user: { birthDate: '1990-05-17', country: 'LV' },
    });

    expect(isSuccess(res.status)).toBe(true);
    const user = await stored();
    expect(user.birthDate).toEqual(new Date('1990-05-17T00:00:00.000Z'));
    expect(user.country).toBe('LV');
  });

  it('no response shows them: not the PATCH, not the admin or the public player, not whoami, not the list', async () => {
    const answers = [
      await patch({ user: { name: 'Gerd' } }),
      await t
        .api()
        .get(`/rest/players/${playerId}`)
        .set('Authorization', bearer(t)),
      await t.api().get(`/rest/players/${playerId}`),
      await t.api().get('/rest/players'),
      await t.api().get('/rest/players').set('Authorization', bearer(t)),
      await t.api().get('/rest/auth/whoami').set('Authorization', bearer(t)),
    ];

    for (const res of answers) {
      expect(isSuccess(res.status)).toBe(true);
      expect(JSON.stringify(res.body)).not.toMatch(
        /birthDate|country|1990-05-17|"age"/,
      );
    }
  });

  it('a plain user cannot set them', async () => {
    const res = await t
      .api()
      .patch(`/rest/players/${playerId}`)
      .set('Authorization', `Bearer ${t.userToken}`)
      .send({ user: { birthDate: '2000-01-01' } });

    expect(res.status).toBe(403);
    expect((await stored()).birthDate).toEqual(
      new Date('1990-05-17T00:00:00.000Z'),
    );
  });

  it('null clears them', async () => {
    const res = await patch({ user: { birthDate: null, country: null } });

    expect(isSuccess(res.status)).toBe(true);
    const user = await stored();
    expect(user.birthDate ?? null).toBeNull();
    expect(user.country ?? null).toBeNull();
  });

  it.each([
    ['a lower-case country', { country: 'lv' }],
    ['a date in the future', { birthDate: '2999-01-01' }],
  ])('answers 400 to %s and stores nothing', async (_name, user) => {
    const res = await patch({ user });

    expect(res.status).toBe(400);
  });
});
