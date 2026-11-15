import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ADMIN_EMAIL, createTestApp, TestApp } from '../helpers/test-app';

// S8.11: rate limits, security headers, no Swagger in production.
// createTestApp signs in twice itself (admin and user, from the local address).

const signIn = (t: TestApp, ip: string, email: string, password = 'wrong') =>
  t
    .api()
    .post('/rest/auth/sign-in')
    .set('X-Forwarded-For', ip)
    .send({ email, password });

describe('sign-in rate limit', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp({ SIGN_IN_LIMIT: '5', SIGN_IN_WINDOW_SEC: '60' });
    // Behind the proxy the address comes from X-Forwarded-For, as in production
    t.app.getHttpAdapter().getInstance().set('trust proxy', true);
  });
  afterAll(() => t.close());

  it('answers 429 on the 6th attempt from one address', async () => {
    const statuses: number[] = [];
    for (let i = 1; i <= 6; i++) {
      statuses.push((await signIn(t, '10.0.0.1', `guess${i}@sfl.test`)).status);
    }

    expect(statuses).toEqual([401, 401, 401, 401, 401, 429]);
  });

  it('the 429 has the shape of the API and says when to retry', async () => {
    const res = await signIn(t, '10.0.0.1', 'guess7@sfl.test');

    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({
      ok: false,
      error: { status: 429, code: 'TOO_MANY_REQUESTS' },
    });
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('answers 429 on the 6th attempt at one account from different addresses', async () => {
    const statuses: number[] = [];
    for (let i = 1; i <= 6; i++) {
      statuses.push((await signIn(t, `10.0.1.${i}`, 'Victim@sfl.test')).status);
    }

    expect(statuses).toEqual([401, 401, 401, 401, 401, 429]);
  });

  it('counts the e-mail without regard to the case', async () => {
    expect((await signIn(t, '10.0.1.99', 'victim@SFL.test')).status).toBe(429);
  });

  it('does not block another address and another account', async () => {
    const res = await signIn(t, '10.0.2.1', ADMIN_EMAIL, 'admin-password');

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
  });
});

describe('soft limit of the whole API', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp({ API_LIMIT: '10', API_WINDOW_SEC: '60' });
    t.app.getHttpAdapter().getInstance().set('trust proxy', true);
  });
  afterAll(() => t.close());

  it('lets 10 requests through and answers 429 on the 11th', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      statuses.push(
        (await t.api().get('/rest/teams').set('X-Forwarded-For', '10.0.3.1'))
          .status,
      );
    }

    expect(statuses.slice(0, 10).every(status => status === 200)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});

describe('headers and Swagger', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it('sends security headers and does not tell that it is Express', async () => {
    const res = await t.api().get('/rest/teams');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('leaves HSTS and CSP to the proxy', async () => {
    const res = await t.api().get('/rest/teams');

    expect(res.headers['strict-transport-security']).toBeUndefined();
    expect(res.headers['content-security-policy']).toBeUndefined();
  });

  it('has no Swagger in production: GET /rest answers 404', async () => {
    expect((await t.api().get('/rest')).status).toBe(404);
    expect((await t.api().get('/rest-json')).status).toBe(404);
  });
});
