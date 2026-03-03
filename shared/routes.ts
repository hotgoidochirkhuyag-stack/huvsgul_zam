import { z } from 'zod';
import { insertProjectSchema, insertContactSchema, projects, contacts } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  projects: {
    list: {
      method: 'GET' as const,
      path: '/api/projects' as const,
      responses: {
        200: z.array(z.custom<typeof projects.$inferSelect>()),
      },
    },
  },
  contacts: {
    create: {
      method: 'POST' as const,
      path: '/api/contacts' as const,
      input: insertContactSchema,
      responses: {
        201: z.custom<typeof contacts.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  content: {
    list: {
      method: 'GET' as const,
      path: '/api/content' as const,
      responses: {
        200: z.array(z.custom<typeof content.$inferSelect>()),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/content/:section' as const,
      input: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        ctaText: z.string().optional(),
        secondaryCtaText: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof content.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
