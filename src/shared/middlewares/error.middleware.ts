import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { ZodError } from 'zod';
import type { NextFunction, Request, Response } from 'express';

import { env } from '@/config/env.js';

interface HttpError extends Error {
  statusCode?: number;
}

export function errorHandler(err: HttpError, req: Request, res: Response, _next: NextFunction) {
  res.setHeader('Content-Type', 'application/problem+json');

  if (err instanceof ZodError) {
    console.warn(
      {
        issues: err.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
      'Validation failed',
    );

    return res.status(StatusCodes.BAD_REQUEST).json({
      title: getReasonPhrase(StatusCodes.BAD_REQUEST),
      status: StatusCodes.BAD_REQUEST,
      detail: 'Validation failed',
      instance: req.originalUrl,
      errors: err.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  const statusCode = err.statusCode ?? StatusCodes.INTERNAL_SERVER_ERROR;

  const detail =
    statusCode === StatusCodes.INTERNAL_SERVER_ERROR && env.NODE_ENV !== 'development'
      ? 'An unexpected error occurred'
      : err.message;

  console.error({ err, method: req.method, url: req.originalUrl, statusCode }, 'Request failed');

  return res.status(statusCode).json({
    title: getReasonPhrase(statusCode),
    status: statusCode,
    detail,
    instance: req.originalUrl,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
