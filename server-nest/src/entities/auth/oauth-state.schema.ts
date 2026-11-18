import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * What a started Google sign-in has to remember until the user is back:
 * `nonce` and the PKCE verifier never leave the server. Read and deleted by
 * one operation, so a callback cannot be replayed (ADR 0021).
 */
@Schema({ versionKey: false, collection: 'oauth_states' })
export class OAuthState {
  /** SHA-256 of the `state` parameter, hex. */
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  nonce: string;

  @Prop({ type: String, required: true })
  codeVerifier: string;

  /** The id of the invitation the sign-in started with; none for a plain sign-in. */
  @Prop({ type: String })
  invitationId?: string;

  @Prop({ type: Date, required: true, index: { expireAfterSeconds: 0 } })
  expiresAt: Date;
}

export const OAuthStateSchema = SchemaFactory.createForClass(OAuthState);
