import { z } from "zod";
import {
  causes,
  monthlyLogs,
  workspaceSettings,
  type Cause,
  type InsertCause,
  type InsertSettings,
  type MonthlyLog,
  type Settings,
  insertCauseSchema,
  insertSettingsSchema,
  publicMembershipSchema,
  publicUserSchema,
  publicWorkspaceSchema,
} from "./schema";

export type { Cause, InsertCause, MonthlyLog, Settings, InsertSettings } from "./schema";

const workspaceTypeSchema = z.enum(["personal", "relationship", "family", "group", "church", "organization"]);
const workspaceRoleSchema = z.enum(["owner", "co-owner", "admin", "viewer"]);

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional(), code: z.string().optional() }),
  notFound: z.object({ message: z.string(), code: z.string().optional() }),
  unauthorized: z.object({ message: z.string(), code: z.string().optional() }),
  forbidden: z.object({ message: z.string(), code: z.string().optional() }),
  internal: z.object({ message: z.string(), code: z.string().optional() }),
};

export const authSessionSchema = z.object({
  user: publicUserSchema,
  workspaces: z.array(
    z.object({
      workspace: publicWorkspaceSchema,
      membership: publicMembershipSchema.pick({ role: true }),
    }),
  ),
});

export const authBootstrapSchema = authSessionSchema.extend({
  activeWorkspaceId: z.number().nullable().optional().default(null),
  setupComplete: z.boolean().optional().default(false),
});

export const api = {
  auth: {
    session: {
      method: "GET" as const,
      path: "/api/auth/session" as const,
      responses: {
        200: authBootstrapSchema,
        401: errorSchemas.unauthorized,
      },
    },
    login: {
      method: "POST" as const,
      path: "/api/auth/login" as const,
      input: z.object({
        email: z.string().email(),
        password: z.string().min(8),
      }),
      responses: {
        200: authBootstrapSchema,
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    signup: {
      method: "POST" as const,
      path: "/api/auth/signup" as const,
      input: z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8),
        confirmPassword: z.string().min(8),
      }),
      responses: {
        201: authBootstrapSchema,
        202: authBootstrapSchema,
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
    finishSetup: {
      method: "POST" as const,
      path: "/api/auth/finish-setup" as const,
      responses: {
        200: authBootstrapSchema,
        401: errorSchemas.unauthorized,
        500: errorSchemas.internal,
      },
    },
    logout: {
      method: "POST" as const,
      path: "/api/auth/logout" as const,
      responses: {
        204: z.void(),
      },
    },
    updateProfile: {
      method: "PUT" as const,
      path: "/api/auth/profile" as const,
      input: z.object({
        name: z.string().min(1),
      }),
      responses: {
        200: publicUserSchema,
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  workspaces: {
    list: {
      method: "GET" as const,
      path: "/api/workspaces" as const,
      responses: {
        200: authSessionSchema.shape.workspaces,
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/workspaces" as const,
      input: z.object({
        name: z.string().min(1),
        type: workspaceTypeSchema,
      }),
      responses: {
        201: z.object({
          workspace: publicWorkspaceSchema,
          membership: publicMembershipSchema,
        }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  causes: {
    list: {
      method: "GET" as const,
      path: "/api/causes" as const,
      responses: {
        200: z.array(z.custom<typeof causes.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/causes" as const,
      input: insertCauseSchema.omit({ workspaceId: true }),
      responses: {
        201: z.custom<typeof causes.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PUT" as const,
      path: "/api/causes/:id" as const,
      input: insertCauseSchema.omit({ workspaceId: true }).partial(),
      responses: {
        200: z.custom<typeof causes.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/causes/:id" as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  monthlyLogs: {
    list: {
      method: "GET" as const,
      path: "/api/monthly-logs" as const,
      responses: {
        200: z.array(z.custom<typeof monthlyLogs.$inferSelect>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/monthly-logs/:monthKey" as const,
      responses: {
        200: z.array(z.custom<typeof monthlyLogs.$inferSelect>()),
      },
    },
    reveal: {
      method: "POST" as const,
      path: "/api/monthly-logs/reveal" as const,
      input: z.object({ monthKey: z.string() }),
      responses: {
        201: z.custom<typeof monthlyLogs.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    complete: {
      method: "PUT" as const,
      path: "/api/monthly-logs/:id/complete" as const,
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
    delete: {
      method: "DELETE" as const,
      path: "/api/monthly-logs/:id" as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  settings: {
    get: {
      method: "GET" as const,
      path: "/api/settings" as const,
      responses: {
        200: z.custom<typeof workspaceSettings.$inferSelect>(),
      },
    },
    update: {
      method: "PUT" as const,
      path: "/api/settings" as const,
      input: insertSettingsSchema.omit({ workspaceId: true }).partial(),
      responses: {
        200: z.custom<typeof workspaceSettings.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  dashboard: {
    stats: {
      method: "GET" as const,
      path: "/api/dashboard/stats" as const,
      responses: {
        200: z.object({
          totalDonated: z.number(),
          totalVolunteerHours: z.number(),
          donationByMonth: z.record(z.number()),
          volunteerByMonth: z.record(z.number()),
          causesByTier: z.object({ tier1: z.number(), tier2: z.number(), tier3: z.number() }),
          milestones: z.array(z.string()),
        }),
      },
    },
  },
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

export type WorkspaceType = z.infer<typeof workspaceTypeSchema>;
export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;
