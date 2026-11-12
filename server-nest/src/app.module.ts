import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
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
import { AuthGuard } from './shared/guards/auth.guard';
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
        const mongodb = `${configService.getOrThrow<string>('DATABASE_URL')}/${configService.getOrThrow<string>('DATABASE_DB')}`;

        console.log('Connecting to the database:\n', mongodb);

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
    // Every route requires a token unless it is marked with @Public()
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ContextInterceptor,
    },
    UsersService,
    FileLoggerService,
  ],
  exports: [FileLoggerService],
})
export class AppModule {}
