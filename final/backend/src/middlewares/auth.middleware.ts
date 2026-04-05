import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';

import { env } from '@/config/env.js';
import { UnauthorizedError } from '@/errors/index.js';

export interface JwtPayload {
  userId: number;
  email: string;
}

// Extension du type Request Express pour y attacher l'utilisateur authentifié.
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// Middleware d'authentification : vérifie la présence et la validité du JWT
// transmis dans l'en-tête Authorization (format : "Bearer <token>").
// Si le token est absent ou invalide, la requête est rejetée avec un 401.
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token manquant');
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    throw new UnauthorizedError('Token invalide ou expiré');
  }
}
