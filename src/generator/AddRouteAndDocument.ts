import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import express, { NextFunction, Request, Response } from 'express';
import { ZodFirstPartyTypeKind, z } from 'zod';

import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import { ServiceResponse } from '@/common/models/serviceResponse';
import { handleServiceResponse } from '@/common/utils/httpHandlers';
import pino from 'pino';
const logger = pino({ name: 'Route Maker' });
extendZodWithOpenApi(z);

const pathSet = new Set<string>();

export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
type ZodStringNumRequired = z.ZodString | z.ZodNumber;
type ZodStringNumBoolOptional = z.ZodObject<{
  [key: string]:
    | z.ZodString
    | z.ZodNumber
    | z.ZodBoolean
    | z.ZodOptional<z.ZodString>
    | z.ZodOptional<z.ZodNumber>
    | z.ZodOptional<z.ZodBoolean>;
}>;
export class AddRouteAndDocument<BaseSchema extends z.AnyZodObject> {
  private name: string;
  private baseSchema: BaseSchema;
  public readonly baseRoute: string;
  public readonly router = express.Router();
  public readonly registry = new OpenAPIRegistry();

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

  private validateSchema =
    <
      ParamsSchema extends string,
      QuerySchema extends ZodStringNumBoolOptional,
      HeadersSchema extends z.AnyZodObject,
      CookiesSchema extends z.AnyZodObject,
      BodySchema extends z.AnyZodObject,
      ResponseSchema extends z.AnyZodObject,
    >({
      cookies,
      headers,
      params,
      query,
      body,
    }: {
      params?: ParamsSchema[];
      query?: QuerySchema;
      body?: BodySchema;
      cookies?: CookiesSchema;
      headers?: HeadersSchema;
    }) =>
    async (_req: Request, res: Response, next: NextFunction) => {
      const requestParams = _req.params;
      const requestQuery = _req.query;
      const requestCookies = _req.cookies;
      const requestHeaders = _req.headers;
      const requestBody = _req.body;
      let firstMissing = '';
      const containsAllRequiredParams = (params || []).every((param) => {
        firstMissing = param;
        return requestParams[param] !== undefined;
      });
      if (!containsAllRequiredParams) {
        res.status(400).send(`Missing required params :${firstMissing}`);
        return handleServiceResponse(
          {
            message: `Missing required params :${firstMissing}`,
            responseObject: null,
            statusCode: 400,
            success: false,
          },
          res
        );
      }
      if (query) {
        const keys = Object.keys(query.shape);
        for (const key of keys) {
          const zodSchema = query?.shape?.[key];
          const originalTypeDef = zodSchema?._def?.typeName;
          if (!originalTypeDef) {
            continue;
          }
          const value = requestQuery[key];
          console.log('value', value, typeof value);
          const isOptional = zodSchema.isOptional();
          if (!isOptional && value === undefined) {
            return handleServiceResponse(
              {
                message: `Required query missing: ${key}`,
                responseObject: null,
                statusCode: 400,
                success: false,
              },
              res
            );
          }
          if (originalTypeDef === ZodFirstPartyTypeKind.ZodString) {
            const transform = String(value);
            const isValid = zodSchema.safeParse(transform);
            if (!isValid.success) {
              return handleServiceResponse(
                {
                  message: `Invalid type for query param: ${key}. Expected string, got ${typeof value}.`,
                  responseObject: null,
                  statusCode: 400,
                  success: false,
                },
                res
              );
            }
          } else if (originalTypeDef === ZodFirstPartyTypeKind.ZodNumber) {
            const transform = Number(value);
            const isValid = zodSchema.safeParse(transform);
            if (!isValid.success) {
              return handleServiceResponse(
                {
                  message: `Invalid type for query param: ${key}. Expected number, got ${typeof value}.`,
                  responseObject: null,
                  statusCode: 400,
                  success: false,
                },
                res
              );
            }
          } else if (originalTypeDef === ZodFirstPartyTypeKind.ZodBoolean) {
            const transform =
              value !== 'true' && value !== 'false' ? null : Boolean(value);
            const isValid = zodSchema.safeParse(transform);
            if (!isValid.success) {
              return handleServiceResponse(
                {
                  message: `Invalid type for query param: ${key}. Expected boolean, got ${typeof value}.`,
                  responseObject: null,
                  statusCode: 400,
                  success: false,
                },
                res
              );
            }
          }
        }
      }
      if (body) {
        const valid = body.safeParse(requestBody);
        console.log('valid', valid, _req.body);
        if (!valid.success) {
          return handleServiceResponse(
            {
              message: `Invalid body: ${valid.error.errors.map((e) => e.message).join(', ')}`,
              responseObject: null,
              statusCode: 400,
              success: false,
            },
            res
          );
        }
        _req.body = valid.data;
      }
      next();
    };
  private addToRegistry = <
    ParamsSchema extends string,
    QuerySchema extends ZodStringNumBoolOptional,
    HeadersSchema extends z.AnyZodObject,
    CookiesSchema extends z.AnyZodObject,
    BodySchema extends z.AnyZodObject,
    ResponseSchema extends z.AnyZodObject,
  >({
    method,
    requestSchema,
    responseSchema,
    registryPath,
  }: {
    method: 'get' | 'post' | 'put' | 'patch' | 'delete';
    requestSchema: {
      params?: ParamsSchema[];
      query?: QuerySchema;
      body?: BodySchema;
      cookies?: CookiesSchema;
      headers?: HeadersSchema;
    };
    responseSchema: ResponseSchema;
    registryPath: string;
  }) => {
    const { params: paramKeys, ...restOfSchema } = requestSchema;
    this.registry.registerPath({
      method: method,
      path: registryPath,
      tags: [this.name],
      request: {
        ...restOfSchema,
        body: requestSchema?.body?.shape
          ? {
              content: {
                'application/json': {
                  schema: requestSchema.body,
                },
              },
            }
          : undefined,
        params: paramKeys?.reduce((curr, next) => {
          return z.object({
            ...curr.shape,
            [next]: z.string(),
          });
        }, z.object({})),
      },
      responses: createApiResponse(responseSchema, 'Success'),
    });
  };
  private getPaths = ({
    subPath,
    params,
  }: {
    subPath?: string;
    params?: string[];
  }) => {
    const parseParams = params
      ? params.length === 1
        ? params[0]
        : params.join('/:')
      : '';
    const base = `${this.baseRoute}${subPath ? subPath : ''}`;
    const fullPath = `${base}${parseParams ? '/:' + parseParams : ''}`;
    const registryPath =
      base +
        params?.reduce((curr, next) => {
          curr += `/{${next}}`;
          return curr;
        }, '') || '';
    const subRoute = fullPath.slice(this.baseRoute.length);
    return {
      fullPath,
      subRoute,
      registryPath,
    };
  };
  public get<
    ParamsSchema extends string,
    QuerySchema extends ZodStringNumBoolOptional,
    HeadersSchema extends z.AnyZodObject,
    CookiesSchema extends z.AnyZodObject,
    ResponseSchema extends z.AnyZodObject,
  >({
    requestSchema,
    responseSchema,
    path,
    handler,
  }: {
    path?: `/${string}`;
    requestSchema: {
      params?: ParamsSchema[];
      query?: QuerySchema;
      cookies?: CookiesSchema;
      headers?: HeadersSchema;
    };
    responseSchema: ResponseSchema;
    handler: ({
      request,
      response,
    }: {
      request: Omit<Request, 'params' | 'query' | 'body'> & {
        params: Expand<{ [x in ParamsSchema]: string }>;
        query: QuerySchema['_type'];
      };
      response: Response;
    }) => Promise<ServiceResponse<ResponseSchema['_type']>>;
  }) {
    const { fullPath, registryPath, subRoute } = this.getPaths({
      subPath: path,
      params: requestSchema.params,
    });
    const pathName = 'get-' + fullPath;
    const pathAlreadyExists = pathSet.has(pathName);
    if (pathAlreadyExists) {
      const s = pathName.split('-');
      const method = s[0].toUpperCase();
      const route = s.slice(1).join('-');
      logger.error(`Path already exists: ${method} - ${route}`);
      process.exit(1);
    }
    pathSet.add(pathName);
    this.addToRegistry({
      method: 'get',
      requestSchema,
      responseSchema,
      registryPath,
    });
    console.log('subRoute', subRoute);
    this.router.get(
      subRoute,
      this.validateSchema(requestSchema),
      async (_req: Request, res: Response) => {
        console.log('subRoute hit', subRoute);
        const response = await handler({
          request: _req as any,
          response: res,
        });

        handleServiceResponse(response, res);
      }
    );

    return this;
  }
  public post<
    ParamsSchema extends string,
    QuerySchema extends ZodStringNumBoolOptional,
    HeadersSchema extends z.AnyZodObject,
    CookiesSchema extends z.AnyZodObject,
    BodySchema extends z.AnyZodObject,
    ResponseSchema extends z.AnyZodObject,
  >({
    requestSchema,
    responseSchema,
    path,
    handler,
  }: {
    path?: `/${string}`;
    requestSchema: {
      params?: ParamsSchema[];
      query?: QuerySchema;
      body?: BodySchema;
      cookies?: CookiesSchema;
      headers?: HeadersSchema;
    };
    responseSchema: ResponseSchema;
    handler: ({
      request,
      response,
    }: {
      request: Omit<Request, 'params' | 'query' | 'body'> & {
        params: Expand<{ [x in ParamsSchema]: string }>;
        query: QuerySchema['_type'];
        body: BodySchema['_type'];
      };
      response: Response;
    }) => Promise<ServiceResponse<ResponseSchema['_type']>>;
  }) {
    const { fullPath, registryPath, subRoute } = this.getPaths({
      subPath: path,
      params: requestSchema.params,
    });
    const pathName = 'post-' + fullPath;
    const pathAlreadyExists = pathSet.has(pathName);
    if (pathAlreadyExists) {
      const s = pathName.split('-');
      const method = s[0].toUpperCase();
      const route = s.slice(1).join('-');
      logger.error(`Path already exists: ${method} - ${route}`);
      process.exit(1);
    }
    pathSet.add(pathName);
    this.addToRegistry({
      method: 'post',
      requestSchema,
      responseSchema,
      registryPath,
    });
    console.log('subRoute post hit post', subRoute);
    this.router.post(
      subRoute,
      this.validateSchema(requestSchema),
      async (_req: Request, res: Response) => {
        console.log('subRoute hit post', subRoute);
        const response = await handler({
          request: _req as any,
          response: res,
        });

        handleServiceResponse(response, res);
      }
    );

    return this;
  }
}
