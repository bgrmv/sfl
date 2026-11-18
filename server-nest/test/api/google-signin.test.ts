import { Types } from 'mongoose';
import {
  createHash,
  createSign,
  generateKeyPairSync,
  KeyObject,
} from 'node:crypto';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { bearer, createPlayers } from '../helpers/fixtures';
import { sha512Legacy } from '../../src/shared/utils/string';
import { createTestApp, TestApp } from '../helpers/test-app';

// S8.13, ADR 0021: Google sign-in by redirect, bound to a player by a one-time link.
// Google is replaced by a stub of `fetch`; the signatures are real (RS256), so
// the check of the ID token itself is tested, not skipped.

const CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
const CLIENT_SECRET = 'test-client-secret';
const REDIRECT_URI = 'http://localhost:3001/rest/auth/google/callback';
const CLIENT_URL = 'http://localhost:4200';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

const pair = () => generateKeyPairSync('rsa', { modulusLength: 2048 });
const google = pair();
const stranger = pair(); // a key that Google does not publish

const b64 = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

function sign(
  claims: Record<string, unknown>,
  key: KeyObject = google.privateKey,
  header: Record<string, unknown> = { alg: 'RS256', kid: 'k1' },
) {
  const input = `${b64(header)}.${b64(claims)}`;
  const signature = createSign('RSA-SHA256').update(input).sign(key);
  return `${input}.${signature.toString('base64url')}`;
}

interface Exchange {
  code: string;
  /** The PKCE challenge the start sent to Google. */
  challenge: string;
  idToken: string;
}

describe('Google sign-in and linking (S8.13)', () => {
  let t: TestApp;
  let exchange: Exchange | undefined;
  let exchanges = 0;

  beforeAll(async () => {
    t = await createTestApp({
      GOOGLE_CLIENT_ID: CLIENT_ID,
      GOOGLE_CLIENT_SECRET: CLIENT_SECRET,
      GOOGLE_REDIRECT_URI: REDIRECT_URI,
    });
  });
  afterAll(() => t.close());

  beforeAll(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === CERTS_URL) {
          const jwk = google.publicKey.export({ format: 'jwk' });
          return Response.json({ keys: [{ ...jwk, kid: 'k1', alg: 'RS256' }] });
        }
        if (url === TOKEN_URL) {
          exchanges += 1;
          const form = new URLSearchParams(String(init?.body));
          const verifierHash = createHash('sha256')
            .update(form.get('code_verifier') ?? '')
            .digest('base64url');
          const ok =
            exchange &&
            form.get('code') === exchange.code &&
            form.get('client_id') === CLIENT_ID &&
            form.get('client_secret') === CLIENT_SECRET &&
            form.get('redirect_uri') === REDIRECT_URI &&
            form.get('grant_type') === 'authorization_code' &&
            verifierHash === exchange.challenge;
          return ok
            ? Response.json({ id_token: exchange!.idToken })
            : Response.json({ error: 'invalid_grant' }, { status: 400 });
        }
        throw new Error(`Unexpected request to ${url}`);
      }),
    );
  });
  afterAll(() => vi.unstubAllGlobals());
  afterEach(() => {
    exchange = undefined;
  });

  const invite = (playerId: string, token = bearer(t)) =>
    t
      .api()
      .post('/rest/auth/invitations')
      .set('Authorization', token)
      .send({ playerId });

  async function newPlayer() {
    const [player] = await createPlayers(t, 1);
    return player;
  }

  async function newLink() {
    const player = await newPlayer();
    const res = await invite(player.id);
    return {
      player,
      id: res.body.data.id as string,
      token: res.body.data.token as string,
    };
  }

  let account = 0;
  const profile = () => {
    account += 1;
    return {
      sub: `google-sub-${account}`,
      email: `real-${account}@gmail.test`,
    };
  };

  interface Options {
    invitation?: string;
    claims?: Record<string, unknown>;
    key?: KeyObject;
    header?: Record<string, unknown>;
    /** A state other than the one the browser got. */
    state?: string;
    noCookie?: boolean;
    /** The query Google adds to the callback instead of the code. */
    query?: Record<string, string>;
    verifierBreaks?: boolean;
  }

  /** The whole round trip: start, "Google", callback. Returns the callback answer. */
  async function signInWith(
    who: { sub: string; email: string },
    o: Options = {},
  ) {
    const start = await t
      .api()
      .get('/rest/auth/google/start')
      .query(o.invitation ? { invitation: o.invitation } : {});
    expect(start.status).toBe(302);
    const target = new URL(start.headers.location);
    const nonce = target.searchParams.get('nonce')!;
    const state = target.searchParams.get('state')!;
    const now = Math.floor(Date.now() / 1000);

    exchange = {
      code: 'auth-code',
      challenge: o.verifierBreaks
        ? 'not-the-challenge'
        : target.searchParams.get('code_challenge')!,
      idToken: sign(
        {
          iss: 'https://accounts.google.com',
          aud: CLIENT_ID,
          sub: who.sub,
          email: who.email,
          email_verified: true,
          nonce,
          iat: now,
          exp: now + 600,
          ...o.claims,
        },
        o.key,
        o.header,
      ),
    };

    const cookie = String(start.headers['set-cookie']).split(';')[0];
    const call = t
      .api()
      .get('/rest/auth/google/callback')
      .query(o.query ?? { code: 'auth-code', state: o.state ?? state });
    return o.noCookie ? call : call.set('Cookie', cookie);
  }

  const succeeded = (res: { status: number; headers: Record<string, any> }) =>
    res.status === 302 && res.headers.location === `${CLIENT_URL}/connected`;
  const failed = (res: { status: number; headers: Record<string, any> }) =>
    res.status === 302 &&
    res.headers.location === `${CLIENT_URL}/connect/failed`;

  const userOf = async (playerId: string) => {
    const player = await t.model('Player').findById(playerId).lean();
    return t.model('User').findById(player.user).lean();
  };

  describe('creating a link', () => {
    it('is for ADMIN only', async () => {
      const player = await newPlayer();

      expect((await invite(player.id, `Bearer ${t.userToken}`)).status).toBe(
        403,
      );
      expect(
        (await invite(player.id, `Bearer ${t.moderatorToken}`)).status,
      ).toBe(403);
      expect(
        (
          await t
            .api()
            .post('/rest/auth/invitations')
            .send({ playerId: player.id })
        ).status,
      ).toBe(401);
    });

    it('gives a long random token once and keeps only its hash', async () => {
      const player = await newPlayer();
      const res = await invite(player.id);

      expect(res.status).toBe(201);
      const { token, url, expiresAt } = res.body.data;
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(url).toBe(`${CLIENT_URL}/connect/${token}`);
      const days = (new Date(expiresAt).getTime() - Date.now()) / 86_400_000;
      expect(days).toBeGreaterThan(0.99);
      expect(days).toBeLessThanOrEqual(1);

      const stored = await t
        .model('Invitation')
        .findOne({ playerId: new Types.ObjectId(player.id) })
        .lean();
      expect(JSON.stringify(stored)).not.toContain(token);
      expect(stored.tokenHash).toBe(
        createHash('sha256').update(token).digest('hex'),
      );
      expect(stored.status).toBe('active');
    });

    it('rejects an unknown player', async () => {
      const res = await invite('64b7f0f0f0f0f0f0f0f0f0f0');

      expect(res.status).toBe(404);
    });
  });

  describe('the page of the link', () => {
    it('shows the card of the player and nothing private', async () => {
      const { player, token } = await newLink();

      const res = await t.api().get(`/rest/auth/invitations/${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.player).toEqual({
        nickname: player.nickname,
        name: 'Test',
        surname: 'Secret',
      });
      expect(JSON.stringify(res.body)).not.toContain('@sfl.test');
    });

    it('answers the same for an unknown, expired, used and revoked link', async () => {
      const unknown = await t.api().get('/rest/auth/invitations/nope');

      const expired = await newLink();
      await t
        .model('Invitation')
        .updateOne(
          { _id: expired.id },
          { expiresAt: new Date(Date.now() - 1000) },
        );
      const revoked = await newLink();
      await t
        .api()
        .delete(`/rest/auth/invitations/${revoked.id}`)
        .set('Authorization', bearer(t));
      const used = await newLink();
      await t
        .model('Invitation')
        .updateOne({ _id: used.id }, { status: 'used' });

      const answers = [
        unknown,
        ...(await Promise.all(
          [expired, revoked, used].map(l =>
            t.api().get(`/rest/auth/invitations/${l.token}`),
          ),
        )),
      ];
      for (const res of answers) {
        expect(res.status).toBe(404);
        expect(res.body).toEqual(unknown.body);
      }
    });
  });

  describe('linking', () => {
    it('binds the Google account to the player, replaces the email and starts a session', async () => {
      const { player, token, id } = await newLink();
      const before = await userOf(player.id);
      const who = profile();

      const res = await signInWith(who, { invitation: token });

      expect(succeeded(res)).toBe(true);
      const after = await userOf(player.id);
      expect(String(after._id)).toBe(String(before._id)); // the same user, the stats stay with the player
      expect(after.email).toBe(who.email);
      expect(after.googleSub).toBe(who.sub);
      expect((await t.model('Invitation').findById(id).lean()).status).toBe(
        'used',
      );

      // The session works as after a password sign-in (S8.12): cookie, then access token
      const cookie = String(res.headers['set-cookie']).split(';').join(';');
      expect(cookie).toMatch(/refreshToken=.+HttpOnly/i);
      const refreshCookie = (res.headers['set-cookie'] as unknown as string[])
        .find(c => c.startsWith('refreshToken='))!
        .split(';')[0];
      const refreshed = await t
        .api()
        .post('/rest/auth/refresh')
        .set('Cookie', refreshCookie);
      expect(refreshed.status).toBe(201);
      expect(refreshed.body.data.user.email).toBe(who.email);
    });

    it('kills the password of a linked account', async () => {
      const { player, token } = await newLink();
      const user = await userOf(player.id);
      await t
        .model('User')
        .updateOne({ _id: user._id }, { password: sha512Legacy('old-secret') });
      const who = profile();
      await signInWith(who, { invitation: token });

      const res = await t
        .api()
        .post('/rest/auth/sign-in')
        .send({ email: who.email, password: 'old-secret' });

      expect(res.status).toBe(401);
    });

    it('does not show the Google email or sub on public routes', async () => {
      const { player, token } = await newLink();
      const who = profile();
      await signInWith(who, { invitation: token });

      const list = await t.api().get('/rest/players');
      const one = await t.api().get(`/rest/players/${player.id}`);

      for (const res of [list, one]) {
        expect(res.status).toBe(200);
        expect(JSON.stringify(res.body)).not.toContain(who.email);
        expect(JSON.stringify(res.body)).not.toContain(who.sub);
      }
    });

    it('works once: the used link is dead', async () => {
      const { token } = await newLink();
      await signInWith(profile(), { invitation: token });

      expect(
        (
          await t
            .api()
            .get('/rest/auth/google/start')
            .query({ invitation: token })
        ).status,
      ).toBe(404);
      expect(
        (await t.api().get(`/rest/auth/invitations/${token}`)).status,
      ).toBe(404);
    });

    it('does not bind with an expired link', async () => {
      const { player, token, id } = await newLink();
      await t
        .model('Invitation')
        .updateOne({ _id: id }, { expiresAt: new Date(Date.now() - 1000) });

      expect(
        (
          await t
            .api()
            .get('/rest/auth/google/start')
            .query({ invitation: token })
        ).status,
      ).toBe(404);
      expect((await userOf(player.id)).googleSub).toBeUndefined();
    });

    it('does not bind with a revoked link', async () => {
      const { token, id } = await newLink();
      const revoked = await t
        .api()
        .delete(`/rest/auth/invitations/${id}`)
        .set('Authorization', bearer(t));

      expect(revoked.status).toBe(200);
      expect(
        (
          await t
            .api()
            .get('/rest/auth/google/start')
            .query({ invitation: token })
        ).status,
      ).toBe(404);
    });

    it('does not bind with a foreign token', async () => {
      expect(
        (
          await t
            .api()
            .get('/rest/auth/google/start')
            .query({ invitation: 'x'.repeat(43) })
        ).status,
      ).toBe(404);
    });

    it('a link that expires between the start and the callback binds nothing', async () => {
      const second = await newLink();
      const flow = t
        .api()
        .get('/rest/auth/google/start')
        .query({ invitation: second.token });
      const started = await flow;
      await t
        .model('Invitation')
        .updateOne(
          { _id: second.id },
          { expiresAt: new Date(Date.now() - 1000) },
        );
      const target = new URL(started.headers.location);
      const now = Math.floor(Date.now() / 1000);
      const who = profile();
      exchange = {
        code: 'auth-code',
        challenge: target.searchParams.get('code_challenge')!,
        idToken: sign({
          iss: 'https://accounts.google.com',
          aud: CLIENT_ID,
          sub: who.sub,
          email: who.email,
          email_verified: true,
          nonce: target.searchParams.get('nonce'),
          iat: now,
          exp: now + 600,
        }),
      };
      const res = await t
        .api()
        .get('/rest/auth/google/callback')
        .query({ code: 'auth-code', state: target.searchParams.get('state')! })
        .set('Cookie', String(started.headers['set-cookie']).split(';')[0]);

      expect(failed(res)).toBe(true);
      expect((await userOf(second.player.id)).googleSub).toBeUndefined();
    });

    it('does not bind one Google account to two players', async () => {
      const first = await newLink();
      const who = profile();
      await signInWith(who, { invitation: first.token });
      const second = await newLink();

      const res = await signInWith(who, { invitation: second.token });

      expect(failed(res)).toBe(true);
      expect((await userOf(second.player.id)).googleSub).toBeUndefined();
      // The link is not burnt by the refusal
      expect(
        (await t.model('Invitation').findById(second.id).lean()).status,
      ).toBe('active');
    });

    it('does not rebind a player who has a Google account to another one', async () => {
      const first = await newLink();
      const owner = profile();
      await signInWith(owner, { invitation: first.token });
      const again = (await invite(first.player.id)).body.data;

      const res = await signInWith(profile(), { invitation: again.token });

      expect(failed(res)).toBe(true);
      expect((await userOf(first.player.id)).googleSub).toBe(owner.sub);
    });

    it('lets the owner of the account in by a new link (a plain sign-in)', async () => {
      const first = await newLink();
      const who = profile();
      await signInWith(who, { invitation: first.token });
      const again = (await invite(first.player.id)).body.data;

      const res = await signInWith(who, { invitation: again.token });

      expect(succeeded(res)).toBe(true);
    });
  });

  describe('sign-in without a link', () => {
    it('lets a linked account in', async () => {
      const { token } = await newLink();
      const who = profile();
      await signInWith(who, { invitation: token });

      const res = await signInWith(who);

      expect(succeeded(res)).toBe(true);
      expect(String(res.headers['set-cookie'])).toContain('refreshToken=');
    });

    it('does not create a user or a player for a new account', async () => {
      const users = await t.model('User').countDocuments();
      const players = await t.model('Player').countDocuments();

      const res = await signInWith(profile());

      expect(failed(res)).toBe(true);
      expect(String(res.headers['set-cookie'] ?? '')).not.toContain(
        'refreshToken',
      );
      expect(await t.model('User').countDocuments()).toBe(users);
      expect(await t.model('Player').countDocuments()).toBe(players);
    });
  });

  describe('checks of the flow', () => {
    it('sends state, nonce and a PKCE challenge to Google', async () => {
      const start = await t.api().get('/rest/auth/google/start');
      const target = new URL(start.headers.location);
      const query = target.searchParams;

      expect(`${target.origin}${target.pathname}`).toBe(
        'https://accounts.google.com/o/oauth2/v2/auth',
      );
      expect(query.get('client_id')).toBe(CLIENT_ID);
      expect(query.get('redirect_uri')).toBe(REDIRECT_URI);
      expect(query.get('response_type')).toBe('code');
      expect(query.get('scope')?.split(' ').sort()).toEqual([
        'email',
        'openid',
        'profile',
      ]);
      expect(query.get('code_challenge_method')).toBe('S256');
      expect(query.get('state')!.length).toBeGreaterThanOrEqual(32);
      expect(query.get('nonce')!.length).toBeGreaterThanOrEqual(32);
      expect(query.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(String(query)).not.toContain(CLIENT_SECRET);
      // Lax, not Strict: the return from Google is a navigation from another site
      expect(String(start.headers['set-cookie'])).toMatch(
        /oauthState=.*HttpOnly.*SameSite=Lax/i,
      );
    });

    async function linkedAttempt(o: Options) {
      const { player, token } = await newLink();
      const res = await signInWith(profile(), { invitation: token, ...o });
      return { res, player };
    }

    it.each([
      ['a state that is not the one of the browser', { state: 'forged-state' }],
      ['a callback without the cookie', { noCookie: true }],
      [
        'an answer of Google with an error',
        { query: { error: 'access_denied', state: 'x' } },
      ],
      ['a wrong PKCE verifier', { verifierBreaks: true }],
      ['a wrong nonce', { claims: { nonce: 'not-ours' } }],
      ['a wrong audience', { claims: { aud: 'another-app' } }],
      ['a wrong issuer', { claims: { iss: 'https://evil.test' } }],
      [
        'an expired ID token',
        { claims: { exp: Math.floor(Date.now() / 1000) - 120 } },
      ],
      [
        'an email that Google did not verify',
        { claims: { email_verified: false } },
      ],
      ['no email', { claims: { email: undefined } }],
      ['a token signed by another key', { key: stranger.privateKey }],
      ['an unknown key id', { header: { alg: 'RS256', kid: 'other' } }],
      ['the algorithm none', { header: { alg: 'none', kid: 'k1' } }],
      ['the algorithm HS256', { header: { alg: 'HS256', kid: 'k1' } }],
    ] as [string, Options][])(
      'refuses %s and binds nothing',
      async (_name, options) => {
        const { res, player } = await linkedAttempt(options);

        expect(failed(res)).toBe(true);
        expect(String(res.headers['set-cookie'] ?? '')).not.toContain(
          'refreshToken=',
        );
        expect((await userOf(player.id)).googleSub).toBeUndefined();
      },
    );

    it('does not let the same state work twice', async () => {
      const { token } = await newLink();
      const start = await t
        .api()
        .get('/rest/auth/google/start')
        .query({ invitation: token });
      const target = new URL(start.headers.location);
      const now = Math.floor(Date.now() / 1000);
      const who = profile();
      exchange = {
        code: 'auth-code',
        challenge: target.searchParams.get('code_challenge')!,
        idToken: sign({
          iss: 'accounts.google.com',
          aud: CLIENT_ID,
          sub: who.sub,
          email: who.email,
          email_verified: true,
          nonce: target.searchParams.get('nonce'),
          iat: now,
          exp: now + 600,
        }),
      };
      const callback = () =>
        t
          .api()
          .get('/rest/auth/google/callback')
          .query({
            code: 'auth-code',
            state: target.searchParams.get('state')!,
          })
          .set('Cookie', String(start.headers['set-cookie']).split(';')[0]);

      expect(succeeded(await callback())).toBe(true); // `accounts.google.com` is a valid issuer too
      expect(failed(await callback())).toBe(true);
    });

    it('does not call Google when the state is wrong', async () => {
      const { token } = await newLink();
      const before = exchanges;

      await signInWith(profile(), { invitation: token, state: 'forged-state' });

      expect(exchanges).toBe(before);
    });
  });

  describe('the list of links for the admin', () => {
    const list = (token = bearer(t)) =>
      t.api().get('/rest/auth/invitations').set('Authorization', token);

    it('is for ADMIN only', async () => {
      expect((await list(`Bearer ${t.moderatorToken}`)).status).toBe(403);
      expect((await list(`Bearer ${t.userToken}`)).status).toBe(403);
      expect((await t.api().get('/rest/auth/invitations')).status).toBe(401);
    });

    it('shows the status of every link and the players who are linked', async () => {
      const active = await newLink();
      const expired = await newLink();
      await t
        .model('Invitation')
        .updateOne(
          { _id: expired.id },
          { expiresAt: new Date(Date.now() - 1000) },
        );
      const revoked = await newLink();
      await t
        .api()
        .delete(`/rest/auth/invitations/${revoked.id}`)
        .set('Authorization', bearer(t));
      const used = await newLink();
      await signInWith(profile(), { invitation: used.token });

      const res = await list();

      expect(res.status).toBe(200);
      const status = (id: string) =>
        res.body.data.items.find((i: { id: string }) => i.id === id)?.status;
      expect(status(active.id)).toBe('active');
      expect(status(expired.id)).toBe('expired');
      expect(status(revoked.id)).toBe('revoked');
      expect(status(used.id)).toBe('used');
      expect(res.body.data.linkedPlayerIds).toContain(used.player.id);
      expect(res.body.data.linkedPlayerIds).not.toContain(active.player.id);
    });

    it('shows the player of a link and never the token, the email or the Google id', async () => {
      const link = await newLink();
      const who = profile();
      const second = await newLink();
      await signInWith(who, { invitation: second.token });

      const res = await list();

      const item = res.body.data.items.find(
        (i: { id: string }) => i.id === link.id,
      );
      expect(item.player).toEqual({
        id: link.player.id,
        nickname: link.player.nickname,
        name: 'Test',
        surname: 'Secret',
      });
      const text = JSON.stringify(res.body);
      expect(text).not.toContain(link.token);
      expect(text).not.toContain(who.email);
      expect(text).not.toContain(who.sub);
      expect(text).not.toContain('tokenHash');
    });
  });

  describe('without the Google settings', () => {
    it('answers 503 on the start', async () => {
      const bare = await createTestApp({
        GOOGLE_CLIENT_ID: '',
        GOOGLE_CLIENT_SECRET: '',
        GOOGLE_REDIRECT_URI: '',
      });
      try {
        expect((await bare.api().get('/rest/auth/google/start')).status).toBe(
          503,
        );
      } finally {
        await bare.close();
      }
    });
  });
});
