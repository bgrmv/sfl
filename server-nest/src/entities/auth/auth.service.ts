import {
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'node:crypto';
import { Model, Types } from 'mongoose';
import {
  algorithmOf,
  hashPassword,
  verifyPassword,
} from 'src/shared/utils/password';
import { User } from '../users';
import {
  ACCESS_AUDIENCE,
  JWT_ALGORITHM,
  JWT_ISSUER,
  REFRESH_AUDIENCE,
  REFRESH_GRACE_SECONDS,
  REFRESH_TTL_SECONDS,
} from './auth.constants';
import { Session } from './session.schema';
import { AuthRequiredOutput } from './auth.dto';

/** The ids of users are UUIDs: a string has to be cast before a query. */
const uuid = (id: string) => new Types.UUID(id) as unknown as string;

/** All a token holds: who and with which roles. The rest comes from `GET /auth/whoami`. */
export interface TokenClaims {
  _id: string;
  roles: string[];
  /** `User.tokenVersion` at the time of issue; a refresh token is void when it differs. */
  tv: number;
}

/** What a refresh token adds: the session (`sid`) and the number of the token in it (`jti`). */
export interface RefreshClaims extends TokenClaims {
  sid: string;
  jti: string;
}

/** The user as the API shows it (`whoami`, `req.user` after a refresh). */
export type SessionUser = Awaited<ReturnType<AuthService['getUser']>>;

/** Spent on an unknown email so that the answer takes as long as for a wrong password. */
const DUMMY_HASH = hashPassword('timing-equaliser-not-a-real-password');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly accessTokenSecret = this.configService.getOrThrow(
    'ACCESS_TOKEN_SECRET',
  );
  private readonly refreshTokenSecret = this.configService.getOrThrow(
    'REFRESH_TOKEN_SECRET',
  );

  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    @InjectModel(Session.name)
    private sessionModel: Model<Session>,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  async signIn({ email, password }: AuthRequiredOutput) {
    try {
      const user = await this.userModel.findOne({ email }).exec();

      // An unknown email costs the same time as a wrong password: no hint which emails exist
      if (!user) {
        await verifyPassword(await DUMMY_HASH, password);
        throw new UnauthorizedException();
      }
      if (!(await verifyPassword(user.password, password))) {
        throw new UnauthorizedException();
      }

      await this.upgradeLegacyHash(user, password);

      const claims = await this.claimsOf(user._id);
      const sid = randomUUID();
      const jti = randomUUID();

      await this.sessionModel.create({
        _id: sid,
        userId: String(user._id),
        jti,
        rotatedAt: new Date(),
        expiresAt: this.refreshExpiry(),
      });

      // If authenticated, generate and send an access token and a refresh token
      return {
        accessToken: await this.generateAccessToken(claims),
        refreshToken: await this.generateRefreshToken({ ...claims, sid, jti }),
      };
    } catch (error: any) {
      // A wrong password is an everyday answer, not an error of the server
      if (error.status !== HttpStatus.UNAUTHORIZED) {
        this.logger.error(error);
      }
      switch (error.status) {
        case HttpStatus.UNAUTHORIZED:
          throw new UnauthorizedException();
        default:
          throw new InternalServerErrorException();
      }
    }
  }

  /**
   * A correct password in the old SHA-512 form becomes argon2id now (S8.7, ADR 0020).
   * Not a password change: the sessions stay. The write is conditional on the old
   * hash, so a password changed in between is not overwritten; a failure only logs.
   */
  private async upgradeLegacyHash(user: User, password: string) {
    if (algorithmOf(user.password) !== 'sha512') return;
    try {
      await this.userModel
        .updateOne(
          { _id: user._id, password: user.password },
          {
            $set: {
              password: await hashPassword(password),
              passwordAlgorithm: 'argon2id',
            },
          },
        )
        .exec();
    } catch (error) {
      this.logger.error(error);
    }
  }

  /**
   * Access token: short-lived (15 minutes), checked without the database, so a
   * change of roles reaches it at most 15 minutes later.
   */
  public async generateAccessToken(claims: TokenClaims) {
    return await this.jwtService.signAsync(claims, {
      expiresIn: '15m',
      secret: this.accessTokenSecret,
      algorithm: JWT_ALGORITHM,
      issuer: JWT_ISSUER,
      audience: ACCESS_AUDIENCE,
    });
  }

  public async verifyAccessToken(
    accessToken: string,
  ): Promise<TokenClaims | null> {
    return this.verify(accessToken, this.accessTokenSecret, ACCESS_AUDIENCE);
  }

  /**
   * Refresh token: lives one day, sits in an HttpOnly cookie, changes at every
   * refresh, is void after sign-out and after a change of the password.
   */
  public async generateRefreshToken(claims: RefreshClaims) {
    return this.jwtService.signAsync(claims, {
      expiresIn: REFRESH_TTL_SECONDS,
      secret: this.refreshTokenSecret,
      algorithm: JWT_ALGORITHM,
      issuer: JWT_ISSUER,
      audience: REFRESH_AUDIENCE,
    });
  }

  public async verifyRefreshToken(
    refreshToken: string,
  ): Promise<RefreshClaims | null> {
    return this.verify<RefreshClaims>(
      refreshToken,
      this.refreshTokenSecret,
      REFRESH_AUDIENCE,
    );
  }

  /**
   * A session from a refresh token: the user and the roles come from the
   * database, not from the token, so a role changed an hour ago is already
   * in force. The token is replaced by a new one (`refreshToken` in the answer).
   * Null for an invalid, expired or revoked token.
   *
   * A token that was already replaced is used again: it is a copy, and the
   * whole session is deleted, for the thief and for the owner alike. Only the
   * previous token, for a few seconds, is let through without a new token: two
   * tabs may refresh at once, and the browser already holds the new cookie.
   */
  public async refreshSession(refreshToken: string) {
    const claims = await this.verifyRefreshToken(refreshToken);
    if (!claims?.sid || !claims.jti) {
      return null;
    }

    const current = await this.userModel
      .findById(uuid(claims._id), 'tokenVersion')
      .lean()
      .exec();
    if (!current || (current.tokenVersion ?? 0) !== claims.tv) {
      return null;
    }

    const newJti = randomUUID();
    const now = new Date();
    const rotated = await this.sessionModel
      .findOneAndUpdate(
        { _id: claims.sid, userId: claims._id, jti: claims.jti },
        {
          $set: {
            jti: newJti,
            previousJti: claims.jti,
            rotatedAt: now,
            expiresAt: this.refreshExpiry(),
          },
        },
      )
      .lean()
      .exec();

    let newRefreshToken: string | undefined;
    if (rotated) {
      newRefreshToken = await this.generateRefreshToken({
        ...(await this.claimsOf(claims._id)),
        sid: claims.sid,
        jti: newJti,
      });
    } else if (!(await this.isJustReplaced(claims))) {
      await this.sessionModel.deleteOne({ _id: claims.sid }).exec();
      this.logger.warn(
        `Refresh token of session ${claims.sid} used twice: the session is deleted`,
      );
      return null;
    }

    return {
      user: await this.getUser({ _id: claims._id }),
      accessToken: await this.generateAccessToken(
        await this.claimsOf(claims._id),
      ),
      refreshToken: newRefreshToken,
    };
  }

  /** Sign-out: the session of this device is deleted, its refresh token stops working at once. */
  public async revokeSession(refreshToken: string): Promise<void> {
    const claims = await this.verifyRefreshToken(refreshToken);
    if (claims?.sid) {
      await this.sessionModel
        .deleteOne({ _id: claims.sid, userId: claims._id })
        .exec();
    }
  }

  private async isJustReplaced(claims: RefreshClaims): Promise<boolean> {
    const session = await this.sessionModel
      .findOne({ _id: claims.sid, userId: claims._id })
      .lean()
      .exec();

    return (
      !!session &&
      session.previousJti === claims.jti &&
      Date.now() - session.rotatedAt.getTime() <= REFRESH_GRACE_SECONDS * 1000
    );
  }

  private refreshExpiry(): Date {
    return new Date(Date.now() + REFRESH_TTL_SECONDS * 1000);
  }

  public async getUser({ email, _id }: { email?: string; _id?: string }) {
    const user = await this.userModel
      .findOne({
        ...(email ? { email } : null),
        ...(_id ? { _id: uuid(_id) } : null),
      })
      .populate(['roles'])
      .exec();

    if (!user) {
      return null;
    }

    return {
      id: String(user._id),
      email: user.email,
      name: user.name,
      surname: user.surname,
      avatar: user.avatar,
      roles: user.roles.map(role => role.name),
    };
  }

  private async claimsOf(id: string): Promise<TokenClaims> {
    const user = await this.userModel
      .findById(uuid(id))
      .populate(['roles'])
      .exec();

    return {
      _id: String(user._id),
      roles: user.roles.map(role => role.name),
      tv: user.tokenVersion ?? 0,
    };
  }

  /** `algorithms`, issuer and audience are fixed: no `none`, no HS256, no foreign token. */
  private async verify<T extends object = TokenClaims>(
    token: string,
    secret: string,
    audience: string,
  ): Promise<T | null> {
    try {
      return await this.jwtService.verifyAsync<T>(token, {
        secret,
        algorithms: [JWT_ALGORITHM],
        issuer: JWT_ISSUER,
        audience,
      });
    } catch {
      return null;
    }
  }
}
