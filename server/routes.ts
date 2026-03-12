import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ============ PROJECTS API ============
  // GET: Бүх төслүүдийг авах (Cloudinary "done/" хавтасаас)
  app.get("/api/projects", async (_req, res) => {
    try {
      res.set('Cache-Control', 'no-store');
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      console.error("Projects API алдаа:", error);
      res.status(500).json({ error: "Төслүүдийг татсангүй" });
    }
  });

  // ============ STATS API ============
  // GET: Stats зурагнуудыг авах (Cloudinary "stats/" хавтасаас)
  app.get("/api/stats", async (_req, res) => {
    try {
      res.set('Cache-Control', 'no-store');
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Stats API алдаа:", error);
      res.status(500).json({ error: "Статистикийн зурагнуудыг татсангүй" });
    }
  });

  // ============ VIDEOS API ============
  // GET: Featured videos авах (Cloudinary "videos/" хавтасаас)
  app.get("/api/videos", async (_req, res) => {
    try {
      res.set('Cache-Control', 'no-store');
      const videos = await storage.getFeaturedVideos();
      res.json(videos);
    } catch (error) {
      console.error("Videos API алдаа:", error);
      res.status(500).json({ error: "Бичлэгүүдийг татсангүй" });
    }
  });

  // ============ CONTENT API ============
  // GET: Hero болон бусад хэсгийн текст контент (DB-ээс)
  app.get("/api/content", async (_req, res) => {
    try {
      const rows = await db.select().from(schema.content);
      res.json(rows);
    } catch (error) {
      console.error("Content API алдаа:", error);
      res.json([]); // Алдаа гарвал хоосон массив буцаана (fallback-т зориулж)
    }
  });

  // PATCH: Hero текстийг шинэчлэх
  app.patch("/api/content/:section", async (req, res) => {
    try {
      const { section } = req.params;
      const updates = req.body;
      const existing = await db.select().from(schema.content).where(eq(schema.content.section, section));
      if (existing.length === 0) {
        const [created] = await db.insert(schema.content).values({ section, title: updates.title || "", ...updates }).returning();
        return res.json(created);
      }
      const [updated] = await db.update(schema.content).set({ ...updates, updatedAt: new Date() }).where(eq(schema.content.section, section)).returning();
      res.json(updated);
    } catch (error) {
      console.error("Content update алдаа:", error);
      res.status(500).json({ error: "Контент шинэчлэхэд алдаа гарлаа" });
    }
  });

  // ============ SUBSCRIPTIONS API ============
  // POST: Footer email бүртгэлийг хадгалах
  app.post("/api/subscriptions", async (req, res) => {
    try {
      const subSchema = z.object({
        email: z.string().email("Зөв и-мэйл хаяг оруулна уу"),
        type: z.string().min(1),
      });
      const data = subSchema.parse(req.body);
      const [sub] = await db.insert(schema.subscriptions).values(data).returning();
      res.status(201).json(sub);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Subscription API алдаа:", error);
      res.status(500).json({ error: "Бүртгэхэд алдаа гарлаа" });
    }
  });

  // GET: Бүх subscriptions авах (admin-д зориулсан)
  app.get("/api/subscriptions", async (_req, res) => {
    try {
      const subs = await db.select().from(schema.subscriptions).orderBy(schema.subscriptions.createdAt);
      res.json(subs);
    } catch (error) {
      console.error("Subscriptions GET алдаа:", error);
      res.status(500).json({ error: "Бүртгэлийг татахад алдаа гарлаа" });
    }
  });

  // DELETE: Subscription устгах
  app.delete("/api/subscriptions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(schema.subscriptions).where(eq(schema.subscriptions.id, id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Устгахад алдаа гарлаа" });
    }
  });

  // GET: Бүх contacts авах (admin-д зориулсан)
  app.get("/api/contacts", async (_req, res) => {
    try {
      const contacts = await db.select().from(schema.contacts).orderBy(schema.contacts.createdAt);
      res.json(contacts);
    } catch (error) {
      console.error("Contacts GET алдаа:", error);
      res.status(500).json({ error: "Мэдэгдэлүүдийг татахад алдаа гарлаа" });
    }
  });

  // DELETE: Contact устгах
  app.delete("/api/contacts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(schema.contacts).where(eq(schema.contacts.id, id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Устгахад алдаа гарлаа" });
    }
  });

  // ============ CONTACTS API ============
  // POST: Холбоо барих формын өгөгдлийг хадгалах
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
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Contact API алдаа:", error);
      res.status(500).json({ error: "Холбоо барих мэдээлэл хадгалахад алдаа гарлаа" });
    }
  });

  // ============ GOOGLE SHEET PROXY API ============
  // GET: Google Sheets CSV-г серверийн дундуур авах (CORS-ыг шийднэ)
  app.get("/api/sheet-data", async (req, res) => {
    try {
      const url = req.query.url as string || "https://docs.google.com/spreadsheets/d/e/2PACX-1vQb3rZqDRJ1qaDEmvNHcnhlHjAFAR1XBesPxDFH5d20X8GVU8VAsuijvUcz8asTLpe8YgT65Y9-7yFZ/pub?output=csv";
      const resp = await fetch(`${url}&cache_bust=${Date.now()}`);
      if (!resp.ok) throw new Error(`Sheet HTTP алдаа: ${resp.status}`);
      const text = await resp.text();
      res.set("Content-Type", "text/plain");
      res.send(text);
    } catch (error) {
      console.error("Google Sheet Proxy алдаа:", error);
      res.status(500).json({ error: "Sheet-ээс уншихад алдаа гарлаа" });
    }
  });

  // Эхний удаад hero контент байхгүй бол үүсгэнэ
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
        description: "Бид 30 гаруй жилийн туршлагаараа чанар стандартын өндөр түвшинд авто зам, гүүр, барилга байгууламжийн төслүүдийг амжилттай хэрэгжүүлж байна.",
        ctaText: "Төслүүдтэй танилцах",
        secondaryCtaText: "Холбогдох",
      });
      console.log("Hero контент үүсгэгдлээ.");
    }
  } catch (e) {
    // DB холболт байхгүй бол алдааг дарна
  }
}
