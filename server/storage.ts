import { causes, monthlyLogs, settings, type Cause, type InsertCause, type MonthlyLog, type InsertMonthlyLog, type Settings, type InsertSettings } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Causes
  getCauses(): Promise<Cause[]>;
  getCause(id: number): Promise<Cause | undefined>;
  createCause(cause: InsertCause): Promise<Cause>;
  updateCause(id: number, cause: Partial<InsertCause>): Promise<Cause>;
  deleteCause(id: number): Promise<void>;

  // Monthly Logs
  getMonthlyLogs(): Promise<MonthlyLog[]>;
  getMonthlyLogByMonth(monthKey: string): Promise<MonthlyLog[]>;
  createMonthlyLog(log: InsertMonthlyLog): Promise<MonthlyLog>;
  updateMonthlyLog(id: number, log: Partial<MonthlyLog>): Promise<MonthlyLog>;
  deleteMonthlyLog(id: number): Promise<void>;

  // Settings
  getSettings(): Promise<Settings>;
  updateSettings(updates: Partial<InsertSettings>): Promise<Settings>;
}

export class DatabaseStorage implements IStorage {
  async getCauses(): Promise<Cause[]> {
    return await db.select().from(causes);
  }

  async getCause(id: number): Promise<Cause | undefined> {
    const [cause] = await db.select().from(causes).where(eq(causes.id, id));
    return cause;
  }

  async createCause(cause: InsertCause): Promise<Cause> {
    const [newCause] = await db.insert(causes).values(cause).returning();
    return newCause;
  }

  async updateCause(id: number, update: Partial<InsertCause>): Promise<Cause> {
    const [updatedCause] = await db.update(causes).set(update).where(eq(causes.id, id)).returning();
    return updatedCause;
  }

  async deleteCause(id: number): Promise<void> {
    await db.delete(causes).where(eq(causes.id, id));
  }

  async getMonthlyLogs(): Promise<MonthlyLog[]> {
    return await db.select().from(monthlyLogs).orderBy(desc(monthlyLogs.monthKey));
  }

  async getMonthlyLogByMonth(monthKey: string): Promise<MonthlyLog[]> {
    return await db.select().from(monthlyLogs).where(eq(monthlyLogs.monthKey, monthKey));
  }

  async createMonthlyLog(log: InsertMonthlyLog): Promise<MonthlyLog> {
    const [newLog] = await db.insert(monthlyLogs).values(log).returning();
    return newLog;
  }

  async updateMonthlyLog(id: number, log: Partial<MonthlyLog>): Promise<MonthlyLog> {
    const [updatedLog] = await db.update(monthlyLogs).set(log).where(eq(monthlyLogs.id, id)).returning();
    return updatedLog;
  }

  async deleteMonthlyLog(id: number): Promise<void> {
    await db.delete(monthlyLogs).where(eq(monthlyLogs.id, id));
  }

  async getSettings(): Promise<Settings> {
    const [setting] = await db.select().from(settings).where(eq(settings.id, 1));
    if (!setting) {
      const [newSetting] = await db.insert(settings).values({}).returning();
      return newSetting;
    }
    return setting;
  }

  async updateSettings(updates: Partial<InsertSettings>): Promise<Settings> {
    const current = await this.getSettings();
    const [updatedSetting] = await db.update(settings).set(updates).where(eq(settings.id, 1)).returning();
    return updatedSetting;
  }
}

export const storage = new DatabaseStorage();
