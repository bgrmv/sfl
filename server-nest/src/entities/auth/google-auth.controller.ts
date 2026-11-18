import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UsePipes,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { addDays } from 'date-fns';
import type { Request, Response } from 'express';
import { invitationInputSchema } from '@sfl/schemas';
import { Public } from 'src/shared/decorators/public.decorator';
import { ZodValidationPipe } from 'src/shared/pipes/custom-pipe/zod-validation.pipe';
import { refreshCookieOptions } from './auth.cookies';
import { OAUTH_STATE_COOKIE, OAUTH_STATE_TTL_MS } from './auth.constants';
import { GoogleAuthService } from './google-auth.service';
import { clientUrl, InvitationsService } from './invitations.service';

/** Links for connecting an account to a player, and the sign-in with Google (S8.13, ADR 0021). */
@ApiBearerAuth()
@Controller('auth')
@ApiTags('auth')
export class GoogleAuthController {
  constructor(
    private config: ConfigService,
    private invitations: InvitationsService,
    private google: GoogleAuthService,
  ) {}

  // ADMIN only: a route without a decorator is closed by default (ADR 0006)
  @Post('invitations')
  @UsePipes(new ZodValidationPipe(invitationInputSchema))
  create(@Req() req: Request, @Body() { playerId }: { playerId: string }) {
    return this.invitations.create(playerId, (req as any).user._id);
  }

  @Get('invitations')
  list() {
    return this.invitations.list();
  }

  @Delete('invitations/:id')
  async revoke(@Param('id') id: string) {
    await this.invitations.revoke(id);
  }

  /** The page of the link asks this; an unknown, spent, expired and revoked link answer alike. */
  @Public()
  @Get('invitations/:token')
  preview(@Param('token') token: string) {
    return this.invitations.preview(token);
  }

  @Public()
  @Get('google/start')
  async start(@Res() res: Response, @Query('invitation') invitation?: string) {
    const { state, url } = await this.google.start(invitation);

    // Lax, not Strict: the return from Google is a navigation from another site
    res.cookie(OAUTH_STATE_COOKIE, state, {
      ...this.stateCookieOptions(),
      maxAge: OAUTH_STATE_TTL_MS,
    });
    res.redirect(302, url);
  }

  @Public()
  @Get('google/callback')
  async callback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
  ) {
    const session = await this.google.finish({
      code: typeof code === 'string' ? code : undefined,
      state: typeof state === 'string' ? state : undefined,
      error: typeof error === 'string' ? error : undefined,
      cookieState: (req.cookies as any)?.[OAUTH_STATE_COOKIE],
    });
    res.clearCookie(OAUTH_STATE_COOKIE, this.stateCookieOptions());

    if (!session) {
      return res.redirect(302, `${clientUrl(this.config)}/connect/failed`);
    }
    res.cookie('refreshToken', session.refreshToken, {
      ...refreshCookieOptions(this.config),
      expires: addDays(new Date(), 1),
    });
    // The page asks `POST /auth/refresh` for the access token: it is never put in an address
    res.redirect(302, `${clientUrl(this.config)}/connected`);
  }

  private stateCookieOptions() {
    const stage = this.config.get<string>('STAGE');
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: stage !== 'development' && stage !== 'test',
      path: '/rest/auth/google',
    } as const;
  }
}
