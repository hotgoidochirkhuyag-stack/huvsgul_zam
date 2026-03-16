import { db } from "./db.js";
import * as schema from "../shared/schema.js";
import { eq } from "drizzle-orm";

// =====================================================
// KPI тооцооллын системийн гол модуль
// БНбД норм vs гүйцэтгэлийг харьцуулж урамшуулал тооцно
// =====================================================

export interface KpiResult {
  employeeId: number;
  employeeName: string;
  department: string;
  date: string;
  workType: string;
  quantity: number;
  unit: string;
  dailyNorm: number;
  achievement: number;      // гүйцэтгэлийн хувь %
  bonus: number;            // урамшуулал MNT
  status: "exceeded" | "met" | "below"; // хэтэрсэн | хангасан | хүрэхгүй
}

export interface PlantKpiResult {
  plantId: number;
  plantName: string;
  plantType: string;
  date: string;
  outputQuantity: number;
  unit: string;
  shift: string;
}

// Тухайн ажилтны тайлагнасан өгөгдлийн KPI тооцоол
export async function calculateEmployeeKpi(reportId: number): Promise<KpiResult | null> {
  const [report] = await db
    .select()
    .from(schema.dailyReports)
    .where(eq(schema.dailyReports.id, reportId));

  if (!report) return null;

  const [employee] = await db
    .select()
    .from(schema.employees)
    .where(eq(schema.employees.id, report.employeeId));

  const [kpiConfig] = await db
    .select()
    .from(schema.kpiConfigs)
    .where(eq(schema.kpiConfigs.workType, report.workType));

  if (!employee || !kpiConfig) return null;

  const achievement = kpiConfig.dailyNorm > 0
    ? Math.round((report.quantity / kpiConfig.dailyNorm) * 100)
    : 0;

  let bonus = 0;
  if (achievement >= 100) {
    // Нормоос давсан тоо хэмжээнд урамшуулал нэмнэ
    const excess = Math.max(0, report.quantity - kpiConfig.dailyNorm);
    bonus = Math.round(excess * kpiConfig.rewardPerUnit);
  }

  // Тооцоолсон урамшуулалыг DB-д хадгална
  await db
    .update(schema.dailyReports)
    .set({ bonus })
    .where(eq(schema.dailyReports.id, reportId));

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    department: employee.department,
    date: report.date,
    workType: report.workType,
    quantity: report.quantity,
    unit: report.unit,
    dailyNorm: kpiConfig.dailyNorm,
    achievement,
    bonus,
    status: achievement >= 110 ? "exceeded" : achievement >= 100 ? "met" : "below",
  };
}

// Тайлангийн хугацааны нийт KPI тооцоол (бүлгээр)
export async function calculateTeamKpi(
  startDate: string,
  endDate: string,
  department?: string
): Promise<KpiResult[]> {
  const reports = await db.select().from(schema.dailyReports);
  const employees = await db.select().from(schema.employees);
  const kpiConfigs = await db.select().from(schema.kpiConfigs);

  const empMap = new Map(employees.map(e => [e.id, e]));
  const kpiMap = new Map(kpiConfigs.map(k => [k.workType, k]));

  const filtered = reports.filter(r => {
    const inRange = r.date >= startDate && r.date <= endDate;
    if (!inRange) return false;
    if (department) {
      const emp = empMap.get(r.employeeId);
      return emp?.department === department;
    }
    return true;
  });

  return filtered.map(r => {
    const emp = empMap.get(r.employeeId);
    const kpi = kpiMap.get(r.workType);
    const dailyNorm = kpi?.dailyNorm ?? 1;
    const achievement = Math.round((r.quantity / dailyNorm) * 100);
    return {
      employeeId: r.employeeId,
      employeeName: emp?.name ?? "Тодорхойгүй",
      department: emp?.department ?? "-",
      date: r.date,
      workType: r.workType,
      quantity: r.quantity,
      unit: r.unit,
      dailyNorm,
      achievement,
      bonus: r.bonus ?? 0,
      status: (achievement >= 110 ? "exceeded" : achievement >= 100 ? "met" : "below") as KpiResult["status"],
    };
  });
}

// Анхны KPI норм мэдээллийг DB-д оруулах (БНбД-аас)
export async function seedDefaultKpiConfigs() {
  const defaults = [
    // Замын ажил
    { workType: "Хөрс хуулах",       unit: "м³",  dailyNorm: 120, rewardPerUnit: 80,  source: "БНбД А-63" },
    { workType: "Чулуун материал тавих", unit: "м³", dailyNorm: 40, rewardPerUnit: 200, source: "БНбД А-63" },
    { workType: "Асфальт хучих",      unit: "м²",  dailyNorm: 300, rewardPerUnit: 50,  source: "БНбД А-141" },
    { workType: "Гүүрийн бетон",      unit: "м³",  dailyNorm: 8,   rewardPerUnit: 1200, source: "БНбД А-141" },
    { workType: "Хайрга тавих",       unit: "м³",  dailyNorm: 60,  rewardPerUnit: 120, source: "БНбД А-63" },
    // Үйлдвэрийн ажил
    { workType: "Бетон зуурмаг үйлдвэрлэх", unit: "м³", dailyNorm: 150, rewardPerUnit: 60, source: "Дотоод норм" },
    { workType: "Асфальт хольц үйлдвэрлэх", unit: "тн", dailyNorm: 200, rewardPerUnit: 40, source: "Дотоод норм" },
    { workType: "Бутлан ангилах",     unit: "тн",  dailyNorm: 300, rewardPerUnit: 30,  source: "Дотоод норм" },
    // Оффисийн ажил
    { workType: "Зураг төсөл боловсруулах", unit: "хуудас", dailyNorm: 5, rewardPerUnit: 2000, source: "Дотоод норм" },
    { workType: "Тооцоо тооцоолол",   unit: "тайлан", dailyNorm: 3, rewardPerUnit: 5000, source: "Дотоод норм" },
  ];

  for (const cfg of defaults) {
    const existing = await db
      .select()
      .from(schema.kpiConfigs)
      .where(eq(schema.kpiConfigs.workType, cfg.workType));

    if (existing.length === 0) {
      await db.insert(schema.kpiConfigs).values(cfg);
    }
  }
}
