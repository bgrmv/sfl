import { EnumRole } from '../../roles/constants';

type PlayerLike = { toJSON?: () => any; user?: any } & Record<string, any>;

/** What anyone may see about the person behind a player (S8.10). */
const publicUser = (user: any) =>
  user && typeof user === 'object'
    ? { name: user.name, avatar: user.avatar }
    : user;

// `req.user` is the token payload put there by AuthGuard
export const isAdmin = (req: object): boolean =>
  (req as { user?: { roles?: string[] } }).user?.roles?.includes(
    EnumRole.Admin,
  ) ?? false;

/**
 * Public requests get no email, surname, age or user id; an ADMIN gets the full
 * record (the edit and details screens need it). The password and roles are
 * removed by the user schema for everybody.
 */
export function presentPlayer<T extends PlayerLike>(player: T, admin: boolean) {
  const json = typeof player.toJSON === 'function' ? player.toJSON() : player;

  return admin ? json : { ...json, user: publicUser(json.user) };
}
