import type { NextFunction, Request, Response } from 'express';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { ZodError } from 'zod';

import { env } from '@/config/env.js';
import { logger } from '@/config/logger.js';
import { AppError } from '@/errors/index.js';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  res.setHeader('Content-Type', 'application/problem+json');

  if (err instanceof ZodError) {
    const errors = err.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    logger.warn({ issues: errors, url: req.originalUrl }, 'Validation failed');

    return res.status(StatusCodes.BAD_REQUEST).json({
      title: getReasonPhrase(StatusCodes.BAD_REQUEST),
      status: StatusCodes.BAD_REQUEST,
      detail: 'Validation failed',
      instance: req.originalUrl,
      errors,
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  const statusCode = err instanceof AppError ? err.statusCode : StatusCodes.INTERNAL_SERVER_ERROR;

  const detail =
    statusCode === StatusCodes.INTERNAL_SERVER_ERROR && env.NODE_ENV !== 'development'
      ? 'An unexpected error occurred'
      : err.message;

  logger.error({ err, method: req.method, url: req.originalUrl, statusCode }, 'Request failed');

  return res.status(statusCode).json({
    title: getReasonPhrase(statusCode),
    status: statusCode,
    detail,
    instance: req.originalUrl,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
