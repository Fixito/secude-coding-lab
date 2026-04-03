import escape from 'escape-html';
import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import { commentsTable } from '@/infrastructure/db/schemas/comment.schema.js';
import { db } from '@/infrastructure/db/drizzle.client.js';
import { validate } from '@/shared/middlewares/validate.middleware.js';
import { commentSchema } from '../application/comment.dt.js';

const router = Router();

function createCommentRouter() {
  router.post('/', validate(commentSchema), async (req, res) => {
    const { content } = req.body;

    const newComment = await db.insert(commentsTable).values({ content }).returning();

    return res.status(StatusCodes.CREATED).json({ data: newComment });
  });

  router.get('/', async (_req, res) => {
    const comments = await db.select().from(commentsTable);

    //! VULNERABLE CODE - XSS
    // return res.send(comments.map((c) => `<p>${c.content}</p>`).join(''));

    return res.send(comments.map((c) => `<p>${escape(c.content)}</p>`).join(''));
  });

  return router;
}

export const commentRouter = createCommentRouter();
