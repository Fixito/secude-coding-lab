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

  //! VULNERABLE — A02 : Cryptographic Failures
  // Les mots de passe sont stockés en clair dans la base de données.
  // Toute personne ayant accès à la DB (dump, sauvegarde exposée…) peut les lire directement.
  // Il n'y a ni salt, ni facteur de coût, ni hachage.
  const plainPassword = '123secret';

  await db.insert(usersTable).values([
    {
      email: 'john.doe@example.com',
      password: plainPassword,
    },
    {
      email: 'jane.smith@example.com',
      password: plainPassword,
    },
  ]);

  await db.insert(commentsTable).values([{ content: 'First.' }, { content: 'Hello World!' }]);

  console.log('Database seeded.');
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
