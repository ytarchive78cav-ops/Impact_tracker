import crypto from "crypto";
import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import type { MonthlyLog } from "@shared/routes";
import type { User } from "@shared/schema";
import { z } from "zod";

type LinkPreviewPayload = {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  faviconUrl: string | null;
};

const linkPreviewCache = new Map<string, { expiresAt: number; payload: LinkPreviewPayload }>();
const LINK_PREVIEW_TTL_MS = 1000 * 60 * 60 * 6;

function isPrivateHostname(hostname: string) {
  const normalized = hostname.toLowerCase();
  if (normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1") {
    return true;
  }
  if (/^10\./.test(normalized)) return true;
  if (/^192\.168\./.test(normalized)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)) return true;
  return false;
}

function sanitizePreviewUrl(value: string) {
  const parsed = new URL(value);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https links are supported.");
  }
  if (isPrivateHostname(parsed.hostname)) {
    throw new Error("Private network links are not supported.");
  }
  return parsed;
}

function resolveMetadataUrl(candidate: string | null, baseUrl: URL) {
  if (!candidate) return null;
  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return null;
  }
}

function extractMetaContent(html: string, selectors: string[]) {
  for (const selector of selectors) {
    const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${selector}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
    const match = html.match(pattern) ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${selector}["'][^>]*>`, "i"));
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function extractTitle(html: string) {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch?.[1]?.trim() ?? null;
}

function extractFavicon(html: string, baseUrl: URL) {
  const iconMatch = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>/i);
  if (iconMatch?.[1]) {
    return resolveMetadataUrl(iconMatch[1], baseUrl);
  }
  return resolveMetadataUrl("/favicon.ico", baseUrl);
}

async function fetchLinkPreview(targetUrl: string): Promise<LinkPreviewPayload> {
  const parsedUrl = sanitizePreviewUrl(targetUrl);
  const cacheHit = linkPreviewCache.get(parsedUrl.toString());
  if (cacheHit && cacheHit.expiresAt > Date.now()) {
    return cacheHit.payload;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch(parsedUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "ImpactLinkPreview/1.0",
        "accept": "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      throw new Error(`Preview fetch failed with ${response.status}`);
    }

    const html = await response.text();
    const payload: LinkPreviewPayload = {
      url: parsedUrl.toString(),
      title: extractMetaContent(html, ["og:title", "twitter:title"]) ?? extractTitle(html),
      description: extractMetaContent(html, ["og:description", "twitter:description", "description"]),
      imageUrl: resolveMetadataUrl(
        extractMetaContent(html, ["og:image", "twitter:image", "twitter:image:src"]),
        parsedUrl,
      ),
      faviconUrl: extractFavicon(html, parsedUrl),
    };

    linkPreviewCache.set(parsedUrl.toString(), {
      expiresAt: Date.now() + LINK_PREVIEW_TTL_MS,
      payload,
    });

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

type AuthedRequest = Request & {
  session: Request["session"] & {
    userId?: number;
  };
};

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, passwordHash: string) {
  const [salt, storedHash] = passwordHash.split(":");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(storedHash, "hex"), Buffer.from(derived, "hex"));
}

const isDev = process.env.NODE_ENV !== "production";

function logDev(phase: string, details?: unknown) {
  if (!isDev) return;
  if (details === undefined) {
    console.log(`[auth] ${phase}`);
    return;
  }
  console.log(`[auth] ${phase}`, details);
}

function logDevError(phase: string, error: unknown) {
  if (!isDev) return;
  console.error(`[auth] ${phase}`, error);
}

function serializeWorkspaces(workspaces: Awaited<ReturnType<typeof storage.listUserWorkspaces>>) {
  return workspaces.map(({ workspace, membership }) => ({
    workspace: {
      workspaceId: workspace.workspaceId,
      name: workspace.name,
      type: workspace.type,
      createdBy: workspace.createdBy,
      createdAt: workspace.createdAt,
    },
    membership: {
      id: membership.id,
      workspaceId: membership.workspaceId,
      uid: membership.uid,
      role: membership.role,
      createdAt: membership.createdAt,
    },
  }));
}

function getDefaultWorkspaceName(userName: string) {
  const firstName = userName.trim().split(/\s+/)[0] || "My";
  return `${firstName}'s Workspace`;
}

async function buildBootstrapPayloadForUser(user: User) {
  const workspaces = await storage.listUserWorkspaces(user.uid);
  return {
    user: {
      uid: user.uid,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    },
    workspaces: serializeWorkspaces(workspaces),
    activeWorkspaceId: workspaces[0]?.workspace.workspaceId ?? null,
    setupComplete: workspaces.length > 0,
  };
}

async function buildSessionPayload(userId: number) {
  const user = await storage.getUserById(userId);
  if (!user) return null;
  return buildBootstrapPayloadForUser(user);
}

async function ensureDefaultWorkspace(user: User) {
  const existingWorkspaces = await storage.listUserWorkspaces(user.uid);
  const existingWorkspace = existingWorkspaces[0]?.workspace;

  if (existingWorkspace) {
    logDev("docs created (reused)", {
      uid: user.uid,
      email: user.email,
      workspaceId: existingWorkspace.workspaceId,
    });
    await storage.seedWorkspace(existingWorkspace.workspaceId, user.name);
    return existingWorkspace.workspaceId;
  }

  const bundle = await storage.createWorkspace({
    name: getDefaultWorkspaceName(user.name),
    type: "personal",
    createdBy: user.uid,
  }, user.uid, "owner");

  await storage.seedWorkspace(bundle.workspace.workspaceId, user.name);
  logDev("docs created", {
    uid: user.uid,
    email: user.email,
    workspaceId: bundle.workspace.workspaceId,
  });
  return bundle.workspace.workspaceId;
}

function isUniqueViolation(err: unknown) {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23505";
}

function isEmailInUseError(err: unknown) {
  return isUniqueViolation(err);
}

function sendEmailInUse(res: Response) {
  return res.status(400).json({
    message: "An account with this email already exists. Please log in.",
    field: "email",
    code: "EMAIL_IN_USE",
  });
}

async function finalizeSignup(res: Response, user: User, status: 200 | 201 | 202) {
  const payload = await buildBootstrapPayloadForUser(user);
  payload.setupComplete = status !== 202;
  if (status === 202) {
    payload.activeWorkspaceId = payload.workspaces[0]?.workspace.workspaceId ?? null;
  }
  return {
    payload,
    send: () => res.status(status).json(payload),
  };
}

function handleZodError(err: unknown, res: Response) {
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      message: err.errors[0].message,
      field: err.errors[0].path.join("."),
    });
  }
  return null;
}

async function requireAuth(req: AuthedRequest, res: Response) {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }
  const user = await storage.getUserById(userId);
  if (!user) {
    req.session.destroy(() => undefined);
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }
  return user;
}

async function requireWorkspace(req: AuthedRequest, res: Response) {
  const user = await requireAuth(req, res);
  if (!user) return null;

  const workspaceId = Number(req.header("x-workspace-id"));
  if (!Number.isFinite(workspaceId)) {
    res.status(400).json({ message: "Missing workspace selection" });
    return null;
  }

  const workspaceBundle = await storage.getWorkspaceForUser(workspaceId, user.uid);
  if (!workspaceBundle) {
    res.status(403).json({ message: "Workspace access denied" });
    return null;
  }

  return { user, workspace: workspaceBundle.workspace, membership: workspaceBundle.membership };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  await storage.bootstrap();

  app.get("/api/link-preview", async (req, res) => {
    const input = String(req.query.url ?? "");
    if (!input) {
      return res.status(400).json({ message: "Missing url query parameter." });
    }

    try {
      const payload = await fetchLinkPreview(input);
      return res.json(payload);
    } catch (error) {
      return res.status(400).json({
        message: error instanceof Error ? error.message : "Could not load preview.",
      });
    }
  });

  app.get(api.auth.session.path, async (req, res) => {
    const userId = (req as AuthedRequest).session.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const payload = await buildSessionPayload(userId);
    if (!payload) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    res.json(payload);
  });

  app.post(api.auth.signup.path, async (req, res) => {
    try {
      const input = api.auth.signup.input.parse(req.body);
      const normalizedEmail = input.email.toLowerCase();

      logDev("START signup", { email: normalizedEmail });

      if (input.password !== input.confirmPassword) {
        return res.status(400).json({
          message: "Passwords do not match",
          field: "confirmPassword",
          code: "PASSWORD_MISMATCH",
        });
      }

      const existing = await storage.getUserByEmail(normalizedEmail);
      if (existing) {
        return sendEmailInUse(res);
      }

      let user: User;
      try {
        user = await storage.createUser({
          name: input.name.trim(),
          email: normalizedEmail,
          passwordHash: hashPassword(input.password),
        });
      } catch (err) {
        if (isEmailInUseError(err)) {
          logDevError("signup auth create failed: email in use", err);
          return sendEmailInUse(res);
        }
        throw err;
      }

      logDev("auth created", { uid: user.uid, email: user.email });

      (req as AuthedRequest).session.userId = user.uid;

      try {
        await ensureDefaultWorkspace(user);
        const result = await finalizeSignup(res, user, 201);
        logDev("finished", {
          uid: user.uid,
          email: user.email,
          activeWorkspaceId: result.payload.activeWorkspaceId,
        });
        result.send();
      } catch (err) {
        logDevError("setup failed after auth created", err);
        const result = await finalizeSignup(res, user, 202);
        result.send();
      }
    } catch (err) {
      if (handleZodError(err, res)) return;
      logDevError("signup failed", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByEmail(input.email);
      if (!user || !verifyPassword(input.password, user.passwordHash)) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      (req as AuthedRequest).session.userId = user.uid;
      const payload = await buildSessionPayload(user.uid);
      res.json(payload);
    } catch (err) {
      if (handleZodError(err, res)) return;
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.auth.finishSetup.path, async (req, res) => {
    const user = await requireAuth(req as AuthedRequest, res);
    if (!user) return;

    logDev("START finish setup", { uid: user.uid, email: user.email });

    try {
      await ensureDefaultWorkspace(user);
      const result = await finalizeSignup(res, user, 200);
      logDev("finished", {
        uid: user.uid,
        email: user.email,
        activeWorkspaceId: result.payload.activeWorkspaceId,
      });
      result.send();
    } catch (err) {
      logDevError("finish setup failed", err);
      res.status(500).json({
        message: "Account created. Finishing setup failed. Please retry.",
        code: "SETUP_FAILED",
      });
    }
  });

  app.post(api.auth.logout.path, async (req, res) => {
    (req as AuthedRequest).session.destroy(() => {
      res.status(204).end();
    });
  });

  app.put(api.auth.updateProfile.path, async (req, res) => {
    const user = await requireAuth(req as AuthedRequest, res);
    if (!user) return;

    try {
      const input = api.auth.updateProfile.input.parse(req.body);
      const updated = await storage.updateUser(user.uid, { name: input.name.trim() });
      res.json({
        uid: updated.uid,
        name: updated.name,
        email: updated.email,
        createdAt: updated.createdAt,
      });
    } catch (err) {
      if (handleZodError(err, res)) return;
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.workspaces.list.path, async (req, res) => {
    const user = await requireAuth(req as AuthedRequest, res);
    if (!user) return;

    const workspaces = await storage.listUserWorkspaces(user.uid);
    res.json(workspaces.map(({ workspace, membership }) => ({
      workspace: {
        workspaceId: workspace.workspaceId,
        name: workspace.name,
        type: workspace.type,
        createdBy: workspace.createdBy,
        createdAt: workspace.createdAt,
      },
      membership: {
        id: membership.id,
        workspaceId: membership.workspaceId,
        uid: membership.uid,
        role: membership.role,
        createdAt: membership.createdAt,
      },
    })));
  });

  app.post(api.workspaces.create.path, async (req, res) => {
    const user = await requireAuth(req as AuthedRequest, res);
    if (!user) return;

    try {
      const input = api.workspaces.create.input.parse(req.body);
      const bundle = await storage.createWorkspace({
        name: input.name.trim(),
        type: input.type,
        createdBy: user.uid,
      }, user.uid, "owner");
      await storage.seedWorkspace(bundle.workspace.workspaceId, user.name);

      res.status(201).json({
        workspace: bundle.workspace,
        membership: bundle.membership,
      });
    } catch (err) {
      if (handleZodError(err, res)) return;
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.causes.list.path, async (req, res) => {
    const context = await requireWorkspace(req as AuthedRequest, res);
    if (!context) return;
    res.json(await storage.getCauses(context.workspace.workspaceId));
  });

  app.post(api.causes.create.path, async (req, res) => {
    const context = await requireWorkspace(req as AuthedRequest, res);
    if (!context) return;

    try {
      const input = api.causes.create.input.parse(req.body);
      const cause = await storage.createCause({
        ...input,
        workspaceId: context.workspace.workspaceId,
      });
      res.status(201).json(cause);
    } catch (err) {
      if (handleZodError(err, res)) return;
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.causes.update.path, async (req, res) => {
    const context = await requireWorkspace(req as AuthedRequest, res);
    if (!context) return;

    try {
      const input = api.causes.update.input.parse(req.body);
      const cause = await storage.updateCause(Number(req.params.id), context.workspace.workspaceId, input);
      if (!cause) {
        return res.status(404).json({ message: "Cause not found" });
      }
      res.json(cause);
    } catch (err) {
      if (handleZodError(err, res)) return;
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.causes.delete.path, async (req, res) => {
    const context = await requireWorkspace(req as AuthedRequest, res);
    if (!context) return;
    await storage.deleteCause(Number(req.params.id), context.workspace.workspaceId);
    res.status(204).end();
  });

  app.get(api.monthlyLogs.list.path, async (req, res) => {
    const context = await requireWorkspace(req as AuthedRequest, res);
    if (!context) return;
    res.json(await storage.getMonthlyLogs(context.workspace.workspaceId));
  });

  app.get(api.monthlyLogs.get.path, async (req, res) => {
    const context = await requireWorkspace(req as AuthedRequest, res);
    if (!context) return;
    res.json(await storage.getMonthlyLogByMonth(req.params.monthKey, context.workspace.workspaceId));
  });

  app.post(api.monthlyLogs.reveal.path, async (req, res) => {
    const context = await requireWorkspace(req as AuthedRequest, res);
    if (!context) return;

    try {
      const { monthKey } = api.monthlyLogs.reveal.input.parse(req.body);
      const causes = await storage.getCauses(context.workspace.workspaceId);
      if (causes.length === 0) {
        return res.status(400).json({ message: "No causes available to reveal" });
      }

      const randomCause = causes[Math.floor(Math.random() * causes.length)];
      const type = randomCause.type === "either"
        ? (Math.random() > 0.5 ? "donation" : "volunteer")
        : randomCause.type;

      const log = await storage.createMonthlyLog({
        workspaceId: context.workspace.workspaceId,
        monthKey,
        causeId: randomCause.id,
        type,
        isCompleted: false,
      });

      res.status(201).json(log);
    } catch (err) {
      if (handleZodError(err, res)) return;
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.monthlyLogs.complete.path, async (req, res) => {
    const context = await requireWorkspace(req as AuthedRequest, res);
    if (!context) return;

    try {
      const input = api.monthlyLogs.complete.input.parse(req.body);
      const updateData: Partial<MonthlyLog> = {
        isCompleted: true,
        note: input.note,
        photoUrl: input.photoUrl,
      };
      if (input.amount !== undefined) updateData.amount = String(input.amount);
      if (input.hours !== undefined) updateData.hours = String(input.hours);
      if (input.dateCompleted !== undefined) updateData.dateCompleted = new Date(input.dateCompleted);

      const log = await storage.updateMonthlyLog(Number(req.params.id), context.workspace.workspaceId, updateData);
      if (!log) {
        return res.status(404).json({ message: "Monthly log not found" });
      }
      res.json(log);
    } catch (err) {
      if (handleZodError(err, res)) return;
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.monthlyLogs.delete.path, async (req, res) => {
    const context = await requireWorkspace(req as AuthedRequest, res);
    if (!context) return;
    await storage.deleteMonthlyLog(Number(req.params.id), context.workspace.workspaceId);
    res.status(204).end();
  });

  app.get(api.settings.get.path, async (req, res) => {
    const context = await requireWorkspace(req as AuthedRequest, res);
    if (!context) return;
    res.json(await storage.getSettings(context.workspace.workspaceId));
  });

  app.put(api.settings.update.path, async (req, res) => {
    const context = await requireWorkspace(req as AuthedRequest, res);
    if (!context) return;

    try {
      const input = api.settings.update.input.parse(req.body);
      res.json(await storage.updateSettings(context.workspace.workspaceId, input));
    } catch (err) {
      if (handleZodError(err, res)) return;
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.dashboard.stats.path, async (req, res) => {
    const context = await requireWorkspace(req as AuthedRequest, res);
    if (!context) return;

    const logs = await storage.getMonthlyLogs(context.workspace.workspaceId);
    let totalDonated = 0;
    let totalVolunteerHours = 0;
    const donationByMonth: Record<string, number> = {};
    const volunteerByMonth: Record<string, number> = {};
    let firstVolunteerDone = false;
    let firstDonationDone = false;

    logs.forEach((log) => {
      if (!log.isCompleted) return;

      if (log.type === "donation" && log.amount) {
        const amount = Number(log.amount);
        totalDonated += amount;
        donationByMonth[log.monthKey] = (donationByMonth[log.monthKey] || 0) + amount;
        firstDonationDone = true;
      }

      if (log.type === "volunteer" && log.hours) {
        const hours = Number(log.hours);
        totalVolunteerHours += hours;
        volunteerByMonth[log.monthKey] = (volunteerByMonth[log.monthKey] || 0) + hours;
        firstVolunteerDone = true;
      }
    });

    const workspaceCauses = await storage.getCauses(context.workspace.workspaceId);
    const causesByTier = {
      tier1: workspaceCauses.filter((cause) => cause.tier === 1).length,
      tier2: workspaceCauses.filter((cause) => cause.tier === 2).length,
      tier3: workspaceCauses.filter((cause) => cause.tier === 3).length,
    };

    const milestones: string[] = [];
    if (firstVolunteerDone) milestones.push("First volunteer month completed! 🌟");
    if (totalVolunteerHours >= 10) milestones.push("10 hours volunteered! 🙌");
    if (firstDonationDone) milestones.push("First donation made! 💖");
    if (totalDonated >= 250) milestones.push("$250 donated! 🎉");
    if (totalDonated >= 1000) milestones.push("$1,000 donated! 🏆");

    res.json({
      totalDonated,
      totalVolunteerHours,
      donationByMonth,
      volunteerByMonth,
      causesByTier,
      milestones,
    });
  });

  return httpServer;
}
