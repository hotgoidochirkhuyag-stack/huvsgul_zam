import { useLocation } from "wouter";
import { ArrowLeft, Building2, HardHat, Factory, Users, LayoutDashboard, ClipboardList, UserCircle } from "lucide-react";

const SYSTEM_ROLES = [
  {
    group: "ERP — Ажилтны тайлан",
    items: [
      { name: "Оффис", desc: "Өдрийн тайлан бөглөх", path: "/erp/report?dept=office", icon: Building2, color: "blue" },
      { name: "Талбайн ажилтан", desc: "Гүйцэтгэлийн тайлан", path: "/erp/report?dept=field", icon: HardHat, color: "amber" },
      { name: "Үйлдвэрийн ажилтан", desc: "Бүтээгдэхүүний тайлан", path: "/erp/report?dept=plant", icon: Factory, color: "green" },
    ],
  },
  {
    group: "Удирдлагын систем",
    items: [
      { name: "Хүний нөөц", desc: "Ажилтан бүртгэл, QR карт", path: "/admin?role=HR", icon: UserCircle, color: "purple" },
      { name: "Ахлах — Даалгавар", desc: "Ажилтанд даалгавар тавих", path: "/admin?role=SUPERVISOR", icon: ClipboardList, color: "blue" },
      { name: "Онлайн хурал", desc: "BOARD систем", path: "/admin?role=BOARD", icon: Users, color: "indigo" },
      { name: "Төслийн хяналт", desc: "PROJECT систем", path: "/admin?role=PROJECT", icon: ClipboardList, color: "blue" },
      { name: "Үйлдвэрлэлийн хяналт", desc: "ADMIN систем", path: "/admin?role=ADMIN", icon: LayoutDashboard, color: "slate" },
      { name: "Техникийн дэмжлэг", desc: "ENGINEER систем", path: "/admin?role=ENGINEER", icon: HardHat, color: "red" },
    ],
  },
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  blue:   { bg: "bg-blue-600/10",   border: "border-blue-500/20 hover:border-blue-400/60",   text: "text-blue-300",   icon: "text-blue-400" },
  amber:  { bg: "bg-amber-600/10",  border: "border-amber-500/20 hover:border-amber-400/60",  text: "text-amber-300",  icon: "text-amber-400" },
  green:  { bg: "bg-green-600/10",  border: "border-green-500/20 hover:border-green-400/60",  text: "text-green-300",  icon: "text-green-400" },
  purple: { bg: "bg-purple-600/10", border: "border-purple-500/20 hover:border-purple-400/60", text: "text-purple-300", icon: "text-purple-400" },
  indigo: { bg: "bg-indigo-600/10", border: "border-indigo-500/20 hover:border-indigo-400/60", text: "text-indigo-300", icon: "text-indigo-400" },
  slate:  { bg: "bg-slate-600/10",  border: "border-slate-500/20 hover:border-slate-400/60",  text: "text-slate-300",  icon: "text-slate-400" },
  red:    { bg: "bg-red-600/10",    border: "border-red-500/20 hover:border-red-400/60",    text: "text-red-300",    icon: "text-red-400" },
};

export default function RoleSelection() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#020617] text-white relative">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[35%] h-[35%] bg-amber-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <button onClick={() => setLocation("/")} className="flex items-center gap-2 text-slate-400 hover:text-white transition-all mb-10">
          <ArrowLeft size={18} /> Нүүр хуудас
        </button>

        <div className="mb-10 text-center">
          <h1 className="text-2xl font-black uppercase tracking-widest text-white mb-2">Системээ сонгоно уу</h1>
          <p className="text-slate-400 text-sm">Хөвсгөл Зам ХХК — Дотоод систем</p>
        </div>

        {SYSTEM_ROLES.map((group) => (
          <div key={group.group} className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-3 px-1">{group.group}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {group.items.map((item) => {
                const Icon = item.icon;
                const colors = COLOR_MAP[item.color] ?? COLOR_MAP.slate;
                return (
                  <button
                    key={item.name}
                    onClick={() => setLocation(item.path)}
                    className={`p-5 rounded-2xl border ${colors.bg} ${colors.border} text-left transition-all duration-200 group`}
                  >
                    <Icon className={`w-6 h-6 mb-3 ${colors.icon}`} />
                    <p className={`font-bold text-sm ${colors.text}`}>{item.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
