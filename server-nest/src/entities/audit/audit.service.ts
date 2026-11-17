import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';

import { User, IUser } from '../users/users.schema';
import { Audit } from './audit.schema';

const LIST_LIMIT = 50;

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(Audit.name) private readonly model: Model<Audit>,
    @InjectModel(User.name) private readonly users: Model<IUser>,
  ) {}

  async record(entry: Pick<Audit, 'userId' | 'method' | 'route' | 'status'>) {
    await this.model.create(entry);
  }

  /** The newest first, with the e-mail of the actor (the log is read by an admin only). */
  async latest() {
    const rows = await this.model
      .find()
      .sort({ at: -1 })
      .limit(LIST_LIMIT)
      .lean()
      .exec();

    const ids = [...new Set(rows.map(row => row.userId))];
    const users = await this.users
      .find({ _id: { $in: ids.map(id => new mongoose.Types.UUID(id)) } })
      .select('email')
      .lean()
      .exec();
    const emails = new Map(users.map(user => [String(user._id), user.email]));

    return rows.map(row => ({
      id: String(row._id),
      actor: emails.get(row.userId) ?? 'unknown',
      method: row.method,
      route: row.route,
      status: row.status,
      at: new Date(row.at).toISOString(),
    }));
  }
}
