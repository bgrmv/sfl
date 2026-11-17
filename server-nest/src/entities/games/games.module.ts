import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { FileLoggerService } from 'src/shared/services/logger.service';
import { StatisticsModule } from '../statistics';
import { User, UserSchema } from '../users/users.schema';
import { Game, GameSchema } from './game.schema';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';

@Module({
  imports: [
    StatisticsModule,
    MongooseModule.forFeature([
      { name: Game.name, schema: GameSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [GamesController],
  providers: [GamesService, FileLoggerService],
})
export class GamesModule {}
