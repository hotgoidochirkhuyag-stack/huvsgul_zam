import { db } from "./db";
import { tenderProjects } from "../shared/schema";

const TENDER_DATA = [
  { title: "ХАНХ МОНДЫН ЗАМ", category: "Авто зам", location: "Хөвсгөл аймаг", year: "2018", progress: 100, description: "Ханх-Мондын чиглэлийн авто замын шинэчлэл ба өргөтгөл." },
  { title: "ХАНХ - МОНДЫН ХАТУУ ХУЧИЛТТАЙ ЗАМ", category: "Авто зам", location: "Хөвсгөл аймаг", year: "2019", progress: 100, description: "Хатуу хучилттай авто зам." },
  { title: "МӨРӨН НИСЭХ БУУДЛЫН БЕТОН ХУЧИЛТТАЙ ТАЛБАЙ", category: "Дэд бүтэц", location: "Мөрөн хот", year: "2020", progress: 100, description: "Мөрөн нисэх буудлын хатуу хучилттай зогсоол, талбай." },
  { title: "БЕТОН ЗУУРМАГ НИЙЛҮҮЛЭЛТ", category: "Дэд бүтэц", location: "Хөвсгөл аймаг", year: "2020", progress: 100, description: "Хөвсгөл аймгийн хэд хэдэн байгууллагад бетон зуурмаг нийлүүлэх." },
  { title: "МӨРӨН ХОТЫН ЗАМЫН ЗАСВАР", category: "Авто зам", location: "Мөрөн хот", year: "2021", progress: 100, description: "Мөрөн хотын гол гудамж, замын засвар үйлчилгээ." },
  { title: "ТОСОНЦЭНГЭЛ-ЖАРГАЛАНТ ЧИГЛЭЛИЙН ЗАМ", category: "Авто зам", location: "Хөвсгөл аймаг", year: "2021", progress: 100, description: "Тосонцэнгэл-Жаргалант 42 км замын шинэчлэл." },
  { title: "РЕНЧИНЛХҮМБЭ СУМЫН ГОЛ ДЭЭРХ ГҮҮ", category: "Гүүр", location: "Ренчинлхүмбэ сум", year: "2022", progress: 100, description: "Тэнгис голын дээгүүрх 35м урт бетон гүүрийн барилга." },
  { title: "МӨРӨН ХОТЫН ГУДАМЖНЫ ГЭРЭЛТҮҮЛЭГ", category: "Дэд бүтэц", location: "Мөрөн хот", year: "2022", progress: 100, description: "Хотын 12 гудамжны LED гэрэлтүүлэг суурилуулалт." },
  { title: "ХАТГАЛ АЯЛАЛ ЖУУЛЧЛАЛЫН ДЭВСГЭР БАРИЛГА", category: "Дэд бүтэц", location: "Хатгал тосгон", year: "2023", progress: 75, description: "Хатгал тосгоны аялал жуулчлалын дэд бүтцийн объект." },
  { title: "МӨРӨН-ХАТГАЛ УЛСЫН ЧАН ЗАМЫН ЗАСВАР", category: "Авто зам", location: "Мөрөн-Хатгал", year: "2024", progress: 60, description: "Улсын чанартай 94 км замын гадаргуун засвар." },
  { title: "ЦАГААННУУР СУМЫН ЗАМ ЗАСВАР", category: "Авто зам", location: "Цагааннуур сум", year: "2024", progress: 30, description: "Цагааннуур сумын нутаг дэвсгэрт замын засвар." },
  { title: "МӨРӨН ХОТЫН ЗҮҮН ТОЙРОГ ЗАМ", category: "Авто зам", location: "Мөрөн хот", year: "2025", progress: 15, description: "Мөрөн хотын зүүн хэсгийг тойрох 8 км шинэ замын барилга." },
];

async function main() {
  console.log("tender_projects хүснэгтийг цэвэрлэж байна...");
  await db.delete(tenderProjects);
  console.log("12 тендерийн төсөл оруулж байна...");
  const inserted = await db.insert(tenderProjects).values(TENDER_DATA).returning();
  console.log(`✅ ${inserted.length} төсөл амжилттай оруулагдлаа.`);
  inserted.forEach(r => console.log(` - [${r.id}] ${r.title} (${r.progress}%)`));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
