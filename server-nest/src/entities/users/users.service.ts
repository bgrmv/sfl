import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import mongoose, { Model } from 'mongoose';
import { FileLoggerService } from 'src/shared/services/logger.service';
import { hash } from 'src/shared/utils/string';
import { IUser, User } from './users.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<IUser>,

    private readonly logger: FileLoggerService,
  ) {}

  async createUser(user: {
    email: string;
    name?: string;
    surname?: string;
    roles: string[];
  }) {
    if (!user.roles) {
      return null;
    }

    try {
      await this.userModel.create(user);

      return await this.userModel.findOne({ email: user.email }).exec();
    } catch (error) {
      this.logger.error('Failed to create user', { user, error });
      throw new InternalServerErrorException(
        'Unexpected error occurred while creating user',
      );
    }
  }

  getsUsers() {
    return this.userModel.find().exec();
  }

  getUserById(id: string | mongoose.Types.UUID) {
    return this.userModel
      .findById(new mongoose.Types.UUID(id))
      .populate(['roles'])
      .exec();
  }

  updateUser(id: string | mongoose.Types.UUID, updateUserDto: any) {
    return this.userModel
      .findByIdAndUpdate(new mongoose.Types.UUID(id), updateUserDto, {
        new: true,
      })
      .exec();
  }

  async patch(
    id: string | mongoose.Types.UUID,
    body: Partial<IUser>,
  ): Promise<IUser | null> {
    try {
      await this.userModel
        .findOneAndUpdate(
          { _id: new mongoose.Types.UUID(id) },
          { $set: { ...body } },
        )
        .exec();
    } catch {
      return null;
    }
  }

  /** Returns false if there is no such user. The password is stored hashed (S8.7 changes the algorithm). */
  async setPassword(
    id: string | mongoose.Types.UUID,
    password: string,
  ): Promise<boolean> {
    const user = await this.userModel
      .findByIdAndUpdate(new mongoose.Types.UUID(id), {
        $set: { password: hash(password) },
      })
      .exec();

    return !!user;
  }

  deleteUserById(id: string | mongoose.Types.UUID) {
    return this.userModel.findByIdAndDelete(new mongoose.Types.UUID(id)).exec();
  }
}
