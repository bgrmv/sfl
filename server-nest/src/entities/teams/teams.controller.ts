import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  Res,
  UsePipes,
} from '@nestjs/common';
import { ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from 'src/shared/decorators/public.decorator';
import { ValibotValidationPipe } from 'src/shared/pipes/custom-pipe/valibot-validation.pipe';
import { UpdateGame } from '../games/game.schema';
import { TeamSaveDTO } from './team.dto';
import { ITeam, Team, UpdateTeam } from './team.schema';
import { TeamsService } from './teams.service';

@ApiTags('teams')
@Controller('teams')
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  @Public()
  @Get()
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get all teams records',
  })
  async find(@Res() res: Response) {
    return res.json(await this.teamsService.find());
  }

  @Post()
  @ApiBody({ type: Team })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The record has been successfully created.',
  })
  @UsePipes(new ValibotValidationPipe(TeamSaveDTO))
  async save(@Body() team: ITeam) {
    await this.teamsService.save(team);

    return { success: 'OK' };
  }

  // PUT /games/:id
  @Put(':id')
  @ApiBody({ type: UpdateTeam })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The record has been successfully updated.',
  })
  update(@Param('id') id: string, @Body() updateTeamDto: UpdateGame) {
    // Update logic
  }
}
