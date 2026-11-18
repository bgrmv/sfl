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

// Invitation link and Google sign-in by redirect (S8.13, ADR 0021)
export const INVITATION_TTL_MS = 24 * 60 * 60 * 1000;
/** How long the user has to come back from the Google page. */
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
export const OAUTH_STATE_COOKIE = 'oauthState';
export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
export const GOOGLE_ISSUERS = [
  'https://accounts.google.com',
  'accounts.google.com',
];
