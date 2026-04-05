import { z } from 'zod';

export const userParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});
