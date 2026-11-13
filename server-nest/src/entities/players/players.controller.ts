import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
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
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiProperty,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ValibotValidationPipe } from 'src/shared/pipes/custom-pipe/valibot-validation.pipe';
import {
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

@ApiTags('player')
@Controller('players')
export class PlayersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly playersService: PlayersService,
    private readonly logger: FileLoggerService,
  ) {}

  @ApiOkResponse({ status: 200, type: Player })
  @ApiBadRequestResponse({ status: 400, description: 'Bad Request' })
  @ApiInternalServerErrorResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  @Public()
  @Get(':id')
  async findById(@Req() req: Request, @Param('id') id: string) {
    if (!id.trim()) {
      throw new BadRequestException('Id is empty');
    }

    try {
      const player = await this.playersService.findById(id);
      if (!player) {
        throw new NotFoundException('Player is not found');
      }
      return presentPlayer(player, isAdmin(req));
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Unexpected error occurred',
      );
    }
  }

  @Public()
  @Get()
  @ApiQuery({
    name: 'includeMetadata',
    type: Boolean,
    required: false,
  })
  @ApiQuery({ name: 'ids', required: false, type: String, isArray: true })
  @ApiOkResponse({ status: 200, type: () => [Player] })
  async find(
    @Req() req: Request,
    @Res() res,
    @Query('ids') ids?: string,
    @Query('includeMetadata', ParseBoolPipe) includeMetadata?: boolean,
  ) {
    this.logger.info('Find players', { ids, includeMetadata });
    // If `ids` is provided as a comma-separated string, split it into an array
    const idsArray = Array.isArray(ids)
      ? ids
      : ids?.split(',').map(id => new Types.ObjectId(id.trim()));

    const admin = isAdmin(req);
    const players = await this.playersService.find(
      { ids: idsArray },
      includeMetadata,
    );

    return res.json(players.map(player => presentPlayer(player, admin)));
  }

  @Public()
  @Get('captains')
  async findCaptains(@Req() req: Request, @Res() res: Response) {
    const admin = isAdmin(req);
    const captains = await this.playersService.findCaptains();
    return res.json(captains.map(captain => presentPlayer(captain, admin)));
  }

  @Patch(':id')
  @ApiBadRequestResponse({ status: 400, description: 'Invalid body or id' })
  async update(
    @Res() res: Response,
    @Param('id') id: string,
    @Body(new ValibotValidationPipe(UpdatePlayerDTO))
    { user: userBody, ...playerBody }: UpdatePlayerDTOOutput,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid player id');
    }

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
  @ApiResponse({ type: String, status: 400, schema: { example: 'error' } })
  // @UsePipes(new ValibotValidationPipe(UpdateTestUsersDto))
  async create(
    @Body() players: PlayerCreationDTO[],
    @Res() res: Response,
  ): Promise<any> {
    // TODO all settled
    const createdPlayers = await Promise.all(
      players.map(async player => {
        const { user: userBody, ...playerBody } = player;

        const user = await this.usersService.createUser({
          name: userBody.name,
          surname: userBody.surname,
          email: userBody.email,
          roles: ['658ddee2f71a72e6d8ea95f8'], // TODO, check is USER ROLE,
        });

        return await this.playersService.create({
          ...playerBody,
          userId: user.id,
        });
      }),
    ).catch(e => {
      this.logger.error('Failed to create player', { error: e });
      return new InternalServerErrorException('Unexpected error occurred');
    });

    return res.json(createdPlayers);
  }

  @Delete(':id')
  @ApiOkResponse({ type: Player, status: 200 })
  @ApiBadRequestResponse({
    status: 400,
    description: 'Bad request response with no content',
  })
  async delete(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
  ) {
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
  @ApiOkResponse({ status: 200, description: 'Recalculation is finished' })
  @ApiBadRequestResponse({
    status: 400,
    description: 'Invalid body',
  })
  @ApiInternalServerErrorResponse({
    description: 'Recalculation failed for some players (see `failed`)',
  })
  async recalculateSeason(
    @Body(new ValibotValidationPipe(RecalculateSeasonDTO))
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
