import { defineConfig } from 'drizzle-kit';

import { env } from './src/config/env.js';

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schemas',
  dialect: 'sqlite',
  dbCredentials: {
    url: env.DB_FILE_NAME,
  },
});
