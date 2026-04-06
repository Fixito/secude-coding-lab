import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import { db } from '@/db/client.js';
import { commentsTable } from '@/db/schemas/comment.schema.js';
import { validate } from '@/middlewares/validate.middleware.js';

import { commentSchema } from './comment.schema.js';

const router = Router();

function createCommentRouter() {
  router.post('/', validate(commentSchema), async (req, res) => {
    const { content } = req.body;

    const newComment = await db.insert(commentsTable).values({ content }).returning();

    return res.status(StatusCodes.CREATED).json({ data: newComment[0] });
  });

  router.get('/', async (_req, res) => {
    const comments = await db.select().from(commentsTable);

    //! VULNERABLE CODE - XSS
    return res.status(StatusCodes.OK).send(comments.map((c) => `<p>${c.content}</p>`).join(''));
  });

  return router;
}

export const commentRouter = createCommentRouter();
