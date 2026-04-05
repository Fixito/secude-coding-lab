import type { NextFunction, Request, Response } from 'express';
import type { z } from 'zod';

export function validate(schema: z.ZodType, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return next(result.error);
    }

    req[source] = result.data;

    next();
  };
}
