import cors from 'cors';
import express, { Express } from 'express';
import helmet from 'helmet';
import { pino } from 'pino';

import errorHandler from '@/common/middleware/errorHandler';
// import rateLimiter from '@/common/middleware/rateLimiter';
import requestLogger from '@/common/middleware/requestLogger';

var multer = require('multer');
import { env } from '@/common/utils/envConfig';
import { healthCheckRouter } from '@/routes/healthCheck/healthCheckRouter';

import { generateRouteFactoryWithOpenApi } from './generator/generateRouteFactoryWithOpenApi';
import { UserRoute } from './routes/user/userRouter';

export const logger = pino({ name: 'server start' });
export const app: Express = express();

// Set the application to trust the reverse proxy
app.set('trust proxy', true);
var upload = multer();

// Middlewares
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(helmet());
app.use(express.json());
app.use(upload.array('files'));
// app.use(rateLimiter);

// Request logging
app.use(requestLogger());

// Routes
app.use('/health-check', healthCheckRouter);
generateRouteFactoryWithOpenApi([UserRoute]);
// Swagger UI

// Error handlers
app.use(errorHandler());
logger.info(`End of setup.`);
