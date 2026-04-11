import type { NextFunction, Request, Response } from 'express';
import type { z } from 'zod';

type Source = 'body' | 'query' | 'params';

export function validate(schema: z.ZodType, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return next(result.error);
    }

    req[source] = result.data;

    next();
  };
}
