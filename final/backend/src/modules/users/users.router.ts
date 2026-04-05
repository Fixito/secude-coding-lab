import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import { usersTable } from '@/db/schemas/user.schema.js';
import { db } from '@/db/client.js';
import { ForbiddenError, NotFoundError } from '@/errors/index.js';
import { requireAuth } from '@/middlewares/auth.middleware.js';
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
  // router.get('/:id', requireAuth, validate(userParamsSchema, 'params'), async (req, res) => {
  //   const { id } = req.params;
  //   const user = await db.select({ id: usersTable.id, email: usersTable.email })
  //     .from(usersTable).where(eq(usersTable.id, Number(id)));
  //   if (!user[0]) return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found' });
  //   return res.status(StatusCodes.OK).json({ data: user[0] });
  // });

  //* SECURE — A01 : Vérification que l'utilisateur accède à sa propre ressource
  // Après avoir vérifié le JWT (requireAuth), on compare l'ID demandé avec
  // l'ID contenu dans le token. Un utilisateur ne peut accéder qu'à son propre profil.
  // Pour des rôles admin, on étendrait cette logique avec une vérification de permission.
  router.get('/:id', requireAuth, validate(userParamsSchema, 'params'), async (req, res) => {
    const { id } = req.params as unknown as { id: number };

    if (req.user!.userId !== id) {
      throw new ForbiddenError("You don't have permission to access this resource");
    }

    const result = await db
      .select({ id: usersTable.id, email: usersTable.email, createdAt: usersTable.createdAt })
      .from(usersTable)
      .where(eq(usersTable.id, id));

    if (!result[0]) {
      throw new NotFoundError('User');
    }

    return res.status(StatusCodes.OK).json({ data: result[0] });
  });

  return router;
}

export const usersRouter = createUsersRouter();
