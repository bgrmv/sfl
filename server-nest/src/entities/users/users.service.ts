import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ASSIGNABLE_ROLES } from '@sfl/schemas';
import type { AdminUser, AssignableRole } from '@sfl/schemas';

import mongoose, { Connection, Model } from 'mongoose';
import { Role } from '../roles/roles.schema';
import { FileLoggerService } from 'src/shared/services/logger.service';
import { hashPassword } from 'src/shared/utils/password';
import { IUser, User } from './users.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<IUser>,
    // The player and role models are taken by name: UsersService is provided in
    // several modules, and the schema of a player imports this one
    @InjectConnection() private connection: Connection,

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

  private get roleModel(): Model<Role> {
    return this.connection.model<Role>(Role.name);
  }

  /** Accounts for the admin: who they are and what they may do. No email, no Google id. */
  async listForAdmin(): Promise<AdminUser[]> {
    const users = await this.userModel
      .find()
      .populate<{ roles: Role[] }>('roles')
      .exec();
    // Not `lean()`: the ids of users are UUIDs, a plain read gives them as binary
    const players = await this.connection
      .model('Player')
      .find({}, 'nickname user')
      .exec();
    const nickname = new Map(
      players.map((p: any) => [String(p.user), p.nickname as string] as const),
    );

    return users.map((u: any) => ({
      id: String(u._id),
      name: u.name ?? '',
      surname: u.surname ?? '',
      nickname: nickname.get(String(u._id)),
      roles: (u.roles as Role[]).map(role => role.name),
      hasGoogle: !!u.googleSub,
    }));
  }

  /**
   * Replaces the roles of a user (ADMIN only, the route says so). Nobody takes
   * the admin role from himself, and the last admin stays: the league must
   * not lock itself out. The sessions of the person end, so that a lowered
   * level works at once, not when the access token expires.
   */
  async setRoles(
    id: string,
    names: AssignableRole[],
    actorId: string,
  ): Promise<AdminUser> {
    const userId = new mongoose.Types.UUID(id);
    const user = await this.userModel
      .findById(userId)
      .populate<{ roles: Role[] }>('roles')
      .lean()
      .exec();
    if (!user) throw new NotFoundException('User is not found');

    const unique = [...new Set(names)].filter(name =>
      (ASSIGNABLE_ROLES as readonly string[]).includes(name),
    );
    const wasAdmin = (user.roles as unknown as Role[]).some(
      role => role.name === 'ADMIN',
    );
    if (wasAdmin && !unique.includes('ADMIN')) {
      if (String(actorId) === String(id)) {
        throw new BadRequestException(
          'You cannot take the admin role from yourself',
        );
      }
      const adminRole = await this.roleModel.findOne({ name: 'ADMIN' }).lean();
      const admins = await this.userModel.countDocuments({
        roles: adminRole?._id as any,
        _id: { $ne: userId },
      });
      if (!admins) {
        throw new BadRequestException('The league needs at least one admin');
      }
    }

    const roles = await this.roleModel
      .find({ name: { $in: unique } })
      .lean()
      .exec();
    await this.userModel
      .updateOne(
        { _id: userId },
        {
          $set: { roles: roles.map(role => role._id) },
          $inc: { tokenVersion: 1 },
        },
      )
      .exec();

    return (await this.listForAdmin()).find(row => row.id === String(id))!;
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
    // `null` removes the field instead of storing a null
    const set: Record<string, unknown> = {};
    const unset: Record<string, ''> = {};
    for (const [key, value] of Object.entries(body)) {
      if (value === null) unset[key] = '';
      else set[key] = value;
    }

    const user = await this.userModel
      .findOneAndUpdate(
        { _id: new mongoose.Types.UUID(id) },
        {
          ...(Object.keys(set).length ? { $set: set } : {}),
          ...(Object.keys(unset).length ? { $unset: unset } : {}),
        },
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
   * The person leaves, the record stays (S8.4): no name, surname, avatar, birth date, country;
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
        // `age` is the field of the old schema: documents that still have it lose it too
        $unset: { age: '', birthDate: '', country: '' },
        $inc: { tokenVersion: 1 },
      })
      .exec();

    return !!user;
  }

  deleteUserById(id: string | mongoose.Types.UUID) {
    return this.userModel.findByIdAndDelete(new mongoose.Types.UUID(id)).exec();
  }
}
