import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'node:crypto';
import { Model } from 'mongoose';
import { Player } from '../players/players.schema';
import { TransactionService } from '../statistics/transaction.service';
import { User } from '../users';
import { OAUTH_STATE_TTL_MS } from './auth.constants';
import { AuthService } from './auth.service';
import { GoogleOidcService, GoogleProfile } from './google-oidc.service';
import { InvitationsService } from './invitations.service';
import { OAuthState } from './oauth-state.schema';

const random = () => randomBytes(32).toString('base64url');
const sha256 = (value: string, encoding: 'hex' | 'base64url' = 'hex') =>
  createHash('sha256').update(value).digest(encoding);

/** Why a callback ended without a session. Logged with ids, never with the email or `sub` of Google (S8.4). */
class Refusal extends Error {}

/**
 * Sign-in with Google by redirect and the link of an account to a player
 * (S8.13, ADR 0021). Nobody is created here: an account is let in only when it
 * is already linked, or when a live invitation links it to its player now.
 */
@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);

  constructor(
    @InjectModel(OAuthState.name) private states: Model<OAuthState>,
    @InjectModel(User.name) private users: Model<User>,
    @InjectModel(Player.name) private players: Model<Player>,
    private oidc: GoogleOidcService,
    private invitations: InvitationsService,
    private auth: AuthService,
    private transactions: TransactionService,
  ) {}

  /** The Google page to send the browser to, and the `state` for its cookie. */
  async start(token?: string) {
    if (!this.oidc.isConfigured()) throw new ServiceUnavailableException();

    let invitationId: string | undefined;
    if (token) {
      const invitation = await this.invitations.findActive(token);
      if (!invitation) throw new NotFoundException();
      invitationId = String(invitation._id);
    }

    const state = random();
    const nonce = random();
    const codeVerifier = random();
    await this.states.create({
      _id: sha256(state),
      nonce,
      codeVerifier,
      invitationId,
      expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS),
    });

    return {
      state,
      url: this.oidc.authorizationUrl({
        state,
        nonce,
        challenge: sha256(codeVerifier, 'base64url'),
      }),
    };
  }

  /**
   * The return from Google. The session tokens on success, null on any refusal:
   * the person sees the same page whatever the reason was.
   */
  async finish(q: {
    code?: string;
    state?: string;
    error?: string;
    cookieState?: string;
  }) {
    try {
      if (!q.state || !q.cookieState || q.state !== q.cookieState) {
        throw new Refusal('state does not match the browser');
      }
      // Read and deleted at once: the same answer cannot be used twice
      const saved = await this.states
        .findOneAndDelete({
          _id: sha256(q.state),
          expiresAt: { $gt: new Date() },
        })
        .lean()
        .exec();
      if (!saved) throw new Refusal('unknown or spent state');
      if (q.error || !q.code) throw new Refusal('Google returned an error');

      const profile = await this.oidc.verifyIdToken(
        await this.oidc.exchangeCode(q.code, saved.codeVerifier),
        saved.nonce,
      );
      const user = await this.userToSignIn(profile, saved.invitationId);

      return await this.auth.startSession(String(user._id));
    } catch (error) {
      const reason = error instanceof Refusal ? error.message : String(error);
      this.logger.warn(`Google sign-in refused: ${reason}`);
      return null;
    }
  }

  private async userToSignIn(profile: GoogleProfile, invitationId?: string) {
    const owner = await this.users.findOne({ googleSub: profile.sub }).exec();
    const invitation = invitationId
      ? await this.invitations.findActiveById(invitationId)
      : null;
    if (invitationId && !invitation) throw new Refusal('the link is not live');

    if (!invitation) {
      if (!owner) throw new Refusal('an account that is not linked, no link');
      return owner;
    }

    const player = await this.players.findById(invitation.playerId).exec();
    if (!player) throw new Refusal('the player of the link is gone');
    const playerUser = await this.users.findById(player.user).exec();
    if (!playerUser) throw new Refusal('the user of the player is gone');

    if (owner) {
      // The account is already someone's: only its own player may use a link
      if (String(owner._id) !== String(playerUser._id)) {
        throw new Refusal('the account is linked to another player');
      }
      await this.invitations.markUsed(invitation._id);
      return owner;
    }
    if (playerUser.googleSub) {
      throw new Refusal('the player has another account linked');
    }

    // The link is spent and the account is attached together, or neither happens
    await this.transactions.run(async session => {
      if (!(await this.invitations.markUsed(invitation._id, session))) {
        throw new Refusal('the link was spent in the meantime');
      }
      const linked = await this.users
        .updateOne(
          { _id: playerUser._id, googleSub: { $exists: false } },
          { $set: { googleSub: profile.sub, email: profile.email } },
          { session },
        )
        .exec();
      if (!linked.modifiedCount)
        throw new Refusal('the player was linked in the meantime');
    });
    this.logger.log(
      `Player ${String(player._id)} connected a Google account by link ${String(invitation._id)}`,
    );

    return playerUser;
  }
}
