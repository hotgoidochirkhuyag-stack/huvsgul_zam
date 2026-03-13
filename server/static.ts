import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ES Module-д __dirname үүсгэх
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function serveStatic(app: Express) {
  // dist эсвэл public хавтас руу заах (Render дээр ихэвчлэн client/dist байдаг)
  const distPath = path.resolve(__dirname, "../client/dist");

  if (!fs.existsSync(distPath)) {
    console.warn(`[Warning] Build directory олдохгүй байна: ${distPath}`);
    return; // Алдаа заахын оронд анхааруулга өгөөд үргэлжлүүлнэ
  }

  app.use(express.static(distPath));

  // Бүх хүсэлтийг index.html рүү чиглүүлнэ (SPA чиглүүлэлт)
  app.get("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
