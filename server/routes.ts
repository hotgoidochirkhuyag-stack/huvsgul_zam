import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import express from "express";
import { storage } from "./storage.js";
import { db } from "./db.js";
import * as schema from "../shared/schema.js";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { calculateEmployeeKpi, calculateTeamKpi, seedDefaultKpiConfigs } from "./kpiEngine.js";
import { syncNormsFromOrder } from "./normAgent.js";

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
    const { employeeId, date, location, workType, equipment, notes, assignedBy } = req.body;
    if (!employeeId || !date || !location || !workType)
      return res.status(400).json({ message: "Заавал талбарууд дутуу байна" });
    const [task] = await db.insert(schema.tasks).values({
      employeeId, date, location, workType, equipment, notes, assignedBy, status: "pending",
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

  // Seed data
  seedInitialContent().catch(console.error);
  seedDefaultKpiConfigs().catch(console.error);
  return httpServer;
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
