import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp,
  Save, LogOut, Calendar, Factory, Layers, Hammer, Package,
  ArrowDown, Info, TrendingDown, Warehouse, Plus, Minus, Edit3
} from "lucide-react";
import type { ProductionPlan, MaterialCheck, WarehouseItem } from "@shared/schema";

// ===================== БНбД НОРМУУД — warehouseKey агуулахын нэртэй таарна =====================
const PLANT_NORMS = {
  asphalt: {
    label: "Асфальтбетон хольцын үйлдвэр",
    icon: Layers, color: "amber",
    unit: "м³", maxCapacity: 200, capacityDesc: "150–200 м³/хоног",
    outputLabel: "Асфальтбетон хольц",
    materials: [
      { name: "Битум БНД 60/90",  unit: "тн", rate: 0.052, wKey: "Битум БНД 60/90" },
      { name: "Хайрга 0-2мм",     unit: "тн", rate: 0.210, wKey: "Хайрга 0-2мм"    },
      { name: "Хайрга 2-5мм",     unit: "тн", rate: 0.280, wKey: "Хайрга 2-5мм"    },
      { name: "Хайрга 5-10мм",    unit: "тн", rate: 0.300, wKey: "Хайрга 5-10мм"   },
      { name: "Хайрга 10-20мм",   unit: "тн", rate: 0.350, wKey: "Хайрга 10-20мм"  },
      { name: "Минерал нунтаг",   unit: "тн", rate: 0.045, wKey: "Минерал нунтаг"  },
      { name: "Элс (асфальт)",    unit: "тн", rate: 0.150, wKey: "Элс (асфальт)"   },
    ],
  },
  concrete: {
    label: "Бетон зуурмагийн үйлдвэр",
    icon: Factory, color: "blue",
    unit: "м³", maxCapacity: 1800, capacityDesc: "1300–1800 м³/хоног",
    outputLabel: "Бетон зуурмаг",
    materials: [
      { name: "Цемент ПЦ400",     unit: "тн", rate: 0.350, wKey: "Цемент ПЦ400"    },
      { name: "Элс (бетон)",      unit: "м³", rate: 0.700, wKey: "Элс (бетон)"     },
      { name: "Хайрга 5-10мм",   unit: "м³", rate: 0.420, wKey: "Хайрга 5-10мм"   },
      { name: "Хайрга 10-20мм",  unit: "м³", rate: 0.580, wKey: "Хайрга 10-20мм"  },
      { name: "Химийн нэмэлт",   unit: "кг", rate: 1.000, wKey: "Химийн нэмэлт"   },
      { name: "Ус",               unit: "м³", rate: 0.185, wKey: null               }, // агуулахад хяналтгүй
    ],
  },
  crushing: {
    label: "Бутлах ангилах үйлдвэр",
    icon: Hammer, color: "green",
    unit: "тн", maxCapacity: 800, capacityDesc: "цагт 100 тн · 8 цаг",
    outputLabel: "Ангилсан хайрга (нийт гаралт)",
    materials: [
      { name: "Байгалийн чулуу (оролт)", unit: "тн", rate: 1.15, wKey: "Байгалийн чулуу (оролт)" },
      { name: "Шатах тос",               unit: "л",  rate: 0.625, wKey: "Шатах тос (бутлуур)"   },
    ],
    outputFractions: [
      { name: "0–2мм фракц",   pct: 0.25 },
      { name: "2–5мм фракц",   pct: 0.20 },
      { name: "5–10мм фракц",  pct: 0.25 },
      { name: "10–20мм фракц", pct: 0.30 },
    ],
  },
} as const;

type PlantKey = keyof typeof PLANT_NORMS;

const COLOR = {
  amber: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", btn: "bg-amber-600 hover:bg-amber-500", badge: "bg-amber-500/20 text-amber-300" },
  blue:  { bg: "bg-blue-500/10",  border: "border-blue-500/30",  text: "text-blue-400",  btn: "bg-blue-700 hover:bg-blue-600",   badge: "bg-blue-500/20 text-blue-300"   },
  green: { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-400", btn: "bg-green-700 hover:bg-green-600", badge: "bg-green-500/20 text-green-300" },
};

const fmt = (n: number, d = 1) => Number.isFinite(n) ? n.toLocaleString("mn-MN", { maximumFractionDigits: d }) : "0";

// ─── Plant Block ──────────────────────────────────────────────────────────────
function PlantBlock({ plantKey, date, token, allItems }: {
  plantKey: PlantKey; date: string; token: string; allItems: WarehouseItem[];
}) {
  const norm   = PLANT_NORMS[plantKey];
  const colors = COLOR[norm.color];
  const Icon   = norm.icon;
  const { toast } = useToast();
  const hdrs   = { "x-admin-token": token };

  const [open,       setOpen]       = useState(true);
  const [targetQty,  setTargetQty]  = useState("");
  // fieldQty per material: how much is ALREADY at production site
  const [fieldQty,   setFieldQty]   = useState<Record<string, string>>({});

  const qty = parseFloat(targetQty) || 0;

  // ── Load existing plan for this date ────────────────────────────────────────
  const { data: plansRaw } = useQuery({
    queryKey: ["/api/warehouse/plans", date, plantKey],
    queryFn: async () => {
      const r = await fetch(`/api/warehouse/plans?date=${date}`, { headers: hdrs });
      return r.json();
    },
  });
  const plans: ProductionPlan[] = Array.isArray(plansRaw) ? plansRaw : [];
  const myPlan = plans.find(p => p.plant === plantKey);

  const { data: savedChecksRaw } = useQuery({
    queryKey: ["/api/warehouse/material-checks", myPlan?.id],
    enabled: !!myPlan?.id,
    queryFn: async () => {
      const r = await fetch(`/api/warehouse/material-checks/${myPlan!.id}`, { headers: hdrs });
      return r.json();
    },
  });
  const savedChecks: MaterialCheck[] = Array.isArray(savedChecksRaw) ? savedChecksRaw : [];

  // Sync saved plan into local state
  useEffect(() => {
    if (myPlan) setTargetQty(String(myPlan.targetQty));
  }, [myPlan?.id]);

  useEffect(() => {
    if (savedChecks.length > 0 && Object.keys(fieldQty).length === 0) {
      const init: Record<string, string> = {};
      savedChecks.forEach(c => { init[c.materialName] = String(c.fieldQty ?? 0); });
      setFieldQty(init);
    }
  }, [savedChecks.length]);

  // ── Per-material computed values ─────────────────────────────────────────────
  const rows = norm.materials.map(m => {
    const required  = +(qty * m.rate).toFixed(2);
    const field     = parseFloat(fieldQty[m.name] ?? "0") || 0;
    const fromWh    = Math.max(0, +(required - field).toFixed(2)); // need to draw from warehouse
    const whItem    = m.wKey ? allItems.find(i => i.name === m.wKey && i.plant === plantKey) : null;
    const whStock   = whItem ? (whItem.currentStock ?? 0) : null;
    const afterDraw = whStock !== null ? +(whStock - fromWh).toFixed(2) : null;
    const ok        = whStock !== null ? afterDraw! >= 0 : field >= required;
    return { ...m, required, field, fromWh, whItem, whStock, afterDraw, ok };
  });

  const allReady  = qty > 0 && rows.every(r => r.ok);
  const missing   = rows.filter(r => !r.ok && r.required > 0);

  // Crushing output fractions
  const outFractions = plantKey === "crushing" && qty > 0
    ? (norm as typeof PLANT_NORMS["crushing"]).outputFractions.map(f => ({ ...f, outQty: +(qty * f.pct).toFixed(1) }))
    : [];

  // ── Save plan + material checks ─────────────────────────────────────────────
  const savePlan = useMutation({
    mutationFn: async () => {
      if (!qty || qty <= 0) throw new Error("Тоо оруулна уу");
      const planRes = await fetch("/api/warehouse/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...hdrs },
        body: JSON.stringify({ date, plant: plantKey, targetQty: qty, unit: norm.unit }),
      });
      if (!planRes.ok) throw new Error(await planRes.text());
      const plan = await planRes.json();

      const checks = norm.materials.map(m => ({
        materialName: m.name,
        requiredQty:  +(qty * m.rate).toFixed(2),
        warehouseQty: Math.max(0, +(qty * m.rate - (parseFloat(fieldQty[m.name] ?? "0") || 0)).toFixed(2)),
        fieldQty:     parseFloat(fieldQty[m.name] ?? "0") || 0,
        unit:         m.unit,
      }));
      const chkRes = await fetch("/api/warehouse/material-checks", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...hdrs },
        body: JSON.stringify({ planId: plan.id, checks }),
      });
      if (!chkRes.ok) throw new Error(await chkRes.text());
      return plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/plans", date, plantKey] });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/plans", date] });
      toast({ title: "Хадгалагдлаа ✓" });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  // ── Draw from warehouse (commit) ────────────────────────────────────────────
  const drawPlan = useMutation({
    mutationFn: async () => {
      if (!myPlan?.id) throw new Error("Эхлээд хадгална уу");
      const draws = rows
        .filter(r => r.whItem && r.fromWh > 0)
        .map(r => ({ warehouseItemId: r.whItem!.id, drawQty: r.fromWh, materialName: r.name }));
      if (draws.length === 0) throw new Error("Агуулахаас татах зүйл байхгүй");
      const res = await fetch("/api/warehouse/draw-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...hdrs },
        body: JSON.stringify({ planId: myPlan.id, date, draws }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/items"] });
      toast({ title: "Агуулахаас татагдлаа ✓ — нөөц шинэчлэгдлээ" });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <div className={`rounded-2xl border ${colors.border} overflow-hidden`}>
      {/* Header */}
      <button data-testid={`toggle-${plantKey}`} onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 p-4 ${colors.bg} text-left hover:brightness-110 transition-all`}>
        <div className={`w-10 h-10 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${colors.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-base">{norm.label}</div>
          <div className={`text-xs ${colors.text}`}>{norm.capacityDesc}</div>
        </div>
        {qty > 0 && (
          <span className={`shrink-0 flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
            allReady ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
          }`}>
            {allReady ? <><CheckCircle2 className="w-3.5 h-3.5" /> Бэлэн</> : <><XCircle className="w-3.5 h-3.5" /> {missing.length} дутагдал</>}
          </span>
        )}
        {open ? <ChevronUp className="w-4 h-4 text-white/30 shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/30 shrink-0" />}
      </button>

      {open && (
        <div className="p-4 space-y-4 bg-[#0c1528]">

          {/* Target input */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-white/50 mb-1.5 block">
                Өнөөдөр гаргах: <span className={colors.text}>{norm.outputLabel}</span>
              </label>
              <div className="flex items-center gap-2">
                <input data-testid={`input-target-${plantKey}`} type="number"
                  value={targetQty} onChange={e => setTargetQty(e.target.value)}
                  placeholder={`0–${norm.maxCapacity}`}
                  className={`w-36 bg-white/5 border ${colors.border} rounded-xl px-4 py-2.5 text-xl font-bold focus:outline-none focus:border-amber-500 transition-colors`}
                />
                <span className={`font-medium ${colors.text}`}>{norm.unit}</span>
                {qty > 0 && <span className="text-xs text-white/25">{fmt(qty/norm.maxCapacity*100,0)}% хүчин чадал</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <button data-testid={`btn-save-${plantKey}`}
                onClick={() => savePlan.mutate()} disabled={savePlan.isPending || !qty}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold ${colors.btn} text-white transition-all disabled:opacity-40`}>
                <Save className="w-4 h-4" /> {savePlan.isPending ? "..." : "Хадгалах"}
              </button>
              {myPlan && (
                <button data-testid={`btn-draw-${plantKey}`}
                  onClick={() => drawPlan.mutate()} disabled={drawPlan.isPending}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-orange-600 hover:bg-orange-500 text-white transition-all disabled:opacity-40">
                  <ArrowDown className="w-4 h-4" /> {drawPlan.isPending ? "..." : "Агуулахаас татах"}
                </button>
              )}
            </div>
          </div>

          {/* Crushing output fractions */}
          {outFractions.length > 0 && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
              <div className="text-xs text-green-400 font-semibold mb-2">Гаралтын фракц ({fmt(qty)} тн)</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {outFractions.map(f => (
                  <div key={f.name} className="text-center bg-white/5 rounded-lg p-2">
                    <div className="text-base font-bold text-green-300">{fmt(f.outQty)} тн</div>
                    <div className="text-xs text-white/40">{f.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Material table */}
          {qty > 0 && (
            <div className="space-y-2">
              {/* Column headers */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 text-xs text-white/30 px-3 pb-1 border-b border-white/5">
                <span>Материал (норм)</span>
                <span className="text-right">Хэрэгтэй</span>
                <span className="text-right">Талбайд бэлэн</span>
                <span className="text-right text-orange-400">Агуулахаас татах</span>
                <span className="text-right">Агуулахын нөөц</span>
                <span className="text-center">Татсаны дараа</span>
              </div>

              {rows.map(r => (
                <div key={r.name}
                  data-testid={`mat-${plantKey}-${r.name}`}
                  className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 items-center rounded-xl px-3 py-2.5 border transition-all ${
                    r.ok ? "border-green-500/15 bg-green-500/5" : "border-red-500/20 bg-red-500/5"
                  }`}>

                  {/* Name */}
                  <div>
                    <div className="text-sm font-medium">{r.name}</div>
                    <div className="text-xs text-white/25">{r.rate} {r.unit}/нэгж</div>
                  </div>

                  {/* Required */}
                  <div className="text-right">
                    <span className={`text-sm font-bold ${colors.text}`}>{fmt(r.required)}</span>
                    <span className="text-xs text-white/30 ml-1">{r.unit}</span>
                  </div>

                  {/* Field qty input */}
                  <div className="flex items-center justify-end gap-1">
                    <input data-testid={`input-field-${plantKey}-${r.name}`}
                      type="number"
                      value={fieldQty[r.name] ?? ""}
                      onChange={e => setFieldQty(prev => ({ ...prev, [r.name]: e.target.value }))}
                      placeholder="0"
                      className="w-20 text-right bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                    />
                    <span className="text-xs text-white/25">{r.unit}</span>
                  </div>

                  {/* From warehouse (auto) */}
                  <div className="text-right">
                    {r.fromWh > 0 ? (
                      <span className="text-sm font-semibold text-orange-400">{fmt(r.fromWh)} {r.unit}</span>
                    ) : (
                      <span className="text-sm text-green-400">0 {r.unit}</span>
                    )}
                  </div>

                  {/* Warehouse current stock */}
                  <div className="text-right">
                    {r.whStock !== null ? (
                      <span className={`text-sm font-medium ${r.whStock < r.fromWh ? "text-red-400" : "text-white/60"}`}>
                        {fmt(r.whStock)} {r.unit}
                      </span>
                    ) : (
                      <span className="text-xs text-white/20">—</span>
                    )}
                  </div>

                  {/* After draw */}
                  <div className="flex justify-center">
                    {r.afterDraw !== null ? (
                      <span className={`text-xs font-semibold px-2 py-1 rounded-lg border ${
                        r.afterDraw >= 0
                          ? "text-green-300 bg-green-500/10 border-green-500/20"
                          : "text-red-300 bg-red-500/10 border-red-500/20"
                      }`}>
                        {r.afterDraw >= 0 ? `${fmt(r.afterDraw)} ${r.unit}` : `−${fmt(Math.abs(r.afterDraw))} дутуу`}
                      </span>
                    ) : r.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                </div>
              ))}

              {/* Summary bar */}
              <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                allReady ? "border-green-500/30 bg-green-500/8" : "border-red-500/25 bg-red-500/5"
              }`}>
                <div className="flex items-center gap-2">
                  {allReady
                    ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                    : <AlertTriangle className="w-5 h-5 text-red-400" />}
                  <div>
                    <div className={`text-sm font-bold ${allReady ? "text-green-300" : "text-red-300"}`}>
                      {allReady
                        ? `${norm.outputLabel} — БЭЛЭН`
                        : `${missing.length} материал дутагдаж байна`}
                    </div>
                    {!allReady && missing.length > 0 && (
                      <div className="text-xs text-red-400/60 mt-0.5">
                        {missing.map(m => `${m.name} (агуулахад дутуу)`).join(" · ")}
                      </div>
                    )}
                  </div>
                </div>
                <div className={`text-right text-xs ${allReady ? "text-green-400" : "text-white/30"}`}>
                  <div className="font-semibold text-sm">{fmt(qty)} {norm.unit}</div>
                  <div className="text-white/30">{norm.outputLabel}</div>
                </div>
              </div>

              {/* Draw hint */}
              {myPlan && rows.some(r => r.fromWh > 0) && (
                <div className="flex items-center gap-2 text-xs text-orange-400/70 bg-orange-500/5 border border-orange-500/15 rounded-lg px-3 py-2">
                  <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    <strong>Агуулахаас татах</strong> товч дарснаар агуулахын нөөц автоматаар хасагдана.
                    Давтан дарвал өмнөх татлага буцааж шинэчлэгдэнэ.
                  </span>
                </div>
              )}
            </div>
          )}

          {!qty && (
            <div className="text-center py-8 text-white/25 text-sm border border-dashed border-white/8 rounded-xl">
              Үйлдвэрлэх хэмжээ оруулна уу — материалын хэрэгцээ, агуулахаас татах хэмжээг автоматаар тооцоолно
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Stock Adjust Modal ───────────────────────────────────────────────────────
function StockAdjust({ item, token, onClose }: { item: WarehouseItem; token: string; onClose: () => void }) {
  const [qty, setQty] = useState("");
  const [type, setType] = useState<"in"|"out">("in");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const hdrs = { "x-admin-token": token };

  const mut = useMutation({
    mutationFn: async () => {
      const q = parseFloat(qty);
      if (!q || q <= 0) throw new Error("Хэмжээ оруулна уу");
      // logs POST endpoint нь автоматаар stock шинэчилдэг
      const res = await fetch("/api/warehouse/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...hdrs },
        body: JSON.stringify({
          itemId: item.id, quantity: q, type,
          date: new Date().toISOString().slice(0,10), notes: notes || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/items"] });
      toast({ title: `${item.name} нөөц ${type === "in" ? "нэмэгдлээ" : "хасагдлаа"} ✓` });
      onClose();
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-sm mx-4 p-6 space-y-4">
        <div className="font-bold text-lg">{item.name}</div>
        <div className="text-sm text-white/40">Одоогийн нөөц: <span className="text-amber-400 font-bold">{fmt(item.currentStock ?? 0)} {item.unit}</span></div>
        <div className="flex gap-2">
          {(["in","out"] as const).map(t => (
            <button key={t} data-testid={`btn-type-${t}`}
              onClick={() => setType(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                type === t
                  ? t === "in" ? "bg-green-600 border-green-500 text-white" : "bg-red-600 border-red-500 text-white"
                  : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"
              }`}>
              {t === "in" ? <><Plus className="w-4 h-4 inline mr-1" />Оруулах</> : <><Minus className="w-4 h-4 inline mr-1" />Гаргах</>}
            </button>
          ))}
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">Хэмжээ ({item.unit})</label>
          <input data-testid="input-adjust-qty" type="number" value={qty} onChange={e => setQty(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-lg font-bold focus:outline-none focus:border-amber-500 transition-colors"
            placeholder={`0 ${item.unit}`} autoFocus />
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">Тэмдэглэл (заавал биш)</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors"
            placeholder="Тайлбар..." />
        </div>
        {qty && parseFloat(qty) > 0 && (
          <div className="text-xs text-white/40 bg-white/5 rounded-xl px-4 py-3">
            Хадгалсны дараа: <span className={`font-bold ${type === "in" ? "text-green-400" : "text-orange-400"}`}>
              {fmt(type === "in" ? (item.currentStock ?? 0) + parseFloat(qty) : Math.max(0,(item.currentStock ?? 0) - parseFloat(qty)))} {item.unit}
            </span>
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm border border-white/10 text-white/40 hover:text-white/60 transition-colors">Болих</button>
          <button data-testid="btn-adjust-save" onClick={() => mut.mutate()} disabled={mut.isPending || !qty}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-all disabled:opacity-40">
            {mut.isPending ? "..." : "Хадгалах"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stock Overview tab ───────────────────────────────────────────────────────
function StockTab({ allItems, token }: { allItems: WarehouseItem[]; token: string }) {
  const [editing, setEditing] = useState<WarehouseItem | null>(null);
  const groupedItems = {
    asphalt:  allItems.filter(i => i.plant === "asphalt"),
    concrete: allItems.filter(i => i.plant === "concrete"),
    crushing: allItems.filter(i => i.plant === "crushing"),
  };
  const plantLabels: Record<string, { label: string; color: string; text: string }> = {
    asphalt:  { label: "Асфальтын үйлдвэр", color: "border-amber-500/30 bg-amber-500/5",  text: "text-amber-400" },
    concrete: { label: "Бетоны үйлдвэр",    color: "border-blue-500/30 bg-blue-500/5",    text: "text-blue-400"  },
    crushing: { label: "Бутлах үйлдвэр",    color: "border-green-500/30 bg-green-500/5",  text: "text-green-400" },
  };

  return (
    <>
      {editing && <StockAdjust item={editing} token={token} onClose={() => setEditing(null)} />}
      <div className="space-y-4">
        {(["asphalt","concrete","crushing"] as const).map(plant => {
          const items = groupedItems[plant];
          const { label, color, text } = plantLabels[plant];
          return (
            <div key={plant} className={`rounded-2xl border ${color} overflow-hidden`}>
              <div className={`px-4 py-3 border-b ${color} font-semibold text-sm ${text}`}>{label}</div>
              <div className="divide-y divide-white/5">
                {items.map(item => {
                  const stock = item.currentStock ?? 0;
                  const min   = item.minStock ?? 0;
                  const crit  = item.criticalStock ?? 0;
                  const pct   = min > 0 ? Math.min(100, (stock / (min * 1.5)) * 100) : 100;
                  const statusColor = stock <= crit ? "text-red-400" : stock <= min ? "text-amber-400" : "text-green-400";
                  return (
                    <div key={item.id} data-testid={`stock-row-${item.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/2 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className="text-xs text-white/25 mt-0.5">
                          Доод: {fmt(min)} · Аюулт: {fmt(crit)} {item.unit}
                        </div>
                        <div className="mt-1.5 h-1.5 rounded-full bg-white/5 overflow-hidden w-32">
                          <div className={`h-full rounded-full transition-all ${
                            stock <= crit ? "bg-red-500" : stock <= min ? "bg-amber-500" : "bg-green-500"
                          }`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${statusColor}`}>{fmt(stock)}</div>
                        <div className="text-xs text-white/25">{item.unit}</div>
                      </div>
                      <button data-testid={`btn-edit-stock-${item.id}`}
                        onClick={() => setEditing(item)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 text-white/30 hover:text-amber-400 hover:border-amber-500/30 transition-all opacity-0 group-hover:opacity-100">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function WarehouseDashboard() {
  const [, setLocation] = useLocation();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [activeTab, setActiveTab] = useState<"plan"|"stock">("plan");
  const token  = localStorage.getItem("adminToken") ?? "";
  const hdrs   = { "x-admin-token": token };

  // Бүх агуулахын нөөц — PlantBlock-уудад дамжуулна
  const { data: itemsRaw } = useQuery({
    queryKey: ["/api/warehouse/items"],
    queryFn: async () => {
      const r = await fetch("/api/warehouse/items", { headers: hdrs });
      return r.json();
    },
  });
  const allItems: WarehouseItem[] = Array.isArray(itemsRaw) ? itemsRaw : [];

  const { data: plansRaw } = useQuery({
    queryKey: ["/api/warehouse/plans", date],
    queryFn: async () => {
      const r = await fetch(`/api/warehouse/plans?date=${date}`, { headers: hdrs });
      return r.json();
    },
  });
  const plans: ProductionPlan[] = Array.isArray(plansRaw) ? plansRaw : [];

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0f172a]/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="font-bold text-base">Агуулахын систем</div>
              <div className="text-xs text-white/35">БНбД норматив · Агуулахаас татах тооцоо</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Tab toggle */}
            <div className="flex border border-white/10 rounded-xl overflow-hidden">
              <button data-testid="tab-plan" onClick={() => setActiveTab("plan")}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${activeTab === "plan" ? "bg-amber-600 text-white" : "text-white/40 hover:text-white/60"}`}>
                <Layers className="w-3.5 h-3.5" /> Төлөвлөгөө
              </button>
              <button data-testid="tab-stock" onClick={() => setActiveTab("stock")}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${activeTab === "stock" ? "bg-amber-600 text-white" : "text-white/40 hover:text-white/60"}`}>
                <Warehouse className="w-3.5 h-3.5" /> Нөөц
              </button>
            </div>
            {activeTab === "plan" && (
              <div className="flex items-center gap-2 border border-white/10 rounded-xl px-3 py-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <input data-testid="input-date" type="date" value={date}
                  onChange={e => setDate(e.target.value)}
                  className="bg-transparent text-sm text-white focus:outline-none" />
              </div>
            )}
            <button data-testid="btn-logout"
              onClick={() => { localStorage.removeItem("adminToken"); localStorage.removeItem("userRole"); setLocation("/select-role"); }}
              className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 border border-white/10 rounded-xl px-3 py-2 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">

        {activeTab === "plan" && <>
          {/* Info */}
          <div className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/15 rounded-xl px-4 py-3 text-sm text-blue-300/70">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-400" />
            <span>
              Гаргах хэмжээ → Норм тооцоо → <strong className="text-blue-300">Талбайд байгаа нөөц</strong> оруулна →
              Агуулахаас татах хэмжээ автоматаар гарна → <strong className="text-orange-300">Агуулахаас татах</strong> товч дарахад нөөц хасагдана.
            </span>
          </div>

          {/* Daily plan summary */}
          {plans.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {(["asphalt","concrete","crushing"] as PlantKey[]).map(pk => {
                const p = plans.find(x => x.plant === pk);
                const n = PLANT_NORMS[pk];
                const c = COLOR[n.color];
                const I = n.icon;
                return (
                  <div key={pk} className={`flex items-center gap-2 rounded-xl border ${c.border} ${c.bg} px-3 py-2.5`}>
                    <I className={`w-4 h-4 ${c.text} shrink-0`} />
                    <div className="min-w-0">
                      <div className="text-xs text-white/35 truncate">{n.outputLabel}</div>
                      <div className={`font-bold ${c.text}`}>{p ? `${fmt(p.targetQty)} ${n.unit}` : <span className="text-white/20 text-xs font-normal">—</span>}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Plant blocks */}
          {(["asphalt","concrete","crushing"] as PlantKey[]).map(pk => (
            <PlantBlock key={`${pk}-${date}`} plantKey={pk} date={date} token={token} allItems={allItems} />
          ))}

          {/* Norm reference */}
          <div className="rounded-xl border border-white/5 bg-white/2 p-4">
            <div className="text-xs text-white/25 font-semibold uppercase tracking-wider mb-3">БНбД норм лавлах</div>
            <div className="grid sm:grid-cols-3 gap-4 text-xs text-white/35">
              <div><div className="text-amber-400/60 font-medium mb-1">Асфальт (1 м³):</div>
                {PLANT_NORMS.asphalt.materials.map(m => <div key={m.name}>• {m.name}: {m.rate} {m.unit}</div>)}</div>
              <div><div className="text-blue-400/60 font-medium mb-1">Бетон C25/30 (1 м³):</div>
                {PLANT_NORMS.concrete.materials.map(m => <div key={m.name}>• {m.name}: {m.rate} {m.unit}</div>)}</div>
              <div><div className="text-green-400/60 font-medium mb-1">Бутлах (1 тн гаралт):</div>
                {PLANT_NORMS.crushing.materials.map(m => <div key={m.name}>• {m.name}: {m.rate} {m.unit}</div>)}
                {PLANT_NORMS.crushing.outputFractions.map(f => <div key={f.name}>• {f.name}: {(f.pct*100).toFixed(0)}%</div>)}</div>
            </div>
          </div>
        </>}

        {activeTab === "stock" && <StockTab allItems={allItems} token={token} />}
      </div>
    </div>
  );
}
