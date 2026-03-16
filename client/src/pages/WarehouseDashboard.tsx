import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Package, PackagePlus, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, XCircle, ChevronRight,
  ArrowUpCircle, ArrowDownCircle, RefreshCw, Plus, Trash2,
  BarChart3, Factory, Layers, Hammer, LogOut, Pencil
} from "lucide-react";
import type { WarehouseItem } from "@shared/schema";

const PLANT_LABELS: Record<string, { label: string; desc: string; icon: any; color: string }> = {
  asphalt:  { label: "Асфальтбетон хольцын үйлдвэр", desc: "Хоногт 150-200 м³", icon: Layers,   color: "amber" },
  concrete: { label: "Бетон зуурмагийн үйлдвэр",     desc: "Хоногт 1300-1800 м³", icon: Factory, color: "blue"  },
  crushing: { label: "Бутлах ангилах үйлдвэр",       desc: "Цагт 100 тн",         icon: Hammer,  color: "green" },
  general:  { label: "Нийтлэг нөөц",                 desc: "Бусад материал",      icon: Package, color: "slate" },
};

const CATEGORY_LABELS: Record<string, string> = {
  cement: "Цемент", bitumen: "Битум", stone: "Хайрга/Чулуу",
  sand: "Элс", mineral: "Минерал", other: "Бусад",
};

function getStatus(item: WarehouseItem): "ok" | "low" | "critical" | "empty" {
  const s = item.currentStock ?? 0;
  if (s <= 0) return "empty";
  if (s < (item.criticalStock ?? 0)) return "critical";
  if (s < (item.minStock ?? 0)) return "low";
  return "ok";
}

const STATUS_CONFIG = {
  ok:       { label: "Хангалттай",  color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/30",  icon: CheckCircle2,   bar: "bg-green-500" },
  low:      { label: "Дутагдалтай", color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/30",  icon: AlertTriangle,  bar: "bg-amber-500" },
  critical: { label: "Критик",      color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30",    icon: XCircle,        bar: "bg-red-500"   },
  empty:    { label: "Дууссан",     color: "text-red-500",    bg: "bg-red-600/10",    border: "border-red-600/40",    icon: XCircle,        bar: "bg-red-700"   },
};

function StockBar({ item }: { item: WarehouseItem }) {
  const max = Math.max((item.criticalStock ?? 0) * 1.5, (item.currentStock ?? 0) * 1.2, 1);
  const pct = Math.min(100, ((item.currentStock ?? 0) / max) * 100);
  const minPct = Math.min(100, ((item.minStock ?? 0) / max) * 100);
  const status = getStatus(item);
  const cfg = STATUS_CONFIG[status];
  return (
    <div className="relative h-2 bg-white/5 rounded-full w-full mt-1">
      <div className={`h-2 rounded-full transition-all ${cfg.bar}`} style={{ width: `${pct}%` }} />
      <div className="absolute top-0 w-[2px] h-2 bg-white/40 rounded" style={{ left: `${minPct}%` }} title="Хоногийн хэрэгцээ" />
    </div>
  );
}

export default function WarehouseDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"asphalt" | "concrete" | "crushing" | "general">("asphalt");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStock, setEditStock] = useState("");
  const [logModal, setLogModal] = useState<WarehouseItem | null>(null);
  const [logType, setLogType] = useState<"in" | "out">("in");
  const [logQty, setLogQty] = useState("");
  const [logNote, setLogNote] = useState("");
  const [addModal, setAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", category: "stone", unit: "тн", plant: "asphalt", minStock: 0, criticalStock: 0, normBasis: "" });

  const token = localStorage.getItem("authToken");
  const headers = { "x-admin-token": token ?? "" };

  const { data: items = [], isLoading } = useQuery<WarehouseItem[]>({
    queryKey: ["/api/warehouse/items"],
    queryFn: async () => {
      const r = await fetch("/api/warehouse/items", { headers });
      if (!r.ok) throw new Error("Алдаа");
      return r.json();
    },
  });

  const updateStock = useMutation({
    mutationFn: async ({ id, currentStock }: { id: number; currentStock: number }) => {
      return apiRequest("PATCH", `/api/warehouse/items/${id}/stock`, { currentStock }, { headers });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/items"] });
      setEditingId(null);
      toast({ title: "Нөөц шинэчлэгдлээ" });
    },
  });

  const addLog = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/warehouse/logs", data, { headers });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/items"] });
      setLogModal(null);
      setLogQty("");
      setLogNote("");
      toast({ title: logType === "in" ? "Орлого бүртгэгдлээ" : "Зарлага бүртгэгдлээ" });
    },
  });

  const addItem = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/warehouse/items", data, { headers });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/items"] });
      setAddModal(false);
      toast({ title: "Материал нэмэгдлээ" });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/warehouse/items/${id}`, undefined, { headers });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/items"] });
      toast({ title: "Устгагдлаа" });
    },
  });

  const tabItems = items.filter(i => i.plant === activeTab);
  const allStats = {
    ok:       items.filter(i => getStatus(i) === "ok").length,
    low:      items.filter(i => getStatus(i) === "low").length,
    critical: items.filter(i => getStatus(i) === "critical").length,
    empty:    items.filter(i => getStatus(i) === "empty").length,
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0f172a]/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="font-bold text-base leading-tight">Агуулахын нөөц</div>
              <div className="text-xs text-white/40">Хөвсгөл Зам ХК — Норм нормативт тулгуурлан</div>
            </div>
          </div>
          <button
            data-testid="btn-logout"
            onClick={() => { localStorage.removeItem("authToken"); localStorage.removeItem("userRole"); setLocation("/select-role"); }}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Гарах
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Stats summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Хангалттай", val: allStats.ok,       icon: CheckCircle2,  color: "text-green-400", bg: "bg-green-500/10" },
            { label: "Дутагдалтай", val: allStats.low,     icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Критик",     val: allStats.critical,  icon: XCircle,       color: "text-red-400",   bg: "bg-red-500/10"   },
            { label: "Дууссан",    val: allStats.empty,     icon: XCircle,       color: "text-red-600",   bg: "bg-red-600/10"   },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border border-white/10 ${s.bg} p-4 flex items-center gap-3`}>
              <s.icon className={`w-6 h-6 ${s.color} flex-shrink-0`} />
              <div>
                <div className={`text-xl font-bold ${s.color}`}>{s.val}</div>
                <div className="text-xs text-white/50">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Plant tabs */}
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(PLANT_LABELS) as Array<keyof typeof PLANT_LABELS>).map(k => {
            const cfg = PLANT_LABELS[k];
            const plantItems = items.filter(i => i.plant === k);
            const hasIssue = plantItems.some(i => getStatus(i) !== "ok");
            return (
              <button
                key={k}
                data-testid={`tab-${k}`}
                onClick={() => setActiveTab(k as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  activeTab === k
                    ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                    : "border-white/10 text-white/50 hover:border-white/20 hover:text-white/70"
                }`}
              >
                <cfg.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{cfg.label.split(" ")[0]}</span>
                {hasIssue && <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />}
              </button>
            );
          })}
          <button
            data-testid="btn-add-item"
            onClick={() => setAddModal(true)}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-amber-600 hover:bg-amber-500 text-white border border-amber-500 transition-all"
          >
            <Plus className="w-4 h-4" /> Материал нэмэх
          </button>
        </div>

        {/* Plant heading */}
        {(() => {
          const cfg = PLANT_LABELS[activeTab];
          return (
            <div className="flex items-center gap-3 border border-white/10 bg-white/3 rounded-xl p-4">
              <cfg.icon className="w-6 h-6 text-amber-400" />
              <div>
                <div className="font-semibold text-base">{cfg.label}</div>
                <div className="text-sm text-white/50">{cfg.desc} — БНбД норматив</div>
              </div>
              <div className="ml-auto flex gap-2">
                {["ok","low","critical","empty"].map(s => {
                  const cnt = tabItems.filter(i => getStatus(i) === s).length;
                  if (!cnt) return null;
                  const c = STATUS_CONFIG[s as keyof typeof STATUS_CONFIG];
                  return <span key={s} className={`text-xs px-2 py-0.5 rounded-full border ${c.bg} ${c.border} ${c.color}`}>{cnt} {c.label}</span>;
                })}
              </div>
            </div>
          );
        })()}

        {/* Items grid */}
        {isLoading ? (
          <div className="text-center py-16 text-white/40">Уншиж байна...</div>
        ) : tabItems.length === 0 ? (
          <div className="text-center py-16 text-white/40">Материал бүртгэгдээгүй байна</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tabItems.map(item => {
              const status = getStatus(item);
              const cfg = STATUS_CONFIG[status];
              const Icon = cfg.icon;
              const isEdit = editingId === item.id;
              return (
                <div
                  key={item.id}
                  data-testid={`item-card-${item.id}`}
                  className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 space-y-3 relative`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.name}</div>
                      <div className="text-xs text-white/40 mt-0.5">
                        {CATEGORY_LABELS[item.category] ?? item.category} · {item.unit}
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-medium shrink-0 ${cfg.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {cfg.label}
                    </div>
                  </div>

                  {/* Stock numbers */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-white/50">
                      <span>Одоогийн нөөц</span>
                      <span>Хоногийн норм</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-lg font-bold ${cfg.color}`}>{(item.currentStock ?? 0).toLocaleString()} {item.unit}</span>
                      <span className="text-sm text-white/50">{(item.minStock ?? 0).toLocaleString()} {item.unit}</span>
                    </div>
                    <StockBar item={item} />
                    <div className="text-xs text-white/30 mt-1">{item.normBasis}</div>
                  </div>

                  {/* Edit stock inline */}
                  {isEdit ? (
                    <div className="flex gap-2 mt-2">
                      <input
                        data-testid={`input-stock-${item.id}`}
                        type="number"
                        value={editStock}
                        onChange={e => setEditStock(e.target.value)}
                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500"
                        placeholder={`${item.unit}`}
                      />
                      <button
                        data-testid={`btn-save-stock-${item.id}`}
                        onClick={() => updateStock.mutate({ id: item.id, currentStock: parseFloat(editStock) || 0 })}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 rounded-lg text-xs font-medium transition-colors"
                      >Хадгалах</button>
                      <button onClick={() => setEditingId(null)} className="px-2 py-1.5 border border-white/20 rounded-lg text-xs text-white/50 hover:text-white transition-colors">✕</button>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-2">
                      <button
                        data-testid={`btn-in-${item.id}`}
                        onClick={() => { setLogModal(item); setLogType("in"); }}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 border border-green-500/30 text-green-400 hover:bg-green-500/10 rounded-lg text-xs font-medium transition-colors"
                      >
                        <ArrowUpCircle className="w-3.5 h-3.5" /> Орлого
                      </button>
                      <button
                        data-testid={`btn-out-${item.id}`}
                        onClick={() => { setLogModal(item); setLogType("out"); }}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg text-xs font-medium transition-colors"
                      >
                        <ArrowDownCircle className="w-3.5 h-3.5" /> Зарлага
                      </button>
                      <button
                        data-testid={`btn-edit-stock-${item.id}`}
                        onClick={() => { setEditingId(item.id); setEditStock(String(item.currentStock ?? 0)); }}
                        className="p-1.5 border border-white/10 text-white/40 hover:text-white/70 hover:border-white/30 rounded-lg transition-colors"
                        title="Шууд засах"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        data-testid={`btn-delete-${item.id}`}
                        onClick={() => { if (confirm("Устгах уу?")) deleteItem.mutate(item.id); }}
                        className="p-1.5 border border-white/10 text-white/40 hover:text-red-400 hover:border-red-500/30 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Log Modal */}
      {logModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="font-bold text-lg">
              {logType === "in" ? "📥 Орлого бүртгэх" : "📤 Зарлага бүртгэх"}
            </div>
            <div className="text-sm text-white/60">{logModal.name}</div>
            <div className="flex gap-3">
              <button onClick={() => setLogType("in")} className={`flex-1 py-2 rounded-lg text-sm border transition-all ${logType === "in" ? "bg-green-500/20 border-green-500/50 text-green-300" : "border-white/10 text-white/40"}`}>📥 Орлого</button>
              <button onClick={() => setLogType("out")} className={`flex-1 py-2 rounded-lg text-sm border transition-all ${logType === "out" ? "bg-red-500/20 border-red-500/50 text-red-300" : "border-white/10 text-white/40"}`}>📤 Зарлага</button>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Хэмжээ ({logModal.unit})</label>
              <input
                data-testid="input-log-qty"
                type="number"
                value={logQty}
                onChange={e => setLogQty(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Тэмдэглэл (заавал биш)</label>
              <input
                data-testid="input-log-note"
                type="text"
                value={logNote}
                onChange={e => setLogNote(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500"
                placeholder="Ачааны машины дугаар, зориулалт г.м"
              />
            </div>
            <div className="text-xs text-white/40">
              Одоогийн нөөц: <strong>{logModal.currentStock ?? 0} {logModal.unit}</strong>
              {" → "}<strong className={logType === "in" ? "text-green-400" : "text-red-400"}>
                {logType === "in"
                  ? ((logModal.currentStock ?? 0) + (parseFloat(logQty) || 0)).toFixed(1)
                  : Math.max(0, (logModal.currentStock ?? 0) - (parseFloat(logQty) || 0)).toFixed(1)} {logModal.unit}
              </strong>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setLogModal(null)} className="flex-1 border border-white/10 rounded-xl py-2.5 text-sm text-white/50 hover:text-white transition-colors">Болих</button>
              <button
                data-testid="btn-submit-log"
                onClick={() => {
                  if (!logQty || parseFloat(logQty) <= 0) { toast({ title: "Хэмжээ оруулна уу", variant: "destructive" }); return; }
                  addLog.mutate({ itemId: logModal.id, date: today, quantity: parseFloat(logQty), type: logType, notes: logNote, recordedBy: "Агуулахын ажилтан" });
                }}
                disabled={addLog.isPending}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${logType === "in" ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500"}`}
              >
                {addLog.isPending ? "..." : logType === "in" ? "Орлого бүртгэх" : "Зарлага бүртгэх"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add item modal */}
      {addModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="font-bold text-lg">Шинэ материал нэмэх</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-white/50 mb-1 block">Материалын нэр</label>
                <input
                  data-testid="input-new-name"
                  value={newItem.name}
                  onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  placeholder="Цемент ПЦ500 г.м"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Үйлдвэр</label>
                <select data-testid="select-new-plant" value={newItem.plant} onChange={e => setNewItem(p => ({ ...p, plant: e.target.value }))} className="w-full bg-[#0f172a] border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
                  <option value="asphalt">Асфальт</option>
                  <option value="concrete">Бетон</option>
                  <option value="crushing">Бутлах</option>
                  <option value="general">Нийтлэг</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Ангилал</label>
                <select data-testid="select-new-category" value={newItem.category} onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))} className="w-full bg-[#0f172a] border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Хэмжих нэгж</label>
                <input data-testid="input-new-unit" value={newItem.unit} onChange={e => setNewItem(p => ({ ...p, unit: e.target.value }))} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" placeholder="тн / м³ / ш" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Хоногийн норм ({newItem.unit})</label>
                <input data-testid="input-new-min" type="number" value={newItem.minStock} onChange={e => setNewItem(p => ({ ...p, minStock: parseFloat(e.target.value) || 0 }))} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Критик хэмжээ ({newItem.unit})</label>
                <input data-testid="input-new-critical" type="number" value={newItem.criticalStock} onChange={e => setNewItem(p => ({ ...p, criticalStock: parseFloat(e.target.value) || 0 }))} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-white/50 mb-1 block">Норм тооцооны үндэс (БНбД)</label>
                <input data-testid="input-new-norm" value={newItem.normBasis} onChange={e => setNewItem(p => ({ ...p, normBasis: e.target.value }))} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" placeholder="1м³ бетон = 0.32тн цемент × 1800м³" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAddModal(false)} className="flex-1 border border-white/10 rounded-xl py-2.5 text-sm text-white/50 hover:text-white transition-colors">Болих</button>
              <button
                data-testid="btn-submit-new-item"
                onClick={() => {
                  if (!newItem.name) { toast({ title: "Нэр оруулна уу", variant: "destructive" }); return; }
                  addItem.mutate({ ...newItem, currentStock: 0 });
                }}
                disabled={addItem.isPending}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
              >
                {addItem.isPending ? "..." : "Нэмэх"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
