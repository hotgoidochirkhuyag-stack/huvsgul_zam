import { db } from "./db";
import { projects } from "../shared/schema";
import { eq } from "drizzle-orm";

const TENDER_PROJECTS = [
  {
    title: "ХАНХ МОНДЫН ЗАМ",
    description: "Хөвсгөл аймгийн Ханх суманд Монгол-Орос хил хүртэлх авто замын барилга угсралт.",
    imageUrl: "/placeholder.jpg",
    category: "Авто зам",
    location: "Хөвсгөл аймаг Ханх сум",
    year: "2018",
    progress: 100,
  },
  {
    title: "ХАНХ - МОНДЫН ХАТУУ ХУЧИЛТТАЙ ЗАМ",
    description: "Хатуу хучилттай авто замын барилга угсралт, замын гадаргуу засварлах ажил.",
    imageUrl: "/placeholder.jpg",
    category: "Авто зам",
    location: "Хөвсгөл аймаг Ханх сум",
    year: "2015-2017",
    progress: 100,
  },
  {
    title: "МӨРӨН НИСЭХ БУУДЛЫН БЕТОН ХУЧИЛТТАЙ ТАЛБАЙ",
    description: "Мөрөн нисэх буудлын хатуу хучилттай буух талбай болон зурваасын барилга угсралт.",
    imageUrl: "/placeholder.jpg",
    category: "Дэд бүтэц",
    location: "Хөвсгөл аймгийн Мөрөн сум",
    year: "2002",
    progress: 100,
  },
  {
    title: "БЕТОН ЗУУРМАГ НИЙЛҮҮЛЭЛТ",
    description: "Хөвсгөл аймгийн бүтээн байгуулалтын төслүүдэд бетон зуурмаг нийлүүлэх гэрээт ажил.",
    imageUrl: "/placeholder.jpg",
    category: "Дэд бүтэц",
    location: "Хөвсгөл аймаг Мөрөн сум",
    year: "2020",
    progress: 100,
  },
  {
    title: "МӨРӨН ХОТЫН ЗАМЫН ЗАСВАР",
    description: "Мөрөн хотын дотоод авто замуудын өргөтгөл, засвар, хатуу хучилтын ажил.",
    imageUrl: "/placeholder.jpg",
    category: "Авто зам",
    location: "Хөвсгөл аймаг Мөрөн сум",
    year: "2021",
    progress: 100,
  },
  {
    title: "ТОСОНЦЭНГЭЛ-ЖАРГАЛАНТ ЧИГЛЭЛИЙН ЗАМ",
    description: "Хөвсгөл аймгийн дотоод авто замын шинэ барилга, хатуу хучилт тавих ажил.",
    imageUrl: "/placeholder.jpg",
    category: "Авто зам",
    location: "Хөвсгөл аймаг",
    year: "2022",
    progress: 100,
  },
  {
    title: "РЕНЧИНЛХҮМБЭ СУМЫН ГОЛ ДЭЭРХ ГҮҮ",
    description: "Хөвсгөл аймгийн Ренчинлхүмбэ суманд байрлах голын гүүрийн барилга угсралт.",
    imageUrl: "/placeholder.jpg",
    category: "Гүүр",
    location: "Хөвсгөл аймаг Ренчинлхүмбэ сум",
    year: "2023",
    progress: 100,
  },
  {
    title: "МӨРӨН ХОТЫН ГУДАМЖНЫ ГЭРЭЛТҮҮЛЭГ",
    description: "Мөрөн хотын гол гудамжуудад орчин үеийн LED гэрэлтүүлэг суурилуулах ажил.",
    imageUrl: "/placeholder.jpg",
    category: "Дэд бүтэц",
    location: "Хөвсгөл аймаг Мөрөн сум",
    year: "2023",
    progress: 100,
  },
  {
    title: "ХАТГАЛ АЯЛАЛ ЖУУЛЧЛАЛЫН ДЭВСГЭР БАРИЛГА",
    description: "Хөвсгөл нуурын эрэгт аялал жуулчлалын дэд бүтцийн барилга угсралт, замын ажил.",
    imageUrl: "/placeholder.jpg",
    category: "Дэд бүтэц",
    location: "Хөвсгөл аймаг Хатгал",
    year: "2024",
    progress: 75,
  },
  {
    title: "МӨРӨН-ХАТГАЛ УЛСЫН ЧАН ЗАМЫН ЗАСВАР",
    description: "Улсын чанартай Мөрөн-Хатгал чиглэлийн авто замын их засвар, хучилт шинэчлэх ажил.",
    imageUrl: "/placeholder.jpg",
    category: "Авто зам",
    location: "Хөвсгөл аймаг",
    year: "2024-2025",
    progress: 60,
  },
  {
    title: "ЦАГААННУУР СУМЫН ЗАМ ЗАСВАР",
    description: "Хөвсгөл аймгийн Цагааннуур суманд хүрэх орон нутгийн замын засвар, шинэчлэл.",
    imageUrl: "/placeholder.jpg",
    category: "Авто зам",
    location: "Хөвсгөл аймаг Цагааннуур сум",
    year: "2025",
    progress: 30,
  },
  {
    title: "МӨРӨН ХОТЫН ЗҮҮН ТОЙРОГ ЗАМ",
    description: "Мөрөн хотын зүүн хэсэгт тойрог замын шинэ барилга — явах эрхийн зам, хучилт.",
    imageUrl: "/placeholder.jpg",
    category: "Авто зам",
    location: "Хөвсгөл аймаг Мөрөн сум",
    year: "2025-2026",
    progress: 15,
  },
];

async function seed() {
  console.log("🌱 Тендерт явуулсан төслүүд нэмж байна...");

  const existing = await db.select().from(projects);
  if (existing.length > 0) {
    console.log(`⚠️  DB-д аль хэдийн ${existing.length} төсөл байна. Давхцахгүйн тулд нэмэхгүй байна.`);
    console.log("   Бүгдийг дахин нэмэх бол DB-г цэвэрлэж дахин ажиллуул.");
    process.exit(0);
  }

  for (const p of TENDER_PROJECTS) {
    await db.insert(projects).values(p);
    console.log(`  ✅ ${p.title}`);
  }

  console.log(`\n✅ Нийт ${TENDER_PROJECTS.length} тендерийн төсөл нэмэгдлээ.`);
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
