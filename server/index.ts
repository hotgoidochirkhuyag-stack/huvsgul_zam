import { storage } from "./storage";
import { type Express } from "express";
import { type Server } from "http";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.get("/api/projects", async (_req, res) => {
    // Cache-ийг албаар устгаж байна
    res.set('Cache-Control', 'no-store');
    const data = await storage.getProjects();
    res.json(data);
  });

  return httpServer;
}