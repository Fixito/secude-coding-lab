import { and, eq } from 'drizzle-orm';
import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import { db } from '../../../infrastructure/db/drizzle.client.js';
import { usersTable } from '../../../infrastructure/db/schemas/user.schema.js';

export function createAuthRouter() {
  const router = Router();

  router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;
    // const result = await db.run(query);
    // const user = result.rows[0];

    const result = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.email, email), eq(usersTable.password, password)));

    const user = result[0];

    if (!user) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid credentials' });

    return res.status(StatusCodes.OK).json({ message: 'Logged in' });
  });

  return router;
}

export const authRouter = createAuthRouter();
