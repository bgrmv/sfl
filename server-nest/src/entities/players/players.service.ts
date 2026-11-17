import {
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { FileLoggerService } from 'src/shared/services/logger.service';
import { Game, IGame } from '../games/game.schema';
import { Media } from '../media/media.schema';
import { UsersService } from '../users/users.service';
import { Player, ServerPlayer } from './players.schema';

@Injectable()
export class PlayersService {
  constructor(
    @InjectModel(Player.name)
    private playerModel: Model<Player>,

    @InjectModel(Game.name)
    private gameModel: Model<IGame>,

    @InjectModel(Media.name)
    private mediaModel: Model<Media>,

    @Optional()
    private usersService: UsersService,

    private readonly logger: FileLoggerService,
  ) {}

  async findById(id: string): Promise<ServerPlayer> {
    const player = await this.playerModel.findById(id).populate('user').exec();
    if (!player) {
      throw new NotFoundException('Player is not found');
    }

    return player.toJSON();
  }

  /** Id of the user behind the player, or null if there is no such player. */
  async findUserId(id: string): Promise<string | null> {
    const player = await this.playerModel
      .findById(id)
      .select('user')
      .lean()
      .exec();

    return player ? player.user.toString() : null;
  }

  async find(
    { ids }: { ids?: Types.ObjectId[] },
    includeMetadata = false,
  ): Promise<ServerPlayer[]> {
    const excludeFields = [includeMetadata ? '' : '-metadata'];

    return await this.playerModel
      .find({
        ...(ids ? { _id: { $in: ids } } : {}),
      })
      .select(excludeFields.join(' '))
      .populate('user')
      .exec();
  }

  async findCaptains(): Promise<ServerPlayer[]> {
    return await this.playerModel
      .find({ isCaptain: true })
      .populate('user')
      .exec();
  }

  async patch(
    id: string,
    player: Partial<ServerPlayer>,
  ): Promise<ServerPlayer> {
    const updated = await this.playerModel
      .findByIdAndUpdate(id, { $set: { ...player } }, { new: true })
      .populate('user')
      .exec();

    if (!updated) {
      throw new NotFoundException('Player is not found');
    }

    return updated;
  }

  async create(player: {
    nickname: string;
    userId: string | Types.UUID;
    number?: number;
  }): Promise<any> {
    const { id } = await this.playerModel.create({
      nickname: player.nickname,
      user: new mongoose.Types.UUID(player.userId),
      number: player.number,
    });

    return await this.playerModel.findById(id).populate('user').exec();
  }

  /**
   * Creates players with their users, all or nothing. MongoDB transactions need
   * a replica set, so a failure removes whatever was already created.
   */
  async createWithUsers(
    inputs: {
      nickname: string;
      number?: number;
      user: { email: string; name?: string; surname?: string };
    }[],
    roleIds: string[],
  ): Promise<any[]> {
    const emails = inputs.map(({ user }) => user.email);
    if (new Set(emails).size !== emails.length) {
      throw new ConflictException('Emails in the request must be unique');
    }

    const created: { playerId?: string; userId: string }[] = [];
    try {
      const players: any[] = [];

      for (const { user: userBody, ...playerBody } of inputs) {
        const user = await this.usersService.createUser({
          ...userBody,
          roles: roleIds,
        });
        const entry: { playerId?: string; userId: string } = {
          userId: user.id.toString(),
        };
        created.push(entry);

        const player = await this.create({ ...playerBody, userId: user.id });
        entry.playerId = player.id;
        players.push(player);
      }

      return players;
    } catch (error) {
      this.logger.error('Failed to create players, rolling back', {
        created: created.length,
        error,
      });

      for (const { playerId, userId } of created) {
        if (playerId) {
          await this.playerModel.findByIdAndDelete(playerId).exec();
        }
        await this.usersService.deleteUserById(userId);
      }

      throw error;
    }
  }

  async delete(id: string): Promise<ServerPlayer> {
    // The games keep the player id in their statistics and metadata: deleting
    // would leave dangling references and break the season totals
    if (await this.gameModel.exists({ 'statistics.playerId': id })) {
      throw new ConflictException('The player has games and cannot be deleted');
    }

    const deletedPlayer = await this.playerModel
      .findByIdAndDelete(id)
      .populate('user')
      .exec();

    if (!deletedPlayer) {
      throw new NotFoundException('Player is not found');
    }

    await this.usersService.deleteUserById(deletedPlayer.user.id.toString());

    return deletedPlayer;
  }

  /**
   * The player stays in the games and the statistics, the person goes (S8.4):
   * the nickname becomes "Former player ...", the user loses name, surname,
   * avatar, age and email (see `UsersService.anonymize`), the photos lose the
   * link to the player. Safe to repeat.
   */
  async anonymize(id: string): Promise<ServerPlayer> {
    const player = await this.playerModel.findById(id).populate('user').exec();
    if (!player) {
      throw new NotFoundException('Player is not found');
    }

    await this.usersService.anonymize(player.user.id.toString());
    await this.mediaModel.updateMany(
      { playerId: new Types.ObjectId(id) },
      { $set: { playerId: null } },
    );
    await this.playerModel
      .updateOne(
        { _id: id },
        {
          $set: {
            nickname: `Former player ${player.number ?? String(id).slice(-4)}`,
          },
        },
      )
      .exec();

    return await this.findById(id);
  }
}
