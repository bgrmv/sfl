import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UsePipes,
} from '@nestjs/common';
import {
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { openApiRef } from '@sfl/schemas';
import { Public } from 'src/shared/decorators/public.decorator';
import { ZodValidationPipe } from 'src/shared/pipes/custom-pipe/zod-validation.pipe';
import { SaveGameDTO, UpdateGameDTO } from './game.dto';
import { IGame } from './game.schema';
import {
  DEFAULT_GAMES_LIMIT,
  GamesService,
  MAX_GAMES_LIMIT,
} from './games.service';

@ApiTags('games')
@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Public()
  @Get()
  @ApiQuery({
    name: 'number',
    type: Number,
    required: false,
  })
  @ApiQuery({
    name: 'season',
    type: Number,
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: `The newest first: 1 to ${MAX_GAMES_LIMIT}, ${DEFAULT_GAMES_LIMIT} when no season is given`,
  })
  @ApiQuery({ name: 'offset', type: Number, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get all games records',
  })
  async find(
    @Query('number', new ParseIntPipe({ optional: true }))
    number?: number | undefined,
    @Query('season', new ParseIntPipe({ optional: true }))
    season?: number | undefined,
    @Query('limit', new ParseIntPipe({ optional: true }))
    limit?: number | undefined,
    @Query('offset', new ParseIntPipe({ optional: true }))
    offset?: number | undefined,
  ) {
    if (
      (limit !== undefined && (limit < 1 || limit > MAX_GAMES_LIMIT)) ||
      (offset !== undefined && offset < 0)
    ) {
      throw new BadRequestException(
        `limit is from 1 to ${MAX_GAMES_LIMIT}, offset is not negative`,
      );
    }

    return await this.gamesService.find(
      {
        ...(number ? { number } : null),
        ...(season ? { season } : null),
      },
      { limit, offset },
    );
  }

  @Public()
  @Get(':id')
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get one game by id',
  })
  async findById(
    @Param('id')
    id: string,
  ) {
    return await this.gamesService.findById(id);
  }

  @Post()
  @ApiBody({ schema: openApiRef('GameInput') })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The record has been successfully created.',
  })
  @UsePipes(new ZodValidationPipe(SaveGameDTO))
  async save(@Body() game: IGame) {
    return await this.gamesService.create(game);
  }

  @Patch(':id')
  @ApiBody({ schema: openApiRef('GameUpdateInput') })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The record has been partially updated',
  })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateGameDTO)) game: IGame,
  ) {
    return await this.gamesService.update(id, game);
  }

  @Put(':id')
  @ApiBody({ schema: openApiRef('GameInput') })
  @ApiResponse({
    status: 200,
    description: 'The record has been successfully replaced',
  })
  async replace(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SaveGameDTO)) game: IGame,
  ) {
    return await this.gamesService.replace(id, game);
  }

  @Delete(':id')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The record has been successfully deleted',
  })
  async delete(@Param('id') id: string) {
    return await this.gamesService.delete(id);
  }
}
