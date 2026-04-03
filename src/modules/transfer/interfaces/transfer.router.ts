import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';

export function createTransferRouter() {
  const router = Router();

  router.post('/', (_req, res) => {
    res.status(StatusCodes.OK).json({ message: 'Transfer done.' });
  });

  return router;
}

export const transferRouter = createTransferRouter();
