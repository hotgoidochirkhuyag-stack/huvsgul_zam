import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Truck, Plus, Trash2, LogOut, RefreshCw, ChevronDown,
  CheckCircle2, AlertTriangle, Calendar, Zap, FileText,
  Search, Edit2, X, Clock, ShieldCheck, History
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

  const [tab, setTab] = useState<"vehicles" | "inspections">("vehicles");
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
              <h1 className="text-lg font-black uppercase tracking-widest text-white">Механик Инженер</h1>
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
        <div className="flex gap-2 mb-5">
          <button onClick={() => setTab("vehicles")} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === "vehicles" ? "bg-orange-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
            <Truck className="w-4 h-4" /> Техникийн жагсаалт
          </button>
          <button onClick={() => setTab("inspections")} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === "inspections" ? "bg-orange-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
            <History className="w-4 h-4" /> Өмнөх үзлэгүүд
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
