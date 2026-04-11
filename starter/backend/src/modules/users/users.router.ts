import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import { db } from '@/db/client.js';
import { usersTable } from '@/db/schemas/user.schema.js';
import { validate } from '@/middlewares/validate.middleware.js';

import { userParamsSchema } from './users.schema.js';

export function createUsersRouter() {
  const router = Router();

  // GET /api/v1/users/:id — Récupère le profil d'un utilisateur par son ID.
  //
  //! VULNERABLE — A01 : Broken Access Control / IDOR
  // (Insecure Direct Object Reference)
  // Le endpoint retourne les données de n'importe quel utilisateur sans vérifier
  // si l'appelant est bien cet utilisateur. Un attaquant authentifié peut donc
  // accéder aux profils de tous les autres en incrémentant l'ID dans l'URL :
  //   GET /api/v1/users/1  (lui-même) → OK
  //   GET /api/v1/users/2  (quelqu'un d'autre) → aussi OK, c'est le problème
  //
  // Pour tester : se connecter en tant que john.doe@example.com, récupérer son
  // token JWT, puis appeler GET /api/v1/users/2 avec ce token → vous voyez
  // le profil de jane.smith@example.com.
  //
  router.get('/:id', validate(userParamsSchema, 'params'), async (req, res) => {
    const { id } = req.params as unknown as { id: number };

    const user = await db
      .select({ id: usersTable.id, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, id));

    if (!user[0]) return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found' });

    return res.status(StatusCodes.OK).json({ data: user[0] });
  });

  return router;
}

export const usersRouter = createUsersRouter();
