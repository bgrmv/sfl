import { SetMetadata } from '@nestjs/common';

import { EnumRole } from '../../entities/roles/constants';

export const ROLES_KEY = 'roles';

/**
 * Roles allowed to call a route (or a whole controller).
 * - not set: only ADMIN (closed by default, a new route is never open by accident);
 * - `@Roles()` without arguments: any signed-in user;
 * - `@Roles(EnumRole.Moderator)`: the listed roles (ADMIN is not implied).
 */
export const Roles = (...roles: EnumRole[]) => SetMetadata(ROLES_KEY, roles);
