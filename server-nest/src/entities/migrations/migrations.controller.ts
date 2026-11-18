import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiBody,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { ZodValidationPipe } from 'src/shared/pipes/custom-pipe/zod-validation.pipe';
import { z } from 'zod';
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

// Dry run by default: the run writes only with an explicit `apply: true`.
// `.strict()`: a typo in a key is a 400, not a silent dry run
export const RecalculateGamesDTO = z
  .object({ apply: z.boolean().default(false) })
  .strict();
// A request without a body is a valid dry run
export const RecalculateGamesBody = RecalculateGamesDTO.prefault({});

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
  async getPlayersSeasonsTotalPoints(): Promise<Player[]> {
    return await this.migrationsService.convertPlayerUserToUUID();
  }

  // S3.14. Writes only with `apply: true`; ADMIN only by default
  @Post('recalculate-games')
  @ApiBody({
    required: false,
    schema: {
      type: 'object',
      properties: { apply: { type: 'boolean', default: false } },
    },
  })
  @ApiOkResponse({
    description:
      'How many games and players are (would be) changed, the skipped games with the reason and the failed batches',
  })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  async recalculateGames(
    @Body(new ZodValidationPipe(RecalculateGamesBody))
    body: z.output<typeof RecalculateGamesDTO>,
  ) {
    return await this.migrationsService.recalculateGames(body);
  }

  // S8.7. Dry run by default, writes only with `apply: true`; ADMIN only by default
  @Post('revoke-legacy-passwords')
  @ApiBody({
    required: false,
    schema: {
      type: 'object',
      properties: { apply: { type: 'boolean', default: false } },
    },
  })
  @ApiOkResponse({
    description:
      'How many accounts there are, how many still have a SHA-512 hash, how many were revoked',
  })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  async revokeLegacyPasswords(
    @Body(new ZodValidationPipe(RecalculateGamesBody))
    body: z.output<typeof RecalculateGamesDTO>,
  ) {
    return await this.migrationsService.revokeLegacyPasswords(body);
  }
}
