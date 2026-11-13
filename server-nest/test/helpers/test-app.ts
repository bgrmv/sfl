import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model } from 'mongoose';
import request from 'supertest';

import { hash } from '../../src/shared/utils/string';

export const ADMIN_EMAIL = 'admin@sfl.test';
export const ADMIN_PASSWORD = 'admin-password';
export const USER_EMAIL = 'user@sfl.test';
export const USER_PASSWORD = 'user-password';

export interface TestApp {
  app: INestApplication;
  mongo: MongoMemoryServer;
  /** Access token of a user who signed in through POST /rest/auth/sign-in. */
  token: string;
  /** Access token of a plain USER (no admin rights). */
  userToken: string;
  /** Raw Mongoose models, to seed and inspect the database directly. */
  model: <T = any>(name: string) => Model<T>;
  api: () => ReturnType<typeof request>;
  close: () => Promise<void>;
}

/**
 * The real AppModule on an in-memory MongoDB: nothing external is needed.
 * Mirrors main.ts (prefix, cookies) but skips HTTPS, Swagger and CORS.
 */
export async function createTestApp(): Promise<TestApp> {
  const mongo = await MongoMemoryServer.create();

  Object.assign(process.env, {
    STAGE: 'test',
    DATABASE_URL: mongo.getUri().replace(/\/$/, ''),
    DATABASE_DB: 'sfl-test',
    PORT: '0',
    CLIENT_HOSTNAME: 'http://localhost',
    CLIENT_PORT: '4200',
    ACCESS_TOKEN_SECRET: 'test-access-secret',
    REFRESH_TOKEN_SECRET: 'test-refresh-secret',
  });

  // Config is read from process.env at import time of the module graph
  const { AppModule } = await import('../../src/app.module');

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.useLogger(false);
  app.setGlobalPrefix('rest');
  app.use(cookieParser());
  await app.init();

  const model = <T = any>(name: string) =>
    app.get<Model<T>>(getModelToken(name), { strict: false });

  // An admin and a plain user, so that sign-in goes through the real code path
  const roles = await model('Role').create([
    { name: 'ADMIN' },
    { name: 'USER' },
  ]);
  await model('User').create([
    {
      email: ADMIN_EMAIL,
      name: 'Admin',
      password: hash(ADMIN_PASSWORD),
      roles: [roles[0]._id],
    },
    {
      email: USER_EMAIL,
      name: 'User',
      password: hash(USER_PASSWORD),
      roles: [roles[1]._id],
    },
  ]);

  const signIn = async (email: string, password: string) =>
    (
      await request(app.getHttpServer())
        .post('/rest/auth/sign-in')
        .send({ email, password })
    ).body.accessToken as string;

  return {
    app,
    mongo,
    token: await signIn(ADMIN_EMAIL, ADMIN_PASSWORD),
    userToken: await signIn(USER_EMAIL, USER_PASSWORD),
    model,
    api: () => request(app.getHttpServer()),
    close: async () => {
      await app.close();
      await mongo.stop();
    },
  };
}
