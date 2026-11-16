import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { FileLoggerService } from 'src/shared/services/logger.service';
import { StatisticsModule } from '../statistics';
import { Game, GameSchema } from './game.schema';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';

@Module({
  imports: [
    StatisticsModule,
    MongooseModule.forFeature([{ name: Game.name, schema: GameSchema }]),
  ],
  controllers: [GamesController],
  providers: [GamesService, FileLoggerService],
})
export class GamesModule {}
