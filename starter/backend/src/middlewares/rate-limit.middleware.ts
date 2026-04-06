import { rateLimit } from 'express-rate-limit';

export function createRateLimiter(max: number, windowMs: number, message: string) {
  return rateLimit({
    max,
    windowMs,
    message: { title: 'Too Many Requests', status: 429, detail: message },
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  });
}

// Limiteur spécifique pour les tentatives de connexion.
//
//! VULNERABLE — A07 : Identification and Authentication Failures
// Sans rate limiting, un attaquant peut tester des milliers de combinaisons
// email/mot de passe par seconde (attaque par force brute ou credential stuffing).
// Exemple : 1 000 000 combinaisons en ~10 minutes avec un script curl basique.
//
