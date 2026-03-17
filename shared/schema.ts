import { pgTable, text, serial, timestamp, integer, real, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ===================== EXISTING TABLES =====================

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const content = pgTable("content", {
  id: serial("id").primaryKey(),
  section: text("section").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  ctaText: text("cta_text"),
  secondaryCtaText: text("secondary_cta_text"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const successGallery = pgTable("success_gallery", {
  id: serial("id").primaryKey(),
  imageUrl: text("image_url").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===================== ERP TABLES =====================

// Ажилтнууд
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  department: text("department").notNull(), // office | field | plant
  role: text("role").notNull(),
  salaryBase: real("salary_base").notNull().default(0),
  qrCode: text("qr_code").unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Төслүүд (ERP хэрэглүүр)
export const erpProjects = pgTable("erp_projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Үйлдвэрүүд
export const plants = pgTable("plants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Өдрийн тайлан (хуучин)
export const dailyReports = pgTable("daily_reports", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  projectId: integer("project_id"),
  plantId: integer("plant_id"),
  date: date("date").notNull(),
  workType: text("work_type").notNull(),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  notes: text("notes"),
  bonus: real("bonus").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Үйлдвэрийн бүтээгдэхүүн лог
export const productionLogs = pgTable("production_logs", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").notNull(),
  date: date("date").notNull(),
  outputQuantity: real("output_quantity").notNull(),
  unit: text("unit").notNull(),
  shift: text("shift").default("өдөр"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Цагийн бүртгэл + ХАБЭА
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  date: date("date").notNull(),
  checkIn: text("check_in"),
  checkOut: text("check_out"),
  safetyConfirmed: boolean("safety_confirmed").default(false),
  safetyConfirmedAt: timestamp("safety_confirmed_at"),
  lateMinutes: integer("late_minutes").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// KPI Тохиргоо
export const kpiConfigs = pgTable("kpi_configs", {
  id: serial("id").primaryKey(),
  workType: text("work_type").notNull().unique(),
  unit: text("unit").notNull(),
  dailyNorm: real("daily_norm").notNull(),
  rewardPerUnit: real("reward_per_unit").notNull().default(0),
  source: text("source"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ===================== ШИНЭ ХҮСНЭГТҮҮД =====================

// Ажлын даалгавар (Ахлахаас ажилтанд)
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  date: text("date").notNull(),           // YYYY-MM-DD
  location: text("location").notNull(),   // Газрын нэр
  workType: text("work_type").notNull(),  // Ажлын төрөл
  equipment: text("equipment"),           // Ашиглах техник
  notes: text("notes"),                   // Нэмэлт зааварчлага
  status: text("status").default("pending"), // pending | accepted | completed
  assignedBy: text("assigned_by"),        // Ахлахын нэр
  createdAt: timestamp("created_at").defaultNow(),
});

// Ажлын тайлан (Ажилтнаас, нэг өдөрт олон боломжтой)
export const workReports = pgTable("work_reports", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  taskId: integer("task_id"),             // Аль даалгавартай холбоотой
  date: text("date").notNull(),
  description: text("description").notNull(),
  quantity: text("quantity"),             // Хийсэн хэмжээ
  unit: text("unit"),                     // Нэгж
  issues: text("issues"),                 // Бэрхшээл
  createdAt: timestamp("created_at").defaultNow(),
});

// Техник (Машин механизм)
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  plateNumber: text("plate_number").notNull().unique(), // Улсын дугаар
  name: text("name").notNull(),              // Экскаватор CAT 320
  type: text("type").notNull(),              // Экскаватор | Бульдозер | Автомашин | Кран | Өөр
  capacity: text("capacity"),                // Хүчин чадал (жишээ: 20 тн, 320 к.с.)
  lastInspectionDate: text("last_inspection_date"), // Улсын үзлэгт орсон огноо YYYY-MM-DD
  nextInspectionDate: text("next_inspection_date"), // Дараагийн үзлэгийн огноо
  isReady: boolean("is_ready").default(true),       // Ажилд бэлэн эсэх
  readyNote: text("ready_note"),             // Бэлэн бус бол шалтгаан
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Техникийн өмнөх үзлэг
export const vehicleInspections = pgTable("vehicle_inspections", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull(),
  employeeName: text("employee_name").notNull(), // Хэн үзлэг хийсэн
  date: text("date").notNull(),
  checks: text("checks").notNull(),       // JSON: [{item, ok, note}]
  passed: boolean("passed").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===================== АГУУЛАХ (WAREHOUSE) =====================

// Агуулахын нөөц
export const warehouseItems = pgTable("warehouse_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),                   // Цемент, Битум, Хайрга 0-2мм г.м
  category: text("category").notNull(),           // cement | bitumen | stone | sand | mineral | other
  unit: text("unit").notNull(),                   // тн | м³ | ш
  plant: text("plant").notNull(),                 // asphalt | concrete | crushing | general
  currentStock: real("current_stock").default(0), // Одоогийн нөөц
  minStock: real("min_stock").default(0),         // Хоногийн хэрэгцээ (норм)
  criticalStock: real("critical_stock").default(0), // Критик (2 хоногийн)
  normBasis: text("norm_basis"),                  // Норм тооцооны үндэс
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Нөөцийн хөдөлгөөний лог
export const warehouseLogs = pgTable("warehouse_logs", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull(),
  planId: integer("plan_id"),                     // Аль үйлдвэрлэлийн планаас татсан
  date: text("date").notNull(),
  quantity: real("quantity").notNull(),           // Эерэг = орсон, сөрөг = гарсан
  type: text("type").notNull(),                   // in | out | adjust | plan_draw
  notes: text("notes"),
  recordedBy: text("recorded_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Өдрийн үйлдвэрлэлийн төлөвлөгөө
export const productionPlans = pgTable("production_plans", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  plant: text("plant").notNull(),          // asphalt | concrete | crushing
  targetQty: real("target_qty").notNull(), // Хэдэн нэгж гаргах вэ
  unit: text("unit").notNull(),            // м³ | тн
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Материалын бэлэн байдлын шалгалт (өдөр бүр)
export const materialChecks = pgTable("material_checks", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),
  materialName: text("material_name").notNull(),
  requiredQty: real("required_qty").notNull(),  // Норм тооцоолсон хэмжээ
  warehouseQty: real("warehouse_qty").default(0), // Агуулахад байгаа
  fieldQty: real("field_qty").default(0),          // Талбай дээр байгаа
  unit: text("unit").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===================== ЛАБ ТУРШИЛТ / ЧАНАРЫН ХЯНАЛТ =====================

export const labResults = pgTable("lab_results", {
  id: serial("id").primaryKey(),
  testType: text("test_type").notNull(), // marshall | compressive | density | sieve | atterberg
  location: text("location"),           // "км 45+200" etc.
  sampleId: text("sample_id"),          // Дэвтрийн дугаар
  date: text("date").notNull(),
  material: text("material"),           // Тестэлсэн материал
  value: real("value"),                 // Гол үзүүлэлт
  value2: real("value2"),               // Нэмэлт (Marshall stability, etc.)
  unit: text("unit"),                   // МПа, %, т/м³
  standard: real("standard"),           // БНбД шаардах min/max утга
  status: text("status").notNull().default("pending"), // pass | fail | pending
  notes: text("notes"),
  recordedBy: text("recorded_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===================== АЖЛЫН ФРОНТ / КМ ПИКЕТ =====================

export const workFronts = pgTable("work_fronts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),                      // "2-р фронт"
  chainageStart: real("chainage_start"),             // км эхлэл
  chainageEnd: real("chainage_end"),                 // км төгсгөл
  activity: text("activity").notNull(),              // earthwork | subbase | base | asphalt | concrete | structure | drainage
  status: text("status").notNull().default("active"), // active | paused | completed
  supervisor: text("supervisor"),
  crewSize: integer("crew_size").default(0),
  date: text("date").notNull(),
  progress: real("progress").default(0),            // % дуусгалт
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===================== ТОНОГ ТӨХӨӨРӨМЖИЙН ЦАГ / ШАТАХУУН =====================

export const equipmentLogs = pgTable("equipment_logs", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull(),
  vehicleName: text("vehicle_name"),                // Cache-д хадгалах
  date: text("date").notNull(),
  hoursWorked: real("hours_worked").default(0),     // Ажилсан цаг
  fuelUsed: real("fuel_used").default(0),           // Шатахуун литр
  workFront: text("work_front"),                    // Хаана ажилсан
  engineHours: real("engine_hours"),                // Нийт хөдөлгүүрийн цаг
  notes: text("notes"),
  recordedBy: text("recorded_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===================== ДАЛД АЖЛЫН АКТ =====================

export const hiddenWorkActs = pgTable("hidden_work_acts", {
  id: serial("id").primaryKey(),
  actNumber: text("act_number").notNull(),           // Актын дугаар
  date: text("date").notNull(),
  location: text("location").notNull(),              // км пикет
  workType: text("work_type").notNull(),             // Ажлын төрөл
  description: text("description"),                  // Тайлбар
  inspector: text("inspector"),                      // Хяналт тавигч
  contractor: text("contractor"),                    // Гүйцэтгэгч
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===================== INSERT SCHEMAS =====================

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true, createdAt: true });
export const insertContentSchema = createInsertSchema(content).omit({ id: true, updatedAt: true });
export const insertSuccessGallerySchema = createInsertSchema(successGallery).omit({ id: true, createdAt: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true });

export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, createdAt: true });
export const insertErpProjectSchema = createInsertSchema(erpProjects).omit({ id: true, createdAt: true });
export const insertPlantSchema = createInsertSchema(plants).omit({ id: true, createdAt: true });
export const insertDailyReportSchema = createInsertSchema(dailyReports).omit({ id: true, createdAt: true, bonus: true });
export const insertProductionLogSchema = createInsertSchema(productionLogs).omit({ id: true, createdAt: true });
export const insertKpiConfigSchema = createInsertSchema(kpiConfigs).omit({ id: true, updatedAt: true });
export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true, createdAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true });
export const insertWorkReportSchema = createInsertSchema(workReports).omit({ id: true, createdAt: true });
export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, createdAt: true });
export const insertVehicleInspectionSchema = createInsertSchema(vehicleInspections).omit({ id: true, createdAt: true });
export const insertWarehouseItemSchema = createInsertSchema(warehouseItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWarehouseLogSchema = createInsertSchema(warehouseLogs).omit({ id: true, createdAt: true });
export const insertProductionPlanSchema = createInsertSchema(productionPlans).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMaterialCheckSchema = createInsertSchema(materialChecks).omit({ id: true, createdAt: true });
export const insertLabResultSchema = createInsertSchema(labResults).omit({ id: true, createdAt: true });
export const insertWorkFrontSchema = createInsertSchema(workFronts).omit({ id: true, createdAt: true });
export const insertEquipmentLogSchema = createInsertSchema(equipmentLogs).omit({ id: true, createdAt: true });
export const insertHiddenWorkActSchema = createInsertSchema(hiddenWorkActs).omit({ id: true, createdAt: true });

// ===================== TYPES =====================

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Content = typeof content.$inferSelect;
export type InsertContent = z.infer<typeof insertContentSchema>;
export type SuccessGallery = typeof successGallery.$inferSelect;
export type InsertSuccessGallery = z.infer<typeof insertSuccessGallerySchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type ErpProject = typeof erpProjects.$inferSelect;
export type InsertErpProject = z.infer<typeof insertErpProjectSchema>;
export type Plant = typeof plants.$inferSelect;
export type InsertPlant = z.infer<typeof insertPlantSchema>;
export type DailyReport = typeof dailyReports.$inferSelect;
export type InsertDailyReport = z.infer<typeof insertDailyReportSchema>;
export type ProductionLog = typeof productionLogs.$inferSelect;
export type InsertProductionLog = z.infer<typeof insertProductionLogSchema>;
export type KpiConfig = typeof kpiConfigs.$inferSelect;
export type InsertKpiConfig = z.infer<typeof insertKpiConfigSchema>;
export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type WorkReport = typeof workReports.$inferSelect;
export type InsertWorkReport = z.infer<typeof insertWorkReportSchema>;
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type VehicleInspection = typeof vehicleInspections.$inferSelect;
export type InsertVehicleInspection = z.infer<typeof insertVehicleInspectionSchema>;
export type WarehouseItem = typeof warehouseItems.$inferSelect;
export type InsertWarehouseItem = z.infer<typeof insertWarehouseItemSchema>;
export type WarehouseLog = typeof warehouseLogs.$inferSelect;
export type InsertWarehouseLog = z.infer<typeof insertWarehouseLogSchema>;
export type ProductionPlan = typeof productionPlans.$inferSelect;
export type InsertProductionPlan = z.infer<typeof insertProductionPlanSchema>;
export type MaterialCheck = typeof materialChecks.$inferSelect;
export type InsertMaterialCheck = z.infer<typeof insertMaterialCheckSchema>;
export type LabResult = typeof labResults.$inferSelect;
export type InsertLabResult = z.infer<typeof insertLabResultSchema>;
export type WorkFront = typeof workFronts.$inferSelect;
export type InsertWorkFront = z.infer<typeof insertWorkFrontSchema>;
export type EquipmentLog = typeof equipmentLogs.$inferSelect;
export type InsertEquipmentLog = z.infer<typeof insertEquipmentLogSchema>;
export type HiddenWorkAct = typeof hiddenWorkActs.$inferSelect;
export type InsertHiddenWorkAct = z.infer<typeof insertHiddenWorkActSchema>;

export type ProjectResponse = Project;
export type ContactResponse = Contact;
export type ContentResponse = Content;
export type SuccessGalleryResponse = SuccessGallery;
export type SubscriptionResponse = Subscription;
