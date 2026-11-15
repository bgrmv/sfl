import { cleanEnv, num, str } from 'envalid';

export default () => {
  const env = cleanEnv(process.env, {
    STAGE: str(),

    DATABASE_URL: str(),
    DATABASE_DB: str(),

    PORT: num({ default: 3001 }), // Server PORT
    CLIENT_HOSTNAME: str(),
    CLIENT_PORT: num(),

    ACCESS_TOKEN_SECRET: str(),
    REFRESH_TOKEN_SECRET: str(),

    // Rate limits (S8.11). Sign-in is strict, the rest of the API is soft.
    SIGN_IN_LIMIT: num({ default: 5 }), // attempts per window, per IP and per email
    SIGN_IN_WINDOW_SEC: num({ default: 60 }),
    API_LIMIT: num({ default: 300 }), // requests per window, per IP
    API_WINDOW_SEC: num({ default: 60 }),
  });

  return { ...env };
};
