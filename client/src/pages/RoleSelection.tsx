import { useLocation } from "wouter";
import {
  ArrowLeft, Building2, HardHat, Factory, LayoutDashboard,
  ClipboardList, UserCircle, Package, FlaskConical,
  Wrench, BarChart3, Truck
} from "lucide-react";

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  blue:    { bg: "bg-blue-600/10",    border: "border-blue-500/20 hover:border-blue-400/60",    text: "text-blue-300",    icon: "text-blue-400"    },
  amber:   { bg: "bg-amber-600/10",   border: "border-amber-500/20 hover:border-amber-400/60",   text: "text-amber-300",   icon: "text-amber-400"   },
  green:   { bg: "bg-green-600/10",   border: "border-green-500/20 hover:border-green-400/60",   text: "text-green-300",   icon: "text-green-400"   },
  purple:  { bg: "bg-purple-600/10",  border: "border-purple-500/20 hover:border-purple-400/60",  text: "text-purple-300",  icon: "text-purple-400"  },
  indigo:  { bg: "bg-indigo-600/10",  border: "border-indigo-500/20 hover:border-indigo-400/60",  text: "text-indigo-300",  icon: "text-indigo-400"  },
  slate:   { bg: "bg-slate-600/10",   border: "border-slate-500/20 hover:border-slate-400/60",   text: "text-slate-300",   icon: "text-slate-400"   },
  red:     { bg: "bg-red-600/10",     border: "border-red-500/20 hover:border-red-400/60",       text: "text-red-300",     icon: "text-red-400"     },
  orange:  { bg: "bg-orange-600/10",  border: "border-orange-500/20 hover:border-orange-400/60",  text: "text-orange-300",  icon: "text-orange-400"  },
  emerald: { bg: "bg-emerald-600/10", border: "border-emerald-500/20 hover:border-emerald-400/60", text: "text-emerald-300", icon: "text-emerald-400" },
  cyan:    { bg: "bg-cyan-600/10",    border: "border-cyan-500/20 hover:border-cyan-400/60",      text: "text-cyan-300",    icon: "text-cyan-400"    },
  teal:    { bg: "bg-teal-600/10",    border: "border-teal-500/20 hover:border-teal-400/60",      text: "text-teal-300",    icon: "text-teal-400"    },
};

type Card = { name: string; desc: string; path: string; icon: any; color: string };

const ROW1: Card[] = [
  { name: "Хүний нөөц",              desc: "Ажилтан бүртгэл, QR карт, KPI",  path: "/admin/HR",        icon: UserCircle,     color: "purple"  },
  { name: "Техникийн бэлэн байдал",  desc: "Машин, техник, шатахуун бүртгэл", path: "/admin/MECHANIC",  icon: Truck,          color: "orange"  },
  { name: "Агуулахын нөөц",          desc: "Нормативт тулгуурласан нөөц",     path: "/admin/WAREHOUSE", icon: Package,        color: "amber"   },
  { name: "Лаборатори",              desc: "Чанарын шалгалт, БНбД норм",      path: "/admin/LAB",       icon: FlaskConical,   color: "emerald" },
];

const ROW2: Card[] = [
  { name: "Төлөвлөлт / Гүйцэтгэл",  desc: "Ажлын фронт, далд акт, даалгавар", path: "/admin/SUPERVISOR", icon: ClipboardList,   color: "blue"   },
  { name: "Админ самбар",            desc: "ADMIN систем — бүх хяналт",         path: "/admin/ADMIN",      icon: LayoutDashboard, color: "slate"   },
  { name: "Техникийн дэмжлэг",       desc: "Инженер, үйлдвэрийн хяналт",       path: "/admin/ENGINEER",   icon: Wrench,          color: "red"     },
  { name: "Төслийн хөгжүүлэлт",      desc: "Бүртгэл, хүсэлт, KPI дүн",        path: "/admin/PROJECT",    icon: BarChart3,       color: "teal"    },
];

const ERP_REPORTS: Card[] = [
  { name: "Оффис",              desc: "Өдрийн тайлан бөглөх",    path: "/erp/report?dept=office", icon: Building2,  color: "blue"   },
  { name: "Талбайн ажилтан",    desc: "Гүйцэтгэлийн тайлан",     path: "/erp/report?dept=field",  icon: HardHat,    color: "amber"  },
  { name: "Үйлдвэрийн ажилтан", desc: "Бүтээгдэхүүний тайлан",   path: "/erp/report?dept=plant",  icon: Factory,    color: "green"  },
];


function CardButton({ item, onClick }: { item: Card; onClick: () => void }) {
  const Icon = item.icon;
  const c = COLOR_MAP[item.color] ?? COLOR_MAP.slate;
  return (
    <button onClick={onClick} data-testid={`role-card-${item.name}`}
      className={`p-5 rounded-2xl border ${c.bg} ${c.border} text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]`}>
      <Icon className={`w-6 h-6 mb-3 ${c.icon}`} />
      <p className={`font-bold text-sm ${c.text}`}>{item.name}</p>
      <p className="text-xs text-slate-500 mt-1 leading-snug">{item.desc}</p>
    </button>
  );
}

export default function RoleSelection() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#020617] text-white relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[35%] h-[35%] bg-amber-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <button onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-all mb-10">
          <ArrowLeft size={18} /> Нүүр хуудас
        </button>

        <div className="mb-10 text-center">
          <h1 className="text-2xl font-black uppercase tracking-widest text-white mb-2">Системээ сонгоно уу</h1>
          <p className="text-slate-400 text-sm">Хөвсгөл Зам ХХК — Дотоод систем</p>
        </div>

        {/* ── Дээд мөр: Операцийн самбарууд ────────────────────────────────── */}
        <div className="mb-2">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-3 px-1">
            Операцийн самбар
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ROW1.map(item => (
              <CardButton key={item.name} item={item} onClick={() => {
                localStorage.removeItem("adminToken");
                localStorage.removeItem("userRole");
                localStorage.setItem("pendingRole", item.path.split('/').pop() ?? '');
                setLocation(item.path);
              }} />
            ))}
          </div>
        </div>

        {/* ── Доод мөр: Удирдлагын самбарууд ───────────────────────────────── */}
        <div className="mb-8 mt-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-3 px-1">
            Удирдлагын самбар
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ROW2.map(item => (
              <CardButton key={item.name} item={item} onClick={() => {
                localStorage.removeItem("adminToken");
                localStorage.removeItem("userRole");
                localStorage.setItem("pendingRole", item.path.split('/').pop() ?? '');
                setLocation(item.path);
              }} />
            ))}
          </div>
        </div>

        {/* ── ERP Ажилтны өдрийн тайлан ────────────────────────────────────── */}
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-3 px-1">
            ERP — Ажилтны өдрийн тайлан
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ERP_REPORTS.map(item => (
              <CardButton key={item.name} item={item} onClick={() => setLocation(item.path)} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
