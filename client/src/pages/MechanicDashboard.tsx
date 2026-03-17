import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Truck, Plus, Trash2, LogOut, RefreshCw, ChevronDown,
  CheckCircle2, AlertTriangle, Calendar, Zap, FileText,
  Search, Edit2, X, Clock, ShieldCheck, History,
  Fuel, Timer, BarChart3, Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

function getHeaders() {
  return { "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") ?? "" };
}

const VEHICLE_TYPES = ["Экскаватор", "Бульдозер", "Автомашин", "Кран", "Грейдер", "Думпер", "Асфальт тавигч", "Өрмийн машин", "Кран", "Цементэн миксер", "Өөр"];

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

  const [tab, setTab] = useState<"vehicles" | "inspections" | "hours" | "fuel">("vehicles");
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

  const { data: vehicles = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/erp/vehicles"],
    queryFn: () => fetch("/api/erp/vehicles", { headers: getHeaders() }).then(r => r.json()),
  });

  const { data: inspections = [], isLoading: inspLoading } = useQuery<any[]>({
    queryKey: ["/api/erp/vehicle-inspections"],
    queryFn: () => fetch("/api/erp/vehicle-inspections", { headers: getHeaders() }).then(r => r.json()),
    enabled: tab === "inspections",
  });

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
            onClick={() => { localStorage.clear(); setLocation("/admin?role=MECHANIC"); }}
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
          <button onClick={() => setTab("vehicles")} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === "vehicles" ? "bg-orange-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
            <Truck className="w-4 h-4" /> Техникийн жагсаалт
          </button>
          <button onClick={() => setTab("inspections")} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === "inspections" ? "bg-orange-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
            <History className="w-4 h-4" /> Өмнөх үзлэгүүд
          </button>
          <button onClick={() => setTab("hours")} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === "hours" ? "bg-orange-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
            <Timer className="w-4 h-4" /> Цаг / Шатахуун
          </button>
          <button onClick={() => setTab("fuel")} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === "fuel" ? "bg-amber-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
            <Fuel className="w-4 h-4" /> Шатахуун төсөв
          </button>
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

        {/* ── ӨМНӨХ ҮЗЛЭГҮҮД ── */}
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
      </div>
    </div>
  );
}
