import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * One sign-in on one device (a "family" of refresh tokens). Every refresh
 * replaces the token of the family by a new one (`jti`); a token that was
 * already replaced is a stolen copy, and the whole family dies (S8.12).
 */
@Schema({ versionKey: false, collection: 'sessions' })
export class Session {
  /** The `sid` claim of the refresh tokens of this sign-in. */
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  userId: string;

  /** The only refresh token that is valid now. */
  @Prop({ type: String, required: true })
  jti: string;

  /** The token before it: accepted for a few seconds (two tabs refresh at once). */
  @Prop({ type: String })
  previousJti?: string;

  @Prop({ type: Date, required: true })
  rotatedAt: Date;

  /** MongoDB deletes the session itself when the last token has expired. */
  @Prop({ type: Date, required: true, index: { expireAfterSeconds: 0 } })
  expiresAt: Date;
}

export type SessionDocument = HydratedDocument<Session>;
export const SessionSchema = SchemaFactory.createForClass(Session);
