import { Router } from 'express';

import { authRouter } from './modules/auth/interfaces/auth.router.js';

export const router = Router();

router.use('/auth', authRouter);
