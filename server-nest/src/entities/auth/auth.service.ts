import {
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { hash } from 'src/shared/utils/string';
import { IUser, User } from '../users';
import { AuthRequiredValiSchemaOutput } from './auth.dto';

@Injectable()
export class AuthService {
  private readonly accessTokenSecret = this.configService.getOrThrow(
    'ACCESS_TOKEN_SECRET',
  );
  private readonly refreshTokenSecret = this.configService.getOrThrow(
    'REFRESH_TOKEN_SECRET',
  );

  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  async signIn({ email, password }: AuthRequiredValiSchemaOutput) {
    try {
      const user = await this.userModel.findOne({ email }).exec();

      if (!user || user.password !== hash(password)) {
        throw new UnauthorizedException();
      }

      const payload = await this.getUser(user);

      // If authenticated, generate and send an access token and a refresh token
      return {
        accessToken: await this.generateAccessToken(payload),
        refreshToken: await this.generateRefreshToken(payload),
      };
    } catch (error: any) {
      console.log(error);
      switch (error.status) {
        case HttpStatus.UNAUTHORIZED:
          throw new UnauthorizedException();
        default:
          throw new InternalServerErrorException();
      }
    }
  }

  /**
    Access Token:
    - Short-Lived: Access tokens have a relatively short lifespan, often lasting just a few minutes to a few hours.
    - Authorization: They are used to grant access to specific resources or perform actions on behalf of a user.
    - Reduced Security Risk: Because they have a short lifespan, even if they are compromised, the exposure is limited in time.
    - Stateless Authentication: Access tokens allow stateless authentication, meaning the server doesn't need to store session information for each user. The token contains all the necessary information for authorization.

    Use Cases:
    - Accessing APIs or protected routes.
    - Authorizing a user to perform actions, like creating, updating, or deleting data.
  */
  public async generateAccessToken(
    user: Omit<IUser, 'password' | 'roles'> & { roles: string[] },
  ) {
    return await this.jwtService.signAsync(user, {
      expiresIn: '15m',
      secret: this.accessTokenSecret,
    });
  }

  public async verifyAccessToken(accessToken: string): Promise<any> {
    try {
      return await this.jwtService.verifyAsync(accessToken, {
        secret: this.accessTokenSecret,
      });
    } catch (error) {
      return null;
    }
  }

  /**
    Refresh Token:
    - Long-Lived: Refresh tokens have a longer lifespan, potentially weeks or months.
    - Securely Obtaining New Access Tokens: They are used to obtain new access tokens when the previous access token expires.
    - Stored Securely: Refresh tokens are usually stored on the client-side in a secure HTTP-only cookie or a local storage mechanism.
    - Reduced Password Exposure: Refresh tokens can help reduce the exposure of the user's credentials (username and password) since they are used less frequently.
    - Enhanced Security: If a refresh token is compromised, the attacker can only obtain new access tokens but not the user's credentials.

    Use Cases:
    - Keeping a user authenticated over a longer period without requiring frequent login.
    - Managing access tokens for long-running sessions, such as in mobile or single-page applications.
    - Reducing the need for users to repeatedly log in.
  */
  public async generateRefreshToken(
    user: Omit<IUser, 'password' | 'roles'> & { roles: string[] },
  ) {
    return this.jwtService.signAsync(user, {
      expiresIn: '1d',
      secret: this.refreshTokenSecret,
    });
  }

  public async verifyRefreshToken(refreshToken: string): Promise<any> {
    try {
      return await this.jwtService.verifyAsync(refreshToken, {
        secret: this.refreshTokenSecret,
      });
    } catch (error) {
      return null;
    }
  }

  public async getUser({ email }: Pick<IUser, 'email'>) {
    const user = await this.userModel
      .findOne({ email })
      .populate(['roles'])
      .exec();
    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      surname: user.surname,
      avatar: user.avatar,
      age: user.age,
      roles: user.roles.map((role) => role.name),
    };
  }
}
