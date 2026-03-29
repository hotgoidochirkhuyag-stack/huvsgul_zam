import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Search, CheckSquare, Square, Loader2, ChevronRight,
  Truck, AlertTriangle, CheckCircle2, RotateCcw, Sun, Moon,
  Gauge, Fuel, Clock, Factory, Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Тоног төхөөрөмжийн чеклист загварууд ──────────────────────────────────
const CHECKLIST_TEMPLATES: Record<string, { key: string; label: string; detail: string }[]> = {
  jaw_crusher: [
    { key: "lubrication",  label: "Тосолгооны систем",            detail: "Бүх холхивч, тулгуур зангилааны тосолгоо шалгана" },
    { key: "cooling",      label: "Хөргөлтийн систем",            detail: "Шингэний түвшин болон хэвийн ажиллагаа" },
    { key: "jaw_plates",   label: "Хуяг хавтасны элэгдэл (Jaw Plates)", detail: "Бутлах хавтасны элэгдлийн хэмжээ, бэхэлгээ" },
    { key: "vbelt",        label: "Дамжуулга туузны татлага (V-belt)", detail: "Туузны суналт болон ан цав байгаа эсэх" },
    { key: "guards",       label: "Хамгаалалтын хаалт, хашлага",   detail: "Хөдөлгөөнт хэсгүүдийн хаалт бүрэн бүтэн байдал" },
    { key: "noise",        label: "Дуу чимээ, чичиргээ",           detail: "Хэвийн бус дуу, доргилтыг шалгах" },
    { key: "discharge",    label: "Гаралтын амсар (Discharge opening)", detail: "Бүтээгдэхүүн гарах хэсэг чөлөөтэй, бөглөрөлгүй эсэх" },
  ],
  conveyor: [
    { key: "belt",         label: "Туузны татлага, элэгдэл",       detail: "Резин туузны төвлөрөл, ирмэгийн элэгдэл" },
    { key: "rollers",      label: "Тулгуур бул (Roller)",           detail: "Роликуудын эргэлт хэвийн эсэх, гацсан эсэхийг шалгах" },
    { key: "scraper",      label: "Цэвэрлэгч хусуур (Scraper)",    detail: "Туузан дээр наалдсан үлдэгдэл цэвэрлэгээний байдал" },
    { key: "emergency",    label: "Аюулгүй ажиллагааны хэрэгсэл", detail: "Яаралтай зогсоох татлага (Pull cord switch) болон мэдрэгчүүд" },
    { key: "instruments",  label: "Хэмжих хэрэгсэл",               detail: "Туузан жин болон хурд хэмжигчийн заалт" },
  ],
  vehicle: [
    { key: "oil",       label: "Тосны түвшин",           detail: "Хөдөлгүүрийн тос хангалттай байгааг шалгана" },
    { key: "fuel",      label: "Шатахуун",                detail: "Шатахууны түвшин хангалттай байгааг шалгана" },
    { key: "coolant",   label: "Хөргөлтийн шингэн",      detail: "Радиатор болон хөргөлтийн системийг шалгана" },
    { key: "brake",     label: "Тормозны систем",         detail: "Тормоз хангалттай ажиллаж байгааг шалгана" },
    { key: "tire",      label: "Дугуй / Хийн даралт",    detail: "Дугуй, хийн даралтыг шалгана" },
    { key: "light",     label: "Гэрэл, дохио",            detail: "Бүх гэрэл, дохио ажиллаж байгааг шалгана" },
    { key: "safety",    label: "Аюулгүйн хэрэгсэл",      detail: "Хамгаалалтын бүс, дуулга зэрэг хэрэгслийг шалгана" },
    { key: "cabin",     label: "Кабины байдал",           detail: "Кабины цонх, хаалга, суудлыг шалгана" },
    { key: "hydraulic", label: "Гидравлик систем",        detail: "Гидравлик шингэн, хоолой, цилиндрийг шалгана" },
    { key: "noise",     label: "Гадаад дуу чимээ",        detail: "Хэвийн бус дуу чимээ байхгүйг шалгана" },
  ],
};
CHECKLIST_TEMPLATES.excavator    = CHECKLIST_TEMPLATES.vehicle;
CHECKLIST_TEMPLATES.bulldozer    = CHECKLIST_TEMPLATES.vehicle;
CHECKLIST_TEMPLATES.motor        = [
  { key: "lubrication", label: "Тосолгооны систем",  detail: "Тулгуур, холхивчийн тосолгоо" },
  { key: "cooling",     label: "Хөргөлтийн систем",  detail: "Агаарын болон усан хөргөлт" },
  { key: "vibration",   label: "Чичиргээ",            detail: "Хэвийн бус чичиргээ байхгүй" },
  { key: "insulation",  label: "Цахилгааны тусгаарлалт", detail: "Кабелийн бүрхэвч бүрэн бүтэн" },
  { key: "temperature", label: "Температур",          detail: "Хэвийн ажиллагааны температур" },
];

const EQUIPMENT_LABELS: Record<string, string> = {
  vehicle:     "Автомашин",
  excavator:   "Экскаватор",
  bulldozer:   "Бульдозер",
  jaw_crusher: "Хацарт бутлуур",
  conveyor:    "Туузан дамжуулагч",
  screen:      "Ялгагч / Дэлгэц",
  motor:       "Мотор / Генератор",
};

const EQUIPMENT_ICONS: Record<string, typeof Truck> = {
  jaw_crusher: Factory,
  conveyor:    Settings,
  motor:       Gauge,
};

type CheckState = "ok" | "warn" | null;
type Step = "plate" | "type" | "employee" | "checklist" | "done";

export default function EquipmentInspection() {
  const { toast } = useToast();
  const prefilledEmp = new URLSearchParams(window.location.search).get("emp") ?? "";

  const [step, setStep]               = useState<Step>("plate");
  const [plate, setPlate]             = useState("");
  const [vehicle, setVehicle]         = useState<any>(null);
  const [plateError, setPlateError]   = useState("");
  const [employeeName, setEmployeeName] = useState(prefilledEmp);
  const [inspectionType, setInspectionType] = useState<"pre" | "post">("pre");
  const [checks, setChecks]           = useState<Record<string, CheckState>>({});
  const [notes, setNotes]             = useState("");
  const [engineHours, setEngineHours] = useState("");
  const [fuelLevel, setFuelLevel]     = useState("");
  const [lookingUp, setLookingUp]     = useState(false);
  const [result, setResult]           = useState<any>(null);

  const today = new Date().toISOString().slice(0, 10);

  // Тоног төхөөрөмжийн төрлөөс чеклист авах
  const eqType = vehicle?.equipmentType ?? "vehicle";
  const checklistItems = CHECKLIST_TEMPLATES[eqType] ?? CHECKLIST_TEMPLATES.vehicle;
  const EqIcon = EQUIPMENT_ICONS[eqType] ?? Truck;

  const allChecked = checklistItems.every(item => checks[item.key] !== null && checks[item.key] !== undefined);
  const hasWarning = checklistItems.some(item => checks[item.key] === "warn");

  // Техник хайх
  async function lookupVehicle() {
    if (!plate.trim()) return;
    setLookingUp(true);
    setPlateError("");
    try {
      const res = await fetch(`/api/checkin/vehicle?plate=${encodeURIComponent(plate.trim())}`);
      if (!res.ok) {
        const err = await res.json();
        setPlateError(err.message ?? "Техник олдсонгүй");
        setLookingUp(false);
        return;
      }
      const v = await res.json();
      setVehicle(v);
      setStep(prefilledEmp ? "checklist" : "employee");
    } catch {
      setPlateError("Сервертэй холбогдоход алдаа гарлаа");
    }
    setLookingUp(false);
  }

  // Үзлэг илгээх
  const submit = useMutation({
    mutationFn: () => {
      const checkArr = checklistItems.map(item => ({
        item: item.label, ok: checks[item.key] === "ok", warn: checks[item.key] === "warn",
      }));
      const passed = !hasWarning;
      const body: any = {
        vehicleId: vehicle.id,
        employeeName,
        checks: JSON.stringify(checkArr),
        passed,
        notes,
        inspectionType,
        date: today,
      };
      if (inspectionType === "pre") {
        if (engineHours) body.engineHoursStart = parseFloat(engineHours);
        if (fuelLevel) body.fuelLevelStart = parseFloat(fuelLevel);
      } else {
        if (engineHours) body.engineHoursEnd = parseFloat(engineHours);
        if (fuelLevel) body.fuelLevelEnd = parseFloat(fuelLevel);
      }
      return fetch("/api/checkin/vehicle-inspection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(r => r.json());
    },
    onSuccess: (data) => {
      setResult(data);
      setStep("done");
      toast({ title: `${inspectionType === "pre" ? "Өглөөний" : "Оройн"} үзлэг бүртгэгдлээ!` });
    },
    onError: () => toast({ title: "Алдаа гарлаа", variant: "destructive" }),
  });

  function reset() {
    setStep("plate");
    setPlate(""); setVehicle(null); setPlateError("");
    setEmployeeName(prefilledEmp); setChecks({}); setNotes("");
    setEngineHours(""); setFuelLevel(""); setResult(null);
    setInspectionType("pre");
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col">
      {/* Header */}
      <div className="bg-slate-900/80 border-b border-white/10 px-5 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="font-black text-base tracking-wider text-white">Техникийн Үзлэг</h1>
              <p className="text-xs text-slate-500">Ашиглалтын хяналт шалгалт</p>
            </div>
          </div>
          <div className="text-xs text-slate-500">{new Date().toLocaleDateString("mn-MN")}</div>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full p-4">

        {/* ── 1: Техникийн дугаар ── */}
        {step === "plate" && (
          <div className="mt-6 space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-amber-400 font-bold text-sm">ХАБЭА шаардлага</p>
                  <p className="text-xs text-slate-400 mt-0.5">Техник ашиглахаас өмнө болон дараа заавал үзлэг хийж бүртгүүлнэ</p>
                </div>
              </div>
            </div>

            {prefilledEmp && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400 text-xs font-semibold">Ажилтан: {prefilledEmp}</span>
              </div>
            )}

            <div>
              <label className="text-sm text-slate-400 mb-2 block font-medium">
                Техникийн дугаар (улсын дугаар / дотоод дугаар)
              </label>
              <input
                value={plate}
                onChange={e => { setPlate(e.target.value.toUpperCase()); setPlateError(""); }}
                onKeyDown={e => e.key === "Enter" && lookupVehicle()}
                placeholder="0348 УНА  /  BUT-001"
                data-testid="input-plate-number"
                className="w-full bg-slate-800/70 border border-white/10 rounded-xl px-4 py-4 text-white text-xl font-black text-center tracking-widest outline-none focus:border-amber-500/50 uppercase"
              />
              {plateError && (
                <div className="flex items-center gap-2 text-red-400 text-sm mt-2">
                  <AlertTriangle className="w-4 h-4" /> {plateError}
                </div>
              )}
            </div>

            <button
              onClick={lookupVehicle}
              disabled={!plate.trim() || lookingUp}
              data-testid="button-lookup-vehicle"
              className="w-full py-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              {lookingUp
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Хайж байна...</>
                : <><Search className="w-4 h-4" /> Техник хайх</>}
            </button>
          </div>
        )}

        {/* ── 2: Ажилтны нэр ── */}
        {step === "employee" && vehicle && (
          <div className="mt-4">
            <button onClick={() => setStep("plate")} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-4 transition-all">
              <ChevronRight className="w-4 h-4 rotate-180" /> Буцах
            </button>

            {/* Техникийн мэдээлэл */}
            <div className="bg-slate-800/50 border border-amber-500/20 rounded-xl p-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/15 rounded-xl">
                  <EqIcon className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-white font-bold">{vehicle.name}</p>
                  <p className="text-xs text-slate-400">{EQUIPMENT_LABELS[eqType] ?? vehicle.type} · {vehicle.plateNumber}</p>
                  {vehicle.location && <p className="text-xs text-amber-400/70">{vehicle.location}</p>}
                </div>
                <div className={`ml-auto px-2 py-1 rounded-lg text-xs font-bold ${vehicle.isReady ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                  {vehicle.isReady ? "Бэлэн" : "Засварт"}
                </div>
              </div>
            </div>

            {/* Өглөө/Орой сонгох */}
            <p className="text-sm text-slate-400 font-medium mb-3">Үзлэгийн төрөл</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                onClick={() => setInspectionType("pre")}
                data-testid="button-inspection-pre"
                className={`flex items-center justify-center gap-2 py-4 rounded-xl border font-bold text-sm transition-all ${
                  inspectionType === "pre"
                    ? "bg-amber-500/20 border-amber-500/60 text-amber-300"
                    : "bg-slate-800/40 border-white/10 text-slate-400 hover:bg-slate-700/40"
                }`}
              >
                <Sun className="w-4 h-4" /> Өглөөний үзлэг
              </button>
              <button
                onClick={() => setInspectionType("post")}
                data-testid="button-inspection-post"
                className={`flex items-center justify-center gap-2 py-4 rounded-xl border font-bold text-sm transition-all ${
                  inspectionType === "post"
                    ? "bg-blue-500/20 border-blue-500/60 text-blue-300"
                    : "bg-slate-800/40 border-white/10 text-slate-400 hover:bg-slate-700/40"
                }`}
              >
                <Moon className="w-4 h-4" /> Оройн үзлэг
              </button>
            </div>

            <label className="text-sm text-slate-400 mb-2 block font-medium">Үзлэг хийсэн ажилтан</label>
            <input
              value={employeeName}
              onChange={e => setEmployeeName(e.target.value)}
              placeholder="Нэр, овог"
              data-testid="input-employee-name"
              className="w-full bg-slate-800/70 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500/50 mb-4"
            />
            <button
              onClick={() => setStep("checklist")}
              disabled={!employeeName.trim()}
              data-testid="button-next-checklist"
              className="w-full py-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 font-black rounded-xl text-sm transition-all"
            >
              Чеклист рүү үргэлжлэх →
            </button>
          </div>
        )}

        {/* ── 3: Чеклист ── */}
        {step === "checklist" && vehicle && (
          <div className="mt-4">
            <button onClick={() => setStep("employee")} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-3 transition-all">
              <ChevronRight className="w-4 h-4 rotate-180" /> Буцах
            </button>

            {/* Техник + Үзлэгийн төрөл харуулах */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-500/15 rounded-lg">
                <EqIcon className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-sm">{vehicle.name}</p>
                <p className="text-xs text-slate-400">{vehicle.plateNumber} · {employeeName}</p>
              </div>
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold ${
                inspectionType === "pre"
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-blue-500/20 text-blue-300"
              }`}>
                {inspectionType === "pre" ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                {inspectionType === "pre" ? "Өглөөний" : "Оройн"}
              </div>
            </div>

            {/* Хөдөлгүүрийн цаг + Шатахуун */}
            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4 mb-4">
              <p className="text-xs text-slate-400 font-bold mb-3">
                {inspectionType === "pre" ? "☀️ Эхлэх үеийн мэдээлэл" : "🌙 Дуусах үеийн мэдээлэл"}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Хөдөлгүүрийн цаг (цаг)
                  </label>
                  <input
                    type="number"
                    value={engineHours}
                    onChange={e => setEngineHours(e.target.value)}
                    placeholder="1,245"
                    data-testid="input-engine-hours"
                    className="w-full bg-slate-700/60 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 flex items-center gap-1">
                    <Fuel className="w-3 h-3" />
                    Шатахуун (литр)
                  </label>
                  <input
                    type="number"
                    value={fuelLevel}
                    onChange={e => setFuelLevel(e.target.value)}
                    placeholder="80"
                    data-testid="input-fuel-level"
                    className="w-full bg-slate-700/60 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Чеклист */}
            <div className="bg-slate-900/60 border border-white/10 rounded-xl overflow-hidden mb-4">
              <div className={`px-4 py-3 border-b border-white/10 flex items-center gap-2 ${
                inspectionType === "pre" ? "bg-amber-500/10" : "bg-blue-500/10"
              }`}>
                <AlertTriangle className={`w-4 h-4 ${inspectionType === "pre" ? "text-amber-400" : "text-blue-400"}`} />
                <p className="font-bold text-sm">
                  {EQUIPMENT_LABELS[eqType] ?? vehicle.type} — ХАБЭА үзлэгийн чеклист
                </p>
              </div>
              <div className="p-4 space-y-2">
                {checklistItems.map(item => (
                  <div key={item.key} className={`rounded-xl border p-3 transition-all ${
                    checks[item.key] === "ok"
                      ? "bg-green-500/10 border-green-500/30"
                      : checks[item.key] === "warn"
                        ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-white/3 border-white/10"
                  }`}>
                    <p className={`text-sm font-semibold mb-1 ${
                      checks[item.key] === "ok" ? "text-green-300" :
                      checks[item.key] === "warn" ? "text-amber-300" : "text-white"
                    }`}>{item.label}</p>
                    <p className="text-xs text-slate-500 mb-2">{item.detail}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setChecks(p => ({ ...p, [item.key]: "ok" }))}
                        data-testid={`btn-ok-${item.key}`}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                          checks[item.key] === "ok"
                            ? "bg-green-500/25 border border-green-500/50 text-green-300"
                            : "bg-slate-700/50 border border-white/10 text-slate-400 hover:bg-green-500/10"
                        }`}
                      >
                        <CheckSquare className="w-3.5 h-3.5" /> Хэвийн
                      </button>
                      <button
                        onClick={() => setChecks(p => ({ ...p, [item.key]: "warn" }))}
                        data-testid={`btn-warn-${item.key}`}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                          checks[item.key] === "warn"
                            ? "bg-amber-500/25 border border-amber-500/50 text-amber-300"
                            : "bg-slate-700/50 border border-white/10 text-slate-400 hover:bg-amber-500/10"
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" /> Анхааруулга
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Нэмэлт тэмдэглэл */}
            <div className="mb-4">
              <label className="text-xs text-slate-400 mb-1.5 block">Нэмэлт тэмдэглэл (заавал биш)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Гарсан доголдол, санамж..."
                rows={2}
                data-testid="input-inspection-notes"
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500/50 resize-none"
              />
            </div>

            {hasWarning && (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-300 text-xs">
                  Анхааруулга тэмдэглэгдсэн байна. Механикт мэдэгдэж, зөвшөөрөл авсны дараа ажиллуулна уу.
                </p>
              </div>
            )}

            {!allChecked && (
              <p className="text-center text-xs text-slate-500 mb-3">Бүх зүйлийг тэмдэглэснийхээ дараа илгээх боломжтой</p>
            )}

            <button
              onClick={() => submit.mutate()}
              disabled={!allChecked || submit.isPending}
              data-testid="button-submit-inspection"
              className={`w-full py-4 font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                hasWarning
                  ? "bg-amber-600 hover:bg-amber-500"
                  : "bg-green-600 hover:bg-green-500"
              }`}
            >
              {submit.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Илгээж байна...</>
                : hasWarning
                  ? <><AlertTriangle className="w-4 h-4" /> Анхааруулгатай бүртгэх</>
                  : <><CheckCircle2 className="w-4 h-4" /> Үзлэг баталгаажуулах</>}
            </button>
          </div>
        )}

        {/* ── 4: Амжилттай ── */}
        {step === "done" && vehicle && (
          <div className="mt-8 text-center">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-5 ${
              hasWarning ? "bg-amber-500/20" : "bg-green-500/20"
            }`}>
              {hasWarning
                ? <AlertTriangle className="w-10 h-10 text-amber-400" />
                : <CheckCircle2 className="w-10 h-10 text-green-400" />}
            </div>

            <h2 className="text-xl font-black text-white mb-2">
              {inspectionType === "pre" ? "Өглөөний үзлэг" : "Оройн үзлэг"} бүртгэгдлээ
            </h2>
            <p className={`text-sm mb-6 ${hasWarning ? "text-amber-400" : "text-green-400"}`}>
              {hasWarning ? "⚠️ Анхааруулга тэмдэглэгдсэн — механикт мэдэгдэнэ" : "✅ Бүгд хэвийн — ажилд бэлэн"}
            </p>

            {/* Ашиглалтын хураангуй */}
            <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-5 text-left mb-6">
              <p className="text-xs text-slate-400 font-bold mb-3">📋 Үзлэгийн хураангуй</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Техник</span>
                  <span className="text-white font-semibold">{vehicle.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Дугаар</span>
                  <span className="text-white font-mono">{vehicle.plateNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ажилтан</span>
                  <span className="text-white">{employeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Үзлэгийн төрөл</span>
                  <span className={`font-bold ${inspectionType === "pre" ? "text-amber-400" : "text-blue-400"}`}>
                    {inspectionType === "pre" ? "☀️ Өглөөний" : "🌙 Оройн"}
                  </span>
                </div>
                {engineHours && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">
                      {inspectionType === "pre" ? "Хөдөлгүүрийн цаг (эхлэх)" : "Хөдөлгүүрийн цаг (дуусах)"}
                    </span>
                    <span className="text-white font-mono">{engineHours} цаг</span>
                  </div>
                )}
                {fuelLevel && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">
                      {inspectionType === "pre" ? "Шатахуун (эхлэх)" : "Шатахуун (үлдсэн)"}
                    </span>
                    <span className="text-white font-mono">{fuelLevel} л</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-white/10">
                  <span className="text-slate-400">Шалгасан зүйл</span>
                  <span className="text-white">
                    {checklistItems.filter(i => checks[i.key] === "ok").length}/{checklistItems.length} хэвийн
                    {hasWarning && <span className="text-amber-400"> · {checklistItems.filter(i => checks[i.key] === "warn").length} анхааруулга</span>}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={reset}
                data-testid="button-new-inspection"
                className="flex items-center justify-center gap-2 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-bold transition-all"
              >
                <RotateCcw className="w-4 h-4" /> Шинэ үзлэг
              </button>
              <button
                onClick={() => {
                  setInspectionType(inspectionType === "pre" ? "post" : "pre");
                  setChecks({});
                  setEngineHours(""); setFuelLevel("");
                  setStep("checklist");
                }}
                data-testid="button-switch-inspection"
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                  inspectionType === "pre"
                    ? "bg-blue-600 hover:bg-blue-500"
                    : "bg-amber-600 hover:bg-amber-500"
                }`}
              >
                {inspectionType === "pre"
                  ? <><Moon className="w-4 h-4" /> Оройн үзлэг</>
                  : <><Sun className="w-4 h-4" /> Өглөөний үзлэг</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
