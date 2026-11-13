import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { EnumRole } from '../../entities/roles/constants';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

// Runs after AuthGuard, which puts the token payload into `req.user`.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const required = this.reflector.getAllAndOverride<EnumRole[] | undefined>(
      ROLES_KEY,
      targets,
    ) ?? [EnumRole.Admin];

    if (required.length === 0) {
      return true;
    }

    const roles: string[] =
      (context.switchToHttp().getRequest<Request>() as any).user?.roles ?? [];

    if (required.some(role => roles.includes(role))) {
      return true;
    }

    throw new ForbiddenException();
  }
}
