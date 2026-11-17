import { cleanEnv, num, str } from 'envalid';
import { MIN_SECRET_LENGTH } from '../entities/auth/auth.constants';

export default () => {
  const env = cleanEnv(process.env, {
    STAGE: str(),

    DATABASE_URL: str(),
    DATABASE_DB: str(),

    PORT: num({ default: 3001 }), // Server PORT
    CLIENT_HOSTNAME: str(),
    CLIENT_PORT: num(),

    // Where the uploaded photos are kept (S10.19); a volume in production
    MEDIA_DIR: str({ default: './_media' }),

    // Comments of visitors: a few per address in a window (S10.22)
    COMMENT_LIMIT: num({ default: 3 }),
    COMMENT_WINDOW_SEC: num({ default: 300 }),

    ACCESS_TOKEN_SECRET: str(),
    REFRESH_TOKEN_SECRET: str(),

    // Rate limits (S8.11). Sign-in is strict, the rest of the API is soft.
    SIGN_IN_LIMIT: num({ default: 5 }), // attempts per window, per IP and per email
    SIGN_IN_WINDOW_SEC: num({ default: 60 }),
    API_LIMIT: num({ default: 300 }), // requests per window, per IP
    API_WINDOW_SEC: num({ default: 60 }),
  });

  // A weak or shared secret makes tokens forgeable, so the app does not start (S8.12)
  const { ACCESS_TOKEN_SECRET: access, REFRESH_TOKEN_SECRET: refresh } = env;
  if (access.length < MIN_SECRET_LENGTH || refresh.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be at least ${MIN_SECRET_LENGTH} characters`,
    );
  }
  if (access === refresh) {
    throw new Error(
      'ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be different',
    );
  }

  return { ...env };
};
