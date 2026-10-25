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
  ParseIntPipe,
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
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ClientPlayer } from '.';
import { Public } from '../../shared/decorators/public.decorator';
import { FileLoggerService } from '../../shared/services/logger.service';
import { UsersService } from '../users/users.service';
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
  async findById(@Param('id') id: string) {
    if (!id.trim()) {
      throw new BadRequestException('Id is empty');
    }

    try {
      const player = await this.playersService.findById(id);
      if (!player) {
        throw new NotFoundException('Player is not found');
      }
      return player;
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
    @Res() res,
    @Query('ids') ids?: string,
    @Query('includeMetadata', ParseBoolPipe) includeMetadata?: boolean,
  ) {
    this.logger.info('Find players', { ids, includeMetadata });
    // If `ids` is provided as a comma-separated string, split it into an array
    const idsArray = Array.isArray(ids)
      ? ids
      : ids?.split(',').map((id) => new Types.ObjectId(id.trim()));

    return res.json(
      Array.from(
        await this.playersService.find(
          {
            ids: idsArray,
          },
          includeMetadata,
        ),
      ),
    );
  }

  @Public()
  @Get('captains')
  async findCaptains(@Res() res: Response) {
    const captains = await this.playersService.findCaptains();
    return res.json(captains);
  }

  // TODO add bot validation
  @Patch(':id')
  async update(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
    @Body() body: ClientPlayer,
  ) {
    const { user: userBody, ...playerBody } = body;

    const updatedUser = await this.usersService.patch(userBody.id, userBody);
    const updatedPlayer = await this.playersService.patch(
      req.params.id,
      playerBody,
    );

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
      players.map(async (player) => {
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
    ).catch((e) => {
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

  // Not public: it changes data. Moves to POST in S0.4
  @Get('recalculate/season')
  @ApiQuery({ name: 'seasonId', required: true, type: Number })
  @ApiQuery({ name: 'playerIds', required: true, type: Array, isArray: true })
  @ApiOkResponse({ type: Player, status: 200 })
  @ApiBadRequestResponse({
    status: 400,
    description: 'Bad request response with no content',
  })
  async recalculateSeason(
    @Query('seasonId', ParseIntPipe) seasonId: number,
    @Query('playerIds') playerIds: string[],
  ) {
    this.logger.info('Recalculate player season and career', {
      seasonId,
      playerIds,
    });

    return await this.playersService.recalculatePlayersSeasonAndCareerMetadata(
      seasonId,
      playerIds,
    );
  }
}
