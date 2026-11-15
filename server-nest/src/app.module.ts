import { ExecutionContext, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { join } from 'node:path';
import configuration from './config/configuration';
import { AuthModule } from './entities/auth';
import { ChartsModule } from './entities/charts/charts.module';
import { GamesModule } from './entities/games/games.module';
import { MigrationsModule } from './entities/migrations/migrations.module';
import { PlayersModule } from './entities/players/players.module';
import { RolesModule } from './entities/roles/roles.module';
import { TeamsModule } from './entities/teams/teams.module';
import { User, UserSchema, UsersModule } from './entities/users';
import { UsersService } from './entities/users/users.service';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';
import { AuthGuard } from './shared/guards/auth.guard';
import { RolesGuard } from './shared/guards/roles.guard';
import { describeDatabaseTarget } from './shared/utils/database-target';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import { AppThrottlerGuard } from './shared/guards/throttler.guard';
import { ContextInterceptor } from './shared/interceptors/context/context.interceptor';
import { FileLoggerService } from './shared/services/logger.service';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    ConfigModule.forRoot({
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const url = configService.getOrThrow<string>('DATABASE_URL');
        const dbName = configService.getOrThrow<string>('DATABASE_DB');
        const mongodb = `${url}/${dbName}`;

        // Host only: the URL itself may contain the user name and password
        new Logger('Database').log(
          `Connecting to the database: ${describeDatabaseTarget(url, dbName)}`,
        );

        return {
          uri: mongodb,
        };
      },
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
    JwtModule.register({
      // TODO: add secrets 100%
      // TODO: add public & private keys (why, optional)
      global: true,
      signOptions: {
        algorithm: 'HS512',
      },
    }),
    // Rate limits (S8.11): a soft one for the whole API and two strict ones for
    // sign-in, counted per IP and per e-mail (a distributed guess of one account)
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isSignIn = (context: ExecutionContext) => {
          const { method, path } = context.switchToHttp().getRequest();
          return method === 'POST' && path.endsWith('/auth/sign-in');
        };
        const email = (req: Record<string, any>) =>
          String(req.body?.email ?? req.ip)
            .trim()
            .toLowerCase();
        const signIn = {
          limit: config.getOrThrow<number>('SIGN_IN_LIMIT'),
          ttl: seconds(config.getOrThrow<number>('SIGN_IN_WINDOW_SEC')),
          skipIf: (context: ExecutionContext) => !isSignIn(context),
        };

        return {
          throttlers: [
            {
              name: 'api',
              limit: config.getOrThrow<number>('API_LIMIT'),
              ttl: seconds(config.getOrThrow<number>('API_WINDOW_SEC')),
            },
            { ...signIn, name: 'sign-in-ip' },
            { ...signIn, name: 'sign-in-email', getTracker: email },
          ],
        };
      },
    }),
    AuthModule,
    RolesModule,
    UsersModule,
    PlayersModule,
    GamesModule,
    TeamsModule,
    ChartsModule,
    MigrationsModule,
  ],
  providers: [
    // First of all: a flood is rejected before anything else runs
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
    // Every route requires a token unless it is marked with @Public()
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    // Then roles: ADMIN unless a route says otherwise with @Roles() (S8.9)
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ContextInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    UsersService,
    FileLoggerService,
  ],
  exports: [FileLoggerService],
})
export class AppModule {}
