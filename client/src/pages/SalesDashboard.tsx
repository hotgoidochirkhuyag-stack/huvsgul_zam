import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp, LogOut, Plus, Search, CheckCircle2,
  Clock, Truck, XCircle, Calculator, BarChart3,
  Loader2, AlertCircle, PackageCheck, Hammer, Send
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import ReportUploadButton from "@/components/ReportUploadButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { SalesOrder, ProductionCostConfig } from "@shared/schema";

const NAVY = "#0f172a";

// Бүтээгдэхүүний жагсаалт
const PRODUCTS = [
  { value: "concrete_m200", label: "Бетон М200", plant: "concrete", unit: "м³" },
  { value: "concrete_m300", label: "Бетон М300", plant: "concrete", unit: "м³" },
  { value: "concrete_m400", label: "Бетон М400", plant: "concrete", unit: "м³" },
  { value: "asphalt",       label: "Асфальт АБ-1",  plant: "asphalt", unit: "тн" },
  { value: "crushed_stone", label: "Бутласан чулуу", plant: "crushing", unit: "тн" },
];

// Асфальтын материалын норм (1тн асфальтад)
const MATERIAL_NORMS: Record<string, { name: string; qty: number; unit: string }[]> = {
  asphalt: [
    { name: "Битум БНД 60/90", qty: 0.052, unit: "тн" },
    { name: "Хайрга 10-20мм",  qty: 0.517, unit: "тн" },
    { name: "Хайрга 5-10мм",   qty: 0.423, unit: "тн" },
    { name: "Хайрга 2-5мм",    qty: 0.329, unit: "тн" },
    { name: "Элс (асфальт)",   qty: 0.387, unit: "тн" },
    { name: "Минерал нунтаг",  qty: 0.212, unit: "тн" },
  ],
  concrete: [
    { name: "Цемент ПЦ400", qty: 0.35, unit: "тн" },
    { name: "Элс",          qty: 0.70, unit: "м³" },
    { name: "Хайрга 5-20мм",qty: 1.00, unit: "м³" },
    { name: "Химийн нэмэлт",qty: 1.00, unit: "кг" },
  ],
  crushing: [
    { name: "Байгалийн чулуу (оролт)", qty: 1.15, unit: "тн" },
    { name: "Шатах тос",               qty: 0.625, unit: "л" },
  ],
};

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending:       { label: "Хүлээгдэж буй",   color: "bg-amber-500/20 text-amber-300 border-amber-500/30",  icon: Clock },
  confirmed:     { label: "Баталгаажсан",     color: "bg-blue-500/20 text-blue-300 border-blue-500/30",    icon: CheckCircle2 },
  in_production: { label: "Үйлдвэрлэлд",     color: "bg-purple-500/20 text-purple-300 border-purple-500/30", icon: Hammer },
  delivered:     { label: "Хүргэгдсэн",       color: "bg-green-500/20 text-green-300 border-green-500/30",  icon: PackageCheck },
  cancelled:     { label: "Цуцлагдсан",       color: "bg-red-500/20 text-red-300 border-red-500/30",        icon: XCircle },
};

function fmt(n: number) {
  return n.toLocaleString("mn-MN");
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`p-4 rounded-xl border ${color} bg-slate-900/60`}>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-xl font-black text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

// ── Захиалга нэмэх modal ─────────────────────────────────────────────────────
function NewOrderModal({ onClose, configs }: { onClose: () => void; configs: ProductionCostConfig[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState({
    customerName: "", product: "concrete_m300", quantity: "",
    deliveryDate: "", location: "", notes: "", confirmedBy: "",
    pricePerUnit: "", costPerUnit: "",
  });

  // AI-аар материалын үнэ татах
  const [materialPrices, setMaterialPrices] = useState<{ name: string; qty: number; unit: string; pricePerUnit: string }[]>([]);
  const [costResult, setCostResult] = useState<any>(null);
  const [loadingCost, setLoadingCost] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);

  const selectedProduct = PRODUCTS.find(p => p.value === form.product)!;

  // Материалын норм татах
  const loadNorms = () => {
    const norms = MATERIAL_NORMS[selectedProduct.plant] || [];
    setMaterialPrices(norms.map(n => ({ ...n, pricePerUnit: "" })));
    setShowMaterials(true);
    setCostResult(null);
  };

  // Өртгийн тооцоолол хийх
  const calcCost = async () => {
    setLoadingCost(true);
    try {
      const config = configs.find(c => c.plant === selectedProduct.plant);
      if (!config) { toast({ title: "Үйлдвэрийн тохиргоо олдсонгүй", variant: "destructive" }); return; }

      const aiMaterialCosts = materialPrices.map(m => ({
        name: m.name,
        quantity: m.qty,
        pricePerUnit: Number(m.pricePerUnit) || 0,
      }));

      const resp = await fetch("/api/sales/calculate-cost", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") ?? "" },
        body: JSON.stringify({ plant: selectedProduct.plant, aiMaterialCosts }),
      });
      const data = await resp.json();
      setCostResult(data);
      setForm(f => ({ ...f, costPerUnit: String(data.totalCostPerUnit) }));
    } catch (e) {
      toast({ title: "Тооцооллын алдаа", variant: "destructive" });
    } finally {
      setLoadingCost(false);
    }
  };

  const createOrder = useMutation({
    mutationFn: async (body: any) => {
      const r = await fetch("/api/sales/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") ?? "" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/sales/orders"] });
      qc.invalidateQueries({ queryKey: ["/api/sales/profitability-summary"] });
      toast({ title: "Захиалга амжилттай нэмэгдлээ" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Алдаа", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName || !form.quantity) {
      toast({ title: "Харилцагчийн нэр болон хэмжээ заавал бөглөнө", variant: "destructive" });
      return;
    }
    createOrder.mutate({
      customerName: form.customerName,
      product: form.product,
      unit: selectedProduct.unit,
      quantity: Number(form.quantity),
      pricePerUnit: form.pricePerUnit ? Number(form.pricePerUnit) : null,
      costPerUnit: form.costPerUnit ? Number(form.costPerUnit) : null,
      deliveryDate: form.deliveryDate || null,
      location: form.location || null,
      notes: form.notes || null,
      confirmedBy: form.confirmedBy || null,
      status: "pending",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Шинэ захиалга нэмэх</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><XCircle size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Харилцагчийн нэр *</label>
              <Input data-testid="input-customer-name"
                className="bg-slate-800 border-slate-600 text-white"
                value={form.customerName}
                onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                placeholder="Байгууллага / Хувь хүн" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Бүтээгдэхүүн *</label>
              <select data-testid="select-product"
                className="w-full bg-slate-800 border border-slate-600 text-white rounded-md px-3 py-2 text-sm"
                value={form.product}
                onChange={e => {
                  setForm(f => ({ ...f, product: e.target.value, costPerUnit: "", pricePerUnit: "" }));
                  setMaterialPrices([]);
                  setCostResult(null);
                  setShowMaterials(false);
                }}>
                {PRODUCTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Хэмжээ ({selectedProduct.unit}) *</label>
              <Input data-testid="input-quantity"
                type="number" min="0"
                className="bg-slate-800 border-slate-600 text-white"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Нийлүүлэх огноо</label>
              <Input data-testid="input-delivery-date"
                type="date"
                className="bg-slate-800 border-slate-600 text-white"
                value={form.deliveryDate}
                onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Хүргэлтийн хаяг</label>
              <Input data-testid="input-location"
                className="bg-slate-800 border-slate-600 text-white"
                placeholder="Мөрөн, Ханх..."
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
          </div>

          {/* ── Өртгийн тооцоолол ── */}
          <div className="border border-amber-500/30 rounded-xl p-4 bg-amber-500/5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <Calculator size={16} /> Өртгийн тооцоолол (AI норм)
              </p>
              <Button type="button" size="sm" variant="outline"
                className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 text-xs"
                onClick={loadNorms} data-testid="btn-load-norms">
                Норм татах
              </Button>
            </div>

            {showMaterials && (
              <div className="space-y-2 mb-4">
                <p className="text-xs text-slate-400">Материалын нэгж үнийг баталгаажуулна уу (₮)</p>
                {materialPrices.map((m, i) => (
                  <div key={m.name} className="flex items-center gap-3">
                    <span className="text-xs text-slate-300 w-36 truncate">{m.name}</span>
                    <span className="text-xs text-slate-500 w-20">{m.qty} {m.unit}/нэгж</span>
                    <Input
                      type="number" min="0"
                      className="bg-slate-700 border-slate-600 text-white text-xs h-8 flex-1"
                      placeholder="Нэгж үнэ ₮"
                      value={m.pricePerUnit}
                      onChange={e => {
                        const copy = [...materialPrices];
                        copy[i] = { ...copy[i], pricePerUnit: e.target.value };
                        setMaterialPrices(copy);
                      }}
                      data-testid={`input-material-price-${i}`} />
                  </div>
                ))}
                <Button type="button" size="sm"
                  className="w-full bg-amber-600 hover:bg-amber-500 text-black font-bold mt-2"
                  onClick={calcCost} disabled={loadingCost}
                  data-testid="btn-calculate-cost">
                  {loadingCost ? <Loader2 size={14} className="animate-spin mr-1" /> : <Calculator size={14} className="mr-1" />}
                  Өртөг тооцоолох
                </Button>
              </div>
            )}

            {costResult && (
              <div className="bg-slate-800 rounded-lg p-3 space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-slate-400">Материалын өртөг</span><span className="text-white">{fmt(costResult.materialCost)}₮</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Хөдөлмөрийн зардал/нэгж</span><span className="text-white">{fmt(costResult.laborCostPerUnit)}₮</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Цахилгааны зардал</span><span className="text-white">{fmt(costResult.powerCostPerUnit)}₮</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Техникийн зардал</span><span className="text-white">{fmt(costResult.equipmentCostPerUnit)}₮</span></div>
                <div className="flex justify-between pt-1.5 border-t border-slate-600 font-bold">
                  <span className="text-amber-300">Нийт өртөг / {selectedProduct.unit}</span>
                  <span className="text-amber-300">{fmt(costResult.totalCostPerUnit)}₮</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Тохирсон борлуулалтын үнэ / {selectedProduct.unit} (₮)</label>
              <Input data-testid="input-price-per-unit"
                type="number" min="0"
                className="bg-slate-800 border-slate-600 text-white"
                placeholder="Борлуулалтын үнэ"
                value={form.pricePerUnit}
                onChange={e => setForm(f => ({ ...f, pricePerUnit: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Тооцоосон өртөг / {selectedProduct.unit} (₮)</label>
              <Input data-testid="input-cost-per-unit"
                type="number" min="0"
                className="bg-slate-800 border-slate-600 text-white"
                placeholder="Автоматаар тооцоологдсон"
                value={form.costPerUnit}
                onChange={e => setForm(f => ({ ...f, costPerUnit: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Баталгаажуулсан ажилтан</label>
              <Input data-testid="input-confirmed-by"
                className="bg-slate-800 border-slate-600 text-white"
                placeholder="Борлуулагчийн нэр"
                value={form.confirmedBy}
                onChange={e => setForm(f => ({ ...f, confirmedBy: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Тэмдэглэл</label>
              <Input data-testid="input-notes"
                className="bg-slate-800 border-slate-600 text-white"
                placeholder="Нэмэлт тайлбар..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 border-slate-600 text-slate-300"
              onClick={onClose} data-testid="btn-cancel-order">
              Болих
            </Button>
            <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-500 text-black font-bold"
              disabled={createOrder.isPending} data-testid="btn-submit-order">
              {createOrder.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : <Plus size={14} className="mr-1" />}
              Захиалга нэмэх
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Захиалгын мөр ─────────────────────────────────────────────────────────────
function OrderRow({ order, onStatusChange, onContractConfirm }: {
  order: SalesOrder;
  onStatusChange: (id: number, status: string) => void;
  onContractConfirm: (order: SalesOrder) => void;
}) {
  const s = STATUS_MAP[order.status ?? "pending"] ?? STATUS_MAP.pending;
  const StatusIcon = s.icon;
  const margin = order.pricePerUnit && order.costPerUnit
    ? Math.round(((order.pricePerUnit - order.costPerUnit) / order.pricePerUnit) * 100)
    : null;

  return (
    <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-4 flex flex-col gap-3"
      data-testid={`order-row-${order.id}`}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-bold text-white text-sm">{order.customerName}</span>
            <Badge className={`text-xs border ${s.color}`}>
              <StatusIcon size={10} className="mr-1" />{s.label}
            </Badge>
            {margin !== null && (
              <Badge className={`text-xs border ${margin >= 0 ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-red-500/20 text-red-300 border-red-500/30"}`}>
                {margin >= 0 ? "+" : ""}{margin}% ашиг
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-400">
            {PRODUCTS.find(p => p.value === order.product)?.label ?? order.product} —{" "}
            <span className="text-amber-300 font-bold">{fmt(order.quantity ?? 0)} {order.unit}</span>
            {order.location && ` · ${order.location}`}
            {order.deliveryDate && ` · ${order.deliveryDate}`}
          </p>
          {(order.pricePerUnit || order.costPerUnit) && (
            <p className="text-xs text-slate-500 mt-1">
              {order.costPerUnit ? `Өртөг: ${fmt(order.costPerUnit)}₮` : ""}
              {order.pricePerUnit ? ` · Борлуулалт: ${fmt(order.pricePerUnit)}₮` : ""}
              {order.pricePerUnit && order.quantity ? ` · Нийт: ${fmt(Math.round(order.pricePerUnit * order.quantity))}₮` : ""}
            </p>
          )}
          {order.confirmedBy && <p className="text-xs text-slate-600 mt-0.5">Борлуулагч: {order.confirmedBy}</p>}
        </div>
        <div className="shrink-0">
          <select
            className="bg-slate-800 border border-slate-600 text-white rounded-lg px-2 py-1.5 text-xs"
            value={order.status ?? "pending"}
            onChange={e => onStatusChange(order.id, e.target.value)}
            data-testid={`select-status-${order.id}`}>
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Гэрээний урсгал */}
      {order.status === "pending" && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
          <Button size="sm"
            className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-xs h-7"
            onClick={() => { onStatusChange(order.id, "confirmed"); }}
            data-testid={`btn-send-contract-${order.id}`}>
            <Send size={11} className="mr-1" /> Гэрээ явуулах
          </Button>
          <span className="text-xs text-slate-600">→ Харилцагчид цахим гэрээ явуулж баталгаажуулна</span>
        </div>
      )}
      {order.status === "confirmed" && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
          <Button size="sm"
            className="bg-green-600/20 hover:bg-green-600/40 text-green-300 border border-green-500/30 text-xs h-7"
            onClick={() => onContractConfirm(order)}
            data-testid={`btn-confirm-contract-${order.id}`}>
            <CheckCircle2 size={11} className="mr-1" /> Гэрээ баталгаажлаа → Үйлдвэрт явуулах
          </Button>
          <span className="text-xs text-slate-600">→ Хяналтын инженерт ажлын захиалга явна</span>
        </div>
      )}
      {order.status === "in_production" && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
          <Hammer size={12} className="text-purple-400" />
          <span className="text-xs text-purple-400">Үйлдвэрлэлд шилжсэн — Хяналтын инженерт мэдэгдсэн</span>
        </div>
      )}
    </div>
  );
}

// ── Ашигт ажиллагааны самбар ──────────────────────────────────────────────────
function ProfitPanel() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/sales/profitability-summary"],
    queryFn: () => fetch("/api/sales/profitability-summary", {
      headers: { "x-admin-token": localStorage.getItem("adminToken") ?? "" }
    }).then(r => r.json()),
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="text-slate-400 text-sm p-4">Уншиж байна...</div>;
  if (!data) return null;

  const plantName: Record<string, string> = {
    concrete: "Бетоны үйлдвэр",
    asphalt:  "Асфальтын үйлдвэр",
    crushing: "Бутлуурын үйлдвэр",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Нийт орлого" value={`${fmt(data.totalRevenue)}₮`}
          color="border-green-500/30" />
        <StatCard label="Нийт өртөг" value={`${fmt(data.totalCost)}₮`}
          color="border-red-500/30" />
        <StatCard label="Цэвэр ашиг" value={`${fmt(data.totalProfit)}₮`}
          sub={`Ашигт ажиллагаа: ${data.marginPct}%`}
          color="border-amber-500/30" />
        <StatCard label="Нийт борлуулалт" value={`${fmt(data.totalQty)}`}
          sub={`${data.orderCount} захиалга`}
          color="border-blue-500/30" />
      </div>

      {/* 30%-ийн зорилтын явц */}
      <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4">
        <p className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <BarChart3 size={15} className="text-amber-400" />
          30%-ийн хүчин чадлын зорилтын явц (сарын)
        </p>
        <div className="space-y-4">
          {(data.plantProgress ?? []).map((p: any) => {
            const pct = Math.min(p.achievedPct, 100);
            const color = pct >= 100 ? "bg-green-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500";
            return (
              <div key={p.plant} data-testid={`plant-progress-${p.plant}`}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium">{plantName[p.plant] ?? p.plant}</span>
                  <span className="text-slate-400">
                    {fmt(p.deliveredQty)} / {fmt(p.monthlyTarget)} нэгж
                    <span className={`ml-2 font-bold ${pct >= 100 ? "text-green-400" : pct >= 60 ? "text-amber-400" : "text-red-400"}`}>
                      {p.achievedPct}%
                    </span>
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2.5">
                  <div className={`${color} h-2.5 rounded-full transition-all`}
                    style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Хүчин чадал: {fmt(p.dailyCapacity)} нэгж/өдөр · Зорилт: {p.targetPct}% ({fmt(p.monthlyTarget)} нэгж/сар)
                </p>
              </div>
            );
          })}
          {(!data.plantProgress || data.plantProgress.length === 0) && (
            <p className="text-slate-500 text-xs text-center py-4">
              Үйлдвэрийн тохиргоо байхгүй байна. Admin самбараас тохируулна уу.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Үндсэн самбар ─────────────────────────────────────────────────────────────
export default function SalesDashboard() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [tab, setTab] = useState<"orders" | "profit">("orders");
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("userRole");
    setLocation("/select-role");
  };

  const { data: _ordersRaw, isLoading: ordersLoading } = useQuery<any>({
    queryKey: ["/api/sales/orders"],
    queryFn: () => fetch("/api/sales/orders", {
      headers: { "x-admin-token": localStorage.getItem("adminToken") ?? "" }
    }).then(r => r.json()),
    refetchInterval: 15000,
  });
  const orders: SalesOrder[] = Array.isArray(_ordersRaw) ? _ordersRaw : [];

  const { data: _configsRaw } = useQuery<any>({
    queryKey: ["/api/sales/cost-config"],
    queryFn: () => fetch("/api/sales/cost-config", {
      headers: { "x-admin-token": localStorage.getItem("adminToken") ?? "" }
    }).then(r => r.json()),
  });
  const configs: ProductionCostConfig[] = Array.isArray(_configsRaw) ? _configsRaw : [];

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const r = await fetch(`/api/sales/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") ?? "" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/sales/orders"] });
      qc.invalidateQueries({ queryKey: ["/api/sales/profitability-summary"] });
      toast({ title: "Төлөв шинэчлэгдлээ" });
    },
    onError: (e: any) => toast({ title: "Алдаа", description: e.message, variant: "destructive" }),
  });

  const contractConfirm = useMutation({
    mutationFn: async (order: SalesOrder) => {
      // Статусыг "in_production" болгох
      await fetch(`/api/sales/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") ?? "" },
        body: JSON.stringify({ status: "in_production" }),
      });
      // Хяналтын инженер + Администраторт мэдэгдэл явуулах
      const prod = PRODUCTS.find(p => p.value === order.product);
      await fetch("/api/notifications/contract-confirmed", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") ?? "" },
        body: JSON.stringify({
          orderId: order.id,
          customerName: order.customerName,
          productType: prod?.label ?? order.product,
          quantity: order.quantity,
          unit: order.unit,
          deliveryDate: order.deliveryDate,
        }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/sales/orders"] });
      qc.invalidateQueries({ queryKey: ["/api/sales/profitability-summary"] });
      toast({ title: "Гэрээ баталгаажлаа — Хяналтын инженерт мэдэгдэл явуулсан ✓" });
    },
    onError: (e: any) => toast({ title: "Алдаа", description: e.message, variant: "destructive" }),
  });

  const filteredOrders = orders.filter(o => {
    const matchSearch = !search ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (o.location ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const pendingCount = orders.filter(o => o.status === "pending").length;
  const confirmedCount = orders.filter(o => o.status === "confirmed" || o.status === "in_production").length;

  return (
    <div className="min-h-screen text-white" style={{ background: NAVY }}>
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center">
            <TrendingUp size={16} className="text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-black text-white">Борлуулалтын алба</p>
            <p className="text-xs text-slate-500">Хөвсгөл зам ХХК</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs">
              {pendingCount} хүлээгдэж буй
            </Badge>
          )}
          {confirmedCount > 0 && (
            <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs">
              {confirmedCount} үйлдвэрлэлд
            </Badge>
          )}
          <ReportUploadButton role="SALES" />
          <NotificationBell role="SALES" />
          <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white"
            onClick={logout} data-testid="btn-logout">
            <LogOut size={15} className="mr-1" /> Гарах
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* ── Tabs ── */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab("orders")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "orders" ? "bg-amber-600 text-black" : "text-slate-400 hover:text-white bg-slate-800"}`}
            data-testid="tab-orders">
            Захиалгын жагсаалт
          </button>
          <button onClick={() => setTab("profit")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "profit" ? "bg-amber-600 text-black" : "text-slate-400 hover:text-white bg-slate-800"}`}
            data-testid="tab-profit">
            Ашигт ажиллагаа / 30% зорилт
          </button>
        </div>

        {tab === "orders" && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input className="bg-slate-800 border-slate-700 text-white pl-9"
                  placeholder="Харилцагч, байршлаар хайх..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  data-testid="input-search-orders" />
              </div>
              <select
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                data-testid="select-filter-status">
                <option value="all">Бүх төлөв</option>
                {Object.entries(STATUS_MAP).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <Button onClick={() => setShowNew(true)}
                className="bg-amber-600 hover:bg-amber-500 text-black font-bold whitespace-nowrap"
                data-testid="btn-new-order">
                <Plus size={15} className="mr-1" /> Шинэ захиалга
              </Button>
            </div>

            {/* Жагсаалт */}
            {ordersLoading ? (
              <div className="text-center py-12 text-slate-500">
                <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                Уншиж байна...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <AlertCircle size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Захиалга олдсонгүй</p>
                <Button onClick={() => setShowNew(true)}
                  className="mt-4 bg-amber-600 hover:bg-amber-500 text-black font-bold text-sm"
                  data-testid="btn-new-order-empty">
                  <Plus size={13} className="mr-1" /> Эхний захиалга нэмэх
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredOrders.map(o => (
                  <OrderRow key={o.id} order={o}
                    onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
                    onContractConfirm={(order) => contractConfirm.mutate(order)} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "profit" && <ProfitPanel />}
      </div>

      {showNew && <NewOrderModal onClose={() => setShowNew(false)} configs={configs} />}
    </div>
  );
}
