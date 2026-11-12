import { INestApplication } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AuthController } from '../../entities/auth/auth.controller';
import { AuthService } from '../../entities/auth/auth.service';
import { ChartsController } from '../../entities/charts/charts.controller';
import { GamesController } from '../../entities/games/games.controller';
import { MigrationsController } from '../../entities/migrations/migrations.controller';
import { PlayersController } from '../../entities/players/players.controller';
import { RolesController } from '../../entities/roles/roles.controller';
import { TeamsController } from '../../entities/teams/teams.controller';
import { UsersController } from '../../entities/users/users.controller';
import { AuthGuard } from './auth.guard';

type Route = { method: string; path: string };

// Routes that must be reachable without a token. Everything else must answer 401.
const PUBLIC_ROUTES = [
  'POST /rest/auth/sign-in',
  'POST /rest/auth/sign-out',
  'GET /rest/games',
  'GET /rest/games/:id',
  'GET /rest/players',
  'GET /rest/players/:id',
  'GET /rest/players/captains',
  'GET /rest/teams',
  'GET /rest/charts/top-total-points-players',
  'GET /rest/charts/top-ancient-rating-system-players',
];

const ADMIN = { email: 'admin@sfl.lv', roles: ['ADMIN'] };

describe('AuthGuard: access matrix', () => {
  let app: INestApplication;
  let routes: Route[];

  const authService = {
    verifyAccessToken: vi.fn(),
    verifyRefreshToken: vi.fn(),
    getUser: vi.fn(),
    generateAccessToken: vi.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        AuthController,
        ChartsController,
        GamesController,
        MigrationsController,
        PlayersController,
        RolesController,
        TeamsController,
        UsersController,
      ],
      providers: [
        Reflector,
        { provide: AuthService, useValue: authService },
        { provide: APP_GUARD, useClass: AuthGuard },
      ],
    })
      // Services and models are never reached without a token
      .useMocker(() => ({}))
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    // Same setup as main.ts
    app.setGlobalPrefix('rest');
    app.use(cookieParser());
    await app.init();

    routes = app
      .getHttpAdapter()
      .getInstance()
      ._router.stack.filter((layer) => layer.route)
      .flatMap((layer) =>
        Object.keys(layer.route.methods).map((method) => ({
          method: method.toUpperCase(),
          path: layer.route.path,
        })),
      );
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.resetAllMocks();
    authService.verifyAccessToken.mockResolvedValue(null);
    authService.verifyRefreshToken.mockResolvedValue(null);
  });

  const send = ({ method, path }: Route) =>
    request(app.getHttpServer())[method.toLowerCase()](
      path.replace(/:\w+/g, 'x'),
    );

  const key = ({ method, path }: Route) => `${method} ${path}`;

  it('discovers routes of all controllers', () => {
    const keys = routes.map(key);

    expect(keys).toEqual(expect.arrayContaining(PUBLIC_ROUTES));
    expect(keys).toEqual(
      expect.arrayContaining([
        'POST /rest/games',
        'DELETE /rest/players/:id',
        'POST /rest/roles',
        'GET /rest/users',
        'GET /rest/migrations/convert-players-user-to-uuid',
      ]),
    );
  });

  it('answers 401 without a token on every non-public route', async () => {
    const closed = routes.filter((route) => !PUBLIC_ROUTES.includes(key(route)));
    expect(closed.length).toBeGreaterThan(0);

    for (const route of closed) {
      const res = await send(route);
      expect({ route: key(route), status: res.status }).toEqual({
        route: key(route),
        status: 401,
      });
    }
  });

  it('answers 401 with an invalid token', async () => {
    const res = await request(app.getHttpServer())
      .post('/rest/games')
      .set('Authorization', 'Bearer invalid');

    expect(res.status).toBe(401);
  });

  it('lets public routes through without a token', async () => {
    const open = routes.filter((route) => PUBLIC_ROUTES.includes(key(route)));
    expect(open).toHaveLength(PUBLIC_ROUTES.length);

    for (const route of open) {
      const res = await send(route);
      expect({ route: key(route), status: res.status }).not.toEqual({
        route: key(route),
        status: 401,
      });
    }
  });

  it('lets a request with a valid access token through', async () => {
    authService.verifyAccessToken.mockResolvedValue(ADMIN);

    const res = await request(app.getHttpServer())
      .get('/rest/auth/whoami')
      .set('Authorization', 'Bearer valid');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(ADMIN);
  });

  it('lets a request with a valid refresh cookie through', async () => {
    authService.verifyRefreshToken.mockResolvedValue(ADMIN);
    authService.getUser.mockResolvedValue(ADMIN);
    authService.generateAccessToken.mockResolvedValue('new-access-token');

    const res = await request(app.getHttpServer())
      .get('/rest/auth/whoami')
      .set('Authorization', 'Bearer expired')
      .set('Cookie', 'refreshToken=valid');

    expect(res.status).toBe(200);
    expect(authService.generateAccessToken).toHaveBeenCalledWith(ADMIN);
  });
});
