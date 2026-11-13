import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ITeam, Team } from './team.schema';

@Injectable()
export class TeamsService {
  constructor(
    @InjectModel(Team.name)
    private teamModel: Model<ITeam>,
  ) {}

  async find() {
    return await this.teamModel.find().exec();
  }

  async save(team: ITeam) {
    console.log('BEFORE SAVE TEAM', JSON.stringify(team, null, 2));

    await this.teamModel.create(team);
  }
}
