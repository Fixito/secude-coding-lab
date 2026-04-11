import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';

import { env } from '@/config/env.js';
import { db } from '@/db/client.js';
import { usersTable } from '@/db/schemas/user.schema.js';
import { UnauthorizedError } from '@/errors/index.js';
import { loginRateLimiter } from '@/middlewares/rate-limit.middleware.js';
import { validate } from '@/middlewares/validate.middleware.js';

import { loginSchema } from './auth.schema.js';

export function createAuthRouter() {
  const router = Router();

  router.post('/login', loginRateLimiter, validate(loginSchema), async (req, res) => {
    const { email, password } = req.body;

    //! VULNERABLE — A05 : Injection SQL
    // La concaténation directe de l'entrée utilisateur dans la requête SQL
    // permet à un attaquant d'altérer la logique de la requête.

    // Exemple d'exploit : email = "' OR '1'='1" → retourne tous les utilisateurs.

    // const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;
    // const result = await db.run(query);
    // const user = result.rows[0];

    //! VULNERABLE — A04 : Cryptographic Failures
    // Même avec des requêtes paramétrées, comparer les mots de passe en clair
    // est dangereux : une fuite de la base de données expose immédiatement
    // tous les mots de passe. Il n'y a ni salt, ni facteur de coût.

    // const result = await db.select().from(usersTable).where(eq(usersTable.email, email));
    // const user = result[0];
    // if (!user || user.password !== password) throw new UnauthorizedError('Invalid email or password');

    //* SECURE — A05 : Requêtes paramétrées via l'ORM
    // Drizzle génère des requêtes préparées (prepared statements) : les valeurs
    // sont transmises séparément de la requête, rendant toute injection impossible.

    //* SECURE — A04 : Comparaison avec argon2
    // On récupère d'abord l'utilisateur par email, puis on vérifie le mot de passe
    // avec argon2.verify(). argon2 intègre un salt unique par hash et un facteur
    // de coût (memory cost) qui rend les attaques par force brute très coûteuses.
    const result = await db.select().from(usersTable).where(eq(usersTable.email, email));
    const user = result[0];

    const isPasswordValid = user ? await argon2.verify(user.password, password) : false;

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Génération du JWT après authentification réussie.
    // Le token contient l'identité de l'utilisateur (userId, email) et expire dans 1h.
    // Il sera requis pour accéder aux routes protégées (ex. GET /api/v1/users/:id).
    const token = jwt.sign({ userId: user!.id, email: user!.email }, env.JWT_SECRET, {
      expiresIn: '1h',
    });

    return res.status(StatusCodes.OK).json({ data: { token } });
  });

  return router;
}

export const authRouter = createAuthRouter();
