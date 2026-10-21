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
