// Claims every token of the API carries and every check requires (S8.12).
// The audiences differ, so a refresh token never passes as an access token.
export const JWT_ALGORITHM = 'HS512' as const;
export const JWT_ISSUER = 'sfl-api';
export const ACCESS_AUDIENCE = 'sfl-access';
export const REFRESH_AUDIENCE = 'sfl-refresh';

export const MIN_SECRET_LENGTH = 32;

/** Lifetime of a refresh token, and of a session after its last refresh. */
export const REFRESH_TTL_SECONDS = 24 * 60 * 60;

/** The token before the current one still works this long: two tabs may refresh at once. */
export const REFRESH_GRACE_SECONDS = 10;
