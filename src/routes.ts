import { Router } from 'express';

import { authRouter } from './modules/auth/interfaces/auth.router.js';
import { commentRouter } from './modules/comment/interfaces/comment.router.js';
import { transferRouter } from './modules/transfer/interfaces/transfer.router.js';

export const router = Router();

router.use('/auth', authRouter);
router.use('/comments', commentRouter);
router.use('/transfers', transferRouter);
