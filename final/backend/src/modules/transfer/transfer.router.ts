import { timingSafeEqual } from 'node:crypto';

import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import { ForbiddenError } from '@/errors/index.js';

function safeCompare(left: unknown, right: unknown): boolean {
  if (typeof left !== 'string' || typeof right !== 'string') {
    return false;
  }

  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function createTransferRouter() {
  const router = Router();

  router.post('/', (req, res) => {
    //! VULNERABLE — A01 : CSRF (Cross-Site Request Forgery)
    // Sans vérification, n'importe quel site tiers peut soumettre ce formulaire
    // au nom d'un utilisateur authentifié. Un simple lien malveillant suffit :
    // <img src="http://bank.com/api/v1/transfers?to=attacker&amount=1000" />
    // console.log('🚀 ~ createTransferRouter ~ req.signedCookies:', req.signedCookies);

    //* SECURE — Double Submit Cookie Pattern
    // Le token CSRF est généré côté serveur, envoyé dans un cookie ET dans le
    // corps du formulaire. Seul le site légitime (qui peut lire son propre cookie)
    // peut construire une requête valide. Un site tiers ne peut pas lire ce cookie
    // (politique Same-Origin du navigateur).
    const token = req.body.csrf;
    const expected = req.signedCookies.csrf;

    if (!safeCompare(token, expected)) {
      throw new ForbiddenError('Invalid CSRF token');
    }

    return res.status(StatusCodes.OK).json({ data: { message: 'Transfer done.' } });
  });

  return router;
}

export const transferRouter = createTransferRouter();
