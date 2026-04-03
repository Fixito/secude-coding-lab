import { drizzle } from 'drizzle-orm/libsql';

import { env } from '@/config/env.js';
import { usersTable } from './schemas/user.schema.js';
import { commentsTable } from './schemas/comment.schema.js';

const db = drizzle(env.DB_FILE_NAME);

async function main() {
  await db.delete(usersTable);
  await db.run("DELETE FROM sqlite_sequence WHERE name = 'users'");

  await db.delete(commentsTable);
  await db.run("DELETE FROM sqlite_sequence WHERE name = 'comments'");

  console.log('Database reset.');

  await db.insert(usersTable).values([
    {
      email: 'john.doe@example.com',
      password: '123secret',
    },
  ]);

  await db.insert(commentsTable).values([{ content: 'First.' }, { content: 'Hello World!' }]);

  console.log('Database seeded.');
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
