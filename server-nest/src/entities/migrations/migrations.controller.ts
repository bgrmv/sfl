import { Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { Player } from '../players';
import { MigrationsService } from './migrations.service';

export class PlayerCreationDTO {
  @ApiProperty({ required: true, type: String })
  nickname: string;
  number: number;

  @ApiProperty({ required: true })
  user: {
    email: string;
    name?: string;
    surname?: string;
  };
}

@ApiTags('migrations')
@Controller('migrations')
export class MigrationsController {
  constructor(private readonly migrationsService: MigrationsService) {}

  @ApiOkResponse({ type: Array })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiInternalServerErrorResponse({
    description: 'Internal Server Error',
  })
  // Changes data, so it is a POST (ADMIN only by default)
  @Post('convert-players-user-to-uuid')
  async getPlayersSeasonsTotalPoints(): Promise<TResponse<Player[]>> {
    return {
      data: await this.migrationsService.convertPlayerUserToUUID(),
    };
  }
}
