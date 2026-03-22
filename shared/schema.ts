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
  location: text("location"),
  length: text("length"),
  year: text("year"),
  clientName: text("client_name"),
  contractValue: text("contract_value"),
  progress: integer("progress"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectMetadata = pgTable("project_metadata", {
  publicId: text("public_id").primaryKey(),
  title: text("title"),
  description: text("description"),
  location: text("location"),
  length: text("length"),
  year: text("year"),
  clientName: text("client_name"),
  contractValue: text("contract_value"),
  progress: integer("progress"),
});

export const statsMetadata = pgTable("stats_metadata", {
  publicId: text("public_id").primaryKey(),
  description: text("description"),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  type: text("type").notNull().default("Холбоо барих"), // Холбоо барих | Үнийн санал | Ажлын байр
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
  phone: text("phone"),
  registerNumber: text("register_number"),  // МУ-ын регистрийн дугаар: 2 кирилл үсэг + 8 цифр
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
  workFrontId: integer("work_front_id"),  // Ажиллах хэсэгтэй холбосон
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

// Материалын захиалга (ирж буй ачаа)
export const warehouseOrders = pgTable("warehouse_orders", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").references(() => warehouseItems.id),
  itemName: text("item_name").notNull(),        // Материалын нэр (denormalized)
  quantity: real("quantity").notNull(),          // Захиалсан хэмжээ
  unit: text("unit").notNull(),
  expectedDate: text("expected_date").notNull(), // YYYY-MM-DD
  supplier: text("supplier"),                    // Нийлүүлэгч
  note: text("note"),
  status: text("status").notNull().default("pending"), // pending | received | cancelled
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
  fuelType: text("fuel_type").default("diesel"),    // diesel | petrol
  workFront: text("work_front"),                    // Хаана ажилсан
  engineHours: real("engine_hours"),                // Нийт хөдөлгүүрийн цаг
  notes: text("notes"),
  recordedBy: text("recorded_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===================== ШАТАХУУН ТӨСӨВ =====================
// Компани шатахуун физик нөөцлөхгүй — мөнгөн төсвөөр тооцоолно
export const fuelBudgets = pgTable("fuel_budgets", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),                  // 1–12
  budgetAmount: real("budget_amount").notNull(),       // Батлагдсан төсөв (₮)
  dieselPrice: real("diesel_price").notNull(),         // Дизелийн үнэ (₮/л)
  petrolPrice: real("petrol_price").notNull(),         // Бензины үнэ (₮/л)
  approvedBy: text("approved_by"),
  notes: text("notes"),
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

// ===================== АЖЛЫН ЗУРАГ =====================
// Далд акт болон ажиллах хэсэгт хавсаргах баримт зургууд

export const workPhotos = pgTable("work_photos", {
  id: serial("id").primaryKey(),
  entityType:   text("entity_type").notNull(),  // "work_front" | "hidden_act"
  entityId:     integer("entity_id").notNull(), // work_fronts.id | hidden_work_acts.id
  filename:     text("filename").notNull(),     // Cloudinary secure_url
  cloudinaryId: text("cloudinary_id"),          // Cloudinary public_id (устгахад хэрэглэнэ)
  caption:      text("caption"),               // Тайлбар
  uploadedBy:   text("uploaded_by"),
  photoDate:    text("photo_date"),            // Зураг авсан огноо
  createdAt:    timestamp("created_at").defaultNow(),
});

export const insertWorkPhotoSchema = createInsertSchema(workPhotos).omit({ id: true, createdAt: true });
export type WorkPhoto = typeof workPhotos.$inferSelect;
export type InsertWorkPhoto = z.infer<typeof insertWorkPhotoSchema>;

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
export const insertWarehouseOrderSchema = createInsertSchema(warehouseOrders).omit({ id: true, createdAt: true });
export const insertProductionPlanSchema = createInsertSchema(productionPlans).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMaterialCheckSchema = createInsertSchema(materialChecks).omit({ id: true, createdAt: true });
export const insertLabResultSchema = createInsertSchema(labResults).omit({ id: true, createdAt: true });
export const insertWorkFrontSchema = createInsertSchema(workFronts).omit({ id: true, createdAt: true });
export const insertEquipmentLogSchema = createInsertSchema(equipmentLogs).omit({ id: true, createdAt: true });
export const insertHiddenWorkActSchema = createInsertSchema(hiddenWorkActs).omit({ id: true, createdAt: true });
export const insertFuelBudgetSchema = createInsertSchema(fuelBudgets).omit({ id: true, createdAt: true });

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
export type WarehouseOrder = typeof warehouseOrders.$inferSelect;
export type InsertWarehouseOrder = z.infer<typeof insertWarehouseOrderSchema>;
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
export type FuelBudget = typeof fuelBudgets.$inferSelect;
export type InsertFuelBudget = z.infer<typeof insertFuelBudgetSchema>;

// ============ NORM CONFIGS — засварлах боломжтой БНбД норм ============
export const normConfigs = pgTable("norm_configs", {
  id:           serial("id").primaryKey(),
  category:     text("category").notNull(),       // asphalt | concrete | crushing
  recipeKey:    text("recipe_key").notNull(),      // "АБ-2 (Дунд давхарга)" гэх мэт
  materialName: text("material_name").notNull(),
  unit:         text("unit").notNull(),
  rate:         real("rate").notNull(),            // одоогийн ашиглах утга
  bnbdRate:     real("bnbd_rate").notNull(),       // БНбД-ийн албан ёсны лавлах утга
  bnbdRef:      text("bnbd_ref"),                  // "БНбД 3.01.100" гэх мэт
  updatedBy:    text("updated_by"),
  updatedAt:    timestamp("updated_at").defaultNow(),
});

export const insertNormConfigSchema = createInsertSchema(normConfigs).omit({ id: true, updatedAt: true });
export type NormConfig = typeof normConfigs.$inferSelect;
export type InsertNormConfig = z.infer<typeof insertNormConfigSchema>;

// ============ NORM AUDIT LOG — хэн, хэзээ, юу засав ============
export const normAuditLog = pgTable("norm_audit_log", {
  id:           serial("id").primaryKey(),
  normConfigId: integer("norm_config_id").notNull(),
  recipeKey:    text("recipe_key").notNull(),
  materialName: text("material_name").notNull(),
  oldRate:      real("old_rate").notNull(),
  newRate:      real("new_rate").notNull(),
  changedBy:    text("changed_by").notNull(),
  changedAt:    timestamp("changed_at").defaultNow(),
  note:         text("note"),
});

export type NormAuditEntry = typeof normAuditLog.$inferSelect;

// ============ ТЕХНИКИЙН ЭВДРЭЛ — Breakdown requests ============
export const breakdownRequests = pgTable("breakdown_requests", {
  id:           serial("id").primaryKey(),
  vehicleId:    integer("vehicle_id"),               // холбогдох техник (заавал биш)
  vehicleName:  text("vehicle_name"),                // Кэш: "ЧН-1234 Экскаватор"
  reportedBy:   text("reported_by").notNull(),       // Хэн мэдэгдсэн
  phone:        text("phone"),                       // Мэдэгдсэн хүний утас
  location:     text("location").notNull(),          // Хаана эвдэрсэн
  problem:      text("problem").notNull(),           // Юу болсон тайлбар
  status:       text("status").notNull().default("open"), // open | in_progress | resolved
  assignedTo:   text("assigned_to"),                 // Хэн зассан/очсон
  resolvedNote: text("resolved_note"),               // Хэрхэн шийдвэрлэсэн
  createdAt:    timestamp("created_at").defaultNow(),
  updatedAt:    timestamp("updated_at").defaultNow(),
});

export const insertBreakdownSchema = createInsertSchema(breakdownRequests).omit({ id: true, createdAt: true, updatedAt: true });
export type BreakdownRequest = typeof breakdownRequests.$inferSelect;
export type InsertBreakdown = z.infer<typeof insertBreakdownSchema>;

// ============ ҮЙЛДВЭРИЙН ЗАХИАЛГА ============
export const projectOrders = pgTable("project_orders", {
  id:               serial("id").primaryKey(),
  orderNumber:      text("order_number").notNull(),
  clientName:       text("client_name").notNull(),
  clientPhone:      text("client_phone"),
  clientEmail:      text("client_email"),
  productType:      text("product_type").notNull(),
  quantity:         real("quantity"),
  unit:             text("unit").default("м³"),
  pricePerUnit:     real("price_per_unit"),
  amount:           real("amount"),
  deliveryDate:     text("delivery_date"),
  deliveryLocation: text("delivery_location"),
  status:           text("status").notNull().default("pending"),
  notes:            text("notes"),
  createdAt:        timestamp("created_at").defaultNow(),
});
export const insertProjectOrderSchema = createInsertSchema(projectOrders).omit({ id: true, createdAt: true });
export type ProjectOrder = typeof projectOrders.$inferSelect;
export type InsertProjectOrder = z.infer<typeof insertProjectOrderSchema>;

// ============ ГЭРЭЭНИЙ БҮРТГЭЛ ============
export const projectContracts = pgTable("project_contracts", {
  id:              serial("id").primaryKey(),
  contractNumber:  text("contract_number").notNull(),
  clientName:      text("client_name").notNull(),
  workType:        text("work_type").notNull(),
  amount:          real("amount").notNull(),
  startDate:       text("start_date"),
  endDate:         text("end_date"),
  status:          text("status").notNull().default("active"),
  description:     text("description"),
  createdAt:       timestamp("created_at").defaultNow(),
});
export const insertProjectContractSchema = createInsertSchema(projectContracts).omit({ id: true, createdAt: true });
export type ProjectContract = typeof projectContracts.$inferSelect;
export type InsertProjectContract = z.infer<typeof insertProjectContractSchema>;

// ============ ТӨСЛИЙН PDF БАРИМТУУД ============
export const projectDocuments = pgTable("project_documents", {
  id:          serial("id").primaryKey(),
  title:       text("title").notNull(),
  category:    text("category").notNull().default("general"),
  description: text("description"),
  fileUrl:     text("file_url").notNull(),
  fileSize:    text("file_size"),
  uploadedAt:  timestamp("uploaded_at").defaultNow(),
});
export const insertProjectDocumentSchema = createInsertSchema(projectDocuments).omit({ id: true, uploadedAt: true });
export type ProjectDocument = typeof projectDocuments.$inferSelect;
export type InsertProjectDocument = z.infer<typeof insertProjectDocumentSchema>;

// ===================== ЗӨВЛӨХ / ХОЛБОГДОХ ХҮМҮҮС =====================
export const budgetContacts = pgTable("budget_contacts", {
  id:        serial("id").primaryKey(),
  name:      text("name").notNull(),
  role:      text("role").notNull(),
  phone:     text("phone").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertBudgetContactSchema = createInsertSchema(budgetContacts).omit({ id: true, createdAt: true });
export type BudgetContact = typeof budgetContacts.$inferSelect;
export type InsertBudgetContact = z.infer<typeof insertBudgetContactSchema>;

// ===================== МЭРГЭЖЛИЙН ГЭРЧИЛГЭЭ =====================
export const employeeCertificates = pgTable("employee_certificates", {
  id:           serial("id").primaryKey(),
  employeeId:   integer("employee_id").notNull(),
  certType:     text("cert_type").notNull(),       // driver_a | driver_b | driver_c | welder | electrician | crane | excavator | хабэа | other
  certName:     text("cert_name").notNull(),        // "Жолоочийн үнэмлэх B анги" гэх мэт
  certNumber:   text("cert_number"),               // Дугаар
  issuedBy:     text("issued_by"),                 // Олгосон байгууллага
  issuedDate:   text("issued_date"),               // YYYY-MM-DD
  expiryDate:   text("expiry_date"),               // YYYY-MM-DD
  notes:        text("notes"),
  createdAt:    timestamp("created_at").defaultNow(),
});
export const insertEmployeeCertSchema = createInsertSchema(employeeCertificates).omit({ id: true, createdAt: true });
export type EmployeeCert       = typeof employeeCertificates.$inferSelect;
export type InsertEmployeeCert = z.infer<typeof insertEmployeeCertSchema>;

// ===================== ХАБЭА СУРГАЛТ =====================
export const employeeTrainings = pgTable("employee_trainings", {
  id:            serial("id").primaryKey(),
  employeeId:    integer("employee_id").notNull(),
  trainingType:  text("training_type").notNull(),  // хабэа_ерөнхий | хабэа_тусгай | гэрэл_дохио | анхны_тусламж | гал_унтраах | мэргэшлийн | other
  trainingName:  text("training_name").notNull(),
  completedDate: text("completed_date").notNull(), // YYYY-MM-DD
  nextDueDate:   text("next_due_date"),            // YYYY-MM-DD (дараагийн давтан сургалт)
  conductedBy:   text("conducted_by"),             // Зохион байгуулагч
  hoursCompleted: integer("hours_completed"),      // Цаг
  passed:        boolean("passed").default(true),
  notes:         text("notes"),
  createdAt:     timestamp("created_at").defaultNow(),
});
export const insertEmployeeTrainingSchema = createInsertSchema(employeeTrainings).omit({ id: true, createdAt: true });
export type EmployeeTraining       = typeof employeeTrainings.$inferSelect;
export type InsertEmployeeTraining = z.infer<typeof insertEmployeeTrainingSchema>;

// ===================== ЧАДВАРЫН МАТРИЦ =====================
export const employeeSkills = pgTable("employee_skills", {
  id:          serial("id").primaryKey(),
  employeeId:  integer("employee_id").notNull(),
  vehicleType: text("vehicle_type").notNull(),     // Экскаватор | Бульдозер | Автомашин | Грейдер | Асфальт угсраалт | Кран | Автогрейдер | Өөр
  skillLevel:  text("skill_level").notNull(),      // эхлэгч | дундд | мэргэжлийн
  certifiedBy: text("certified_by"),               // Хэн зөвшөөрсөн
  validFrom:   text("valid_from"),                 // YYYY-MM-DD
  validUntil:  text("valid_until"),                // YYYY-MM-DD
  notes:       text("notes"),
  createdAt:   timestamp("created_at").defaultNow(),
});
export const insertEmployeeSkillSchema = createInsertSchema(employeeSkills).omit({ id: true, createdAt: true });
export type EmployeeSkill       = typeof employeeSkills.$inferSelect;
export type InsertEmployeeSkill = z.infer<typeof insertEmployeeSkillSchema>;

// ===================== ТО ХУВААРЬ (УРЬДЧИЛСАН ЗАСВАР) =====================
export const maintenanceSchedules = pgTable("maintenance_schedules", {
  id:            serial("id").primaryKey(),
  vehicleId:     integer("vehicle_id").notNull(),
  toType:        text("to_type").notNull(),        // TO1 | TO2 | TO3 | seasonal | repair
  scheduledDate: text("scheduled_date").notNull(), // YYYY-MM-DD (төлөвлөсөн)
  completedDate: text("completed_date"),           // YYYY-MM-DD (гүйцэтгэсэн)
  hoursAtService: real("hours_at_service"),        // Хэдэн цагт хийсэн
  description:   text("description"),             // Юу хийсэн
  technicianName: text("technician_name"),         // Хэн хийсэн
  cost:          real("cost"),                     // Зардал (₮)
  status:        text("status").notNull().default("scheduled"), // scheduled | done | overdue | cancelled
  notes:         text("notes"),
  createdAt:     timestamp("created_at").defaultNow(),
});
export const insertMaintenanceScheduleSchema = createInsertSchema(maintenanceSchedules).omit({ id: true, createdAt: true });
export type MaintenanceSchedule       = typeof maintenanceSchedules.$inferSelect;
export type InsertMaintenanceSchedule = z.infer<typeof insertMaintenanceScheduleSchema>;

// ===================== СЭЛБЭГ ХЭРЭГСЭЛ =====================
export const spareParts = pgTable("spare_parts", {
  id:           serial("id").primaryKey(),
  vehicleId:    integer("vehicle_id"),             // null = ерөнхий
  partName:     text("part_name").notNull(),       // Шүүрүүл, Дугуй г.м
  partNumber:   text("part_number"),               // Каталогийн дугаар
  brand:        text("brand"),                     // Брэнд
  unit:         text("unit").notNull().default("ш"), // ш | л | кг | м
  quantity:     real("quantity").notNull().default(0),
  minStock:     real("min_stock").default(0),      // Доод хэмжээ
  location:     text("location"),                  // Хадгалах газар
  unitPrice:    real("unit_price"),                // Нэгжийн үнэ ₮
  notes:        text("notes"),
  createdAt:    timestamp("created_at").defaultNow(),
});
export const insertSparePartSchema = createInsertSchema(spareParts).omit({ id: true, createdAt: true });
export type SparePart       = typeof spareParts.$inferSelect;
export type InsertSparePart = z.infer<typeof insertSparePartSchema>;

// ===================== ТЕХНИКИЙН БАРИМТ БИЧГИЙН ХУГАЦАА =====================
export const vehicleDocuments = pgTable("vehicle_documents", {
  id:          serial("id").primaryKey(),
  vehicleId:   integer("vehicle_id").notNull(),
  docType:     text("doc_type").notNull(),         // insurance | inspection | license | eco_check | other
  docName:     text("doc_name").notNull(),         // "ОСАГО даатгал", "Улсын техникийн үзлэг" г.м
  docNumber:   text("doc_number"),                 // Дугаар
  issuedDate:  text("issued_date"),                // YYYY-MM-DD
  expiryDate:  text("expiry_date").notNull(),      // YYYY-MM-DD
  issuedBy:    text("issued_by"),
  notes:       text("notes"),
  createdAt:   timestamp("created_at").defaultNow(),
});
export const insertVehicleDocSchema = createInsertSchema(vehicleDocuments).omit({ id: true, createdAt: true });
export type VehicleDocument       = typeof vehicleDocuments.$inferSelect;
export type InsertVehicleDocument = z.infer<typeof insertVehicleDocSchema>;

// ===================== ТЕНДЕРТ ЯВУУЛСАН ТӨСЛҮҮД =====================
export const tenderProjects = pgTable("tender_projects", {
  id:          serial("id").primaryKey(),
  title:       text("title").notNull(),
  description: text("description").default(""),
  category:    text("category").default("Авто зам"),
  location:    text("location").default(""),
  year:        text("year").default(""),
  progress:    integer("progress").default(0),
  createdAt:   timestamp("created_at").defaultNow(),
});
export const insertTenderProjectSchema = createInsertSchema(tenderProjects).omit({ id: true, createdAt: true });
export type TenderProject    = typeof tenderProjects.$inferSelect;
export type InsertTenderProject = z.infer<typeof insertTenderProjectSchema>;

// ===================== НЭВТРЭХ НЭВТРЭЛТИЙН ТОХИРГОО =====================
export const roleCredentials = pgTable("role_credentials", {
  id:        serial("id").primaryKey(),
  role:      text("role").notNull().unique(),
  username:  text("username").notNull(),
  password:  text("password").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertRoleCredentialSchema = createInsertSchema(roleCredentials).omit({ id: true, updatedAt: true });
export type RoleCredential       = typeof roleCredentials.$inferSelect;
export type InsertRoleCredential = z.infer<typeof insertRoleCredentialSchema>;

// ===================== ҮЙЛДЛИЙН БҮРТГЭЛ (AUDIT LOG) =====================
export const activityLogs = pgTable("activity_logs", {
  id:        serial("id").primaryKey(),
  role:      text("role").notNull(),
  username:  text("username").notNull(),
  action:    text("action").notNull(),
  details:   text("details"),
  ip:        text("ip"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type ActivityLog = typeof activityLogs.$inferSelect;

// ===================== МЭДЭГДЛИЙН СИСТЕМ =====================
export const notifications = pgTable("notifications", {
  id:         serial("id").primaryKey(),
  toRole:     text("to_role").notNull(),          // SALES | SUPERVISOR | ADMIN | PROJECT
  title:      text("title").notNull(),
  body:       text("body").notNull(),
  sourceType: text("source_type").notNull(),       // project_order | contract | request
  sourceId:   integer("source_id"),
  isRead:     boolean("is_read").default(false),
  createdAt:  timestamp("created_at").defaultNow(),
});
export type Notification = typeof notifications.$inferSelect;

// ===================== БОРЛУУЛАЛТЫН ЗАХИАЛГА =====================
export const salesOrders = pgTable("sales_orders", {
  id:            serial("id").primaryKey(),
  customerName:  text("customer_name").notNull(),
  product:       text("product").notNull(),       // concrete_m200/m300/m400 | asphalt | crushed_stone
  quantity:      real("quantity").notNull(),       // м³ эсвэл тн
  unit:          text("unit").notNull().default("м³"),
  pricePerUnit:  real("price_per_unit"),           // тохирсон үнэ (борлуулалтын ажилтан баталгаажуулсан)
  costPerUnit:   real("cost_per_unit"),            // тооцоолсон өртөг
  deliveryDate:  text("delivery_date"),
  location:      text("location"),
  status:        text("status").default("pending"), // pending|confirmed|in_production|delivered|cancelled
  notes:         text("notes"),
  confirmedBy:   text("confirmed_by"),
  createdAt:     timestamp("created_at").defaultNow(),
});
export const insertSalesOrderSchema = createInsertSchema(salesOrders).omit({ id: true, createdAt: true });
export type SalesOrder       = typeof salesOrders.$inferSelect;
export type InsertSalesOrder = z.infer<typeof insertSalesOrderSchema>;

// ===================== ҮЙЛДВЭРИЙН ӨРТГИЙН ТОХИРГОО =====================
export const productionCostConfig = pgTable("production_cost_config", {
  id:                  serial("id").primaryKey(),
  plant:               text("plant").notNull().unique(), // asphalt | concrete | crushing
  dailyCapacity:       real("daily_capacity").notNull(),  // м³/хоног эсвэл тн/хоног
  targetPct:           real("target_pct").default(30),    // %
  workerCount:         integer("worker_count").default(20),
  minSalary:           real("min_salary").default(3000000),
  powerCostPerUnit:    real("power_cost_per_unit").default(0),
  equipmentCostPerUnit: real("equipment_cost_per_unit").default(0),
  updatedAt:           timestamp("updated_at").defaultNow(),
});
export const insertProductionCostConfigSchema = createInsertSchema(productionCostConfig).omit({ id: true, updatedAt: true });
export type ProductionCostConfig       = typeof productionCostConfig.$inferSelect;
export type InsertProductionCostConfig = z.infer<typeof insertProductionCostConfigSchema>;

export type ProjectResponse = Project;
export type ContactResponse = Contact;
export type ContentResponse = Content;
export type SuccessGalleryResponse = SuccessGallery;
export type SubscriptionResponse = Subscription;
