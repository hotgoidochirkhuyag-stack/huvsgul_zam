import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp,
  Save, RefreshCw, LogOut, Calendar, Factory, Layers, Hammer,
  Package, ArrowRight, Info
} from "lucide-react";
import type { ProductionPlan, MaterialCheck } from "@shared/schema";

// ===================== БНбД НОРМУУД =====================
const PLANT_NORMS = {
  asphalt: {
    label: "Асфальтбетон хольцын үйлдвэр",
    icon: Layers,
    color: "amber",
    unit: "м³",
    maxCapacity: 200,
    capacityDesc: "150–200 м³/хоног",
    outputLabel: "Асфальтбетон хольц",
    // per 1 м³ асфальтбетон хольц (БНбД 3.01.08-04)
    materials: [
      { name: "Битум БНД 60/90",   unit: "тн",  rate: 0.052, category: "bitumen" },
      { name: "Хайрга 0-2мм",      unit: "тн",  rate: 0.210, category: "stone"   },
      { name: "Хайрга 2-5мм",      unit: "тн",  rate: 0.280, category: "stone"   },
      { name: "Хайрга 5-10мм",     unit: "тн",  rate: 0.300, category: "stone"   },
      { name: "Хайрга 10-20мм",    unit: "тн",  rate: 0.350, category: "stone"   },
      { name: "Минерал нунтаг",    unit: "тн",  rate: 0.045, category: "mineral" },
      { name: "Элс",               unit: "тн",  rate: 0.150, category: "sand"    },
    ],
  },
  concrete: {
    label: "Бетон зуурмагийн үйлдвэр",
    icon: Factory,
    color: "blue",
    unit: "м³",
    maxCapacity: 1800,
    capacityDesc: "1300–1800 м³/хоног",
    outputLabel: "Бетон зуурмаг",
    // per 1 м³ бетон C25/30 (БНбД 3.03.01-87)
    materials: [
      { name: "Цемент ПЦ400/500",  unit: "тн",  rate: 0.350, category: "cement"  },
      { name: "Элс (нарийн)",      unit: "м³",  rate: 0.700, category: "sand"    },
      { name: "Хайрга 5-10мм",     unit: "м³",  rate: 0.420, category: "stone"   },
      { name: "Хайрга 10-20мм",    unit: "м³",  rate: 0.580, category: "stone"   },
      { name: "Ус",                unit: "м³",  rate: 0.185, category: "other"   },
    ],
  },
  crushing: {
    label: "Бутлах ангилах үйлдвэр",
    icon: Hammer,
    color: "green",
    unit: "тн",
    maxCapacity: 800,
    capacityDesc: "цагт 100 тн · 8 цаг",
    outputLabel: "Ангилсан хайрга (нийт гаралт)",
    // input = raw stone; output fractions
    materials: [
      { name: "Байгалийн чулуу (оролт)", unit: "тн", rate: 1.15, category: "stone" },
    ],
    // output breakdown by fraction
    outputFractions: [
      { name: "0–2мм фракц",   pct: 0.25 },
      { name: "2–5мм фракц",   pct: 0.20 },
      { name: "5–10мм фракц",  pct: 0.25 },
      { name: "10–20мм фракц", pct: 0.30 },
    ],
  },
} as const;

type PlantKey = keyof typeof PLANT_NORMS;

const COLOR_MAP: Record<string, { bg: string; border: string; badge: string; text: string; btn: string }> = {
  amber: { bg: "bg-amber-500/10", border: "border-amber-500/30", badge: "bg-amber-500/20 text-amber-300", text: "text-amber-400", btn: "bg-amber-600 hover:bg-amber-500" },
  blue:  { bg: "bg-blue-500/10",  border: "border-blue-500/30",  badge: "bg-blue-500/20 text-blue-300",  text: "text-blue-400",  btn: "bg-blue-700 hover:bg-blue-600"   },
  green: { bg: "bg-green-500/10", border: "border-green-500/30", badge: "bg-green-500/20 text-green-300",text: "text-green-400", btn: "bg-green-700 hover:bg-green-600"  },
};

// Formatted number
const fmt = (n: number, dec = 1) => n.toLocaleString("mn-MN", { maximumFractionDigits: dec });

// ─── Single Plant Block ───────────────────────────────────────────────────────
interface PlanState {
  targetQty: string;
  materialInputs: Record<string, { warehouse: string; field: string }>;
  savedPlanId: number | null;
  savedChecks: MaterialCheck[];
}

function PlantBlock({
  plantKey,
  date,
  token,
}: {
  plantKey: PlantKey;
  date: string;
  token: string;
}) {
  const norm = PLANT_NORMS[plantKey];
  const colors = COLOR_MAP[norm.color];
  const Icon = norm.icon;
  const { toast } = useToast();

  const [open, setOpen] = useState(true);
  const [targetQty, setTargetQty] = useState("");
  const [matInputs, setMatInputs] = useState<Record<string, { warehouse: string; field: string }>>({});
  const [savedPlanId, setSavedPlanId] = useState<number | null>(null);

  const headers = { "x-admin-token": token };

  // Load existing plan for this date
  const { data: plansRaw } = useQuery({
    queryKey: ["/api/warehouse/plans", date],
    queryFn: async () => {
      const r = await fetch(`/api/warehouse/plans?date=${date}`, { headers });
      return r.json();
    },
  });
  const plans: ProductionPlan[] = Array.isArray(plansRaw) ? plansRaw : [];

  const myPlan = plans.find(p => p.plant === plantKey);

  // Load checks when plan exists
  const { data: savedChecks = [] } = useQuery<MaterialCheck[]>({
    queryKey: ["/api/warehouse/material-checks", myPlan?.id],
    enabled: !!myPlan?.id,
    queryFn: async () => {
      const r = await fetch(`/api/warehouse/material-checks/${myPlan!.id}`, { headers });
      return r.json();
    },
  });

  // Sync loaded data into local state
  useEffect(() => {
    if (myPlan) {
      setTargetQty(String(myPlan.targetQty));
      setSavedPlanId(myPlan.id);
    }
  }, [myPlan?.id]);

  useEffect(() => {
    if (savedChecks.length > 0 && !Object.keys(matInputs).some(k => matInputs[k].warehouse !== "0" || matInputs[k].field !== "0")) {
      const init: typeof matInputs = {};
      savedChecks.forEach(c => {
        init[c.materialName] = { warehouse: String(c.warehouseQty ?? 0), field: String(c.fieldQty ?? 0) };
      });
      setMatInputs(init);
    }
  }, [savedChecks]);

  const savePlan = useMutation({
    mutationFn: async () => {
      const qty = parseFloat(targetQty);
      if (!qty || qty <= 0) throw new Error("Тоо оруулна уу");
      // save plan
      const planRes = await apiRequest("POST", "/api/warehouse/plans", {
        date, plant: plantKey, targetQty: qty, unit: norm.unit,
      }, { headers });
      const plan = await planRes.json();
      // save material checks
      const checks = norm.materials.map(m => ({
        materialName: m.name,
        requiredQty: +(qty * m.rate).toFixed(2),
        warehouseQty: parseFloat(matInputs[m.name]?.warehouse ?? "0") || 0,
        fieldQty: parseFloat(matInputs[m.name]?.field ?? "0") || 0,
        unit: m.unit,
      }));
      await apiRequest("POST", "/api/warehouse/material-checks", { planId: plan.id, checks }, { headers });
      return plan;
    },
    onSuccess: (plan) => {
      setSavedPlanId(plan.id);
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/plans", date] });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/material-checks", plan.id] });
      toast({ title: "Хадгалагдлаа ✓" });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const qty = parseFloat(targetQty) || 0;

  // Computed material requirements
  const requirements = norm.materials.map(m => {
    const required = +(qty * m.rate).toFixed(2);
    const warehouse = parseFloat(matInputs[m.name]?.warehouse ?? "0") || 0;
    const field = parseFloat(matInputs[m.name]?.field ?? "0") || 0;
    const total = warehouse + field;
    return { ...m, required, warehouse, field, total, ok: total >= required };
  });

  const allReady = qty > 0 && requirements.every(r => r.ok);
  const someReady = requirements.some(r => r.ok);
  const missing = requirements.filter(r => !r.ok && r.required > 0);

  // Output fractions for crushing plant
  const outFractions = plantKey === "crushing" && qty > 0
    ? (norm as typeof PLANT_NORMS["crushing"]).outputFractions.map(f => ({ ...f, qty: +(qty * f.pct).toFixed(1) }))
    : [];

  return (
    <div className={`rounded-2xl border ${colors.border} overflow-hidden`}>
      {/* Plant header */}
      <button
        data-testid={`toggle-plant-${plantKey}`}
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 p-4 ${colors.bg} text-left hover:brightness-110 transition-all`}
      >
        <div className={`w-10 h-10 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${colors.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-base">{norm.label}</div>
          <div className={`text-xs ${colors.text}`}>{norm.capacityDesc}</div>
        </div>
        {/* Status badge */}
        <div className="flex items-center gap-2 mr-2">
          {qty > 0 && (
            <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
              allReady ? "bg-green-500/20 text-green-300" : missing.length > 0 ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"
            }`}>
              {allReady ? <><CheckCircle2 className="w-3.5 h-3.5" /> Бэлэн</> : <><XCircle className="w-3.5 h-3.5" /> {missing.length} дутагдал</>}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-white/40 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/40 flex-shrink-0" />}
      </button>

      {open && (
        <div className="p-4 space-y-5 bg-[#0c1528]">

          {/* Target quantity input */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1">
              <label className="text-xs text-white/50 mb-1.5 block font-medium">
                Өнөөдөр хэдэн <span className={colors.text}>{norm.unit}</span> {norm.outputLabel} гаргах вэ?
              </label>
              <div className="flex items-center gap-2">
                <input
                  data-testid={`input-target-${plantKey}`}
                  type="number"
                  value={targetQty}
                  onChange={e => setTargetQty(e.target.value)}
                  placeholder={`0–${norm.maxCapacity}`}
                  className={`w-40 bg-white/5 border ${colors.border} rounded-xl px-4 py-2.5 text-lg font-bold text-white focus:outline-none focus:border-amber-500 transition-colors`}
                />
                <span className={`text-sm ${colors.text} font-medium`}>{norm.unit}</span>
                {qty > 0 && (
                  <span className="text-xs text-white/30">
                    = {fmt(qty / norm.maxCapacity * 100, 0)}% хүчин чадал
                  </span>
                )}
              </div>
            </div>
            <button
              data-testid={`btn-save-plan-${plantKey}`}
              onClick={() => savePlan.mutate()}
              disabled={savePlan.isPending || !targetQty}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold ${colors.btn} text-white transition-all disabled:opacity-40`}
            >
              <Save className="w-4 h-4" />
              {savePlan.isPending ? "Хадгалж байна..." : "Хадгалах"}
            </button>
          </div>

          {/* Crushing: output fractions */}
          {plantKey === "crushing" && qty > 0 && outFractions.length > 0 && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
              <div className="text-xs text-green-400 font-semibold mb-2">Гаралтын фракцийн хуваарь ({fmt(qty)} тн нийт)</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {outFractions.map(f => (
                  <div key={f.name} className="text-center bg-white/5 rounded-lg p-2">
                    <div className="text-base font-bold text-green-300">{fmt(f.qty)} тн</div>
                    <div className="text-xs text-white/40">{f.name}</div>
                    <div className="text-xs text-white/30">{(f.pct * 100).toFixed(0)}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Materials table */}
          {qty > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Материалын хэрэгцээ — Норм тооцоо ({fmt(qty)} {norm.unit} үйлдвэрлэхэд)
                </div>
                <div className="flex gap-3 text-xs text-white/40 pr-1">
                  <span>Агуулах</span>
                  <span>Талбай</span>
                </div>
              </div>

              {/* Header row */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-2 text-xs text-white/30 px-3 py-1 hidden sm:grid">
                <span>Материал</span>
                <span>Хэрэгтэй</span>
                <span>Агуулахад</span>
                <span>Талбайд</span>
                <span>Нийт</span>
                <span>Дүн</span>
              </div>

              {requirements.map(r => (
                <div
                  key={r.name}
                  data-testid={`mat-row-${plantKey}-${r.name.replace(/\s+/g, "-")}`}
                  className={`grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-2 items-center rounded-xl border px-3 py-2.5 transition-all ${
                    r.ok
                      ? "border-green-500/20 bg-green-500/5"
                      : r.required === 0
                        ? "border-white/5 bg-white/2"
                        : "border-red-500/20 bg-red-500/5"
                  }`}
                >
                  {/* Material name */}
                  <div>
                    <div className="text-sm font-medium">{r.name}</div>
                    <div className="text-xs text-white/30">норм: {r.rate} {r.unit}/нэгж</div>
                  </div>

                  {/* Required */}
                  <div>
                    <div className="text-xs text-white/40 sm:hidden">Хэрэгтэй:</div>
                    <div className={`text-sm font-bold ${colors.text}`}>{fmt(r.required)} {r.unit}</div>
                  </div>

                  {/* Warehouse input */}
                  <div>
                    <div className="text-xs text-white/40 sm:hidden mb-0.5">Агуулахад:</div>
                    <div className="flex items-center gap-1">
                      <input
                        data-testid={`input-warehouse-${plantKey}-${r.name}`}
                        type="number"
                        value={matInputs[r.name]?.warehouse ?? ""}
                        onChange={e => setMatInputs(prev => ({
                          ...prev,
                          [r.name]: { warehouse: e.target.value, field: prev[r.name]?.field ?? "0" },
                        }))}
                        placeholder="0"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-blue-500 transition-colors"
                      />
                      <span className="text-xs text-white/30 hidden sm:block">{r.unit}</span>
                    </div>
                  </div>

                  {/* Field input */}
                  <div>
                    <div className="text-xs text-white/40 sm:hidden mb-0.5">Талбайд:</div>
                    <div className="flex items-center gap-1">
                      <input
                        data-testid={`input-field-${plantKey}-${r.name}`}
                        type="number"
                        value={matInputs[r.name]?.field ?? ""}
                        onChange={e => setMatInputs(prev => ({
                          ...prev,
                          [r.name]: { warehouse: prev[r.name]?.warehouse ?? "0", field: e.target.value },
                        }))}
                        placeholder="0"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-green-500 transition-colors"
                      />
                      <span className="text-xs text-white/30 hidden sm:block">{r.unit}</span>
                    </div>
                  </div>

                  {/* Total */}
                  <div>
                    <div className="text-xs text-white/40 sm:hidden">Нийт:</div>
                    <div className={`text-sm font-bold ${r.ok ? "text-green-300" : r.total > 0 ? "text-amber-300" : "text-white/30"}`}>
                      {fmt(r.total)} {r.unit}
                    </div>
                    {!r.ok && r.required > 0 && (
                      <div className="text-xs text-red-400">−{fmt(r.required - r.total)}</div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex justify-end sm:justify-center">
                    {r.required === 0 ? (
                      <span className="text-white/20 text-xs">—</span>
                    ) : r.ok ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Бэлэн
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg">
                        <XCircle className="w-3.5 h-3.5" /> Дутуу
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Summary row */}
              <div className={`flex items-center justify-between rounded-xl border px-4 py-3 mt-2 ${
                allReady ? "border-green-500/40 bg-green-500/10" : "border-red-500/30 bg-red-500/5"
              }`}>
                <div className="flex items-center gap-2">
                  {allReady
                    ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                    : <AlertTriangle className="w-5 h-5 text-red-400" />}
                  <div>
                    <div className={`text-sm font-bold ${allReady ? "text-green-300" : "text-red-300"}`}>
                      {allReady ? `${norm.label} — БЭЛЭН` : `${missing.length} материал дутагдаж байна`}
                    </div>
                    {!allReady && missing.length > 0 && (
                      <div className="text-xs text-red-400/70">
                        {missing.map(m => `${m.name} (−${fmt(m.required - m.total)} ${m.unit})`).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
                <div className={`text-right text-xs ${allReady ? "text-green-400" : "text-white/40"}`}>
                  <div className="font-semibold">{fmt(qty)} {norm.unit}</div>
                  <div>{norm.outputLabel}</div>
                </div>
              </div>
            </div>
          )}

          {!qty && (
            <div className="text-center py-6 text-white/30 text-sm border border-dashed border-white/10 rounded-xl">
              Үйлдвэрлэх хэмжээг дээр оруулна уу — материалын хэрэгцээг автоматаар тооцоолно
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function WarehouseDashboard() {
  const [, setLocation] = useLocation();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const token = localStorage.getItem("authToken") ?? "";
  const headers = { "x-admin-token": token };

  const { data: plansRaw2 } = useQuery({
    queryKey: ["/api/warehouse/plans", date],
    queryFn: async () => {
      const r = await fetch(`/api/warehouse/plans?date=${date}`, { headers });
      return r.json();
    },
  });
  const plans: ProductionPlan[] = Array.isArray(plansRaw2) ? plansRaw2 : [];

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
              <div className="font-bold text-base leading-tight">Агуулахын нөөцийн бэлэн байдал</div>
              <div className="text-xs text-white/40">БНбД нормативт тулгуурласан тооцоолол</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 border border-white/10 rounded-xl px-3 py-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <input
                data-testid="input-date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="bg-transparent text-sm text-white focus:outline-none"
              />
            </div>
            <button
              data-testid="btn-logout"
              onClick={() => { localStorage.removeItem("authToken"); localStorage.removeItem("userRole"); setLocation("/select-role"); }}
              className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors border border-white/10 rounded-xl px-3 py-2"
            >
              <LogOut className="w-4 h-4" /> Гарах
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">

        {/* Info banner */}
        <div className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-blue-300/80">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" />
          <div>
            Гаргах хэмжээг оруулмагц БНбД нормын дагуу хэрэгцээт материалыг тооцоолно.
            Агуулахад болон талбай дээр байгаа нөөцийг оруулаад <strong>Хадгалах</strong> дарна уу.
          </div>
        </div>

        {/* Daily summary if plans saved */}
        {plans.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(["asphalt","concrete","crushing"] as PlantKey[]).map(pk => {
              const p = plans.find(x => x.plant === pk);
              const norm = PLANT_NORMS[pk];
              const colors = COLOR_MAP[norm.color];
              const Icon = norm.icon;
              return (
                <div key={pk} className={`flex items-center gap-3 rounded-xl border ${colors.border} ${colors.bg} px-4 py-3`}>
                  <Icon className={`w-5 h-5 ${colors.text}`} />
                  <div className="min-w-0">
                    <div className="text-xs text-white/40 truncate">{norm.outputLabel}</div>
                    <div className={`text-lg font-bold ${colors.text}`}>
                      {p ? `${fmt(p.targetQty)} ${norm.unit}` : <span className="text-white/20 text-sm">—</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Plant blocks */}
        {(["asphalt", "concrete", "crushing"] as PlantKey[]).map(pk => (
          <PlantBlock key={`${pk}-${date}`} plantKey={pk} date={date} token={token} />
        ))}

        {/* Norm reference */}
        <div className="rounded-xl border border-white/5 bg-white/2 p-4 space-y-2">
          <div className="text-xs text-white/30 font-semibold uppercase tracking-wider">БНбД норм лавлах</div>
          <div className="grid sm:grid-cols-3 gap-4 text-xs text-white/40">
            <div>
              <div className="text-amber-400/70 font-medium mb-1">Асфальт (1 м³):</div>
              {PLANT_NORMS.asphalt.materials.map(m => <div key={m.name}>• {m.name}: {m.rate} {m.unit}</div>)}
            </div>
            <div>
              <div className="text-blue-400/70 font-medium mb-1">Бетон C25/30 (1 м³):</div>
              {PLANT_NORMS.concrete.materials.map(m => <div key={m.name}>• {m.name}: {m.rate} {m.unit}</div>)}
            </div>
            <div>
              <div className="text-green-400/70 font-medium mb-1">Бутлах (1 тн гаралт):</div>
              <div>• Байгалийн чулуу оролт: 1.15 тн</div>
              {PLANT_NORMS.crushing.outputFractions.map(f => (
                <div key={f.name}>• {f.name}: {(f.pct * 100).toFixed(0)}%</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
