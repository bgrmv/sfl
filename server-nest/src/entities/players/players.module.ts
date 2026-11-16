import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FileLoggerService } from 'src/shared/services/logger.service';
import { Game, GameSchema } from '../games';
import { StatisticsModule } from '../statistics';
import { User, UserSchema } from '../users';
import { UsersService } from '../users/users.service';
import { PlayersController } from './players.controller';
import { Player, PlayerSchema } from './players.schema';
import { PlayersService } from './players.service';

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
  controllers: [PlayersController],
  providers: [UsersService, PlayersService, FileLoggerService],
})
export class PlayersModule {}
