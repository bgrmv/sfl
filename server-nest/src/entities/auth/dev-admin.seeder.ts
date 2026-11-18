import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { hashPassword } from 'src/shared/utils/password';
import { Role } from '../roles';
import { User } from '../users';

export const DEV_ADMIN = { email: 'admin@sfl.local', password: 'admin' };

/**
 * Local development only: makes sure that `admin@sfl.local` exists and is an
 * ADMIN, even when the database is a copy of production (a restored dump
 * replaces the seed users, and nobody remembers a production password).
 *
 * It never runs in production: it needs `STAGE=development` and a `NODE_ENV`
 * other than `production`. An existing user is not touched, so a changed
 * password stays.
 */
@Injectable()
export class DevAdminSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(DevAdminSeeder.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Role.name) private roleModel: Model<Role>,
    private configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (
      this.configService.get('STAGE') !== 'development' ||
      process.env.NODE_ENV === 'production'
    ) {
      return;
    }

    const role =
      (await this.roleModel.findOne({ name: 'ADMIN' }).exec()) ??
      (await this.roleModel.create({
        name: 'ADMIN',
        description: 'League administrator',
      }));

    const exists = await this.userModel
      .exists({ email: DEV_ADMIN.email })
      .exec();
    if (exists) {
      return;
    }

    await this.userModel.create({
      email: DEV_ADMIN.email,
      name: 'Admin',
      password: await hashPassword(DEV_ADMIN.password),
      passwordAlgorithm: 'argon2id',
      roles: [role._id as never],
    });
    this.logger.log(
      `Development admin created: ${DEV_ADMIN.email} / ${DEV_ADMIN.password}`,
    );
  }
}
