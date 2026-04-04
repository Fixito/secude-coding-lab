import { and, eq } from 'drizzle-orm';
import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import { usersTable } from '@/db/schemas/user.schema.js';
import { db } from '@/db/client.js';
import { UnauthorizedError } from '@/errors/index.js';
import { validate } from '@/middlewares/validate.middleware.js';
import { loginSchema } from './auth.schema.js';

export function createAuthRouter() {
  const router = Router();

  router.post('/login', validate(loginSchema), async (req, res) => {
    const { email, password } = req.body;

    //! VULNERABLE CODE - SQL INJECTION
    // const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;
    // const result = await db.run(query);
    // const user = result.rows[0];

    const result = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.email, email), eq(usersTable.password, password)));

    const user = result[0];

    if (!user) throw new UnauthorizedError('Invalid email or password');

    return res.status(StatusCodes.OK).json({ message: 'Logged in' });
  });

  // Simule un login pour démontrer la vulnérabilité de session fixation
  router.get('/login', (_req, res) => {
    res.cookie('session', 'user123');
    res.send('Logged in');
  });

  return router;
}

export const authRouter = createAuthRouter();
