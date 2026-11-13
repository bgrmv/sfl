import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseBoolPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProperty,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ZodValidationPipe } from 'src/shared/pipes/custom-pipe/zod-validation.pipe';
import {
  CreatePlayersDTO,
  CreatePlayersDTOOutput,
  RecalculateSeasonDTO,
  RecalculateSeasonDTOOutput,
  UpdatePlayerDTO,
  UpdatePlayerDTOOutput,
} from './players.dto';
import { Public } from '../../shared/decorators/public.decorator';
import { FileLoggerService } from '../../shared/services/logger.service';
import { UsersService } from '../users/users.service';
import { isAdmin, presentPlayer } from './utils/present-player';
import { Player } from './players.schema';
import { PlayersService } from './players.service';

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

// TODO: look the USER role up by name instead of a fixed id
const USER_ROLE_ID = '658ddee2f71a72e6d8ea95f8';

function assertObjectId(id: string, name = 'id'): void {
  if (!Types.ObjectId.isValid(id) || id.length !== 24) {
    throw new BadRequestException(`Invalid ${name}`);
  }
}

@ApiTags('player')
@Controller('players')
export class PlayersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly playersService: PlayersService,
    private readonly logger: FileLoggerService,
  ) {}

  @Public()
  @Get()
  @ApiQuery({
    name: 'includeMetadata',
    type: Boolean,
    required: false,
  })
  @ApiQuery({ name: 'ids', required: false, type: String, isArray: true })
  @ApiOkResponse({ type: () => [Player] })
  @ApiBadRequestResponse({ description: 'Invalid ids' })
  async find(
    @Req() req: Request,
    @Res() res,
    @Query('ids') ids?: string | string[],
    @Query('includeMetadata', new ParseBoolPipe({ optional: true }))
    includeMetadata = false,
  ) {
    this.logger.info('Find players', { ids, includeMetadata });

    // `ids` is a comma-separated string or a repeated parameter
    const idsList = (Array.isArray(ids) ? ids : (ids ?? '').split(','))
      .map(id => id.trim())
      .filter(Boolean);
    idsList.forEach(id => assertObjectId(id, 'ids'));

    const admin = isAdmin(req);
    const players = await this.playersService.find(
      {
        ids:
          ids === undefined
            ? undefined
            : idsList.map(id => new Types.ObjectId(id)),
      },
      includeMetadata,
    );

    return res.json(players.map(player => presentPlayer(player, admin)));
  }

  // Declared before ':id', otherwise 'captains' is taken for an id
  @Public()
  @Get('captains')
  async findCaptains(@Req() req: Request, @Res() res: Response) {
    const admin = isAdmin(req);
    const captains = await this.playersService.findCaptains();
    return res.json(captains.map(captain => presentPlayer(captain, admin)));
  }

  @ApiOkResponse({ type: Player })
  @ApiBadRequestResponse({ description: 'Invalid id' })
  @ApiNotFoundResponse({ description: 'Player is not found' })
  @Public()
  @Get(':id')
  async findById(@Req() req: Request, @Param('id') id: string) {
    assertObjectId(id);

    return presentPlayer(await this.playersService.findById(id), isAdmin(req));
  }

  @Patch(':id')
  @ApiBadRequestResponse({ description: 'Invalid body or id' })
  @ApiNotFoundResponse({ description: 'Player is not found' })
  async update(
    @Res() res: Response,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePlayerDTO))
    { user: userBody, ...playerBody }: UpdatePlayerDTOOutput,
  ) {
    assertObjectId(id);

    // The user comes from the player, so the body cannot point to someone else
    const userId = await this.playersService.findUserId(id);
    if (!userId) {
      throw new NotFoundException('Player is not found');
    }

    if (userBody && Object.keys(userBody).length) {
      await this.usersService.patch(userId, userBody);
    }
    const updatedPlayer = await this.playersService.patch(id, playerBody);

    return res.json(updatedPlayer);
  }

  @Post()
  @ApiBody({
    type: PlayerCreationDTO,
    required: true,
    isArray: true,
  })
  @ApiResponse({ type: Player, isArray: true, status: 200 })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiConflictResponse({ description: 'The email is already taken' })
  async create(
    @Body(new ZodValidationPipe(CreatePlayersDTO))
    players: CreatePlayersDTOOutput,
    @Res() res: Response,
  ) {
    // All or nothing: a failure rolls back and answers with an error status
    const created = await this.playersService.createWithUsers(players, [
      USER_ROLE_ID,
    ]);

    return res.json(created);
  }

  @Delete(':id')
  @ApiOkResponse({ type: Player })
  @ApiBadRequestResponse({ description: 'Invalid id' })
  @ApiNotFoundResponse({ description: 'Player is not found' })
  @ApiConflictResponse({ description: 'The player has games' })
  async delete(@Res() res: Response, @Param('id') id: string) {
    assertObjectId(id);

    return res.json(await this.playersService.delete(id));
  }

  // Not public: the global AuthGuard requires a token (S0.1)
  @Post('recalculate/season')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['seasonId', 'playerIds'],
      properties: {
        seasonId: { type: 'integer' },
        playerIds: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiOkResponse({ description: 'Recalculation is finished' })
  @ApiBadRequestResponse({
    description: 'Invalid body',
  })
  @ApiInternalServerErrorResponse({
    description: 'Recalculation failed for some players (see `failed`)',
  })
  async recalculateSeason(
    @Body(new ZodValidationPipe(RecalculateSeasonDTO))
    { seasonId, playerIds }: RecalculateSeasonDTOOutput,
  ) {
    this.logger.info('Recalculate player season and career', {
      seasonId,
      playerIds,
    });

    await this.playersService.recalculatePlayersSeasonAndCareerMetadata(
      seasonId,
      playerIds,
    );

    return { success: 'OK', seasonId, playerIds };
  }
}
