import { db } from "./db.js";
import * as schema from "../shared/schema.js";
import { eq, desc, lte, gt } from "drizzle-orm";

// ============================================================
//  ГЭРЧИЛГЭЭНИЙ ХУГАЦАА ШАЛГАХ — өдөр бүр 23:00 цагт
// ============================================================

export async function runCertExpiryCheck() {
  try {
    const today = new Date();
    const in30  = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const certs = await db
      .select()
      .from(schema.complianceCertificates)
      .where(eq(schema.complianceCertificates.isActive, true));

    const expiring = certs.filter(c => {
      const exp = new Date(c.expiryDate);
      return exp <= in30 && exp > today && !c.reminderSent;
    });

    for (const cert of expiring) {
      const daysLeft = Math.ceil(
        (new Date(cert.expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      await db.insert(schema.notifications).values({
        toRole:     "ADMIN",
        title:      `⚠️ Гэрчилгээ дуусах дөхлөө — ${cert.certNumber}`,
        body:       `${cert.certType.toUpperCase()} гэрчилгээ ${daysLeft} хоногийн дараа дуусна. Олгосон: ${cert.issuedBy}. Дуусах огноо: ${cert.expiryDate}`,
        sourceType: "request",
        sourceId:   cert.id,
      });
      await db
        .update(schema.complianceCertificates)
        .set({ reminderSent: true })
        .where(eq(schema.complianceCertificates.id, cert.id));
    }

    console.log(
      `[scheduler] Гэрчилгээний шалгалт: нийт ${certs.length}, ${expiring.length} мэдэгдэл илгээлээ.`
    );
  } catch (err) {
    console.error("[scheduler] Гэрчилгээний шалгалтад алдаа:", err);
  }
}

// ============================================================
//  АГУУЛАХЫН БАРАА ДУТАГДАЛ ШАЛГАХ — өдөр бүр 08:00 цагт
// ============================================================

export async function runLowStockCheck() {
  try {
    const items = await db
      .select()
      .from(schema.warehouseItems)
      .where(
        lte(schema.warehouseItems.quantity, schema.warehouseItems.minQuantity)
      );

    for (const item of items) {
      await db.insert(schema.notifications).values({
        toRole:     "ADMIN",
        title:      `⚠️ Агуулах: ${item.name} дутагдалтай`,
        body:       `Одоогийн үлдэгдэл: ${item.quantity} ${item.unit} — хамгийн бага хэмжээ: ${item.minQuantity} ${item.unit}. Нөөц нэмэх шаардлагатай.`,
        sourceType: "request",
        sourceId:   item.id,
      });
    }

    console.log(
      `[scheduler] Агуулахын шалгалт: ${items.length} бараа дутагдалтай мэдэгдэл илгээлээ.`
    );
  } catch (err) {
    console.error("[scheduler] Агуулахын шалгалтад алдаа:", err);
  }
}

// ============================================================
//  23:00 цагт автоматаар ажиллуулах хуваарь
// ============================================================

function msUntilNextRun(hour: number, minute = 0): number {
  const now  = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1); // дараа өдөр рүү шилжүүлэх
  return next.getTime() - now.getTime();
}

export function startScheduledJobs() {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  // 23:00 — Гэрчилгээний хугацаа шалгалт
  function scheduleCertCheck() {
    const delay = msUntilNextRun(23, 0);
    console.log(`[scheduler] Гэрчилгээний шалгалт: ${new Date(Date.now() + delay).toLocaleString("mn-MN")} цагт.`);
    setTimeout(async () => {
      await runCertExpiryCheck();
      setInterval(runCertExpiryCheck, ONE_DAY_MS);
    }, delay);
  }

  // 08:00 — Агуулахын дутагдал шалгалт
  function scheduleLowStockCheck() {
    const delay = msUntilNextRun(8, 0);
    console.log(`[scheduler] Агуулахын шалгалт: ${new Date(Date.now() + delay).toLocaleString("mn-MN")} цагт.`);
    setTimeout(async () => {
      await runLowStockCheck();
      setInterval(runLowStockCheck, ONE_DAY_MS);
    }, delay);
  }

  scheduleCertCheck();
  scheduleLowStockCheck();
}
