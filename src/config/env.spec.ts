import { parseEnv } from './env.js';

const valid = {
  DATABASE_URL: 'postgresql://fm:fm@localhost:5432/fm',
  REDIS_URL: 'redis://localhost:6380',
};

describe('parseEnv', () => {
  it('returns typed values for valid env', () => {
    const env = parseEnv({ ...valid, PORT: '4000' });

    expect(env.PORT).toBe(4000);
    expect(env.DATABASE_URL).toBe(valid.DATABASE_URL);
  });

  it('fills in defaults for NODE_ENV and PORT', () => {
    const env = parseEnv(valid);

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
  });

  it('defaults FPL_BASE_URL to the real FPL API', () => {
    const env = parseEnv(valid);

    expect(env.FPL_BASE_URL).toBe('https://fantasy.premierleague.com/api/');
  });

  it('rejects an FPL_BASE_URL without a trailing slash', () => {
    expect(() =>
      parseEnv({ ...valid, FPL_BASE_URL: 'https://example.com/api' }),
    ).toThrow('FPL_BASE_URL');
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() => parseEnv({ REDIS_URL: valid.REDIS_URL })).toThrow(
      'DATABASE_URL',
    );
  });

  it('reports every problem in one error', () => {
    const run = () => parseEnv({ ...valid, PORT: 'abc', REDIS_URL: undefined });

    expect(run).toThrow('PORT');
    expect(run).toThrow('REDIS_URL');
  });
});
