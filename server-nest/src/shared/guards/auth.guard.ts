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

  /** Puts the user and a fresh access token into the request; false if there is no valid token. */
  private async authenticate(req: Request): Promise<boolean> {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader && authHeader.split(' ')[1];
    const refreshToken = (req.cookies as any)?.refreshToken;

    if (!accessToken && !refreshToken) {
      return false;
    }

    const verifedAccess = await this.authService.verifyAccessToken(accessToken);
    if (verifedAccess) {
      (req as any).user = verifedAccess;
      (req as any).accessToken = accessToken;
      return true;
    }

    const verifedRefresh =
      await this.authService.verifyRefreshToken(refreshToken);
    if (verifedRefresh) {
      // Get user by refresh
      const user = await this.authService.getUser({
        email: verifedRefresh.email,
      });

      // Generate new access token
      const newAccessToken = await this.authService.generateAccessToken(user);

      // Add them to request
      (req as any).user = verifedRefresh;
      (req as any).accessToken = newAccessToken;
      return true;
    }

    return false;
  }
}
