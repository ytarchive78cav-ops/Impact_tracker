import {
  pgEnum,
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  numeric,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const workspaceTypeEnum = pgEnum("workspace_type", [
  "personal",
  "relationship",
  "family",
  "group",
  "church",
  "organization",
]);

export const workspaceRoleEnum = pgEnum("workspace_role", ["owner", "co-owner", "admin", "viewer"]);
export const cadenceEnum = pgEnum("cadence", ["monthly", "biweekly", "weekly"]);

export const users = pgTable("users", {
  uid: serial("uid").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex("users_email_idx").on(table.email),
}));

export const workspaces = pgTable("workspaces", {
  workspaceId: serial("workspace_id").primaryKey(),
  name: text("name").notNull(),
  type: workspaceTypeEnum("type").notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workspaceMemberships = pgTable("workspace_memberships", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  uid: integer("uid").notNull(),
  role: workspaceRoleEnum("role").notNull().default("viewer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  membershipIdx: uniqueIndex("workspace_memberships_workspace_uid_idx").on(
    table.workspaceId,
    table.uid,
  ),
}));

export const causes = pgTable("causes", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  tier: integer("tier").notNull(),
  submittedBy: text("submitted_by").notNull(),
  description: text("description").notNull(),
  location: text("location"),
  link: text("link"),
  tags: text("tags"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const monthlyLogs = pgTable("monthly_logs", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  monthKey: text("month_key").notNull(),
  causeId: integer("cause_id").notNull(),
  type: text("type").notNull(),
  isCompleted: boolean("is_completed").default(false),
  amount: numeric("amount"),
  hours: numeric("hours"),
  dateCompleted: timestamp("date_completed"),
  note: text("note"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workspaceSettings = pgTable("workspace_settings", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  cadence: cadenceEnum("cadence").notNull().default("monthly"),
  givingDayOfWeek: integer("giving_day_of_week").notNull().default(5),
  biweeklyAnchorDate: text("biweekly_anchor_date"),
  volunteerFrequency: integer("volunteer_frequency").notNull().default(3),
  tier1Weight: integer("tier1_weight").notNull().default(60),
  tier2Weight: integer("tier2_weight").notNull().default(30),
  tier3Weight: integer("tier3_weight").notNull().default(10),
  preventRepeatsMonths: integer("prevent_repeats_months").notNull().default(6),
  seasonalMode: boolean("seasonal_mode").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  workspaceIdx: uniqueIndex("workspace_settings_workspace_id_idx").on(table.workspaceId),
}));

export const insertUserSchema = createInsertSchema(users)
  .pick({ name: true, email: true, passwordHash: true })
  .extend({
    email: z.string().email(),
    name: z.string().min(1),
    passwordHash: z.string().min(1),
  });

export const insertWorkspaceSchema = createInsertSchema(workspaces)
  .omit({ workspaceId: true, createdAt: true });

export const insertWorkspaceMembershipSchema = createInsertSchema(workspaceMemberships)
  .omit({ id: true, createdAt: true });

export const insertCauseSchema = createInsertSchema(causes)
  .omit({ id: true, createdAt: true });

export const insertMonthlyLogSchema = createInsertSchema(monthlyLogs)
  .omit({ id: true, createdAt: true });

export const insertSettingsSchema = createInsertSchema(workspaceSettings)
  .omit({ id: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type WorkspaceMembership = typeof workspaceMemberships.$inferSelect;
export type InsertWorkspaceMembership = z.infer<typeof insertWorkspaceMembershipSchema>;
export type Cause = typeof causes.$inferSelect;
export type InsertCause = z.infer<typeof insertCauseSchema>;
export type MonthlyLog = typeof monthlyLogs.$inferSelect;
export type InsertMonthlyLog = z.infer<typeof insertMonthlyLogSchema>;
export type Settings = typeof workspaceSettings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

export const timestampStringSchema = z.string().min(1).refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Invalid timestamp",
});

export const userCreateSchema = insertUserSchema;

export const userStoredSchema = z.object({
  uid: z.number(),
  name: z.string(),
  email: z.string().email(),
  createdAt: timestampStringSchema,
});

export const userPartialSchema = userStoredSchema.partial();

export const workspaceStoredSchema = z.object({
  workspaceId: z.number(),
  name: z.string(),
  type: z.enum(["personal", "relationship", "family", "group", "church", "organization"]),
  createdBy: z.number(),
  createdAt: timestampStringSchema,
});

export const membershipStoredSchema = z.object({
  id: z.number(),
  workspaceId: z.number(),
  uid: z.number(),
  role: z.enum(["owner", "co-owner", "admin", "viewer"]),
  createdAt: timestampStringSchema,
});

export const publicUserSchema = userStoredSchema;
export const publicWorkspaceSchema = workspaceStoredSchema;
export const publicMembershipSchema = membershipStoredSchema;
