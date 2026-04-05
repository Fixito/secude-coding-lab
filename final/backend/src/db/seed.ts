import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/libsql';

import { env } from '@/config/env.js';

import { commentsTable } from './schemas/comment.schema.js';
import { usersTable } from './schemas/user.schema.js';

const db = drizzle(env.DB_FILE_NAME);

async function main() {
  await db.delete(usersTable);
  await db.run("DELETE FROM sqlite_sequence WHERE name = 'users'");

  await db.delete(commentsTable);
  await db.run("DELETE FROM sqlite_sequence WHERE name = 'comments'");

  console.log('Database reset.');

  // Les mots de passe sont hashés avec bcrypt (salt factor 12).
  // Stocker des mots de passe en clair en base (A02) permettrait à toute
  // personne ayant accès à la DB de les lire directement.
  const hashedPassword = await bcrypt.hash('123secret', 12);

  await db.insert(usersTable).values([
    {
      email: 'john.doe@example.com',
      password: hashedPassword,
    },
    {
      email: 'jane.smith@example.com',
      password: hashedPassword,
    },
  ]);

  await db.insert(commentsTable).values([{ content: 'First.' }, { content: 'Hello World!' }]);

  console.log('Database seeded.');
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
