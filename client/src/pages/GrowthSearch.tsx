import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, TrendingUp, ChevronRight, HardHat, Building2, Factory, ArrowLeft } from "lucide-react";

const DEPT: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  office: { label: "Оффис",   icon: Building2, color: "text-blue-400",  bg: "bg-blue-500/10" },
  field:  { label: "Талбай",  icon: HardHat,   color: "text-amber-400", bg: "bg-amber-500/10" },
  plant:  { label: "Үйлдвэр", icon: Factory,   color: "text-green-400", bg: "bg-green-500/10" },
};

export default function GrowthSearch() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");

  const { data: _raw, isLoading } = useQuery<any>({
    queryKey: ["/api/erp/employees-public"],
    queryFn: () => fetch("/api/erp/employees").then(r => r.json()),
  });
  const employees: any[] = Array.isArray(_raw) ? _raw : [];

  const filtered = useMemo(() =>
    search.trim().length < 1
      ? employees
      : employees.filter(e =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          (e.role ?? "").toLowerCase().includes(search.toLowerCase())
        ),
    [employees, search]
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col">
      {/* Header */}
      <div className="bg-slate-900/80 border-b border-white/10 px-5 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={() => setLocation("/checkin")}
            className="p-2 hover:bg-white/5 rounded-lg transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/15 rounded-xl">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="font-black text-base text-white tracking-wide">Миний өсөлт</p>
              <p className="text-xs text-slate-500">Ур чадвар · KPI · Цалин</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-md mx-auto w-full px-4 pt-6 pb-10">
        {/* Хайлт */}
        <div className="relative mb-5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Нэрээрээ хайна уу..."
            data-testid="input-growth-search"
            className="w-full bg-slate-800/70 border border-white/10 rounded-2xl pl-10 pr-4 py-3.5 text-white text-sm outline-none focus:border-amber-500/40 transition-all"
          />
        </div>

        {isLoading && (
          <div className="text-center py-16 text-slate-500 text-sm">Уншиж байна...</div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16 text-slate-500 text-sm">
            "{search}" нэртэй ажилтан олдсонгүй
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((emp: any) => {
            const dept = DEPT[emp.department] ?? DEPT.field;
            const Icon = dept.icon;
            return (
              <button
                key={emp.id}
                onClick={() => setLocation(`/employee/${emp.id}`)}
                data-testid={`button-growth-emp-${emp.id}`}
                className="w-full flex items-center gap-3 p-4 bg-slate-800/50 hover:bg-slate-700/60 border border-white/8 hover:border-amber-500/25 rounded-2xl transition-all text-left group"
              >
                <div className={`p-2.5 ${dept.bg} rounded-xl`}>
                  <Icon className={`w-5 h-5 ${dept.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white group-hover:text-amber-100 transition-colors">{emp.name}</p>
                  <p className="text-xs text-slate-400 truncate">{emp.role} · {dept.label}</p>
                </div>
                <div className="flex items-center gap-1.5 text-amber-400/50 group-hover:text-amber-400 transition-colors">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>

        {!isLoading && filtered.length > 0 && (
          <p className="text-center text-xs text-slate-600 mt-6">
            Нийт {filtered.length} ажилтан
          </p>
        )}
      </div>
    </div>
  );
}
