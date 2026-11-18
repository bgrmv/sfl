import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'node:crypto';
import { ClientSession, Model, Types } from 'mongoose';
import type { InvitationList, InvitationListItem } from '@sfl/schemas';
import { Player } from '../players/players.schema';
import { User } from '../users';
import { INVITATION_TTL_MS } from './auth.constants';
import { Invitation } from './invitation.schema';

export const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

/** The address of the client app, as CORS knows it: the port is dropped when it is the default one. */
export function clientUrl(config: ConfigService): string {
  const host = config.getOrThrow<string>('CLIENT_HOSTNAME');
  const port = Number(config.get('CLIENT_PORT'));
  return port && port !== 80 && port !== 443 ? `${host}:${port}` : host;
}

/** One-time links that connect an account to a player (S8.13, ADR 0021). */
@Injectable()
export class InvitationsService {
  constructor(
    @InjectModel(Invitation.name) private model: Model<Invitation>,
    @InjectModel(Player.name) private players: Model<Player>,
    @InjectModel(User.name) private users: Model<User>,
    private config: ConfigService,
  ) {}

  async create(playerId: string, adminId: string) {
    if (!Types.ObjectId.isValid(playerId)) throw new NotFoundException();
    const player = await this.players.findById(playerId, '_id').lean().exec();
    if (!player) throw new NotFoundException();

    const token = randomBytes(32).toString('base64url');
    const invitation = await this.model.create({
      playerId: player._id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      createdBy: adminId,
    });

    return {
      id: String(invitation._id),
      // Shown once: the database keeps only the hash
      token,
      url: `${clientUrl(this.config)}/connect/${token}`,
      expiresAt: invitation.expiresAt.toISOString(),
    };
  }

  /** All links, the newest first, and the players who already have a Google account. Never the token. */
  async list(): Promise<InvitationList> {
    const invitations = await this.model
      .find()
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    const players = await this.players
      .find({ _id: { $in: invitations.map(i => i.playerId) } })
      .populate('user', 'name surname')
      .lean()
      .exec();
    const byId = new Map(players.map(p => [String(p._id), p]));
    const now = Date.now();

    const items = invitations.map((i: any): InvitationListItem => {
      const player = byId.get(String(i.playerId));
      const user = player?.user as unknown as
        { name?: string; surname?: string } | undefined;
      const status =
        i.status === 'active' && i.expiresAt.getTime() <= now
          ? 'expired'
          : i.status;
      return {
        id: String(i._id),
        player: {
          id: String(i.playerId),
          nickname: player?.nickname ?? '',
          name: user?.name ?? '',
          surname: user?.surname ?? '',
        },
        status,
        createdAt: i.createdAt.toISOString(),
        expiresAt: i.expiresAt.toISOString(),
        usedAt: i.usedAt?.toISOString(),
        revokedAt: i.revokedAt?.toISOString(),
      };
    });

    const linkedUsers = await this.users
      .find({ googleSub: { $exists: true } }, '_id')
      .lean()
      .exec();
    const linked = await this.players
      .find({ user: { $in: linkedUsers.map(u => u._id) } }, '_id')
      .lean()
      .exec();

    return { items, linkedPlayerIds: linked.map(p => String(p._id)) };
  }

  async revoke(id: string) {
    const revoked = Types.ObjectId.isValid(id)
      ? await this.model
          .updateOne(
            { _id: id, status: 'active' },
            { $set: { status: 'revoked', revokedAt: new Date() } },
          )
          .exec()
      : null;
    if (!revoked?.modifiedCount) throw new NotFoundException();
  }

  /** The live invitation of a token: not used, not revoked, not expired. Null otherwise, with no telling which. */
  async findActive(token: string) {
    if (typeof token !== 'string' || token.length > 200) return null;
    return this.model
      .findOne({
        tokenHash: hashToken(token),
        status: 'active',
        expiresAt: { $gt: new Date() },
      })
      .lean()
      .exec();
  }

  async findActiveById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model
      .findOne({ _id: id, status: 'active', expiresAt: { $gt: new Date() } })
      .lean()
      .exec();
  }

  /** What the page of the link shows: the card of the player, nothing private. */
  async preview(token: string) {
    const invitation = await this.findActive(token);
    if (!invitation) throw new NotFoundException();
    const player = await this.players
      .findById(invitation.playerId)
      .populate('user', 'name surname')
      .lean()
      .exec();
    if (!player) throw new NotFoundException();
    const user = player.user as unknown as { name?: string; surname?: string };

    return {
      player: {
        nickname: player.nickname,
        name: user?.name ?? '',
        surname: user?.surname ?? '',
      },
      expiresAt: invitation.expiresAt.toISOString(),
    };
  }

  /** Spends the link; false when someone was faster or it has just expired. */
  async markUsed(id: unknown, session?: ClientSession): Promise<boolean> {
    const spent = await this.model
      .findOneAndUpdate(
        { _id: id, status: 'active', expiresAt: { $gt: new Date() } },
        { $set: { status: 'used', usedAt: new Date() } },
        { session },
      )
      .lean()
      .exec();
    return !!spent;
  }
}
