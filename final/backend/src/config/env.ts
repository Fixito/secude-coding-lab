import z from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  HOSTNAME: z.string().default('localhost'),
  FRONTEND_URL: z.url().default('http://localhost:5173'),
  DB_FILE_NAME: z.string().default('file:local.db'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  COOKIE_SECRET: z.string().min(32, 'COOKIE_SECRET must be at least 32 characters long'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables:', z.treeifyError(parsedEnv.error));
  process.exit(1);
}

export const env = parsedEnv.data as z.infer<typeof envSchema>;
