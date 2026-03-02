import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const causes = pgTable("causes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'donation', 'volunteer', 'either'
  tier: integer("tier").notNull(), // 1, 2, 3
  submittedBy: text("submitted_by").notNull(), // 'David' or 'Arlayna'
  description: text("description").notNull(),
  location: text("location"),
  link: text("link"),
  tags: text("tags"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const monthlyLogs = pgTable("monthly_logs", {
  id: serial("id").primaryKey(),
  monthKey: text("month_key").notNull(), // e.g. "2023-10" - No longer unique to allow multiple
  causeId: integer("cause_id").notNull(),
  type: text("type").notNull(), // 'donation', 'volunteer'
  isCompleted: boolean("is_completed").default(false),
  amount: numeric("amount"), // Stored as string in JS
  hours: numeric("hours"),
  dateCompleted: timestamp("date_completed"),
  note: text("note"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  volunteerFrequency: integer("volunteer_frequency").notNull().default(3), // months per year
  tier1Weight: integer("tier1_weight").notNull().default(60),
  tier2Weight: integer("tier2_weight").notNull().default(30),
  tier3Weight: integer("tier3_weight").notNull().default(10),
  preventRepeatsMonths: integer("prevent_repeats_months").notNull().default(6),
  seasonalMode: boolean("seasonal_mode").default(false),
});

export const insertCauseSchema = createInsertSchema(causes).omit({ id: true, createdAt: true });
export const insertMonthlyLogSchema = createInsertSchema(monthlyLogs).omit({ id: true, createdAt: true });
export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });

export type Cause = typeof causes.$inferSelect;
export type InsertCause = z.infer<typeof insertCauseSchema>;
export type MonthlyLog = typeof monthlyLogs.$inferSelect;
export type InsertMonthlyLog = z.infer<typeof insertMonthlyLogSchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
