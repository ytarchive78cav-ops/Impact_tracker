import {
  causes,
  monthlyLogs,
  users,
  workspaceMemberships,
  workspaces,
  workspaceSettings,
  type Cause,
  type InsertCause,
  type InsertMonthlyLog,
  type InsertSettings,
  type InsertUser,
  type InsertWorkspace,
  type MonthlyLog,
  type Settings,
  type User,
  type Workspace,
  type WorkspaceMembership,
} from "@shared/schema";
import { db, pool } from "./db";
import { and, desc, eq, sql } from "drizzle-orm";

export interface WorkspaceBundle {
  workspace: Workspace;
  membership: WorkspaceMembership;
}

export interface IStorage {
  bootstrap(): Promise<void>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(uid: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(uid: number, updates: Partial<Pick<User, "name">>): Promise<User>;
  listUserWorkspaces(uid: number): Promise<WorkspaceBundle[]>;
  createWorkspace(input: InsertWorkspace, uid: number, role: WorkspaceMembership["role"]): Promise<WorkspaceBundle>;
  getWorkspaceForUser(workspaceId: number, uid: number): Promise<WorkspaceBundle | undefined>;

  getCauses(workspaceId: number): Promise<Cause[]>;
  getCause(id: number, workspaceId: number): Promise<Cause | undefined>;
  createCause(cause: InsertCause): Promise<Cause>;
  updateCause(id: number, workspaceId: number, cause: Partial<InsertCause>): Promise<Cause>;
  deleteCause(id: number, workspaceId: number): Promise<void>;

  getMonthlyLogs(workspaceId: number): Promise<MonthlyLog[]>;
  getMonthlyLogByMonth(monthKey: string, workspaceId: number): Promise<MonthlyLog[]>;
  createMonthlyLog(log: InsertMonthlyLog): Promise<MonthlyLog>;
  updateMonthlyLog(id: number, workspaceId: number, log: Partial<MonthlyLog>): Promise<MonthlyLog>;
  deleteMonthlyLog(id: number, workspaceId: number): Promise<void>;

  getSettings(workspaceId: number): Promise<Settings>;
  updateSettings(workspaceId: number, updates: Partial<InsertSettings>): Promise<Settings>;
  seedWorkspace(workspaceId: number, ownerName: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async bootstrap(): Promise<void> {
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE workspace_type AS ENUM ('personal', 'partnership', 'group');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE workspace_role AS ENUM ('owner', 'member');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE cadence AS ENUM ('monthly', 'biweekly', 'weekly');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        uid SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        workspace_id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type workspace_type NOT NULL,
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workspace_memberships (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER NOT NULL,
        uid INTEGER NOT NULL,
        role workspace_role NOT NULL DEFAULT 'member',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (workspace_id, uid)
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workspace_settings (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER NOT NULL UNIQUE,
        cadence cadence NOT NULL DEFAULT 'monthly',
        giving_day_of_week INTEGER NOT NULL DEFAULT 5,
        biweekly_anchor_date TEXT,
        volunteer_frequency INTEGER NOT NULL DEFAULT 3,
        tier1_weight INTEGER NOT NULL DEFAULT 60,
        tier2_weight INTEGER NOT NULL DEFAULT 30,
        tier3_weight INTEGER NOT NULL DEFAULT 10,
        prevent_repeats_months INTEGER NOT NULL DEFAULT 6,
        seasonal_mode BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`
      ALTER TABLE causes ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
      ALTER TABLE monthly_logs ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
      ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS cadence cadence NOT NULL DEFAULT 'monthly';
      ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS giving_day_of_week INTEGER NOT NULL DEFAULT 5;
      ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS biweekly_anchor_date TEXT;
    `);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async getUserById(uid: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.uid, uid));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values({
      ...user,
      email: user.email.toLowerCase(),
    }).returning();
    return created;
  }

  async updateUser(uid: number, updates: Partial<Pick<User, "name">>): Promise<User> {
    const [updated] = await db.update(users).set(updates).where(eq(users.uid, uid)).returning();
    return updated;
  }

  async listUserWorkspaces(uid: number): Promise<WorkspaceBundle[]> {
    const rows = await db
      .select({
        workspace: workspaces,
        membership: workspaceMemberships,
      })
      .from(workspaceMemberships)
      .innerJoin(workspaces, eq(workspaceMemberships.workspaceId, workspaces.workspaceId))
      .where(eq(workspaceMemberships.uid, uid));
    return rows;
  }

  async createWorkspace(
    input: InsertWorkspace,
    uid: number,
    role: WorkspaceMembership["role"],
  ): Promise<WorkspaceBundle> {
    return db.transaction(async (tx) => {
      const [workspace] = await tx.insert(workspaces).values(input).returning();
      const [membership] = await tx.insert(workspaceMemberships).values({
        workspaceId: workspace.workspaceId,
        uid,
        role,
      }).returning();

      const [existingSettings] = await tx
        .select()
        .from(workspaceSettings)
        .where(eq(workspaceSettings.workspaceId, workspace.workspaceId));

      if (!existingSettings) {
        await tx.insert(workspaceSettings).values({ workspaceId: workspace.workspaceId });
      }

      return { workspace, membership };
    });
  }

  async getWorkspaceForUser(workspaceId: number, uid: number): Promise<WorkspaceBundle | undefined> {
    const [row] = await db
      .select({
        workspace: workspaces,
        membership: workspaceMemberships,
      })
      .from(workspaceMemberships)
      .innerJoin(workspaces, eq(workspaceMemberships.workspaceId, workspaces.workspaceId))
      .where(and(eq(workspaceMemberships.workspaceId, workspaceId), eq(workspaceMemberships.uid, uid)));
    return row;
  }

  async getCauses(workspaceId: number): Promise<Cause[]> {
    return await db.select().from(causes).where(eq(causes.workspaceId, workspaceId));
  }

  async getCause(id: number, workspaceId: number): Promise<Cause | undefined> {
    const [cause] = await db.select().from(causes).where(and(eq(causes.id, id), eq(causes.workspaceId, workspaceId)));
    return cause;
  }

  async createCause(cause: InsertCause): Promise<Cause> {
    const [newCause] = await db.insert(causes).values(cause).returning();
    return newCause;
  }

  async updateCause(id: number, workspaceId: number, update: Partial<InsertCause>): Promise<Cause> {
    const [updatedCause] = await db
      .update(causes)
      .set(update)
      .where(and(eq(causes.id, id), eq(causes.workspaceId, workspaceId)))
      .returning();
    return updatedCause;
  }

  async deleteCause(id: number, workspaceId: number): Promise<void> {
    await db.delete(causes).where(and(eq(causes.id, id), eq(causes.workspaceId, workspaceId)));
  }

  async getMonthlyLogs(workspaceId: number): Promise<MonthlyLog[]> {
    return await db
      .select()
      .from(monthlyLogs)
      .where(eq(monthlyLogs.workspaceId, workspaceId))
      .orderBy(desc(monthlyLogs.monthKey));
  }

  async getMonthlyLogByMonth(monthKey: string, workspaceId: number): Promise<MonthlyLog[]> {
    return await db
      .select()
      .from(monthlyLogs)
      .where(and(eq(monthlyLogs.monthKey, monthKey), eq(monthlyLogs.workspaceId, workspaceId)));
  }

  async createMonthlyLog(log: InsertMonthlyLog): Promise<MonthlyLog> {
    const [newLog] = await db.insert(monthlyLogs).values(log).returning();
    return newLog;
  }

  async updateMonthlyLog(id: number, workspaceId: number, log: Partial<MonthlyLog>): Promise<MonthlyLog> {
    const [updatedLog] = await db
      .update(monthlyLogs)
      .set(log)
      .where(and(eq(monthlyLogs.id, id), eq(monthlyLogs.workspaceId, workspaceId)))
      .returning();
    return updatedLog;
  }

  async deleteMonthlyLog(id: number, workspaceId: number): Promise<void> {
    await db.delete(monthlyLogs).where(and(eq(monthlyLogs.id, id), eq(monthlyLogs.workspaceId, workspaceId)));
  }

  async getSettings(workspaceId: number): Promise<Settings> {
    const [setting] = await db
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.workspaceId, workspaceId));
    if (!setting) {
      const [created] = await db.insert(workspaceSettings).values({ workspaceId }).returning();
      return created;
    }
    return setting;
  }

  async updateSettings(workspaceId: number, updates: Partial<InsertSettings>): Promise<Settings> {
    await this.getSettings(workspaceId);
    const [updated] = await db
      .update(workspaceSettings)
      .set(updates)
      .where(eq(workspaceSettings.workspaceId, workspaceId))
      .returning();
    return updated;
  }

  async seedWorkspace(workspaceId: number, ownerName: string): Promise<void> {
    const existingCauses = await this.getCauses(workspaceId);
    if (existingCauses.length > 0) return;

    await db.insert(causes).values([
      {
        workspaceId,
        name: "Local Animal Shelter",
        type: "either",
        tier: 1,
        submittedBy: ownerName,
        description: "Helping the cute animals find homes.",
        tags: "animals,local",
      },
      {
        workspaceId,
        name: "World Wildlife Fund",
        type: "donation",
        tier: 2,
        submittedBy: ownerName,
        description: "Protecting endangered species globally.",
        tags: "environment,animals",
      },
      {
        workspaceId,
        name: "Community Food Bank",
        type: "volunteer",
        tier: 1,
        submittedBy: ownerName,
        description: "Sorting and packing food for those in need.",
        tags: "local community",
      },
    ]);
  }
}

export const storage = new DatabaseStorage();
