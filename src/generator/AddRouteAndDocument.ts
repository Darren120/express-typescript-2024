import {
  OpenAPIRegistry,
  ZodRequestBody,
} from '@asteasolutions/zod-to-openapi';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import express, { Request, Response } from 'express';
import { z } from 'zod';

import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import { ServiceResponse } from '@/common/models/serviceResponse';
import { handleServiceResponse } from '@/common/utils/httpHandlers';
extendZodWithOpenApi(z);
export class AddRouteAndDocument<BaseSchema extends z.AnyZodObject> {
  private name: string;
  private baseSchema: BaseSchema;
  public readonly baseRoute: string;
  public readonly router = express.Router();
  public readonly registry = new OpenAPIRegistry();

  private routePaths: string[] = [];
  constructor({
    baseRoute,
    baseSchema,
    name,
  }: {
    name: string;
    baseSchema: BaseSchema;
    baseRoute: `/${string}`;
  }) {
    this.name = name;
    this.baseRoute = baseRoute;
    this.baseSchema = baseSchema;
    this.registry.register(name, baseSchema);
  }

  public get<
    ParamsSchema extends z.AnyZodObject,
    QuerySchema extends z.AnyZodObject,
    HeadersSchema extends z.AnyZodObject,
    CookiesSchema extends z.AnyZodObject,
    bodySchema extends ZodRequestBody,
    ResponseSchema extends z.AnyZodObject,
  >({
    requestSchema,
    responseSchema,
    path,
    handler,
  }: {
    path?: `/${string}`;
    requestSchema: {
      params?: ParamsSchema;
      query?: QuerySchema;
      body?: bodySchema;
      cookies?: CookiesSchema;
      headers?: HeadersSchema;
    };

    responseSchema: ResponseSchema;

    handler: ({
      params,
      request,
      response,
    }: {
      params: { [x in keyof ParamsSchema['_type']]: string };
      request: Request;
      response: Response;
    }) => Promise<ServiceResponse<ResponseSchema['_type']>>;
  }) {
    const { params } = requestSchema;
    const paramKeys = Object.keys(params?.shape || {});
    // also check dup params and throw
    const parseParams = paramKeys
      ? paramKeys.length === 1
        ? paramKeys[0]
        : paramKeys.join('/:')
      : '';
    const base = `${this.baseRoute}${path ? path : ''}`;
    const pathParsed = `${base}${parseParams ? '/:' + parseParams : ''}`;
    console.log(pathParsed);
    const pathExists = 'get-' + pathParsed;
    if (this.routePaths.includes(pathExists)) {
      console.error(`Duplicate Route path: ${pathExists}`);
      process.exit(1);
    }
    this.routePaths.push(pathExists);

    this.registry.registerPath({
      method: 'get',
      path:
        base +
          paramKeys.reduce((curr, next) => {
            curr += `/{${next}}`;
            return curr;
          }, '') || '',
      tags: [this.name],
      request: requestSchema,
      responses: createApiResponse(responseSchema, 'Success'),
    });

    this.router.get(
      pathParsed.slice(this.baseRoute.length),
      async (_req: Request, res: Response) => {
        console.log(_req.params);
        // const serviceResponse = await userService.findAll();
        const response = await handler({
          params: _req.params as ParamsSchema['_type'],
          request: _req,
          response: res,
        });

        handleServiceResponse(response, res);
      }
    );

    return this;
  }
}
