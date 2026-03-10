import { storage } from "./storage";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Projects
  app.get("/api/projects", async (req, res) => res.json(await storage.getProjects()));
  // Stats
  app.get("/api/stats", async (req, res) => res.json(await storage.getStats()));
  // Featured Videos
  app.get("/api/videos", async (req, res) => res.json(await storage.getFeaturedVideos()));

  return httpServer;
}