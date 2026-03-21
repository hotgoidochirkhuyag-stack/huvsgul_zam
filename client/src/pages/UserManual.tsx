import { useState } from "react";
import { useLocation } from "wouter";
import {
  BookOpen, ChevronDown, ChevronRight, ArrowLeft,
  LogIn, QrCode, ClipboardList, BarChart2, ShieldCheck,
  Truck, Package, FlaskConical, Users, Wrench,
  Building2, FileText, Settings, Star, AlertTriangle,
  CheckCircle, Clock, HardHat, Fuel
} from "lucide-react";

type Section = {
  id: string;
  icon: React.ReactNode;
  label: string;
  color: string;
  roles: string[];
  steps: { title: string; desc: string; tip?: string }[];
};

const SECTIONS: Section[] = [
  {
    id: "login",
    icon: <LogIn className="w-5 h-5" />,
    label: "Нэвтрэх — Бүх хэрэглэгч",
    color: "text-amber-400",
    roles: ["Бүх роль"],
    steps: [
      {
        title: "1. Вэбсайт нээх",
        desc: "Хөтөч дээр huvsgul-zam.mn (эсвэл Replit URL) хаягийг оруулна уу.",
        tip: "Chrome, Firefox, Safari — аль ч хөтөч дэмжинэ. Утсан дээр ч ажилладаг.",
      },
      {
        title: "2. Роль сонгох",
        desc: "Нүүр хуудасны баруун дээд буланд «ERP Нэвтрэх» товч дарна. Гарсан хуудаснаас өөрийн албан тушаалаа сонгоно:\n• Администратор\n• ТУЗ / Захирал\n• Төслийн удирдагч\n• Инженер\n• Хүний нөөц\n• Тасгийн ахлах\n• Механик\n• Агуулахын нярав\n• Лаб",
      },
      {
        title: "3. Нэр / Нууц үг оруулах",
        desc: "Роль сонгосны дараа нэвтрэх нэр болон нууц үгийг оруулна. Анхдагч: admin / admin.\nАдминистратор самбарын «Нэвтрэх мэдээлэл» таб дотроос роль бүрийн нууц үгийг солих боломжтой.",
        tip: "Нууц үгийг мэдэхгүй бол Администратортай холбогдоно уу.",
      },
      {
        title: "4. Самбар нээгдэх",
        desc: "Амжилттай нэвтэрсний дараа таны ролийн самбар автоматаар нээгдэнэ. Хаяг: /dashboard/[роль]",
      },
    ],
  },
  {
    id: "checkin",
    icon: <QrCode className="w-5 h-5" />,
    label: "QR Ирц бүртгэл — Бүх ажилтан",
    color: "text-green-400",
    roles: ["Бүх ажилтан"],
    steps: [
      {
        title: "Өглөөний ирц бүртгэл",
        desc: "Ажилд ирмэгцээ QR кодыг скан хийнэ:\n1. Утасны камераар байрандаа байрлуулсан QR кодыг скан хийнэ\n2. Эсвэл huvsgul-zam.mn/checkin хаяг руу шууд орно\n3. Ажилтны дугаараа оруулна (жишээ: EMP-001)\n4. «Ирлаа» товч дарна",
        tip: "08:00-аас хойш ирвэл хоцролтын минут автоматаар тооцогдоно.",
      },
      {
        title: "ХАБЭА баталгаажуулалт",
        desc: "Ирц бүртгэхдээ аюулгүй байдлын шалгалтыг заавал хийнэ:\n• Хувийн хамгаалах хэрэгсэл зүүсэн эсэх\n• Ажлын байрны аюулгүй байдлын дүгнэлт\n• «ХАБЭА баталгаажуулсан» checkbox тэмдэглэнэ",
      },
      {
        title: "Гарах цаг бүртгэх",
        desc: "Ажил дуусгаад гарахдаа дахин QR скан хийж «Гарлаа» товч дарна.\nЭнэ нь ажлын нийт цагийг тооцоолоход ашиглагдана.",
      },
    ],
  },
  {
    id: "supervisor",
    icon: <ClipboardList className="w-5 h-5" />,
    label: "Тасгийн ахлах — Supervisor",
    color: "text-blue-400",
    roles: ["SUPERVISOR"],
    steps: [
      {
        title: "Өдрийн даалгавар өгөх",
        desc: "Самбар → «Даалгавар» таб:\n1. «+ Шинэ даалгавар» товч дарна\n2. Ажилтан сонгоно\n3. Ажлын төрөл, байршил оруулна (жишээ: «Хөрс ухах — 2+400км»)\n4. Ашиглах тоног хэрэгслийг заана\n5. «Илгээх» товч дарна\n\nАжилтан өөрийн утсанд мэдэгдэл хүлээж авна.",
        tip: "Нэг өдөрт нэг ажилтанд хэд ч даалгавар өгч болно.",
      },
      {
        title: "Ажлын явцыг хянах",
        desc: "«Ирц» таб дотроос:\n• Өнөөдөр хэн ирсэн, хэн ирээгүйг харна\n• Хоцорсон ажилтны мэдээлэл шар өнгөөр тэмдэглэгдэнэ\n• ХАБЭА баталгаажуулаагүй хүн улаан тэмдэглэгдэнэ",
      },
      {
        title: "KPI үнэлгээ өгөх",
        desc: "«KPI» таб → ажилтан сонгоод:\n• Гүйцэтгэлийн хувь оруулна (0–150%)\n• Тайлбар нэмж болно\n• «Хадгалах» дарна\n\nАжилтны сарын урамшуулал KPI дундажаас автоматаар тооцогдоно.",
        tip: "100% = норм биелсэн. 120% = норм хэтэрсэн = урамшуулал нэмнэ.",
      },
    ],
  },
  {
    id: "engineer",
    icon: <FlaskConical className="w-5 h-5" />,
    label: "Инженер / Лаб — Engineer",
    color: "text-purple-400",
    roles: ["ENGINEER", "LAB"],
    steps: [
      {
        title: "Лабораторийн шинжилгээ бүртгэх",
        desc: "Инженер самбар → «Лаб QC» таб:\n1. «+ Шинэ дээж» товч дарна\n2. Материалын төрөл сонгоно (бетон / асфальт / хайрга)\n3. Шинжилгээний дүнг оруулна\n4. «Шалгах» товч дарвал БНбД нормтой автоматаар харьцуулна\n\n✅ Ногоон = норм хангасан\n❌ Улаан = норм хангаагүй → шалтгаан оруулах шаардлагатай",
        tip: "БНбД 81-013-2019 нормын бүрэн жагсаалт «Норм» таб дотор байна.",
      },
      {
        title: "Норм лавлагаа харах",
        desc: "«Норм» таб → ажлын төрлөөр хайна:\n• Экскаватор хэдэн м³ ухна (өдрийн норм)\n• Финишер хэдэн м² тавина\n• Хайрга нягтруулах норм гэх мэт 57+ норм байна",
      },
      {
        title: "AI үнэ тооцоолуур ашиглах",
        desc: "Самбар → «AI Тооцоолуур» таб:\n1. Материал сонгоно (бетон М300 гэх мэт)\n2. Хэмжээ оруулна (100 м³)\n3. «Тооцоол» товч дарна\n→ Зах зээлийн бодит үнийн тооцоо гарна",
      },
    ],
  },
  {
    id: "hr",
    icon: <Users className="w-5 h-5" />,
    label: "Хүний нөөц",
    color: "text-pink-400",
    roles: ["HR"],
    steps: [
      {
        title: "Ажилтан нэмэх",
        desc: "HR самбар → «Ажилтан» таб → «+ Шинэ ажилтан»:\n• Нэр, ажлын байр, утас\n• Нэвтрэх дугаар (жишээ: EMP-010)\n• Ажилд орсон огноо\n• Харьяа хэлтэс\n\n«Хадгалах» дарсны дараа QR ирцийн систем дэр шууд бүртгэгдэнэ.",
      },
      {
        title: "Лиценз / Сургалт хянах",
        desc: "«Лиценз» таб дотор:\n• Жолооны үнэмлэх, кран оператор, тэсэлгээчний зөвшөөрөл гэх мэт\n• Хугацаа дуусах 60 хоногийн өмнө систем автоматаар сануулна\n• Шар өнгө = Ойртож байна, Улаан = Дууссан",
        tip: "«Сургалт» таб дотор сургалтын хуваарь, дүнг хадгалж болно.",
      },
      {
        title: "Ирцийн тайлан",
        desc: "«Ирц» таб → он сар сонгоод:\n• Ажилтан тус бүрийн ирц, хоцролт, нийт цаг\n• Хоцролтын нийт минут → цагийн хасалт тооцоолоход ашиглана\n• PDF тайлан гаргах боломжтой",
      },
    ],
  },
  {
    id: "mechanic",
    icon: <Wrench className="w-5 h-5" />,
    label: "Механик — Mechanic",
    color: "text-orange-400",
    roles: ["MECHANIC"],
    steps: [
      {
        title: "Техникийн бүртгэл харах",
        desc: "Механик самбар → «Техник» таб:\n• Бүх машин, тоног хэрэгслийн жагсаалт\n• Бэлэн байдал: ✅ Бэлэн / ⚠️ Засварт байна\n• Дараагийн ТО хуваарь харагдана",
      },
      {
        title: "Өдрийн үзлэг бүртгэх",
        desc: "«Өдрийн үзлэг» таб:\n1. Машин сонгоно (улсын дугаараар)\n2. Шалгалтын бүх зүйлийг чагталдана:\n   • Тос, шингэн\n   • Дугуй даралт\n   • Гал тэсэргэч\n   • Аюулгүй байдлын хэрэгсэл\n3. Гэмтэл байвал зургаар бүртгэнэ\n4. «Илгээх» дарна",
        tip: "Ямар нэгэн гэмтэл бүртгэвэл Механикийн самбар дээр автоматаар мэдэгдэл гарна.",
      },
      {
        title: "ТО засвар бүртгэх",
        desc: "«ТО» таб:\n• TO-1 (жижиг): 250 мото/цаг тутамд\n• TO-2 (дунд): 500 мото/цаг тутамд\n• TO-3 (том): 1000 мото/цаг тутамд\n\nЗасвар хийсний дараа дуусгалт бүртгэж «Дуусгасан» статусд шилжүүлнэ.",
      },
      {
        title: "Онлайн зөвлөгөө (Jitsi уулзалт)",
        desc: "«Уулзалт» таб → «Уулзалт эхлүүлэх»:\n• Хол байрлах инженер, механиктай видеоөөр холбогдоно\n• Дэлгэцийг хуваалцаж байж зааварлаж болно\n• Уулзалт дуусгахдаа 2 удаа баталгаажуулалт хийнэ",
      },
    ],
  },
  {
    id: "warehouse",
    icon: <Package className="w-5 h-5" />,
    label: "Агуулахын нярав — Warehouse",
    color: "text-yellow-400",
    roles: ["WAREHOUSE"],
    steps: [
      {
        title: "Материал орлого бүртгэх",
        desc: "Агуулах самбар → «Орлого» таб:\n1. Материалын нэр сонгоно\n2. Тоо хэмжээ, нэгж оруулна\n3. Нийлүүлэгч, нэхэмжлэлийн дугаар\n4. «Хадгалах» дарна\n\nАвтоматаар нөөцөд нэмэгдэнэ.",
      },
      {
        title: "Материал зарлага бүртгэх",
        desc: "«Зарлага» таб:\n1. Материал сонгоно\n2. Хэдэн тонн/м³ гарсан оруулна\n3. Аль ажил, хэсэгт зориулсан гэдгийг тэмдэглэнэ\n4. «Хадгалах»\n\nНөөцийн үлдэгдэл автоматаар хасагдана.",
        tip: "Критик хэмжээнд хүрвэл улаан анхааруулга автоматаар гарна.",
      },
      {
        title: "Нөөцийн байдал харах",
        desc: "«Нөөц» таб:\n• Ногоон = Хангалттай нөөц\n• Шар = Анхаарах шаардлагатай (доод хэмжээнд ойртсон)\n• Улаан = Нөөц дууссан, яаралтай захиалах хэрэгтэй\n\nНормын үндэслэл: «1м³ асфальт = 0.052тн битум» гэсэн тооцоо нормын дагуу гарна.",
      },
    ],
  },
  {
    id: "admin",
    icon: <Settings className="w-5 h-5" />,
    label: "Администратор — Admin",
    color: "text-red-400",
    roles: ["ADMIN"],
    steps: [
      {
        title: "Вэбсайт мэдээлэл шинэчлэх",
        desc: "Admin самбар → «Вэбсайт» таб:\n• «Мэдээ нэмэх» → шинэ мэдээ/зар нийтлэх\n• Төслийн ахиц % шинэчлэх → вэбсайтад автоматаар харагдана\n• Видео линк нэмэх\n• Баг гишүүдийн мэдээлэл засах",
      },
      {
        title: "Нэвтрэх мэдээлэл тохируулах",
        desc: "«Нэвтрэх мэдээлэл» таб:\n• Роль бүрийн нэвтрэх нэр, нууц үгийг өөрчилнэ\n• «Засах» товч → шинэ нэр/нууц үг оруулна → «Хадгалах»\n\nАнхдагч нуут үгийг заавал солих хэрэгтэй!",
        tip: "Нийт 9 роль тус бүрт тусдаа нэвтрэх мэдээлэл тохируулж болно.",
      },
      {
        title: "Аюулын сануулга харах",
        desc: "«Мэдэгдэл» таб:\n• Дуусах гэж буй лиценз, үзлэг\n• Нөөц дутагдсан материал\n• 60 хоногийн өмнөөс системд харагдана",
      },
      {
        title: "Нэвтрэлтийн бүртгэл харах",
        desc: "«Бүртгэл» таб:\n• Хэн хэзээ нэвтэрсэн\n• Амжилтгүй нэвтрэх оролдлого\n• IP хаяг, роль бүрийн нэвтрэлтийн түүх\n• Роль бүрээр шүүж харах боломжтой",
      },
      {
        title: "KPI норм тохируулах",
        desc: "«KPI» таб:\n• ЗЗБНбД 81-013-2019 нормыг татах\n• Ажлын төрөл тус бүрийн өдрийн нормыг засах\n• Нэгж бүрийн урамшуулалтын дүнг тохируулах",
      },
    ],
  },
  {
    id: "board",
    icon: <BarChart2 className="w-5 h-5" />,
    label: "ТУЗ / Захирал — Board",
    color: "text-cyan-400",
    roles: ["BOARD"],
    steps: [
      {
        title: "Ерөнхий тойм харах",
        desc: "ТУЗ самбар нэвтэрмэгцээ автоматаар харагдах зүйлс:\n• Нийт ажилтны тоо, өнөөдрийн ирц\n• KPI дундаж гүйцэтгэл\n• Техникийн бэлэн байдал %\n• Лабораторийн шинжилгээний амжилтын хувь\n• Агуулахын нөөцийн дохио",
      },
      {
        title: "Тайлан харах",
        desc: "«Тайлан» хэсэг:\n• KPI тайлан — ажилтан тус бүрийн гүйцэтгэл\n• Үйлдвэрлэлийн тайлан — 3 үйлдвэрийн гаралт\n• Жилийн тайлан → PDF хэлбэрт гаргах боломжтой",
      },
      {
        title: "Онлайн уулзалт зохион байгуулах",
        desc: "«Уулзалт» таб → «Шинэ уулзалт»:\n• Уулзалтын нэр оруулна\n• Холбоосыг хамтран ажиллагсаддаа илгээнэ\n• Видео, дуу, дэлгэц хуваалцалт дэмжинэ",
      },
    ],
  },
  {
    id: "safety",
    icon: <ShieldCheck className="w-5 h-5" />,
    label: "ХАБЭА — Аюулгүй байдал",
    color: "text-green-500",
    roles: ["Бүх роль"],
    steps: [
      {
        title: "Өдрийн аюулгүй байдлын маягт",
        desc: "Supervisor / Safety самбар → «ХАБЭА» таб:\n• Өдөр тус бүрийн аюулгүй байдлын дүгнэлт\n• Дутагдалтай зүйл, эрсдэлийн тэмдэглэл\n• Гарын үсэг зурах (зургаар)\n\nАжилтан QR ирц бүртгэхдээ ХАБЭА checkbox-ийг заавал тэмдэглэх ёстой.",
      },
      {
        title: "Осол аваарийн бүртгэл",
        desc: "Ямар нэгэн осол гарвал:\n1. Supervisor самбар → «ХАБЭА» → «Осол бүртгэх»\n2. Болсон явдлыг дэлгэрэнгүй бичнэ\n3. Фото нотлох баримт оруулна\n4. Авсан арга хэмжээг тэмдэглэнэ\n→ Admin болон Board самбарт шууд мэдэгдэл очно",
        tip: "Аюулгүй байдлын мэдэгдлийн бүртгэл нь хуулийн шаардлагын дагуу хадгалагдана.",
      },
    ],
  },
];

export default function UserManual() {
  const [, setLocation] = useLocation();
  const [openSection, setOpenSection] = useState<string | null>("login");
  const [openStep, setOpenStep] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<string>("Бүгд");

  const roles = ["Бүгд", "ADMIN", "BOARD", "SUPERVISOR", "HR", "ENGINEER", "MECHANIC", "WAREHOUSE", "LAB"];

  const filtered = activeRole === "Бүгд"
    ? SECTIONS
    : SECTIONS.filter(s => s.roles.some(r => r === activeRole || r === "Бүх роль" || r === "Бүх ажилтан"));

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Header */}
      <div className="bg-[#0f172a] border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => setLocation("/select-role")}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
            data-testid="btn-back-manual"
          >
            <ArrowLeft className="w-4 h-4" />
            Буцах
          </button>
          <div className="flex items-center gap-3 ml-2">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-white font-bold text-base leading-tight">Хэрэглэгчийн Заавар</h1>
              <p className="text-slate-400 text-xs">Хөвсгөл зам ХХК — ERP систем</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Intro */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 mb-8">
          <div className="flex gap-3">
            <HardHat className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-300 font-semibold mb-1">Энэ заавар юуг тайлбарладаг вэ?</p>
              <p className="text-slate-300 text-sm leading-relaxed">
                Хөвсгөл зам ХХК-ийн ERP систем нь <strong className="text-white">9 роль</strong>-той хэрэглэгчдийг дэмждэг.
                Та доороос өөрийн ролийг сонгоод, тухайн самбарыг яаж ашиглахыг алхам алхмаар харна уу.
                Асуулт гарвал Администратортай холбогдоно уу.
              </p>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { icon: <Users className="w-4 h-4" />, label: "Нийт роль", value: "9", color: "text-blue-400" },
            { icon: <QrCode className="w-4 h-4" />, label: "QR ирц", value: "Бүх ажилтан", color: "text-green-400" },
            { icon: <ShieldCheck className="w-4 h-4" />, label: "ХАБЭА", value: "Заавал", color: "text-amber-400" },
            { icon: <FileText className="w-4 h-4" />, label: "Тайлан", value: "PDF хэлбэрт", color: "text-purple-400" },
          ].map((s, i) => (
            <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
              <div className={`flex justify-center mb-1 ${s.color}`}>{s.icon}</div>
              <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
              <div className="text-slate-400 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Role filter */}
        <div className="mb-6">
          <p className="text-slate-400 text-sm mb-3">Роль сонгоод өөрт хамаарах зааврыг харна уу:</p>
          <div className="flex flex-wrap gap-2">
            {roles.map(r => (
              <button
                key={r}
                onClick={() => setActiveRole(r)}
                data-testid={`btn-role-${r}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeRole === r
                    ? "bg-amber-500 text-black"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {filtered.map(section => (
            <div key={section.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              {/* Section header */}
              <button
                className="w-full flex items-center justify-between p-5 hover:bg-white/[0.03] transition-colors"
                onClick={() => setOpenSection(openSection === section.id ? null : section.id)}
                data-testid={`section-${section.id}`}
              >
                <div className="flex items-center gap-3">
                  <span className={section.color}>{section.icon}</span>
                  <span className="font-semibold text-white">{section.label}</span>
                  <div className="flex gap-1">
                    {section.roles.map(r => (
                      <span key={r} className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-400">{r}</span>
                    ))}
                  </div>
                </div>
                {openSection === section.id
                  ? <ChevronDown className="w-4 h-4 text-slate-400" />
                  : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>

              {/* Steps */}
              {openSection === section.id && (
                <div className="border-t border-white/10">
                  {section.steps.map((step, si) => (
                    <div key={si} className="border-b border-white/5 last:border-0">
                      <button
                        className="w-full flex items-start gap-4 p-4 hover:bg-white/[0.02] transition-colors text-left"
                        onClick={() => setOpenStep(openStep === `${section.id}-${si}` ? null : `${section.id}-${si}`)}
                        data-testid={`step-${section.id}-${si}`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${section.color} bg-white/5`}>
                          {si + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium">{step.title}</p>
                          {openStep === `${section.id}-${si}` && (
                            <div className="mt-3 space-y-3">
                              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{step.desc}</p>
                              {step.tip && (
                                <div className="flex gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                                  <Star className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                  <p className="text-amber-300 text-sm">{step.tip}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {openStep === `${section.id}-${si}`
                          ? <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                          : <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick reference */}
        <div className="mt-10 bg-[#0f172a] border border-white/10 rounded-xl p-6">
          <h2 className="text-white font-bold text-lg mb-5 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Хурдан лавлагаа
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: <LogIn className="w-4 h-4" />, title: "Нэвтрэх хаяг", desc: "huvsgul-zam.mn → ERP Нэвтрэх", color: "text-blue-400" },
              { icon: <QrCode className="w-4 h-4" />, title: "QR Ирц", desc: "huvsgul-zam.mn/checkin", color: "text-green-400" },
              { icon: <CheckCircle className="w-4 h-4" />, title: "Анхдагч нууц үг", desc: "admin / admin (заавал сол!)", color: "text-amber-400" },
              { icon: <Clock className="w-4 h-4" />, title: "Ажлын эхлэх цаг", desc: "08:00 — хоцролт тооцох суурь", color: "text-purple-400" },
              { icon: <Fuel className="w-4 h-4" />, title: "Түлшний бүртгэл", desc: "Механик самбар → Техник → Түлш", color: "text-orange-400" },
              { icon: <Building2 className="w-4 h-4" />, title: "3 Үйлдвэр", desc: "Асфальт · Бетон · Бутлах", color: "text-cyan-400" },
              { icon: <Truck className="w-4 h-4" />, title: "Машин үзлэг", desc: "huvsgul-zam.mn/vehicle-inspection", color: "text-red-400" },
              { icon: <FileText className="w-4 h-4" />, title: "PDF Тайлан", desc: "Самбарын «Тайлан» → «Татах»", color: "text-pink-400" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-white/5 rounded-lg p-3">
                <span className={`${item.color} mt-0.5`}>{item.icon}</span>
                <div>
                  <p className="text-white text-sm font-medium">{item.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">Хөвсгөл зам ХХК — ERP Систем · Асуулт гарвал Администратортай холбогдоно уу</p>
          <p className="text-slate-600 text-xs mt-1">huvsgulzamllc@gmail.com</p>
        </div>
      </div>
    </div>
  );
}
