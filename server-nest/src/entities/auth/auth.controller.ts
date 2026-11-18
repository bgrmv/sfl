import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UsePipes,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { addDays } from 'date-fns';
import type { Request, Response } from 'express';
import { Public } from 'src/shared/decorators/public.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { ZodValidationPipe } from 'src/shared/pipes/custom-pipe/zod-validation.pipe';
import { refreshCookieOptions } from './auth.cookies';
import { AuthRequiredSchema } from './auth.dto';
import { Auth } from './auth.schema';
import { AuthService } from './auth.service';

@ApiBearerAuth()
@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {}

  @Roles() // any signed-in user
  @Get('whoami')
  async whoami(@Req() req: Request) {
    // The token holds only the id and the roles; the rest is read here
    const user = await this.authService.getUser({ _id: (req as any).user._id });
    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }

  @Public()
  @Post('sign-in')
  @ApiBody({
    type: Auth,
    description: 'auth model',
    required: true,
  })
  @UsePipes(new ZodValidationPipe(AuthRequiredSchema))
  async signIn(@Res({ passthrough: true }) res: Response, @Body() auth: Auth) {
    const { accessToken, refreshToken } = await this.authService.signIn(auth);

    res.cookie('refreshToken', refreshToken, {
      ...refreshCookieOptions(this.configService),
      expires: addDays(new Date(), 1),
    });

    return { accessToken };
  }

  /**
   * A new access token from the refresh cookie. This is the only route that
   * the cookie opens, with `POST /auth/sign-out`: the cookie is limited to
   * their path, and the client keeps the access token in memory only.
   */
  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = (req.cookies as any)?.refreshToken;
    const session = refreshToken
      ? await this.authService.refreshSession(refreshToken)
      : null;
    if (!session?.user) {
      throw new UnauthorizedException();
    }

    // Not for a token that was replaced a moment ago: the browser already has the new cookie
    if (session.refreshToken) {
      res.cookie('refreshToken', session.refreshToken, {
        ...refreshCookieOptions(this.configService),
        expires: addDays(new Date(), 1),
      });
    }

    return { accessToken: session.accessToken, user: session.user };
  }

  @Public()
  @Post('sign-out')
  @ApiResponse({
    status: 200,
    description: 'sign out (reset tokens)',
  })
  async signOut(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Not only the cookie goes: the refresh token itself stops working (S8.12)
    const refreshToken = (req.cookies as any)?.refreshToken;
    if (refreshToken) {
      await this.authService.revokeSession(refreshToken);
    }

    res.cookie('refreshToken', null, {
      ...refreshCookieOptions(this.configService),
      expires: new Date(),
    });

    return { accessToken: null };
  }
}
