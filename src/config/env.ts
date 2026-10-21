import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce
    .number({ error: 'must be a number' })
    .int()
    .min(1)
    .max(65535)
    .default(3000),
  DATABASE_URL: z
    .string({ error: 'is required' })
    .regex(/^postgres(ql)?:\/\//, 'must start with postgresql://'),
  REDIS_URL: z
    .string({ error: 'is required' })
    .regex(/^redis:\/\//, 'must start with redis://'),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new Error(`Invalid environment: ${problems.join('; ')}`);
  }
  return result.data;
}
