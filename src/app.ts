import express from 'express';
import morgan from 'morgan';

import { router } from './routes.js';

import { errorHandler } from './shared/middlewares/error.middleware.js';
import { notFoundHandler } from './shared/middlewares/not-found.middleware.js';

export const app = express();

app.use(morgan('dev'));
app.use(express.json());

app.use('/api/v1', router);

app.use(errorHandler);
app.use(notFoundHandler);
