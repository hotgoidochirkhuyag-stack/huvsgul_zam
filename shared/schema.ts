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
  status: text("status").notNull().default("active"), // active | completed | paused
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Үйлдвэрүүд
export const plants = pgTable("plants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // concrete | crusher | asphalt
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Өдрийн тайлан (Ажилтны гүйцэтгэл)
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
  shift: text("shift").default("өдөр"), // өдөр | шөнө
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Цагийн бүртгэл + ХАБЭА баталгаажуулалт
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  date: date("date").notNull(),
  checkIn: text("check_in"),                      // "08:30" форматтай
  checkOut: text("check_out"),                    // "17:30" форматтай
  safetyConfirmed: boolean("safety_confirmed").default(false),
  safetyConfirmedAt: timestamp("safety_confirmed_at"),
  lateMinutes: integer("late_minutes").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// KPI Тохиргоо (БНбД норм)
export const kpiConfigs = pgTable("kpi_configs", {
  id: serial("id").primaryKey(),
  workType: text("work_type").notNull().unique(),
  unit: text("unit").notNull(),
  dailyNorm: real("daily_norm").notNull(),
  rewardPerUnit: real("reward_per_unit").notNull().default(0),
  source: text("source"), // тушаалын дугаар жишээ нь А-63
  updatedAt: timestamp("updated_at").defaultNow(),
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

export type ProjectResponse = Project;
export type ContactResponse = Contact;
export type ContentResponse = Content;
export type SuccessGalleryResponse = SuccessGallery;
export type SubscriptionResponse = Subscription;
