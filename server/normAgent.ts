import { db } from "./db.js";
import * as schema from "../shared/schema.js";
import { eq } from "drizzle-orm";

// =====================================================
// AI Норм шинэчлэгч агент
// legalinfo.mn болон ЗТХЯ-ны баримтаас норм татах
// =====================================================

export interface NormData {
  workType: string;
  unit: string;
  dailyNorm: number;
  rewardPerUnit: number;
  source: string;
}

// legalinfo.mn-аас тушаалын мэдээлэл хайх
export async function fetchFromLegalInfo(orderNumber: string): Promise<NormData[]> {
  try {
    const searchUrl = `https://legalinfo.mn/mn/detail?lawId=${encodeURIComponent(orderNumber)}`;
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ERP-NormAgent/1.0)" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();

    // HTML-аас норм утгуудыг хайж олох (хялбаршуулсан parser)
    const norms: NormData[] = [];
    const tableRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let match;

    while ((match = tableRegex.exec(html)) !== null) {
      const cells: string[] = [];
      let cellMatch;
      const rowHtml = match[1];
      while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
        const text = cellMatch[1].replace(/<[^>]+>/g, "").trim();
        cells.push(text);
      }
      if (cells.length >= 3 && /м³|тн|м²|хуудас/.test(cells.join(""))) {
        const normVal = parseFloat(cells.find(c => /^\d+\.?\d*$/.test(c)) ?? "0");
        if (normVal > 0) {
          norms.push({
            workType: cells[0] || "Тодорхойгүй ажил",
            unit: cells.find(c => /м³|тн|м²|м/.test(c)) ?? "м³",
            dailyNorm: normVal,
            rewardPerUnit: 0,
            source: `ЗТХЯ ${orderNumber}`,
          });
        }
      }
    }

    return norms;
  } catch (err) {
    console.error(`[NormAgent] legalinfo.mn-аас татахад алдаа (${orderNumber}):`, err);
    return [];
  }
}

// Олдсон нормуудыг DB-д хадгалах
export async function upsertNorms(norms: NormData[]): Promise<number> {
  let updated = 0;
  for (const norm of norms) {
    const existing = await db
      .select()
      .from(schema.kpiConfigs)
      .where(eq(schema.kpiConfigs.workType, norm.workType));

    if (existing.length > 0) {
      await db
        .update(schema.kpiConfigs)
        .set({
          dailyNorm: norm.dailyNorm,
          unit: norm.unit,
          source: norm.source,
        })
        .where(eq(schema.kpiConfigs.workType, norm.workType));
    } else {
      await db.insert(schema.kpiConfigs).values(norm);
    }
    updated++;
  }
  return updated;
}

// Тушаалын дугаараар норм дуудах (А-63, А-141 гэх мэт)
export async function syncNormsFromOrder(orderNumber: string) {
  const norms = await fetchFromLegalInfo(orderNumber);
  if (norms.length === 0) {
    return { success: false, message: `${orderNumber} тушаалаас норм олдсонгүй`, updated: 0 };
  }
  const updated = await upsertNorms(norms);
  return { success: true, message: `${updated} норм шинэчлэгдлээ`, updated };
}
