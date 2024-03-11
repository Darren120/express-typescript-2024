import { z } from 'zod';

import { AddRouteAndDocument } from '@/generator/AddRouteAndDocument';

export const UserRoute = new AddRouteAndDocument({
  baseRoute: '/user',
  baseSchema: z.object({ name: z.string() }),
  name: 'User',
});

UserRoute.get({
  responseSchema: z.object({ name: z.string() }),
  requestSchema: {
    params: ['hello'],
    query: z.object({
      str: z.string().openapi({ example: 'hello' }),
      num: z.number().openapi({ example: 10 }),
      bool: z.boolean().optional().openapi({ example: true }),
    }),
  },
  handler: async ({ request: { params, query } }) => {
    // typed single source of truth, ts gives params types
    console.log('params', params);
    console.log(
      'Q',
      'str',
      typeof query.str,
      'num',
      typeof query.num,
      'bool',
      typeof query.bool
    );
    return {
      // ts gives response schema
      responseObject: {
        name: 'w',
      },
      message: 'Nice',

      statusCode: 200,
      success: true,
    };
  },
});

UserRoute.get({
  responseSchema: z.object({ name: z.string() }),
  path: '/poo',
  requestSchema: {
    params: ['hello2'],
    headers: z.object({
      Authorization: z.string().openapi({ example: 'Bearer ...' }),
    }),
  },
  handler: async ({
    request: { params, cookies, headers, query },
    response,
  }) => {
    // typed single source of truth, ts gives params types
    console.log('params', params);

    console.log('cookies', cookies);
    console.log('headers', headers);
    console.log('query', query);
    return {
      // ts gives response schema
      responseObject: {
        name: 'hellos',
      },
      message: 'Nice',

      statusCode: 200,
      success: true,
    };
  },
});

UserRoute.post({
  responseSchema: z.object({ name: z.string() }),
  requestSchema: {
    params: ['hello'],
    query: z.object({
      str: z.string().openapi({ example: 'hello' }),
      num: z.number().openapi({ example: 10 }),
      bool: z.boolean().optional().openapi({ example: true }),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().openapi({ example: 'hello' }),
            age: z.number().openapi({ example: 10 }),
            isCool: z.boolean().optional().openapi({ example: true }),
          }),
        },
      },
    },
  },
  handler: async ({ request: { params, query, body, files } }) => {
    // typed single source of truth, ts gives params types
    console.log('body', body.age, typeof body.age);
    console.log(
      'Q',
      'str',
      typeof query.str,
      'num',
      typeof query.num,
      'bool',
      typeof query.bool
    );
    return {
      // ts gives response schema
      responseObject: {
        name: 'w',
      },
      message: 'Nice',

      statusCode: 200,
      success: true,
    };
  },
});
