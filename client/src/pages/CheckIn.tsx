import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, ShieldCheck, ClipboardList, CheckSquare, Square,
  ChevronRight, Clock, MapPin, Wrench, AlertTriangle,
  CheckCircle2, Loader2, Building2, HardHat, Factory, FileText, Plus, Truck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Хэлтсийн ХАБЭА зүйлс ─────────────────────────────────
const SAFETY_ITEMS: Record<string, string[]> = {
  office: [
    "Компьютер, тоног төхөөрөмжийн аюулгүй ажиллагааны горимтой танилцлаа",
    "Гал унтраах хэрэгслийн байршлыг мэдэж байна",
    "Яаралтай гарцын байршлыг мэдэж байна",
    "Ажлын байрны эрүүл ахуйн шаардлага хангагдсан",
    "Цахилгааны аюулгүй ажиллагааны журмыг мөрдөнө",
  ],
  field: [
    "Хувийн хамгаалалтын хэрэгсэл (дуулга, жилэт, гутал) өмссөн",
    "Ажлын талбайн аюулгүй бүсийг тодорхойлсон",
    "Механизм, техникийн аюулгүй ажиллагааг шалгасан",
    "Цаг агаарын нөхцөл, аюулын тухай мэдлэгтэй",
    "Гэмтэл, осол гарвал мэдэгдэх дарааллыг мэднэ",
    "Тэсрэх, дэлбэрэх бодисын аюулгүй ажиллагааны журмыг мэдэж байна",
  ],
  plant: [
    "Үйлдвэрийн хувийн хамгаалалтын хэрэгсэл бэлэн байна",
    "Тоног төхөөрөмжийн ажиллагааны горимыг шалгасан",
    "Дуу чимээний хамгаалалт хийгдсэн",
    "Химийн бодисын аюулгүй ажиллагааны журмыг мэдэж байна",
    "Гал түймрийн аюулгүй ажиллагааны журмыг мэдэж байна",
    "Яаралтай зогсоолтын товчлуурын байршлыг мэдэж байна",
  ],
};

const DEPT_INFO: Record<string, { label: string; icon: any; color: string; border: string }> = {
  office: { label: "Оффис",   icon: Building2, color: "text-blue-400",  border: "border-blue-500/30" },
  field:  { label: "Талбай",  icon: HardHat,  color: "text-amber-400", border: "border-amber-500/30" },
  plant:  { label: "Үйлдвэр", icon: Factory,  color: "text-green-400", border: "border-green-500/30" },
};

const TASK_STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Хүлээгдэж байна", cls: "bg-amber-500/10 text-amber-400" },
  accepted:  { label: "Хүлээн авсан",    cls: "bg-blue-500/10 text-blue-400" },
  completed: { label: "Дуусгасан",        cls: "bg-green-500/10 text-green-400" },
};

type Step = "select" | "safety" | "tasks" | "report";

export default function CheckIn() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [step, setStep] = useState<Step>("select");
  const [search, setSearch] = useState("");
  const [employee, setEmployee] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [report, setReport] = useState({ description: "", quantity: "", unit: "", issues: "" });

  const { data: _checkEmpRaw } = useQuery<any>({
    queryKey: ["/api/checkin/employees"],
    queryFn: () => fetch("/api/checkin/employees").then(r => r.json()),
  });
  const employees: any[] = Array.isArray(_checkEmpRaw) ? _checkEmpRaw : [];

  const { data: _checkTasksRaw, refetch: refetchTasks } = useQuery<any>({
    queryKey: ["/api/checkin/tasks", employee?.id],
    queryFn: () => fetch(`/api/checkin/${employee.id}/tasks`).then(r => r.json()),
    enabled: !!employee && step === "tasks",
  });
  const tasks: any[] = Array.isArray(_checkTasksRaw) ? _checkTasksRaw : [];

  const filtered = useMemo(() =>
    employees.filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase())),
    [employees, search]
  );

  const safetyItems = employee ? (SAFETY_ITEMS[employee.department] ?? SAFETY_ITEMS.field) : [];
  const allChecked = safetyItems.every((_, i) => checkedItems[i]);

  // Ажилтан сонгох
  async function selectEmployee(emp: any) {
    setEmployee(emp);
    // Өнөөдөр ирц байгаа эсэхийг шалгах (тайлангийн хуудас руу шилжих)
    const today = new Date().toISOString().slice(0, 10);
    try {
      const res = await fetch(`/api/erp/attendance/${emp.id}/today`);
      const att = await res.json();
      if (att && att.date === today) {
        setAttendance(att);
        setStep("tasks");
        return;
      }
    } catch {}
    setStep("safety");
  }

  // ХАБЭА илгээх
  const submitSafety = useMutation({
    mutationFn: () => fetch("/api/checkin/safety", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: employee.id }),
    }).then(r => r.json()),
    onSuccess: (data) => {
      setAttendance(data.attendance);
      toast({ title: `${employee.name} — ХАБЭА баталгаажлаа. Ирсэн цаг: ${data.attendance.checkIn}` });
      setStep("tasks");
      qc.invalidateQueries({ queryKey: ["/api/checkin/tasks", employee.id] });
    },
  });

  // Даалгавар хүлээн авах
  const acceptTask = useMutation({
    mutationFn: (taskId: number) => fetch(`/api/checkin/tasks/${taskId}/accept`, { method: "PATCH" }).then(r => r.json()),
    onSuccess: () => { refetchTasks(); toast({ title: "Даалгавар хүлээн авлаа — ажил эхэллээ!" }); },
  });

  // Тайлан илгээх
  const submitReport = useMutation({
    mutationFn: () => fetch("/api/checkin/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: employee.id, taskId: activeTaskId, ...report }),
    }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Ажлын тайлан илгээгдлээ!" });
      setReport({ description: "", quantity: "", unit: "", issues: "" });
      setActiveTaskId(null);
      setStep("tasks");
      refetchTasks();
    },
  });

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col">
      {/* Header */}
      <div className="bg-slate-900/80 border-b border-white/10 px-5 py-4 text-center">
        <div className="flex items-center justify-center gap-3 mb-1">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
            <span className="text-black font-black text-xs">ХЗ</span>
          </div>
          <h1 className="font-black text-lg tracking-widest text-white uppercase">Хөвсгөл Зам ХХК</h1>
        </div>
        <p className="text-xs text-slate-500">Өдрийн бүртгэл — ХАБЭА · Даалгавар · Тайлан</p>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full p-4">

        {/* ── АЛХАМ 1: Ажилтан сонгох ── */}
        {step === "select" && (
          <div>
            <h2 className="text-center text-base font-bold text-slate-300 mt-4 mb-3">Өөрийн нэрийг хайж олно уу</h2>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Нэрээр хайх..."
                className="w-full bg-slate-800/70 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white text-sm outline-none focus:border-amber-500/50"
                data-testid="input-search-employee"
              />
            </div>
            <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
              {filtered.length === 0 && (
                <div className="text-center py-12 text-slate-500">Ажилтан олдсонгүй</div>
              )}
              {filtered.map((emp: any) => {
                const dept = DEPT_INFO[emp.department] ?? DEPT_INFO.field;
                const Icon = dept.icon;
                return (
                  <button
                    key={emp.id}
                    onClick={() => selectEmployee(emp)}
                    data-testid={`button-select-employee-${emp.id}`}
                    className={`w-full flex items-center gap-3 p-4 bg-slate-800/50 hover:bg-slate-700/60 border ${dept.border} rounded-xl transition-all text-left`}
                  >
                    <div className="p-2 bg-white/5 rounded-lg">
                      <Icon className={`w-5 h-5 ${dept.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">{emp.name}</p>
                      <p className="text-xs text-slate-400">{emp.role} · {dept.label}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── АЛХАМ 2: ХАБЭА форм ── */}
        {step === "safety" && employee && (
          <div className="mt-4">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setStep("select")} className="p-2 hover:bg-white/5 rounded-lg transition-all">
                <ChevronRight className="w-4 h-4 text-slate-400 rotate-180" />
              </button>
              <div>
                <h2 className="font-black text-base text-white">{employee.name}</h2>
                <p className="text-xs text-slate-400">{employee.role}</p>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 font-bold text-sm">ХАБЭА Зааварчлагаа</span>
              </div>
              <p className="text-xs text-slate-400">Доорх бүх зүйлтэй танилцаж, тус бүрийг тэмдэглэнэ үү</p>
            </div>

            <div className="space-y-2 mb-5">
              {safetyItems.map((item, i) => (
                <button
                  key={i}
                  onClick={() => setCheckedItems(p => ({ ...p, [i]: !p[i] }))}
                  data-testid={`checkbox-safety-${i}`}
                  className={`w-full flex items-start gap-3 p-3.5 rounded-xl border transition-all text-left ${
                    checkedItems[i]
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-slate-800/40 border-white/10 hover:bg-slate-700/50"
                  }`}
                >
                  {checkedItems[i]
                    ? <CheckSquare className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    : <Square className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" />}
                  <span className={`text-sm leading-snug ${checkedItems[i] ? "text-green-300" : "text-slate-300"}`}>{item}</span>
                </button>
              ))}
            </div>

            {!allChecked && (
              <p className="text-center text-xs text-slate-500 mb-3">
                Бүх зүйлийг тэмдэглэснийхээ дараа илгээх боломжтой
              </p>
            )}

            <button
              onClick={() => submitSafety.mutate()}
              disabled={!allChecked || submitSafety.isPending}
              data-testid="button-submit-safety"
              className="w-full py-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              {submitSafety.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Илгээж байна...</>
                : <><ShieldCheck className="w-4 h-4" /> ХАБЭА баталгаажуулж бүртгүүлэх</>}
            </button>
          </div>
        )}

        {/* ── АЛХАМ 3: Даалгавар + Тайлан ── */}
        {step === "tasks" && employee && (
          <div className="mt-4">
            <div className="flex items-center gap-3 mb-1">
              <button onClick={() => { setEmployee(null); setStep("select"); setSearch(""); }}
                className="p-2 hover:bg-white/5 rounded-lg transition-all">
                <ChevronRight className="w-4 h-4 text-slate-400 rotate-180" />
              </button>
              <div className="flex-1">
                <h2 className="font-black text-base text-white">{employee.name}</h2>
                <p className="text-xs text-slate-400">{employee.role}</p>
              </div>
              {attendance && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-green-400 text-xs font-bold">{attendance.checkIn}</span>
                </div>
              )}
            </div>

            {attendance?.safetyConfirmed && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl mb-4 mt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400 text-xs font-medium">ХАБЭА баталгаажсан</span>
              </div>
            )}

            <h3 className="text-sm font-bold text-slate-300 mb-2">Өнөөдрийн даалгавар</h3>

            {tasks.length === 0 ? (
              <div className="bg-slate-800/40 border border-white/10 rounded-xl p-6 text-center mb-4">
                <ClipboardList className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Өнөөдөр даалгавар олдсонгүй</p>
                <p className="text-slate-600 text-xs mt-1">Ахлахаасаа лавлана уу</p>
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                {tasks.map((t: any) => {
                  const status = TASK_STATUS[t.status] ?? TASK_STATUS.pending;
                  return (
                    <div key={t.id} className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.cls}`}>{status.label}</span>
                          </div>
                          <p className="text-white font-semibold mt-1">{t.workType}</p>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs text-slate-400">
                        <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{t.location}</div>
                        {t.equipment && <div className="flex items-center gap-2"><Wrench className="w-3.5 h-3.5" />{t.equipment}</div>}
                        {t.notes && <div className="flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" />{t.notes}</div>}
                        {t.assignedBy && <div className="text-slate-500">Тавьсан: {t.assignedBy}</div>}
                      </div>
                      <div className="flex flex-col gap-2 mt-3">
                        <div className="flex gap-2">
                          {t.status === "pending" && (
                            <button
                              onClick={() => acceptTask.mutate(t.id)}
                              data-testid={`button-accept-task-${t.id}`}
                              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Хүлээн авах
                            </button>
                          )}
                          {(t.status === "accepted" || t.status === "completed") && (
                            <button
                              onClick={() => { setActiveTaskId(t.id); setStep("report"); }}
                              data-testid={`button-report-task-${t.id}`}
                              className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                            >
                              <FileText className="w-3.5 h-3.5" /> Тайлан оруулах
                            </button>
                          )}
                        </div>
                        {t.equipment && (
                          <a
                            href={`/vehicle-inspection?emp=${encodeURIComponent(employee.name)}`}
                            data-testid={`button-vehicle-inspection-${t.id}`}
                            className="w-full py-2 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                          >
                            <Truck className="w-3.5 h-3.5" /> Техникийн үзлэг хийх
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Даалгаваргүй ч тайлан оруулах боломж */}
            <button
              onClick={() => { setActiveTaskId(null); setStep("report"); }}
              data-testid="button-free-report"
              className="w-full py-3 border border-white/10 bg-slate-800/30 hover:bg-slate-700/50 rounded-xl text-sm text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Чөлөөт тайлан оруулах
            </button>
          </div>
        )}

        {/* ── АЛХАМ 4: Ажлын тайлан ── */}
        {step === "report" && employee && (
          <div className="mt-4">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setStep("tasks")} className="p-2 hover:bg-white/5 rounded-lg transition-all">
                <ChevronRight className="w-4 h-4 text-slate-400 rotate-180" />
              </button>
              <h2 className="font-black text-base text-white">Ажлын тайлан</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Хийсэн ажлын тайлбар *</label>
                <textarea
                  value={report.description}
                  onChange={e => setReport(p => ({ ...p, description: e.target.value }))}
                  placeholder="Өдрийн хийсэн ажлаа дэлгэрэнгүй бичнэ үү..."
                  rows={4}
                  data-testid="input-report-description"
                  className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500/50 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Биелсэн хэмжээ</label>
                  <input
                    value={report.quantity}
                    onChange={e => setReport(p => ({ ...p, quantity: e.target.value }))}
                    placeholder="150"
                    data-testid="input-report-quantity"
                    className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Нэгж</label>
                  <select
                    value={report.unit}
                    onChange={e => setReport(p => ({ ...p, unit: e.target.value }))}
                    data-testid="select-report-unit"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none"
                  >
                    <option value="">Сонгох</option>
                    {["м²", "м³", "м", "тн", "ш", "км", "хуудас", "тайлан"].map(u =>
                      <option key={u} value={u}>{u}</option>
                    )}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Бэрхшээл / Саад (заавал биш)</label>
                <textarea
                  value={report.issues}
                  onChange={e => setReport(p => ({ ...p, issues: e.target.value }))}
                  placeholder="Гарсан асуудал, саад бэрхшээлийг бичнэ үү..."
                  rows={2}
                  data-testid="input-report-issues"
                  className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500/50 resize-none"
                />
              </div>
            </div>

            <button
              onClick={() => submitReport.mutate()}
              disabled={!report.description || submitReport.isPending}
              data-testid="button-submit-report"
              className="w-full mt-5 py-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              {submitReport.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Илгээж байна...</>
                : <><FileText className="w-4 h-4" /> Тайлан илгээх</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
