import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

const storage_config = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(process.cwd(), "client", "public", "uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage_config,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileType = req.file.mimetype.startsWith("video/") ? "video" : "image";
      const mediaItem = await storage.createMedia({
        url: `/uploads/${req.file.filename}`,
        type: fileType,
        filename: req.file.originalname,
      });

      res.status(201).json(mediaItem);
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.get("/api/media", async (req, res) => {
    try {
      const mediaItems = await storage.getMedia();
      res.json(mediaItems);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch media" });
    }
  });

  app.delete("/api/media/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const mediaItems = await storage.getMedia();
      const item = mediaItems.find(m => m.id === id);
      
      if (item) {
        const filePath = path.join(process.cwd(), "client", "public", item.url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      await storage.deleteMedia(id);
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete media" });
    }
  });

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

  app.post(api.projects.create.path, async (req, res) => {
    try {
      const input = api.projects.create.input.parse(req.body);
      const project = await storage.createProject(input);
      res.status(201).json(project);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.delete(api.projects.delete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProject(id);
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  app.get(api.gallery.list.path, async (req, res) => {
    try {
      const items = await storage.getGallery();
      res.json(items);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch gallery" });
    }
  });

  app.post(api.gallery.create.path, async (req, res) => {
    try {
      const input = api.gallery.create.input.parse(req.body);
      const item = await storage.createGallery(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to create gallery item" });
    }
  });

  app.delete(api.gallery.delete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteGallery(id);
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete gallery item" });
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
  const existingGallery = await storage.getGallery();
  if (existingGallery.length === 0) {
    const sampleImages = [
      "https://images.unsplash.com/photo-1541888050604-20b12bc12e75",
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e",
      "https://images.unsplash.com/photo-1541888081691-10c017efbbd1"
    ];
    for (const url of sampleImages) {
      await storage.createGallery({ imageUrl: url, description: "Манай амжилттай төслүүдийн нэг" });
    }
  }
  const existingProjects = await storage.getProjects();
  if (existingProjects.length === 0) {
    const sampleProjects = [
      {
        title: "Улаанбаатар - Дархан чиглэлийн авто зам",
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
