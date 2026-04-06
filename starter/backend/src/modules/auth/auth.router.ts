import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';

import { env } from '@/config/env.js';
import { db } from '@/db/client.js';
import { UnauthorizedError } from '@/errors/index.js';
import { validate } from '@/middlewares/validate.middleware.js';
import { loginSchema } from './auth.schema.js';

export function createAuthRouter() {
  const router = Router();

  router.post('/login', validate(loginSchema), async (req, res) => {
    const { email, password } = req.body;

    //! VULNERABLE — A03 : Injection SQL
    // La concaténation directe de l'entrée utilisateur dans la requête SQL
    // permet à un attaquant d'altérer la logique de la requête.

    // Exemple d'exploit : email = "' OR '1'='1" → retourne tous les utilisateurs.

    const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;
    const result = await db.run(query);
    const user = result.rows[0];

    //! VULNERABLE — A02 : Cryptographic Failures
    // Même avec des requêtes paramétrées, comparer les mots de passe en clair
    // est dangereux : une fuite de la base de données expose immédiatement
    // tous les mots de passe. Il n'y a ni salt, ni facteur de coût.

    if (!user || user['password'] !== password)
      throw new UnauthorizedError('Invalid email or password');

    // Génération du JWT après authentification réussie.
    // Le token contient l'identité de l'utilisateur (userId, email) et expire dans 1h.
    // Il sera requis pour accéder aux routes protégées (ex. GET /api/v1/users/:id).
    const token = jwt.sign({ userId: user['id'], email: user['email'] }, env.JWT_SECRET, {
      expiresIn: '1h',
    });

    return res.status(StatusCodes.OK).json({ data: { token } });
  });

  // Simule un login pour démontrer la vulnérabilité de session fixation.
  //! VULNERABLE — Session Fixation
  // Le cookie de session est défini sans HttpOnly (lisible par JS),
  // sans Secure (transmis en HTTP clair) et sans SameSite (CSRF facilité).
  // De plus, la valeur est statique — elle ne change pas après authentification.
  router.get('/login', (_req, res) => {
    res.cookie('session', 'user123');
    res.status(StatusCodes.OK).send('Logged in');
  });

  return router;
}

export const authRouter = createAuthRouter();
