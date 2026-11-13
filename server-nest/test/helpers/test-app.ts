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

export interface TestApp {
  app: INestApplication;
  mongo: MongoMemoryServer;
  /** Access token of a user who signed in through POST /rest/auth/sign-in. */
  token: string;
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

  // An admin user, so that the sign-in goes through the real code path
  const role = await model('Role').create({ name: 'ADMIN' });
  await model('User').create({
    email: ADMIN_EMAIL,
    name: 'Admin',
    password: hash(ADMIN_PASSWORD),
    roles: [role._id],
  });

  const signIn = await request(app.getHttpServer())
    .post('/rest/auth/sign-in')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

  return {
    app,
    mongo,
    token: signIn.body.accessToken,
    model,
    api: () => request(app.getHttpServer()),
    close: async () => {
      await app.close();
      await mongo.stop();
    },
  };
}
