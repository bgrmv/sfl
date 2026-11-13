import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    if (!user.roles?.length) {
      throw new BadRequestException('A user needs at least one role');
    }

    // A duplicate email is a MongoDB error 11000, the exception filter makes it 409
    // `roles` are role ids as strings: Mongoose casts them to ObjectId
    await this.userModel.create(user as unknown as IUser);

    return await this.userModel.findOne({ email: user.email }).exec();
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

  async patch(id: string | mongoose.Types.UUID, body: Partial<IUser>) {
    const user = await this.userModel
      .findOneAndUpdate(
        { _id: new mongoose.Types.UUID(id) },
        { $set: { ...body } },
        { new: true },
      )
      .exec();

    if (!user) {
      throw new NotFoundException('User is not found');
    }

    return user;
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
