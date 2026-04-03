import { ForbiddenError } from '@/shared/errors/index.js';
import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';

export function createTransferRouter() {
  const router = Router();

  router.post('/', (req, res) => {
    //! VULNERABLE CODE - CSRF
    // console.log(req.cookies);

    //* CSRF Protection
    const token = req.body.csrf;
    const expected = req.cookies.csrf;

    if (token !== expected) {
      throw new ForbiddenError('Invalid CSRF token');
    }

    return res.status(StatusCodes.OK).json({ message: 'Transfer done.' });
  });

  return router;
}

export const transferRouter = createTransferRouter();
