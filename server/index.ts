import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";

async function startServer() {
  const app = express();

  // Middleware-үүд
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  const httpServer = createServer(app);

  // ЧУХАЛ: API замуудыг Vite-ээс өмнө бүртгэх
  // Ингэснээр сервер хүсэлтийг API гэж таньж чадна
  await registerRoutes(httpServer, app);

  // Vite тохиргоо (Хэрэв development горимд бол)
  if (process.env.NODE_ENV !== 'production') {
    await setupVite(httpServer, app);
  }

  // Сервер эхлүүлэх
  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[express] сервер 5000 порт дээр ажиллаж байна.`);
  });
}

startServer().catch((err) => {
  console.error("Сервер эхлүүлэхэд алдаа гарлаа:", err);
});