import { Router } from 'express';

import { authRouter } from './modules/auth/auth.router.js';
import { commentRouter } from './modules/comment/comment.router.js';
import { transferRouter } from './modules/transfer/transfer.router.js';
import { usersRouter } from './modules/users/users.router.js';

export const router = Router();

router.use('/auth', authRouter);
router.use('/comments', commentRouter);
router.use('/transfers', transferRouter);
router.use('/users', usersRouter);
