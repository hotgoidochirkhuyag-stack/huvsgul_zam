import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Search, CheckSquare, Square, Loader2, ChevronRight,
  Truck, AlertTriangle, CheckCircle2, RotateCcw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const INSPECTION_ITEMS = [
  { key: "oil",       label: "Тосны түвшин",           detail: "Хөдөлгүүрийн тос хангалттай байгааг шалгана" },
  { key: "fuel",      label: "Шатахуун",                detail: "Шатахууны түвшин хангалттай байгааг шалгана" },
  { key: "coolant",   label: "Хөргөлтийн шингэн",      detail: "Радиатор болон хөргөлтийн системийг шалгана" },
  { key: "brake",     label: "Тормозны систем",         detail: "Тормоз хангалттай ажиллаж байгааг шалгана" },
  { key: "tire",      label: "Дугуй / Гусени",          detail: "Дугуй эсвэл гусений байдал, даралтыг шалгана" },
  { key: "light",     label: "Гэрэл, дохио",            detail: "Бүх гэрэл, дохио ажиллаж байгааг шалгана" },
  { key: "safety",    label: "Аюулгүйн хэрэгсэл",      detail: "Хамгаалалтын бүс, дуулга зэрэг хэрэгслийг шалгана" },
  { key: "cabin",     label: "Кабины байдал",           detail: "Кабины цонх, хаалга, суудлыг шалгана" },
  { key: "hydraulic", label: "Гидравлик систем",        detail: "Гидравлик шингэн, хоолой, цилиндрийг шалгана" },
  { key: "sound",     label: "Гадаад дуу чимээ",        detail: "Хэвийн бус дуу чимээ байхгүйг шалгана" },
];

type CheckState = "ok" | "warn" | null;

type Step = "plate" | "employee" | "checklist" | "done";

export default function EquipmentInspection() {
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("plate");
  const [plate, setPlate] = useState("");
  const [vehicle, setVehicle] = useState<any>(null);
  const [plateError, setPlateError] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [checks, setChecks] = useState<Record<string, CheckState>>({});
  const [notes, setNotes] = useState("");
  const [lookingUp, setLookingUp] = useState(false);

  const allChecked = INSPECTION_ITEMS.every(item => checks[item.key] !== null && checks[item.key] !== undefined);
  const hasWarning = INSPECTION_ITEMS.some(item => checks[item.key] === "warn");

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
      setStep("employee");
    } catch {
      setPlateError("Сервертэй холбогдоход алдаа гарлаа");
    }
    setLookingUp(false);
  }

  // Үзлэг илгээх
  const submit = useMutation({
    mutationFn: () => {
      const checkArr = INSPECTION_ITEMS.map(item => ({
        item: item.label, ok: checks[item.key] === "ok", warn: checks[item.key] === "warn",
      }));
      const passed = !hasWarning;
      return fetch("/api/checkin/vehicle-inspection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: vehicle.id, employeeName, checks: JSON.stringify(checkArr), passed, notes }),
      }).then(r => r.json());
    },
    onSuccess: () => {
      setStep("done");
      toast({ title: "Техникийн үзлэг амжилттай бүртгэгдлээ!" });
    },
    onError: () => toast({ title: "Алдаа гарлаа", variant: "destructive" }),
  });

  function reset() {
    setStep("plate");
    setPlate("");
    setVehicle(null);
    setPlateError("");
    setEmployeeName("");
    setChecks({});
    setNotes("");
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col">
      {/* Header */}
      <div className="bg-slate-900/80 border-b border-white/10 px-5 py-4 text-center">
        <div className="flex items-center justify-center gap-3 mb-1">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
            <Truck className="w-4 h-4 text-black" />
          </div>
          <h1 className="font-black text-lg tracking-widest text-white uppercase">Техникийн Үзлэг</h1>
        </div>
        <p className="text-xs text-slate-500">Ашиглалтын өмнөх хяналт шалгалт</p>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full p-4">

        {/* ── АЛХАМ 1: Улсын дугаар ── */}
        {step === "plate" && (
          <div className="mt-6">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
                <div>
                  <p className="text-amber-400 font-bold text-sm">ХАБЭА шаардлага</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Техник ашиглахаас өмнө заавал үзлэг хийж бүртгүүлнэ
                  </p>
                </div>
              </div>
            </div>

            <label className="text-sm text-slate-400 mb-2 block font-medium">Техникийн улсын дугаар</label>
            <div className="flex gap-2 mb-2">
              <input
                value={plate}
                onChange={e => { setPlate(e.target.value.toUpperCase()); setPlateError(""); }}
                onKeyDown={e => e.key === "Enter" && lookupVehicle()}
                placeholder="0348 УНА"
                maxLength={10}
                data-testid="input-plate-number"
                className="flex-1 bg-slate-800/70 border border-white/10 rounded-xl px-4 py-4 text-white text-xl font-black text-center tracking-widest outline-none focus:border-amber-500/50 uppercase"
              />
            </div>
            {plateError && (
              <div className="flex items-center gap-2 text-red-400 text-sm mb-3">
                <AlertTriangle className="w-4 h-4" /> {plateError}
              </div>
            )}
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

        {/* ── АЛХАМ 2: Ажилтны нэр ── */}
        {step === "employee" && vehicle && (
          <div className="mt-4">
            <button onClick={() => setStep("plate")} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-4 transition-all">
              <ChevronRight className="w-4 h-4 rotate-180" /> Буцах
            </button>

            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/15 rounded-xl">
                  <Truck className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-white font-bold">{vehicle.name}</p>
                  <p className="text-xs text-slate-400">{vehicle.type} · {vehicle.plateNumber}</p>
                </div>
              </div>
            </div>

            <label className="text-sm text-slate-400 mb-2 block font-medium">Үзлэг хийж буй хүний нэр</label>
            <input
              value={employeeName}
              onChange={e => setEmployeeName(e.target.value)}
              placeholder="Бүтэн нэрээ оруулна уу"
              data-testid="input-inspector-name"
              className="w-full bg-slate-800/70 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500/50 mb-4"
            />
            <button
              onClick={() => setStep("checklist")}
              disabled={!employeeName.trim()}
              data-testid="button-start-inspection"
              className="w-full py-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              <ChevronRight className="w-4 h-4" /> Үзлэг эхлэх
            </button>
          </div>
        )}

        {/* ── АЛХАМ 3: Шалгах хуудас ── */}
        {step === "checklist" && vehicle && (
          <div className="mt-4">
            <button onClick={() => setStep("employee")} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-3 transition-all">
              <ChevronRight className="w-4 h-4 rotate-180" /> Буцах
            </button>

            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-white">{vehicle.name}</h2>
              <span className="text-xs text-slate-500">{vehicle.plateNumber}</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">{employeeName} — Өмнөх үзлэг</p>

            <div className="space-y-2 mb-5">
              {INSPECTION_ITEMS.map(item => (
                <div key={item.key} className="bg-slate-800/40 border border-white/10 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.detail}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setChecks(p => ({ ...p, [item.key]: "ok" }))}
                      data-testid={`check-ok-${item.key}`}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all border ${
                        checks[item.key] === "ok"
                          ? "bg-green-500/20 border-green-500/40 text-green-400"
                          : "bg-slate-700/50 border-white/10 text-slate-400 hover:border-green-500/30"
                      }`}
                    >
                      {checks[item.key] === "ok" ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                      Сайн
                    </button>
                    <button
                      onClick={() => setChecks(p => ({ ...p, [item.key]: "warn" }))}
                      data-testid={`check-warn-${item.key}`}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all border ${
                        checks[item.key] === "warn"
                          ? "bg-red-500/20 border-red-500/40 text-red-400"
                          : "bg-slate-700/50 border-white/10 text-slate-400 hover:border-red-500/30"
                      }`}
                    >
                      {checks[item.key] === "warn" ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                      Асуудалтай
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {hasWarning && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl mb-3">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
                <p className="text-xs text-red-300">Асуудалтай зүйл байна — тэмдэглэлд оруулж, хариуцсан техничдэд мэдэгдэнэ үү</p>
              </div>
            )}

            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Нэмэлт тайлбар, тэмдэглэл..."
              rows={2}
              className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500/50 resize-none mb-4"
            />

            {!allChecked && (
              <p className="text-center text-xs text-slate-500 mb-3">Бүх зүйлийг шалгасны дараа илгээх боломжтой</p>
            )}

            <button
              onClick={() => submit.mutate()}
              disabled={!allChecked || submit.isPending}
              data-testid="button-submit-inspection"
              className={`w-full py-4 font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 ${
                hasWarning
                  ? "bg-red-600 hover:bg-red-500"
                  : "bg-green-600 hover:bg-green-500"
              }`}
            >
              {submit.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Илгээж байна...</>
                : hasWarning
                  ? <><AlertTriangle className="w-4 h-4" /> Асуудалтай — Илгээх</>
                  : <><CheckCircle2 className="w-4 h-4" /> Үзлэг амжилттай — Илгээх</>}
            </button>
          </div>
        )}

        {/* ── ДУУССАН ── */}
        {step === "done" && (
          <div className="mt-16 text-center">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5 ${hasWarning ? "bg-red-500/20" : "bg-green-500/20"}`}>
              {hasWarning
                ? <AlertTriangle className="w-10 h-10 text-red-400" />
                : <CheckCircle2 className="w-10 h-10 text-green-400" />}
            </div>
            <h2 className="text-xl font-black text-white mb-2">Үзлэг бүртгэгдлээ</h2>
            <p className="text-slate-400 text-sm mb-1">{vehicle?.name} · {vehicle?.plateNumber}</p>
            <p className="text-slate-500 text-xs mb-2">{employeeName}</p>
            {hasWarning ? (
              <p className="text-red-400 text-sm font-medium mb-6">Асуудалтай байдал бүртгэгдсэн — хариуцсан техничид мэдэгдэнэ</p>
            ) : (
              <p className="text-green-400 text-sm font-medium mb-6">Бүх шалгалт амжилттай — техник ашиглахад бэлэн</p>
            )}
            <button
              onClick={reset}
              className="flex items-center gap-2 mx-auto px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-bold transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Дахин үзлэг хийх
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
