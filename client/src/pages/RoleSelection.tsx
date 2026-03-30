import { useLocation } from "wouter";
import { 
  ArrowLeft, Building2, HardHat, Factory, LayoutDashboard, 
  ClipboardList, UserCircle, Package, FlaskConical, 
  Wrench, BarChart3, Truck, BookOpen, TrendingUp 
} from "lucide-react";

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  blue:    { bg: "bg-blue-600/10",    border: "border-blue-500/20 hover:border-blue-400/60",    text: "text-blue-300",    icon: "text-blue-400"    },
  amber:   { bg: "bg-amber-600/10",   border: "border-amber-500/20 hover:border-amber-400/60",   text: "text-amber-300",   icon: "text-amber-400"   },
  green:   { bg: "bg-green-600/10",   border: "border-green-500/20 hover:border-green-400/60",   text: "text-green-300",   icon: "text-green-400"   },
  purple:  { bg: "bg-purple-600/10",  border: "border-purple-500/20 hover:border-purple-400/60",  text: "text-purple-300",  icon: "text-purple-400"  },
  orange:  { bg: "bg-orange-600/10",  border: "border-orange-500/20 hover:border-orange-400/60",  text: "text-orange-300",  icon: "text-orange-400"  },
  emerald: { bg: "bg-emerald-600/10", border: "border-emerald-500/20 hover:border-emerald-400/60", text: "text-emerald-300", icon: "text-emerald-400" },
  slate:   { bg: "bg-slate-600/10",   border: "border-slate-500/20 hover:border-slate-400/60",   text: "text-slate-300",   icon: "text-slate-400"   },
  blue2:   { bg: "bg-sky-600/10",     border: "border-sky-500/20 hover:border-sky-400/60",     text: "text-sky-300",     icon: "text-sky-400"     },
  teal:    { bg: "bg-teal-600/10",    border: "border-teal-500/20 hover:border-teal-400/60",    text: "text-teal-300",    icon: "text-teal-400"    },
  red:     { bg: "bg-red-600/10",     border: "border-red-500/20 hover:border-red-400/60",     text: "text-red-300",     icon: "text-red-400"     },
};

type Card = { name: string; desc: string; path: string; icon: any; color: string };

const ROW1: Card[] = [
  { name: "Хүний нөөц",             desc: "Ажилтан бүртгэл, QR карт, KPI",  path: "/admin/HR",         icon: UserCircle,     color: "purple"  },
  { name: "Техник хяналт",          desc: "Машин механизм, засвар, шатахуун", path: "/admin/MECHANIC",  icon: Truck,          color: "orange"  },
  { name: "Агуулах & Материал",     desc: "Нөөцийн удирдлага, үлдэгдэл",      path: "/admin/WAREHOUSE", icon: Package,        color: "amber"   },
  { name: "Чанар & Лаборатори",     desc: "Сорилт шинжилгээ, БНбД норм",      path: "/admin/LAB",        icon: FlaskConical,   color: "emerald" },
];

const ROW2: Card[] = [
  { name: "Үйлдвэрийн ",            desc: "Зураг төсөл, техникийн дэмжлэг",   path: "/admin/ENGINEER",   icon: Wrench,          color: "red"     },
  { name: "Талбайн удирдлага",      desc: "Гүйцэтгэл, ажлын фронт, акт",     path: "/admin/SUPERVISOR", icon: ClipboardList,   color: "blue2"    },
  { name: "Төслийн хөгжүүлэлт",      desc: "Тендер, гэрээ, KPI үзүүлэлт",     path: "/admin/PROJECT",    icon: BarChart3,       color: "teal"    },
  { name: "Борлуулалт & Маркетинг",  desc: "Захиалга, өртөг, борлуулалт",     path: "/admin/SALES",      icon: TrendingUp,      color: "green"   },
];

const ADMIN_CARD: Card = { 
  name: "ТУЗ-ын нэгдсэн самбар", 
  desc: "Гүйцэтгэх удирдлагын хяналтын цонх", 
  path: "/admin/ADMIN", 
  icon: LayoutDashboard, 
  color: "slate" 
};

const ERP_REPORTS: Card[] = [
  { name: "Оффис",       desc: "Өдрийн тайлан бөглөх", path: "/erp/report?dept=office", icon: Building2, color: "blue"  },
  { name: "Талбай",      desc: "Гүйцэтгэлийн тайлан",  path: "/erp/report?dept=field",  icon: HardHat,    color: "amber" },
  { name: "Үйлдвэр",     desc: "Бүтээгдэхүүний тайлан", path: "/erp/report?dept=plant",  icon: Factory,    color: "green" },
];

function CardButton({ item, onClick }: { item: Card; onClick: () => void }) {
  const Icon = item.icon;
  const c = COLOR_MAP[item.color] ?? COLOR_MAP.slate;
  return (
    <button onClick={onClick} className={`p-5 rounded-2xl border ${c.bg} ${c.border} text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]`}>
      <Icon className={`w-6 h-6 mb-3 ${c.icon}`} />
      <p className={`font-bold text-sm ${c.text}`}>{item.name}</p>
      <p className="text-xs text-slate-500 mt-1 leading-snug">{item.desc}</p>
    </button>
  );
}

export default function RoleSelection() {
  const [, setLocation] = useLocation();

  const handleRoute = (path: string) => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("userRole");
    localStorage.setItem("pendingRole", path.split('/').pop() ?? '');
    setLocation(path);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white relative font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[35%] h-[35%] bg-amber-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-10">
          <button onClick={() => setLocation("/")} className="flex items-center gap-2 text-slate-400 hover:text-white transition-all text-sm">
            <ArrowLeft size={16} /> Нүүр хуудас
          </button>
          <button onClick={() => setLocation("/manual")} className="flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-all text-sm border border-amber-500/30 px-3 py-1.5 rounded-lg bg-amber-500/5">
            <BookOpen size={15} /> Заавар
          </button>
        </div>

        <div className="mb-12 text-center">
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white mb-2 italic">Хөвсгөл Зам ХХК</h1>
          <p className="text-slate-500 text-xs font-bold tracking-[0.3em] uppercase">ERP — Удирдлагын нэгдсэн систем</p>
        </div>

        {/* ROW 1 */}
        <div className="mb-10">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500/80 mb-4 px-1 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
            Үйлдвэрлэл, Үйл ажиллагааны бааз
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {ROW1.map(item => (
              <CardButton key={item.name} item={item} onClick={() => handleRoute(item.path)} />
            ))}
          </div>
        </div>

        {/* ROW 2 */}
        <div className="mb-10">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500/80 mb-4 px-1 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
            Төсөл, Үйлдвэрлэлийн удирдлага
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {ROW2.map(item => (
              <CardButton key={item.name} item={item} onClick={() => handleRoute(item.path)} />
            ))}
          </div>
        </div>

        {/* ТУЗ */}
        <div className="mb-12 pt-6 border-t border-white/5">
          <div className="max-w-xs">
            <CardButton item={ADMIN_CARD} onClick={() => handleRoute(ADMIN_CARD.path)} />
          </div>
        </div>

        {/* ТАЙЛАН */}
        <div className="mb-6">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-4 px-1">
      Өдөр тутмын тайлан
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ERP_REPORTS.map(item => (
              <CardButton key={item.name} item={item} onClick={() => setLocation(item.path)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}