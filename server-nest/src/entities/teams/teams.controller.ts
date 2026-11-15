import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  UsePipes,
} from '@nestjs/common';
import { ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Public } from 'src/shared/decorators/public.decorator';
import { ZodValidationPipe } from 'src/shared/pipes/custom-pipe/zod-validation.pipe';
import { TeamSaveDTO } from './team.dto';
import { ITeam, Team } from './team.schema';
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
  async find() {
    return await this.teamsService.find();
  }

  @Post()
  @ApiBody({ type: Team })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The record has been successfully created.',
  })
  @UsePipes(new ZodValidationPipe(TeamSaveDTO))
  async save(@Body() team: ITeam) {
    await this.teamsService.save(team);

    return { success: 'OK' };
  }
}
