import { db } from "./db.js";
import * as schema from "../shared/schema.js";
import { eq } from "drizzle-orm";

// =====================================================
// ЗЗБНбД 81-013-2019 — Авто зам, замын байгууламжийн
// барилга, засварын ажлын төсөв бодох норм
// Монгол Улсын Барилга, Хот байгуулалтын Яам, 2019
// =====================================================

export interface NormData {
  workType: string;
  unit: string;
  dailyNorm: number;
  rewardPerUnit: number;
  source: string;
  section?: string;
  code?: string;
}

// ЗЗБНбД 81-013-2019 — Бүрэн норм мэдээллийн сан
export const ZZBND_NORMS: NormData[] = [

  // ─── 1. БЭЛТГЭЛ АЖИЛ ─────────────────────────────────────────
  { code: "1.1.1",  section: "1. Бэлтгэл ажил",  workType: "Газар цэвэрлэх, ургамал, бут зайлуулах",       unit: "га",    dailyNorm: 0.8,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "1.1.2",  section: "1. Бэлтгэл ажил",  workType: "Хуучин асфальт хучилт буулгах",                unit: "м²",    dailyNorm: 1200,  rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "1.1.3",  section: "1. Бэлтгэл ажил",  workType: "Хуучин бетон хучилт буулгах",                  unit: "м²",    dailyNorm: 400,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "1.1.4",  section: "1. Бэлтгэл ажил",  workType: "Хуучин хайрга суурь буулгах",                  unit: "м³",    dailyNorm: 500,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "1.1.5",  section: "1. Бэлтгэл ажил",  workType: "Тэмдэглэгэ, тэмдэг зайлуулах",                unit: "ш",     dailyNorm: 80,    rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "1.1.6",  section: "1. Бэлтгэл ажил",  workType: "Байгалийн чулуу зайлуулах",                    unit: "м³",    dailyNorm: 120,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },

  // ─── 2. ХӨРСНИЙ АЖИЛ ──────────────────────────────────────────
  { code: "2.1.1",  section: "2. Хөрсний ажил",   workType: "Хөрс ухах — экскаватор 0.65 м³",              unit: "м³",    dailyNorm: 900,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "2.1.2",  section: "2. Хөрсний ажил",   workType: "Хөрс ухах — экскаватор 1.0 м³",               unit: "м³",    dailyNorm: 1300,  rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "2.1.3",  section: "2. Хөрсний ажил",   workType: "Хөрс ухах — экскаватор 1.6 м³",               unit: "м³",    dailyNorm: 1800,  rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "2.2.1",  section: "2. Хөрсний ажил",   workType: "Хөрс зөөх — 5 тн авто тэрэг (5 км)",          unit: "м³",    dailyNorm: 320,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "2.2.2",  section: "2. Хөрсний ажил",   workType: "Хөрс зөөх — 10 тн авто тэрэг (5 км)",         unit: "м³",    dailyNorm: 550,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "2.2.3",  section: "2. Хөрсний ажил",   workType: "Хөрс зөөх — 20 тн авто тэрэг (10 км)",        unit: "м³",    dailyNorm: 600,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "2.3.1",  section: "2. Хөрсний ажил",   workType: "Дэнжийн хөрс тэгшлэх — бульдозер D6",         unit: "м²",    dailyNorm: 5000,  rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "2.3.2",  section: "2. Хөрсний ажил",   workType: "Дэнжийн хөрс тэгшлэх — бульдозер D9",         unit: "м²",    dailyNorm: 8000,  rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "2.4.1",  section: "2. Хөрсний ажил",   workType: "Хөрс нягтруулах — хавтгай кош 10 тн",         unit: "м²",    dailyNorm: 4000,  rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "2.4.2",  section: "2. Хөрсний ажил",   workType: "Хөрс нягтруулах — хавтгай кош 15 тн",         unit: "м²",    dailyNorm: 6000,  rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "2.4.3",  section: "2. Хөрсний ажил",   workType: "Хөрс нягтруулах — виброкош",                  unit: "м²",    dailyNorm: 3500,  rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "2.5.1",  section: "2. Хөрсний ажил",   workType: "Налуу засах, тэгшлэх",                         unit: "м²",    dailyNorm: 1500,  rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "2.5.2",  section: "2. Хөрсний ажил",   workType: "Хөрс усжуулах (нягтруулалтын өмнө)",          unit: "м²",    dailyNorm: 8000,  rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "2.6.1",  section: "2. Хөрсний ажил",   workType: "Хивэрхэг хөрс дарж нягтруулах",               unit: "м³",    dailyNorm: 600,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "2.6.2",  section: "2. Хөрсний ажил",   workType: "Хувцаслалт хийх (талбайд хөрс хийх)",         unit: "м²",    dailyNorm: 2000,  rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },

  // ─── 3. СУУРЬ ДАВХАРГА ────────────────────────────────────────
  { code: "3.1.1",  section: "3. Суурь давхарга",  workType: "Хайрга суурь давхарга (доод) тавих",          unit: "м³",    dailyNorm: 400,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "3.1.2",  section: "3. Суурь давхарга",  workType: "Хайрга суурь давхарга (дээд) тавих",          unit: "м³",    dailyNorm: 300,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "3.1.3",  section: "3. Суурь давхарга",  workType: "Хайрга тэгшлэх, нягтруулах — мотогрейдер",   unit: "м²",    dailyNorm: 4000,  rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "3.2.1",  section: "3. Суурь давхарга",  workType: "Чулуун сараалж давхарга тавих",               unit: "м²",    dailyNorm: 1200,  rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "3.2.2",  section: "3. Суурь давхарга",  workType: "Чулуун хайрга давхарга нягтруулах",           unit: "м²",    dailyNorm: 2000,  rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "3.3.1",  section: "3. Суурь давхарга",  workType: "Цементэн тогтворжуулалт (4-6%)",              unit: "м²",    dailyNorm: 800,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "3.3.2",  section: "3. Суурь давхарга",  workType: "Цементэн тогтворжуулалт (7-10%)",             unit: "м²",    dailyNorm: 700,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "3.4.1",  section: "3. Суурь давхарга",  workType: "Битумжуулсан хайрга суурь хийх",              unit: "м²",    dailyNorm: 900,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "3.4.2",  section: "3. Суурь давхарга",  workType: "Нунтаглагдсан чулуун суурь тавих",            unit: "м²",    dailyNorm: 1500,  rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "3.5.1",  section: "3. Суурь давхарга",  workType: "Геотекстиль тавих",                           unit: "м²",    dailyNorm: 3000,  rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "3.5.2",  section: "3. Суурь давхарга",  workType: "Геосетка тавих",                              unit: "м²",    dailyNorm: 2500,  rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },

  // ─── 4. АСФАЛЬТБЕТОН ХУЧИЛТ ───────────────────────────────────
  { code: "4.1.1",  section: "4. Асфальтбетон хучилт", workType: "Нягт асфальтбетон (I давхарга, халуун)", unit: "тн",    dailyNorm: 200,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "4.1.2",  section: "4. Асфальтбетон хучилт", workType: "Нягт асфальтбетон (II давхарга, халуун)", unit: "тн",   dailyNorm: 220,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "4.1.3",  section: "4. Асфальтбетон хучилт", workType: "Нүхэрхэг асфальтбетон тавих",            unit: "тн",    dailyNorm: 180,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "4.1.4",  section: "4. Асфальтбетон хучилт", workType: "Асфальтбетон хийх — финишер ашиглан",    unit: "м²",    dailyNorm: 2500,  rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "4.2.1",  section: "4. Асфальтбетон хучилт", workType: "Шингэн битум эмульс цацах (праймер)",    unit: "м²",    dailyNorm: 6000,  rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "4.2.2",  section: "4. Асфальтбетон хучилт", workType: "Шингэн битум давхаргын хоорондын тос",   unit: "м²",    dailyNorm: 5000,  rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "4.3.1",  section: "4. Асфальтбетон хучилт", workType: "Асфальт нягтруулах — танк кош 10 тн",    unit: "м²",    dailyNorm: 3000,  rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "4.3.2",  section: "4. Асфальтбетон хучилт", workType: "Асфальт нягтруулах — танк кош 15 тн",    unit: "м²",    dailyNorm: 4500,  rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "4.4.1",  section: "4. Асфальтбетон хучилт", workType: "Нүх засвар — халуун асфальт",            unit: "м²",    dailyNorm: 150,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "4.4.2",  section: "4. Асфальтбетон хучилт", workType: "Хагарал засвар — битумэн бетон",         unit: "урт.м", dailyNorm: 500,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "4.5.1",  section: "4. Асфальтбетон хучилт", workType: "Ширхэгт хучилт (чипсиль) цацах",        unit: "м²",    dailyNorm: 4000,  rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "4.5.2",  section: "4. Асфальтбетон хучилт", workType: "Хос давхаргат ширхэгт хучилт",          unit: "м²",    dailyNorm: 3000,  rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },

  // ─── 5. БЕТОН ХУЧИЛТ ──────────────────────────────────────────
  { code: "5.1.1",  section: "5. Бетон хучилт",   workType: "Цементэн бетон хучилт хийх (F300)",            unit: "м³",    dailyNorm: 120,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "5.1.2",  section: "5. Бетон хучилт",   workType: "Цементэн бетон хучилт хийх (F400)",            unit: "м³",    dailyNorm: 100,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "5.2.1",  section: "5. Бетон хучилт",   workType: "Тэлэлтийн хавтас суурилуулах",                 unit: "урт.м", dailyNorm: 300,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "5.2.2",  section: "5. Бетон хучилт",   workType: "Бетон хучилт нягтруулах — вибробарих",         unit: "м³",    dailyNorm: 80,    rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "5.3.1",  section: "5. Бетон хучилт",   workType: "Бетон хавтан оёдол битүүмжлэх",               unit: "урт.м", dailyNorm: 600,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "5.3.2",  section: "5. Бетон хучилт",   workType: "Бетон гадаргуу боловсруулах (текстур)",        unit: "м²",    dailyNorm: 800,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },

  // ─── 6. УС ЗАЙЛУУЛАХ БАЙГУУЛАМЖ ───────────────────────────────
  { code: "6.1.1",  section: "6. Ус зайлуулах",   workType: "Зам дагуух хажуугийн шуудуу ухах",             unit: "урт.м", dailyNorm: 400,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "6.1.2",  section: "6. Ус зайлуулах",   workType: "Хажуугийн шуудуу бетонжуулах",                 unit: "урт.м", dailyNorm: 150,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "6.2.1",  section: "6. Ус зайлуулах",   workType: "Хоолой суурилуулах (D 600 мм)",                unit: "урт.м", dailyNorm: 60,    rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "6.2.2",  section: "6. Ус зайлуулах",   workType: "Хоолой суурилуулах (D 900 мм)",                unit: "урт.м", dailyNorm: 40,    rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "6.2.3",  section: "6. Ус зайлуулах",   workType: "Хоолой суурилуулах (D 1200 мм)",               unit: "урт.м", dailyNorm: 25,    rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "6.3.1",  section: "6. Ус зайлуулах",   workType: "Усны хүлцэл — бетон хана",                     unit: "ш",     dailyNorm: 4,     rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "6.3.2",  section: "6. Ус зайлуулах",   workType: "Тунгалагжуулах уурхай (хотгор) хийх",          unit: "ш",     dailyNorm: 2,     rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "6.4.1",  section: "6. Ус зайлуулах",   workType: "Дренажийн хоолой тавих",                       unit: "урт.м", dailyNorm: 80,    rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "6.4.2",  section: "6. Ус зайлуулах",   workType: "Дренажийн нэвчигч материал тавих",             unit: "м³",    dailyNorm: 200,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },

  // ─── 7. ЗАМЫН ТОНОГЛОЛ ────────────────────────────────────────
  { code: "7.1.1",  section: "7. Замын тоноглол", workType: "Замын тэмдэглэгэ будах (шар цагаан)",           unit: "м²",    dailyNorm: 600,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "7.1.2",  section: "7. Замын тоноглол", workType: "Термопластик тэмдэглэгэ хийх",                  unit: "м²",    dailyNorm: 400,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "7.1.3",  section: "7. Замын тоноглол", workType: "Хошуу хар цагаан тэмдэглэгэ",                   unit: "м²",    dailyNorm: 300,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "7.2.1",  section: "7. Замын тоноглол", workType: "Замын тэмдэг суурилуулах (R, W серий)",          unit: "ш",     dailyNorm: 30,    rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "7.2.2",  section: "7. Замын тоноглол", workType: "Гэрэл ойлтот катадиоптр тавих",                 unit: "ш",     dailyNorm: 200,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "7.3.1",  section: "7. Замын тоноглол", workType: "Гардил хашлага (W-beam) суурилуулах",            unit: "урт.м", dailyNorm: 200,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "7.3.2",  section: "7. Замын тоноглол", workType: "Бетон хашлага суурилуулах",                      unit: "урт.м", dailyNorm: 100,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "7.4.1",  section: "7. Замын тоноглол", workType: "Бордюр чулуу тавих (0.5×0.15×0.3)",             unit: "урт.м", dailyNorm: 300,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "7.4.2",  section: "7. Замын тоноглол", workType: "Бетон бордюр тавих",                             unit: "урт.м", dailyNorm: 250,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "7.5.1",  section: "7. Замын тоноглол", workType: "Хөнгөн гэрэлтүүлэг суурилуулах",                unit: "ш",     dailyNorm: 6,     rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "7.5.2",  section: "7. Замын тоноглол", workType: "Хэт хурдны радар суурилуулах",                   unit: "ш",     dailyNorm: 2,     rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },

  // ─── 8. ГҮҮР, БАЙГУУЛАМЖ ──────────────────────────────────────
  { code: "8.1.1",  section: "8. Гүүр, байгууламж", workType: "Гүүрний суурь (паал) хийх",                  unit: "м³",    dailyNorm: 30,    rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "8.1.2",  section: "8. Гүүр, байгууламж", workType: "Гүүрний хүүхэн (хажуу хана) хийх",           unit: "м³",    dailyNorm: 15,    rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "8.2.1",  section: "8. Гүүр, байгууламж", workType: "Урьдчилан хурцалсан бетон хоног суурилуулах", unit: "тн",    dailyNorm: 20,    rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "8.2.2",  section: "8. Гүүр, байгууламж", workType: "Гүүрний тавцан бетонжуулах",                  unit: "м³",    dailyNorm: 40,    rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "8.3.1",  section: "8. Гүүр, байгууламж", workType: "Тулгуур (pillar) барих",                      unit: "м³",    dailyNorm: 12,    rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "8.3.2",  section: "8. Гүүр, байгууламж", workType: "Гүүрний металл хийц суурилуулах",             unit: "тн",    dailyNorm: 5,     rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "8.4.1",  section: "8. Гүүр, байгууламж", workType: "Гүүрний налуу хучилт (жийргэвч)",             unit: "м²",    dailyNorm: 200,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "8.4.2",  section: "8. Гүүр, байгууламж", workType: "Гүүрний хашлага, бариул хийх",                unit: "урт.м", dailyNorm: 40,    rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },

  // ─── 9. ТУСГАЙ АЖЛУУД ─────────────────────────────────────────
  { code: "9.1.1",  section: "9. Тусгай ажлууд",  workType: "Замын гэрэлтүүлгийн кабель татах",              unit: "урт.м", dailyNorm: 500,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "9.1.2",  section: "9. Тусгай ажлууд",  workType: "Замын дохио суурилуулах (гар болон автомат)",    unit: "ш",     dailyNorm: 1,     rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "9.2.1",  section: "9. Тусгай ажлууд",  workType: "Гадаргуу хатуурал (surface treatment)",          unit: "м²",    dailyNorm: 3000,  rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "9.2.2",  section: "9. Тусгай ажлууд",  workType: "Хагарал наалдаас (crack sealing)",               unit: "урт.м", dailyNorm: 800,   rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "9.3.1",  section: "9. Тусгай ажлууд",  workType: "Давс, химийн бодис цацах (мөс эсэргүүцэл)",     unit: "км",    dailyNorm: 20,    rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
  { code: "9.3.2",  section: "9. Тусгай ажлууд",  workType: "Цас цэвэрлэх (снегоочиститель)",                 unit: "км",    dailyNorm: 60,    rewardPerUnit: 0, source: "ЗЗБНбД 81-013-2019" },
];

// Бүх хэсгүүдийн жагсаалт
export const NORM_SECTIONS = [...new Set(ZZBND_NORMS.map(n => n.section!))];

// DB-д нормуудыг хадгалах
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
        .set({ dailyNorm: norm.dailyNorm, unit: norm.unit, source: norm.source })
        .where(eq(schema.kpiConfigs.workType, norm.workType));
    } else {
      await db.insert(schema.kpiConfigs).values({
        workType: norm.workType,
        unit: norm.unit,
        dailyNorm: norm.dailyNorm,
        rewardPerUnit: norm.rewardPerUnit,
        source: norm.source,
      });
    }
    updated++;
  }
  return updated;
}

// Хэсгээр норм татах
export async function syncNormsBySection(section: string) {
  const norms = section === "ALL"
    ? ZZBND_NORMS
    : ZZBND_NORMS.filter(n => n.section === section);
  if (norms.length === 0) {
    return { success: false, message: "Хэсэг олдсонгүй", updated: 0 };
  }
  const updated = await upsertNorms(norms);
  return {
    success: true,
    message: `ЗЗБНбД 81-013-2019: ${section === "ALL" ? "Бүх хэсэг" : section} — ${updated} норм системд орлоо`,
    updated,
    section,
  };
}

// Хуучин endpoint-тэй нийцтэй байлгах
export async function syncNormsFromOrder(orderNumber: string) {
  return syncNormsBySection("ALL");
}
