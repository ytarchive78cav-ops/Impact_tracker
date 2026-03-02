import { z } from 'zod';
import { insertCauseSchema, insertSettingsSchema, causes, monthlyLogs, settings } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  causes: {
    list: {
      method: 'GET' as const,
      path: '/api/causes' as const,
      responses: {
        200: z.array(z.custom<typeof causes.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/causes' as const,
      input: insertCauseSchema,
      responses: {
        201: z.custom<typeof causes.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/causes/:id' as const,
      input: insertCauseSchema.partial(),
      responses: {
        200: z.custom<typeof causes.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/causes/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  monthlyLogs: {
    list: {
      method: 'GET' as const,
      path: '/api/monthly-logs' as const,
      responses: {
        200: z.array(z.custom<typeof monthlyLogs.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/monthly-logs/:monthKey' as const,
      responses: {
        200: z.custom<typeof monthlyLogs.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    reveal: {
      method: 'POST' as const,
      path: '/api/monthly-logs/reveal' as const,
      input: z.object({ monthKey: z.string() }),
      responses: {
        201: z.custom<typeof monthlyLogs.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    complete: {
      method: 'PUT' as const,
      path: '/api/monthly-logs/:id/complete' as const,
      input: z.object({
        amount: z.union([z.number(), z.string()]).optional(),
        hours: z.union([z.number(), z.string()]).optional(),
        dateCompleted: z.union([z.string(), z.date()]).optional(),
        note: z.string().optional(),
        photoUrl: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof monthlyLogs.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
  },
  settings: {
    get: {
      method: 'GET' as const,
      path: '/api/settings' as const,
      responses: {
        200: z.custom<typeof settings.$inferSelect>(),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/settings' as const,
      input: insertSettingsSchema.partial(),
      responses: {
        200: z.custom<typeof settings.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  dashboard: {
    stats: {
      method: 'GET' as const,
      path: '/api/dashboard/stats' as const,
      responses: {
        200: z.object({
          totalDonated: z.number(),
          totalVolunteerHours: z.number(),
          donationByMonth: z.record(z.number()),
          volunteerByMonth: z.record(z.number()),
          causesByTier: z.object({ tier1: z.number(), tier2: z.number(), tier3: z.number() }),
          milestones: z.array(z.string())
        }),
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
