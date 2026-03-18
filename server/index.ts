import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes.js";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Зургийн хавтас бэлтгэх + статик файл үзүүлэх
  const uploadsDir = path.join(process.cwd(), "uploads", "photos");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  const httpServer = createServer(app);

  await registerRoutes(httpServer, app);

  // VITE тохиргоог нөхцөлтэйгээр дуудна (Зөвхөн хөгжүүлэлтийн горимд)
  if (process.env.NODE_ENV !== "production") {
    // .js өргөтгөл заавал байх ёстой
    const { setupVite } = await import("./vite.js");
    await setupVite(httpServer, app);
  } else {
    // Production (Render) дээр вэб сайтаа үзүүлэх тохиргоо
    const distPublic = path.join(process.cwd(), "dist", "public");
    app.use(express.static(distPublic));

    app.use((req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(distPublic, "index.html"));
    });
  }

  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[express] сервер ${PORT} порт дээр ажиллаж байна.`);
  });
}

startServer().catch((err) => {
  console.error("Сервер эхлүүлэхэд алдаа гарлаа:", err);
  console.log("Password check:", process.env.ADMIN_PASSWORD ? "Олдлоо" : "Олдсонгүй");
});
