import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FileLoggerService } from 'src/shared/services/logger.service';
import { Game, GameSchema } from '../games/game.schema';
import { Player, PlayerSchema } from '../players/players.schema';
import { PlayerMetadataService } from './player-metadata.service';
import { TransactionService } from './transaction.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Player.name, schema: PlayerSchema },
      { name: Game.name, schema: GameSchema },
    ]),
  ],
  providers: [PlayerMetadataService, TransactionService, FileLoggerService],
  exports: [PlayerMetadataService, TransactionService],
})
export class StatisticsModule {}
