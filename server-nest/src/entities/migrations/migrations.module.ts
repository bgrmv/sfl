import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Game, GameSchema } from '../games';
import { FileLoggerService } from 'src/shared/services/logger.service';
import { StatisticsModule } from '../statistics';
import { Player, PlayerSchema } from '../players';
import { User, UserSchema } from '../users';
import { MigrationsController } from './migrations.controller';
import { MigrationsService } from './migrations.service';

@Module({
  imports: [
    StatisticsModule,
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: Player.name,
        schema: PlayerSchema,
      },
      {
        name: Game.name,
        schema: GameSchema,
      },
    ]),
  ],
  controllers: [MigrationsController],
  providers: [MigrationsService, FileLoggerService],
})
export class MigrationsModule {}
