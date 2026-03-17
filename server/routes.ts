import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import express from "express";
import { storage } from "./storage.js";
import { db } from "./db.js";
import * as schema from "../shared/schema.js";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { calculateEmployeeKpi, calculateTeamKpi, seedDefaultKpiConfigs } from "./kpiEngine.js";
import { syncNormsFromOrder } from "./normAgent.js";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import path from "path";

// ======= CLOUDINARY тохиргоо =======
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function uploadToCloudinary(buffer: Buffer, folder: string): Promise<{ secure_url: string; public_id: string }> {
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

// ============ ADMIN AUTH MIDDLEWARE ============
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.headers["x-admin-token"];
  if (token === "authenticated") return next();
  return res.status(401).json({ message: "Нэвтрэх шаардлагатай" });
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ============ ADMIN AUTH API ============
  app.post("/api/admin/login", (req, res) => {
    const { username, password, role } = req.body;
    const cleanRole = (role || "").toString().toUpperCase();

    const users: Record<string, { u: string; p: string }> = {
      ADMIN:      { u: "admin", p: "admin" },
      BOARD:      { u: "admin", p: "admin" },
      PROJECT:    { u: "admin", p: "admin" },
      ENGINEER:   { u: "admin", p: "admin" },
      HR:         { u: "admin", p: "admin" },
      SUPERVISOR: { u: "admin", p: "admin" },
      MECHANIC:   { u: "admin", p: "admin" },
      WAREHOUSE:  { u: "admin", p: "admin" },
      LAB:        { u: "admin", p: "admin" },
    };

    const targetUser = users[cleanRole];
    if (targetUser && username === targetUser.u && password === targetUser.p) {
      return res.json({ success: true, token: "authenticated", role: cleanRole });
    }
    return res.status(401).json({ message: "Нэр эсвэл нууц үг буруу" });
  });

  // ============ WEBSITE API ============
  app.get("/api/projects", async (_req, res) => {
    res.json(await storage.getProjects());
  });
  app.get("/api/stats", async (_req, res) => {
    res.json(await storage.getStats());
  });
  app.get("/api/videos", async (_req, res) => {
    res.json(await storage.getFeaturedVideos());
  });
  app.get("/api/sheet-data", async (_req, res) => {
    try {
      const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQb3rZqDRJ1qaDEmvNHcnhlHjAFAR1XBesPxDFH5d20X8GVU8VAsuijvUcz8asTLpe8YgT65Y9-7yFZ/pub?output=csv";
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      res.setHeader("Content-Type", "text/plain");
      res.send(text);
    } catch (e) {
      res.status(500).json({ error: "Sheet татахад алдаа гарлаа" });
    }
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
  app.get("/api/erp/employees", requireAdmin, async (_req, res) => {
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

  // ============ AI НОРМ АГЕНТ ============
  app.post("/api/erp/sync-norms", requireAdmin, async (req, res) => {
    const { orderNumber } = req.body;
    if (!orderNumber) return res.status(400).json({ error: "Тушаалын дугаар шаардлагатай" });
    const result = await syncNormsFromOrder(orderNumber);
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

  app.post("/api/erp/tasks", async (req, res) => {
    const token = req.headers["x-admin-token"];
    if (token !== "authenticated") return res.status(401).json({ message: "Зөвшөөрөлгүй" });
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
        const { secure_url, public_id } = await uploadToCloudinary(file.buffer, folder);
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

  // Seed data
  seedInitialContent().catch(console.error);
  seedDefaultKpiConfigs().catch(console.error);
  seedWarehouse().catch(console.error);
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
