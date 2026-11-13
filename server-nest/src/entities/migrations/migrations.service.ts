import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Player } from '../players';

@Injectable()
export class MigrationsService {
  constructor(
    @InjectModel(Player.name)
    private playerModel: Model<Player>,
  ) {}

  async convertPlayerUserToUUID(): Promise<Player[]> {
    const cursor = this.playerModel.find().cursor();

    cursor.eachAsync(async doc => {
      doc.user = new mongoose.Types.UUID(doc.user.toString());
      return await doc.save();
    });

    return await this.playerModel.find().exec();
  }
}
