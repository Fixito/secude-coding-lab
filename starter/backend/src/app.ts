import crypto from 'node:crypto';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { pinoHttp } from 'pino-http';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { notFoundHandler } from './middlewares/not-found.middleware.js';
import { router } from './routes.js';

export const app = express();

//! VULNERABLE — A02 : Security Misconfiguration — CORS trop permissif
// Sans configuration, Express n'envoie pas d'en-tête CORS et toute requête
// cross-origin est bloquée par le navigateur. Mais si on utilise cors() sans
// option, toutes les origines sont autorisées (*), ce qui permet à n'importe
// quel site malveillant de faire des requêtes authentifiées à l'API.
app.use(cors());

//! VULNERABLE — A02 : Security Misconfiguration — Headers HTTP manquants
// Sans helmet, Express expose des informations sensibles (X-Powered-By: Express)
// et n'envoie pas les en-têtes de sécurité recommandés, laissant le navigateur
// sans protection contre le clickjacking, le sniffing MIME, les injections XSS, etc.

app.use(
  pinoHttp({
    logger,
    serializers: {
      req: (req) => ({ method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/', (_req, res) => {
  res.json({ message: 'Sécurité des applications web & OWASP' });
});

app.use('/api/v1', router);

app.get('/form', (_req, res) => {
  const csrfToken = crypto.randomBytes(32).toString('hex');

  res.cookie('csrf', csrfToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
    signed: true,
  });

  res.send(`
    <form method="POST" action="/api/v1/transfers">
      <div>
        <input type="text" name="csrf" value="${csrfToken}" />
      </div>
      <br />
      <div>
        <label for="username">Nom d'utilisateur :</label>
        <br />
        <input type="text" name="username" id="username" value="John" />
      </div>
      <br />
      <button type="submit">Payer</button>
    </form>
	`);
});

app.use(errorHandler);
app.use(notFoundHandler);
