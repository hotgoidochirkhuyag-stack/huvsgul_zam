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
  profileToken: text("profile_token").unique(), // нууц token — профайлын URL-д ашиглана
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
  hasAccident: boolean("has_accident").default(false), // Осол/зөрчил гарсан уу?
  createdAt: timestamp("created_at").defaultNow(),
});

// Техник (Машин механизм)
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  plateNumber: text("plate_number").notNull().unique(), // Улсын дугаар / Дотоод дугаар (BUT-001 гэх мэт)
  name: text("name").notNull(),              // Хацарт бутлуур №1 / Excavator CAT 320
  type: text("type").notNull(),              // Экскаватор | Бульдозер | Автомашин | Кран | Өөр
  equipmentType: text("equipment_type").default("vehicle"), // vehicle | excavator | bulldozer | jaw_crusher | conveyor | screen | motor
  capacity: text("capacity"),                // Хүчин чадал (жишээ: 20 тн, 320 к.с.)
  location: text("location"),               // Байршил (Бутлуурын үйлдвэр, Талбай гэх мэт)
  lastInspectionDate: text("last_inspection_date"), // Улсын үзлэгт орсон огноо YYYY-MM-DD
  nextInspectionDate: text("next_inspection_date"), // Дараагийн үзлэгийн огноо
  isReady: boolean("is_ready").default(true),       // Ажилд бэлэн эсэх
  readyNote: text("ready_note"),             // Бэлэн бус бол шалтгаан
  hourlyRate: real("hourly_rate").default(0), // Цагийн тариф ₮/цаг
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Техникийн өмнөх/дараах үзлэг
export const vehicleInspections = pgTable("vehicle_inspections", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull(),
  employeeName: text("employee_name").notNull(), // Хэн үзлэг хийсэн
  date: text("date").notNull(),
  inspectionType: text("inspection_type").default("pre"), // pre (өглөө) | post (орой)
  checks: text("checks").notNull(),       // JSON: [{item, ok, warn, note}]
  passed: boolean("passed").default(true),
  engineHoursStart: real("engine_hours_start"),  // Хөдөлгүүрийн цаг эхлэх (pre)
  engineHoursEnd: real("engine_hours_end"),      // Хөдөлгүүрийн цаг дуусах (post)
  fuelLevelStart: real("fuel_level_start"),      // Шатахуун эхлэх (литр)
  fuelLevelEnd: real("fuel_level_end"),          // Шатахуун дуусах (литр)
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
  unitCost: real("unit_cost").default(0),         // Нэгжийн өртөг ₮
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
  autoGenerated: boolean("auto_generated").default(false), // Автоматаар үүссэн эсэх
  triggeredBySalesOrderId: integer("triggered_by_sales_order_id"), // Ямар захиалгаас үүссэн
  priority: text("priority").default("normal"), // low | normal | critical
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
  salesOrderId: integer("sales_order_id"),  // Аль захиалгаас автоматаар үүссэн
  autoGenerated: boolean("auto_generated").default(false),
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

// ===================== БЕТОН ЗУУРМАГИЙН ҮЙЛДВЭРИЙН ERP =====================

// 1. Холимогийн рецепт (Mix Design)
export const concreteMixDesigns = pgTable("concrete_mix_designs", {
  id: serial("id").primaryKey(),
  grade: text("grade").notNull(),                       // B15 | B20 | B25 | B30 | B35
  cementKgPerM3: real("cement_kg_per_m3").notNull(),    // Цемент кг/м³
  waterLPerM3: real("water_l_per_m3").notNull(),        // Ус л/м³
  sandKgPerM3: real("sand_kg_per_m3").notNull(),        // Элс кг/м³
  gravel1KgPerM3: real("gravel1_kg_per_m3").notNull(),  // 5-10мм хайрга кг/м³
  gravel2KgPerM3: real("gravel2_kg_per_m3").notNull(),  // 10-20мм хайрга кг/м³
  admixtureKgPerM3: real("admixture_kg_per_m3").default(0), // Нэмэлт бодис кг/м³
  wcRatio: real("wc_ratio"),                            // В/Ц харьцаа
  targetSlump: integer("target_slump"),                 // Зорилтот налуулалт мм
  targetStrength: real("target_strength"),              // Зорилтот бат бөх МПа
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 2. Захиалга (Client Order)
export const concreteOrders = pgTable("concrete_orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull(),          // КЗ-2025-001
  clientName: text("client_name").notNull(),
  projectName: text("project_name"),
  grade: text("grade").notNull(),                       // B15 | B20 | B25 | B30
  mixDesignId: integer("mix_design_id"),
  orderedQty: real("ordered_qty").notNull(),             // Захиалсан м³
  deliveredQty: real("delivered_qty").default(0),       // Хүргэсэн м³
  deliveryAddress: text("delivery_address"),
  orderDate: text("order_date").notNull(),
  deliveryDate: text("delivery_date"),
  unitPrice: real("unit_price").default(0),             // ₮/м³
  status: text("status").notNull().default("pending"),  // pending | producing | delivered | cancelled
  notes: text("notes"),
  salesOrderId: integer("sales_order_id"),              // Борлуулалтын захиалгатай холбоос
  createdAt: timestamp("created_at").defaultNow(),
});

// 3. Зуурах бүртгэл (Batch Record) — нэг ачаа = 1.5м³
export const concreteBatches = pgTable("concrete_batches", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id"),                         // Аль захиалгад
  batchNumber: integer("batch_number").notNull(),        // Зуурах дугаар
  grade: text("grade").notNull(),
  mixDesignId: integer("mix_design_id"),
  plannedQty: real("planned_qty").notNull(),             // Төлөвлөсөн м³
  actualQty: real("actual_qty"),                        // Бодит гарц м³
  cementActual: real("cement_actual"),                  // Бодит цемент кг
  sandActual: real("sand_actual"),                      // Бодит элс кг
  gravel1Actual: real("gravel1_actual"),                // Бодит хайрга 1 кг
  gravel2Actual: real("gravel2_actual"),                // Бодит хайрга 2 кг
  waterActual: real("water_actual"),                    // Бодит ус л
  admixtureActual: real("admixture_actual"),            // Бодит нэмэлт кг
  slumpMm: integer("slump_mm"),                         // Налуулалт мм
  airTemp: real("air_temp"),                            // Агаарын температур °C
  operator: text("operator").notNull(),
  truckPlate: text("truck_plate"),                      // Миксер машины дугаар
  date: text("date").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  warehouseDeducted: boolean("warehouse_deducted").default(false), // Агуулахаас хасагдсан эсэх
  status: text("status").notNull().default("produced"), // produced | delivered | rejected
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertConcreteMixDesignSchema = createInsertSchema(concreteMixDesigns).omit({ id: true, createdAt: true });
export const insertConcreteOrderSchema = createInsertSchema(concreteOrders).omit({ id: true, createdAt: true });
export const insertConcreteBatchSchema = createInsertSchema(concreteBatches).omit({ id: true, createdAt: true });

export type ConcreteMixDesign = typeof concreteMixDesigns.$inferSelect;
export type InsertConcreteMixDesign = z.infer<typeof insertConcreteMixDesignSchema>;
export type ConcreteOrder = typeof concreteOrders.$inferSelect;
export type InsertConcreteOrder = z.infer<typeof insertConcreteOrderSchema>;
export type ConcreteBatch = typeof concreteBatches.$inferSelect;
export type InsertConcreteBatch = z.infer<typeof insertConcreteBatchSchema>;

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
  vehicleType: text("vehicle_type").notNull(),
  skillLevel:  text("skill_level").notNull(),
  certifiedBy: text("certified_by"),
  validFrom:   text("valid_from"),
  validUntil:  text("valid_until"),
  notes:       text("notes"),
  createdAt:   timestamp("created_at").defaultNow(),
});
export const insertEmployeeSkillSchema = createInsertSchema(employeeSkills).omit({ id: true, createdAt: true });
export type EmployeeSkill       = typeof employeeSkills.$inferSelect;
export type InsertEmployeeSkill = z.infer<typeof insertEmployeeSkillSchema>;

// ===================== УР ЧАДВАРЫН САН (Skills catalog) =====================
export const skills = pgTable("skills", {
  id:        serial("id").primaryKey(),
  category:  text("category").notNull(),   // Зам барилга | Гүүр барилга | г.м.
  name:      text("name").notNull(),        // Чадварын нэр
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertSkillSchema = createInsertSchema(skills).omit({ id: true, createdAt: true });
export type Skill       = typeof skills.$inferSelect;
export type InsertSkill = z.infer<typeof insertSkillSchema>;

// ===================== УР ЧАДВАРЫН ҮНЭЛГЭЭ (Skill assessments) =====================
export const skillAssessments = pgTable("skill_assessments", {
  id:               serial("id").primaryKey(),
  employeeId:       integer("employee_id").notNull(),
  skillId:          integer("skill_id").notNull(),
  level:            integer("level").notNull(),           // 1=Шинэ 2=Туршлагатай 3=Мэргэшсэн 4=Мастер
  commissionNumber: text("commission_number").notNull(),  // Комиссын шийдвэрийн дугаар
  updatedAt:        timestamp("updated_at").defaultNow(),
});
export const insertSkillAssessmentSchema = createInsertSchema(skillAssessments).omit({ id: true, updatedAt: true });
export type SkillAssessment       = typeof skillAssessments.$inferSelect;
export type InsertSkillAssessment = z.infer<typeof insertSkillAssessmentSchema>;

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
  fuelUsed:      real("fuel_used"),               // Шатахуун зарцуулалт (л)
  fuelType:      text("fuel_type").default("diesel"), // diesel | petrol
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
  id:               serial("id").primaryKey(),
  title:            text("title").notNull(),
  description:      text("description").default(""),
  category:         text("category").default("Авто зам"),
  location:         text("location").default(""),
  year:             text("year").default(""),
  progress:         integer("progress").default(0),
  deadline:         text("deadline").default(""),
  requiredProducts: text("required_products").default(""),
  createdAt:        timestamp("created_at").defaultNow(),
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

// ===================== ХАРИЛЦАГЧ =====================
export const customers = pgTable("customers", {
  id:           serial("id").primaryKey(),
  name:         text("name").notNull(),
  phone:        text("phone"),
  email:        text("email"),
  address:      text("address"),
  company:      text("company"),
  contactPerson: text("contact_person"),
  notes:        text("notes"),
  createdAt:    timestamp("created_at").defaultNow(),
});
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export type Customer       = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

// ===================== БОРЛУУЛАЛТЫН ЗАХИАЛГА =====================
export const salesOrders = pgTable("sales_orders", {
  id:                    serial("id").primaryKey(),
  customerName:          text("customer_name").notNull(),
  product:               text("product").notNull(),       // concrete_m200/m300/m400 | asphalt | crushed_stone
  quantity:              real("quantity").notNull(),       // м³ эсвэл тн
  unit:                  text("unit").notNull().default("м³"),
  pricePerUnit:          real("price_per_unit"),           // тохирсон үнэ
  costPerUnit:           real("cost_per_unit"),            // тооцоолсон өртөг
  deliveryDate:          text("delivery_date"),
  location:              text("location"),
  status:                text("status").default("pending"), // pending|confirmed|in_production|delivered|cancelled
  notes:                 text("notes"),
  confirmedBy:           text("confirmed_by"),
  warehouseDeducted:     boolean("warehouse_deducted").default(false),
  warehouseDeductedAt:   timestamp("warehouse_deducted_at"),
  linkedProposalId:      integer("linked_proposal_id"),    // Холбосон үнийн санал
  createdAt:             timestamp("created_at").defaultNow(),
});
export const insertSalesOrderSchema = createInsertSchema(salesOrders).omit({ id: true, createdAt: true });
export type SalesOrder       = typeof salesOrders.$inferSelect;
export type InsertSalesOrder = z.infer<typeof insertSalesOrderSchema>;

// ========= АГУУЛАХЫН ХАСАЛТЫН ЛОГ =========
export const warehouseDeductionLogs = pgTable("warehouse_deduction_logs", {
  id:               serial("id").primaryKey(),
  salesOrderId:     integer("sales_order_id").notNull().references(() => salesOrders.id, { onDelete: "cascade" }),
  warehouseItemId:  integer("warehouse_item_id").notNull().references(() => warehouseItems.id),
  itemName:         text("item_name").notNull(),
  amountDeducted:   real("amount_deducted").notNull(),
  unit:             text("unit").notNull(),
  wasSufficient:    boolean("was_sufficient").notNull().default(true),
  deductedAt:       timestamp("deducted_at").defaultNow(),
});
export type WarehouseDeductionLog = typeof warehouseDeductionLogs.$inferSelect;

// ===================== ЛАБОРАТОРИЙН ТУРШИЛТЫН ХҮСЭЛТ =====================
export const labTestRequests = pgTable("lab_test_requests", {
  id:            serial("id").primaryKey(),
  salesOrderId:  integer("sales_order_id").notNull().references(() => salesOrders.id, { onDelete: "cascade" }),
  customerName:  text("customer_name").notNull(),
  product:       text("product").notNull(),
  grade:         text("grade"),
  quantity:      real("quantity").notNull(),
  unit:          text("unit").notNull().default("м³"),
  status:        text("status").notNull().default("pending"), // pending | in_testing | passed | failed
  slumpMm:       integer("slump_mm"),
  densityKgM3:   real("density_kg_m3"),
  strength7d:    real("strength_7d"),
  strength28d:   real("strength_28d"),
  airContent:    real("air_content"),
  tempC:         real("temp_c"),
  testedBy:      text("tested_by"),
  testedAt:      timestamp("tested_at"),
  pass:          boolean("pass"),
  notes:         text("notes"),
  createdAt:     timestamp("created_at").defaultNow(),
});
export type LabTestRequest = typeof labTestRequests.$inferSelect;

// ===================== ТОНОГ ТӨХӨӨРӨМЖИЙН ЗАХИАЛГЫН ХУВААРЬ =====================
export const equipmentAssignments = pgTable("equipment_assignments", {
  id:              serial("id").primaryKey(),
  vehicleId:       integer("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  salesOrderId:    integer("sales_order_id").references(() => salesOrders.id, { onDelete: "set null" }),
  assignedDate:    date("assigned_date").notNull().defaultNow(),
  endDate:         date("end_date"),
  status:          text("status").notNull().default("active"), // active | completed | cancelled
  taskDescription: text("task_description"),
  assignedBy:      text("assigned_by"),
  hoursUsed:       real("hours_used").default(0), // Ажилласан цаг
  notes:           text("notes"),
  createdAt:       timestamp("created_at").defaultNow(),
});
export type EquipmentAssignment = typeof equipmentAssignments.$inferSelect;

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

// ===================== ТОХИРЛЫН ГЭРЧИЛГЭЭ / CERTIFICATES & COMPLIANCE =====================

export const complianceCertificates = pgTable("compliance_certificates", {
  id:             serial("id").primaryKey(),
  certNumber:     text("cert_number").notNull(),          // Гэрчилгээний дугаар
  certType:       text("cert_type").notNull(),            // iso9001 | iso14001 | gost | local | other
  issuedBy:       text("issued_by").notNull(),            // Олгосон байгууллага
  issuedDate:     text("issued_date").notNull(),          // Олгосон огноо
  expiryDate:     text("expiry_date").notNull(),          // Дуусах огноо
  scope:          text("scope"),                          // Хамрах хүрээ (product types)
  productTypes:   text("product_types").array(),          // ["concrete","asphalt","crushing"]
  standardRef:    text("standard_ref"),                   // МNS ISO 9001:2015 etc
  filePath:       text("file_path"),                      // Хадгалсан файл
  reminderSent:   boolean("reminder_sent").default(false),
  notes:          text("notes"),
  isActive:       boolean("is_active").default(true),
  createdAt:      timestamp("created_at").defaultNow(),
});
export const insertComplianceCertSchema = createInsertSchema(complianceCertificates).omit({ id: true, createdAt: true, reminderSent: true });
export type ComplianceCert       = typeof complianceCertificates.$inferSelect;
export type InsertComplianceCert = z.infer<typeof insertComplianceCertSchema>;

// ===================== ЧАНАРЫН ГЭРЧИЛГЭЭ (Quality Certificate per batch) =====================

export const qualityCertificates = pgTable("quality_certificates", {
  id:             serial("id").primaryKey(),
  orderId:        integer("order_id"),                    // salesOrders.id
  batchNumber:    text("batch_number").notNull(),         // Партийн дугаар
  productType:    text("product_type").notNull(),         // concrete_m200 | asphalt | crushed_stone
  productName:    text("product_name").notNull(),         // Хүний уншдаг нэр
  quantity:       real("quantity").notNull(),
  unit:           text("unit").default("м³"),
  customerName:   text("customer_name"),
  deliveryDate:   text("delivery_date"),
  location:       text("location"),
  testResults:    text("test_results"),                   // JSON string of lab tests
  compliancePct:  real("compliance_pct").default(100),    // Тохирлын хувь
  isCompliant:    boolean("is_compliant").default(true),  // 100% нийцсэн эсэх
  certNumber:     text("cert_number"),                    // complianceCertificates.certNumber
  issuedBy:       text("issued_by"),                      // Гэрчилгээ олгосон
  standardRef:    text("standard_ref"),                   // МNS ISO стандарт
  issuedDate:     text("issued_date"),
  notes:          text("notes"),
  createdAt:      timestamp("created_at").defaultNow(),
});
export const insertQualityCertSchema = createInsertSchema(qualityCertificates).omit({ id: true, createdAt: true });
export type QualityCert       = typeof qualityCertificates.$inferSelect;
export type InsertQualityCert = z.infer<typeof insertQualityCertSchema>;

// ===================== ХУРЛЫН ТАЙЛАН (Meeting Reports) =====================
export const meetingReports = pgTable("meeting_reports", {
  id:             serial("id").primaryKey(),
  title:          text("title").notNull(),
  description:    text("description"),
  category:       text("category").default("other"),  // monthly | project | financial | safety | lab | hr | other
  fileUrl:        text("file_url").notNull(),
  cloudinaryId:   text("cloudinary_id"),
  fileName:       text("file_name"),
  fileType:       text("file_type"),                  // pdf | xlsx | docx | pptx | image
  uploadedBy:     text("uploaded_by").notNull(),
  uploadedByRole: text("uploaded_by_role").notNull(), // ADMIN | SUPERVISOR | SALES | PROJECT | ...
  meetingDate:    text("meeting_date"),
  isShared:       boolean("is_shared").default(true),
  createdAt:      timestamp("created_at").defaultNow(),
});
export const insertMeetingReportSchema = createInsertSchema(meetingReports).omit({ id: true, createdAt: true });
export type MeetingReport       = typeof meetingReports.$inferSelect;
export type InsertMeetingReport = z.infer<typeof insertMeetingReportSchema>;

// ===================== CONTRACTS (онлайн гэрээ) =====================
export const contracts = pgTable("contracts", {
  id:              serial("id").primaryKey(),
  contractNo:      text("contract_no").notNull(),
  approvalToken:   text("approval_token").notNull().unique(),
  contactId:       integer("contact_id"),
  clientName:      text("client_name").notNull(),
  clientEmail:     text("client_email").notNull(),
  clientPhone:     text("client_phone"),
  clientOrg:       text("client_org"),
  product:         text("product").notNull(),
  quantity:        real("quantity").notNull(),
  unit:            text("unit").notNull().default("м³"),
  unitPrice:       real("unit_price").notNull(),
  totalAmount:     real("total_amount").notNull(),
  deliveryDate:    text("delivery_date"),
  deliveryAddress: text("delivery_address"),
  notes:           text("notes"),
  status:          text("status").notNull().default("draft"),
  // draft → sent → client_approved → factory_ordered → completed | cancelled
  approvedAt:      timestamp("approved_at"),
  factoryOrderId:  integer("factory_order_id"),
  createdBy:       text("created_by"),
  createdAt:       timestamp("created_at").defaultNow(),
  updatedAt:       timestamp("updated_at").defaultNow(),
});
export const insertContractSchema = createInsertSchema(contracts).omit({ id: true, createdAt: true, updatedAt: true });
export type Contract       = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;

// ===================== COMPANY PRODUCTS (нүүр хуудасны захиалгын жагсаалт) =====================
export const companyProducts = pgTable("company_products", {
  id:          serial("id").primaryKey(),
  name:        text("name").notNull(),
  unit:        text("unit").notNull().default("ш"),
  category:    text("category").notNull().default("finished"),
  description: text("description"),
  isActive:    boolean("is_active").notNull().default(true),
  sortOrder:   integer("sort_order").notNull().default(0),
  createdAt:   timestamp("created_at").defaultNow(),
});
export const insertCompanyProductSchema = createInsertSchema(companyProducts).omit({ id: true, createdAt: true });
export type CompanyProduct       = typeof companyProducts.$inferSelect;
export type InsertCompanyProduct = z.infer<typeof insertCompanyProductSchema>;

export type ProjectResponse = Project;
export type ContactResponse = Contact;
export type ContentResponse = Content;
export type SuccessGalleryResponse = SuccessGallery;
export type SubscriptionResponse = Subscription;

// ===================== ҮНИЙН САНАЛ (Price Proposal Workflow) =====================
// draft → lab_review → lab_approved → finance_pricing → hr_review → completed
export const priceProposals = pgTable("price_proposals", {
  id:             serial("id").primaryKey(),
  productType:    text("product_type").notNull(), // concrete_b25 | concrete_b30 | asphalt | crushed_stone | ...
  productName:    text("product_name").notNull(),
  unit:           text("unit").notNull().default("м³"),
  requestedBy:    text("requested_by").notNull().default("SALES"),
  status:         text("status").notNull().default("draft"),
  aiNotes:        text("ai_notes"),
  finalUnitCost:  real("final_unit_cost"),
  markupPct:      real("markup_pct").default(15),
  suggestedPrice: real("suggested_price"),
  barterPrice:    real("barter_price"),
  hrNotes:        text("hr_notes"),
  salesNotes:     text("sales_notes"),
  recommendedQty: real("recommended_qty"),
  labApprovedBy:  text("lab_approved_by"),
  labApprovedAt:  timestamp("lab_approved_at"),
  createdAt:      timestamp("created_at").defaultNow(),
  updatedAt:      timestamp("updated_at").defaultNow(),
});
export const insertPriceProposalSchema = createInsertSchema(priceProposals).omit({ id: true, createdAt: true, updatedAt: true });
export type PriceProposal       = typeof priceProposals.$inferSelect;
export type InsertPriceProposal = z.infer<typeof insertPriceProposalSchema>;

// Орц нормын бүтэц (материал + хөдөлмөр + тоног)
export const priceProposalItems = pgTable("price_proposal_items", {
  id:           serial("id").primaryKey(),
  proposalId:   integer("proposal_id").notNull(),
  category:     text("category").notNull().default("material"), // material | labor | equipment | overhead
  materialName: text("material_name").notNull(),
  norm:         real("norm").notNull(),         // нэгж бүтээгдэхүүнд ногдох хэмжээ
  unit:         text("unit").notNull(),          // тн | м³ | кг | л | цаг
  unitPrice:    real("unit_price"),              // санхүү бөглөнө
  totalPerUnit: real("total_per_unit"),          // norm × unitPrice
  source:       text("source").notNull().default("ai"), // ai | lab_adjusted | finance_set
  labNote:      text("lab_note"),
  sortOrder:    integer("sort_order").default(0),
  createdAt:    timestamp("created_at").defaultNow(),
});
export const insertPriceProposalItemSchema = createInsertSchema(priceProposalItems).omit({ id: true, createdAt: true });
export type PriceProposalItem       = typeof priceProposalItems.$inferSelect;
export type InsertPriceProposalItem = z.infer<typeof insertPriceProposalItemSchema>;

// Хүний нөөц (HR)
export const priceProposalLabor = pgTable("price_proposal_labor", {
  id:           serial("id").primaryKey(),
  proposalId:   integer("proposal_id").notNull(),
  roleName:     text("role_name").notNull(),   // Бетонч | Жолооч | Операторч
  count:        integer("count").notNull().default(1),
  hoursPerUnit: real("hours_per_unit").notNull().default(1),
  hourlyRate:   real("hourly_rate"),
  totalPerUnit: real("total_per_unit"),
  createdAt:    timestamp("created_at").defaultNow(),
});
export const insertPriceProposalLaborSchema = createInsertSchema(priceProposalLabor).omit({ id: true, createdAt: true });
export type PriceProposalLabor       = typeof priceProposalLabor.$inferSelect;
export type InsertPriceProposalLabor = z.infer<typeof insertPriceProposalLaborSchema>;

// ===================== ХӨДӨЛМӨРИЙН НОРМ (Бүтээгдэхүүний стандарт) =====================
export const productLaborNorms = pgTable("product_labor_norms", {
  id:                   serial("id").primaryKey(),
  productType:          text("product_type").notNull(),
  productLabel:         text("product_label").notNull(),
  roleName:             text("role_name").notNull(),
  unitsPerPersonPerDay: real("units_per_person_per_day").notNull(),
  unit:                 text("unit").notNull().default("ш"),
  hourlyRate:           real("hourly_rate").default(0),
  hoursPerDay:          real("hours_per_day").notNull().default(8),
  department:           text("department"),
  createdAt:            timestamp("created_at").defaultNow(),
});
export const insertProductLaborNormSchema = createInsertSchema(productLaborNorms).omit({ id: true, createdAt: true });
export type ProductLaborNorm       = typeof productLaborNorms.$inferSelect;
export type InsertProductLaborNorm = z.infer<typeof insertProductLaborNormSchema>;

// ===================== AI НОРМ КЭШ (Бүтээгдэхүүн тус бүрт нэг удаа AI дуудана) =====================
export const aiNormCache = pgTable("ai_norm_cache", {
  id:          serial("id").primaryKey(),
  productType: text("product_type").notNull().unique(),
  productName: text("product_name").notNull(),
  unit:        text("unit").notNull().default("м³"),
  materials:   text("materials_json").notNull().default("[]"),
  labor:       text("labor_json").notNull().default("[]"),
  aiNotes:     text("ai_notes"),
  updatedAt:   timestamp("updated_at").defaultNow(),
  updatedBy:   text("updated_by").default("ai"),
});
export type AiNormCache = typeof aiNormCache.$inferSelect;

// ===================== ГЭРЭЭНИЙ ЗАГВАР (Contract Template) =====================
export const contractTemplateSections = pgTable("contract_template_sections", {
  id:           serial("id").primaryKey(),
  sectionKey:   text("section_key").notNull().unique(),
  sectionTitle: text("section_title").notNull(),
  content:      text("content").notNull(),
  sortOrder:    integer("sort_order").default(0),
  updatedAt:    timestamp("updated_at").defaultNow(),
  updatedBy:    text("updated_by"),
});
export const insertContractTemplateSectionSchema = createInsertSchema(contractTemplateSections).omit({ id: true, updatedAt: true });
export type ContractTemplateSection       = typeof contractTemplateSections.$inferSelect;
export type InsertContractTemplateSection = z.infer<typeof insertContractTemplateSectionSchema>;

// ===================== БҮТЭЭГДЭХҮҮНИЙ АНГИЛАЛ =====================
export const productCategories = pgTable("product_categories", {
  id:          serial("id").primaryKey(),
  key:         text("key").notNull().unique(),        // concrete | foam_block | asphalt | stone | sand
  label:       text("label").notNull(),               // Бетон зуурмаг (product card дээр)
  filterLabel: text("filter_label").notNull(),        // Бетон (шүүлтүүрийн товч)
  isActive:    boolean("is_active").default(true),
  showFilter:  boolean("show_filter").default(true),  // шүүлтүүрт харуулах эсэх
  sortOrder:   integer("sort_order").default(0),
  createdAt:   timestamp("created_at").defaultNow(),
});
export const insertProductCategorySchema = createInsertSchema(productCategories).omit({ id: true, createdAt: true });
export type ProductCategory       = typeof productCategories.$inferSelect;
export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;
