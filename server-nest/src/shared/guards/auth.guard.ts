import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { AuthService } from '../../entities/auth/auth.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest<Request>();

    if (isPublic) {
      // Public routes stay open, but a valid token still identifies the caller,
      // so that an ADMIN gets full data (S8.10). A bad token is not an error here.
      await this.authenticate(req).catch(() => false);
      return true;
    }

    if (await this.authenticate(req)) {
      return true;
    }

    throw new UnauthorizedException();
  }

  /**
   * Puts the claims of a valid access token into the request. Only the
   * `Authorization: Bearer` header counts: the refresh cookie opens nothing
   * but `POST /auth/refresh` and `POST /auth/sign-out`, so a foreign site
   * cannot act with it (CSRF) and a stolen cookie alone is not a session.
   */
  private async authenticate(req: Request): Promise<boolean> {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader && authHeader.split(' ')[1];
    if (!accessToken) {
      return false;
    }

    const claims = await this.authService.verifyAccessToken(accessToken);
    if (!claims) {
      return false;
    }

    (req as any).user = claims;
    return true;
  }
}
