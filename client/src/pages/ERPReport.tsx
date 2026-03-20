import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, CheckCircle2, Loader2, Building2, HardHat, Factory,
  ArrowLeft, QrCode, TrendingUp, Award, ShieldCheck, Clock, LogOut,
  AlertTriangle, CheckSquare, Square, ChevronRight
} from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

// ── Хэлтсийн тохиргоо ────────────────────────────────────────
const DEPT_CONFIG = {
  office: {
    label: "Оффис",
    icon: Building2,
    colorClass: "text-blue-400",
    bgClass: "bg-blue-600/15",
    borderClass: "border-blue-500/30",
    btnClass: "bg-blue-600 hover:bg-blue-500",
    workTypes: ["Зураг төсөл боловсруулах", "Тооцоо тооцоолол", "Тендер бэлтгэл", "Гэрээ боловсруулах", "Тайлан бичих", "Хурал зохион байгуулах"],
    units: ["хуудас", "тайлан", "гэрээ", "танилцуулга"],
    safetyItems: [
      "Компьютер, тоног төхөөрөмжийн аюулгүй ажиллагааны горимтой танилцлаа",
      "Гал унтраах хэрэгслийн байршлыг мэдэж байна",
      "Яаралтай гарцын байршлыг мэдэж байна",
      "Ажлын байрны эрүүл ахуйн шаардлага хангагдсан",
      "Цахилгааны аюулгүй ажиллагааны журмыг мөрдөнө",
    ],
  },
  field: {
    label: "Талбай",
    icon: HardHat,
    colorClass: "text-amber-400",
    bgClass: "bg-amber-600/15",
    borderClass: "border-amber-500/30",
    btnClass: "bg-amber-600 hover:bg-amber-500",
    workTypes: ["Хөрс хуулах", "Чулуун материал тавих", "Асфальт хучих", "Гүүрийн бетон", "Хайрга тавих", "Шороон дам нуруу", "Ус зайлуулах"],
    units: ["м³", "м²", "м", "тн"],
    safetyItems: [
      "Хувийн хамгаалалтын хэрэгсэл (дуулга, жилэт, гутал) өмссөн",
      "Ажлын талбайн аюулгүй бүсийг тодорхойлсон",
      "Механизм, техникийн аюулгүй ажиллагааг шалгасан",
      "Цаг агаарын нөхцөл, аюулын тухай мэдлэгтэй",
      "Гэмтэл, осол гарвал мэдэгдэх дарааллыг мэднэ",
      "Тэсрэх, дэлбэрэх бодисын аюулгүй ажиллагааны журмыг мэдэж байна",
    ],
  },
  plant: {
    label: "Үйлдвэр",
    icon: Factory,
    colorClass: "text-green-400",
    bgClass: "bg-green-600/15",
    borderClass: "border-green-500/30",
    btnClass: "bg-green-600 hover:bg-green-500",
    workTypes: ["Бетон зуурмаг үйлдвэрлэх", "Асфальт хольц үйлдвэрлэх", "Бутлан ангилах", "Элс угаах", "Цемент хольц бэлтгэх"],
    units: ["м³", "тн"],
    safetyItems: [
      "Үйлдвэрийн хувийн хамгаалалтын хэрэгсэл бэлэн байна",
      "Тоног төхөөрөмжийн ажиллагааны горимыг шалгасан",
      "Химийн бодис, тоос шороонд өртөхгүй байх арга хэмжээ авсан",
      "Ачаа зөөх механизмын аюулгүй ажиллагааг шалгасан",
      "Ажлын байрны агааржуулалт хангалттай",
      "Гал унтраах хэрэгсэл бэлэн, хүртээмжтэй байна",
    ],
  },
};

type Dept = keyof typeof DEPT_CONFIG;
type Step = "qr" | "safety" | "checkin" | "report" | "done";

const StepIndicator = ({ current, dept }: { current: Step; dept: Dept }) => {
  const steps: { key: Step; label: string }[] = [
    { key: "qr", label: "QR" },
    { key: "safety", label: "ХАБЭА" },
    { key: "checkin", label: "Ирсэн" },
    { key: "report", label: "Тайлан" },
    { key: "done", label: "Дууссан" },
  ];
  const idx = steps.findIndex(s => s.key === current);
  const cfg = DEPT_CONFIG[dept];
  return (
    <div className="flex items-center gap-1 justify-center mb-6">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1">
          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
            i < idx ? "bg-green-500 text-white" : i === idx ? `${cfg.bgClass} border ${cfg.borderClass} ${cfg.colorClass}` : "bg-white/5 text-slate-600"
          }`}>
            {i < idx ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
          </div>
          {i < steps.length - 1 && <div className={`w-6 h-px ${i < idx ? "bg-green-500" : "bg-white/10"}`} />}
        </div>
      ))}
    </div>
  );
};

export default function ERPReport() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const dept = (params.get("dept") ?? "field") as Dept;
  const config = DEPT_CONFIG[dept] ?? DEPT_CONFIG.field;
  const Icon = config.icon;

  // Ажилтны мэдээлэл
  const [employee, setEmployee] = useState<any>(null);
  const [qrInput, setQrInput] = useState(params.get("qr") ?? "");
  const [attendance, setAttendance] = useState<any>(null);

  // Алхмын удирдлага
  const [step, setStep] = useState<Step>("qr");

  // ХАБЭА
  const [safetyChecked, setSafetyChecked] = useState<boolean[]>(config.safetyItems.map(() => false));
  const allSafetyConfirmed = safetyChecked.every(Boolean);

  // Тайлан маягт
  const [form, setForm] = useState({
    projectId: "", plantId: "",
    workType: config.workTypes[0],
    quantity: "", unit: config.units[0],
    notes: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [submittedKpi, setSubmittedKpi] = useState<any>(null);

  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["/api/erp/projects"] });
  const { data: plants = [] } = useQuery<any[]>({ queryKey: ["/api/erp/plants"] });
  const { data: kpiConfigs = [] } = useQuery<any[]>({ queryKey: ["/api/erp/kpi-configs"] });
  const foundKpi = kpiConfigs.find((k: any) => k.workType === form.workType);

  // QR хайх
  const lookupQr = async () => {
    if (!qrInput.trim()) return;
    try {
      const res = await fetch(`/api/erp/employee-by-qr/${encodeURIComponent(qrInput.trim())}`);
      if (!res.ok) throw new Error();
      const emp = await res.json();
      setEmployee(emp);

      // Өнөөдрийн ирцийн бүртгэл шалгах
      const attRes = await fetch(`/api/erp/attendance/${emp.id}/today`);
      const att = await attRes.json();
      setAttendance(att);

      if (att && att.checkIn) {
        // Өмнө ирсэн бүртгэлтэй → шууд тайлан
        setStep("report");
      } else {
        // Шинэ → ХАБЭА зааварт
        setStep("safety");
      }
    } catch {
      toast({ title: "Ажилтан олдсонгүй", description: "QR код буруу байна", variant: "destructive" });
    }
  };

  // Check-in
  const checkIn = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/erp/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: employee.id, safetyConfirmed: allSafetyConfirmed }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setAttendance(data.attendance);
      setStep("report");
      toast({ title: `Ирсэн цаг бүртгэгдлээ: ${data.attendance?.checkIn}` });
    },
  });

  // Check-out
  const checkOut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/erp/attendance/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: employee.id }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setAttendance(data);
      toast({ title: `Явсан цаг бүртгэгдлээ: ${data.checkOut}` });
    },
  });

  // Тайлан илгээх
  const submitReport = useMutation({
    mutationFn: async () => {
      const body: any = {
        employeeId: employee.id,
        workType: form.workType,
        quantity: parseFloat(form.quantity),
        unit: form.unit,
        date: form.date,
        notes: form.notes || null,
      };
      if (dept === "field" && form.projectId) body.projectId = parseInt(form.projectId);
      if (dept === "plant" && form.plantId) body.plantId = parseInt(form.plantId);
      const res = await fetch("/api/erp/daily-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: (data) => {
      setSubmittedKpi(data.kpi);
      setStep("done");
    },
    onError: () => toast({ title: "Алдаа гарлаа", variant: "destructive" }),
  });

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Header */}
      <div className={`border-b border-white/10 ${config.bgClass} px-5 py-3`}>
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => { localStorage.removeItem("adminToken"); localStorage.removeItem("userRole"); setLocation("/select-role"); }} className="text-slate-400 hover:text-white transition-all">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${config.colorClass}`} />
            <span className="text-sm font-bold uppercase tracking-widest">{config.label}</span>
          </div>
          <div className="text-xs text-slate-500">{new Date().toLocaleDateString("mn-MN")}</div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-5">
        {/* Алхмын заагч */}
        {step !== "qr" && <StepIndicator current={step} dept={dept} />}

        <AnimatePresence mode="wait">

          {/* ── АЛХАМ 0: QR уншуулах ── */}
          {step === "qr" && (
            <motion.div key="qr" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-8 mt-4">
                <div className="flex flex-col items-center mb-8">
                  <div className="p-4 bg-slate-800/50 rounded-3xl mb-4 relative">
                    <QrCode className="w-14 h-14 text-slate-400" />
                    <div className="absolute inset-0 border-2 border-dashed border-slate-600/50 rounded-3xl animate-pulse" />
                  </div>
                  <h2 className="text-lg font-bold">QR код уншуулна уу</h2>
                  <p className="text-xs text-slate-400 mt-1 text-center">эсвэл ажилтны кодыг гараар оруулна уу</p>
                </div>
                <input
                  type="text"
                  value={qrInput}
                  onChange={e => setQrInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && lookupQr()}
                  placeholder="EMP-XXXXX-XXXXX"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-center tracking-widest outline-none focus:border-blue-500/50 mb-4 text-sm"
                  autoFocus
                />
                <button
                  onClick={lookupQr}
                  className={`w-full ${config.btnClass} text-white font-bold py-4 rounded-2xl transition-all`}
                >
                  Хайх
                </button>
              </div>
            </motion.div>
          )}

          {/* ── АЛХАМ 1: ХАБЭА зааврын жагсаалт ── */}
          {step === "safety" && (
            <motion.div key="safety" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              {/* Ажилтны мэдээлэл */}
              <div className={`mb-4 p-4 rounded-2xl border ${config.borderClass} ${config.bgClass} flex items-center gap-3`}>
                <Icon className={`w-5 h-5 ${config.colorClass}`} />
                <div>
                  <p className="font-bold text-sm">{employee?.name}</p>
                  <p className="text-xs text-slate-400">{config.label} — {employee?.role}</p>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-amber-500/20 rounded-3xl overflow-hidden">
                {/* ХАБЭА толгой */}
                <div className="bg-amber-600/10 border-b border-amber-500/20 px-5 py-4 flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="font-bold text-amber-300 text-sm">ХАБЭА — Аюулгүй ажиллагааны зааврын баталгаа</p>
                    <p className="text-xs text-slate-400">Бүх зүйлийг уншаад тэмдэглэнэ үү</p>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  {config.safetyItems.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => setSafetyChecked(prev => prev.map((v, j) => j === i ? !v : v))}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                        safetyChecked[i]
                          ? "bg-green-500/10 border-green-500/30"
                          : "bg-white/3 border-white/10 hover:bg-white/5"
                      }`}
                    >
                      {safetyChecked[i]
                        ? <CheckSquare className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        : <Square className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                      }
                      <span className={`text-sm ${safetyChecked[i] ? "text-green-300" : "text-slate-300"}`}>{item}</span>
                    </button>
                  ))}
                </div>

                {/* Урагш товч */}
                <div className="px-5 pb-5">
                  {!allSafetyConfirmed && (
                    <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-3 text-xs text-amber-400">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      Бүх заавартай танилцаж тэмдэглэсний дараа үргэлжлүүлнэ
                    </div>
                  )}
                  <button
                    onClick={() => setStep("checkin")}
                    disabled={!allSafetyConfirmed}
                    className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" /> Баталгаажуулж үргэлжлүүлэх
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── АЛХАМ 2: Ирсэн цаг бүртгэх ── */}
          {step === "checkin" && (
            <motion.div key="checkin" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-8 text-center">
                <div className="p-4 bg-green-600/15 rounded-3xl inline-block mb-5">
                  <Clock className="w-12 h-12 text-green-400" />
                </div>
                <h2 className="text-xl font-bold mb-1">Ирсэн цаг бүртгэх</h2>
                <p className="text-slate-400 text-sm mb-2">{employee?.name}</p>
                <p className="text-3xl font-mono font-bold text-green-400 mb-2">
                  {new Date().toTimeString().slice(0, 5)}
                </p>
                <p className="text-xs text-slate-500 mb-6">
                  {new Date().toLocaleDateString("mn-MN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>

                {/* ХАБЭА баталгаа харуулах */}
                <div className="mb-6 p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2 text-xs text-green-400">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                  ХАБЭА зааврыг баталгаажуулсан — {config.safetyItems.length} зүйл
                </div>

                <button
                  onClick={() => checkIn.mutate()}
                  disabled={checkIn.isPending}
                  className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  {checkIn.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                  Ирсэн цаг бүртгэх
                </button>
              </div>
            </motion.div>
          )}

          {/* ── АЛХАМ 3: Ажлын тайлан ── */}
          {step === "report" && (
            <motion.div key="report" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              {/* Ирц мэдээлэл */}
              {attendance && (
                <div className="mb-4 p-3 bg-slate-800/50 border border-white/5 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-4 h-4 text-green-400" />
                    <span>Ирсэн: <strong className="text-green-400">{attendance.checkIn}</strong></span>
                    {attendance.checkOut && <span className="ml-2">Явсан: <strong className="text-blue-400">{attendance.checkOut}</strong></span>}
                  </div>
                  {!attendance.checkOut && (
                    <button
                      onClick={() => checkOut.mutate()}
                      disabled={checkOut.isPending}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg transition-all"
                    >
                      <LogOut className="w-3 h-3" /> Явсан
                    </button>
                  )}
                </div>
              )}

              {/* KPI норм */}
              {foundKpi && (
                <div className="mb-4 p-3 bg-slate-800/40 rounded-xl border border-white/5 flex items-center gap-3">
                  <TrendingUp className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <p className="text-xs text-slate-400">
                    Норм: <span className="text-white font-bold">{foundKpi.dailyNorm} {foundKpi.unit}/өдөр</span>
                    {foundKpi.rewardPerUnit > 0 && (
                      <span className="text-amber-400 ml-2">+{foundKpi.rewardPerUnit.toLocaleString()}₮/{foundKpi.unit}</span>
                    )}
                  </p>
                </div>
              )}

              {/* Тайлангийн маягт */}
              <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-5 space-y-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-widest mb-2 block">Огноо</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-widest mb-2 block">Ажлын төрөл</label>
                  <select value={form.workType} onChange={e => setForm(f => ({ ...f, workType: e.target.value }))}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white outline-none text-sm">
                    {config.workTypes.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                {dept === "field" && (
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest mb-2 block">Төсөл</label>
                    <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white outline-none text-sm">
                      <option value="">— Сонгох —</option>
                      {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}
                {dept === "plant" && (
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest mb-2 block">Үйлдвэр</label>
                    <select value={form.plantId} onChange={e => setForm(f => ({ ...f, plantId: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white outline-none text-sm">
                      <option value="">— Сонгох —</option>
                      {plants.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest mb-2 block">Тоо хэмжээ</label>
                    <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                      placeholder="0"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest mb-2 block">Нэгж</label>
                    <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white outline-none text-sm">
                      {config.units.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-widest mb-2 block">Тайлбар (заавал биш)</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2} placeholder="Ажлын тайлбар..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none resize-none focus:border-blue-500/50 text-sm" />
                </div>
                <button
                  onClick={() => submitReport.mutate()}
                  disabled={submitReport.isPending || !form.quantity}
                  className={`w-full ${config.btnClass} disabled:opacity-40 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2`}
                >
                  {submitReport.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Илгээж байна...</> : <><ClipboardList className="w-4 h-4" /> Тайлан илгээх</>}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── АЛХАМ 4: Дуусгавар / KPI үр дүн ── */}
          {step === "done" && (
            <motion.div key="done" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-4">
              <div className="bg-slate-900/80 border border-green-500/30 rounded-3xl p-8 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-1">Тайлан илгээгдлээ!</h2>
                <p className="text-slate-400 text-sm mb-6">{employee?.name}</p>

                {submittedKpi && (
                  <div className="bg-slate-800/60 rounded-2xl p-5 mb-5 text-left space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Гүйцэтгэл</span>
                      <span className="font-bold">{submittedKpi.quantity} {submittedKpi.unit}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">БНбД Норм</span>
                      <span>{submittedKpi.dailyNorm} {submittedKpi.unit}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">Гүйцэтгэлийн хувь</span>
                      <span className={`font-black text-2xl ${submittedKpi.achievement >= 100 ? "text-green-400" : "text-red-400"}`}>
                        {submittedKpi.achievement}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${submittedKpi.achievement >= 100 ? "bg-green-500" : "bg-amber-500"}`}
                        style={{ width: `${Math.min(submittedKpi.achievement, 100)}%` }} />
                    </div>
                    {submittedKpi.bonus > 0 && (
                      <div className="flex justify-between border-t border-white/10 pt-3">
                        <span className="text-amber-400 flex items-center gap-1"><Award className="w-4 h-4" /> Урамшуулал</span>
                        <span className="text-amber-400 font-black text-lg">+{submittedKpi.bonus.toLocaleString()}₮</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Ирсэн цаг</span>
                      <span className="text-green-400 font-bold">{attendance?.checkIn ?? "—"}</span>
                    </div>
                  </div>
                )}

                {/* Явсан цаг */}
                {attendance && !attendance.checkOut && (
                  <button
                    onClick={() => checkOut.mutate()}
                    disabled={checkOut.isPending}
                    className="w-full mb-3 flex items-center justify-center gap-2 py-3 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 rounded-2xl text-sm font-bold transition-all"
                  >
                    <LogOut className="w-4 h-4" /> Явсан цаг бүртгэх
                  </button>
                )}
                {attendance?.checkOut && (
                  <div className="mb-3 py-3 bg-blue-600/10 border border-blue-500/20 rounded-2xl text-blue-400 text-sm font-bold flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4" /> Явсан: {attendance.checkOut}
                  </div>
                )}

                <button
                  onClick={() => { setStep("qr"); setQrInput(""); setEmployee(null); setAttendance(null); setSubmittedKpi(null); setSafetyChecked(config.safetyItems.map(() => false)); setForm(f => ({ ...f, quantity: "", notes: "" })); }}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-2xl transition-all text-sm"
                >
                  Дараагийн ажилтан
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
