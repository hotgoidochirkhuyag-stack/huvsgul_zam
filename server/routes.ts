import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get(api.projects.list.path, async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post(api.contacts.create.path, async (req, res) => {
    try {
      const input = api.contacts.create.input.parse(req.body);
      const contact = await storage.createContact(input);
      res.status(201).json(contact);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  app.get(api.content.list.path, async (req, res) => {
    try {
      const content = await storage.getContent();
      res.json(content);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.patch(api.content.update.path, async (req, res) => {
    try {
      const section = req.params.section;
      const input = api.content.update.input.parse(req.body);
      const updated = await storage.updateContent(section, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to update content" });
    }
  });

  // Call this once on startup to ensure we have initial data
  seedDatabase().catch(console.error);

  return httpServer;
}

async function seedDatabase() {
  const existingContent = await storage.getContent();
  if (existingContent.length === 0) {
    await storage.updateContent('hero', {
      title: "Ирээдүйг Бүтээнэ",
      description: "Бид 30 гаруй жилийн туршлагаараа чанар стандартын өндөр түвшинд авто зам, гүүр, барилга байгууламжийн төслүүдийг амжилттай хэрэгжүүлж байна.",
      ctaText: "Төслүүдтэй танилцах",
      secondaryCtaText: "Холбогдох"
    });
  }
  const existingProjects = await storage.getProjects();
  if (existingProjects.length === 0) {
    const sampleProjects = [
      {
        title: "Ханх - Мондын чиглэлийн авто зам",
        description: "Олон улсын стандартын шаардлага хангасан хатуу хучилттай авто зам.",
        imageUrl: "https://images.unsplash.com/photo-1541888050604-20b12bc12e75?auto=format&fit=crop&q=80",
        category: "Авто зам"
      },
      {
        title: "Сэлэнгэ мөрний гүүр",
        description: "Урт хугацааны эдэлгээтэй, хүнд даацын автомашин нэвтрэх чадвартай гүүрэн байгууламж.",
        imageUrl: "https://images.unsplash.com/photo-1493246318656-5bfd4cfb29b8?auto=format&fit=crop&q=80",
        category: "Гүүр"
      },
      {
        title: "Барилга угсралт, инжнерийн шугам сүлжээ",
        description: "Барилгын материал, барилга усралын төслүүд.",
        imageUrl: "https://images.unsplash.com/photo-1541888081691-10c017efbbd1?auto=format&fit=crop&q=80",
        category: "Дэд бүтэц"
      }
    ];

    for (const p of sampleProjects) {
      await storage.createProject(p);
    }
    console.log("Database seeded with sample projects.");
  }
}
