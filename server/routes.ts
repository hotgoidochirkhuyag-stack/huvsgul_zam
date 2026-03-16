import type { Express } from "express";
import type { Server } from "http";
import express from "express";
import { storage } from "./storage.js";
import { db } from "./db.js";
import * as schema from "../shared/schema.js";
import { eq } from "drizzle-orm";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // JSON болон URL-encoded өгөгдлийг хамгийн эхэнд унших
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ============ ADMIN AUTH API ============
  app.post("/api/admin/login", (req, res) => {
    // Хүсэлт ирж байгаа эсэхийг баталгаажуулах
    console.log("БОДИТ_ХҮСЭЛТ:", req.body); 

    const { username, password, role } = req.body;

    // role null эсвэл undefined ирсэн тохиолдолд хамгаалах
    const cleanRole = (role || "").toString().toUpperCase();

    const users: Record<string, { u: string; p: string }> = {
      ADMIN:    { u: "admin",    p: "admin123" },
      BOARD:    { u: "board",    p: "board123" },
      PROJECT:  { u: "project",  p: "proj123" },
      ENGINEER: { u: "engineer", p: "eng123" },
    };

    const targetUser = users[cleanRole];

    // Баталгаажуулалт
    if (targetUser && username === targetUser.u && password === targetUser.p) {
      return res.json({
        success: true,
        token: "authenticated",
        role: cleanRole,
      });
    }

    console.log("АЛДАА: Илгээсэн өгөгдөл таарсангүй:", { username, password, cleanRole });
    return res.status(401).json({ message: "Нэр эсвэл нууц үг буруу" });
  });

  // ... бусад API-ууд хэвээрээ ...
  app.get("/api/projects", async (_req, res) => {
    const projects = await storage.getProjects();
    res.json(projects);
  });

  app.get("/api/content", async (_req, res) => {
    const rows = await db.select().from(schema.content);
    res.json(rows);
  });

  app.post("/api/contacts", async (req, res) => {
    try {
      const contactSchema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
        message: z.string().min(1),
      });
      const data = contactSchema.parse(req.body);
      const [contact] = await db.insert(schema.contacts).values(data).returning();
      res.status(201).json(contact);
    } catch (e) {
      res.status(500).json({ error: "Хадгалахад алдаа гарлаа" });
    }
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