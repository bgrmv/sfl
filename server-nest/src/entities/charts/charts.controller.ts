import {
  Controller,
  Get,
  InternalServerErrorException,
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

// Read-only statistics, open to everyone
@Public()
@ApiTags('charts')
@Controller('charts')
export class ChartsController {
  constructor(private readonly chartsService: ChartsService) {}

  @ApiQuery({ name: 'season', required: true, type: Number })
  @ApiOkResponse({ status: 200, type: Array })
  @ApiBadRequestResponse({ status: 400, description: 'Bad Request' })
  @ApiInternalServerErrorResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  @Get('top-total-points-players')
  async topTotalPointsPlayers(
    @Query('season', ParseIntPipe) season: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<TResponse<any>> {
    try {
      return {
        data: await this.chartsService.topTotalPointsPlayers({ season, limit }),
      };
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Unexpected error occurred',
      );
    }
  }

  @ApiQuery({ name: 'season', required: true, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ status: 200, type: Array })
  @ApiBadRequestResponse({ status: 400, description: 'Bad Request' })
  @ApiInternalServerErrorResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  @Get('top-ancient-rating-system-players')
  async topAncientRatingSystemPlayers(
    @Query('season', new ParseIntPipe()) season: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<TResponse<any>> {
    try {
      return {
        data: await this.chartsService.topAncientRatingSystemPlayers({
          season,
          limit,
        }),
      };
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Unexpected error occurred',
      );
    }
  }
}
