import {
  Controller,
  Get,
  ParseEnumPipe,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiProperty,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../shared/decorators/public.decorator';
import { ChartsService } from './charts.service';

export class DTO {
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

/** The rating system a top is made by: the new one (total points) or the old one. */
export enum TopPlayersSystem {
  TotalPoints = 'total-points',
  Ancient = 'ancient',
}

// Read-only statistics, open to everyone
@Public()
@ApiTags('charts')
@Controller('charts')
export class ChartsController {
  constructor(private readonly chartsService: ChartsService) {}

  @ApiQuery({ name: 'system', required: true, enum: TopPlayersSystem })
  @ApiQuery({ name: 'season', required: true, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ type: Array })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiInternalServerErrorResponse({
    description: 'Internal Server Error',
  })
  @Get('top-players')
  async topPlayers(
    @Query('system', new ParseEnumPipe(TopPlayersSystem))
    system: TopPlayersSystem,
    @Query('season', ParseIntPipe) season: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return system === TopPlayersSystem.TotalPoints
      ? await this.chartsService.topTotalPointsPlayers({ season, limit })
      : await this.chartsService.topAncientRatingSystemPlayers({
          season,
          limit,
        });
  }
}
