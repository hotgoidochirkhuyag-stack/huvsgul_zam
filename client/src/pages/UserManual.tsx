import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, QrCode, Settings, Users, Wrench,
  Package, FlaskConical, ClipboardList, BarChart2,
  ShieldCheck, LogIn, ChevronRight, Monitor
} from "lucide-react";

const ROLES = [
  {
    key: "all",
    icon: <LogIn className="w-5 h-5" />,
    color: "bg-slate-700",
    accent: "border-slate-500",
    title: "Нэвтрэх",
    sub: "Бүх хэрэглэгч",
    steps: [
      { num: 1, text: "Сайт нээж баруун дээд булан дахь «ERP Нэвтрэх» товч дарна" },
      { num: 2, text: "Жагсаалтаас өөрийн харьяалалыг сонгоно" },
      { num: 3, text: "Нэвтрэх нэр, нууц үг оруулаад «Нэвтрэх» дарна" },
      { num: 4, text: "Самбар автоматаар нээгдэнэ" },
    ],
    note: "Анхдагч: admin / admin — Администратор солих боломжтой",
  },
  {
    key: "checkin",
    icon: <QrCode className="w-5 h-5" />,
    color: "bg-green-900/60",
    accent: "border-green-500",
    title: "QR Ирц",
    sub: "Бүх ажилтан",
    steps: [
      { num: 1, text: "Байранд байрлуулсан QR кодыг утасны камераар скан хийнэ" },
      { num: 2, text: "Ажилтны дугаараа оруулна (жишээ: EMP-001)" },
      { num: 3, text: "ХАБЭА шалгалтыг тэмдэглэнэ" },
      { num: 4, text: "«Ирлаа» товч дарна — гарахдаа «Гарлаа» дарна" },
    ],
    note: "08:00-аас хойш ирвэл хоцролт автоматаар тооцогдоно",
  },
  {
    key: "supervisor",
    icon: <ClipboardList className="w-5 h-5" />,
    color: "bg-blue-900/60",
    accent: "border-blue-500",
    title: "Тасгийн ахлах",
    sub: "Supervisor",
    steps: [
      { num: 1, text: "«Даалгавар» таб → «+ Шинэ» → ажилтан, ажлын төрөл, байршил оруулна" },
      { num: 2, text: "«Ирц» таб — өнөөдрийн ирц, хоцролт, ХАБЭА байдлыг харна" },
      { num: 3, text: "«KPI» таб → ажилтан сонгоод гүйцэтгэлийн хувь оруулна" },
      { num: 4, text: "100% = норм биелсэн · 120%+ = урамшуулал нэмнэ" },
    ],
    note: "Нэг ажилтанд өдөрт хэд ч даалгавар өгч болно",
  },
  {
    key: "hr",
    icon: <Users className="w-5 h-5" />,
    color: "bg-purple-900/60",
    accent: "border-purple-500",
    title: "Хүний нөөц",
    sub: "HR",
    steps: [
      { num: 1, text: "«Ажилтан» таб → «+ Шинэ» → нэр, ажлын байр, нэвтрэх дугаар оруулна" },
      { num: 2, text: "«Лиценз» таб — дуусах хугацааг хянана (60 хоногийн өмнө сануулна)" },
      { num: 3, text: "«Сургалт» таб — хуваарь, дүн бүртгэнэ" },
      { num: 4, text: "«Ирц» таб → сар сонгоод PDF тайлан гаргана" },
    ],
    note: "Шар = ойртсон · Улаан = дууссан",
  },
  {
    key: "mechanic",
    icon: <Wrench className="w-5 h-5" />,
    color: "bg-orange-900/60",
    accent: "border-orange-500",
    title: "Механик",
    sub: "Mechanic",
    steps: [
      { num: 1, text: "«Техник» таб — машин бүрийн бэлэн байдал, дараагийн ТО хуваарийг харна" },
      { num: 2, text: "«Өдрийн үзлэг» → машин сонгоод бүх зүйлийг шалгаад «Илгээх» дарна" },
      { num: 3, text: "ТО-1: 250 м/цаг · ТО-2: 500 м/цаг · ТО-3: 1000 м/цаг" },
      { num: 4, text: "Засвар дууссан бол «Дуусгасан» статусд шилжүүлнэ" },
    ],
    note: "«Уулзалт» таб — хол байгаа инженертэй видеоөөр зөвлөлдөнө",
  },
  {
    key: "warehouse",
    icon: <Package className="w-5 h-5" />,
    color: "bg-yellow-900/60",
    accent: "border-yellow-500",
    title: "Агуулах",
    sub: "Warehouse",
    steps: [
      { num: 1, text: "«Орлого» — материал, тоо хэмжээ, нийлүүлэгч оруулна → нөөцөд автоматаар нэмнэ" },
      { num: 2, text: "«Зарлага» — гарсан материал, аль ажилд зориулсан гэдгийг тэмдэглэнэ" },
      { num: 3, text: "«Нөөц» — Ногоон: хангалттай · Шар: анхаарах · Улаан: дууссан" },
      { num: 4, text: "Критик хэмжээнд хүрвэл систем автоматаар мэдэгдэл өгнө" },
    ],
    note: "Нормын үндэслэл: 1м³ асфальт = 0.052тн битум гэх мэт",
  },
  {
    key: "engineer",
    icon: <FlaskConical className="w-5 h-5" />,
    color: "bg-violet-900/60",
    accent: "border-violet-500",
    title: "Инженер / Лаб",
    sub: "Engineer · Lab",
    steps: [
      { num: 1, text: "«Лаб QC» → «+ Шинэ дээж» → материал сонгоод шинжилгээний дүн оруулна" },
      { num: 2, text: "«Шалгах» дарвал БНбД нормтой автоматаар харьцуулна" },
      { num: 3, text: "Ногоон = норм хангасан · Улаан = норм хангаагүй" },
      { num: 4, text: "«AI Тооцоолуур» — материал, хэмжээ оруулахад зах зээлийн үнэ гарна" },
    ],
    note: "57+ норм — «Норм» таб дотор хайж харах боломжтой",
  },
  {
    key: "admin",
    icon: <Settings className="w-5 h-5" />,
    color: "bg-red-900/60",
    accent: "border-red-500",
    title: "Администратор",
    sub: "Admin",
    steps: [
      { num: 1, text: "«Вэбсайт» таб — мэдээ, төслийн ахиц, видео шинэчилнэ" },
      { num: 2, text: "«Нэвтрэх мэдээлэл» — харьяалал бүрийн нэр, нууц үгийг тохируулна" },
      { num: 3, text: "«Мэдэгдэл» — дуусах лиценз, дутагдсан материалын сануулга" },
      { num: 4, text: "«Бүртгэл» — нэвтрэлтийн түүх, амжилтгүй оролдлогыг хянана" },
    ],
    note: "Анхдагч нууц үгийг заавал солих хэрэгтэй",
  },
  {
    key: "board",
    icon: <BarChart2 className="w-5 h-5" />,
    color: "bg-cyan-900/60",
    accent: "border-cyan-500",
    title: "ТУЗ / Захирал",
    sub: "Board",
    steps: [
      { num: 1, text: "Нүүр хуудас — ирц, KPI дундаж, техникийн бэлэн байдал нэг дороос харна" },
      { num: 2, text: "«KPI» таб — ажилтан тус бүрийн гүйцэтгэлийн хувь" },
      { num: 3, text: "«Үйлдвэр» таб — 3 үйлдвэрийн өдрийн гаралт" },
      { num: 4, text: "«Тайлан» → PDF хэлбэрт татаж авна" },
    ],
    note: "«Уулзалт» таб — хурал зохион байгуулах, видео холбоос илгээх",
  },
  {
    key: "safety",
    icon: <ShieldCheck className="w-5 h-5" />,
    color: "bg-emerald-900/60",
    accent: "border-emerald-500",
    title: "ХАБЭА",
    sub: "Бүх хэрэглэгч",
    steps: [
      { num: 1, text: "QR ирц бүртгэхдээ ХАБЭА checkbox-ийг заавал тэмдэглэнэ" },
      { num: 2, text: "Supervisor → «ХАБЭА» таб → өдрийн аюулгүй байдлын дүгнэлт оруулна" },
      { num: 3, text: "Осол гарвал → «Осол бүртгэх» → Admin, Захиралд шууд мэдэгдэл очно" },
      { num: 4, text: "Бүх бүртгэл хуулийн шаардлагын дагуу хадгалагдана" },
    ],
    note: "ХАБЭА баталгаажуулаагүй хүн самбар дотор улаанаар тэмдэглэгдэнэ",
  },
];

const QUICK = [
  { label: "Нэвтрэх хаяг", value: "huvsgul-zam.mn → ERP Нэвтрэх" },
  { label: "QR Ирц", value: "huvsgul-zam.mn/checkin" },
  { label: "Машин үзлэг", value: "huvsgul-zam.mn/vehicle-inspection" },
  { label: "Анхдагч нууц үг", value: "admin / admin" },
  { label: "Ажлын эхлэх цаг", value: "08:00" },
  { label: "Лиценз сануулах", value: "60 хоногийн өмнө" },
];

export default function UserManual() {
  const [, setLocation] = useLocation();
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Header */}
      <div className="bg-[#0f172a] border-b border-white/10 px-5 py-4 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={() => setLocation("/select-role")}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
          data-testid="btn-back-manual"
        >
          <ArrowLeft className="w-4 h-4" /> Буцах
        </button>
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-amber-400" />
          <span className="text-white font-bold text-sm">Хэрэглэгчийн заавар</span>
        </div>
        <div className="text-slate-500 text-xs">Хөвсгөл зам ХХК</div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-3">
        {/* Intro bar */}
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 mb-6">
          <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <p className="text-amber-300 text-sm">Харьяалалаа дарж нээнэ үү</p>
        </div>

        {/* Role cards */}
        {ROLES.map(r => (
          <div
            key={r.key}
            className={`border rounded-xl overflow-hidden transition-all cursor-pointer ${
              active === r.key ? r.accent : "border-white/10"
            }`}
            onClick={() => setActive(active === r.key ? null : r.key)}
            data-testid={`card-${r.key}`}
          >
            {/* Card header */}
            <div className={`flex items-center justify-between px-5 py-4 ${r.color}`}>
              <div className="flex items-center gap-3">
                <div className="text-white/80">{r.icon}</div>
                <div>
                  <p className="text-white font-semibold leading-tight">{r.title}</p>
                  <p className="text-white/50 text-xs">{r.sub}</p>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 text-white/40 transition-transform ${active === r.key ? "rotate-90" : ""}`} />
            </div>

            {/* Steps */}
            {active === r.key && (
              <div className="bg-[#0f172a] px-5 py-4 space-y-3">
                {r.steps.map(s => (
                  <div key={s.num} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/60 shrink-0 mt-0.5">
                      {s.num}
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">{s.text}</p>
                  </div>
                ))}
                {r.note && (
                  <div className="mt-3 pt-3 border-t border-white/10 flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                    <p className="text-amber-400/80 text-xs">{r.note}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Quick reference */}
        <div className="mt-8 border border-white/10 rounded-xl overflow-hidden">
          <div className="bg-white/5 px-5 py-3 border-b border-white/10">
            <p className="text-white font-semibold text-sm">Хурдан лавлагаа</p>
          </div>
          <div className="divide-y divide-white/5">
            {QUICK.map((q, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <span className="text-slate-500 text-sm">{q.label}</span>
                <span className="text-white text-sm font-medium">{q.value}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs pt-4">
          Асуулт гарвал: huvsgulzamllc@gmail.com
        </p>
      </div>
    </div>
  );
}
