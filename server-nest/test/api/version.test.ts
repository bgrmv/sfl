import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createTestApp, TestApp } from '../helpers/test-app';

// S10.51 / ADR 0022: the version of the product is public and comes from the root package.json.
const rootVersion = JSON.parse(
  readFileSync(join(__dirname, '../../../package.json'), 'utf8'),
).version;

describe('API: GET /version', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it('answers without a token with the version of the root package.json', async () => {
    const res = await t.api().get('/rest/version');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, data: { version: rootVersion } });
  });
});

describe('API: GET /version with APP_VERSION', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp({ APP_VERSION: '1.4.0' });
  });
  afterAll(() => t.close());

  it('takes the version from the environment: an image has no root package.json', async () => {
    const res = await t.api().get('/rest/version');

    expect(res.body.data).toEqual({ version: '1.4.0' });
  });
});
