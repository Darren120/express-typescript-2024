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
    params: z.object({
      nameParam: z.string().optional(),
    }),
  },
  handler: async ({ params }) => {
    // typed single source of truth, ts gives params types
    params.nameParam;
    return {
      // ts gives response schema
      responseObject: {
        name: 'hellos 2',
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
    params: z.object({
      nameParam: z.string(),
    }),
    headers: z.object({
      Authorization: z.string().openapi({ example: 'Bearer ...' }),
    }),
  },
  handler: async ({ params }) => {
    // typed single source of truth, ts gives params types
    params.nameParam;
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
