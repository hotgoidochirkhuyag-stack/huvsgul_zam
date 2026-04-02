import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Truck, Plus, Trash2, LogOut, RefreshCw, ChevronDown,
  CheckCircle2, AlertTriangle, Calendar, Zap, FileText,
  Search, Edit2, X, Clock, ShieldCheck,
  BarChart3, Save, Printer,
  Wrench, Package, Bell, ClipboardList, MapPin, ChevronUp, Edit3,
} from "lucide-react";
import { printReport } from "@/lib/printReport";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

function getHeaders() {
  return { "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") ?? "" };
}

const VEHICLE_TYPES = ["Экскаватор", "Бульдозер", "Автомашин", "Кран", "Грейдер", "Думпер", "Асфальт тавигч", "Индүү", "Автопомп", "Миксер", "Өөр"];
const EQUIPMENT_TYPES: { value: string; label: string }[] = [
  { value: "vehicle",         label: "Автомашин / Тээврийн хэрэгсэл" },
  { value: "excavator",       label: "Экскаватор" },
  { value: "bulldozer",       label: "Бульдозер / Грейдер" },
  { value: "jaw_crusher",     label: "Хацарт бутлуур (Jaw Crusher)" },
  { value: "conveyor",        label: "Туузан дамжуулагч (Conveyor)" },
  { value: "screen",          label: "Ялгагч / Дэлгэц (Screen)" },
  { value: "motor",           label: "Мотор / Генератор" },
  { value: "concrete_plant",  label: "Бетон зуурмагийн үйлдвэр (YBS-90)" },
  { value: "asphalt_plant",   label: "Асфальт хольц хийгч үйлдвэр" },
];

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

  const [tab, setTab] = useState<"vehicles" | "maintenance" | "spareparts" | "alerts" | "report" | "schedule">("vehicles");
  const [search, setSearch] = useState("");
  const [filterReady, setFilterReady] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});

  const emptyForm = {
    plateNumber: "", name: "", type: "Экскаватор", equipmentType: "vehicle",
    capacity: "", location: "",
    lastInspectionDate: "", nextInspectionDate: "", isReady: true, readyNote: "", notes: "",
  };
  const [form, setForm] = useState(emptyForm);

  const { data: _vehiclesRaw, isLoading } = useQuery<any>({
    queryKey: ["/api/erp/vehicles"],
    queryFn: () => fetch("/api/erp/vehicles", { headers: getHeaders() }).then(r => r.json()),
  });
  const vehicles: any[] = Array.isArray(_vehiclesRaw) ? _vehiclesRaw : [];

  const vehicleMap = new Map(vehicles.map(v => [v.id, v]));

  // Захиалгын хуваарь
  const { data: _assignRaw, refetch: refetchAssign } = useQuery<any>({
    queryKey: ["/api/equipment/assignments"],
    queryFn: () => fetch("/api/equipment/assignments", { headers: getHeaders() }).then(r => r.json()),
  });
  const assignments: any[] = Array.isArray(_assignRaw) ? _assignRaw : [];
  const { data: _ordersRaw } = useQuery<any>({
    queryKey: ["/api/sales/orders"],
    queryFn: () => fetch("/api/sales/orders", { headers: getHeaders() }).then(r => r.json()),
  });
  const salesOrders: any[] = Array.isArray(_ordersRaw) ? _ordersRaw : [];

  const emptyAssign = { vehicleId: "", salesOrderId: "", assignedDate: TODAY, endDate: "", taskDescription: "", assignedBy: "", notes: "" };
  const [assignForm, setAssignForm] = useState(emptyAssign);
  const [showAssignForm, setShowAssignForm] = useState(false);

  const createAssignment = useMutation({
    mutationFn: (data: any) => fetch("/api/equipment/assignments", {
      method: "POST", headers: getHeaders(), body: JSON.stringify(data),
    }).then(r => r.json()),
    onSuccess: (res) => {
      if (res.error) { toast({ title: res.error, variant: "destructive" }); return; }
      qc.invalidateQueries({ queryKey: ["/api/equipment/assignments"] });
      qc.invalidateQueries({ queryKey: ["/api/erp/vehicles"] });
      toast({ title: "Тоног хуваарилагдлаа ✓" });
      setAssignForm(emptyAssign);
      setShowAssignForm(false);
    },
  });

  const patchAssignment = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => fetch(`/api/equipment/assignments/${id}`, {
      method: "PATCH", headers: getHeaders(), body: JSON.stringify(data),
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/equipment/assignments"] });
      qc.invalidateQueries({ queryKey: ["/api/erp/vehicles"] });
      toast({ title: "Шинэчлэгдлээ ✓" });
    },
  });

  const deleteAssignment = useMutation({
    mutationFn: (id: number) => fetch(`/api/equipment/assignments/${id}`, {
      method: "DELETE", headers: getHeaders(),
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/equipment/assignments"] });
      qc.invalidateQueries({ queryKey: ["/api/erp/vehicles"] });
      toast({ title: "Хуваарь устгагдлаа" });
    },
  });

  const updateHours = useMutation({
    mutationFn: ({ id, hoursUsed }: { id: number; hoursUsed: number }) =>
      fetch(`/api/equipment/assignments/${id}/hours`, {
        method: "PATCH", headers: getHeaders(),
        body: JSON.stringify({ hoursUsed }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/equipment/assignments"] });
      toast({ title: "✅ Ажилласан цаг хадгалагдлаа — өртгийн тооцоонд орлоо" });
      setHoursEdit(null);
    },
  });

  const [hoursEdit, setHoursEdit] = useState<{ id: number; val: string } | null>(null);


  function handleMechanicPrint() {
    const readyCount = vehicles.filter((v: any) => v.isReady).length;
    const notReady   = vehicles.filter((v: any) => !v.isReady).length;
    const statRow = [
      "<div class='stat-row'>",
      "<div class='stat-box'><div class='stat-val'>" + vehicles.length + "</div><div class='stat-lbl'>Нийт техник</div></div>",
      "<div class='stat-box'><div class='stat-val' style='color:#065f46'>" + readyCount + "</div><div class='stat-lbl'>Ажлын бэлэн</div></div>",
      "<div class='stat-box'><div class='stat-val' style='color:#991b1b'>" + notReady + "</div><div class='stat-lbl'>Засварт / бэлэн биш</div></div>",
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
            { key: "vehicles",     label: "Техникийн жагсаалт", icon: Truck,          badge: 0 },
            { key: "schedule",     label: "Захиалгын хуваарь",  icon: ClipboardList,  badge: assignments.filter(a => a.status === "active").length },
            { key: "maintenance",  label: "ТО хуваарь",         icon: Wrench,          badge: 0 },
            { key: "spareparts",   label: "Сэлбэг",             icon: Package,         badge: 0 },
            { key: "alerts",       label: "Анхааруулга",        icon: Bell,            badge: 0 },
            { key: "report",       label: "Тайлан",             icon: BarChart3,       badge: 0 },
          ] as { key: typeof tab; label: string; icon: any; badge: number }[]).map(t => (
            <button key={t.key} data-testid={`tab-${t.key}`} onClick={() => setTab(t.key)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === t.key ? "bg-orange-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
              <t.icon className="w-4 h-4" /> {t.label}
              {t.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center">{t.badge}</span>
              )}
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
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Дугаар (улсын / дотоод) *</label>
                    <input value={form.plateNumber} onChange={e => setForm(f => ({ ...f, plateNumber: e.target.value.toUpperCase() }))}
                      placeholder="0348УНА  /  BUT-001" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-orange-500/50 uppercase" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Техникийн нэр *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Хацарт бутлуур №1 / CAT 320D" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-orange-500/50" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Үзлэгийн чеклист загвар *</label>
                    <select value={form.equipmentType} onChange={e => setForm(f => ({ ...f, equipmentType: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none">
                      {EQUIPMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Техникийн төрөл</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none">
                      {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Байршил</label>
                    <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                      placeholder="Бутлуурын үйлдвэр / Талбай / Оффис" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-orange-500/50" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Хүчин чадал</label>
                    <input value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                      placeholder="20 тн / 320 к.с. / 150 м³/цаг" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-orange-500/50" />
                  </div>
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
                { label: "Нийт ажлын цаг",  value: assignments.reduce((s: number, a: any) => s + (a.hoursUsed ?? 0), 0).toFixed(1) + " ц", color: "text-amber-400" },
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
          </div>
        )}

        {/* ── ТО ХУВААРЬ ── */}
        {tab === "maintenance" && <MaintenanceTab vehicles={vehicles} qc={qc} toast={toast} />}

        {/* ── СЭЛБЭГ ХЭРЭГСЭЛ ── */}
        {tab === "spareparts" && <SparePartsTab vehicles={vehicles} qc={qc} toast={toast} />}

        {/* ── АНХААРУУЛГА ── */}
        {tab === "alerts" && <AlertsTab vehicles={vehicles} qc={qc} toast={toast} />}

        {/* ── ЗАХИАЛГЫН ХУВААРЬ ── */}
        {tab === "schedule" && (
          <div className="space-y-4">
            {/* Header + Add button */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-bold text-orange-300 flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                Техникийн захиалгын хуваарь
              </h2>
              <button onClick={() => setShowAssignForm(v => !v)}
                data-testid="btn-add-assignment"
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-orange-600 hover:bg-orange-500 text-white rounded-xl transition-all">
                <Plus className="w-4 h-4" />
                Техник хуваарилах
              </button>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Идэвхтэй хуваарь", val: assignments.filter(a => a.status === "active").length, cls: "text-green-400", bg: "bg-green-500/10" },
                { label: "Дууссан",           val: assignments.filter(a => a.status === "completed").length, cls: "text-blue-400", bg: "bg-blue-500/10" },
                { label: "Цуцлагдсан",        val: assignments.filter(a => a.status === "cancelled").length, cls: "text-red-400", bg: "bg-red-500/10" },
              ].map(s => (
                <div key={s.label} className={`${s.bg} border border-white/10 rounded-2xl p-4 text-center`}>
                  <div className={`text-2xl font-black ${s.cls}`}>{s.val}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Add form */}
            {showAssignForm && (
              <div className="bg-slate-900/80 border border-orange-500/30 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-sm text-orange-300">Шинэ хуваарь</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Техник *</label>
                    <select data-testid="assign-vehicle"
                      value={assignForm.vehicleId}
                      onChange={e => setAssignForm(f => ({ ...f, vehicleId: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50">
                      <option value="">— Сонгох —</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.name} ({v.plateNumber})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Захиалга (Sales)</label>
                    <select data-testid="assign-order"
                      value={assignForm.salesOrderId}
                      onChange={e => setAssignForm(f => ({ ...f, salesOrderId: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50">
                      <option value="">— Захиалга сонгох —</option>
                      {salesOrders.filter(o => ["confirmed","in_production"].includes(o.status)).map(o => (
                        <option key={o.id} value={o.id}>#{o.id} — {o.customerName} ({o.product})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Эхлэх огноо</label>
                    <input type="date" data-testid="assign-date"
                      value={assignForm.assignedDate}
                      onChange={e => setAssignForm(f => ({ ...f, assignedDate: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Дуусах огноо</label>
                    <input type="date" data-testid="assign-enddate"
                      value={assignForm.endDate}
                      onChange={e => setAssignForm(f => ({ ...f, endDate: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-slate-400 block mb-1">Даалгавар</label>
                    <input type="text" data-testid="assign-task"
                      placeholder="ж: Бетон помп — Зурвас цутгалт"
                      value={assignForm.taskDescription}
                      onChange={e => setAssignForm(f => ({ ...f, taskDescription: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Хариуцсан</label>
                    <input type="text" data-testid="assign-by"
                      placeholder="Хуваарилсан хүн"
                      value={assignForm.assignedBy}
                      onChange={e => setAssignForm(f => ({ ...f, assignedBy: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Тэмдэглэл</label>
                    <input type="text" data-testid="assign-notes"
                      value={assignForm.notes}
                      onChange={e => setAssignForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => createAssignment.mutate(assignForm)}
                    disabled={!assignForm.vehicleId || createAssignment.isPending}
                    data-testid="btn-save-assignment"
                    className="flex items-center gap-2 px-5 py-2 text-sm font-bold bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white rounded-xl transition-all">
                    <Save className="w-4 h-4" />
                    {createAssignment.isPending ? "Хадгалж байна..." : "Хадгалах"}
                  </button>
                  <button onClick={() => setShowAssignForm(false)}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 rounded-xl">
                    Болих
                  </button>
                </div>
              </div>
            )}

            {/* Assignments table */}
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Техник</th>
                      <th className="px-4 py-3 text-left">Захиалга / Харилцагч</th>
                      <th className="px-4 py-3 text-left">Даалгавар</th>
                      <th className="px-4 py-3 text-left">Огноо</th>
                      <th className="px-4 py-3 text-left">Ажилласан цаг</th>
                      <th className="px-4 py-3 text-left">Статус</th>
                      <th className="px-4 py-3 text-left">Үйлдэл</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {assignments.map(a => {
                      const statusCfg = {
                        active:    { cls: "bg-green-500/15 text-green-400", label: "Идэвхтэй" },
                        completed: { cls: "bg-blue-500/15 text-blue-400",   label: "Дууссан" },
                        cancelled: { cls: "bg-red-500/15 text-red-400",     label: "Цуцлагдсан" },
                      }[a.status as string] ?? { cls: "bg-white/10 text-white/40", label: a.status };
                      const isEditingHours = hoursEdit?.id === a.id;
                      return (
                        <tr key={a.id} data-testid={`assignment-row-${a.id}`} className="hover:bg-white/3 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-sm">{a.vehicleName ?? "—"}</div>
                            <div className="text-xs text-slate-500">{a.vehiclePlate} · {a.vehicleType}</div>
                          </td>
                          <td className="px-4 py-3">
                            {a.customerName ? (
                              <>
                                <div className="font-medium">{a.customerName}</div>
                                <div className="text-xs text-slate-500">#{a.salesOrderId} · {a.product}</div>
                              </>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-300 max-w-[180px] truncate">{a.taskDescription ?? "—"}</td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-slate-400">{a.assignedDate}</div>
                            {a.endDate && <div className="text-xs text-slate-500">→ {a.endDate}</div>}
                          </td>
                          {/* Ажилласан цаг */}
                          <td className="px-4 py-3">
                            {isEditingHours ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number" min="0" step="0.5"
                                  value={hoursEdit.val}
                                  onChange={e => setHoursEdit({ id: a.id, val: e.target.value })}
                                  className="w-16 bg-slate-700 border border-orange-500/50 rounded px-2 py-1 text-xs text-white focus:outline-none"
                                  autoFocus
                                  data-testid={`input-hours-${a.id}`}
                                />
                                <span className="text-xs text-slate-500">ц</span>
                                <button
                                  onClick={() => updateHours.mutate({ id: a.id, hoursUsed: parseFloat(hoursEdit.val) || 0 })}
                                  disabled={updateHours.isPending}
                                  data-testid={`btn-save-hours-${a.id}`}
                                  className="p-1 rounded bg-orange-600 hover:bg-orange-500 text-white transition-all">
                                  <Save className="w-3 h-3" />
                                </button>
                                <button onClick={() => setHoursEdit(null)}
                                  className="p-1 rounded text-slate-500 hover:text-white transition-all">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                data-testid={`btn-edit-hours-${a.id}`}
                                onClick={() => setHoursEdit({ id: a.id, val: String(a.hoursUsed ?? 0) })}
                                className="flex items-center gap-1.5 text-xs group"
                              >
                                <span className={`font-bold ${(a.hoursUsed ?? 0) > 0 ? "text-amber-400" : "text-slate-600"}`}>
                                  {(a.hoursUsed ?? 0) > 0 ? `${a.hoursUsed}ц` : "—"}
                                </span>
                                {(a.hoursUsed ?? 0) > 0 && a.hourlyRate > 0 && (
                                  <span className="text-[10px] text-slate-500">
                                    ({((a.hoursUsed ?? 0) * a.hourlyRate).toLocaleString("mn-MN")}₮)
                                  </span>
                                )}
                                <Edit3 className="w-3 h-3 text-slate-600 group-hover:text-orange-400 transition-colors" />
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusCfg.cls}`}>{statusCfg.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            {a.status === "active" && (
                              <div className="flex gap-1">
                                <button onClick={() => patchAssignment.mutate({ id: a.id, data: { status: "completed", endDate: new Date().toISOString().slice(0,10) } })}
                                  data-testid={`btn-complete-${a.id}`}
                                  className="px-2 py-1 text-xs font-bold text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 rounded-lg transition-all">
                                  Дуусгах
                                </button>
                                <button onClick={() => patchAssignment.mutate({ id: a.id, data: { status: "cancelled" } })}
                                  data-testid={`btn-cancel-assign-${a.id}`}
                                  className="px-2 py-1 text-xs font-bold text-red-400 border border-red-500/30 hover:bg-red-500/10 rounded-lg transition-all">
                                  Цуцлах
                                </button>
                              </div>
                            )}
                            {a.status !== "active" && (
                              <button onClick={() => deleteAssignment.mutate(a.id)}
                                data-testid={`btn-delete-assign-${a.id}`}
                                className="px-2 py-1 text-xs font-bold text-slate-500 hover:text-red-400 rounded-lg transition-all">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {assignments.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                        <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        Хуваарилалт байхгүй байна
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

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
  const [form, setForm] = useState({ vehicleId: "", toType: "TO1", scheduledDate: today, description: "", technicianName: "", hoursAtService: "", cost: "", notes: "", fuelUsed: "", fuelType: "diesel" });
  const [doneForm, setDoneForm] = useState<{ id: number; fuelUsed: string; fuelType: string } | null>(null);

  const { data: _schedsRaw } = useQuery<any>({
    queryKey: ["/api/maintenance-schedules"],
    queryFn: () => fetch("/api/maintenance-schedules", { headers: hdrs() }).then(r => r.json()),
  });
  const schedules: any[] = Array.isArray(_schedsRaw) ? _schedsRaw : [];
  const addMut = useMutation({
    mutationFn: (d: any) => fetch("/api/maintenance-schedules", { method: "POST", headers: hdrs(), body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/maintenance-schedules"] }); setShowForm(false); toast({ title: "ТО хуваарь нэмэгдлээ" }); },
  });
  const doneMut = useMutation({
    mutationFn: ({ id, completedDate, fuelUsed, fuelType }: any) => fetch(`/api/maintenance-schedules/${id}`, { method: "PATCH", headers: hdrs(), body: JSON.stringify({ status: "done", completedDate, fuelUsed: fuelUsed ? parseFloat(fuelUsed) : null, fuelType }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/maintenance-schedules"] }); setDoneForm(null); toast({ title: "Гүйцэтгэл тэмдэглэгдлээ" }); },
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

  const upcoming  = schedules.filter((s: any) => s.status === "scheduled" && s.scheduledDate >= today).length;
  const done      = schedules.filter((s: any) => s.status === "done").length;
  const overdue   = schedules.filter((s: any) => s.status === "scheduled" && s.scheduledDate < today).length;
  const totalFuel = schedules.filter((s: any) => s.status === "done").reduce((sum: number, s: any) => sum + (s.fuelUsed ?? 0), 0);

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-orange-300">{totalFuel.toFixed(0)}л</div>
          <div className="text-xs text-orange-400/70 mt-0.5">Нийт шатахуун</div>
        </div>
      </div>

      {/* Гүйцэтгэл бичих мини форм */}
      {doneForm && (
        <div className="bg-slate-900/80 border border-green-500/30 rounded-xl p-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-green-300 font-semibold">Гүйцэтгэл бичих — шатахуун (сонгоц):</span>
          <input type="number" value={doneForm.fuelUsed} onChange={e => setDoneForm(p => p ? { ...p, fuelUsed: e.target.value } : p)}
            placeholder="Шатахуун (л)" className="w-32 bg-slate-800 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none" />
          <select value={doneForm.fuelType} onChange={e => setDoneForm(p => p ? { ...p, fuelType: e.target.value } : p)}
            className="bg-slate-800 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none">
            <option value="diesel">Дизель</option>
            <option value="petrol">Бензин</option>
          </select>
          <button onClick={() => doneMut.mutate({ id: doneForm.id, completedDate: today, fuelUsed: doneForm.fuelUsed, fuelType: doneForm.fuelType })}
            disabled={doneMut.isPending}
            className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-xl transition-all">
            Хадгалах ✓
          </button>
          <button onClick={() => setDoneForm(null)} className="px-3 py-1.5 bg-slate-700 text-slate-300 text-sm rounded-xl">Цуцлах</button>
        </div>
      )}

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
          <div className="flex gap-2">
            <input type="number" value={form.fuelUsed} onChange={e => setForm(p => ({ ...p, fuelUsed: e.target.value }))}
              placeholder="Шатахуун (литр)" className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
            <select value={form.fuelType} onChange={e => setForm(p => ({ ...p, fuelType: e.target.value }))}
              className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
              <option value="diesel">Дизель</option>
              <option value="petrol">Бензин</option>
            </select>
          </div>
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Хийх ажлын тайлбар" rows={2}
            className="md:col-span-2 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none resize-none" />
          <div className="md:col-span-2 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-700 text-slate-300 text-sm rounded-xl">Цуцлах</button>
            <button onClick={() => { if (!form.vehicleId) return; addMut.mutate({ ...form, vehicleId: parseInt(form.vehicleId), hoursAtService: form.hoursAtService ? parseFloat(form.hoursAtService) : null, cost: form.cost ? parseFloat(form.cost) : null, fuelUsed: form.fuelUsed ? parseFloat(form.fuelUsed) : null, status: "scheduled" }); }}
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
              <th className="px-4 py-3">Шатахуун</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3">Үйлдэл</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-white/30">ТО хуваарь байхгүй байна</td></tr>
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
                  <td className="px-4 py-3 text-white/50">{s.fuelUsed ? `${s.fuelUsed}л ${s.fuelType === "petrol" ? "🟡" : "⚫"}` : "—"}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${STATUS_COLORS[displayStatus]}`}>{STATUS_LABELS[displayStatus]}</span></td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    {s.status === "scheduled" && (
                      <button onClick={() => setDoneForm({ id: s.id, fuelUsed: "", fuelType: "diesel" })}
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

  const { data: _partsRaw } = useQuery<any>({
    queryKey: ["/api/spare-parts"],
    queryFn: () => fetch("/api/spare-parts", { headers: hdrs() }).then(r => r.json()),
  });
  const parts: any[] = Array.isArray(_partsRaw) ? _partsRaw : [];
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

  const { data: _alertsRaw, isLoading } = useQuery<any>({
    queryKey: ["/api/expiry-alerts"],
    queryFn: () => fetch("/api/expiry-alerts", { headers: hdrs() }).then(r => r.json()),
    refetchInterval: 60000,
  });
  const alerts: any[] = Array.isArray(_alertsRaw) ? _alertsRaw : [];
  const { data: _vdocsRaw } = useQuery<any>({
    queryKey: ["/api/vehicle-documents"],
    queryFn: () => fetch("/api/vehicle-documents", { headers: hdrs() }).then(r => r.json()),
  });
  const vdocs: any[] = Array.isArray(_vdocsRaw) ? _vdocsRaw : [];
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
