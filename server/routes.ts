import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import express from "express";
import { storage } from "./storage.js";
import { db } from "./db.js";
import * as schema from "../shared/schema.js";
import { eq } from "drizzle-orm";
import { z } from "zod";

// ============ ADMIN AUTH MIDDLEWARE ============
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.headers["x-admin-token"];
  if (token === "authenticated") {
    return next();
  }
  return res.status(401).json({ message: "Нэвтрэх шаардлагатай" });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ============ ADMIN AUTH API ============
  app.post("/api/admin/login", (req, res) => {
    const { username, password, role } = req.body;
    const cleanRole = (role || "").toString().toUpperCase();

    const users: Record<string, { u: string; p: string }> = {
      ADMIN:    { u: "admin",    p: "admin123" },
      BOARD:    { u: "board",    p: "board123" },
      PROJECT:  { u: "project",  p: "proj123" },
      ENGINEER: { u: "engineer", p: "eng123" },
    };

    const targetUser = users[cleanRole];

    if (targetUser && username === targetUser.u && password === targetUser.p) {
      return res.json({
        success: true,
        token: "authenticated",
        role: cleanRole,
      });
    }

    return res.status(401).json({ message: "Нэр эсвэл нууц үг буруу" });
  });

  // ============ PROJECTS API ============
  app.get("/api/projects", async (_req, res) => {
    const projects = await storage.getProjects();
    res.json(projects);
  });

  // ============ STATS IMAGES API ============
  app.get("/api/stats", async (_req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  // ============ VIDEOS API ============
  app.get("/api/videos", async (_req, res) => {
    const videos = await storage.getFeaturedVideos();
    res.json(videos);
  });

  // ============ GOOGLE SHEET PROXY ============
  app.get("/api/sheet-data", async (_req, res) => {
    try {
      const SHEET_ID = "1D_p41Q5TnkEcb7S48dfXwBhcb-q4TpKU1L9t2HYWSEM";
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Sheet HTTP алдаа: ${response.status}`);
      const text = await response.text();
      res.setHeader("Content-Type", "text/plain");
      res.send(text);
    } catch (e) {
      console.error("Sheet proxy алдаа:", e);
      res.status(500).json({ error: "Sheet татахад алдаа гарлаа" });
    }
  });

  // ============ CONTENT API ============
  app.get("/api/content", async (_req, res) => {
    const rows = await db.select().from(schema.content);
    res.json(rows);
  });

  // ============ SUBSCRIPTIONS API ============
  app.post("/api/subscriptions", async (req, res) => {
    try {
      const subSchema = z.object({
        email: z.string().email(),
        type: z.string().min(1),
      });
      const data = subSchema.parse(req.body);
      const [sub] = await db.insert(schema.subscriptions).values(data).returning();
      res.status(201).json(sub);
    } catch (e) {
      res.status(500).json({ error: "И-мэйл хадгалахад алдаа гарлаа" });
    }
  });

  app.get("/api/subscriptions", requireAdmin, async (_req, res) => {
    const subs = await db.select().from(schema.subscriptions).orderBy(schema.subscriptions.createdAt);
    res.json(subs);
  });

  app.delete("/api/subscriptions/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Буруу ID" });
    await db.delete(schema.subscriptions).where(eq(schema.subscriptions.id, id));
    res.json({ success: true });
  });

  // ============ CONTACTS API ============
  app.post("/api/contacts", async (req, res) => {
    try {
      const contactSchema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        message: z.string().min(1),
      });
      const data = contactSchema.parse(req.body);
      const [contact] = await db.insert(schema.contacts).values(data).returning();
      res.status(201).json(contact);
    } catch (e) {
      res.status(500).json({ error: "Хадгалахад алдаа гарлаа" });
    }
  });

  app.get("/api/contacts", requireAdmin, async (_req, res) => {
    const msgs = await db.select().from(schema.contacts).orderBy(schema.contacts.createdAt);
    res.json(msgs);
  });

  app.delete("/api/contacts/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Буруу ID" });
    await db.delete(schema.contacts).where(eq(schema.contacts.id, id));
    res.json({ success: true });
  });

  seedInitialContent().catch(console.error);
  return httpServer;
}

async function seedInitialContent() {
  try {
    const existing = await db.select().from(schema.content).where(eq(schema.content.section, "hero"));
    if (existing.length === 0) {
      await db.insert(schema.content).values({
        section: "hero",
        title: "Ирээдүйг Бүтээнэ",
        description: "Бид олон жилийн туршлагаараа чанар стандартын өндөр түвшинд авто зам, гүүр, барилга байгууламжийн төслүүдийг амжилттай хэрэгжүүлж байна.",
        ctaText: "Төслүүдтэй танилцах",
        secondaryCtaText: "Холбогдох",
      });
    }
  } catch (e) {}
}
