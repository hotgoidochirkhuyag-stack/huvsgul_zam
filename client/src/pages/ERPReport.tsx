import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, CheckCircle2, Loader2, Building2, HardHat, Factory, ArrowLeft, QrCode, TrendingUp, Award } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const DEPT_CONFIG = {
  office: {
    label: "Оффис",
    icon: Building2,
    color: "blue",
    colorClass: "text-blue-400",
    bgClass: "bg-blue-600/20",
    borderClass: "border-blue-500/30",
    workTypes: ["Зураг төсөл боловсруулах", "Тооцоо тооцоолол", "Тендер бэлтгэл", "Гэрээ боловсруулах", "Тайлан бичих", "Хурал зохион байгуулах"],
    units: ["хуудас", "тайлан", "гэрээ", "танилцуулга"],
  },
  field: {
    label: "Талбай",
    icon: HardHat,
    color: "amber",
    colorClass: "text-amber-400",
    bgClass: "bg-amber-600/20",
    borderClass: "border-amber-500/30",
    workTypes: ["Хөрс хуулах", "Чулуун материал тавих", "Асфальт хучих", "Гүүрийн бетон", "Хайрга тавих", "Шороон дам нуруу", "Ус зайлуулах"],
    units: ["м³", "м²", "м", "тн"],
  },
  plant: {
    label: "Үйлдвэр",
    icon: Factory,
    color: "green",
    colorClass: "text-green-400",
    bgClass: "bg-green-600/20",
    borderClass: "border-green-500/30",
    workTypes: ["Бетон зуурмаг үйлдвэрлэх", "Асфальт хольц үйлдвэрлэх", "Бутлан ангилах", "Элс угаах", "Цемент хольц бэлтгэх"],
    units: ["м³", "тн"],
  },
};

type Dept = keyof typeof DEPT_CONFIG;

export default function ERPReport() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const dept = (params.get("dept") ?? "field") as Dept;
  const qrParam = params.get("qr");

  const config = DEPT_CONFIG[dept] ?? DEPT_CONFIG.field;
  const Icon = config.icon;

  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [employeeName, setEmployeeName] = useState("");
  const [qrInput, setQrInput] = useState(qrParam ?? "");
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState<any>(null);

  const [form, setForm] = useState({
    projectId: "",
    plantId: "",
    workType: config.workTypes[0],
    quantity: "",
    unit: config.units[0],
    notes: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["/api/erp/projects"] });
  const { data: plants = [] } = useQuery<any[]>({ queryKey: ["/api/erp/plants"] });
  const { data: kpiConfigs = [] } = useQuery<any[]>({ queryKey: ["/api/erp/kpi-configs"] });

  const foundKpi = kpiConfigs.find((k: any) => k.workType === form.workType);

  const lookupQr = async () => {
    if (!qrInput.trim()) return;
    try {
      const res = await fetch(`/api/erp/employee-by-qr/${encodeURIComponent(qrInput.trim())}`);
      if (!res.ok) throw new Error("Олдсонгүй");
      const emp = await res.json();
      setEmployeeId(emp.id);
      setEmployeeName(emp.name);
      setShowForm(true);
    } catch {
      toast({ title: "Ажилтан олдсонгүй", description: "QR код буруу байна", variant: "destructive" });
    }
  };

  const submitReport = useMutation({
    mutationFn: async () => {
      const body: any = {
        employeeId,
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
      if (!res.ok) throw new Error("Хадгалахад алдаа гарлаа");
      return res.json();
    },
    onSuccess: (data) => {
      setSubmitted(data);
      toast({ title: "Тайлан амжилттай илгээгдлээ!" });
    },
    onError: () => toast({ title: "Алдаа гарлаа", variant: "destructive" }),
  });

  if (submitted) {
    const kpi = submitted.kpi;
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md text-center">
          <div className="bg-slate-900/80 border border-green-500/30 rounded-3xl p-8">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Тайлан илгээгдлээ!</h2>
            <p className="text-slate-400 mb-6">{employeeName}</p>

            {kpi && (
              <div className="bg-slate-800/50 rounded-2xl p-5 mb-6 text-left space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Гүйцэтгэл</span>
                  <span className="text-white font-bold">{kpi.quantity} {kpi.unit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Норм</span>
                  <span className="text-white">{kpi.dailyNorm} {kpi.unit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Хувь</span>
                  <span className={`font-bold text-lg ${kpi.achievement >= 100 ? "text-green-400" : "text-red-400"}`}>
                    {kpi.achievement}%
                  </span>
                </div>
                {kpi.bonus > 0 && (
                  <div className="flex justify-between text-sm border-t border-white/10 pt-3">
                    <span className="text-amber-400 flex items-center gap-1"><Award className="w-4 h-4" /> Урамшуулал</span>
                    <span className="text-amber-400 font-bold">+{kpi.bonus.toLocaleString()}₮</span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => { setSubmitted(null); setShowForm(false); setQrInput(""); setForm(f => ({ ...f, quantity: "", notes: "" })); }}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-2xl transition-all"
            >
              Дараагийн тайлан
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Header */}
      <div className={`border-b border-white/10 ${config.bgClass} px-6 py-4`}>
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => setLocation("/select-role")} className="text-slate-400 hover:text-white transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${config.bgClass} border ${config.borderClass}`}>
              <Icon className={`w-5 h-5 ${config.colorClass}`} />
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-widest text-white">{config.label} — Өдрийн тайлан</h1>
              <p className="text-xs text-slate-500">Хөвсгөл Зам ХХК</p>
            </div>
          </div>
          <div />
        </div>
      </div>

      <div className="max-w-lg mx-auto p-6">
        {/* QR / Ажилтан хайлт */}
        <AnimatePresence mode="wait">
          {!showForm ? (
            <motion.div key="qr" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-8 mt-6">
                <div className="flex flex-col items-center mb-8">
                  <div className="p-4 bg-slate-800/50 rounded-3xl mb-4">
                    <QrCode className="w-12 h-12 text-slate-400" />
                  </div>
                  <h2 className="text-lg font-bold text-white">QR код уншуулна уу</h2>
                  <p className="text-sm text-slate-400 mt-1">эсвэл кодоо гараар оруулна уу</p>
                </div>
                <input
                  type="text"
                  value={qrInput}
                  onChange={e => setQrInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && lookupQr()}
                  placeholder="EMP-XXXXX-XXXXX"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-center tracking-widest outline-none focus:border-blue-500/50 mb-4"
                  autoFocus
                />
                <button
                  onClick={lookupQr}
                  className={`w-full bg-${config.color}-600 hover:bg-${config.color}-500 text-white font-bold py-4 rounded-2xl transition-all`}
                >
                  Хайх
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              {/* Ажилтны мэдээлэл */}
              <div className={`mt-6 mb-4 p-4 rounded-2xl border ${config.borderClass} ${config.bgClass} flex items-center gap-3`}>
                <Icon className={`w-6 h-6 ${config.colorClass}`} />
                <div>
                  <p className="font-bold text-white">{employeeName}</p>
                  <p className="text-xs text-slate-400">{config.label} ажилтан</p>
                </div>
              </div>

              {/* Хэрэгтэй KPI норм мэдээлэл */}
              {foundKpi && (
                <div className="mb-4 p-3 bg-slate-800/50 rounded-xl border border-white/5 flex items-center gap-3">
                  <TrendingUp className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <p className="text-xs text-slate-400">
                    Норм: <span className="text-white font-bold">{foundKpi.dailyNorm} {foundKpi.unit}</span> /өдөр
                    {foundKpi.rewardPerUnit > 0 && <span className="text-amber-400 ml-2">+{foundKpi.rewardPerUnit.toLocaleString()}₮/{foundKpi.unit}</span>}
                  </p>
                </div>
              )}

              {/* Тайлангийн маягт */}
              <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 space-y-5">

                {/* Огноо */}
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-widest mb-2 block">Огноо</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50" />
                </div>

                {/* Ажлын төрөл */}
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-widest mb-2 block">Ажлын төрөл</label>
                  <select value={form.workType} onChange={e => setForm(f => ({ ...f, workType: e.target.value }))}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                    {config.workTypes.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>

                {/* Талбайн ажилд — Төсөл */}
                {dept === "field" && (
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest mb-2 block">Төсөл</label>
                    <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                      <option value="">— Сонгох —</option>
                      {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}

                {/* Үйлдвэрийн ажилд — Үйлдвэр */}
                {dept === "plant" && (
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest mb-2 block">Үйлдвэр</label>
                    <select value={form.plantId} onChange={e => setForm(f => ({ ...f, plantId: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                      <option value="">— Сонгох —</option>
                      {plants.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}

                {/* Тоо хэмжээ + нэгж */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest mb-2 block">Тоо хэмжээ</label>
                    <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                      placeholder="0"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest mb-2 block">Нэгж</label>
                    <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                      {config.units.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                {/* Тайлбар */}
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-widest mb-2 block">Тайлбар (заавал биш)</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2} placeholder="Ажлын тайлбар..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none resize-none focus:border-blue-500/50" />
                </div>

                <button
                  onClick={() => submitReport.mutate()}
                  disabled={submitReport.isPending || !form.quantity}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  {submitReport.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Илгээж байна...</> : <>
                    <ClipboardList className="w-4 h-4" /> Тайлан илгээх
                  </>}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
