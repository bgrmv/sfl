import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { InjectModel } from '@nestjs/mongoose';

import mongoose, { Model } from 'mongoose';
import { FileLoggerService } from 'src/shared/services/logger.service';
import { hashPassword } from 'src/shared/utils/password';
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
    // Nobody knows the password of a new user until a link or an admin sets it: random, argon2id
    await this.userModel.create({
      ...user,
      password: await hashPassword(randomUUID()),
      passwordAlgorithm: 'argon2id',
    } as unknown as IUser);

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

  /** Returns false if there is no such user. The password is stored as argon2id (S8.7). */
  async setPassword(
    id: string | mongoose.Types.UUID,
    password: string,
  ): Promise<boolean> {
    const user = await this.userModel
      .findByIdAndUpdate(new mongoose.Types.UUID(id), {
        $set: {
          password: await hashPassword(password),
          passwordAlgorithm: 'argon2id',
        },
        // A new password ends every session opened with the old one
        $inc: { tokenVersion: 1 },
      })
      .exec();

    return !!user;
  }

  /**
   * The person leaves, the record stays (S8.4): no name, surname, avatar, age;
   * the email becomes a placeholder nobody can receive mail at, the password a
   * random one, and every session ends. Safe to repeat.
   */
  async anonymize(id: string | mongoose.Types.UUID): Promise<boolean> {
    const userId = new mongoose.Types.UUID(id);
    const user = await this.userModel
      .findByIdAndUpdate(userId, {
        $set: {
          name: '',
          surname: '',
          avatar: '',
          email: `removed-${userId.toString()}@sfl.invalid`,
          password: await hashPassword(randomUUID()),
          passwordAlgorithm: 'argon2id',
        },
        $unset: { age: '' },
        $inc: { tokenVersion: 1 },
      })
      .exec();

    return !!user;
  }

  deleteUserById(id: string | mongoose.Types.UUID) {
    return this.userModel.findByIdAndDelete(new mongoose.Types.UUID(id)).exec();
  }
}
