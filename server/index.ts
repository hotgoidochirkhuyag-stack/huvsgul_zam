import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes.js"; // .js өргөтгөл нэмсэн
import path from "path";
import { fileURLToPath } from "url";

// ES Module-д __dirname үүсгэх
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  const httpServer = createServer(app);

  await registerRoutes(httpServer, app);

  // VITE тохиргоог нөхцөлтэйгээр дуудна (Зөвхөн хөгжүүлэлтийн горимд)
  if (process.env.NODE_ENV !== "production") {
    // .js өргөтгөл заавал байх ёстой
    const { setupVite } = await import("./vite.js");
    await setupVite(httpServer, app);
  } else {
    // Production (Render) дээр вэб сайтаа үзүүлэх тохиргоо
    app.use(express.static(path.join(__dirname, "../client/dist")));

    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "../client/dist/index.html"));
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
