import type { Request, Response } from 'express';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

export function notFoundHandler(req: Request, res: Response) {
  res
    .setHeader('Content-Type', 'application/problem+json')
    .status(StatusCodes.NOT_FOUND)
    .json({
      title: getReasonPhrase(StatusCodes.NOT_FOUND),
      status: StatusCodes.NOT_FOUND,
      detail: `Route ${req.method} ${req.originalUrl} not found`,
    });
}
