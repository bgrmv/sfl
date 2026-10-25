import {
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
  Res,
  UsePipes,
} from '@nestjs/common';
import {
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from 'src/shared/decorators/public.decorator';
import { ValibotValidationPipe } from 'src/shared/pipes/custom-pipe/valibot-validation.pipe';
import { SaveGameDTO, UpdateGameDTO } from './game.dto';
import { Game, IGame, UpdateGame } from './game.schema';
import { GamesService } from './games.service';

@ApiTags('games')
@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Public()
  @Get()
  @ApiQuery({
    name: 'number',
    type: String,
    required: false,
  })
  @ApiQuery({
    name: 'season',
    type: Number,
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get all games records',
  })
  async find(
    @Res() res: Response,
    @Query('number', new ParseIntPipe({ optional: true }))
    number?: number | undefined,
    @Query('season', new ParseIntPipe({ optional: true }))
    season?: number | undefined,
  ) {
    return res.json(
      await this.gamesService.find({
        ...(number ? { number } : null),
        ...(season ? { season } : null),
      }),
    );
  }

  // Get /games/:id
  @Public()
  @Get(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get all games records',
  })
  async findById(
    @Res() res: Response,
    @Param('id')
    id: string,
  ) {
    return res.json(await this.gamesService.findById(id));
  }

  @Post()
  @ApiBody({ type: Game })
  @ApiResponse({
    status: 201,
    description: 'The record has been successfully created.',
  })
  @UsePipes(new ValibotValidationPipe(SaveGameDTO))
  async save(@Res() res: Response, @Body() game: IGame) {
    return res.json(await this.gamesService.create(game));
  }

  // PUT /games/:id
  @Patch(':id')
  @ApiBody({ type: UpdateGame })
  @ApiResponse({
    status: 200,
    description: 'The record has been successfully updated',
  })
  async update(
    @Param('id') id: string,
    @Body(new ValibotValidationPipe(UpdateGameDTO)) game: IGame,
  ) {
    const updatedGame = await this.gamesService.update(id, game);

    return {
      data: updatedGame,
    };
  }

  // PUT /games/:id
  @Put(':id')
  @ApiBody({ type: UpdateGame })
  @ApiResponse({
    status: 200,
    description: 'The record has been successfully replaced',
  })
  async replace(
    @Res() res: Response,
    @Param('id') id: string,
    @Body(new ValibotValidationPipe(SaveGameDTO)) game: IGame,
  ) {
    return res.json(await this.gamesService.replace(id, game));
  }

  @Delete(':id')
  @ApiResponse({
    status: 201,
    description: 'The record has been successfully deleted',
  })
  async delete(@Res() res: Response, @Param('id') id: string) {
    return res.json(await this.gamesService.delete(id));
  }
}
