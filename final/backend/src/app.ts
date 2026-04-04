import crypto from 'node:crypto';
import cookieParser from 'cookie-parser';
import express from 'express';
import morgan from 'morgan';

import { env } from './config/env.js';
import { router } from './routes.js';

import { errorHandler } from './middlewares/error.middleware.js';
import { notFoundHandler } from './middlewares/not-found.middleware.js';

export const app = express();

app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

app.use('/api/v1', router);

app.get('/form', (_req, res) => {
  const csrfToken = crypto.randomBytes(32).toString('hex');

  res.cookie('csrf', csrfToken);

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
