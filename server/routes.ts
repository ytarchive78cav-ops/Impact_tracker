import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Seed Database on startup
  async function seed() {
    const existingCauses = await storage.getCauses();
    if (existingCauses.length === 0) {
      await storage.createCause({
        name: "Local Animal Shelter",
        type: "either",
        tier: 1,
        submittedBy: "Arlayna",
        description: "Helping the cute animals find homes.",
        tags: "animals,local"
      });
      await storage.createCause({
        name: "World Wildlife Fund",
        type: "donation",
        tier: 2,
        submittedBy: "David",
        description: "Protecting endangered species globally.",
        tags: "environment,animals"
      });
      await storage.createCause({
        name: "Community Food Bank",
        type: "volunteer",
        tier: 1,
        submittedBy: "David",
        description: "Sorting and packing food for those in need.",
        tags: "local community"
      });
    }
  }
  
  seed().catch(console.error);

  app.get(api.causes.list.path, async (req, res) => {
    const causes = await storage.getCauses();
    res.json(causes);
  });

  app.post(api.causes.create.path, async (req, res) => {
    try {
      const input = api.causes.create.input.parse(req.body);
      const cause = await storage.createCause(input);
      res.status(201).json(cause);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.causes.update.path, async (req, res) => {
    try {
      const input = api.causes.update.input.parse(req.body);
      const cause = await storage.updateCause(Number(req.params.id), input);
      if (!cause) {
        return res.status(404).json({ message: "Cause not found" });
      }
      res.json(cause);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.causes.delete.path, async (req, res) => {
    await storage.deleteCause(Number(req.params.id));
    res.status(204).end();
  });

  app.get(api.monthlyLogs.list.path, async (req, res) => {
    const logs = await storage.getMonthlyLogs();
    res.json(logs);
  });

  app.get(api.monthlyLogs.get.path, async (req, res) => {
    const logs = await storage.getMonthlyLogByMonth(req.params.monthKey);
    res.json(logs);
  });

  app.post(api.monthlyLogs.reveal.path, async (req, res) => {
    try {
      const { monthKey } = api.monthlyLogs.reveal.input.parse(req.body);
      
      // Removed "existing" check to allow multiple entries
      
      const causes = await storage.getCauses();
      if (causes.length === 0) {
        return res.status(400).json({ message: "No causes available to reveal" });
      }
      
      const randomCause = causes[Math.floor(Math.random() * causes.length)];
      let type = randomCause.type;
      if (type === 'either') {
        type = Math.random() > 0.5 ? 'donation' : 'volunteer';
      }

      const log = await storage.createMonthlyLog({
        monthKey,
        causeId: randomCause.id,
        type,
        isCompleted: false,
      });
      
      res.status(201).json(log);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.monthlyLogs.complete.path, async (req, res) => {
    try {
      const input = api.monthlyLogs.complete.input.parse(req.body);
      const updateData: any = { isCompleted: true, ...input };
      if (input.amount !== undefined) updateData.amount = String(input.amount);
      if (input.hours !== undefined) updateData.hours = String(input.hours);
      if (input.dateCompleted !== undefined) updateData.dateCompleted = new Date(input.dateCompleted);

      const log = await storage.updateMonthlyLog(Number(req.params.id), updateData);
      res.json(log);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.monthlyLogs.delete.path, async (req, res) => {
    await storage.deleteMonthlyLog(Number(req.params.id));
    res.status(204).end();
  });

  app.get(api.settings.get.path, async (req, res) => {
    const settings = await storage.getSettings();
    res.json(settings);
  });

  app.put(api.settings.update.path, async (req, res) => {
    try {
      const input = api.settings.update.input.parse(req.body);
      const settings = await storage.updateSettings(input);
      res.json(settings);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.dashboard.stats.path, async (req, res) => {
    const logs = await storage.getMonthlyLogs();
    
    let totalDonated = 0;
    let totalVolunteerHours = 0;
    const donationByMonth: Record<string, number> = {};
    const volunteerByMonth: Record<string, number> = {};
    let firstVolunteerDone = false;
    let firstDonationDone = false;
    
    logs.forEach(log => {
      if (log.isCompleted) {
        if (log.type === 'donation' && log.amount) {
          const amt = parseFloat(log.amount);
          totalDonated += amt;
          donationByMonth[log.monthKey] = (donationByMonth[log.monthKey] || 0) + amt;
          firstDonationDone = true;
        } else if (log.type === 'volunteer' && log.hours) {
          const hrs = parseFloat(log.hours);
          totalVolunteerHours += hrs;
          volunteerByMonth[log.monthKey] = (volunteerByMonth[log.monthKey] || 0) + hrs;
          firstVolunteerDone = true;
        }
      }
    });

    const causes = await storage.getCauses();
    const causesByTier = {
      tier1: causes.filter(c => c.tier === 1).length,
      tier2: causes.filter(c => c.tier === 2).length,
      tier3: causes.filter(c => c.tier === 3).length,
    };

    const milestones = [];
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
      milestones
    });
  });

  return httpServer;
}
