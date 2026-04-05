import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

import { env } from '@/config/env.js';

const client = createClient({ url: env.DB_FILE_NAME });
export const db = drizzle({ client });
