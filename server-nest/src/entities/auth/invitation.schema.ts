import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type InvitationStatus = 'active' | 'used' | 'revoked';

/**
 * A one-time link that lets one person connect a Google account to one player
 * (S8.13, ADR 0021). Only the hash of the token is stored; "expired" is not a
 * status, it follows from `expiresAt`. Not deleted: it is the record of who
 * was connected and when.
 */
@Schema({ versionKey: false, collection: 'invitations', timestamps: true })
export class Invitation {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  playerId: Types.ObjectId;

  /** SHA-256 of the token, hex. The token itself is shown once, at creation. */
  @Prop({ type: String, required: true, unique: true })
  tokenHash: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({
    type: String,
    enum: ['active', 'used', 'revoked'],
    default: 'active',
  })
  status: InvitationStatus;

  /** The id of the admin who made the link. */
  @Prop({ type: String, required: true })
  createdBy: string;

  @Prop({ type: Date })
  usedAt?: Date;

  @Prop({ type: Date })
  revokedAt?: Date;
}

export type InvitationDocument = HydratedDocument<Invitation>;
export const InvitationSchema = SchemaFactory.createForClass(Invitation);
