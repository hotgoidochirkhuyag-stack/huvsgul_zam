import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();

  // Middleware-үүд
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  const httpServer = createServer(app);

  // API замуудыг бүртгэх
  await registerRoutes(httpServer, app);

  // Орчны тохиргоо
  if (process.env.NODE_ENV !== 'production') {
    // Хөгжүүлэлтийн горим: Vite
    await setupVite(httpServer, app);
  } else {
    // ПРОДАКШН ГОРД: Статик файлуудыг түгээх
    const publicPath = path.join(__dirname, "../dist/public");
    app.use(express.static(publicPath));

    // Бүх хүсэлтийг index.html рүү чиглүүлнэ
    app.get("*", (_req, res) => {
      res.sendFile(path.join(publicPath, "index.html"));
    });
  }

  // Сервер эхлүүлэх
  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[express] сервер ${PORT} порт дээр ажиллаж байна.`);
  });
}

startServer().catch((err) => {
  console.error("Сервер эхлүүлэхэд алдаа гарлаа:", err);
});