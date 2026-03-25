import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { storage } from "./storage.js";
import { db } from "./db.js";
import * as schema from "../shared/schema.js";
import { eq, desc, and, gte, lte, sql, lt } from "drizzle-orm";
import { z } from "zod";
import { calculateEmployeeKpi, calculateTeamKpi, seedDefaultKpiConfigs } from "./kpiEngine.js";
import { syncNormsFromOrder, syncNormsBySection, ZZBND_NORMS, NORM_SECTIONS } from "./normAgent.js";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// ======= JWT / AUTH HELPERS =======
const JWT_SECRET  = process.env.SESSION_SECRET || "hvl-zam-erp-2025";
const SALT_ROUNDS = 10;

interface AuthPayload { role: string; username: string; }

function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}

function verifyToken(token: string): AuthPayload | null {
  try { return jwt.verify(token, JWT_SECRET) as AuthPayload; }
  catch { return null; }
}

/** Нууц үг шалгах: bcrypt hash эсвэл plaintext (урьд оруулсан legacy нууц үгд) */
async function checkPassword(input: string, stored: string): Promise<boolean> {
  if (stored.startsWith("$2b$") || stored.startsWith("$2a$")) {
    return bcrypt.compare(input, stored);
  }
  return input === stored;
}

// Express request-д authRole / authUser талбар нэмэх
declare module "express-serve-static-core" {
  interface Request { authRole?: string; authUser?: string; }
}

// ======= CLOUDINARY тохиргоо =======
const hasCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Локал uploads фолдер
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(LOCAL_UPLOAD_DIR)) fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });

async function uploadFile(
  buffer: Buffer,
  originalname: string,
  folder: string
): Promise<{ secure_url: string; public_id: string }> {
  if (hasCloudinary) {
    // Cloudinary руу upload хийх
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: "image" },
        (err, result) => {
          if (err || !result) return reject(err ?? new Error("Cloudinary upload failed"));
          resolve({ secure_url: result.secure_url, public_id: result.public_id });
        }
      );
      Readable.from(buffer).pipe(stream);
    });
  } else {
    // Локал fallback — uploads/ фолдерт хадгалах
    const ext = path.extname(originalname) || ".jpg";
    const safeName = folder.replace(/\//g, "_");
    const filename = `${safeName}_${Date.now()}${ext}`;
    const filepath = path.join(LOCAL_UPLOAD_DIR, filename);
    fs.writeFileSync(filepath, buffer);
    return {
      secure_url: `/uploads/${filename}`,
      public_id:  `local/${filename}`,
    };
  }
}

// ======= MULTER — санах ойд хадгалах (Cloudinary руу дамжуулах) =======
const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|heic/i;
    cb(null, allowed.test(path.extname(file.originalname)));
  },
});

// ======= DOCUMENT UPLOAD — PDF/Excel/Word/PPT/Image хадгалах =======
async function uploadDocument(
  buffer: Buffer,
  originalname: string,
  folder: string
): Promise<{ secure_url: string; public_id: string }> {
  if (hasCloudinary) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: "auto", use_filename: true, unique_filename: true },
        (err, result) => {
          if (err || !result) return reject(err ?? new Error("Cloudinary upload failed"));
          resolve({ secure_url: result.secure_url, public_id: result.public_id });
        }
      );
      Readable.from(buffer).pipe(stream);
    });
  } else {
    const ext = path.extname(originalname) || ".bin";
    const safeName = `${folder.replace(/\//g, "_")}_${Date.now()}${ext}`;
    const filepath = path.join(LOCAL_UPLOAD_DIR, safeName);
    fs.writeFileSync(filepath, buffer);
    return { secure_url: `/uploads/${safeName}`, public_id: `local/${safeName}` };
  }
}

const docUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
  fileFilter: (_req, file, cb) => {
    const allowed = /pdf|xlsx|xls|docx|doc|pptx|ppt|jpeg|jpg|png|webp/i;
    cb(null, allowed.test(path.extname(file.originalname)));
  },
});

// ============ ADMIN AUTH MIDDLEWARE ============
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = (req.headers["x-admin-token"] as string) || "";
  if (!token) return res.status(401).json({ message: "Нэвтрэх шаардлагатай" });

  // Legacy token (шилжилтийн үе — хуучин client-д зориулсан)
  if (token === "authenticated") {
    req.authRole = "ADMIN";
    req.authUser = "legacy";
    return next();
  }

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ message: "Токен хүчингүй буюу хугацаа дууссан байна" });

  req.authRole = payload.role;
  req.authUser = payload.username;
  return next();
}

/** Тодорхой роль шаардах middleware (requireAdmin дотор ажиллана) */
function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    requireAdmin(req, res, () => {
      if (!roles.includes(req.authRole ?? "")) {
        return res.status(403).json({ message: `Уг үйлдэлд зөвхөн ${roles.join(" / ")} роль хандах эрхтэй` });
      }
      next();
    });
  };
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ============ AUDIT LOG HELPER ============
  const logActivity = async (role: string, username: string, action: string, details?: string, ip?: string) => {
    try {
      await db.insert(schema.activityLogs).values({ role, username, action, details: details ?? null, ip: ip ?? null });
    } catch (e) { console.error("Log error:", e); }
  };

  // ============ ADMIN AUTH API ============
  app.post("/api/admin/login", async (req, res) => {
    const { username, password, role } = req.body;
    const cleanRole = (role || "").toString().toUpperCase();
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() || req.socket.remoteAddress || "unknown";

    const defaults: Record<string, { u: string; p: string }> = {
      ADMIN:      { u: "admin", p: "admin" },
      BOARD:      { u: "admin", p: "admin" },
      PROJECT:    { u: "admin", p: "admin" },
      ENGINEER:   { u: "admin", p: "admin" },
      HR:         { u: "admin", p: "admin" },
      SUPERVISOR: { u: "admin", p: "admin" },
      MECHANIC:   { u: "admin", p: "admin" },
      WAREHOUSE:  { u: "admin", p: "admin" },
      LAB:        { u: "admin", p: "admin" },
      SALES:      { u: "admin", p: "admin" },
    };

    const [dbCred] = await db.select().from(schema.roleCredentials).where(eq(schema.roleCredentials.role, cleanRole));
    const cred = dbCred
      ? { u: dbCred.username, p: dbCred.password }
      : defaults[cleanRole];

    if (cred && username === cred.u && (await checkPassword(password, cred.p))) {
      const token = signToken({ role: cleanRole, username });
      await logActivity(cleanRole, username, "НЭВТЭРСЭН", `${cleanRole} самбарт нэвтэрсэн`, ip);
      return res.json({ success: true, token, role: cleanRole });
    }
    await logActivity(cleanRole, username || "?", "НЭВТРЭЛТ АМЖИЛТГҮЙ", `Буруу нууц үг оруулсан — роль: ${cleanRole}`, ip);
    return res.status(401).json({ message: "Нэр эсвэл нууц үг буруу" });
  });

  // ====== Бүртгэл авах (admin only) ======
  app.get("/api/admin/activity-logs", requireAdmin, async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 200;
    const role  = req.query.role as string;
    const rows  = await db.select().from(schema.activityLogs)
      .where(role && role !== "ALL" ? eq(schema.activityLogs.role, role) : undefined)
      .orderBy(desc(schema.activityLogs.createdAt))
      .limit(limit);
    res.json(rows);
  });

  // ====== Бүртгэл гараас нэмэх (хэрэглэгч самбараас ажлын бүртгэл) ======
  app.post("/api/admin/activity-logs", requireAdmin, async (req, res) => {
    const { role, username, action, details } = req.body;
    if (!role || !username || !action) return res.status(400).json({ error: "Дутуу мэдээлэл" });
    await logActivity(role, username, action, details);
    res.json({ success: true });
  });

  // ====== Нэвтрэлтийн тохиргоо авах (admin only) ======
  app.get("/api/admin/credentials", requireRole("ADMIN"), async (_req, res) => {
    const ALL_ROLES = ["ADMIN","BOARD","PROJECT","ENGINEER","HR","SUPERVISOR","MECHANIC","WAREHOUSE","LAB","SALES"];
    const rows = await db.select().from(schema.roleCredentials);
    const map = Object.fromEntries(rows.map(r => [r.role, r]));
    const result = ALL_ROLES.map(role => {
      const stored = map[role];
      return {
        role,
        username: stored?.username ?? "admin",
        // Bcrypt hash буцааж болохгүй — ★★★★★★★★ маскаар харуулна
        passwordSet: stored ? (stored.password.startsWith("$2b$") || stored.password.startsWith("$2a$") ? true : false) : false,
        passwordHint: stored ? "••••••••" : "(default: admin)",
      };
    });
    res.json(result);
  });

  // ====== Нэвтрэлт шинэчлэх (ADMIN роль шаардана) ======
  app.put("/api/admin/credentials/:role", requireRole("ADMIN"), async (req, res) => {
    const role = req.params.role.toUpperCase();
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Нэр болон нууц үг шаардлагатай" });
    // Нууц үгийг bcrypt-ээр хаш хийж хадгална
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const [existing] = await db.select().from(schema.roleCredentials).where(eq(schema.roleCredentials.role, role));
    if (existing) {
      await db.update(schema.roleCredentials).set({ username, password: hashedPassword, updatedAt: new Date() }).where(eq(schema.roleCredentials.role, role));
    } else {
      await db.insert(schema.roleCredentials).values({ role, username, password: hashedPassword });
    }
    res.json({ success: true });
  });

  // ============ WEBSITE API ============
  // Cloudinary галерей — нүүр хуудасны showcase
  app.get("/api/projects", async (_req, res) => {
    res.json(await storage.getProjects());
  });

  // ===== ТЕНДЕРТ ЯВУУЛСАН ТӨСЛҮҮД — tender_projects хүснэгт (бүрэн тусдаа) =====
  app.get("/api/tender-projects", async (_req, res) => {
    const rows = await db.select().from(schema.tenderProjects).orderBy(schema.tenderProjects.id);
    res.json(rows);
  });
  app.post("/api/tender-projects", requireAdmin, async (req, res) => {
    try {
      const { title, description, category, location, year, progress } = req.body;
      if (!title) return res.status(400).json({ error: "title шаардлагатай" });
      const [p] = await db.insert(schema.tenderProjects).values({
        title, description: description || "", category: category || "Авто зам",
        location: location || "", year: year || "", progress: Number(progress ?? 0),
      }).returning();
      res.status(201).json(p);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.patch("/api/tender-projects/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { title, description, category, location, year, progress } = req.body;
      const [p] = await db.update(schema.tenderProjects)
        .set({ title, description, category, location, year, progress: Number(progress ?? 0) })
        .where(eq(schema.tenderProjects.id, id)).returning();
      res.json(p);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.delete("/api/tender-projects/:id", requireAdmin, async (req, res) => {
    await db.delete(schema.tenderProjects).where(eq(schema.tenderProjects.id, parseInt(req.params.id)));
    res.json({ ok: true });
  });
  app.patch("/api/projects/metadata", requireAdmin, async (req, res) => {
    try {
      const { publicId, title, description, location, length, year, clientName, contractValue, progress } = req.body;
      if (!publicId) return res.status(400).json({ error: "publicId шаардлагатай" });
      const [upserted] = await db.insert(schema.projectMetadata)
        .values({ publicId, title, description, location, length, year, clientName, contractValue, progress })
        .onConflictDoUpdate({
          target: schema.projectMetadata.publicId,
          set: { title, description, location, length, year, clientName, contractValue, progress },
        })
        .returning();
      res.json(upserted);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.get("/api/stats", async (_req, res) => {
    res.json(await storage.getStats());
  });

  app.patch("/api/stats/metadata", requireAdmin, async (req, res) => {
    try {
      const { publicId, description } = req.body;
      if (!publicId) return res.status(400).json({ error: "publicId шаардлагатай" });
      await storage.upsertStatsMetadata(publicId, description ?? "");
      res.json({ ok: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // ============ AI ҮНИЙН САНАЛ (rate-limited, multi-variant) ============
  // 1 минутанд 12-оос дээш хайлт хийж болохгүй
  const aiRateMap = new Map<string, number[]>();
  const AI_RATE_LIMIT = 12;
  const AI_WINDOW_MS = 60_000;

  app.post("/api/ai/price-estimate", async (req, res) => {
    const ip = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "unknown").split(",")[0].trim();
    const now = Date.now();
    const timestamps = (aiRateMap.get(ip) || []).filter(t => now - t < AI_WINDOW_MS);
    if (timestamps.length >= AI_RATE_LIMIT) {
      const retryAfter = Math.ceil((timestamps[0] + AI_WINDOW_MS - now) / 1000);
      return res.status(429).json({ error: `Хэт олон хайлт. ${retryAfter} секундийн дараа дахин оролдоно уу.`, retryAfter });
    }
    timestamps.push(now);
    aiRateMap.set(ip, timestamps);

    const { product, quantity } = req.body;
    if (!product || !quantity) return res.status(400).json({ error: "Бүтээгдэхүүн, тоо хэмжээ шаардлагатай" });
    const qty = parseFloat(quantity) || 1;
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.0-flash",
          tools: [{ googleSearch: {} } as any],
        });

        const prompt = `Чи бол Монголын барилга, дэд бүтцийн материалын зах зээлийн шинжээч.
Хэрэглэгч: "${product}" бүтээгдэхүүний ${qty} нэгж захиалахыг хүсэж байна.

2025-2026 оны Монголын зах зээлийн бодит үнийг үндэслэн энэ материалын БҮХИЙ Л ангилал, марк, зэрэглэлийг (жишээ нь бетон зуурмагийн хувьд М100, М150, М200, М250, М300, М350, М400 гэх мэт) дараах JSON форматаар гаргаж өг:

{
  "items": [
    {
      "name": "Бүтээгдэхүүний бүрэн нэр (марк/ангилалтай)",
      "unit": "м³ эсвэл тн эсвэл бусад",
      "pricePerUnit": { "min": тоо, "max": тоо, "avg": тоо },
      "totalPrice": { "min": тоо, "max": тоо, "avg": тоо },
      "note": "энэ ангиллын онцлог, хэрэглэх газар (монголоор)"
    }
  ],
  "marketFactors": ["үнэд нөлөөлөх хүчин зүйл 1", "хүчин зүйл 2", "хүчин зүйл 3"],
  "generalNote": "нийтлэг чухал тэмдэглэл монголоор",
  "discount": "том захиалгын хямдрал (${qty} нэгжийн хувьд)"
}

Зөвхөн цэвэр JSON буцаа. Үнийг Монгол төгрөгөөр бич. Нийт дүнг quantity=${qty}-р үржүүлж тооцоол.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("JSON parse failed");
        const parsed = JSON.parse(jsonMatch[0]);

        return res.json({
          product, quantity: qty,
          items: parsed.items || [],
          marketFactors: parsed.marketFactors || [],
          generalNote: parsed.generalNote || "",
          discount: parsed.discount || "",
          generatedAt: new Date().toISOString(),
          aiPowered: true,
        });
      } catch (e: any) {
        console.error("Gemini AI error:", e.message);
      }
    }

    // Fallback: hardcoded ангиллуудаар
    const fallbacks: Record<string, { unit: string; grades: { name: string; min: number; max: number; note: string }[] }> = {
      "бетон": { unit: "м³", grades: [
        { name: "Бетон зуурмаг М100", min: 140000, max: 165000, note: "Суурь дүүргэх, бага ачааллын" },
        { name: "Бетон зуурмаг М150", min: 158000, max: 185000, note: "Хавтан, жижиг суурь" },
        { name: "Бетон зуурмаг М200", min: 178000, max: 210000, note: "Ерөнхий хэрэглээний хамгийн өргөн" },
        { name: "Бетон зуурмаг М250", min: 198000, max: 235000, note: "Цардмал дамар, гүүрийн суурь" },
        { name: "Бетон зуурмаг М300", min: 215000, max: 255000, note: "Хүчтэй ачаалалтай байгууламж" },
        { name: "Бетон зуурмаг М350", min: 235000, max: 278000, note: "Хүчлэг, ус тэсвэрт" },
        { name: "Бетон зуурмаг М400", min: 258000, max: 305000, note: "Онцгой хүчтэй байгууламж" },
      ]},
      "цемент": { unit: "тн", grades: [
        { name: "Цемент ПЦ 400", min: 390000, max: 450000, note: "Ерөнхий барилгын" },
        { name: "Цемент ПЦ 500", min: 420000, max: 490000, note: "Бетоны марк өндөр шаардлагатай" },
        { name: "Цемент ПЦ 500 Д0 (сульфатад тэсвэртэй)", min: 460000, max: 540000, note: "Усны байгууламж, суваг" },
        { name: "Цемент Хятад импорт", min: 360000, max: 420000, note: "Хямдхан, нийлүүлэлт тогтвортой" },
      ]},
      "хайрга": { unit: "м³", grades: [
        { name: "Хайрга 0–5 мм (элсэнцэр)", min: 20000, max: 35000, note: "Нийлмэл холимог, цутгалт" },
        { name: "Хайрга 5–10 мм", min: 22000, max: 38000, note: "Бетоны нарийн нэмэлт" },
        { name: "Хайрга 10–20 мм", min: 24000, max: 42000, note: "Хамгийн өргөн хэрэглээ" },
        { name: "Хайрга 20–40 мм", min: 26000, max: 44000, note: "Том суурь, дүүргэлт" },
        { name: "Хайрга 40–70 мм (дайрга)", min: 28000, max: 48000, note: "Замын суурь давхарга" },
      ]},
      "элс": { unit: "м³", grades: [
        { name: "Барилгын элс (боловсруулаагүй)", min: 12000, max: 20000, note: "Ерөнхий барилгын" },
        { name: "Угаасан элс (М2.0–М2.5)", min: 16000, max: 26000, note: "Бетон, зуурмагт" },
        { name: "Маш нарийн элс (М1.5)", min: 14000, max: 22000, note: "Ханын зуурмаг" },
        { name: "Элс М3.0 (бүдүүн)", min: 18000, max: 28000, note: "Асфальт, дренаж" },
      ]},
      "битум": { unit: "тн", grades: [
        { name: "Битум БНД 40/60", min: 1500000, max: 1900000, note: "Халуун уур амьсгалын хатуу битум" },
        { name: "Битум БНД 60/90", min: 1400000, max: 1800000, note: "Монголд хамгийн өргөн хэрэглэх" },
        { name: "Битум БНД 90/130", min: 1300000, max: 1700000, note: "Хүйтэн уур амьсгалын зөөлөн битум" },
        { name: "Битум эмульс", min: 800000, max: 1200000, note: "Хүйтэн засварын" },
      ]},
    };

    const key = Object.keys(fallbacks).find(k => product.toLowerCase().includes(k)) || "";
    const fb = fallbacks[key];

    if (fb) {
      return res.json({
        product, quantity: qty,
        items: fb.grades.map(g => ({
          name: g.name, unit: fb.unit,
          pricePerUnit: { min: g.min, max: g.max, avg: Math.round((g.min + g.max) / 2) },
          totalPrice: { min: Math.round(g.min * qty), max: Math.round(g.max * qty), avg: Math.round((g.min + g.max) / 2 * qty) },
          note: g.note,
        })),
        marketFactors: ["Тээврийн зардал", "Улирлын хэлбэлзэл", "Захиалгын хэмжээ", "Нийлүүлэгчийн байршил"],
        generalNote: `${product} бүтээгдэхүүний ${qty} нэгжийн жишиг үнэ. Яг үнийг нийлүүлэгчтэй шууд тохирно уу.`,
        discount: qty >= 500 ? "500+ нэгжид 12–18% хямдрал боломжтой" : qty >= 100 ? "100+ нэгжид 5–10% хямдрал боломжтой" : "",
        generatedAt: new Date().toISOString(),
        aiPowered: false,
      });
    }

    res.json({
      product, quantity: qty,
      items: [{ name: product, unit: "нэгж", pricePerUnit: { min: 50000, max: 200000, avg: 120000 }, totalPrice: { min: Math.round(50000*qty), max: Math.round(200000*qty), avg: Math.round(120000*qty) }, note: "Дэлгэрэнгүй тооцооллын тулд борлуулалтын алба руу холбогдоно уу." }],
      marketFactors: ["Материалын төрөл", "Нийлүүлэлт", "Тээвэр", "Захиалгын хэмжээ"],
      generalNote: "Барилга, дэд бүтцийн материал. Яг үнийг нийлүүлэгчтэй тохирно уу.",
      discount: "",
      generatedAt: new Date().toISOString(),
      aiPowered: false,
    });
  });
  app.get("/api/videos", async (_req, res) => {
    res.json(await storage.getFeaturedVideos());
  });

  // ============ ҮЙЛДВЭРИЙН ЗАХИАЛГА (нийтийн — landing page) ============
  app.post("/api/factory-order", async (req, res) => {
    try {
      const num = `ZAH-${Date.now().toString().slice(-6)}`;
      const payload = { ...req.body, orderNumber: num, status: "pending" };
      const data = schema.insertProjectOrderSchema.parse(payload);
      const [row] = await db.insert(schema.projectOrders).values(data).returning();
      res.json({ ok: true, id: row.id, orderNumber: row.orderNumber });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // ============ ТӨСЛИЙН ЗАХИАЛГА ============
  app.get("/api/project/orders", requireAdmin, async (_req, res) => {
    try {
      const rows = await db.select().from(schema.projectOrders).orderBy(desc(schema.projectOrders.createdAt));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/project/orders", requireAdmin, async (req, res) => {
    try {
      const data = schema.insertProjectOrderSchema.parse(req.body);
      const [row] = await db.insert(schema.projectOrders).values(data).returning();
      // Борлуулалтын албанд мэдэгдэл явуулна
      await db.insert(schema.notifications).values({
        toRole: "SALES",
        title: "Шинэ захиалга ирлээ",
        body: `${row.clientName} — ${row.productType} ${row.quantity}${row.unit ?? "м³"} · ${row.deliveryDate ?? ""}`,
        sourceType: "project_order",
        sourceId: row.id,
      });
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.patch("/api/project/orders/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [row] = await db.update(schema.projectOrders).set(req.body).where(eq(schema.projectOrders.id, id)).returning();
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.delete("/api/project/orders/:id", requireAdmin, async (req, res) => {
    try {
      await db.delete(schema.projectOrders).where(eq(schema.projectOrders.id, parseInt(req.params.id)));
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ============ ГЭРЭЭНИЙ БҮРТГЭЛ ============
  app.get("/api/project/contracts", requireAdmin, async (_req, res) => {
    try {
      const rows = await db.select().from(schema.projectContracts).orderBy(desc(schema.projectContracts.createdAt));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/project/contracts", requireAdmin, async (req, res) => {
    try {
      const data = schema.insertProjectContractSchema.parse(req.body);
      const [row] = await db.insert(schema.projectContracts).values(data).returning();
      // Борлуулалтын алба + Администраторт мэдэгдэл явуулна
      await db.insert(schema.notifications).values([
        { toRole: "SALES", title: "Шинэ гэрээ байгуулагдлаа", body: `${row.clientName} — ${row.workType} · ${Number(row.amount??0).toLocaleString()}₮`, sourceType: "contract", sourceId: row.id },
        { toRole: "ADMIN", title: "Шинэ гэрээ байгуулагдлаа", body: `${row.clientName} — ${row.workType} · ${Number(row.amount??0).toLocaleString()}₮`, sourceType: "contract", sourceId: row.id },
      ]);
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.patch("/api/project/contracts/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [row] = await db.update(schema.projectContracts).set(req.body).where(eq(schema.projectContracts.id, id)).returning();
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.delete("/api/project/contracts/:id", requireAdmin, async (req, res) => {
    try {
      await db.delete(schema.projectContracts).where(eq(schema.projectContracts.id, parseInt(req.params.id)));
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ============ ТӨСЛИЙН PDF БАРИМТУУД ============
  app.get("/api/project-documents", async (_req, res) => {
    try {
      const docs = await db.select().from(schema.projectDocuments).orderBy(desc(schema.projectDocuments.uploadedAt));
      res.json(docs);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/project-documents", requireAdmin, async (req, res) => {
    try {
      const data = schema.insertProjectDocumentSchema.parse(req.body);
      const [doc] = await db.insert(schema.projectDocuments).values(data).returning();
      res.json(doc);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.delete("/api/project-documents/:id", requireAdmin, async (req, res) => {
    try {
      await db.delete(schema.projectDocuments).where(eq(schema.projectDocuments.id, parseInt(req.params.id)));
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ============ ERP-ийн нийтийн статистик (нэвтрэх шаардлагагүй) ============
  app.get("/api/public/stats", async (_req, res) => {
    try {
      // 1. Техникийн бэлэн байдал — isReady=true техникийн хувь
      const [vehStats] = await db.select({
        total: sql<number>`count(*)`,
        ready: sql<number>`count(*) filter (where is_ready = true)`,
      }).from(schema.vehicles);
      const techReadiness = Number(vehStats.total) > 0
        ? Math.round((Number(vehStats.ready) / Number(vehStats.total)) * 100)
        : 0;

      // 2. Үйлдвэрлэлд бэлэн байгаа нөөц — current_stock >= min_stock байгаа зүйлсийн хувь
      const [whStats] = await db.select({
        total: sql<number>`count(*) filter (where min_stock > 0)`,
        ready: sql<number>`count(*) filter (where min_stock > 0 and current_stock >= min_stock)`,
      }).from(schema.warehouseItems);
      const inventoryReadiness = Number(whStats.total) > 0
        ? Math.round((Number(whStats.ready) / Number(whStats.total)) * 100)
        : 0;

      // 3. Борлуулах боломжтой бетон зуурмаг — plant='concrete' нийт нөөц (м³)
      const [concStats] = await db.select({
        totalStock: sql<number>`coalesce(sum(current_stock), 0)`,
      }).from(schema.warehouseItems).where(eq(schema.warehouseItems.plant, "concrete"));
      const concreteSaleable = Math.round(Number(concStats.totalStock));

      // 4. Бетон зуурмагийн чанарын баталгаа — pass/fail дүнгийн pass хувь
      const [labStats] = await db.select({
        total: sql<number>`count(*) filter (where status in ('pass','fail'))`,
        passed: sql<number>`count(*) filter (where status = 'pass')`,
      }).from(schema.labResults);
      const qualityRate = Number(labStats.total) > 0
        ? Math.round((Number(labStats.passed) / Number(labStats.total)) * 100)
        : 0;

      res.json({ techReadiness, inventoryReadiness, concreteSaleable, qualityRate });
    } catch (e) {
      console.error("Public stats error:", e);
      res.status(500).json({ error: "Статистик татахад алдаа" });
    }
  });
  // Нийтийн API: Түрээслэх боломжтой (isReady=true) техник
  app.get("/api/public/available-vehicles", async (_req, res) => {
    try {
      const rows = await db.select().from(schema.vehicles)
        .where(eq(schema.vehicles.isReady, true))
        .orderBy(schema.vehicles.type, schema.vehicles.name);
      res.json(rows.map(v => ({
        id:          v.id,
        name:        v.name,
        plateNumber: v.plateNumber,
        type:        v.type,
        capacity:    v.capacity,
        readyNote:   v.readyNote,
      })));
    } catch (e) {
      console.error("Available vehicles error:", e);
      res.status(500).json([]);
    }
  });

  // Нийтийн API: 3-аас дээш өдрөөр сул байгаа техник
  app.get("/api/public/idle-vehicles", async (_req, res) => {
    try {
      const allVehicles = await db.select().from(schema.vehicles).orderBy(schema.vehicles.name);
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const cutoff = threeDaysAgo.toISOString().split("T")[0];

      // Сүүлийн ажлын бүртгэлийг бүрд нь авна
      const lastLogs = await db.select({
        vehicleId: schema.equipmentLogs.vehicleId,
        lastDate:  sql<string>`max(${schema.equipmentLogs.date})`,
      }).from(schema.equipmentLogs).groupBy(schema.equipmentLogs.vehicleId);

      const lastLogMap: Record<number, string> = {};
      for (const l of lastLogs) lastLogMap[l.vehicleId] = l.lastDate;

      const idleVehicles = allVehicles
        .filter(v => {
          const last = lastLogMap[v.id];
          return !last || last < cutoff;
        })
        .map(v => ({
          id:          v.id,
          name:        v.name,
          plateNumber: v.plateNumber,
          type:        v.type,
          capacity:    v.capacity,
          isReady:     v.isReady,
          lastUsed:    lastLogMap[v.id] || null,
        }));

      res.json(idleVehicles);
    } catch (e) {
      console.error("Idle vehicles error:", e);
      res.status(500).json([]);
    }
  });

  // ============ BUDGET CONTACTS ============
  app.get("/api/budget-contacts", async (_req, res) => {
    res.json(await db.select().from(schema.budgetContacts).orderBy(schema.budgetContacts.createdAt));
  });
  app.post("/api/budget-contacts", requireAdmin, async (req, res) => {
    try {
      const data = schema.insertBudgetContactSchema.parse(req.body);
      const [c] = await db.insert(schema.budgetContacts).values(data).returning();
      res.status(201).json(c);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.patch("/api/budget-contacts/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, role, phone } = req.body;
      const [c] = await db.update(schema.budgetContacts).set({ name, role, phone }).where(eq(schema.budgetContacts.id, id)).returning();
      res.json(c);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.delete("/api/budget-contacts/:id", requireAdmin, async (req, res) => {
    await db.delete(schema.budgetContacts).where(eq(schema.budgetContacts.id, parseInt(req.params.id)));
    res.json({ ok: true });
  });

  app.get("/api/content", async (_req, res) => {
    res.json(await db.select().from(schema.content));
  });

  // ============ SUBSCRIPTIONS ============
  app.post("/api/subscriptions", async (req, res) => {
    try {
      const data = z.object({ email: z.string().email(), type: z.string().min(1) }).parse(req.body);
      const [sub] = await db.insert(schema.subscriptions).values(data).returning();
      res.status(201).json(sub);
    } catch { res.status(500).json({ error: "Хадгалахад алдаа" }); }
  });
  app.get("/api/subscriptions", requireAdmin, async (_req, res) => {
    res.json(await db.select().from(schema.subscriptions).orderBy(schema.subscriptions.createdAt));
  });
  app.delete("/api/subscriptions/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Буруу ID" });
    await db.delete(schema.subscriptions).where(eq(schema.subscriptions.id, id));
    res.json({ success: true });
  });

  // ============ CONTACTS ============
  app.post("/api/contacts", async (req, res) => {
    try {
      const data = z.object({
        name: z.string().min(1), email: z.string().email(),
        phone: z.string().optional(), message: z.string().min(1),
        type: z.string().optional().default("Холбоо барих"),
      }).parse(req.body);
      const [c] = await db.insert(schema.contacts).values(data).returning();
      res.status(201).json(c);
    } catch { res.status(500).json({ error: "Хадгалахад алдаа" }); }
  });
  app.get("/api/contacts", requireAdmin, async (_req, res) => {
    res.json(await db.select().from(schema.contacts).orderBy(schema.contacts.createdAt));
  });
  app.delete("/api/contacts/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Буруу ID" });
    await db.delete(schema.contacts).where(eq(schema.contacts.id, id));
    res.json({ success: true });
  });

  // =====================================================
  // ERP API ROUTES
  // =====================================================

  // ============ EMPLOYEES ============
  app.get("/api/erp/employees", requireRole("HR", "ADMIN"), async (_req, res) => {
    res.json(await db.select().from(schema.employees).orderBy(schema.employees.name));
  });
  app.post("/api/erp/employees", requireAdmin, async (req, res) => {
    try {
      const data = schema.insertEmployeeSchema.parse(req.body);
      const qrCode = `EMP-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      const [emp] = await db.insert(schema.employees).values({ ...data, qrCode }).returning();
      res.status(201).json(emp);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.patch("/api/erp/employees/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const allowed = ["name", "department", "role", "salaryBase", "phone", "registerNumber"] as const;
      const update: Record<string, any> = {};
      for (const key of allowed) {
        if (key in req.body) {
          // null утгыг хүлээн зөвшөөрнө (утасны дугаар цэвэрлэхэд)
          update[key] = req.body[key] ?? null;
        }
      }
      if (Object.keys(update).length === 0)
        return res.status(400).json({ error: "Шинэчлэх мэдээлэл байхгүй" });
      const [emp] = await db.update(schema.employees).set(update).where(eq(schema.employees.id, id)).returning();
      if (!emp) return res.status(404).json({ error: "Ажилтан олдсонгүй" });
      res.json(emp);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.delete("/api/erp/employees/:id", requireAdmin, async (req, res) => {
    await db.delete(schema.employees).where(eq(schema.employees.id, parseInt(req.params.id)));
    res.json({ success: true });
  });

  // QR кодоор ажилтан хайх (нэвтрэх шаардлагагүй - QR уншуулах үед)
  app.get("/api/erp/employee-by-qr/:qr", async (req, res) => {
    const [emp] = await db.select().from(schema.employees).where(eq(schema.employees.qrCode, req.params.qr));
    if (!emp) return res.status(404).json({ error: "Ажилтан олдсонгүй" });
    res.json(emp);
  });

  // ============ ERP PROJECTS ============
  app.get("/api/erp/projects", async (_req, res) => {
    res.json(await db.select().from(schema.erpProjects).orderBy(desc(schema.erpProjects.createdAt)));
  });
  app.post("/api/erp/projects", requireAdmin, async (req, res) => {
    try {
      const data = schema.insertErpProjectSchema.parse(req.body);
      const [p] = await db.insert(schema.erpProjects).values(data).returning();
      res.status(201).json(p);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.patch("/api/erp/projects/:id", requireAdmin, async (req, res) => {
    const { status } = req.body;
    const [p] = await db.update(schema.erpProjects).set({ status }).where(eq(schema.erpProjects.id, parseInt(req.params.id))).returning();
    res.json(p);
  });

  // ============ PLANTS ============
  app.get("/api/erp/plants", async (_req, res) => {
    res.json(await db.select().from(schema.plants).orderBy(schema.plants.name));
  });
  app.post("/api/erp/plants", requireAdmin, async (req, res) => {
    try {
      const data = schema.insertPlantSchema.parse(req.body);
      const [pl] = await db.insert(schema.plants).values(data).returning();
      res.status(201).json(pl);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // ============ DAILY REPORTS ============
  app.post("/api/erp/daily-reports", async (req, res) => {
    try {
      const data = schema.insertDailyReportSchema.parse(req.body);
      const [report] = await db.insert(schema.dailyReports).values(data).returning();
      // KPI тооцоол
      const kpi = await calculateEmployeeKpi(report.id);
      res.status(201).json({ report, kpi });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.get("/api/erp/daily-reports", requireAdmin, async (req, res) => {
    const { startDate, endDate, employeeId } = req.query as any;
    let rows = await db.select().from(schema.dailyReports).orderBy(desc(schema.dailyReports.createdAt));
    if (startDate) rows = rows.filter(r => r.date >= startDate);
    if (endDate) rows = rows.filter(r => r.date <= endDate);
    if (employeeId) rows = rows.filter(r => r.employeeId === parseInt(employeeId));
    res.json(rows);
  });

  // Ажилтны өөрийн тайланг харах (QR-аар)
  app.get("/api/erp/my-reports/:employeeId", async (req, res) => {
    const empId = parseInt(req.params.employeeId);
    const rows = await db.select().from(schema.dailyReports)
      .where(eq(schema.dailyReports.employeeId, empId))
      .orderBy(desc(schema.dailyReports.createdAt));
    res.json(rows);
  });

  // ============ PRODUCTION LOGS ============
  app.post("/api/erp/production-logs", async (req, res) => {
    try {
      const data = schema.insertProductionLogSchema.parse(req.body);
      const [log] = await db.insert(schema.productionLogs).values(data).returning();
      res.status(201).json(log);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.get("/api/erp/production-logs", requireAdmin, async (_req, res) => {
    res.json(await db.select().from(schema.productionLogs).orderBy(desc(schema.productionLogs.date)));
  });

  // ============ KPI CONFIGS ============
  app.get("/api/erp/kpi-configs", async (_req, res) => {
    res.json(await db.select().from(schema.kpiConfigs).orderBy(schema.kpiConfigs.workType));
  });
  app.post("/api/erp/kpi-configs", requireAdmin, async (req, res) => {
    try {
      const data = schema.insertKpiConfigSchema.parse(req.body);
      const [kpi] = await db.insert(schema.kpiConfigs).values(data).returning();
      res.status(201).json(kpi);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.patch("/api/erp/kpi-configs/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const [updated] = await db.update(schema.kpiConfigs)
      .set({ ...req.body })
      .where(eq(schema.kpiConfigs.id, id))
      .returning();
    res.json(updated);
  });
  app.delete("/api/erp/kpi-configs/:id", requireAdmin, async (req, res) => {
    await db.delete(schema.kpiConfigs).where(eq(schema.kpiConfigs.id, parseInt(req.params.id)));
    res.json({ success: true });
  });

  // ============ KPI ENGINE ============
  app.get("/api/erp/kpi-team", requireAdmin, async (req, res) => {
    const { startDate, endDate, department } = req.query as any;
    const start = startDate ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const end = endDate ?? new Date().toISOString().slice(0, 10);
    const results = await calculateTeamKpi(start, end, department);
    res.json(results);
  });

  // ============ AI НОРМ АГЕНТ — ЗЗБНбД 81-013-2019 ============
  // Бүх нормын каталог харах
  app.get("/api/erp/norm-catalog", requireAdmin, async (_req, res) => {
    res.json({ norms: ZZBND_NORMS, sections: NORM_SECTIONS });
  });

  // Хэсгээр буюу бүгдийг системд суулгах
  app.post("/api/erp/sync-norms", requireAdmin, async (req, res) => {
    const { section } = req.body;
    const result = await syncNormsBySection(section ?? "ALL");
    res.json(result);
  });

  // ============ ATTENDANCE (Цагийн бүртгэл + ХАБЭА) ============

  // Өнөөдрийн бүртгэл харах (QR-аар)
  app.get("/api/erp/attendance/:employeeId/today", async (req, res) => {
    const empId = parseInt(req.params.employeeId);
    const today = new Date().toISOString().slice(0, 10);
    const rows = await db
      .select()
      .from(schema.attendance)
      .where(eq(schema.attendance.employeeId, empId));
    const todayRow = rows.find(r => r.date === today);
    res.json(todayRow ?? null);
  });

  // Ирсэн цаг бүртгэх (Check-in) + ХАБЭА баталгаа
  app.post("/api/erp/attendance/checkin", async (req, res) => {
    try {
      const { employeeId, safetyConfirmed } = req.body;
      const today = new Date().toISOString().slice(0, 10);
      const now = new Date();
      const timeStr = now.toTimeString().slice(0, 5); // "HH:MM"

      // Хуучин бүртгэл байгаа эсэх
      const existing = await db.select().from(schema.attendance)
        .where(eq(schema.attendance.employeeId, employeeId));
      const todayRow = existing.find(r => r.date === today);

      if (todayRow) {
        return res.json({ already: true, attendance: todayRow });
      }

      // Хожимдолт тооцоол (ажлын цаг 08:00)
      const startHour = 8, startMin = 0;
      const lateMinutes = Math.max(0, (now.getHours() - startHour) * 60 + (now.getMinutes() - startMin));

      const [record] = await db.insert(schema.attendance).values({
        employeeId,
        date: today,
        checkIn: timeStr,
        safetyConfirmed: !!safetyConfirmed,
        safetyConfirmedAt: safetyConfirmed ? now : null,
        lateMinutes,
      }).returning();

      res.status(201).json({ already: false, attendance: record });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // Явсан цаг бүртгэх (Check-out)
  app.post("/api/erp/attendance/checkout", async (req, res) => {
    try {
      const { employeeId } = req.body;
      const today = new Date().toISOString().slice(0, 10);
      const timeStr = new Date().toTimeString().slice(0, 5);

      const existing = await db.select().from(schema.attendance)
        .where(eq(schema.attendance.employeeId, employeeId));
      const todayRow = existing.find(r => r.date === today);

      if (!todayRow) return res.status(404).json({ error: "Ирсэн бүртгэл олдсонгүй" });

      const [updated] = await db.update(schema.attendance)
        .set({ checkOut: timeStr })
        .where(eq(schema.attendance.id, todayRow.id))
        .returning();

      res.json(updated);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // Цагийн бүртгэлийн жагсаалт (Менежер)
  app.get("/api/erp/attendance", requireAdmin, async (req, res) => {
    const { date } = req.query as any;
    let rows = await db.select().from(schema.attendance).orderBy(desc(schema.attendance.createdAt));
    if (date) rows = rows.filter(r => r.date === date);
    res.json(rows);
  });

  // ============ НИЙТИЙН CHECK-IN (QR хуудас) ============

  // Ажилтны жагсаалт (нийтийн)
  app.get("/api/checkin/employees", async (_req, res) => {
    const emps = await db.select().from(schema.employees).orderBy(schema.employees.name);
    res.json(emps);
  });

  // ХАБЭА бөглөж бүртгүүлэх (нийтийн)
  app.post("/api/checkin/safety", async (req, res) => {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ message: "employeeId шаардлагатай" });
    const today = new Date().toISOString().slice(0, 10);
    const existing = await db.select().from(schema.attendance)
      .where(eq(schema.attendance.employeeId, employeeId));
    const todayRow = existing.find(r => r.date === today);
    if (todayRow) return res.json({ already: true, attendance: todayRow });
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, "0");
    const mm = now.getMinutes().toString().padStart(2, "0");
    const checkInStr = `${hh}:${mm}`;
    const startH = 8 * 60;
    const actualM = now.getHours() * 60 + now.getMinutes();
    const lateMinutes = Math.max(0, actualM - startH);
    const [record] = await db.insert(schema.attendance).values({
      employeeId, date: today, checkIn: checkInStr,
      safetyConfirmed: true, safetyConfirmedAt: now, lateMinutes,
    }).returning();
    res.status(201).json({ already: false, attendance: record });
  });

  // Өнөөдрийн даалгавар (ажилтанд, нийтийн)
  app.get("/api/checkin/:employeeId/tasks", async (req, res) => {
    const empId = parseInt(req.params.employeeId);
    const today = new Date().toISOString().slice(0, 10);
    const rows = await db.select().from(schema.tasks)
      .where(eq(schema.tasks.employeeId, empId));
    res.json(rows.filter(t => t.date === today));
  });

  // Даалгавар хүлээн авах (нийтийн)
  app.patch("/api/checkin/tasks/:id/accept", async (req, res) => {
    const id = parseInt(req.params.id);
    const [updated] = await db.update(schema.tasks)
      .set({ status: "accepted" }).where(eq(schema.tasks.id, id)).returning();
    res.json(updated);
  });

  // Ажлын тайлан оруулах (нийтийн)
  app.post("/api/checkin/reports", async (req, res) => {
    const { employeeId, taskId, description, quantity, unit, issues } = req.body;
    if (!employeeId || !description) return res.status(400).json({ message: "employeeId, description шаардлагатай" });
    const today = new Date().toISOString().slice(0, 10);
    const [report] = await db.insert(schema.workReports).values({
      employeeId, taskId: taskId || null, date: today, description, quantity, unit, issues,
    }).returning();
    // Даалгавар дуусгагдсан гэж тэмдэглэх
    if (taskId) {
      await db.update(schema.tasks).set({ status: "completed" }).where(eq(schema.tasks.id, taskId));
    }
    res.status(201).json(report);
  });

  // ============ TASKS (АХЛАХ УДИРДАНА) ============

  app.get("/api/erp/tasks", requireAdmin, async (req, res) => {
    const { date, employeeId } = req.query as any;
    let rows = await db.select().from(schema.tasks).orderBy(desc(schema.tasks.createdAt));
    if (date) rows = rows.filter(r => r.date === date);
    if (employeeId) rows = rows.filter(r => r.employeeId === parseInt(employeeId));
    res.json(rows);
  });

  app.post("/api/erp/tasks", requireAdmin, async (req, res) => {
    const { employeeId, workFrontId, date, location, workType, equipment, notes, assignedBy } = req.body;
    if (!employeeId || !date || !location || !workType)
      return res.status(400).json({ message: "Заавал талбарууд дутуу байна" });
    const [task] = await db.insert(schema.tasks).values({
      employeeId, workFrontId: workFrontId ?? null, date, location, workType, equipment, notes, assignedBy, status: "pending",
    }).returning();
    res.status(201).json(task);
  });

  app.delete("/api/erp/tasks/:id", requireAdmin, async (req, res) => {
    await db.delete(schema.tasks).where(eq(schema.tasks.id, parseInt(req.params.id)));
    res.json({ success: true });
  });

  // ============ WORK REPORTS ============

  app.get("/api/erp/work-reports", requireAdmin, async (req, res) => {
    const { date, employeeId } = req.query as any;
    let rows = await db.select().from(schema.workReports).orderBy(desc(schema.workReports.createdAt));
    if (date) rows = rows.filter(r => r.date === date);
    if (employeeId) rows = rows.filter(r => r.employeeId === parseInt(employeeId));
    res.json(rows);
  });

  // ============ ТЕХНИК (МАШИН) ============

  const requireToken = (req: any, res: any, next: any) => {
    if (req.headers["x-admin-token"] !== "authenticated")
      return res.status(401).json({ message: "Зөвшөөрөлгүй" });
    next();
  };

  app.get("/api/erp/vehicles", requireToken, async (_req, res) => {
    res.json(await db.select().from(schema.vehicles).orderBy(schema.vehicles.plateNumber));
  });

  app.post("/api/erp/vehicles", requireToken, async (req, res) => {
    const { plateNumber, name, type, capacity, lastInspectionDate, nextInspectionDate, isReady, readyNote, notes } = req.body;
    if (!plateNumber || !name || !type) return res.status(400).json({ message: "Улсын дугаар, нэр, төрөл шаардлагатай" });
    const [v] = await db.insert(schema.vehicles).values({
      plateNumber: plateNumber.toUpperCase(), name, type, capacity,
      lastInspectionDate, nextInspectionDate,
      isReady: isReady !== undefined ? isReady : true,
      readyNote, notes,
    }).returning();
    res.status(201).json(v);
  });

  app.patch("/api/erp/vehicles/:id", requireToken, async (req, res) => {
    const id = parseInt(req.params.id);
    const { isReady, readyNote, lastInspectionDate, nextInspectionDate, capacity, notes } = req.body;
    const updates: any = {};
    if (isReady !== undefined) updates.isReady = isReady;
    if (readyNote !== undefined) updates.readyNote = readyNote;
    if (lastInspectionDate !== undefined) updates.lastInspectionDate = lastInspectionDate;
    if (nextInspectionDate !== undefined) updates.nextInspectionDate = nextInspectionDate;
    if (capacity !== undefined) updates.capacity = capacity;
    if (notes !== undefined) updates.notes = notes;
    const [updated] = await db.update(schema.vehicles).set(updates).where(eq(schema.vehicles.id, id)).returning();
    res.json(updated);
  });

  app.delete("/api/erp/vehicles/:id", requireToken, async (req, res) => {
    await db.delete(schema.vehicles).where(eq(schema.vehicles.id, parseInt(req.params.id)));
    res.json({ success: true });
  });

  // Улсын дугаараар хайх (нийтийн)
  app.get("/api/checkin/vehicle", async (req, res) => {
    const plate = ((req.query.plate as string) || "").toUpperCase().trim();
    if (!plate) return res.status(400).json({ message: "Дугаар оруулна уу" });
    const rows = await db.select().from(schema.vehicles)
      .where(eq(schema.vehicles.plateNumber, plate));
    if (rows.length === 0) return res.status(404).json({ message: `"${plate}" дугаартай техник бүртгэлгүй байна` });
    res.json(rows[0]);
  });

  // Үзлэг илгээх (нийтийн)
  app.post("/api/checkin/vehicle-inspection", async (req, res) => {
    const { vehicleId, employeeName, checks, passed, notes } = req.body;
    if (!vehicleId || !employeeName || !checks) return res.status(400).json({ message: "Мэдээлэл дутуу байна" });
    const today = new Date().toISOString().slice(0, 10);
    const [insp] = await db.insert(schema.vehicleInspections).values({
      vehicleId, employeeName, date: today,
      checks: typeof checks === "string" ? checks : JSON.stringify(checks),
      passed: passed ?? true, notes,
    }).returning();
    res.status(201).json(insp);
  });

  // Үзлэгүүд (admin)
  app.get("/api/erp/vehicle-inspections", requireAdmin, async (req, res) => {
    const { date } = req.query as any;
    let rows = await db.select().from(schema.vehicleInspections).orderBy(desc(schema.vehicleInspections.createdAt));
    if (date) rows = rows.filter(r => r.date === date);
    res.json(rows);
  });

  // ============ ТЕХНИКИЙН ЭВДРЭЛ — Breakdown Requests ============
  app.get("/api/erp/breakdowns", requireToken, async (_req, res) => {
    const rows = await db.select().from(schema.breakdownRequests)
      .orderBy(desc(schema.breakdownRequests.createdAt));
    res.json(rows);
  });

  app.post("/api/erp/breakdowns", requireToken, async (req, res) => {
    try {
      const { vehicleId, vehicleName, reportedBy, phone, location, problem } = req.body;
      if (!reportedBy || !location || !problem) return res.status(400).json({ error: "Мэдээлэл дутуу" });
      const [row] = await db.insert(schema.breakdownRequests).values({
        vehicleId: vehicleId ? Number(vehicleId) : null,
        vehicleName: vehicleName || null,
        reportedBy, phone: phone || null, location, problem,
        status: "open",
      }).returning();
      res.status(201).json(row);
    } catch { res.status(500).json({ error: "Хадгалахад алдаа" }); }
  });

  app.patch("/api/erp/breakdowns/:id", requireToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Буруу ID" });
      const { status, assignedTo, resolvedNote } = req.body;
      const updates: Record<string, any> = { updatedAt: new Date() };
      if (status) updates.status = status;
      if (assignedTo !== undefined) updates.assignedTo = assignedTo;
      if (resolvedNote !== undefined) updates.resolvedNote = resolvedNote;
      const [row] = await db.update(schema.breakdownRequests)
        .set(updates).where(eq(schema.breakdownRequests.id, id)).returning();
      res.json(row);
    } catch { res.status(500).json({ error: "Шинэчлэхэд алдаа" }); }
  });

  app.delete("/api/erp/breakdowns/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Буруу ID" });
    await db.delete(schema.breakdownRequests).where(eq(schema.breakdownRequests.id, id));
    res.json({ success: true });
  });

  // ============ SUMMARY STATS ============
  app.get("/api/erp/summary", requireAdmin, async (_req, res) => {
    const [employees, projects, plants, reports, logs] = await Promise.all([
      db.select().from(schema.employees),
      db.select().from(schema.erpProjects),
      db.select().from(schema.plants),
      db.select().from(schema.dailyReports),
      db.select().from(schema.productionLogs),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    res.json({
      totalEmployees: employees.length,
      activeProjects: projects.filter(p => p.status === "active").length,
      totalPlants: plants.length,
      todayReports: reports.filter(r => r.date === today).length,
      totalBonusPaid: reports.reduce((sum, r) => sum + (r.bonus ?? 0), 0),
    });
  });

  // ===================== АГУУЛАХ API =====================

  // Норм тооцоолол: Асфальтын үйлдвэр 200м³/хоног, Бетон 1800м³/хоног, Бутлах 100тн/цаг*8ц
  const WAREHOUSE_DEFAULTS = [
    // Асфальтбетон хольцын үйлдвэр (150-200 м³/хоног) — нэр нь нормтой яг таарна
    { name: "Битум БНД 60/90", category: "bitumen", unit: "тн", plant: "asphalt",  minStock: 10,   criticalStock: 20,   normBasis: "1м³ асфальт = 0.052тн битум × 200м³" },
    { name: "Хайрга 0-2мм",   category: "stone",   unit: "тн", plant: "asphalt",  minStock: 42,   criticalStock: 84,   normBasis: "1м³ асфальт = 0.21тн × 200м³" },
    { name: "Хайрга 2-5мм",   category: "stone",   unit: "тн", plant: "asphalt",  minStock: 56,   criticalStock: 112,  normBasis: "1м³ асфальт = 0.28тн × 200м³" },
    { name: "Хайрга 5-10мм",  category: "stone",   unit: "тн", plant: "asphalt",  minStock: 60,   criticalStock: 120,  normBasis: "1м³ асфальт = 0.3тн × 200м³" },
    { name: "Хайрга 10-20мм", category: "stone",   unit: "тн", plant: "asphalt",  minStock: 70,   criticalStock: 140,  normBasis: "1м³ асфальт = 0.35тн × 200м³" },
    { name: "Минерал нунтаг",  category: "mineral", unit: "тн", plant: "asphalt",  minStock: 9,    criticalStock: 18,   normBasis: "1м³ асфальт = 0.045тн × 200м³" },
    { name: "Элс (асфальт)",   category: "sand",    unit: "тн", plant: "asphalt",  minStock: 30,   criticalStock: 60,   normBasis: "1м³ асфальт = 0.15тн × 200м³" },
    // Бетон зуурмагийн үйлдвэр (1300-1800 м³/хоног)
    { name: "Цемент ПЦ400",    category: "cement",  unit: "тн", plant: "concrete", minStock: 630,  criticalStock: 1260, normBasis: "1м³ бетон = 0.35тн цемент × 1800м³" },
    { name: "Элс (бетон)",     category: "sand",    unit: "м³", plant: "concrete", minStock: 1260, criticalStock: 2520, normBasis: "1м³ бетон = 0.7м³ элс × 1800м³" },
    { name: "Хайрга 5-10мм",  category: "stone",   unit: "м³", plant: "concrete", minStock: 756,  criticalStock: 1512, normBasis: "1м³ бетон = 0.42м³ хайрга × 1800м³" },
    { name: "Хайрга 10-20мм", category: "stone",   unit: "м³", plant: "concrete", minStock: 1044, criticalStock: 2088, normBasis: "1м³ бетон = 0.58м³ хайрга × 1800м³" },
    { name: "Химийн нэмэлт",   category: "other",   unit: "кг", plant: "concrete", minStock: 1800, criticalStock: 3600, normBasis: "1м³ бетон = 1кг нэмэлт × 1800м³" },
    // Бутлах ангилах үйлдвэр (цагт 100тн, 8цаг/өдөр = 800тн/өдөр)
    { name: "Байгалийн чулуу (оролт)", category: "stone", unit: "тн", plant: "crushing", minStock: 920, criticalStock: 1840, normBasis: "800тн гаралтад 1.15 харьцаа = 920тн оролт" },
    { name: "Шатах тос (бутлуур)", category: "other", unit: "л", plant: "crushing", minStock: 500, criticalStock: 1000, normBasis: "Бутлуурын мэдэгдэхүүн" },
  ];

  async function seedWarehouse() {
    try {
      const existing = await db.select().from(schema.warehouseItems);
      if (existing.length === 0) {
        await db.insert(schema.warehouseItems).values(
          WAREHOUSE_DEFAULTS.map(d => ({ ...d, currentStock: 0 }))
        );
      } else {
        // Ensure each default item exists (upsert by name+plant)
        for (const d of WAREHOUSE_DEFAULTS) {
          const found = existing.find(e => e.name === d.name && e.plant === d.plant);
          if (!found) {
            await db.insert(schema.warehouseItems).values({ ...d, currentStock: 0 });
          }
        }
      }
    } catch {}
  }

  app.get("/api/warehouse/items", requireToken, async (_req, res) => {
    try {
      const items = await db.select().from(schema.warehouseItems).orderBy(schema.warehouseItems.plant, schema.warehouseItems.category);
      res.json(items);
    } catch (e) { res.status(500).json({ error: "DB error" }); }
  });

  app.post("/api/warehouse/items", requireToken, async (req, res) => {
    try {
      const data = schema.insertWarehouseItemSchema.parse(req.body);
      const [item] = await db.insert(schema.warehouseItems).values(data).returning();
      res.json(item);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.patch("/api/warehouse/items/:id/stock", requireToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { currentStock, notes } = req.body;
      const [updated] = await db.update(schema.warehouseItems)
        .set({ currentStock: Number(currentStock), notes, updatedAt: new Date() })
        .where(eq(schema.warehouseItems.id, id))
        .returning();
      res.json(updated);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.patch("/api/warehouse/items/:id", requireToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, unit, plant, category, minStock, criticalStock } = req.body;
      await db.update(schema.warehouseItems)
        .set({
          ...(name !== undefined && { name }),
          ...(unit !== undefined && { unit }),
          ...(plant !== undefined && { plant }),
          ...(category !== undefined && { category }),
          ...(minStock !== undefined && { minStock: parseFloat(minStock) }),
          ...(criticalStock !== undefined && { criticalStock: parseFloat(criticalStock) }),
        })
        .where(eq(schema.warehouseItems.id, id));
      res.json({ success: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.delete("/api/warehouse/items/:id", requireToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(schema.warehouseItems).where(eq(schema.warehouseItems.id, id));
      res.json({ success: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // Нөөцийн хөдөлгөөн лог
  app.get("/api/warehouse/logs", requireToken, async (req, res) => {
    try {
      const { itemId } = req.query;
      let q = db.select().from(schema.warehouseLogs).orderBy(schema.warehouseLogs.createdAt);
      const rows = await (itemId ? q.where(eq(schema.warehouseLogs.itemId, Number(itemId))) : q);
      res.json(rows);
    } catch (e) { res.status(500).json({ error: "DB error" }); }
  });

  app.post("/api/warehouse/logs", requireToken, async (req, res) => {
    try {
      const data = schema.insertWarehouseLogSchema.parse(req.body);
      const [log] = await db.insert(schema.warehouseLogs).values(data).returning();
      // Нөөц шинэчлэх
      const item = await db.select().from(schema.warehouseItems).where(eq(schema.warehouseItems.id, data.itemId)).then(r => r[0]);
      if (item) {
        const newStock = Math.max(0, (item.currentStock ?? 0) + (data.type === "out" ? -Math.abs(data.quantity) : Math.abs(data.quantity)));
        await db.update(schema.warehouseItems)
          .set({ currentStock: newStock, updatedAt: new Date() })
          .where(eq(schema.warehouseItems.id, data.itemId));
      }
      res.json(log);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // ===================== ЗАХИАЛГА API =====================

  app.get("/api/warehouse/orders", requireToken, async (req, res) => {
    try {
      const orders = await db.select().from(schema.warehouseOrders)
        .orderBy(schema.warehouseOrders.expectedDate);
      res.json(orders);
    } catch { res.status(500).json({ error: "DB error" }); }
  });

  app.post("/api/warehouse/orders", requireToken, async (req, res) => {
    try {
      const data = schema.insertWarehouseOrderSchema.parse(req.body);
      const [order] = await db.insert(schema.warehouseOrders).values(data).returning();
      res.json(order);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.patch("/api/warehouse/orders/:id", requireToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, note, supplier, quantity, expectedDate } = req.body;
      const [updated] = await db.update(schema.warehouseOrders)
        .set({
          ...(status !== undefined && { status }),
          ...(note !== undefined && { note }),
          ...(supplier !== undefined && { supplier }),
          ...(quantity !== undefined && { quantity: parseFloat(quantity) }),
          ...(expectedDate !== undefined && { expectedDate }),
        })
        .where(eq(schema.warehouseOrders.id, id))
        .returning();
      // Хэрэв "received" болгосон бол нөөцийг автоматаар нэмэх
      if (status === "received" && updated) {
        const item = await db.select().from(schema.warehouseItems)
          .where(eq(schema.warehouseItems.id, updated.itemId!)).then(r => r[0]);
        if (item) {
          await db.update(schema.warehouseItems)
            .set({ currentStock: (item.currentStock ?? 0) + (updated.quantity ?? 0), updatedAt: new Date() })
            .where(eq(schema.warehouseItems.id, item.id));
          await db.insert(schema.warehouseLogs).values({
            itemId: item.id, date: new Date().toISOString().slice(0, 10),
            quantity: updated.quantity ?? 0, type: "in",
            notes: `Захиалга #${updated.id} хүлээж авсан`, recordedBy: "system",
          });
        }
      }
      res.json(updated);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.delete("/api/warehouse/orders/:id", requireToken, async (req, res) => {
    try {
      await db.delete(schema.warehouseOrders).where(eq(schema.warehouseOrders.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // ===================== ҮЙЛДВЭРЛЭЛИЙН ТӨЛӨВЛӨГӨӨ API =====================

  // Өдрийн план авах (date query param)
  app.get("/api/warehouse/plans", requireToken, async (req, res) => {
    try {
      const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
      const plans = await db.select().from(schema.productionPlans).where(eq(schema.productionPlans.date, date));
      res.json(plans);
    } catch { res.status(500).json({ error: "DB error" }); }
  });

  // Тарих эсвэл шинэчлэх
  app.post("/api/warehouse/plans", requireToken, async (req, res) => {
    try {
      const { date, plant, targetQty, unit, notes } = req.body;
      // existing plan for this date+plant?
      const existing = await db.select().from(schema.productionPlans)
        .where(and(eq(schema.productionPlans.date, date), eq(schema.productionPlans.plant, plant)));
      let plan;
      if (existing.length > 0) {
        [plan] = await db.update(schema.productionPlans)
          .set({ targetQty: Number(targetQty), unit, notes, updatedAt: new Date() })
          .where(eq(schema.productionPlans.id, existing[0].id))
          .returning();
      } else {
        [plan] = await db.insert(schema.productionPlans).values({ date, plant, targetQty: Number(targetQty), unit: unit || "м³", notes }).returning();
      }
      res.json(plan);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // Материалын бэлэн байдал хадгалах
  app.post("/api/warehouse/material-checks", requireToken, async (req, res) => {
    try {
      const { planId, checks } = req.body;
      // delete existing then insert
      await db.delete(schema.materialChecks).where(eq(schema.materialChecks.planId, Number(planId)));
      const rows = (checks as any[]).map((c: any) => ({
        planId: Number(planId),
        materialName: c.materialName,
        requiredQty: Number(c.requiredQty),
        warehouseQty: Number(c.warehouseQty ?? 0),
        fieldQty: Number(c.fieldQty ?? 0),
        unit: c.unit,
      }));
      const result = await db.insert(schema.materialChecks).values(rows).returning();
      res.json(result);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.get("/api/warehouse/material-checks/:planId", requireToken, async (req, res) => {
    try {
      const rows = await db.select().from(schema.materialChecks)
        .where(eq(schema.materialChecks.planId, Number(req.params.planId)));
      res.json(rows);
    } catch { res.status(500).json({ error: "DB error" }); }
  });

  // Агуулахаас татах — plan дээр үндэслэн нөөц хасна
  // draws: [{warehouseItemId, drawQty}]
  app.post("/api/warehouse/draw-plan", requireToken, async (req, res) => {
    try {
      const { planId, date, draws } = req.body as {
        planId: number;
        date: string;
        draws: Array<{ warehouseItemId: number; drawQty: number; materialName: string }>;
      };
      if (!planId || !draws || !Array.isArray(draws)) {
        return res.status(400).json({ error: "planId, draws шаардлагатай" });
      }
      // Өмнөх plan-тай холбоотой log-уудыг буцаана (re-draw хийх үед)
      const oldLogs = await db.select().from(schema.warehouseLogs)
        .where(and(eq(schema.warehouseLogs.planId, planId), eq(schema.warehouseLogs.type, "plan_draw")));
      for (const ol of oldLogs) {
        // Хасагдсан хэмжээг буцааж нэмнэ
        const item = await db.select().from(schema.warehouseItems).where(eq(schema.warehouseItems.id, ol.itemId)).then(r => r[0]);
        if (item) {
          await db.update(schema.warehouseItems)
            .set({ currentStock: (item.currentStock ?? 0) + Math.abs(ol.quantity), updatedAt: new Date() })
            .where(eq(schema.warehouseItems.id, ol.itemId));
        }
      }
      // Хуучин log устгана
      await db.delete(schema.warehouseLogs)
        .where(and(eq(schema.warehouseLogs.planId, planId), eq(schema.warehouseLogs.type, "plan_draw")));

      const results = [];
      for (const d of draws) {
        if (!d.warehouseItemId || d.drawQty <= 0) continue;
        const item = await db.select().from(schema.warehouseItems).where(eq(schema.warehouseItems.id, d.warehouseItemId)).then(r => r[0]);
        if (!item) continue;
        const newStock = Math.max(0, (item.currentStock ?? 0) - d.drawQty);
        await db.update(schema.warehouseItems)
          .set({ currentStock: newStock, updatedAt: new Date() })
          .where(eq(schema.warehouseItems.id, d.warehouseItemId));
        const [log] = await db.insert(schema.warehouseLogs).values({
          itemId: d.warehouseItemId,
          planId,
          date,
          quantity: -d.drawQty,
          type: "plan_draw",
          notes: `${date} өдрийн үйлдвэрлэлийн хэрэгцээ — ${d.materialName}`,
          recordedBy: "Систем",
        }).returning();
        results.push({ itemId: d.warehouseItemId, drawQty: d.drawQty, newStock, logId: log.id });
      }
      res.json({ success: true, results });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // ===================== ЛАБ ТУРШИЛТ =====================

  app.get("/api/lab-results", requireAdmin, async (req, res) => {
    try {
      const rows = await db.select().from(schema.labResults).orderBy(desc(schema.labResults.createdAt));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/lab-results", requireAdmin, async (req, res) => {
    try {
      const data = schema.insertLabResultSchema.parse(req.body);
      const [row] = await db.insert(schema.labResults).values(data).returning();
      // Туршилт амжилтгүй бол SALES + SUPERVISOR-т автомат мэдэгдэл
      if (data.status === "fail") {
        const failMsg = `Лабораторийн туршилт АМЖИЛТГҮЙ: ${data.testType ?? "туршилт"} — ${data.sampleId ?? ""}`;
        await db.insert(schema.notifications).values([
          { toRole: "SALES",      title: "⚠️ Лаб дүн: АМЖИЛТГҮЙ", body: failMsg, sourceType: "lab_result", sourceId: row.id },
          { toRole: "SUPERVISOR", title: "⚠️ Лаб дүн: АМЖИЛТГҮЙ", body: failMsg, sourceType: "lab_result", sourceId: row.id },
        ]);
      }
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.put("/api/lab-results/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [row] = await db.update(schema.labResults).set(req.body).where(eq(schema.labResults.id, id)).returning();
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.delete("/api/lab-results/:id", requireAdmin, async (req, res) => {
    try {
      await db.delete(schema.labResults).where(eq(schema.labResults.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ===================== АЖЛЫН ФРОНТ =====================

  app.get("/api/work-fronts", requireAdmin, async (req, res) => {
    try {
      const rows = await db.select().from(schema.workFronts).orderBy(desc(schema.workFronts.createdAt));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/work-fronts", requireAdmin, async (req, res) => {
    try {
      const data = schema.insertWorkFrontSchema.parse(req.body);
      const [row] = await db.insert(schema.workFronts).values(data).returning();
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.put("/api/work-fronts/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [row] = await db.update(schema.workFronts).set(req.body).where(eq(schema.workFronts.id, id)).returning();
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.delete("/api/work-fronts/:id", requireAdmin, async (req, res) => {
    try {
      await db.delete(schema.workFronts).where(eq(schema.workFronts.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ===================== ТОНОГ ТӨХӨӨРӨМЖИЙН ЦАГ =====================

  app.get("/api/equipment-logs", requireAdmin, async (req, res) => {
    try {
      const { date, vehicleId } = req.query;
      let q = db.select().from(schema.equipmentLogs).$dynamic();
      if (date) q = q.where(eq(schema.equipmentLogs.date, date as string));
      if (vehicleId) q = q.where(eq(schema.equipmentLogs.vehicleId, parseInt(vehicleId as string)));
      const rows = await q.orderBy(desc(schema.equipmentLogs.createdAt));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/equipment-logs", requireAdmin, async (req, res) => {
    try {
      const data = schema.insertEquipmentLogSchema.parse(req.body);
      const [row] = await db.insert(schema.equipmentLogs).values(data).returning();
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.delete("/api/equipment-logs/:id", requireAdmin, async (req, res) => {
    try {
      await db.delete(schema.equipmentLogs).where(eq(schema.equipmentLogs.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ===================== ШАТАХУУН ТӨСӨВ =====================

  // Бүх төсвийн жагсаалт
  app.get("/api/fuel-budgets", requireAdmin, async (req, res) => {
    try {
      const rows = await db.select().from(schema.fuelBudgets)
        .orderBy(desc(schema.fuelBudgets.year), desc(schema.fuelBudgets.month));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Одоогийн сарын төсөв
  app.get("/api/fuel-budgets/current", requireAdmin, async (req, res) => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const rows = await db.select().from(schema.fuelBudgets)
        .where(and(eq(schema.fuelBudgets.year, year), eq(schema.fuelBudgets.month, month)))
        .limit(1);
      res.json(rows[0] ?? null);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Сарын зарцуулалтын дүн (equipment_logs-оос)
  app.get("/api/fuel-budgets/summary", requireAdmin, async (req, res) => {
    try {
      const { year, month } = req.query;
      const y = parseInt(year as string) || new Date().getFullYear();
      const m = parseInt(month as string) || (new Date().getMonth() + 1);
      const pad = (n: number) => n.toString().padStart(2, "0");
      const prefix = `${y}-${pad(m)}`;
      const logs = await db.select().from(schema.equipmentLogs)
        .where(sql`${schema.equipmentLogs.date} LIKE ${prefix + "%"}`);
      const dieselLiters = logs.filter(l => (l.fuelType ?? "diesel") === "diesel")
        .reduce((s, l) => s + (l.fuelUsed ?? 0), 0);
      const petrolLiters = logs.filter(l => l.fuelType === "petrol")
        .reduce((s, l) => s + (l.fuelUsed ?? 0), 0);
      res.json({ dieselLiters, petrolLiters, totalLogs: logs.length });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Шинэ төсөв батлах
  app.post("/api/fuel-budgets", requireAdmin, async (req, res) => {
    try {
      const data = schema.insertFuelBudgetSchema.parse(req.body);
      // Тухайн сарын өмнөх төсвийг устгана
      await db.delete(schema.fuelBudgets)
        .where(and(eq(schema.fuelBudgets.year, data.year), eq(schema.fuelBudgets.month, data.month)));
      const [row] = await db.insert(schema.fuelBudgets).values(data).returning();
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // Үнийг шинэчлэх (PATCH)
  app.patch("/api/fuel-budgets/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { dieselPrice, petrolPrice, budgetAmount, approvedBy, notes } = req.body;
      const updates: any = {};
      if (dieselPrice !== undefined) updates.dieselPrice = dieselPrice;
      if (petrolPrice !== undefined) updates.petrolPrice = petrolPrice;
      if (budgetAmount !== undefined) updates.budgetAmount = budgetAmount;
      if (approvedBy !== undefined) updates.approvedBy = approvedBy;
      if (notes !== undefined) updates.notes = notes;
      const [row] = await db.update(schema.fuelBudgets).set(updates)
        .where(eq(schema.fuelBudgets.id, id)).returning();
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // ===================== ДАЛД АЖЛЫН АКТ =====================

  app.get("/api/hidden-work-acts", requireAdmin, async (req, res) => {
    try {
      const rows = await db.select().from(schema.hiddenWorkActs).orderBy(desc(schema.hiddenWorkActs.createdAt));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/hidden-work-acts", requireAdmin, async (req, res) => {
    try {
      const data = schema.insertHiddenWorkActSchema.parse(req.body);
      const [row] = await db.insert(schema.hiddenWorkActs).values(data).returning();
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.put("/api/hidden-work-acts/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [row] = await db.update(schema.hiddenWorkActs).set(req.body).where(eq(schema.hiddenWorkActs.id, id)).returning();
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.delete("/api/hidden-work-acts/:id", requireAdmin, async (req, res) => {
    try {
      await db.delete(schema.hiddenWorkActs).where(eq(schema.hiddenWorkActs.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ============ АЖЛЫН ЗУРАГ — photo upload/retrieve/delete ============

  // Зураг upload хийх → Cloudinary
  app.post("/api/photos/upload", requireAdmin, uploadMiddleware.array("photos", 10), async (req, res) => {
    try {
      const { entityType, entityId, caption, uploadedBy, photoDate } = req.body;
      if (!entityType || !entityId) {
        return res.status(400).json({ error: "entityType, entityId шаардлагатай" });
      }
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "Зураг сонгоогүй байна" });
      }
      const inserted = [];
      const folder = `hovsgol-zam/${entityType}/${entityId}`;
      for (const file of files) {
        const { secure_url, public_id } = await uploadFile(file.buffer, file.originalname, folder);
        const [row] = await db.insert(schema.workPhotos).values({
          entityType,
          entityId: parseInt(entityId),
          filename:     secure_url,
          cloudinaryId: public_id,
          caption:    caption || null,
          uploadedBy: uploadedBy || null,
          photoDate:  photoDate || null,
        }).returning();
        inserted.push(row);
      }
      res.json(inserted);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Тухайн entity-ийн зургуудыг авах
  app.get("/api/photos/:entityType/:entityId", requireAdmin, async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const rows = await db.select().from(schema.workPhotos)
        .where(and(
          eq(schema.workPhotos.entityType, entityType),
          eq(schema.workPhotos.entityId, parseInt(entityId))
        ))
        .orderBy(desc(schema.workPhotos.createdAt));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Зураг устгах → Cloudinary + DB
  app.delete("/api/photos/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [photo] = await db.select().from(schema.workPhotos).where(eq(schema.workPhotos.id, id));
      if (photo) {
        if (photo.cloudinaryId) {
          await cloudinary.uploader.destroy(photo.cloudinaryId).catch(() => {});
        }
        await db.delete(schema.workPhotos).where(eq(schema.workPhotos.id, id));
      }
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ============ NORM CONFIGS — засварлах БНбД норм ============

  // Норм бүгдийг авах (анхны утгыг seed хийнэ)
  app.get("/api/norm-configs", requireAdmin, async (_req, res) => {
    try {
      await seedNormConfigs();
      const rows = await db.select().from(schema.normConfigs).orderBy(schema.normConfigs.category, schema.normConfigs.id);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Нэг норм засах + аудит лог хадгалах
  app.put("/api/norm-configs/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { rate, changedBy, note } = req.body;
      if (typeof rate !== "number") return res.status(400).json({ error: "rate шаардлагатай" });

      const [existing] = await db.select().from(schema.normConfigs).where(eq(schema.normConfigs.id, id));
      if (!existing) return res.status(404).json({ error: "Олдсонгүй" });

      // Аудит лог
      await db.insert(schema.normAuditLog).values({
        normConfigId: id,
        recipeKey:    existing.recipeKey,
        materialName: existing.materialName,
        oldRate:      existing.rate,
        newRate:      rate,
        changedBy:    changedBy || "Тодорхойгүй",
        note:         note || null,
      });

      // Норм шинэчлэх
      const [updated] = await db.update(schema.normConfigs)
        .set({ rate, updatedBy: changedBy || "Тодорхойгүй", updatedAt: new Date() })
        .where(eq(schema.normConfigs.id, id))
        .returning();
      res.json(updated);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Аудит логийг авах (сүүлийн 50)
  app.get("/api/norm-audit-log", requireAdmin, async (_req, res) => {
    try {
      const rows = await db.select().from(schema.normAuditLog)
        .orderBy(desc(schema.normAuditLog.changedAt))
        .limit(50);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ===================== МЭРГЭЖЛИЙН ГЭРЧИЛГЭЭ =====================
  app.get("/api/employee-certificates", requireAdmin, async (req, res) => {
    try {
      const empId = req.query.employeeId ? parseInt(req.query.employeeId as string) : null;
      const rows = empId
        ? await db.select().from(schema.employeeCertificates).where(eq(schema.employeeCertificates.employeeId, empId)).orderBy(desc(schema.employeeCertificates.createdAt))
        : await db.select().from(schema.employeeCertificates).orderBy(desc(schema.employeeCertificates.createdAt));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/employee-certificates", requireAdmin, async (req, res) => {
    try {
      const data = schema.insertEmployeeCertSchema.parse(req.body);
      const [row] = await db.insert(schema.employeeCertificates).values(data).returning();
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.delete("/api/employee-certificates/:id", requireAdmin, async (req, res) => {
    try {
      await db.delete(schema.employeeCertificates).where(eq(schema.employeeCertificates.id, parseInt(req.params.id)));
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ===================== ХАБЭА СУРГАЛТ =====================
  app.get("/api/employee-trainings", requireAdmin, async (req, res) => {
    try {
      const empId = req.query.employeeId ? parseInt(req.query.employeeId as string) : null;
      const rows = empId
        ? await db.select().from(schema.employeeTrainings).where(eq(schema.employeeTrainings.employeeId, empId)).orderBy(desc(schema.employeeTrainings.createdAt))
        : await db.select().from(schema.employeeTrainings).orderBy(desc(schema.employeeTrainings.createdAt));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/employee-trainings", requireAdmin, async (req, res) => {
    try {
      const data = schema.insertEmployeeTrainingSchema.parse(req.body);
      const [row] = await db.insert(schema.employeeTrainings).values(data).returning();
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.delete("/api/employee-trainings/:id", requireAdmin, async (req, res) => {
    try {
      await db.delete(schema.employeeTrainings).where(eq(schema.employeeTrainings.id, parseInt(req.params.id)));
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ===================== ЧАДВАРЫН МАТРИЦ =====================
  app.get("/api/employee-skills", requireAdmin, async (req, res) => {
    try {
      const rows = await db.select().from(schema.employeeSkills).orderBy(desc(schema.employeeSkills.createdAt));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/employee-skills", requireAdmin, async (req, res) => {
    try {
      const data = schema.insertEmployeeSkillSchema.parse(req.body);
      const [row] = await db.insert(schema.employeeSkills).values(data).returning();
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.delete("/api/employee-skills/:id", requireAdmin, async (req, res) => {
    try {
      await db.delete(schema.employeeSkills).where(eq(schema.employeeSkills.id, parseInt(req.params.id)));
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ===================== ТО ХУВААРЬ =====================
  app.get("/api/maintenance-schedules", requireAdmin, async (req, res) => {
    try {
      const vId = req.query.vehicleId ? parseInt(req.query.vehicleId as string) : null;
      const rows = vId
        ? await db.select().from(schema.maintenanceSchedules).where(eq(schema.maintenanceSchedules.vehicleId, vId)).orderBy(desc(schema.maintenanceSchedules.scheduledDate))
        : await db.select().from(schema.maintenanceSchedules).orderBy(desc(schema.maintenanceSchedules.scheduledDate));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/maintenance-schedules", requireAdmin, async (req, res) => {
    try {
      const data = schema.insertMaintenanceScheduleSchema.parse(req.body);
      const [row] = await db.insert(schema.maintenanceSchedules).values(data).returning();
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.patch("/api/maintenance-schedules/:id", requireAdmin, async (req, res) => {
    try {
      const [row] = await db.update(schema.maintenanceSchedules)
        .set(req.body).where(eq(schema.maintenanceSchedules.id, parseInt(req.params.id))).returning();
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.delete("/api/maintenance-schedules/:id", requireAdmin, async (req, res) => {
    try {
      await db.delete(schema.maintenanceSchedules).where(eq(schema.maintenanceSchedules.id, parseInt(req.params.id)));
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ===================== СЭЛБЭГ ХЭРЭГСЭЛ =====================
  app.get("/api/spare-parts", requireAdmin, async (req, res) => {
    try {
      const vId = req.query.vehicleId ? parseInt(req.query.vehicleId as string) : null;
      const rows = vId
        ? await db.select().from(schema.spareParts).where(eq(schema.spareParts.vehicleId, vId)).orderBy(schema.spareParts.partName)
        : await db.select().from(schema.spareParts).orderBy(schema.spareParts.partName);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/spare-parts", requireAdmin, async (req, res) => {
    try {
      const data = schema.insertSparePartSchema.parse(req.body);
      const [row] = await db.insert(schema.spareParts).values(data).returning();
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.patch("/api/spare-parts/:id", requireAdmin, async (req, res) => {
    try {
      const [row] = await db.update(schema.spareParts)
        .set(req.body).where(eq(schema.spareParts.id, parseInt(req.params.id))).returning();
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.delete("/api/spare-parts/:id", requireAdmin, async (req, res) => {
    try {
      await db.delete(schema.spareParts).where(eq(schema.spareParts.id, parseInt(req.params.id)));
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ===================== ТЕХНИКИЙН БАРИМТ БИЧИГ =====================
  app.get("/api/vehicle-documents", requireAdmin, async (req, res) => {
    try {
      const vId = req.query.vehicleId ? parseInt(req.query.vehicleId as string) : null;
      const rows = vId
        ? await db.select().from(schema.vehicleDocuments).where(eq(schema.vehicleDocuments.vehicleId, vId)).orderBy(schema.vehicleDocuments.expiryDate)
        : await db.select().from(schema.vehicleDocuments).orderBy(schema.vehicleDocuments.expiryDate);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/vehicle-documents", requireAdmin, async (req, res) => {
    try {
      const data = schema.insertVehicleDocSchema.parse(req.body);
      const [row] = await db.insert(schema.vehicleDocuments).values(data).returning();
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });
  app.delete("/api/vehicle-documents/:id", requireAdmin, async (req, res) => {
    try {
      await db.delete(schema.vehicleDocuments).where(eq(schema.vehicleDocuments.id, parseInt(req.params.id)));
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ===================== НЭГТГЭСЭН АНХААРУУЛГА =====================
  app.get("/api/expiry-alerts", requireAdmin, async (req, res) => {
    try {
      const today = new Date();
      const in60  = new Date(today.getTime() + 60 * 86400000).toISOString().slice(0, 10);
      const todayStr = today.toISOString().slice(0, 10);

      const [certs, trainings, vdocs, maintenance] = await Promise.all([
        db.select().from(schema.employeeCertificates).where(sql`${schema.employeeCertificates.expiryDate} IS NOT NULL AND ${schema.employeeCertificates.expiryDate} <= ${in60}`),
        db.select().from(schema.employeeTrainings).where(sql`${schema.employeeTrainings.nextDueDate} IS NOT NULL AND ${schema.employeeTrainings.nextDueDate} <= ${in60}`),
        db.select().from(schema.vehicleDocuments).where(sql`${schema.vehicleDocuments.expiryDate} <= ${in60}`),
        db.select().from(schema.maintenanceSchedules).where(sql`${schema.maintenanceSchedules.status} = 'scheduled' AND ${schema.maintenanceSchedules.scheduledDate} <= ${in60}`),
      ]);

      const employees = await db.select().from(schema.employees);
      const vehicles  = await db.select().from(schema.vehicles);
      const empMap: Record<number, string> = {};
      employees.forEach((e: any) => { empMap[e.id] = e.name; });
      const vehMap: Record<number, string> = {};
      vehicles.forEach((v: any) => { vehMap[v.id] = `${v.name} (${v.plateNumber})`; });

      const alerts: any[] = [];
      certs.forEach((c: any) => {
        const daysLeft = Math.ceil((new Date(c.expiryDate).getTime() - today.getTime()) / 86400000);
        alerts.push({ id: `cert-${c.id}`, type: "cert", level: daysLeft <= 0 ? "expired" : daysLeft <= 14 ? "critical" : "warning",
          title: c.certName, entity: empMap[c.employeeId] ?? "Ажилтан", expiry: c.expiryDate, daysLeft, category: "HR" });
      });
      trainings.forEach((t: any) => {
        const daysLeft = Math.ceil((new Date(t.nextDueDate).getTime() - today.getTime()) / 86400000);
        alerts.push({ id: `train-${t.id}`, type: "training", level: daysLeft <= 0 ? "expired" : daysLeft <= 14 ? "critical" : "warning",
          title: t.trainingName, entity: empMap[t.employeeId] ?? "Ажилтан", expiry: t.nextDueDate, daysLeft, category: "HR" });
      });
      vdocs.forEach((d: any) => {
        const daysLeft = Math.ceil((new Date(d.expiryDate).getTime() - today.getTime()) / 86400000);
        alerts.push({ id: `vdoc-${d.id}`, type: "vehicle_doc", level: daysLeft <= 0 ? "expired" : daysLeft <= 14 ? "critical" : "warning",
          title: d.docName, entity: vehMap[d.vehicleId] ?? "Техник", expiry: d.expiryDate, daysLeft, category: "Техник" });
      });
      maintenance.forEach((m: any) => {
        const daysLeft = Math.ceil((new Date(m.scheduledDate).getTime() - today.getTime()) / 86400000);
        alerts.push({ id: `maint-${m.id}`, type: "maintenance", level: daysLeft <= 0 ? "expired" : daysLeft <= 7 ? "critical" : "warning",
          title: `${m.toType} засвар`, entity: vehMap[m.vehicleId] ?? "Техник", expiry: m.scheduledDate, daysLeft, category: "Засвар" });
      });
      alerts.sort((a, b) => a.daysLeft - b.daysLeft);
      res.json(alerts);
    } catch (e: any) {
      console.error("expiry-alerts error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // ===================== ОНЫ НЭГТГЭЛ ТАЙЛАН =====================
  app.get("/api/annual-report", requireAdmin, async (req, res) => {
    try {
      const year = String(req.query.year ?? new Date().getFullYear());
      const prefix = year + "-%";

      const [
        employees, vehicles, warehouseItems,
        eqLogs, labResults, workReps, fuelBudgets,
        orders, contracts, workFronts,
      ] = await Promise.all([
        db.select().from(schema.employees),
        db.select().from(schema.vehicles),
        db.select().from(schema.warehouseItems),
        db.select().from(schema.equipmentLogs).where(sql`${schema.equipmentLogs.date} LIKE ${prefix}`),
        db.select().from(schema.labResults).where(sql`${schema.labResults.date} LIKE ${prefix}`),
        db.select().from(schema.workReports).where(sql`${schema.workReports.date} LIKE ${prefix}`),
        db.select().from(schema.fuelBudgets).where(eq(schema.fuelBudgets.year, parseInt(year))),
        db.select().from(schema.projectOrders),
        db.select().from(schema.projectContracts),
        db.select().from(schema.workFronts),
      ]);

      // Боловсон хүчин
      const deptMap: Record<string, number> = {};
      employees.forEach((e: any) => { deptMap[e.department ?? "Бусад"] = (deptMap[e.department ?? "Бусад"] ?? 0) + 1; });

      // Техник
      const readyVehicles  = vehicles.filter((v: any) => v.isReady).length;
      const vtypeMap: Record<string, number> = {};
      vehicles.forEach((v: any) => { vtypeMap[v.type ?? "Бусад"] = (vtypeMap[v.type ?? "Бусад"] ?? 0) + 1; });

      // Агуулах
      const lowStock = warehouseItems.filter((i: any) => (i.currentStock ?? 0) < (i.minStock ?? 0)).length;

      // Техникийн гүйцэтгэл
      const totalHours = eqLogs.reduce((s: number, l: any) => s + (Number(l.hoursWorked) || 0), 0);
      const totalFuelD = eqLogs.reduce((s: number, l: any) => s + (l.fuelType === "diesel" ? (Number(l.fuelUsed) || 0) : 0), 0);
      const totalFuelP = eqLogs.reduce((s: number, l: any) => s + (l.fuelType === "petrol" ? (Number(l.fuelUsed) || 0) : 0), 0);
      // By month
      const hoursByMonth: Record<string, number> = {};
      eqLogs.forEach((l: any) => {
        const m = String(l.date ?? "").slice(0, 7);
        if (m) hoursByMonth[m] = (hoursByMonth[m] ?? 0) + (Number(l.hoursWorked) || 0);
      });

      // Лабораторийн чанар
      const labPass   = labResults.filter((r: any) => r.status === "pass").length;
      const labFail   = labResults.filter((r: any) => r.status === "fail").length;
      const labRate   = (labPass + labFail) > 0 ? Math.round(labPass / (labPass + labFail) * 100) : null;
      const labByType: Record<string, { pass: number; fail: number }> = {};
      labResults.forEach((r: any) => {
        if (!labByType[r.testType]) labByType[r.testType] = { pass: 0, fail: 0 };
        if (r.status === "pass") labByType[r.testType].pass++;
        if (r.status === "fail") labByType[r.testType].fail++;
      });

      // Ажлын тайлан by dept
      const workByDept: Record<string, number> = {};
      const empDeptMap: Record<number, string> = {};
      employees.forEach((e: any) => { empDeptMap[e.id] = e.department ?? "Бусад"; });
      workReps.forEach((r: any) => {
        const dept = empDeptMap[r.employeeId] ?? "Бусад";
        workByDept[dept] = (workByDept[dept] ?? 0) + 1;
      });

      // Шатахуун төсөв
      const totalBudget = fuelBudgets.reduce((s: number, b: any) => s + (Number(b.budgetAmount) || 0), 0);

      // Санхүү
      const totalOrderAmt    = orders.reduce((s: number, o: any) => s + (Number(o.amount) || 0), 0);
      const totalContractAmt = contracts.reduce((s: number, c: any) => s + (Number(c.amount) || 0), 0);
      const orderByStatus: Record<string, number> = {};
      orders.forEach((o: any) => { orderByStatus[o.status ?? "other"] = (orderByStatus[o.status ?? "other"] ?? 0) + 1; });
      const contractByStatus: Record<string, number> = {};
      contracts.forEach((c: any) => { contractByStatus[c.status ?? "other"] = (contractByStatus[c.status ?? "other"] ?? 0) + 1; });

      // Ажлын фронт (active/done)
      const frontsActive = workFronts.filter((f: any) => f.status === "active").length;
      const frontsDone   = workFronts.filter((f: any) => f.status === "done").length;

      res.json({
        year,
        // Нөөц
        resources: {
          totalEmployees: employees.length,
          employeesByDept: deptMap,
          totalVehicles: vehicles.length,
          readyVehicles,
          vehiclesByType: vtypeMap,
          totalWarehouseItems: warehouseItems.length,
          lowStockItems: lowStock,
        },
        // Ажлын гүйцэтгэл
        performance: {
          totalWorkReports: workReps.length,
          workReportsByDept: workByDept,
          totalEquipmentHours: totalHours,
          totalFuelDiesel: totalFuelD,
          totalFuelPetrol: totalFuelP,
          hoursByMonth,
          totalWorkFronts: workFronts.length,
          activeFronts: frontsActive,
          doneFronts: frontsDone,
        },
        // Чанарын үр дүн
        quality: {
          totalLabTests: labResults.length,
          passCount: labPass,
          failCount: labFail,
          passRate: labRate,
          byTestType: labByType,
        },
        // Санхүүгийн үр дүн
        finance: {
          totalOrders: orders.length,
          totalOrderAmount: totalOrderAmt,
          ordersByStatus: orderByStatus,
          totalContracts: contracts.length,
          totalContractAmount: totalContractAmt,
          contractsByStatus: contractByStatus,
          totalFuelBudget: totalBudget,
        },
      });
    } catch (e: any) {
      console.error("annual-report error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // ===================== МЭДЭГДЛИЙН СИСТЕМ =====================
  app.get("/api/notifications", async (req, res) => {
    try {
      const token = req.headers["x-admin-token"];
      const role  = (req.query.role as string || "").toUpperCase();
      if (token !== "authenticated" || !role) return res.status(401).json({ message: "Нэвтрэх шаардлагатай" });
      const rows = await db.select().from(schema.notifications)
        .where(eq(schema.notifications.toRole, role))
        .orderBy(desc(schema.notifications.createdAt))
        .limit(50);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/notifications/:id/read", requireAdmin, async (req, res) => {
    try {
      await db.update(schema.notifications)
        .set({ isRead: true })
        .where(eq(schema.notifications.id, parseInt(req.params.id)));
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/notifications/read-all", requireAdmin, async (req, res) => {
    try {
      const { role } = req.body;
      if (!role) return res.status(400).json({ message: "Role шаардлагатай" });
      await db.update(schema.notifications)
        .set({ isRead: true })
        .where(eq(schema.notifications.toRole, role.toUpperCase()));
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Борлуулалтын алба → "Гэрээ баталгаажлаа" → Хяналтын инженерт мэдэгдэл
  app.post("/api/notifications/contract-confirmed", requireAdmin, async (req, res) => {
    try {
      const { orderId, customerName, productType, quantity, unit, deliveryDate } = req.body;
      await db.insert(schema.notifications).values([
        { toRole: "SUPERVISOR", title: "Гэрээ баталгаажлаа — Ажлын захиалга", body: `${customerName} — ${productType} ${quantity}${unit??""} · ${deliveryDate??""}`, sourceType: "project_order", sourceId: orderId },
        { toRole: "ADMIN",     title: "Гэрээ баталгаажлаа",                    body: `${customerName} — ${productType} ${quantity}${unit??""} · Нийлүүлэлтэд шилжлээ`, sourceType: "project_order", sourceId: orderId },
      ]);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ===================== ТОХИРЛЫН ГЭРЧИЛГЭЭ / CERTIFICATES & COMPLIANCE =====================

  // Гэрчилгээний жагсаалт
  app.get("/api/lab/certificates", requireAdmin, async (_req, res) => {
    try {
      const rows = await db.select().from(schema.complianceCertificates)
        .orderBy(desc(schema.complianceCertificates.createdAt));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Гэрчилгээ нэмэх
  app.post("/api/lab/certificates", requireAdmin, async (req, res) => {
    try {
      const data = schema.insertComplianceCertSchema.parse(req.body);
      const [row] = await db.insert(schema.complianceCertificates).values(data).returning();
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // Гэрчилгээ засах
  app.patch("/api/lab/certificates/:id", requireAdmin, async (req, res) => {
    try {
      const data = schema.insertComplianceCertSchema.partial().parse(req.body);
      const [row] = await db.update(schema.complianceCertificates)
        .set(data)
        .where(eq(schema.complianceCertificates.id, parseInt(req.params.id)))
        .returning();
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // Гэрчилгээ устгах
  app.delete("/api/lab/certificates/:id", requireAdmin, async (req, res) => {
    try {
      await db.delete(schema.complianceCertificates)
        .where(eq(schema.complianceCertificates.id, parseInt(req.params.id)));
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Хугацаа дуусах мэдэгдэл шалгах (30 хоногийн өмнө)
  app.post("/api/lab/certificates/check-expiry", requireAdmin, async (_req, res) => {
    try {
      const today = new Date();
      const in30  = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      const certs = await db.select().from(schema.complianceCertificates)
        .where(eq(schema.complianceCertificates.isActive, true));

      const expiring = certs.filter(c => {
        const exp = new Date(c.expiryDate);
        return exp <= in30 && exp > today && !c.reminderSent;
      });

      for (const cert of expiring) {
        const daysLeft = Math.ceil((new Date(cert.expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        await db.insert(schema.notifications).values({
          toRole:     "ADMIN",
          title:      `⚠️ Гэрчилгээ дуусах дөхлөө — ${cert.certNumber}`,
          body:       `${cert.certType.toUpperCase()} гэрчилгээ ${daysLeft} хоногийн дараа дуусна. Олгосон: ${cert.issuedBy}. Дуусах огноо: ${cert.expiryDate}`,
          sourceType: "request",
          sourceId:   cert.id,
        });
        await db.update(schema.complianceCertificates)
          .set({ reminderSent: true })
          .where(eq(schema.complianceCertificates.id, cert.id));
      }

      res.json({ checked: certs.length, reminded: expiring.length });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ТУЗ тайлан — Чанарын гэрчилгээний тохирлын хувь (batch tracking)
  app.get("/api/lab/compliance-report", requireAdmin, async (_req, res) => {
    try {
      const batches = await db.select().from(schema.qualityCertificates)
        .orderBy(desc(schema.qualityCertificates.createdAt));
      const total     = batches.length;
      const compliant = batches.filter(b => b.isCompliant).length;
      const pct       = total > 0 ? Math.round((compliant / total) * 100) : 0;

      // Бүтээгдэхүүний төрлөөр
      const byProduct: Record<string, { total: number; compliant: number }> = {};
      for (const b of batches) {
        if (!byProduct[b.productType]) byProduct[b.productType] = { total: 0, compliant: 0 };
        byProduct[b.productType].total++;
        if (b.isCompliant) byProduct[b.productType].compliant++;
      }

      res.json({ total, compliant, nonCompliant: total - compliant, compliancePct: pct, byProduct, batches });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Чанарын гэрчилгээ (партийн) жагсаалт
  app.get("/api/lab/quality-certs", requireAdmin, async (_req, res) => {
    try {
      const rows = await db.select().from(schema.qualityCertificates)
        .orderBy(desc(schema.qualityCertificates.createdAt));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Чанарын гэрчилгээ нэмэх
  app.post("/api/lab/quality-certs", requireAdmin, async (req, res) => {
    try {
      const data = schema.insertQualityCertSchema.parse(req.body);
      const [row] = await db.insert(schema.qualityCertificates).values(data).returning();
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // Чанарын гэрчилгээ устгах
  app.delete("/api/lab/quality-certs/:id", requireAdmin, async (req, res) => {
    try {
      await db.delete(schema.qualityCertificates)
        .where(eq(schema.qualityCertificates.id, parseInt(req.params.id)));
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Нийтийн QR хуудас — гэрчилгээний стандарт үзүүлэлтүүд
  app.get("/api/public/quality-cert/:id", async (req, res) => {
    try {
      const [cert] = await db.select().from(schema.qualityCertificates)
        .where(eq(schema.qualityCertificates.id, parseInt(req.params.id)));
      if (!cert) return res.status(404).send("Гэрчилгээ олдсонгүй");

      // Компанийн тохирлын гэрчилгээнүүдийг авах
      const compliance = await db.select().from(schema.complianceCertificates)
        .where(eq(schema.complianceCertificates.isActive, true));

      const html = `<!DOCTYPE html><html lang="mn"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Чанарын гэрчилгээ — ${cert.batchNumber}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Arial', sans-serif; background:#f8fafc; color:#0f172a; padding:24px; }
  .header { background:#0f172a; color:white; padding:24px; border-radius:12px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; }
  .company { font-size:18px; font-weight:bold; }
  .sub { font-size:12px; color:#94a3b8; margin-top:4px; }
  .badge { background:#d97706; color:white; padding:6px 14px; border-radius:20px; font-size:13px; font-weight:bold; }
  .section { background:white; border-radius:12px; padding:20px; margin-bottom:16px; border:1px solid #e2e8f0; }
  .section-title { font-size:14px; font-weight:bold; color:#0f172a; margin-bottom:12px; border-bottom:2px solid #d97706; padding-bottom:8px; }
  .row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:13px; }
  .label { color:#64748b; }
  .value { font-weight:bold; color:#0f172a; }
  .pass { color:#16a34a; }
  .cert-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .cert-card { background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:12px; font-size:12px; }
  .cert-num { font-weight:bold; color:#1d4ed8; font-size:14px; }
  footer { text-align:center; font-size:11px; color:#94a3b8; margin-top:20px; }
</style></head><body>
<div class="header">
  <div>
    <div class="company">Хөвсгөл зам ХХК</div>
    <div class="sub">Зам гүүр, барилга угсралтын Хөвсгөл зам ХХК</div>
  </div>
  <div class="badge">✓ ЧАНАРЫН ГЭРЧИЛГЭЭ</div>
</div>

<div class="section">
  <div class="section-title">📦 Бүтээгдэхүүний мэдээлэл</div>
  <div class="row"><span class="label">Партийн дугаар</span><span class="value">${cert.batchNumber}</span></div>
  <div class="row"><span class="label">Бүтээгдэхүүний нэр</span><span class="value">${cert.productName}</span></div>
  <div class="row"><span class="label">Тоо хэмжээ</span><span class="value">${cert.quantity} ${cert.unit}</span></div>
  ${cert.customerName ? `<div class="row"><span class="label">Харилцагч</span><span class="value">${cert.customerName}</span></div>` : ''}
  ${cert.deliveryDate ? `<div class="row"><span class="label">Нийлүүлэлтийн огноо</span><span class="value">${cert.deliveryDate}</span></div>` : ''}
  ${cert.location ? `<div class="row"><span class="label">Хүргэлтийн байршил</span><span class="value">${cert.location}</span></div>` : ''}
  <div class="row"><span class="label">Тохирлын хувь</span><span class="value pass">${cert.compliancePct ?? 100}%</span></div>
  ${cert.standardRef ? `<div class="row"><span class="label">Стандарт</span><span class="value">${cert.standardRef}</span></div>` : ''}
  ${cert.issuedDate ? `<div class="row"><span class="label">Олгосон огноо</span><span class="value">${cert.issuedDate}</span></div>` : ''}
  ${cert.issuedBy ? `<div class="row"><span class="label">Чанарын хяналт</span><span class="value">${cert.issuedBy}</span></div>` : ''}
</div>

${compliance.length > 0 ? `
<div class="section">
  <div class="section-title">🏅 Компанийн тохирлын гэрчилгээнүүд</div>
  <div class="cert-grid">
    ${compliance.map(c => `
    <div class="cert-card">
      <div class="cert-num">${c.certType.toUpperCase()}</div>
      <div>${c.certNumber}</div>
      <div style="color:#64748b; margin-top:4px;">${c.issuedBy}</div>
      <div style="color:#64748b;">${c.standardRef || ''}</div>
      <div style="margin-top:6px;">Дуусах: <strong>${c.expiryDate}</strong></div>
    </div>`).join('')}
  </div>
</div>` : ''}

${cert.testResults ? `
<div class="section">
  <div class="section-title">🔬 Лабораторийн туршилтын дүн</div>
  ${(() => { try { const t = JSON.parse(cert.testResults!); return Object.entries(t).map(([k,v]) => `<div class="row"><span class="label">${k}</span><span class="value pass">${v}</span></div>`).join(''); } catch { return `<p style="color:#64748b;font-size:13px;">${cert.testResults}</p>`; } })()}
</div>` : ''}

<footer>Энэ гэрчилгээ QR кодоор баталгаажсан · Хөвсгөл зам ХХК © ${new Date().getFullYear()}</footer>
</body></html>`;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ===================== БОРЛУУЛАЛТЫН ЗАХИАЛГА =====================
  const requireSales = (req: any, res: any, next: any) => {
    const token = req.headers["x-admin-token"];
    if (token === "authenticated") return next();
    res.status(401).json({ message: "Нэвтрэх шаардлагатай" });
  };

  app.get("/api/sales/orders", requireSales, async (_req, res) => {
    try {
      const rows = await db.select().from(schema.salesOrders).orderBy(desc(schema.salesOrders.createdAt));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/sales/orders", requireSales, async (req, res) => {
    try {
      const [row] = await db.insert(schema.salesOrders).values(req.body).returning();
      res.status(201).json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.patch("/api/sales/orders/:id", requireSales, async (req, res) => {
    try {
      const [row] = await db.update(schema.salesOrders)
        .set(req.body)
        .where(eq(schema.salesOrders.id, parseInt(req.params.id)))
        .returning();
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.delete("/api/sales/orders/:id", requireSales, async (req, res) => {
    try {
      await db.delete(schema.salesOrders).where(eq(schema.salesOrders.id, parseInt(req.params.id)));
      res.json({ ok: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // Өртгийн тохиргоо
  app.get("/api/sales/cost-config", requireSales, async (_req, res) => {
    try {
      const rows = await db.select().from(schema.productionCostConfig);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/sales/cost-config/:plant", requireAdmin, async (req, res) => {
    try {
      const { plant } = req.params;
      const [existing] = await db.select().from(schema.productionCostConfig)
        .where(eq(schema.productionCostConfig.plant, plant));
      let row;
      if (existing) {
        [row] = await db.update(schema.productionCostConfig)
          .set({ ...req.body, updatedAt: new Date() })
          .where(eq(schema.productionCostConfig.plant, plant))
          .returning();
      } else {
        [row] = await db.insert(schema.productionCostConfig)
          .values({ plant, ...req.body })
          .returning();
      }
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // Өртгийн тооцоолол + Зах зээлтэй харьцуулалт
  app.post("/api/sales/calculate-cost", requireSales, async (req, res) => {
    try {
      const { plant, aiMaterialCosts } = req.body;
      // aiMaterialCosts: [{ name, pricePerUnit, quantity }] борлуулалтын ажилтнаас баталгаажуулсан

      // Үйлдвэрийн тохиргоо татах
      const [config] = await db.select().from(schema.productionCostConfig)
        .where(eq(schema.productionCostConfig.plant, plant));

      if (!config) return res.status(404).json({ error: "Тохиргоо олдсонгүй" });

      // Материалын нийт өртөг
      const materialCost = (aiMaterialCosts || []).reduce((sum: number, m: any) => {
        return sum + (Number(m.pricePerUnit) * Number(m.quantity));
      }, 0);

      // Хөдөлмөрийн зардал / нэгж
      const dailyOutput = config.dailyCapacity * (config.targetPct / 100);
      const monthlyOutput = dailyOutput * 22; // 22 ажлын өдөр
      const totalSalary = (config.workerCount || 20) * (config.minSalary || 3000000);
      const laborCostPerUnit = monthlyOutput > 0 ? totalSalary / monthlyOutput : 0;

      // Нийт өртөг / нэгж
      const totalCostPerUnit = materialCost
        + laborCostPerUnit
        + (config.powerCostPerUnit || 0)
        + (config.equipmentCostPerUnit || 0);

      res.json({
        plant,
        materialCost,
        laborCostPerUnit: Math.round(laborCostPerUnit),
        powerCostPerUnit: config.powerCostPerUnit || 0,
        equipmentCostPerUnit: config.equipmentCostPerUnit || 0,
        totalCostPerUnit: Math.round(totalCostPerUnit),
        dailyTarget: Math.round(dailyOutput),
        monthlyTarget: Math.round(monthlyOutput),
        breakdown: aiMaterialCosts,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ТУЗ-ийн ашигт ажиллагааны тойм
  app.get("/api/sales/profitability-summary", requireSales, async (_req, res) => {
    try {
      const orders = await db.select().from(schema.salesOrders);
      const configs = await db.select().from(schema.productionCostConfig);

      const today = new Date();
      const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

      const thisMonth = orders.filter(o => (o.createdAt?.toISOString() ?? "") >= monthStart);
      const confirmed = orders.filter(o => o.status === "confirmed" || o.status === "in_production" || o.status === "delivered");

      const totalRevenue = confirmed.reduce((s, o) => s + ((o.pricePerUnit || 0) * (o.quantity || 0)), 0);
      const totalCost    = confirmed.reduce((s, o) => s + ((o.costPerUnit  || 0) * (o.quantity || 0)), 0);
      const totalProfit  = totalRevenue - totalCost;
      const totalQty     = confirmed.reduce((s, o) => s + (o.quantity || 0), 0);

      // Үйлдвэр тус бүрийн 30%-ийн зорилтын явц
      const plantProgress = configs.map(c => {
        const plantOrders = confirmed.filter(o => {
          if (c.plant === "concrete")  return o.product.startsWith("concrete");
          if (c.plant === "asphalt")   return o.product === "asphalt";
          if (c.plant === "crushing")  return o.product === "crushed_stone";
          return false;
        });
        const deliveredQty = plantOrders.reduce((s, o) => s + (o.quantity || 0), 0);
        const monthlyTarget = c.dailyCapacity * (c.targetPct / 100) * 22;
        return {
          plant: c.plant,
          dailyCapacity: c.dailyCapacity,
          targetPct: c.targetPct,
          monthlyTarget: Math.round(monthlyTarget),
          deliveredQty: Math.round(deliveredQty),
          achievedPct: monthlyTarget > 0 ? Math.round((deliveredQty / monthlyTarget) * 100) : 0,
        };
      });

      res.json({
        totalRevenue:   Math.round(totalRevenue),
        totalCost:      Math.round(totalCost),
        totalProfit:    Math.round(totalProfit),
        totalQty:       Math.round(totalQty),
        orderCount:     confirmed.length,
        thisMonthCount: thisMonth.length,
        plantProgress,
        marginPct: totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ============ ХАРИЛЦАГЧ (CUSTOMERS) ============
  app.get("/api/customers", requireAdmin, async (_req, res) => {
    try {
      const rows = await db.select().from(schema.customers).orderBy(desc(schema.customers.createdAt));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/customers/:id", requireAdmin, async (req, res) => {
    try {
      const [row] = await db.select().from(schema.customers).where(eq(schema.customers.id, parseInt(req.params.id)));
      if (!row) return res.status(404).json({ error: "Харилцагч олдсонгүй" });
      res.json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/customers", requireAdmin, async (req, res) => {
    try {
      const data = schema.insertCustomerSchema.parse(req.body);
      const [row] = await db.insert(schema.customers).values(data).returning();
      res.status(201).json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.put("/api/customers/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = schema.insertCustomerSchema.partial().parse(req.body);
      const [row] = await db.update(schema.customers).set(data).where(eq(schema.customers.id, id)).returning();
      if (!row) return res.status(404).json({ error: "Харилцагч олдсонгүй" });
      res.json(row);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.delete("/api/customers/:id", requireRole("ADMIN"), async (req, res) => {
    try {
      await db.delete(schema.customers).where(eq(schema.customers.id, parseInt(req.params.id)));
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ============ ХУРЛЫН ТАЙЛАН (MEETING REPORTS) ============
  app.get("/api/meeting-reports", requireAdmin, async (_req, res) => {
    try {
      const rows = await db.select().from(schema.meetingReports)
        .orderBy(desc(schema.meetingReports.createdAt));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/meeting-reports", requireAdmin, docUploadMiddleware.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Файл оруулаагүй байна" });
      const { title, description, category, meetingDate } = req.body;
      if (!title?.trim()) return res.status(400).json({ error: "Гарчиг шаардлагатай" });

      const ext = path.extname(req.file.originalname).toLowerCase().replace(".", "");
      const { secure_url, public_id } = await uploadDocument(
        req.file.buffer,
        req.file.originalname,
        "meeting_reports"
      );

      const [row] = await db.insert(schema.meetingReports).values({
        title: title.trim(),
        description: description?.trim() || null,
        category: category || "other",
        fileUrl: secure_url,
        cloudinaryId: public_id,
        fileName: req.file.originalname,
        fileType: ext,
        uploadedBy: req.authUser ?? "admin",
        uploadedByRole: req.authRole ?? "ADMIN",
        meetingDate: meetingDate || null,
        isShared: true,
      }).returning();

      res.status(201).json(row);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/meeting-reports/:id", requireAdmin, async (req, res) => {
    try {
      const [row] = await db.select().from(schema.meetingReports)
        .where(eq(schema.meetingReports.id, parseInt(req.params.id)));
      if (!row) return res.status(404).json({ error: "Тайлан олдсонгүй" });
      if (row.cloudinaryId && hasCloudinary) {
        const rtype = ["pdf","xlsx","xls","docx","doc","pptx","ppt"].includes(row.fileType ?? "")
          ? "raw" : "image";
        await cloudinary.uploader.destroy(row.cloudinaryId, { resource_type: rtype }).catch(() => {});
      }
      await db.delete(schema.meetingReports).where(eq(schema.meetingReports.id, parseInt(req.params.id)));
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Seed data
  seedInitialContent().catch(console.error);
  seedDefaultKpiConfigs().catch(console.error);
  seedWarehouse().catch(console.error);
  seedProductionCostConfig().catch(console.error);
  return httpServer;
}

// ============ БНбД норм-ийн анхны утгыг хадгалах ============
async function seedNormConfigs() {
  const existing = await db.select().from(schema.normConfigs).limit(1);
  if (existing.length > 0) return; // Аль хэдийн seed хийсэн

  const defaults: Omit<schema.InsertNormConfig, "updatedAt">[] = [
    // Асфальтбетон АБ-1
    { category: "asphalt", recipeKey: "АБ-1 (Дотор давхарга)", materialName: "Битум БНД 60/90",  unit: "тн", rate: 0.129, bnbdRate: 0.129, bnbdRef: "БНбД 3.01.100 Хүснэгт 4", updatedBy: null },
    { category: "asphalt", recipeKey: "АБ-1 (Дотор давхарга)", materialName: "Хайрга 10-20мм",   unit: "тн", rate: 0.517, bnbdRate: 0.517, bnbdRef: "БНбД 3.01.100",             updatedBy: null },
    { category: "asphalt", recipeKey: "АБ-1 (Дотор давхарга)", materialName: "Хайрга 5-10мм",    unit: "тн", rate: 0.423, bnbdRate: 0.423, bnbdRef: "БНбД 3.01.100",             updatedBy: null },
    { category: "asphalt", recipeKey: "АБ-1 (Дотор давхарга)", materialName: "Хайрга 2-5мм",     unit: "тн", rate: 0.329, bnbdRate: 0.329, bnbdRef: "БНбД 3.01.100",             updatedBy: null },
    { category: "asphalt", recipeKey: "АБ-1 (Дотор давхарга)", materialName: "Хайрга 0-2мм",     unit: "тн", rate: 0.353, bnbdRate: 0.353, bnbdRef: "БНбД 3.01.100",             updatedBy: null },
    { category: "asphalt", recipeKey: "АБ-1 (Дотор давхарга)", materialName: "Минерал нунтаг",   unit: "тн", rate: 0.212, bnbdRate: 0.212, bnbdRef: "БНбД 3.01.100",             updatedBy: null },
    { category: "asphalt", recipeKey: "АБ-1 (Дотор давхарга)", materialName: "Элс (асфальт)",    unit: "тн", rate: 0.387, bnbdRate: 0.387, bnbdRef: "БНбД 3.01.100",             updatedBy: null },
    // Асфальтбетон АБ-2
    { category: "asphalt", recipeKey: "АБ-2 (Дунд давхарга)", materialName: "Битум БНД 60/90",  unit: "тн", rate: 0.120, bnbdRate: 0.120, bnbdRef: "БНбД 3.01.100 Хүснэгт 4", updatedBy: null },
    { category: "asphalt", recipeKey: "АБ-2 (Дунд давхарга)", materialName: "Хайрга 10-20мм",   unit: "тн", rate: 0.672, bnbdRate: 0.672, bnbdRef: "БНбД 3.01.100",             updatedBy: null },
    { category: "asphalt", recipeKey: "АБ-2 (Дунд давхарга)", materialName: "Хайрга 5-10мм",    unit: "тн", rate: 0.480, bnbdRate: 0.480, bnbdRef: "БНбД 3.01.100",             updatedBy: null },
    { category: "asphalt", recipeKey: "АБ-2 (Дунд давхарга)", materialName: "Хайрга 2-5мм",     unit: "тн", rate: 0.312, bnbdRate: 0.312, bnbdRef: "БНбД 3.01.100",             updatedBy: null },
    { category: "asphalt", recipeKey: "АБ-2 (Дунд давхарга)", materialName: "Хайрга 0-2мм",     unit: "тн", rate: 0.288, bnbdRate: 0.288, bnbdRef: "БНбД 3.01.100",             updatedBy: null },
    { category: "asphalt", recipeKey: "АБ-2 (Дунд давхарга)", materialName: "Минерал нунтаг",   unit: "тн", rate: 0.192, bnbdRate: 0.192, bnbdRef: "БНбД 3.01.100",             updatedBy: null },
    { category: "asphalt", recipeKey: "АБ-2 (Дунд давхарга)", materialName: "Элс (асфальт)",    unit: "тн", rate: 0.336, bnbdRate: 0.336, bnbdRef: "БНбД 3.01.100",             updatedBy: null },
    // Асфальтбетон ДАБ
    { category: "asphalt", recipeKey: "ДАБ (Доод давхарга)", materialName: "Битум БНД 60/90",   unit: "тн", rate: 0.109, bnbdRate: 0.109, bnbdRef: "БНбД 3.01.100 Хүснэгт 4", updatedBy: null },
    { category: "asphalt", recipeKey: "ДАБ (Доод давхарга)", materialName: "Хайрга 10-20мм",    unit: "тн", rate: 0.847, bnbdRate: 0.847, bnbdRef: "БНбД 3.01.100",             updatedBy: null },
    { category: "asphalt", recipeKey: "ДАБ (Доод давхарга)", materialName: "Хайрга 5-10мм",     unit: "тн", rate: 0.532, bnbdRate: 0.532, bnbdRef: "БНбД 3.01.100",             updatedBy: null },
    { category: "asphalt", recipeKey: "ДАБ (Доод давхарга)", materialName: "Хайрга 2-5мм",      unit: "тн", rate: 0.290, bnbdRate: 0.290, bnbdRef: "БНбД 3.01.100",             updatedBy: null },
    { category: "asphalt", recipeKey: "ДАБ (Доод давхарга)", materialName: "Хайрга 0-2мм",      unit: "тн", rate: 0.242, bnbdRate: 0.242, bnbdRef: "БНбД 3.01.100",             updatedBy: null },
    { category: "asphalt", recipeKey: "ДАБ (Доод давхарга)", materialName: "Минерал нунтаг",    unit: "тн", rate: 0.169, bnbdRate: 0.169, bnbdRef: "БНбД 3.01.100",             updatedBy: null },
    { category: "asphalt", recipeKey: "ДАБ (Доод давхарга)", materialName: "Элс (асфальт)",     unit: "тн", rate: 0.230, bnbdRate: 0.230, bnbdRef: "БНбД 3.01.100",             updatedBy: null },
    // Бетон C15/20
    { category: "concrete", recipeKey: "C15/20 (Суурь, хонгил)",       materialName: "Цемент ПЦ400",    unit: "тн", rate: 0.280, bnbdRate: 0.280, bnbdRef: "БНбД 3.01.102 Хүснэгт 5", updatedBy: null },
    { category: "concrete", recipeKey: "C15/20 (Суурь, хонгил)",       materialName: "Элс (бетон)",     unit: "м³", rate: 0.750, bnbdRate: 0.750, bnbdRef: "БНбД 3.01.102",             updatedBy: null },
    { category: "concrete", recipeKey: "C15/20 (Суурь, хонгил)",       materialName: "Хайрга 5-10мм",  unit: "м³", rate: 0.400, bnbdRate: 0.400, bnbdRef: "БНбД 3.01.102",             updatedBy: null },
    { category: "concrete", recipeKey: "C15/20 (Суурь, хонгил)",       materialName: "Хайрга 10-20мм", unit: "м³", rate: 0.560, bnbdRate: 0.560, bnbdRef: "БНбД 3.01.102",             updatedBy: null },
    { category: "concrete", recipeKey: "C15/20 (Суурь, хонгил)",       materialName: "Ус",              unit: "м³", rate: 0.190, bnbdRate: 0.190, bnbdRef: "БНбД 3.01.102",             updatedBy: null },
    // Бетон C20/25
    { category: "concrete", recipeKey: "C20/25 (Ерөнхий бүтэц)",      materialName: "Цемент ПЦ400",    unit: "тн", rate: 0.320, bnbdRate: 0.320, bnbdRef: "БНбД 3.01.102 Хүснэгт 5", updatedBy: null },
    { category: "concrete", recipeKey: "C20/25 (Ерөнхий бүтэц)",      materialName: "Элс (бетон)",     unit: "м³", rate: 0.710, bnbdRate: 0.710, bnbdRef: "БНбД 3.01.102",             updatedBy: null },
    { category: "concrete", recipeKey: "C20/25 (Ерөнхий бүтэц)",      materialName: "Хайрга 5-10мм",  unit: "м³", rate: 0.380, bnbdRate: 0.380, bnbdRef: "БНбД 3.01.102",             updatedBy: null },
    { category: "concrete", recipeKey: "C20/25 (Ерөнхий бүтэц)",      materialName: "Хайрга 10-20мм", unit: "м³", rate: 0.540, bnbdRate: 0.540, bnbdRef: "БНбД 3.01.102",             updatedBy: null },
    { category: "concrete", recipeKey: "C20/25 (Ерөнхий бүтэц)",      materialName: "Ус",              unit: "м³", rate: 0.185, bnbdRate: 0.185, bnbdRef: "БНбД 3.01.102",             updatedBy: null },
    // Бетон C25/30
    { category: "concrete", recipeKey: "C25/30 (Замын хавтан, хана)", materialName: "Цемент ПЦ500",   unit: "тн", rate: 0.350, bnbdRate: 0.350, bnbdRef: "БНбД 3.01.102 Хүснэгт 5", updatedBy: null },
    { category: "concrete", recipeKey: "C25/30 (Замын хавтан, хана)", materialName: "Элс (бетон)",    unit: "м³", rate: 0.680, bnbdRate: 0.680, bnbdRef: "БНбД 3.01.102",             updatedBy: null },
    { category: "concrete", recipeKey: "C25/30 (Замын хавтан, хана)", materialName: "Хайрга 5-10мм", unit: "м³", rate: 0.400, bnbdRate: 0.400, bnbdRef: "БНбД 3.01.102",             updatedBy: null },
    { category: "concrete", recipeKey: "C25/30 (Замын хавтан, хана)", materialName: "Хайрга 10-20мм",unit: "м³", rate: 0.550, bnbdRate: 0.550, bnbdRef: "БНбД 3.01.102",             updatedBy: null },
    { category: "concrete", recipeKey: "C25/30 (Замын хавтан, хана)", materialName: "Химийн нэмэлт", unit: "кг", rate: 0.900, bnbdRate: 0.900, bnbdRef: "ГОСТ 24211",                updatedBy: null },
    { category: "concrete", recipeKey: "C25/30 (Замын хавтан, хана)", materialName: "Ус",             unit: "м³", rate: 0.180, bnbdRate: 0.180, bnbdRef: "БНбД 3.01.102",             updatedBy: null },
    // Бетон C30/37
    { category: "concrete", recipeKey: "C30/37 (Гүүр, тулгуур)",      materialName: "Цемент ПЦ500",   unit: "тн", rate: 0.400, bnbdRate: 0.400, bnbdRef: "БНбД 3.01.102 Хүснэгт 5", updatedBy: null },
    { category: "concrete", recipeKey: "C30/37 (Гүүр, тулгуур)",      materialName: "Элс (бетон)",    unit: "м³", rate: 0.620, bnbdRate: 0.620, bnbdRef: "БНбД 3.01.102",             updatedBy: null },
    { category: "concrete", recipeKey: "C30/37 (Гүүр, тулгуур)",      materialName: "Хайрга 5-10мм", unit: "м³", rate: 0.360, bnbdRate: 0.360, bnbdRef: "БНбД 3.01.102",             updatedBy: null },
    { category: "concrete", recipeKey: "C30/37 (Гүүр, тулгуур)",      materialName: "Хайрга 10-20мм",unit: "м³", rate: 0.520, bnbdRate: 0.520, bnbdRef: "БНбД 3.01.102",             updatedBy: null },
    { category: "concrete", recipeKey: "C30/37 (Гүүр, тулгуур)",      materialName: "Химийн нэмэлт", unit: "кг", rate: 1.200, bnbdRate: 1.200, bnbdRef: "ГОСТ 24211",                updatedBy: null },
    { category: "concrete", recipeKey: "C30/37 (Гүүр, тулгуур)",      materialName: "Ус",             unit: "м³", rate: 0.175, bnbdRate: 0.175, bnbdRef: "БНбД 3.01.102",             updatedBy: null },
    // Бутлах үйлдвэр
    { category: "crushing", recipeKey: "Бутлах ангилах үйлдвэр", materialName: "Байгалийн чулуу (оролт)", unit: "тн", rate: 1.150, bnbdRate: 1.150, bnbdRef: "БНбД 3.01.100 Хавсралт", updatedBy: null },
    { category: "crushing", recipeKey: "Бутлах ангилах үйлдвэр", materialName: "Шатах тос",               unit: "л",  rate: 0.625, bnbdRate: 0.625, bnbdRef: "Үйлдвэрийн норм",          updatedBy: null },
  ];

  await db.insert(schema.normConfigs).values(defaults);
}

async function seedInitialContent() {
  try {
    const existing = await db.select().from(schema.content).where(eq(schema.content.section, "hero"));
    if (existing.length === 0) {
      await db.insert(schema.content).values({
        section: "hero",
        title: "Ирээдүйг Бүтээнэ",
        description: "Бид олон жилийн туршлагаараа чанар стандартын өндөр түвшинд авто зам, гүүр, барилга байгууламжийн төслүүдийг амжилттай хэрэгжүүлж байна.",
        ctaText: "Төслүүдтэй танилцах",
        secondaryCtaText: "Холбогдох",
      });
    }
  } catch {}
}

async function seedProductionCostConfig() {
  try {
    const existing = await db.select().from(schema.productionCostConfig).limit(1);
    if (existing.length > 0) return;
    await db.insert(schema.productionCostConfig).values([
      { plant: "concrete",  dailyCapacity: 1500, targetPct: 30, workerCount: 25, minSalary: 3000000, powerCostPerUnit: 8000,  equipmentCostPerUnit: 12000 },
      { plant: "asphalt",   dailyCapacity: 200,  targetPct: 30, workerCount: 20, minSalary: 3000000, powerCostPerUnit: 15000, equipmentCostPerUnit: 20000 },
      { plant: "crushing",  dailyCapacity: 800,  targetPct: 30, workerCount: 15, minSalary: 3000000, powerCostPerUnit: 5000,  equipmentCostPerUnit: 8000  },
    ]);
  } catch {}
}
