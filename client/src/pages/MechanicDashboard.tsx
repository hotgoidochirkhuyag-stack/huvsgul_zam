import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Truck, Plus, Trash2, LogOut, RefreshCw, ChevronDown,
  CheckCircle2, AlertTriangle, Calendar, Zap, FileText,
  Search, Edit2, X, Clock, ShieldCheck, History,
  Fuel, Timer, BarChart3, Save, Printer,
  Wrench, Package, Bell,
} from "lucide-react";
import { printReport } from "@/lib/printReport";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

function getHeaders() {
  return { "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") ?? "" };
}

const VEHICLE_TYPES = ["Экскаватор", "Бульдозер", "Автомашин", "Кран", "Грейдер", "Думпер", "Асфальт тавигч", "Индүү", "Автопомп", "Миксер", "Өөр"];

const TODAY = new Date().toISOString().slice(0, 10);

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - new Date(TODAY).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function InspectionBadge({ date }: { date?: string | null }) {
  if (!date) return <span className="text-slate-600 text-xs">Огноо байхгүй</span>;
  const days = daysUntil(date);
  if (days === null) return null;
  if (days < 0) return (
    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/15 text-red-400 rounded-lg text-xs font-medium">
      <AlertTriangle className="w-3 h-3" /> Хугацаа хэтэрсэн ({Math.abs(days)} өдөр)
    </span>
  );
  if (days <= 30) return (
    <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/15 text-amber-400 rounded-lg text-xs font-medium">
      <Clock className="w-3 h-3" /> {days} өдрийн дотор
    </span>
  );
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-400 rounded-lg text-xs font-medium">
      <CheckCircle2 className="w-3 h-3" /> {days} өдөр үлдсэн
    </span>
  );
}

export default function MechanicDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const [tab, setTab] = useState<"vehicles" | "inspections" | "hours" | "fuel" | "maintenance" | "spareparts" | "alerts" | "report">("vehicles");
  const [search, setSearch] = useState("");
  const [filterReady, setFilterReady] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});

  const emptyForm = {
    plateNumber: "", name: "", type: "Экскаватор", capacity: "",
    lastInspectionDate: "", nextInspectionDate: "", isReady: true, readyNote: "", notes: "",
  };
  const [form, setForm] = useState(emptyForm);

  const { data: _vehiclesRaw, isLoading } = useQuery<any>({
    queryKey: ["/api/erp/vehicles"],
    queryFn: () => fetch("/api/erp/vehicles", { headers: getHeaders() }).then(r => r.json()),
  });
  const vehicles: any[] = Array.isArray(_vehiclesRaw) ? _vehiclesRaw : [];

  const { data: _inspRaw, isLoading: inspLoading } = useQuery<any>({
    queryKey: ["/api/erp/vehicle-inspections"],
    queryFn: () => fetch("/api/erp/vehicle-inspections", { headers: getHeaders() }).then(r => r.json()),
    enabled: tab === "inspections",
  });
  const inspections: any[] = Array.isArray(_inspRaw) ? _inspRaw : [];

  const vehicleMap = new Map(vehicles.map(v => [v.id, v]));

  // ── Цагийн бүртгэл ──────────────────────────────────────────────────────
  const TODAY = new Date().toISOString().slice(0, 10);
  const emptyHourLog = { vehicleId: "", vehicleName: "", date: TODAY, hoursWorked: "", fuelUsed: "", fuelType: "diesel", workFront: "", engineHours: "", notes: "", recordedBy: "" };
  const [hourLog, setHourLog] = useState(emptyHourLog);
  const [showHourForm, setShowHourForm] = useState(false);
  const [hourDate, setHourDate] = useState(TODAY);

  const { data: eqLogs = [], refetch: refetchLogs } = useQuery<any[]>({
    queryKey: ["/api/equipment-logs", hourDate],
    queryFn: () => fetch(`/api/equipment-logs?date=${hourDate}`, { headers: getHeaders() }).then(r => r.json()),
    enabled: tab === "hours",
  });

  const createHourLog = useMutation({
    mutationFn: (data: any) => fetch("/api/equipment-logs", { method: "POST", headers: getHeaders(), body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/equipment-logs"] });
      setHourLog(emptyHourLog);
      setShowHourForm(false);
      toast({ title: "Цагийн бүртгэл хадгалагдлаа ✓" });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteHourLog = useMutation({
    mutationFn: (id: number) => fetch(`/api/equipment-logs/${id}`, { method: "DELETE", headers: getHeaders() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/equipment-logs"] }),
  });

  // Нийт статистик
  const totalHours = eqLogs.reduce((s: number, l: any) => s + (l.hoursWorked ?? 0), 0);
  const totalFuel  = eqLogs.reduce((s: number, l: any) => s + (l.fuelUsed ?? 0), 0);

  // ── Шатахуун төсөв ──────────────────────────────────────────────────────
  const nowY = new Date().getFullYear();
  const nowM = new Date().getMonth() + 1;
  const [fuelYear, setFuelYear] = useState(nowY);
  const [fuelMonth, setFuelMonth] = useState(nowM);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [editBudgetId, setEditBudgetId] = useState<number | null>(null);
  const emptyBudget = { year: nowY, month: nowM, budgetAmount: "", dieselPrice: "3500", petrolPrice: "3800", approvedBy: "", notes: "" };
  const [budgetForm, setBudgetForm] = useState<any>(emptyBudget);

  const { data: currentBudget, refetch: refetchBudget } = useQuery<any>({
    queryKey: ["/api/fuel-budgets/current"],
    queryFn: () => fetch("/api/fuel-budgets/current", { headers: getHeaders() }).then(r => r.json()),
    enabled: tab === "fuel",
  });
  const { data: fuelSummary } = useQuery<any>({
    queryKey: ["/api/fuel-budgets/summary", fuelYear, fuelMonth],
    queryFn: () => fetch(`/api/fuel-budgets/summary?year=${fuelYear}&month=${fuelMonth}`, { headers: getHeaders() }).then(r => r.json()),
    enabled: tab === "fuel",
  });
  const { data: allBudgets = [] } = useQuery<any[]>({
    queryKey: ["/api/fuel-budgets"],
    queryFn: () => fetch("/api/fuel-budgets", { headers: getHeaders() }).then(r => r.json()),
    enabled: tab === "fuel",
  });

  const saveBudget = useMutation({
    mutationFn: (data: any) => {
      if (editBudgetId) {
        return fetch(`/api/fuel-budgets/${editBudgetId}`, { method: "PATCH", headers: getHeaders(), body: JSON.stringify(data) }).then(r => r.json());
      }
      return fetch("/api/fuel-budgets", { method: "POST", headers: getHeaders(), body: JSON.stringify(data) }).then(r => r.json());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/fuel-budgets"] });
      setShowBudgetForm(false); setEditBudgetId(null); setBudgetForm(emptyBudget);
      toast({ title: "Шатахуун төсөв хадгалагдлаа ✓" });
    },
  });

  const MONTHS_MN = ["1-р сар","2-р сар","3-р сар","4-р сар","5-р сар","6-р сар","7-р сар","8-р сар","9-р сар","10-р сар","11-р сар","12-р сар"];

  const { data: allEqLogs = [] } = useQuery<any[]>({
    queryKey: ["/api/equipment-logs/all"],
    queryFn: () => fetch("/api/equipment-logs", { headers: getHeaders() }).then(r => r.json()),
    enabled: tab === "report",
  });
  const { data: allBudgetsReport = [] } = useQuery<any[]>({
    queryKey: ["/api/fuel-budgets/report"],
    queryFn: () => fetch("/api/fuel-budgets", { headers: getHeaders() }).then(r => r.json()),
    enabled: tab === "report",
  });

  function handleMechanicPrint() {
    const readyCount   = vehicles.filter((v: any) => v.isReady).length;
    const notReady     = vehicles.filter((v: any) => !v.isReady).length;
    const totalH       = allEqLogs.reduce((s: number, l: any) => s + (l.hoursWorked ?? 0), 0);
    const totalFuelAll = allEqLogs.reduce((s: number, l: any) => s + (l.fuelUsed ?? 0), 0);

    const statRow = [
      "<div class='stat-row'>",
      "<div class='stat-box'><div class='stat-val'>" + vehicles.length + "</div><div class='stat-lbl'>Нийт техник</div></div>",
      "<div class='stat-box'><div class='stat-val' style='color:#065f46'>" + readyCount + "</div><div class='stat-lbl'>Ажлын бэлэн</div></div>",
      "<div class='stat-box'><div class='stat-val' style='color:#991b1b'>" + notReady + "</div><div class='stat-lbl'>Засварт / бэлэн биш</div></div>",
      "<div class='stat-box'><div class='stat-val'>" + totalH.toFixed(1) + "ц</div><div class='stat-lbl'>Нийт ажлын цаг</div></div>",
      "<div class='stat-box'><div class='stat-val'>" + totalFuelAll.toFixed(0) + "л</div><div class='stat-lbl'>Нийт шатахуун</div></div>",
      "</div>",
    ].join("");

    const vRows = vehicles.map((v: any) => {
      const badge = v.isReady ? "<span class='badge ok'>Бэлэн</span>" : "<span class='badge fail'>Бэлэн биш</span>";
      return "<tr><td>" + v.plateNumber + "</td><td>" + v.name + "</td><td>" + (v.type ?? "—") + "</td><td>" + badge + "</td><td>" + (v.lastInspectionDate ?? "—") + "</td><td>" + (v.nextInspectionDate ?? "—") + "</td></tr>";
    }).join("");

    const body = [
      statRow,
      "<div class='section-title'>Техникийн жагсаалт</div>",
      "<table><thead><tr><th>Дугаар</th><th>Нэр</th><th>Төрөл</th><th>Статус</th><th>Сүүлийн үзлэг</th><th>Дараагийн үзлэг</th></tr></thead><tbody>" + vRows + "</tbody></table>",
    ].join("");

    printReport("Механикийн техникийн тайлан", body);
  }

  // Сарын зарцуулсан мөнгөн дүн тооцоолол
  function calcSpent(summary: any, budget: any): number {
    if (!summary || !budget) return 0;
    return (summary.dieselLiters ?? 0) * (budget.dieselPrice ?? 0)
         + (summary.petrolLiters ?? 0) * (budget.petrolPrice ?? 0);
  }
  const spentAmount = calcSpent(fuelSummary, currentBudget);
  const budgetAmount = currentBudget?.budgetAmount ?? 0;
  const remainingAmount = Math.max(0, budgetAmount - spentAmount);
  const usedPct = budgetAmount > 0 ? Math.min(100, (spentAmount / budgetAmount) * 100) : 0;
  const remainingDieselLiters = currentBudget ? Math.floor(remainingAmount / currentBudget.dieselPrice) : 0;

  const filtered = vehicles.filter(v => {
    const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
      v.type.toLowerCase().includes(search.toLowerCase());
    const matchReady = filterReady === "all" ||
      (filterReady === "ready" && v.isReady) ||
      (filterReady === "notready" && !v.isReady);
    return matchSearch && matchReady;
  });

  const addVehicle = useMutation({
    mutationFn: () => fetch("/api/erp/vehicles", {
      method: "POST", headers: getHeaders(), body: JSON.stringify(form),
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/erp/vehicles"] });
      setShowAddForm(false);
      setForm(emptyForm);
      toast({ title: "Техник бүртгэгдлээ!" });
    },
    onError: (e: any) => toast({ title: e.message ?? "Алдаа гарлаа", variant: "destructive" }),
  });

  const updateVehicle = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => fetch(`/api/erp/vehicles/${id}`, {
      method: "PATCH", headers: getHeaders(), body: JSON.stringify(data),
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/erp/vehicles"] });
      setEditId(null);
      toast({ title: "Мэдээлэл шинэчлэгдлээ" });
    },
  });

  const toggleReady = useMutation({
    mutationFn: ({ id, isReady, readyNote }: { id: number; isReady: boolean; readyNote?: string }) =>
      fetch(`/api/erp/vehicles/${id}`, {
        method: "PATCH", headers: getHeaders(),
        body: JSON.stringify({ isReady, readyNote: readyNote ?? "" }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/erp/vehicles"] });
      toast({ title: "Техникийн төлөв шинэчлэгдлээ" });
    },
  });

  const deleteVehicle = useMutation({
    mutationFn: (id: number) => fetch(`/api/erp/vehicles/${id}`, { method: "DELETE", headers: getHeaders() }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/erp/vehicles"] }); toast({ title: "Устгагдлаа" }); },
  });

  // Статистик
  const stats = {
    total: vehicles.length,
    ready: vehicles.filter(v => v.isReady).length,
    notReady: vehicles.filter(v => !v.isReady).length,
    soonInspection: vehicles.filter(v => { const d = daysUntil(v.nextInspectionDate); return d !== null && d <= 30 && d >= 0; }).length,
    overdueInspection: vehicles.filter(v => { const d = daysUntil(v.nextInspectionDate); return d !== null && d < 0; }).length,
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-slate-900/60 backdrop-blur-xl px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-orange-600/20 rounded-xl">
              <Truck className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-widest text-white">Техникийн бэлэн байдал</h1>
              <p className="text-xs text-slate-500">Техник, Машин Механизмын Бүртгэл</p>
            </div>
          </div>
          <button
            onClick={() => { localStorage.removeItem("adminToken"); localStorage.removeItem("userRole"); setLocation("/select-role"); }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-xl text-sm transition-all"
          >
            <LogOut className="w-4 h-4" /> Гарах
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">

        {/* Статистик */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Нийт техник",       val: stats.total,           cls: "text-white",       bg: "bg-slate-800/50" },
            { label: "Ажилд бэлэн",       val: stats.ready,           cls: "text-green-400",   bg: "bg-green-500/10" },
            { label: "Ажилд бэлэн биш",   val: stats.notReady,        cls: "text-red-400",     bg: "bg-red-500/10" },
            { label: "Үзлэг ойртсон",     val: stats.soonInspection,  cls: "text-amber-400",   bg: "bg-amber-500/10" },
            { label: "Үзлэг хэтэрсэн",    val: stats.overdueInspection, cls: "text-red-500",  bg: "bg-red-600/10" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border border-white/10 rounded-2xl p-3 text-center`}>
              <p className={`text-2xl font-black ${s.cls}`}>{s.val}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-5">
          {([
            { key: "vehicles",     label: "Техникийн жагсаалт", icon: Truck     },
            { key: "inspections",  label: "Өмнөх үзлэгүүд",   icon: History    },
            { key: "hours",        label: "Цаг / Шатахуун",    icon: Timer      },
            { key: "fuel",         label: "Шатахуун төсөв",    icon: Fuel       },
            { key: "maintenance",  label: "ТО хуваарь",         icon: Wrench     },
            { key: "spareparts",   label: "Сэлбэг",             icon: Package    },
            { key: "alerts",       label: "Анхааруулга",        icon: Bell       },
            { key: "report",       label: "Тайлан",             icon: BarChart3  },
          ] as { key: typeof tab; label: string; icon: any }[]).map(t => (
            <button key={t.key} data-testid={`tab-${t.key}`} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === t.key ? "bg-orange-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* ── ТЕХНИКИЙН ЖАГСААЛТ ── */}
        {tab === "vehicles" && (
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            {/* Toolbar */}
            <div className="px-5 py-4 border-b border-white/10 flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-48 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Дугаар, нэр, төрлөөр хайх..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white outline-none focus:border-orange-500/50" />
              </div>
              <div className="relative">
                <select value={filterReady} onChange={e => setFilterReady(e.target.value)}
                  className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none pr-7 appearance-none">
                  <option value="all">Бүх төлөв</option>
                  <option value="ready">Бэлэн</option>
                  <option value="notready">Бэлэн биш</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
              <button onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-all ml-auto">
                <Plus className="w-4 h-4" /> Техник нэмэх
              </button>
            </div>

            {/* Шинэ техник маягт */}
            {showAddForm && (
              <div className="p-5 border-b border-white/10 bg-orange-600/5">
                <p className="text-sm font-bold text-orange-300 mb-3">Шинэ техник бүртгэх</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                  <input value={form.plateNumber} onChange={e => setForm(f => ({ ...f, plateNumber: e.target.value.toUpperCase() }))}
                    placeholder="Улсын дугаар *" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-orange-500/50 uppercase" />
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Техникийн нэр * (жишээ: CAT 320D)" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-orange-500/50" />
                  <div className="relative">
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none appearance-none">
                      {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  <input value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                    placeholder="Хүчин чадал (жишээ: 20 тн, 320 к.с.)" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-orange-500/50" />
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Улсын үзлэгт орсон огноо</label>
                    <input type="date" value={form.lastInspectionDate} onChange={e => setForm(f => ({ ...f, lastInspectionDate: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Дараагийн үзлэгийн огноо</label>
                    <input type="date" value={form.nextInspectionDate} onChange={e => setForm(f => ({ ...f, nextInspectionDate: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none" />
                  </div>
                </div>
                <div className="flex items-center gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.isReady} onChange={e => setForm(f => ({ ...f, isReady: e.target.checked }))}
                      className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-slate-300">Ажилд бэлэн</span>
                  </label>
                  {!form.isReady && (
                    <input value={form.readyNote} onChange={e => setForm(f => ({ ...f, readyNote: e.target.value }))}
                      placeholder="Бэлэн бус шалтгаан..."
                      className="flex-1 bg-white/5 border border-red-500/30 rounded-xl px-4 py-2 text-white text-sm outline-none" />
                  )}
                </div>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Нэмэлт тайлбар..." rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-orange-500/50 resize-none mb-3" />
                <div className="flex gap-3">
                  <button onClick={() => addVehicle.mutate()} disabled={!form.plateNumber || !form.name || addVehicle.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition-all">
                    {addVehicle.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Бүртгэх
                  </button>
                  <button onClick={() => setShowAddForm(false)} className="px-4 text-slate-400 hover:text-white text-sm transition-all">Болих</button>
                </div>
              </div>
            )}

            {/* Техникийн жагсаалт */}
            {isLoading ? (
              <div className="p-12 text-center text-slate-400">Уншиж байна...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Truck className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                <p>{search || filterReady !== "all" ? "Хайлтын үр дүн олдсонгүй" : "Техник бүртгэгдээгүй байна"}</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filtered.map((v: any) => {
                  const isEditing = editId === v.id;
                  const nextDays = daysUntil(v.nextInspectionDate);
                  return (
                    <div key={v.id} className="p-4 hover:bg-white/2 transition-colors">
                      {isEditing ? (
                        /* Засах горим */
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-slate-500 mb-1 block">Хүчин чадал</label>
                              <input value={editData.capacity ?? ""} onChange={e => setEditData((d: any) => ({ ...d, capacity: e.target.value }))}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none" />
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 mb-1 block">Сүүлийн үзлэг</label>
                              <input type="date" value={editData.lastInspectionDate ?? ""} onChange={e => setEditData((d: any) => ({ ...d, lastInspectionDate: e.target.value }))}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none" />
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 mb-1 block">Дараагийн үзлэг</label>
                              <input type="date" value={editData.nextInspectionDate ?? ""} onChange={e => setEditData((d: any) => ({ ...d, nextInspectionDate: e.target.value }))}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none" />
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 mb-1 block">Нэмэлт тайлбар</label>
                              <input value={editData.notes ?? ""} onChange={e => setEditData((d: any) => ({ ...d, notes: e.target.value }))}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => updateVehicle.mutate({ id: v.id, data: editData })}
                              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-xl transition-all">
                              Хадгалах
                            </button>
                            <button onClick={() => setEditId(null)} className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-all">Болих</button>
                          </div>
                        </div>
                      ) : (
                        /* Харах горим */
                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 rounded-xl ${v.isReady ? "bg-green-500/15" : "bg-red-500/15"}`}>
                            <Truck className={`w-5 h-5 ${v.isReady ? "text-green-400" : "text-red-400"}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-white font-bold">{v.plateNumber}</span>
                              <span className="text-slate-300 text-sm">{v.name}</span>
                              <span className="px-2 py-0.5 bg-slate-700/60 text-slate-400 rounded text-xs">{v.type}</span>
                              {v.isReady
                                ? <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-400 rounded-lg text-xs font-medium"><CheckCircle2 className="w-3 h-3" /> Бэлэн</span>
                                : <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-400 rounded-lg text-xs font-medium"><AlertTriangle className="w-3 h-3" /> Бэлэн биш</span>}
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-1.5">
                              {v.capacity && <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{v.capacity}</span>}
                              {v.lastInspectionDate && <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" />Сүүлийн үзлэг: {v.lastInspectionDate}</span>}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {v.nextInspectionDate && (
                                <>
                                  <span className="text-xs text-slate-500">Дараагийн үзлэг: {v.nextInspectionDate}</span>
                                  <InspectionBadge date={v.nextInspectionDate} />
                                </>
                              )}
                              {!v.isReady && v.readyNote && (
                                <span className="text-xs text-red-400 italic">{v.readyNote}</span>
                              )}
                            </div>
                            {v.notes && <p className="text-xs text-slate-600 mt-1">{v.notes}</p>}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {/* Төлөв солих */}
                            <button
                              onClick={() => {
                                if (v.isReady) {
                                  const note = prompt("Бэлэн бус шалтгаан:");
                                  if (note !== null) toggleReady.mutate({ id: v.id, isReady: false, readyNote: note });
                                } else {
                                  toggleReady.mutate({ id: v.id, isReady: true, readyNote: "" });
                                }
                              }}
                              title={v.isReady ? "Бэлэн биш гэж тэмдэглэх" : "Бэлэн болгох"}
                              className={`p-1.5 rounded-lg text-xs transition-all ${v.isReady ? "text-red-400/60 hover:text-red-400 hover:bg-red-500/10" : "text-green-400/60 hover:text-green-400 hover:bg-green-500/10"}`}
                            >
                              {v.isReady ? <X className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                            </button>
                            {/* Засах */}
                            <button onClick={() => { setEditId(v.id); setEditData({ capacity: v.capacity, lastInspectionDate: v.lastInspectionDate, nextInspectionDate: v.nextInspectionDate, notes: v.notes }); }}
                              className="p-1.5 text-slate-400/60 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-all">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {/* Устгах */}
                            <button onClick={() => { if (confirm(`${v.name}-г устгах уу?`)) deleteVehicle.mutate(v.id); }}
                              className="p-1.5 text-red-400/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="px-5 py-3 border-t border-white/5 text-xs text-slate-500">Нийт {filtered.length} техник</div>
          </div>
        )}

        {/* ── ЦАГ / ШАТАХУУН ── */}
        {tab === "hours" && (
          <div className="space-y-4">
            {/* Summary + date filter */}
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex gap-3">
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3 text-center">
                  <div className="text-2xl font-black text-orange-400">{totalHours.toFixed(1)}</div>
                  <div className="text-xs text-white/40">Нийт цаг</div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 text-center">
                  <div className="text-2xl font-black text-blue-400">{totalFuel.toFixed(0)}</div>
                  <div className="text-xs text-white/40">Нийт шатахуун (л)</div>
                </div>
                <div className="bg-slate-700/30 border border-white/10 rounded-xl px-4 py-3 text-center">
                  <div className="text-2xl font-black text-white">{eqLogs.length}</div>
                  <div className="text-xs text-white/40">Техникийн тоо</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="date" value={hourDate} onChange={e => setHourDate(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                <button onClick={() => setShowHourForm(f => !f)} data-testid="btn-add-hourlog"
                  className="flex items-center gap-2 px-4 py-2 bg-orange-700 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-all">
                  <Plus className="w-4 h-4" /> Бүртгэх
                </button>
              </div>
            </div>

            {/* Add form */}
            {showHourForm && (
              <div className="bg-slate-900/80 border border-orange-500/30 rounded-2xl p-5 space-y-4">
                <h3 className="font-semibold text-orange-400 flex items-center gap-2">
                  <Timer className="w-4 h-4" /> Техникийн цагийн бүртгэл
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="col-span-2 sm:col-span-1 space-y-1">
                    <label className="text-xs text-white/40">Техник сонгох</label>
                    <select value={hourLog.vehicleId}
                      onChange={e => {
                        const v = vehicles.find((x: any) => x.id === parseInt(e.target.value));
                        setHourLog(p => ({ ...p, vehicleId: e.target.value, vehicleName: v ? `${v.plateNumber} ${v.name}` : "" }));
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none">
                      <option value="">-- Техник --</option>
                      {vehicles.map((v: any) => (
                        <option key={v.id} value={v.id}>{v.plateNumber} — {v.name}</option>
                      ))}
                    </select>
                  </div>
                  {[
                    { key: "date",        label: "Огноо",              type: "date"   },
                    { key: "hoursWorked", label: "Ажилсан цаг",        type: "number" },
                    { key: "fuelUsed",    label: "Шатахуун (л)",        type: "number" },
                    { key: "engineHours", label: "Хөдөлгүүрийн цаг (нийт)", type: "number" },
                    { key: "workFront",   label: "Ажилсан фронт",      type: "text"   },
                    { key: "recordedBy",  label: "Бүртгэсэн",          type: "text"   },
                  ].map(f => (
                    <div key={f.key} className="space-y-1">
                      <label className="text-xs text-white/40">{f.label}</label>
                      <input type={f.type} value={(hourLog as any)[f.key]}
                        onChange={e => setHourLog(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-500 transition-colors" />
                    </div>
                  ))}
                  <div className="space-y-1">
                    <label className="text-xs text-white/40">Түлшний төрөл</label>
                    <select value={hourLog.fuelType} onChange={e => setHourLog(p => ({ ...p, fuelType: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none">
                      <option value="diesel">Дизель</option>
                      <option value="petrol">Бензин</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/40">Тэмдэглэл</label>
                  <input type="text" value={hourLog.notes} onChange={e => setHourLog(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Нэмэлт мэдээлэл..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div className="flex gap-2">
                  <button data-testid="btn-save-hourlog" onClick={() => createHourLog.mutate({
                    ...hourLog,
                    vehicleId:   parseInt(hourLog.vehicleId),
                    hoursWorked: parseFloat(hourLog.hoursWorked) || 0,
                    fuelUsed:    parseFloat(hourLog.fuelUsed) || 0,
                    engineHours: hourLog.engineHours ? parseFloat(hourLog.engineHours) : null,
                  })} disabled={createHourLog.isPending || !hourLog.vehicleId}
                    className="px-5 py-2 bg-orange-600 hover:bg-orange-500 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40">
                    {createHourLog.isPending ? "..." : "Хадгалах"}
                  </button>
                  <button onClick={() => setShowHourForm(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm transition-all">Болих</button>
                </div>
              </div>
            )}

            {/* Log table */}
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10">
                <h2 className="font-bold">{hourDate} — Техникийн ажилласан цаг</h2>
              </div>
              {eqLogs.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Timer className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                  <p>Цагийн бүртгэл байхгүй байна</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {/* Header */}
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 px-5 py-2 text-xs text-white/30">
                    <span>Техник</span>
                    <span className="text-right">Цаг</span>
                    <span className="text-right">Шатахуун (л)</span>
                    <span className="text-right">Хөдөлгүүр (ц)</span>
                    <span>Фронт</span>
                    <span />
                  </div>
                  {eqLogs.map((l: any) => (
                    <div key={l.id} data-testid={`eq-log-${l.id}`}
                      className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 px-5 py-3 items-center hover:bg-white/2 transition-colors">
                      <div>
                        <div className="font-semibold text-sm">{l.vehicleName || `ID:${l.vehicleId}`}</div>
                        {l.recordedBy && <div className="text-xs text-white/30">{l.recordedBy}</div>}
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-orange-400">{l.hoursWorked}</span>
                        <span className="text-xs text-white/30 ml-1">ц</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-blue-400">{l.fuelUsed}</span>
                        <span className="text-xs text-white/30 ml-1">л</span>
                      </div>
                      <div className="text-right text-xs text-white/40">{l.engineHours ?? "—"}</div>
                      <div className="text-xs text-white/40">{l.workFront || "—"}</div>
                      <button onClick={() => deleteHourLog.mutate(l.id)}
                        className="p-1 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ШАТАХУУН ТӨСӨВ ── */}
        {tab === "fuel" && (
          <div className="space-y-5">
            {/* Одоогийн сарын хэсэг */}
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-amber-300 flex items-center gap-2">
                  <Fuel className="w-4 h-4" /> {MONTHS_MN[(nowM - 1)]} {nowY} — Шатахуун төсөв
                </h2>
                <button onClick={() => { setShowBudgetForm(true); setEditBudgetId(null); setBudgetForm({ ...emptyBudget, year: nowY, month: nowM }); }}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm transition-all">
                  <Plus className="w-4 h-4" /> {currentBudget ? "Шинэчлэх" : "Төсөв батлах"}
                </button>
              </div>

              {!currentBudget ? (
                <div className="py-10 text-center">
                  <Fuel className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Энэ сарын шатахуун төсөв батлагдаагүй байна</p>
                  <p className="text-slate-600 text-xs mt-1">«Төсөв батлах» товчийг дарж шинэ төсөв оруулна уу</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Үнийн мэдээлэл */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                      <p className="text-xs text-slate-500 mb-1">Батлагдсан төсөв</p>
                      <p className="text-lg font-black text-amber-400">₮{currentBudget.budgetAmount.toLocaleString()}</p>
                    </div>
                    <div className="bg-blue-600/10 rounded-xl p-3 text-center">
                      <p className="text-xs text-slate-500 mb-1">Дизель үнэ</p>
                      <p className="text-lg font-black text-blue-400">₮{currentBudget.dieselPrice.toLocaleString()}<span className="text-xs font-normal text-slate-500">/л</span></p>
                    </div>
                    <div className="bg-purple-600/10 rounded-xl p-3 text-center">
                      <p className="text-xs text-slate-500 mb-1">Бензин үнэ</p>
                      <p className="text-lg font-black text-purple-400">₮{currentBudget.petrolPrice.toLocaleString()}<span className="text-xs font-normal text-slate-500">/л</span></p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-400">Зарцуулсан: <span className={`font-bold ${usedPct > 90 ? "text-red-400" : usedPct > 70 ? "text-amber-400" : "text-green-400"}`}>₮{spentAmount.toLocaleString()}</span></span>
                      <span className="text-slate-400">{usedPct.toFixed(1)}%</span>
                    </div>
                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${usedPct > 90 ? "bg-red-500" : usedPct > 70 ? "bg-amber-500" : "bg-green-500"}`}
                        style={{ width: `${usedPct}%` }} />
                    </div>
                    <div className="flex justify-between text-xs mt-1.5">
                      <span className="text-slate-500">Үлдсэн: <span className="font-bold text-white">₮{remainingAmount.toLocaleString()}</span></span>
                      <span className="text-slate-500">≈ <span className="font-bold text-blue-300">{remainingDieselLiters.toLocaleString()} л</span> дизель авч болно</span>
                    </div>
                  </div>

                  {/* Зарцуулалтын задаргаа */}
                  {fuelSummary && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 bg-blue-400 rounded-full" />
                        <span className="text-slate-400">Дизель:</span>
                        <span className="font-bold text-white">{fuelSummary.dieselLiters?.toFixed(1) ?? 0} л</span>
                        <span className="text-slate-600 text-xs">= ₮{((fuelSummary.dieselLiters ?? 0) * currentBudget.dieselPrice).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 bg-purple-400 rounded-full" />
                        <span className="text-slate-400">Бензин:</span>
                        <span className="font-bold text-white">{fuelSummary.petrolLiters?.toFixed(1) ?? 0} л</span>
                        <span className="text-slate-600 text-xs">= ₮{((fuelSummary.petrolLiters ?? 0) * currentBudget.petrolPrice).toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {currentBudget.approvedBy && (
                    <p className="text-xs text-slate-600">Батлагдсан: {currentBudget.approvedBy} {currentBudget.notes ? `· ${currentBudget.notes}` : ""}</p>
                  )}

                  {usedPct > 90 && (
                    <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Анхааруулга: Сарын шатахуун төсвийн <strong>{usedPct.toFixed(0)}%</strong> ашиглагдсан байна!</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Төсөв батлах / засах маягт */}
            {showBudgetForm && (
              <div className="bg-amber-600/5 border border-amber-500/30 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-amber-400 flex items-center gap-2">
                  <Save className="w-4 h-4" /> Шатахуун төсөв батлах
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-white/40">Он</label>
                    <input type="number" value={budgetForm.year} onChange={e => setBudgetForm((f: any) => ({ ...f, year: parseInt(e.target.value) }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-white/40">Сар</label>
                    <select value={budgetForm.month} onChange={e => setBudgetForm((f: any) => ({ ...f, month: parseInt(e.target.value) }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none">
                      {MONTHS_MN.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-white/40">Батлагдсан төсөв (₮)</label>
                    <input type="number" value={budgetForm.budgetAmount} placeholder="жишээ: 5000000"
                      onChange={e => setBudgetForm((f: any) => ({ ...f, budgetAmount: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-white/40">Дизелийн үнэ (₮/л)</label>
                    <input type="number" value={budgetForm.dieselPrice}
                      onChange={e => setBudgetForm((f: any) => ({ ...f, dieselPrice: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-white/40">Бензины үнэ (₮/л)</label>
                    <input type="number" value={budgetForm.petrolPrice}
                      onChange={e => setBudgetForm((f: any) => ({ ...f, petrolPrice: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-white/40">Батлагч</label>
                    <input type="text" value={budgetForm.approvedBy} placeholder="Нэр..."
                      onChange={e => setBudgetForm((f: any) => ({ ...f, approvedBy: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
                  </div>
                </div>
                <input type="text" value={budgetForm.notes} placeholder="Тэмдэглэл..."
                  onChange={e => setBudgetForm((f: any) => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                {/* Тооцоолол preview */}
                {budgetForm.budgetAmount && budgetForm.dieselPrice && (
                  <div className="bg-slate-800/60 rounded-xl p-3 text-xs text-slate-400">
                    ₮{parseFloat(budgetForm.budgetAmount || 0).toLocaleString()} төсвөөр
                    → дизель <strong className="text-blue-300">{Math.floor(budgetForm.budgetAmount / budgetForm.dieselPrice).toLocaleString()} л</strong>
                    / бензин <strong className="text-purple-300">{Math.floor(budgetForm.budgetAmount / budgetForm.petrolPrice).toLocaleString()} л</strong> авч болно
                  </div>
                )}
                <div className="flex gap-2">
                  <button data-testid="btn-save-budget" disabled={!budgetForm.budgetAmount || saveBudget.isPending}
                    onClick={() => saveBudget.mutate({
                      year: budgetForm.year, month: budgetForm.month,
                      budgetAmount: parseFloat(budgetForm.budgetAmount),
                      dieselPrice: parseFloat(budgetForm.dieselPrice),
                      petrolPrice: parseFloat(budgetForm.petrolPrice),
                      approvedBy: budgetForm.approvedBy || null,
                      notes: budgetForm.notes || null,
                    })}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40">
                    {saveBudget.isPending ? "..." : "Батлах"}
                  </button>
                  <button onClick={() => setShowBudgetForm(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm transition-all">Болих</button>
                </div>
              </div>
            )}

            {/* Түүх */}
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="font-bold">Сарын төсвийн түүх</h2>
              </div>
              {allBudgets.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">Өмнөх төсвийн мэдээлэл байхгүй</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {allBudgets.map((b: any) => {
                    return (
                      <div key={b.id} className="px-5 py-3 flex items-center gap-4 hover:bg-white/2 transition-colors">
                        <div className="w-20 shrink-0">
                          <p className="font-bold text-sm text-amber-400">{MONTHS_MN[(b.month - 1)]}</p>
                          <p className="text-xs text-slate-500">{b.year}</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">₮{b.budgetAmount.toLocaleString()}</p>
                          <p className="text-xs text-slate-500">Дизель: ₮{b.dieselPrice.toLocaleString()}/л · Бензин: ₮{b.petrolPrice.toLocaleString()}/л</p>
                        </div>
                        {b.approvedBy && <p className="text-xs text-slate-600">{b.approvedBy}</p>}
                        <button onClick={() => { setEditBudgetId(b.id); setBudgetForm({ year: b.year, month: b.month, budgetAmount: b.budgetAmount, dieselPrice: b.dieselPrice, petrolPrice: b.petrolPrice, approvedBy: b.approvedBy ?? "", notes: b.notes ?? "" }); setShowBudgetForm(true); }}
                          className="p-1.5 text-white/20 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ТАЙЛАН ── */}
        {tab === "report" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Механикийн нэгтгэл тайлан</h2>
              <button
                data-testid="btn-print-mechanic-report"
                onClick={handleMechanicPrint}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-xl transition-all"
              >
                <Printer className="w-4 h-4" /> PDF тайлан
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Нийт техник",     value: vehicles.length,                                          color: "text-white"   },
                { label: "Ажлын бэлэн",     value: vehicles.filter((v: any) => v.isReady).length,            color: "text-green-400" },
                { label: "Засварт / бэлэн биш", value: vehicles.filter((v: any) => !v.isReady).length,       color: "text-red-400" },
                { label: "Нийт ажлын цаг",  value: allEqLogs.reduce((s: number, l: any) => s + (l.hoursWorked ?? 0), 0).toFixed(1) + " ц", color: "text-amber-400" },
              ].map(s => (
                <div key={s.label} className="bg-slate-900/60 border border-white/10 rounded-2xl p-4">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-white/40 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/10">
                <h3 className="font-bold text-sm">Техникийн жагсаалт</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 text-white/50 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Дугаар</th>
                      <th className="px-4 py-3 text-left">Нэр</th>
                      <th className="px-4 py-3 text-left">Төрөл</th>
                      <th className="px-4 py-3 text-left">Статус</th>
                      <th className="px-4 py-3 text-left">Сүүлийн үзлэг</th>
                      <th className="px-4 py-3 text-left">Дараагийн үзлэг</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {vehicles.map((v: any) => (
                      <tr key={v.id} className="hover:bg-white/3 transition-colors">
                        <td className="px-4 py-3 font-bold">{v.plateNumber}</td>
                        <td className="px-4 py-3">{v.name}</td>
                        <td className="px-4 py-3 text-white/50">{v.type ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${v.isReady ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                            {v.isReady ? "Бэлэн" : "Бэлэн биш"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white/50 text-xs">{v.lastInspectionDate ?? "—"}</td>
                        <td className="px-4 py-3 text-white/50 text-xs">{v.nextInspectionDate ?? "—"}</td>
                      </tr>
                    ))}
                    {vehicles.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-10 text-center text-white/30">Техник бүртгэгдээгүй байна</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {allBudgetsReport.length > 0 && (
              <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/10">
                  <h3 className="font-bold text-sm">Шатахуун төсвийн тайлан</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 text-white/50 text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">Он</th>
                        <th className="px-4 py-3 text-left">Сар</th>
                        <th className="px-4 py-3 text-right">Төсөв (₮)</th>
                        <th className="px-4 py-3 text-right">Дизель үнэ</th>
                        <th className="px-4 py-3 text-right">Бензин үнэ</th>
                        <th className="px-4 py-3 text-left">Батлагч</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {allBudgetsReport.map((b: any) => (
                        <tr key={b.id} className="hover:bg-white/3">
                          <td className="px-4 py-3">{b.year}</td>
                          <td className="px-4 py-3">{MONTHS_MN[(b.month ?? 1) - 1]}</td>
                          <td className="px-4 py-3 text-right font-bold text-amber-400">{Number(b.budgetAmount).toLocaleString()}₮</td>
                          <td className="px-4 py-3 text-right text-white/50">{b.dieselPrice}₮/л</td>
                          <td className="px-4 py-3 text-right text-white/50">{b.petrolPrice}₮/л</td>
                          <td className="px-4 py-3 text-white/50">{b.approvedBy ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "inspections" && (
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-bold">Өдрийн өмнөх үзлэгүүд</h2>
              <button onClick={() => qc.invalidateQueries({ queryKey: ["/api/erp/vehicle-inspections"] })}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {inspLoading ? (
              <div className="p-12 text-center text-slate-400">Уншиж байна...</div>
            ) : inspections.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <FileText className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                <p>Үзлэг бүртгэгдээгүй байна</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {inspections.map((insp: any) => {
                  const vehicle = vehicleMap.get(insp.vehicleId);
                  let checks: any[] = [];
                  try { checks = JSON.parse(insp.checks); } catch {}
                  const failedItems = checks.filter(c => c.warn);
                  return (
                    <div key={insp.id} className="p-4 hover:bg-white/2 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl ${insp.passed ? "bg-green-500/15" : "bg-red-500/15"}`}>
                          {insp.passed
                            ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                            : <AlertTriangle className="w-4 h-4 text-red-400" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-white font-semibold">{vehicle?.plateNumber ?? `ID:${insp.vehicleId}`}</span>
                            <span className="text-slate-400 text-sm">{vehicle?.name}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${insp.passed ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                              {insp.passed ? "Тэнцсэн" : "Асуудалтай"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mb-1">Хийсэн: {insp.employeeName} · {insp.date}</p>
                          {failedItems.length > 0 && (
                            <div className="text-xs text-red-400">
                              Асуудалтай: {failedItems.map((c: any) => c.item).join(", ")}
                            </div>
                          )}
                          {insp.notes && <p className="text-xs text-slate-500 mt-0.5 italic">{insp.notes}</p>}
                        </div>
                        <span className="text-xs text-slate-600">
                          {new Date(insp.createdAt).toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ТО ХУВААРЬ ── */}
        {tab === "maintenance" && <MaintenanceTab vehicles={vehicles} qc={qc} toast={toast} />}

        {/* ── СЭЛБЭГ ХЭРЭГСЭЛ ── */}
        {tab === "spareparts" && <SparePartsTab vehicles={vehicles} qc={qc} toast={toast} />}

        {/* ── АНХААРУУЛГА ── */}
        {tab === "alerts" && <AlertsTab vehicles={vehicles} qc={qc} toast={toast} />}

      </div>
    </div>
  );
}

// ===================== ТО ХУВААРИЙН ТАБ =====================
const TO_TYPES = ["TO1", "TO2", "TO3", "Улирлын", "Засвар", "Бусад"];
const TO_COLORS: Record<string, string> = {
  TO1: "bg-blue-500/20 text-blue-300", TO2: "bg-yellow-500/20 text-yellow-300",
  TO3: "bg-orange-500/20 text-orange-300", Улирлын: "bg-purple-500/20 text-purple-300",
  Засвар: "bg-red-500/20 text-red-300", Бусад: "bg-slate-500/20 text-slate-300",
};
const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-500/20 text-blue-300",
  done: "bg-green-500/20 text-green-300",
  overdue: "bg-red-500/20 text-red-400",
  cancelled: "bg-slate-500/20 text-slate-400",
};
const STATUS_LABELS: Record<string, string> = {
  scheduled: "Товлосон", done: "Гүйцэтгэсэн", overdue: "Хоцорсон", cancelled: "Цуцлагдсан",
};

function MaintenanceTab({ vehicles, qc, toast }: { vehicles: any[]; qc: any; toast: any }) {
  const hdrs = () => ({ "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") ?? "" });
  const [showForm, setShowForm] = useState(false);
  const [filterV, setFilterV] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ vehicleId: "", toType: "TO1", scheduledDate: today, description: "", technicianName: "", hoursAtService: "", cost: "", notes: "" });

  const { data: schedules = [] } = useQuery<any[]>({
    queryKey: ["/api/maintenance-schedules"],
    queryFn: () => fetch("/api/maintenance-schedules", { headers: hdrs() }).then(r => r.json()),
  });
  const addMut = useMutation({
    mutationFn: (d: any) => fetch("/api/maintenance-schedules", { method: "POST", headers: hdrs(), body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/maintenance-schedules"] }); setShowForm(false); toast({ title: "ТО хуваарь нэмэгдлээ" }); },
  });
  const doneMut = useMutation({
    mutationFn: ({ id, completedDate }: any) => fetch(`/api/maintenance-schedules/${id}`, { method: "PATCH", headers: hdrs(), body: JSON.stringify({ status: "done", completedDate }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/maintenance-schedules"] }); toast({ title: "Гүйцэтгэл тэмдэглэгдлээ" }); },
  });
  const delMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/maintenance-schedules/${id}`, { method: "DELETE", headers: hdrs() }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/maintenance-schedules"] }),
  });

  const vehMap: Record<number, string> = {};
  vehicles.forEach((v: any) => { vehMap[v.id] = `${v.name} (${v.plateNumber})`; });

  const filtered = schedules
    .filter((s: any) => filterV === "all" || s.vehicleId === parseInt(filterV))
    .filter((s: any) => filterStatus === "all" || s.status === filterStatus);

  // Auto-mark overdue
  const overdueIds = schedules.filter((s: any) => s.status === "scheduled" && s.scheduledDate < today).map((s: any) => s.id);

  const upcoming = schedules.filter((s: any) => s.status === "scheduled" && s.scheduledDate >= today).length;
  const done     = schedules.filter((s: any) => s.status === "done").length;
  const overdue  = schedules.filter((s: any) => s.status === "scheduled" && s.scheduledDate < today).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-white flex items-center gap-2"><Wrench className="w-5 h-5 text-orange-400" />ТО — Техникийн Оношлогоо (Урьдчилсан засвар)</h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-xl transition-all">
          <Plus className="w-4 h-4" /> Хуваарь нэмэх
        </button>
      </div>

      {/* ТО тайлбар */}
      <div className="bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="flex items-start gap-2">
          <span className="px-1.5 py-0.5 rounded font-black bg-blue-500/20 text-blue-300 shrink-0">TO-1</span>
          <span className="text-white/50">Жижиг засвар — тос, шүүр солих, тосолгоо. Ихэвчлэн 250 мото/цаг тутамд.</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="px-1.5 py-0.5 rounded font-black bg-yellow-500/20 text-yellow-300 shrink-0">TO-2</span>
          <span className="text-white/50">Дунд засвар — TO-1 + аккумулятор, хөргөлтийн систем, ремень шалгах. ~500 мото/цаг.</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="px-1.5 py-0.5 rounded font-black bg-orange-500/20 text-orange-300 shrink-0">TO-3</span>
          <span className="text-white/50">Том засвар — TO-2 + гидравлик тос, трансмисс, хөдөлгүүрийн гүн шалгалт. ~1000 мото/цаг.</span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-blue-300">{upcoming}</div>
          <div className="text-xs text-blue-400/70 mt-0.5">Товлосон</div>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-green-300">{done}</div>
          <div className="text-xs text-green-400/70 mt-0.5">Гүйцэтгэсэн</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-red-300">{overdue}</div>
          <div className="text-xs text-red-400/70 mt-0.5">Хоцорсон</div>
        </div>
      </div>

      {showForm && (
        <div className="bg-slate-900/80 border border-orange-500/30 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2 font-semibold text-orange-300 text-sm mb-1">ТО хуваарь нэмэх</div>
          <select value={form.vehicleId} onChange={e => setForm(p => ({ ...p, vehicleId: e.target.value }))}
            className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
            <option value="">Техник сонгох</option>
            {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.name} ({v.plateNumber})</option>)}
          </select>
          <select value={form.toType} onChange={e => setForm(p => ({ ...p, toType: e.target.value }))}
            className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
            {TO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Товлосон огноо</label>
            <input type="date" value={form.scheduledDate} onChange={e => setForm(p => ({ ...p, scheduledDate: e.target.value }))}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          </div>
          <input value={form.technicianName} onChange={e => setForm(p => ({ ...p, technicianName: e.target.value }))}
            placeholder="Техникч (хэн хийх)" className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          <input type="number" value={form.hoursAtService} onChange={e => setForm(p => ({ ...p, hoursAtService: e.target.value }))}
            placeholder="Мото/цаг (үед хийх)" className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          <input type="number" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))}
            placeholder="Зардал (₮)" className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Хийх ажлын тайлбар" rows={2}
            className="md:col-span-2 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none resize-none" />
          <div className="md:col-span-2 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-700 text-slate-300 text-sm rounded-xl">Цуцлах</button>
            <button onClick={() => { if (!form.vehicleId) return; addMut.mutate({ ...form, vehicleId: parseInt(form.vehicleId), hoursAtService: form.hoursAtService ? parseFloat(form.hoursAtService) : null, cost: form.cost ? parseFloat(form.cost) : null, status: "scheduled" }); }}
              disabled={addMut.isPending}
              className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-xl transition-all">
              Хадгалах
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <select value={filterV} onChange={e => setFilterV(e.target.value)} className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
          <option value="all">Бүх техник</option>
          {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
          <option value="all">Бүх статус</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/60">
            <tr className="text-left text-white/50 text-xs">
              <th className="px-4 py-3">Техник</th>
              <th className="px-4 py-3">Төрөл</th>
              <th className="px-4 py-3">Товлосон огноо</th>
              <th className="px-4 py-3">Техникч</th>
              <th className="px-4 py-3">Зардал</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3">Үйлдэл</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-white/30">ТО хуваарь байхгүй байна</td></tr>
            )}
            {filtered.map((s: any) => {
              const isOverdue = s.status === "scheduled" && s.scheduledDate < today;
              const displayStatus = isOverdue ? "overdue" : s.status;
              return (
                <tr key={s.id} className={`border-t border-white/5 ${isOverdue ? "bg-red-500/5" : "hover:bg-white/3"}`}>
                  <td className="px-4 py-3 font-medium text-white">{vehMap[s.vehicleId] ?? "—"}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${TO_COLORS[s.toType] ?? "bg-slate-700 text-slate-300"}`}>{s.toType}</span></td>
                  <td className="px-4 py-3 text-white/70">{s.scheduledDate}</td>
                  <td className="px-4 py-3 text-white/50">{s.technicianName ?? "—"}</td>
                  <td className="px-4 py-3 text-white/50">{s.cost ? `₮${(s.cost as number).toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${STATUS_COLORS[displayStatus]}`}>{STATUS_LABELS[displayStatus]}</span></td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    {s.status === "scheduled" && (
                      <button onClick={() => doneMut.mutate({ id: s.id, completedDate: today })}
                        className="px-2 py-1 bg-green-600/30 hover:bg-green-600/50 text-green-300 text-xs rounded-lg transition-colors">
                        Гүйцэтгэлд ✓
                      </button>
                    )}
                    <button onClick={() => delMut.mutate(s.id)} className="text-red-400/60 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===================== СЭЛБЭГИЙН ТАБ =====================
function SparePartsTab({ vehicles, qc, toast }: { vehicles: any[]; qc: any; toast: any }) {
  const hdrs = () => ({ "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") ?? "" });
  const [showForm, setShowForm] = useState(false);
  const [filterV, setFilterV] = useState("all");
  const [form, setForm] = useState({ vehicleId: "", partName: "", partNumber: "", brand: "", unit: "ш", quantity: "", minStock: "", location: "", unitPrice: "", notes: "" });
  const [editId, setEditId] = useState<number | null>(null);
  const [editQty, setEditQty] = useState("");

  const { data: parts = [] } = useQuery<any[]>({
    queryKey: ["/api/spare-parts"],
    queryFn: () => fetch("/api/spare-parts", { headers: hdrs() }).then(r => r.json()),
  });
  const addMut = useMutation({
    mutationFn: (d: any) => fetch("/api/spare-parts", { method: "POST", headers: hdrs(), body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/spare-parts"] }); setShowForm(false); toast({ title: "Сэлбэг нэмэгдлээ" }); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, quantity }: any) => fetch(`/api/spare-parts/${id}`, { method: "PATCH", headers: hdrs(), body: JSON.stringify({ quantity }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/spare-parts"] }); setEditId(null); },
  });
  const delMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/spare-parts/${id}`, { method: "DELETE", headers: hdrs() }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/spare-parts"] }),
  });

  const vehMap: Record<number, string> = {};
  vehicles.forEach((v: any) => { vehMap[v.id] = v.name; });
  const filtered = filterV === "all" ? parts : parts.filter((p: any) => p.vehicleId === parseInt(filterV) || (!p.vehicleId && filterV === "general"));
  const lowStock = parts.filter((p: any) => (p.quantity ?? 0) < (p.minStock ?? 0)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-400" />Сэлбэг хэрэгсэл
          {lowStock > 0 && <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-lg font-bold">{lowStock} дутуу нөөц</span>}
        </h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-xl transition-all">
          <Plus className="w-4 h-4" /> Нэмэх
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-900/80 border border-orange-500/30 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2 font-semibold text-orange-300 text-sm mb-1">Сэлбэг бүртгэх</div>
          <select value={form.vehicleId} onChange={e => setForm(p => ({ ...p, vehicleId: e.target.value }))}
            className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
            <option value="">Ерөнхий нөөц</option>
            {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.name} ({v.plateNumber})</option>)}
          </select>
          <input value={form.partName} onChange={e => setForm(p => ({ ...p, partName: e.target.value }))}
            placeholder="Сэлбэгийн нэр *" className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          <input value={form.partNumber} onChange={e => setForm(p => ({ ...p, partNumber: e.target.value }))}
            placeholder="Каталогийн дугаар" className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          <input value={form.brand} onChange={e => setForm(p => ({ ...p, brand: e.target.value }))}
            placeholder="Брэнд / Үйлдвэрлэгч" className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
            className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
            {["ш", "л", "кг", "м", "багц"].map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
            placeholder="Одоогийн нөөц" className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          <input type="number" value={form.minStock} onChange={e => setForm(p => ({ ...p, minStock: e.target.value }))}
            placeholder="Доод хэмжээ (анхааруулга)" className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          <input type="number" value={form.unitPrice} onChange={e => setForm(p => ({ ...p, unitPrice: e.target.value }))}
            placeholder="Нэгжийн үнэ (₮)" className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
            placeholder="Байршил (агуулах, хуу)" className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          <div className="md:col-span-2 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-700 text-slate-300 text-sm rounded-xl">Цуцлах</button>
            <button onClick={() => { if (!form.partName) return; addMut.mutate({ ...form, vehicleId: form.vehicleId ? parseInt(form.vehicleId) : null, quantity: parseFloat(form.quantity) || 0, minStock: parseFloat(form.minStock) || 0, unitPrice: form.unitPrice ? parseFloat(form.unitPrice) : null }); }}
              disabled={addMut.isPending}
              className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-xl transition-all">
              Хадгалах
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <select value={filterV} onChange={e => setFilterV(e.target.value)} className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
          <option value="all">Бүх нөөц</option>
          <option value="general">Ерөнхий нөөц</option>
          {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>

      <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/60">
            <tr className="text-left text-white/50 text-xs">
              <th className="px-4 py-3">Сэлбэгийн нэр</th>
              <th className="px-4 py-3">Техник</th>
              <th className="px-4 py-3">Каталог №</th>
              <th className="px-4 py-3">Нөөц</th>
              <th className="px-4 py-3">Нэгжийн үнэ</th>
              <th className="px-4 py-3">Байршил</th>
              <th className="px-4 py-3">Үйлдэл</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-white/30">Сэлбэг хэрэгсэл байхгүй байна</td></tr>
            )}
            {filtered.map((p: any) => {
              const isLow = (p.quantity ?? 0) < (p.minStock ?? 0);
              return (
                <tr key={p.id} className={`border-t border-white/5 ${isLow ? "bg-red-500/5" : "hover:bg-white/3"}`}>
                  <td className="px-4 py-3 font-medium text-white">
                    {p.partName} {p.brand && <span className="text-xs text-white/40">{p.brand}</span>}
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs">{p.vehicleId ? vehMap[p.vehicleId] : "Ерөнхий"}</td>
                  <td className="px-4 py-3 text-white/50">{p.partNumber ?? "—"}</td>
                  <td className="px-4 py-3">
                    {editId === p.id ? (
                      <div className="flex items-center gap-1">
                        <input type="number" value={editQty} onChange={e => setEditQty(e.target.value)}
                          className="w-16 bg-slate-700 rounded px-2 py-1 text-xs text-white border border-orange-500 focus:outline-none" />
                        <span className="text-xs text-white/40">{p.unit}</span>
                        <button onClick={() => updateMut.mutate({ id: p.id, quantity: parseFloat(editQty) })}
                          className="px-2 py-0.5 bg-green-600/50 text-green-300 text-xs rounded">✓</button>
                        <button onClick={() => setEditId(null)} className="text-white/30 text-xs">✕</button>
                      </div>
                    ) : (
                      <span className={`font-bold cursor-pointer hover:text-orange-300 ${isLow ? "text-red-400" : "text-white"}`}
                        onClick={() => { setEditId(p.id); setEditQty(String(p.quantity)); }}>
                        {p.quantity} {p.unit}
                        {isLow && <span className="ml-1 text-xs text-red-400">⚠ Дутуу</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/50">{p.unitPrice ? `₮${(p.unitPrice as number).toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-3 text-white/50">{p.location ?? "—"}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => delMut.mutate(p.id)} className="text-red-400/60 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===================== АНХААРУУЛГЫН ТАБ =====================
const ALERT_LEVEL_COLORS: Record<string, string> = {
  expired:  "bg-red-500/20 border-red-500/40 text-red-300",
  critical: "bg-orange-500/20 border-orange-500/40 text-orange-300",
  warning:  "bg-yellow-500/20 border-yellow-500/40 text-yellow-300",
};
const ALERT_CAT_ICONS: Record<string, any> = { HR: "👤", Техник: "🚛", Засвар: "🔧" };
const DOC_TYPE_LABELS: Record<string, string> = {
  insurance: "Даатгал", inspection: "Улсын үзлэг", license: "Лиценз", eco_check: "Экологийн шалгалт", other: "Бусад",
};

function AlertsTab({ vehicles, qc, toast }: { vehicles: any[]; qc: any; toast: any }) {
  const hdrs = () => ({ "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") ?? "" });
  const [showDocForm, setShowDocForm] = useState(false);
  const [docForm, setDocForm] = useState({ vehicleId: "", docType: "insurance", docName: "ОСАГО даатгал", docNumber: "", issuedDate: "", expiryDate: "", issuedBy: "", notes: "" });

  const { data: alerts = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/expiry-alerts"],
    queryFn: () => fetch("/api/expiry-alerts", { headers: hdrs() }).then(r => r.json()),
    refetchInterval: 60000,
  });
  const { data: vdocs = [] } = useQuery<any[]>({
    queryKey: ["/api/vehicle-documents"],
    queryFn: () => fetch("/api/vehicle-documents", { headers: hdrs() }).then(r => r.json()),
  });
  const addDocMut = useMutation({
    mutationFn: (d: any) => fetch("/api/vehicle-documents", { method: "POST", headers: hdrs(), body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/vehicle-documents", "/api/expiry-alerts"] }); setShowDocForm(false); toast({ title: "Баримт бичиг нэмэгдлээ" }); },
  });
  const delDocMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/vehicle-documents/${id}`, { method: "DELETE", headers: hdrs() }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/vehicle-documents", "/api/expiry-alerts"] }); },
  });

  const vehMap: Record<number, string> = {};
  vehicles.forEach((v: any) => { vehMap[v.id] = `${v.name} (${v.plateNumber})`; });

  const expired  = alerts.filter((a: any) => a.level === "expired").length;
  const critical = alerts.filter((a: any) => a.level === "critical").length;
  const warning  = alerts.filter((a: any) => a.level === "warning").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-white flex items-center gap-2"><Bell className="w-5 h-5 text-orange-400" />Хугацааны анхааруулга</h2>
        <button onClick={() => setShowDocForm(!showDocForm)} className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-xl transition-all">
          <Plus className="w-4 h-4" /> Баримт бичиг нэмэх
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-red-300">{expired}</div>
          <div className="text-xs text-red-400/70 mt-0.5">Дууссан</div>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-orange-300">{critical}</div>
          <div className="text-xs text-orange-400/70 mt-0.5">14 хоногт дуусна</div>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-yellow-300">{warning}</div>
          <div className="text-xs text-yellow-400/70 mt-0.5">60 хоногт дуусна</div>
        </div>
      </div>

      {/* Add vehicle document form */}
      {showDocForm && (
        <div className="bg-slate-900/80 border border-orange-500/30 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2 font-semibold text-orange-300 text-sm mb-1">Техникийн баримт бичиг нэмэх</div>
          <select value={docForm.vehicleId} onChange={e => setDocForm(p => ({ ...p, vehicleId: e.target.value }))}
            className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
            <option value="">Техник сонгох *</option>
            {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.name} ({v.plateNumber})</option>)}
          </select>
          <select value={docForm.docType} onChange={e => { const labels: Record<string,string> = { insurance: "ОСАГО даатгал", inspection: "Улсын техникийн үзлэг", license: "Лиценз", eco_check: "Экологийн шалгалт", other: "Бусад" }; setDocForm(p => ({ ...p, docType: e.target.value, docName: labels[e.target.value] ?? "" })); }}
            className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
            {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input value={docForm.docName} onChange={e => setDocForm(p => ({ ...p, docName: e.target.value }))}
            placeholder="Баримт бичгийн нэр *" className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          <input value={docForm.docNumber} onChange={e => setDocForm(p => ({ ...p, docNumber: e.target.value }))}
            placeholder="Дугаар / Серийн №" className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          <div>
            <label className="text-xs text-white/40 mb-1 block">Олгосон огноо</label>
            <input type="date" value={docForm.issuedDate} onChange={e => setDocForm(p => ({ ...p, issuedDate: e.target.value }))}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Дуусах огноо *</label>
            <input type="date" value={docForm.expiryDate} onChange={e => setDocForm(p => ({ ...p, expiryDate: e.target.value }))}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          </div>
          <div className="md:col-span-2 flex gap-2 justify-end">
            <button onClick={() => setShowDocForm(false)} className="px-4 py-2 bg-slate-700 text-slate-300 text-sm rounded-xl">Цуцлах</button>
            <button onClick={() => { if (!docForm.vehicleId || !docForm.expiryDate) return; addDocMut.mutate({ ...docForm, vehicleId: parseInt(docForm.vehicleId), issuedDate: docForm.issuedDate || null }); }}
              disabled={addDocMut.isPending}
              className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-xl transition-all">
              Хадгалах
            </button>
          </div>
        </div>
      )}

      {/* Live alerts */}
      {isLoading ? (
        <div className="text-center py-8 text-white/30">Уншиж байна...</div>
      ) : alerts.length === 0 ? (
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
          <p className="text-green-300 font-semibold">Ойрын 60 хоногт дуусах баримт, гэрчилгээ байхгүй байна</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white/50">Ойрын 60 хоногт дуусах баримт бичиг, гэрчилгээ</h3>
          {alerts.map((a: any) => (
            <div key={a.id} className={`flex items-start gap-3 p-4 border rounded-xl ${ALERT_LEVEL_COLORS[a.level]}`}>
              <span className="text-lg">{ALERT_CAT_ICONS[a.category] ?? "📄"}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{a.title}</div>
                <div className="text-xs opacity-70 mt-0.5">{a.entity} · {a.category}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold">{a.daysLeft < 0 ? "Дууссан" : `${a.daysLeft} хоног`}</div>
                <div className="text-xs opacity-60">{a.expiry}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vehicle documents list */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-white/50 flex items-center gap-2">
          <FileText className="w-4 h-4" />Бүртгэлтэй баримт бичгүүд
        </h3>
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/60">
              <tr className="text-left text-white/50 text-xs">
                <th className="px-4 py-3">Техник</th>
                <th className="px-4 py-3">Баримт бичиг</th>
                <th className="px-4 py-3">Дугаар</th>
                <th className="px-4 py-3">Дуусах огноо</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {vdocs.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-white/30">Баримт бичиг бүртгэгдээгүй</td></tr>}
              {vdocs.map((d: any) => {
                const days = Math.ceil((new Date(d.expiryDate).getTime() - Date.now()) / 86400000);
                const status = days < 0 ? { cls: "bg-red-500/20 text-red-400", label: "Дууссан" }
                  : days <= 14 ? { cls: "bg-orange-500/20 text-orange-400", label: `${days}хон үлдсэн` }
                  : days <= 60 ? { cls: "bg-yellow-500/20 text-yellow-400", label: `${days}хон үлдсэн` }
                  : { cls: "bg-green-500/20 text-green-400", label: "Хүчинтэй" };
                return (
                  <tr key={d.id} className="border-t border-white/5 hover:bg-white/3">
                    <td className="px-4 py-3 text-white/70 text-xs">{vehMap[d.vehicleId] ?? "—"}</td>
                    <td className="px-4 py-3 font-medium text-white">{d.docName}</td>
                    <td className="px-4 py-3 text-white/50">{d.docNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-white/50">{d.expiryDate}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${status.cls}`}>{status.label}</span></td>
                    <td className="px-4 py-3"><button onClick={() => delDocMut.mutate(d.id)} className="text-red-400/60 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
