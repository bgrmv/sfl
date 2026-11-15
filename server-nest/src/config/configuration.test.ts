import configuration from './configuration';

const ENV = {
  STAGE: 'test',
  DATABASE_URL: 'mongodb://localhost:27017',
  DATABASE_DB: 'sfl',
  CLIENT_HOSTNAME: 'http://localhost',
  CLIENT_PORT: '4200',
  ACCESS_TOKEN_SECRET: 'a'.repeat(32),
  REFRESH_TOKEN_SECRET: 'b'.repeat(32),
};

describe('configuration: JWT secrets (S8.12)', () => {
  const before = { ...process.env };
  afterEach(() => {
    process.env = { ...before };
  });

  const load = (overrides: Record<string, string> = {}) => {
    process.env = { ...before, ...ENV, ...overrides };
    return configuration();
  };

  it('accepts two different secrets of 32 characters', () => {
    expect(load().ACCESS_TOKEN_SECRET).toBe(ENV.ACCESS_TOKEN_SECRET);
  });

  it('refuses a short access secret', () => {
    expect(() => load({ ACCESS_TOKEN_SECRET: 'a'.repeat(31) })).toThrow(
      /at least 32/,
    );
  });

  it('refuses a short refresh secret', () => {
    expect(() => load({ REFRESH_TOKEN_SECRET: 'short' })).toThrow(
      /at least 32/,
    );
  });

  it('refuses the same secret for both tokens', () => {
    expect(() =>
      load({
        ACCESS_TOKEN_SECRET: 'c'.repeat(40),
        REFRESH_TOKEN_SECRET: 'c'.repeat(40),
      }),
    ).toThrow(/different/);
  });

  it('does not put a secret into the message', () => {
    expect(() => load({ ACCESS_TOKEN_SECRET: 'sEcReT' })).toThrow(
      expect.objectContaining({
        message: expect.not.stringContaining('sEcReT'),
      }),
    );
  });
});
