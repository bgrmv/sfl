import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { Model } from 'mongoose';
import request from 'supertest';

import { configureApp } from '../../src/app.setup';
import { sha512Legacy } from '../../src/shared/utils/string';

export const ADMIN_EMAIL = 'admin@sfl.test';
export const ADMIN_PASSWORD = 'admin-password';
export const MODERATOR_EMAIL = 'moderator@sfl.test';
export const MODERATOR_PASSWORD = 'moderator-password';
export const USER_EMAIL = 'user@sfl.test';
export const USER_PASSWORD = 'user-password';
export const TEST_ACCESS_SECRET = 'test-access-secret-at-least-32-characters';
export const TEST_REFRESH_SECRET = 'test-refresh-secret-at-least-32-characters';

export interface TestApp {
  app: INestApplication;
  mongo: MongoMemoryReplSet;
  /** Access token of a user who signed in through POST /rest/auth/sign-in. */
  token: string;
  /** Access token of a MODERATOR: confirms games, changes nothing else. */
  moderatorToken: string;
  /** Access token of a plain USER (no admin rights). */
  userToken: string;
  /** Raw Mongoose models, to seed and inspect the database directly. */
  model: <T = any>(name: string) => Model<T>;
  api: () => ReturnType<typeof request>;
  close: () => Promise<void>;
}

/**
 * The real AppModule on an in-memory MongoDB: nothing external is needed.
 * Shares `configureApp` with main.ts but skips HTTPS, Swagger and CORS.
 */
export async function createTestApp(
  env: Record<string, string> = {},
): Promise<TestApp> {
  // A one-node replica set, as in dev and prod (ADR 0014): transactions need it.
  // A small cache: the default one is half of the memory of the machine, per mongod
  const mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    instanceOpts: [{ args: ['--wiredTigerCacheSizeGB', '0.25'] }],
  });

  Object.assign(process.env, {
    STAGE: 'test',
    DATABASE_URL: mongo.getUri(),
    DATABASE_DB: 'sfl-test',
    PORT: '0',
    CLIENT_HOSTNAME: 'http://localhost',
    CLIENT_PORT: '4200',
    ACCESS_TOKEN_SECRET: TEST_ACCESS_SECRET,
    REFRESH_TOKEN_SECRET: TEST_REFRESH_SECRET,
    // The limits stay out of the way of the tests; a test of the limit lowers them
    SIGN_IN_LIMIT: '1000',
    API_LIMIT: '100000',
    COMMENT_LIMIT: '100000',
    ...env,
  });

  // Config is read from process.env at import time of the module graph
  const { AppModule } = await import('../../src/app.module');

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.useLogger(false);
  configureApp(app, { production: true }); // no Swagger: faster, and what runs in prod
  await app.init();

  const model = <T = any>(name: string) =>
    app.get<Model<T>>(getModelToken(name), { strict: false });

  // An admin and a plain user, so that sign-in goes through the real code path
  // The development admin seeder may have created ADMIN already: upsert
  const roles = [];
  for (const name of ['ADMIN', 'USER', 'MODERATOR']) {
    roles.push(
      await model('Role').findOneAndUpdate(
        { name },
        { name },
        { upsert: true, returnDocument: 'after' },
      ),
    );
  }
  await model('User').create([
    {
      email: ADMIN_EMAIL,
      name: 'Admin',
      password: sha512Legacy(ADMIN_PASSWORD),
      roles: [roles[0]._id],
    },
    {
      email: USER_EMAIL,
      name: 'User',
      password: sha512Legacy(USER_PASSWORD),
      roles: [roles[1]._id],
    },
    {
      email: MODERATOR_EMAIL,
      name: 'Moderator',
      password: sha512Legacy(MODERATOR_PASSWORD),
      roles: [roles[2]._id],
    },
  ]);

  const signIn = async (email: string, password: string) =>
    (
      await request(app.getHttpServer())
        .post('/rest/auth/sign-in')
        .send({ email, password })
    ).body.data.accessToken as string;

  return {
    app,
    mongo,
    token: await signIn(ADMIN_EMAIL, ADMIN_PASSWORD),
    moderatorToken: await signIn(MODERATOR_EMAIL, MODERATOR_PASSWORD),
    userToken: await signIn(USER_EMAIL, USER_PASSWORD),
    model,
    api: () => request(app.getHttpServer()),
    close: async () => {
      await app.close();
      await mongo.stop();
    },
  };
}
