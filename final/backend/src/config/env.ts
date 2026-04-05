import z from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  HOSTNAME: z.string().default('localhost'),
  DB_FILE_NAME: z.string().default('file:local.db'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET doit faire au moins 32 caractères'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables:', z.treeifyError(parsedEnv.error));
  process.exit(1);
}

export const env = parsedEnv.data as z.infer<typeof envSchema>;
