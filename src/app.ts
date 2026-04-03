import express from 'express';
import morgan from 'morgan';

import { env } from './config/env.js';
import { router } from './routes.js';

import { errorHandler } from './shared/middlewares/error.middleware.js';
import { notFoundHandler } from './shared/middlewares/not-found.middleware.js';

export const app = express();

app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json());

app.use('/api/v1', router);

app.use(errorHandler);
app.use(notFoundHandler);
