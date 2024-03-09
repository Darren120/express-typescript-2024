import {
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi';
import express, { Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';

import {
  healthCheckRegistry,
  healthCheckRouter,
} from '@/routes/healthCheck/healthCheckRouter';
import { app, logger } from '@/server';

import { AddRouteAndDocument } from './AddRouteAndDocument';

export const generateRouteFactoryWithOpenApi = (
  routes: AddRouteAndDocument<any>[]
) => {
  app.use('/health-check', healthCheckRouter);
  logger.info(`Route: /health-check deployed`);
  routes.forEach((route) => {
    logger.info(`Route: ${route.baseRoute} deployed`);
    app.use(route.baseRoute, route.router);
  });
  const registry = new OpenAPIRegistry([
    healthCheckRegistry,
    ...routes.map((x) => x.registry),
  ]);
  const generator = new OpenApiGeneratorV3(registry.definitions);
  const apiDocument = generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Swagger API',
    },
    externalDocs: {
      description: 'View the raw OpenAPI Specification in JSON format',
      url: '/swagger.json',
    },
  });
  const openApiRouter = express.Router();

  openApiRouter.get('/swagger.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(apiDocument);
  });

  openApiRouter.use('/swagger', swaggerUi.serve, swaggerUi.setup(apiDocument));
  app.use(openApiRouter);
  logger.info(`Swagger UI on : /swagger`);
  logger.info(`Swagger JSON on : /swagger.json`);
};
