import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { configureApp } from '../../src/app.setup';

import { createTestApp, TestApp } from '../helpers/test-app';

// Nest serves the Angular build next to the API (S7.1): a client route gets index.html,
// an unknown API route must still be a JSON 404, never the page of the SPA.

const INDEX = join(__dirname, '../../public/index.html');
const MARKER = '<!doctype html><title>sfl-test-spa</title>';

describe('SPA static files', { timeout: 30_000 }, () => {
  let t: TestApp;
  let app: INestApplication;
  let created = false;

  beforeAll(async () => {
    // public/ holds the client build only in the image; the test brings its own index.html
    if (!existsSync(INDEX)) {
      writeFileSync(INDEX, MARKER);
      created = true;
    }
    // createTestApp sets the env and starts mongod. Its testing module has no HTTP adapter
    // while the providers are built, and ServeStaticModule turns into a no-op there: the
    // app that serves files is created as main.ts does it.
    t = await createTestApp();
    await t.app.close();
    const { AppModule } = await import('../../src/app.module');
    app = await NestFactory.create(AppModule, { logger: false });
    configureApp(app, { production: true });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await t.close();
    if (created) rmSync(INDEX);
  });

  it('answers an unknown /rest route with a JSON 404, not with index.html', async () => {
    const res = await request(app.getHttpServer()).get('/rest/no-such-route');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toMatchObject({ ok: false, error: { status: 404 } });
  });

  it('answers a client route with index.html', async () => {
    const res = await request(app.getHttpServer()).get('/players/1');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });
});
