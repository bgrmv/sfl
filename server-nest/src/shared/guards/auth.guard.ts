import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

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
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers.authorization;
    const accessToken = authHeader && authHeader.split(' ')[1];
    const refreshToken = (req.cookies as any)?.refreshToken;

    if (!accessToken && !refreshToken) {
      throw new UnauthorizedException();
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

    throw new UnauthorizedException();
  }
}
