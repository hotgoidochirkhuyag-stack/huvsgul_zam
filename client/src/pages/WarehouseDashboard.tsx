import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp,
  Save, LogOut, Calendar, Factory, Layers, Hammer, Package,
  ArrowDown, Info, TrendingDown, Warehouse, Plus, Minus, Edit3,
  Trash2, PackagePlus, TruckIcon
} from "lucide-react";
import type { ProductionPlan, MaterialCheck, WarehouseItem } from "@shared/schema";

// ===================== БНбД НОРМУУД (ЗАССАН) — асфальтын рецептур, бетоны ангилал =====================

// Асфальтын рецептурууд — нягтрал × хольцын хувь = 1 м³ хэрэглээ
const ASPHALT_RECIPES: Record<string, { desc: string; density: number; bitumenPct: number; materials: { name: string; unit: string; rate: number; wKey: string | null }[] }> = {
  "АБ-1 (Дотор давхарга)": {
    desc: "Дотор (wearing) давхарга — нягт 2.35 т/м³, битум 5.5%",
    density: 2.35, bitumenPct: 5.5,
    materials: [
      { name: "Битум БНД 60/90",  unit: "тн", rate: 0.129, wKey: "Битум БНД 60/90"          },
      { name: "Хайрга 10-20мм",   unit: "тн", rate: 0.517, wKey: "Хайрга 10-20мм"           },
      { name: "Хайрга 5-10мм",    unit: "тн", rate: 0.423, wKey: "Хайрга 5-10мм"            },
      { name: "Хайрга 2-5мм",     unit: "тн", rate: 0.329, wKey: "Хайрга 2-5мм"             },
      { name: "Хайрга 0-2мм",     unit: "тн", rate: 0.353, wKey: "Хайрга 0-2мм"             },
      { name: "Минерал нунтаг",   unit: "тн", rate: 0.212, wKey: "Минерал нунтаг"           },
      { name: "Элс (асфальт)",    unit: "тн", rate: 0.387, wKey: "Элс (асфальт)"            },
    ],
  },
  "АБ-2 (Дунд давхарга)": {
    desc: "Дунд (binder) давхарга — нягт 2.40 т/м³, битум 5.0%",
    density: 2.40, bitumenPct: 5.0,
    materials: [
      { name: "Битум БНД 60/90",  unit: "тн", rate: 0.120, wKey: "Битум БНД 60/90"          },
      { name: "Хайрга 10-20мм",   unit: "тн", rate: 0.672, wKey: "Хайрга 10-20мм"           },
      { name: "Хайрга 5-10мм",    unit: "тн", rate: 0.480, wKey: "Хайрга 5-10мм"            },
      { name: "Хайрга 2-5мм",     unit: "тн", rate: 0.312, wKey: "Хайрга 2-5мм"             },
      { name: "Хайрга 0-2мм",     unit: "тн", rate: 0.288, wKey: "Хайрга 0-2мм"             },
      { name: "Минерал нунтаг",   unit: "тн", rate: 0.192, wKey: "Минерал нунтаг"           },
      { name: "Элс (асфальт)",    unit: "тн", rate: 0.336, wKey: "Элс (асфальт)"            },
    ],
  },
  "ДАБ (Доод давхарга)": {
    desc: "Доод (base) давхарга — нягт 2.42 т/м³, битум 4.5%",
    density: 2.42, bitumenPct: 4.5,
    materials: [
      { name: "Битум БНД 60/90",  unit: "тн", rate: 0.109, wKey: "Битум БНД 60/90"          },
      { name: "Хайрга 10-20мм",   unit: "тн", rate: 0.847, wKey: "Хайрга 10-20мм"           },
      { name: "Хайрга 5-10мм",    unit: "тн", rate: 0.532, wKey: "Хайрга 5-10мм"            },
      { name: "Хайрга 2-5мм",     unit: "тн", rate: 0.290, wKey: "Хайрга 2-5мм"             },
      { name: "Хайрга 0-2мм",     unit: "тн", rate: 0.242, wKey: "Хайрга 0-2мм"             },
      { name: "Минерал нунтаг",   unit: "тн", rate: 0.169, wKey: "Минерал нунтаг"           },
      { name: "Элс (асфальт)",    unit: "тн", rate: 0.230, wKey: "Элс (асфальт)"            },
    ],
  },
};

// Бетоны ангилал — 1 м³ бетонд хэрэглэгдэх материал (БНбД 3.01.102)
const CONCRETE_GRADES: Record<string, { desc: string; materials: { name: string; unit: string; rate: number; wKey: string | null }[] }> = {
  "C15/20 (Суурь, хонгил)": {
    desc: "Ердийн суурь, хонгилын бетон — цемент 280 кг/м³",
    materials: [
      { name: "Цемент ПЦ400",     unit: "тн", rate: 0.280, wKey: "Цемент ПЦ400"             },
      { name: "Элс (бетон)",      unit: "м³", rate: 0.750, wKey: "Элс (бетон)"              },
      { name: "Хайрга 5-10мм",    unit: "м³", rate: 0.400, wKey: "Хайрга 5-10мм"            },
      { name: "Хайрга 10-20мм",   unit: "м³", rate: 0.560, wKey: "Хайрга 10-20мм"           },
      { name: "Ус",               unit: "м³", rate: 0.190, wKey: null                        },
    ],
  },
  "C20/25 (Ерөнхий бүтэц)": {
    desc: "Ерөнхий бүтцийн бетон — цемент 320 кг/м³",
    materials: [
      { name: "Цемент ПЦ400",     unit: "тн", rate: 0.320, wKey: "Цемент ПЦ400"             },
      { name: "Элс (бетон)",      unit: "м³", rate: 0.700, wKey: "Элс (бетон)"              },
      { name: "Хайрга 5-10мм",    unit: "м³", rate: 0.380, wKey: "Хайрга 5-10мм"            },
      { name: "Хайрга 10-20мм",   unit: "м³", rate: 0.550, wKey: "Хайрга 10-20мм"           },
      { name: "Химийн нэмэлт",    unit: "кг", rate: 0.500, wKey: "Химийн нэмэлт"            },
      { name: "Ус",               unit: "м³", rate: 0.185, wKey: null                        },
    ],
  },
  "C25/30 (Замын хавтан, хана)": {
    desc: "Стандарт замын бетон — цемент 350 кг/м³",
    materials: [
      { name: "Цемент ПЦ400",     unit: "тн", rate: 0.350, wKey: "Цемент ПЦ400"             },
      { name: "Элс (бетон)",      unit: "м³", rate: 0.680, wKey: "Элс (бетон)"              },
      { name: "Хайрга 5-10мм",    unit: "м³", rate: 0.400, wKey: "Хайрга 5-10мм"            },
      { name: "Хайрга 10-20мм",   unit: "м³", rate: 0.550, wKey: "Хайрга 10-20мм"           },
      { name: "Химийн нэмэлт",    unit: "кг", rate: 0.900, wKey: "Химийн нэмэлт"            },
      { name: "Ус",               unit: "м³", rate: 0.180, wKey: null                        },
    ],
  },
  "C30/37 (Гүүрийн элемент)": {
    desc: "Гүүрийн бетон — цемент 400 кг/м³, W/C ≤ 0.40",
    materials: [
      { name: "Цемент ПЦ500",     unit: "тн", rate: 0.400, wKey: "Цемент ПЦ400"             },
      { name: "Элс (бетон)",      unit: "м³", rate: 0.650, wKey: "Элс (бетон)"              },
      { name: "Хайрга 5-10мм",    unit: "м³", rate: 0.380, wKey: "Хайрга 5-10мм"            },
      { name: "Хайрга 10-20мм",   unit: "м³", rate: 0.520, wKey: "Хайрга 10-20мм"           },
      { name: "Химийн нэмэлт",    unit: "кг", rate: 1.200, wKey: "Химийн нэмэлт"            },
      { name: "Ус",               unit: "м³", rate: 0.160, wKey: null                        },
    ],
  },
};

const PLANT_NORMS = {
  asphalt: {
    label: "Асфальтбетон хольцын үйлдвэр",
    icon: Layers, color: "amber" as const,
    unit: "м³", maxCapacity: 200, capacityDesc: "150–200 м³/хоног",
    outputLabel: "Асфальтбетон хольц",
    defaultRecipe: "АБ-1 (Дотор давхарга)",
  },
  concrete: {
    label: "Бетон зуурмагийн үйлдвэр",
    icon: Factory, color: "blue" as const,
    unit: "м³", maxCapacity: 1800, capacityDesc: "1300–1800 м³/хоног",
    outputLabel: "Бетон зуурмаг",
    defaultGrade: "C25/30 (Замын хавтан, хана)",
  },
  crushing: {
    label: "Бутлах ангилах үйлдвэр",
    icon: Hammer, color: "green" as const,
    unit: "тн", maxCapacity: 800, capacityDesc: "цагт 100 тн · 8 цаг",
    outputLabel: "Ангилсан хайрга (нийт гаралт)",
    materials: [
      { name: "Байгалийн чулуу (оролт)", unit: "тн", rate: 1.15,  wKey: "Байгалийн чулуу (оролт)" },
      { name: "Шатах тос",               unit: "л",  rate: 0.625, wKey: "Шатах тос (бутлуур)"     },
    ],
    outputFractions: [
      { name: "0–2мм фракц",   pct: 0.25 },
      { name: "2–5мм фракц",   pct: 0.20 },
      { name: "5–10мм фракц",  pct: 0.25 },
      { name: "10–20мм фракц", pct: 0.30 },
    ],
  },
};

type PlantKey = keyof typeof PLANT_NORMS;

// ─── Цаг агаарын анхааруулга ─────────────────────────────────────────────────
function WeatherWarning({ plantKey }: { plantKey: PlantKey }) {
  const month = new Date().getMonth() + 1; // 1-12
  if (plantKey === "crushing") return null;

  const isAsphalt = plantKey === "asphalt";
  const isConcrete = plantKey === "concrete";

  // Монголын цаг агаарын улирал + БНбД хязгаарлалт
  const danger  = (isAsphalt && (month <= 4 || month >= 10)) || (isConcrete && (month <= 3 || month >= 11));
  const caution = (isAsphalt && (month === 5 || month === 9)) || (isConcrete && (month === 4 || month === 10));

  if (!danger && !caution) return null;

  return (
    <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs border ${
      danger  ? "bg-red-500/10 border-red-500/30 text-red-300"
              : "bg-amber-500/10 border-amber-500/30 text-amber-300"
    }`}>
      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <span>
        {isAsphalt && danger  && "БНбД анхааруулга: Одоогийн улирал асфальт тавихад тохиромжгүй. Суурийн температур ≥5°C, агаарын температур ≥10°C байх шаардлагатай."}
        {isAsphalt && caution && "Болгоомжтой: Температур хязгаарлалтад ойртож байна. Тавих үеийн температур, даралт хяналтыг нягтлан шалгана уу."}
        {isConcrete && danger  && "БНбД анхааруулга: Хүйтний улирал — бетон цутгахад халаах арга хэмжээ (хасах 5°C-с доош болохгүй) хэрэглэнэ. Хурдасгагч химийн нэмэлт нэмэх."}
        {isConcrete && caution && "Болгоомжтой: Өрлийн температур ойртож байна. Бетоныг дулаалах, усалж хамгаалах арга хэмжээ авна уу."}
      </span>
    </div>
  );
}

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
  const [fieldQty,   setFieldQty]   = useState<Record<string, string>>({});

  // ── Recipe / grade selector ──────────────────────────────────────────────
  const asphaltRecipeKeys = Object.keys(ASPHALT_RECIPES);
  const concreteGradeKeys = Object.keys(CONCRETE_GRADES);

  const [selectedRecipe, setSelectedRecipe] = useState(
    plantKey === "asphalt" ? asphaltRecipeKeys[0] : ""
  );
  const [selectedGrade, setSelectedGrade] = useState(
    plantKey === "concrete" ? concreteGradeKeys[2] : "" // C25/30 default
  );

  // Compute active materials depending on plant type
  const activeMaterials = plantKey === "asphalt"
    ? (ASPHALT_RECIPES[selectedRecipe]?.materials ?? [])
    : plantKey === "concrete"
    ? (CONCRETE_GRADES[selectedGrade]?.materials ?? [])
    : (norm as any).materials as { name: string; unit: string; rate: number; wKey: string | null }[];

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
  const rows = activeMaterials.map(m => {
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

      const checks = activeMaterials.map(m => ({
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

          {/* Weather warning */}
          <WeatherWarning plantKey={plantKey} />

          {/* Recipe / Grade selector */}
          {plantKey === "asphalt" && (
            <div className="space-y-1.5">
              <label className="text-xs text-white/40 font-medium">Асфальтын рецептур</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ASPHALT_RECIPES).map(([key, rec]) => (
                  <button key={key} data-testid={`recipe-${key}`}
                    onClick={() => { setSelectedRecipe(key); setFieldQty({}); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      selectedRecipe === key
                        ? "bg-amber-600 border-amber-500 text-white"
                        : "bg-white/5 border-white/10 text-white/50 hover:border-amber-500/50"
                    }`}>
                    {key}
                  </button>
                ))}
              </div>
              <div className="text-xs text-white/30">{ASPHALT_RECIPES[selectedRecipe]?.desc}</div>
              {selectedRecipe && (
                <div className="flex gap-3 text-xs text-amber-400/70">
                  <span>Нягт: {ASPHALT_RECIPES[selectedRecipe].density} т/м³</span>
                  <span>·</span>
                  <span>Битум: {ASPHALT_RECIPES[selectedRecipe].bitumenPct}%</span>
                  <span>·</span>
                  <span>Битум/м³: {ASPHALT_RECIPES[selectedRecipe].materials.find(m => m.name === "Битум БНД 60/90")?.rate} тн</span>
                </div>
              )}
            </div>
          )}

          {plantKey === "concrete" && (
            <div className="space-y-1.5">
              <label className="text-xs text-white/40 font-medium">Бетоны ангилал (БНбД 3.01.102)</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(CONCRETE_GRADES).map(([key, gr]) => (
                  <button key={key} data-testid={`grade-${key}`}
                    onClick={() => { setSelectedGrade(key); setFieldQty({}); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      selectedGrade === key
                        ? "bg-blue-700 border-blue-500 text-white"
                        : "bg-white/5 border-white/10 text-white/50 hover:border-blue-500/50"
                    }`}>
                    {key}
                  </button>
                ))}
              </div>
              <div className="text-xs text-white/30">{CONCRETE_GRADES[selectedGrade]?.desc}</div>
            </div>
          )}

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

const PLANT_LABEL: Record<string, string> = {
  asphalt:  "Асфальт",
  concrete: "Бетон",
  crushing: "Бутлах",
};
const PLANT_BADGE: Record<string, string> = {
  asphalt:  "bg-amber-500/15 text-amber-400",
  concrete: "bg-blue-500/15 text-blue-400",
  crushing: "bg-green-500/15 text-green-400",
};

// ─── Inline татан авалт / зарлага ────────────────────────────────────────────
function InlineAdjust({ item, type, token, onDone }: {
  item: WarehouseItem; type: "in" | "out"; token: string; onDone: () => void;
}) {
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const hdrs = { "x-admin-token": token };
  const isIn = type === "in";

  const mut = useMutation({
    mutationFn: async () => {
      const q = parseFloat(qty);
      if (!q || q <= 0) throw new Error("Хэмжээ оруулна уу");
      const res = await fetch("/api/warehouse/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...hdrs },
        body: JSON.stringify({
          itemId: item.id, quantity: q, type,
          date: new Date().toISOString().slice(0, 10),
          notes: notes || (isIn ? "Татан авалт" : "Зарлага"),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/items"] });
      toast({ title: `${item.name}: ${isIn ? "Татан авалт" : "Зарлага"} ${qty} ${item.unit} ✓` });
      onDone();
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") mut.mutate();
    if (e.key === "Escape") onDone();
  };

  return (
    <div className={`flex flex-col gap-2 p-3 rounded-xl border ${
      isIn ? "border-green-500/30 bg-green-500/8" : "border-orange-500/30 bg-orange-500/8"
    }`}>
      <div className={`text-xs font-semibold ${isIn ? "text-green-400" : "text-orange-400"}`}>
        {isIn ? "📦 Татан авалт — нөөцөд орох" : "📤 Зарлага — нөөцөөс гарах"}
      </div>
      <div className="flex items-center gap-2">
        <input
          data-testid={`input-inline-${type}-${item.id}`}
          type="number" min="0" value={qty} onChange={e => setQty(e.target.value)}
          onKeyDown={handleKey} autoFocus
          placeholder={`Хэмжээ (${item.unit})`}
          className={`w-28 bg-white/5 border rounded-lg px-3 py-1.5 text-sm font-bold focus:outline-none transition-colors ${
            isIn ? "border-green-500/30 text-green-200 focus:border-green-400" : "border-orange-500/30 text-orange-200 focus:border-orange-400"
          }`}
        />
        <input
          type="text" value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Тэмдэглэл..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/60 focus:outline-none focus:border-white/20"
        />
        <button data-testid={`btn-inline-confirm-${item.id}`}
          onClick={() => mut.mutate()} disabled={mut.isPending || !qty}
          className={`px-3 py-1.5 rounded-lg text-white text-xs font-bold transition-all disabled:opacity-30 ${
            isIn ? "bg-green-600 hover:bg-green-500" : "bg-orange-600 hover:bg-orange-500"
          }`}>
          {mut.isPending ? "…" : "Баталгаажуулах"}
        </button>
        <button data-testid={`btn-inline-cancel-${item.id}`}
          onClick={onDone}
          className="px-2 py-1.5 rounded-lg text-white/30 hover:text-white/60 border border-white/10 text-xs transition-colors">
          Болих
        </button>
      </div>
      {qty && parseFloat(qty) > 0 && (
        <div className="text-xs text-white/30">
          Хадгалсны дараа: <span className={`font-bold ${isIn ? "text-green-400" : "text-orange-400"}`}>
            {fmt(isIn
              ? (item.currentStock ?? 0) + parseFloat(qty)
              : Math.max(0, (item.currentStock ?? 0) - parseFloat(qty))
            )} {item.unit}
          </span>
          {!isIn && parseFloat(qty) > (item.currentStock ?? 0) && (
            <span className="text-red-400 ml-2">⚠ Нөөцөөс хэтэрсэн</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Шинэ материал нэмэх modal ────────────────────────────────────────────────
function NewItemModal({ token, onClose }: { token: string; onClose: () => void }) {
  const { toast } = useToast();
  const hdrs = { "x-admin-token": token };
  const [form, setForm] = useState({
    name: "", unit: "тн", plant: "asphalt", category: "other",
    currentStock: "", minStock: "", criticalStock: "",
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const mut = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Нэр оруулна уу");
      const res = await fetch("/api/warehouse/items", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...hdrs },
        body: JSON.stringify({
          name: form.name.trim(),
          unit: form.unit,
          plant: form.plant,
          category: form.category,
          currentStock: parseFloat(form.currentStock) || 0,
          minStock: parseFloat(form.minStock) || 0,
          criticalStock: parseFloat(form.criticalStock) || 0,
          normBasis: "",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/items"] });
      toast({ title: `${form.name} агуулахд нэмэгдлээ ✓` });
      onClose();
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md mx-4 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <PackagePlus className="w-5 h-5 text-amber-400" />
          <div className="font-bold text-lg">Шинэ материал нэмэх</div>
        </div>

        {/* Нэр */}
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">Материалын нэр *</label>
          <input data-testid="input-new-name" type="text" value={form.name}
            onChange={e => set("name", e.target.value)} autoFocus
            placeholder="жишээ: Цемент ПЦ500 Монрос"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors" />
        </div>

        {/* Нэгж + Ангилал */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Хэмжих нэгж</label>
            <select data-testid="select-new-unit" value={form.unit} onChange={e => set("unit", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
              {["тн","м³","кг","л","ширхэг","м","м²"].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Ангилал</label>
            <select value={form.category} onChange={e => set("category", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
              {[
                ["cement","Цемент"],["stone","Чулуу/Хайрга"],["sand","Элс"],
                ["bitumen","Битум"],["mineral","Минерал"],["other","Бусад"],
              ].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        {/* Үйлдвэр */}
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">Аль үйлдвэрт хамааралтай</label>
          <div className="grid grid-cols-3 gap-2">
            {[["asphalt","Асфальт","amber"],["concrete","Бетон","blue"],["crushing","Бутлах","green"]] .map(([v,l,c]) => (
              <button key={v} onClick={() => set("plant", v)}
                className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                  form.plant === v
                    ? c === "amber" ? "bg-amber-600 border-amber-500 text-white"
                    : c === "blue"  ? "bg-blue-700 border-blue-500 text-white"
                    : "bg-green-700 border-green-500 text-white"
                    : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"
                }`}>{l}</button>
            ))}
          </div>
        </div>

        {/* Нөөцийн тоо */}
        <div className="grid grid-cols-3 gap-3">
          {[
            ["currentStock","Одоогийн нөөц"],
            ["minStock","Доод хязгаар"],
            ["criticalStock","Аюулт хязгаар"],
          ].map(([k,l]) => (
            <div key={k}>
              <label className="text-xs text-white/40 mb-1.5 block">{l}</label>
              <input type="number" value={form[k as keyof typeof form]}
                onChange={e => set(k, e.target.value)} placeholder="0"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors" />
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm border border-white/10 text-white/40 hover:text-white/60 transition-colors">
            Болих
          </button>
          <button data-testid="btn-new-item-save" onClick={() => mut.mutate()} disabled={mut.isPending || !form.name}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-all disabled:opacity-40">
            {mut.isPending ? "…" : "Нэмэх"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stock Overview tab ───────────────────────────────────────────────────────
function StockTab({ allItems, token }: { allItems: WarehouseItem[]; token: string }) {
  const [showNew, setShowNew] = useState(false);
  const [confirmDel, setConfirmDel] = useState<WarehouseItem | null>(null);
  const [inline, setInline] = useState<{ id: number; type: "in" | "out" } | null>(null);
  const { toast } = useToast();
  const hdrs = { "x-admin-token": token };

  const sorted = [...allItems].sort((a, b) => a.name.localeCompare(b.name, "mn"));

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/warehouse/items/${id}`, { method: "DELETE", headers: hdrs });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/items"] });
      toast({ title: "Материал устгагдлаа ✓" });
      setConfirmDel(null);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <>
      {showNew && <NewItemModal token={token} onClose={() => setShowNew(false)} />}

      {/* Устгах баталгаажуулалт */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-red-500/30 rounded-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-5 h-5" />
              <div className="font-bold">Устгах уу?</div>
            </div>
            <div className="text-sm text-white/60">
              <span className="text-white font-medium">{confirmDel.name}</span> — агуулахын бүртгэлийг бүрмөсөн устгана.
              Нөөцийн түүх хамт устгагдана.
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDel(null)}
                className="flex-1 py-2.5 rounded-xl text-sm border border-white/10 text-white/40 hover:text-white/60 transition-colors">
                Болих
              </button>
              <button data-testid="btn-confirm-delete"
                onClick={() => deleteMut.mutate(confirmDel.id)}
                disabled={deleteMut.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition-all disabled:opacity-40">
                {deleteMut.isPending ? "…" : "Устгах"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-white/30">{sorted.length} материал бүртгэлтэй</div>
          <button data-testid="btn-new-item"
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-all">
            <PackagePlus className="w-4 h-4" /> Шинэ материал нэмэх
          </button>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 px-4 py-2.5 bg-white/3 border-b border-white/8 text-xs text-white/30 font-medium">
            <span>Материал</span>
            <span className="text-right">Одоогийн нөөц</span>
            <span className="text-right">Доод / Аюулт</span>
            <span className="text-center pr-2">Үйлдэл</span>
          </div>

          <div className="divide-y divide-white/5">
            {sorted.map(item => {
              const stock = item.currentStock ?? 0;
              const min   = item.minStock ?? 0;
              const crit  = item.criticalStock ?? 0;
              const pct   = min > 0 ? Math.min(100, (stock / (min * 1.5)) * 100) : 50;
              const statusColor = stock === 0 ? "text-white/25" : stock <= crit ? "text-red-400" : stock <= min ? "text-amber-400" : "text-green-400";
              const barColor    = stock <= crit ? "bg-red-500" : stock <= min ? "bg-amber-500" : "bg-green-500";
              const activeInline = inline?.id === item.id ? inline.type : null;

              return (
                <div key={item.id} data-testid={`stock-row-${item.id}`} className="bg-[#0c1528]">
                  {/* Main row */}
                  <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-center px-4 py-3 hover:bg-white/2 transition-colors">
                    {/* Name + badge */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{item.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${PLANT_BADGE[item.plant] ?? "bg-white/10 text-white/40"}`}>
                          {PLANT_LABEL[item.plant] ?? item.plant}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1 rounded-full bg-white/5 overflow-hidden w-28">
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    {/* Stock */}
                    <div className="text-right">
                      <span className={`text-base font-bold ${statusColor}`}>{fmt(stock)}</span>
                      <span className="text-xs text-white/25 ml-1">{item.unit}</span>
                    </div>

                    {/* Min/Crit */}
                    <div className="text-right text-xs text-white/25">
                      <div>{fmt(min)} {item.unit}</div>
                      <div className="text-red-400/50">{fmt(crit)} {item.unit}</div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 justify-end">
                      {!activeInline && (
                        <>
                          <button data-testid={`btn-tatah-${item.id}`}
                            onClick={() => setInline({ id: item.id, type: "in" })}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20 text-xs font-semibold transition-all whitespace-nowrap">
                            <TruckIcon className="w-3 h-3" /> Татан авалт
                          </button>
                          <button data-testid={`btn-zarlaga-${item.id}`}
                            onClick={() => setInline({ id: item.id, type: "out" })}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 text-xs font-semibold transition-all whitespace-nowrap">
                            <Minus className="w-3 h-3" /> Зарлага
                          </button>
                          <button data-testid={`btn-delete-${item.id}`}
                            onClick={() => setConfirmDel(item)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-white/8 text-white/20 hover:text-red-400 hover:border-red-500/30 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {activeInline && (
                        <button onClick={() => setInline(null)}
                          className="text-xs text-white/30 hover:text-white/50 px-2 py-1 transition-colors">✕ Хаах</button>
                      )}
                    </div>
                  </div>

                  {/* Inline adjust panel (full width under row) */}
                  {activeInline && (
                    <div className="px-4 pb-3">
                      <InlineAdjust item={item} type={activeInline} token={token} onDone={() => setInline(null)} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
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

        </>}

        {activeTab === "stock" && <StockTab allItems={allItems} token={token} />}
      </div>
    </div>
  );
}
