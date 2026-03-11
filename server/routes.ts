import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ============ PROJECTS API ============
  // GET: Бүх төслүүдийг авах (Cloudinary "done" хавтасаас)
  app.get("/api/projects", async (_req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      console.error("Projects API алдаа:", error);
      res.status(500).json({ error: "Төслүүдийг татсангүй" });
    }
  });

  // ============ STATS API ============
  // GET: Stats зурагнуудыг авах (Cloudinary "stats" хавтасаас)
  app.get("/api/stats", async (_req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Stats API алдаа:", error);
      res.status(500).json({ error: "Статистикийн зурагнуудыг татсангүй" });
    }
  });

  // ============ VIDEOS API ============
  // GET: Featured videos авах (Cloudinary "videos" хавтасаас)
  app.get("/api/videos", async (_req, res) => {
    try {
      const videos = await storage.getFeaturedVideos();
      res.json(videos);
    } catch (error) {
      console.error("Videos API алдаа:", error);
      res.status(500).json({ error: "Бичлэгүүдийг татсангүй" });
    }
  });

  // ============ UPLOAD API (дараахын хувьд) ============
  // POST: Файл upload хийх
  // app.post("/api/upload", multer.single("file"), async (req, res) => {
  //   try {
  //     if (!req.file) {
  //       return res.status(400).json({ message: "Файл сонгоно уу" });
  //     }
  //     const folder = req.body.folder || "uploads";
  //     const result = await storage.uploadFile(req.file.buffer, req.file.originalname, folder);
  //     res.json(result);
  //   } catch (error) {
  //     res.status(500).json({ error: "Upload бэйсээл" });
  //   }
  // });

  return httpServer;
}
