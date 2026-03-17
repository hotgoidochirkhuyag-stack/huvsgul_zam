import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList, Plus, Trash2, LogOut, RefreshCw,
  MapPin, Wrench, Users, FileText, ChevronDown,
  CheckCircle2, Clock, AlertCircle, Calendar,
  Navigation, ScrollText, Edit2, Save, X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

function getHeaders() {
  return { "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") ?? "" };
}

const TASK_STATUS: Record<string, { label: string; cls: string; icon: any }> = {
  pending:   { label: "Хүлээгдэж байна", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",  icon: Clock },
  accepted:  { label: "Хүлээн авсан",    cls: "bg-blue-500/10 text-blue-400 border-blue-500/20",     icon: CheckCircle2 },
  completed: { label: "Дуусгасан",        cls: "bg-green-500/10 text-green-400 border-green-500/20", icon: CheckCircle2 },
};

const TODAY = new Date().toISOString().slice(0, 10);

export default function SupervisorDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const [tab, setTab] = useState<"tasks" | "reports" | "fronts" | "acts">("tasks");
  const [filterDate, setFilterDate] = useState(TODAY);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    date: TODAY,
    location: "",
    workType: "",
    equipment: "",
    notes: "",
    assignedBy: "",
  });

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["/api/erp/employees"],
    queryFn: () => fetch("/api/erp/employees", { headers: getHeaders() }).then(r => r.json()),
  });

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery<any[]>({
    queryKey: ["/api/erp/tasks", filterDate],
    queryFn: () => fetch(`/api/erp/tasks?date=${filterDate}`, { headers: getHeaders() }).then(r => r.json()),
    enabled: tab === "tasks",
  });

  const { data: reports = [], isLoading: reportsLoading, refetch: refetchReports } = useQuery<any[]>({
    queryKey: ["/api/erp/work-reports", filterDate],
    queryFn: () => fetch(`/api/erp/work-reports?date=${filterDate}`, { headers: getHeaders() }).then(r => r.json()),
    enabled: tab === "reports",
  });

  const empMap = new Map(employees.map((e: any) => [e.id, e]));

  // ── Ажлын фронтууд ───────────────────────────────────────────────────────
  const emptyFront = { name: "", chainageStart: "", chainageEnd: "", activity: "earthwork", status: "active", supervisor: "", crewSize: "", date: TODAY, progress: "", notes: "" };
  const [showFrontForm, setShowFrontForm] = useState(false);
  const [frontForm, setFrontForm] = useState(emptyFront);
  const [editingFront, setEditingFront] = useState<number | null>(null);
  const [editFrontData, setEditFrontData] = useState<any>({});

  const { data: workFronts = [], refetch: refetchFronts } = useQuery<any[]>({
    queryKey: ["/api/work-fronts"],
    queryFn: () => fetch("/api/work-fronts", { headers: getHeaders() }).then(r => r.json()),
    enabled: tab === "fronts",
  });

  const createFront = useMutation({
    mutationFn: (data: any) => fetch("/api/work-fronts", { method: "POST", headers: getHeaders(), body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/work-fronts"] }); setShowFrontForm(false); setFrontForm(emptyFront); toast({ title: "Ажлын фронт нэмэгдлээ ✓" }); },
    onError: () => toast({ title: "Алдаа гарлаа", variant: "destructive" }),
  });

  const updateFront = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => fetch(`/api/work-fronts/${id}`, { method: "PUT", headers: getHeaders(), body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/work-fronts"] }); setEditingFront(null); },
  });

  const deleteFront = useMutation({
    mutationFn: (id: number) => fetch(`/api/work-fronts/${id}`, { method: "DELETE", headers: getHeaders() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/work-fronts"] }),
  });

  const ACTIVITIES: Record<string, string> = {
    earthwork: "Шороон ажил", subbase: "Дэр давхарга", base: "Үндсэн давхарга",
    asphalt: "Асфальт тавих", concrete: "Бетон цутгах", structure: "Барилга бүтэц", drainage: "Ус зайлуулах",
  };
  const FRONT_STATUS: Record<string, { label: string; color: string }> = {
    active:    { label: "Идэвхтэй", color: "bg-green-500/15 text-green-400 border-green-500/30" },
    paused:    { label: "Зогссон",  color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    completed: { label: "Дууссан", color: "bg-blue-500/15 text-blue-400 border-blue-500/30"     },
  };

  // ── Далд ажлын актууд ──────────────────────────────────────────────────
  const emptyAct = { actNumber: "", date: TODAY, location: "", workType: "", description: "", inspector: "", contractor: "", status: "pending", notes: "" };
  const [showActForm, setShowActForm] = useState(false);
  const [actForm, setActForm] = useState(emptyAct);

  const { data: hiddenActs = [], refetch: refetchActs } = useQuery<any[]>({
    queryKey: ["/api/hidden-work-acts"],
    queryFn: () => fetch("/api/hidden-work-acts", { headers: getHeaders() }).then(r => r.json()),
    enabled: tab === "acts",
  });

  const createAct = useMutation({
    mutationFn: (data: any) => fetch("/api/hidden-work-acts", { method: "POST", headers: getHeaders(), body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/hidden-work-acts"] }); setShowActForm(false); setActForm(emptyAct); toast({ title: "Далд ажлын акт бүртгэгдлээ ✓" }); },
    onError: () => toast({ title: "Алдаа гарлаа", variant: "destructive" }),
  });

  const updateActStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => fetch(`/api/hidden-work-acts/${id}`, { method: "PUT", headers: getHeaders(), body: JSON.stringify({ status }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hidden-work-acts"] }),
  });

  const deleteAct = useMutation({
    mutationFn: (id: number) => fetch(`/api/hidden-work-acts/${id}`, { method: "DELETE", headers: getHeaders() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hidden-work-acts"] }),
  });

  const ACT_STATUS: Record<string, { label: string; color: string }> = {
    pending:  { label: "Хүлээгдэж байна", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    approved: { label: "Зөвшөөрсөн",      color: "bg-green-500/15 text-green-400 border-green-500/30" },
    rejected: { label: "Буцаасан",         color: "bg-red-500/15 text-red-400 border-red-500/30"       },
  };

  const createTask = useMutation({
    mutationFn: () => fetch("/api/erp/tasks", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ ...form, employeeId: parseInt(form.employeeId) }),
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/erp/tasks"] });
      setShowForm(false);
      setForm({ employeeId: "", date: TODAY, location: "", workType: "", equipment: "", notes: "", assignedBy: "" });
      toast({ title: "Даалгавар амжилттай тавигдлаа!" });
    },
    onError: () => toast({ title: "Алдаа гарлаа", variant: "destructive" }),
  });

  const deleteTask = useMutation({
    mutationFn: (id: number) => fetch(`/api/erp/tasks/${id}`, { method: "DELETE", headers: getHeaders() }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/erp/tasks"] }); toast({ title: "Устгагдлаа" }); },
  });

  const stats = {
    pending:   tasks.filter(t => t.status === "pending").length,
    accepted:  tasks.filter(t => t.status === "accepted").length,
    completed: tasks.filter(t => t.status === "completed").length,
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-slate-900/60 backdrop-blur-xl px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-blue-600/20 rounded-xl">
              <ClipboardList className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-widest text-white">Төлөвлөлт / Гүйцэтгэл</h1>
              <p className="text-xs text-slate-500">Хөвсгөл Зам ХХК</p>
            </div>
          </div>
          <button
            onClick={() => { localStorage.clear(); setLocation("/admin?role=SUPERVISOR"); }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-xl text-sm transition-all"
          >
            <LogOut className="w-4 h-4" /> Гарах
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">

        {/* Статистик */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Хүлээгдэж байна", val: stats.pending,   cls: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Хүлээн авсан",    val: stats.accepted,  cls: "text-blue-400",  bg: "bg-blue-500/10" },
            { label: "Дуусгасан",       val: stats.completed, cls: "text-green-400", bg: "bg-green-500/10" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border border-white/10 rounded-2xl p-4 text-center`}>
              <p className={`text-3xl font-black ${s.cls}`}>{s.val}</p>
              <p className="text-xs text-slate-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs + Date filter */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setTab("tasks")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === "tasks" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
              <ClipboardList className="w-4 h-4" /> Даалгавар
            </button>
            <button onClick={() => setTab("reports")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === "reports" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
              <FileText className="w-4 h-4" /> Тайлангууд
            </button>
            <button onClick={() => setTab("fronts")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === "fronts" ? "bg-green-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
              <Navigation className="w-4 h-4" /> Ажлын Фронт
            </button>
            <button onClick={() => setTab("acts")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === "acts" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
              <ScrollText className="w-4 h-4" /> Далд Ажлын Акт
            </button>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
              className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none" />
          </div>
        </div>

        {/* ── ДААЛГАВРЫН ХУУДАС ── */}
        {tab === "tasks" && (
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-bold">{filterDate} — Даалгавар</h2>
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all"
              >
                <Plus className="w-4 h-4" /> Даалгавар тавих
              </button>
            </div>

            {/* Шинэ даалгавар маягт */}
            {showForm && (
              <div className="p-5 border-b border-white/10 bg-blue-600/5">
                <p className="text-sm font-bold text-blue-300 mb-3">Шинэ даалгавар тавих</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  {/* Ажилтан сонгох */}
                  <div className="relative">
                    <select value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none appearance-none">
                      <option value="">Ажилтан сонгох *</option>
                      {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name} — {e.role}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  {/* Огноо */}
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none" />
                  {/* Газрын нэр */}
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="Газрын нэр * (жишээ: Зам-1 талбай)"
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500/50" />
                  {/* Ажлын төрөл */}
                  <input value={form.workType} onChange={e => setForm(f => ({ ...f, workType: e.target.value }))}
                    placeholder="Ажлын төрөл * (жишээ: Асфальт тавих)"
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500/50" />
                  {/* Техник */}
                  <input value={form.equipment} onChange={e => setForm(f => ({ ...f, equipment: e.target.value }))}
                    placeholder="Ашиглах техник (жишээ: Экскаватор CAT 320)"
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500/50" />
                  {/* Тавьсан хүний нэр */}
                  <input value={form.assignedBy} onChange={e => setForm(f => ({ ...f, assignedBy: e.target.value }))}
                    placeholder="Таны нэр (ахлах)"
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500/50" />
                </div>
                {/* Нэмэлт тайлбар */}
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Нэмэлт зааварчлага..."
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500/50 resize-none mb-3" />
                <div className="flex gap-3">
                  <button
                    onClick={() => createTask.mutate()}
                    disabled={!form.employeeId || !form.location || !form.workType || createTask.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition-all"
                  >
                    {createTask.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Даалгавар тавих
                  </button>
                  <button onClick={() => setShowForm(false)} className="px-4 text-slate-400 hover:text-white text-sm transition-all">Болих</button>
                </div>
              </div>
            )}

            {/* Даалгаврын жагсаалт */}
            {tasksLoading ? (
              <div className="p-12 text-center text-slate-400">Уншиж байна...</div>
            ) : tasks.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <ClipboardList className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                <p>Энэ өдөрт даалгавар байхгүй</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {tasks.map((t: any) => {
                  const emp = empMap.get(t.employeeId);
                  const status = TASK_STATUS[t.status] ?? TASK_STATUS.pending;
                  const StatusIcon = status.icon;
                  return (
                    <div key={t.id} className="p-4 hover:bg-white/2 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="text-white font-semibold">{emp?.name ?? `ID:${t.employeeId}`}</span>
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${status.cls}`}>
                              <StatusIcon className="w-3 h-3" />{status.label}
                            </span>
                          </div>
                          <p className="text-sm text-slate-300 font-medium">{t.workType}</p>
                          <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{t.location}</span>
                            {t.equipment && <span className="flex items-center gap-1"><Wrench className="w-3 h-3" />{t.equipment}</span>}
                            {t.assignedBy && <span className="text-slate-600">Тавьсан: {t.assignedBy}</span>}
                          </div>
                          {t.notes && <p className="text-xs text-slate-500 mt-1 italic">{t.notes}</p>}
                        </div>
                        <button onClick={() => { if (confirm("Устгах уу?")) deleteTask.mutate(t.id); }}
                          className="p-1.5 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── АЖЛЫН ФРОНТ ── */}
        {tab === "fronts" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-white">Ажлын Фронт / Км Пикет</h2>
              <button data-testid="btn-add-front" onClick={() => setShowFrontForm(f => !f)}
                className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition-all">
                <Plus className="w-4 h-4" /> Шинэ фронт
              </button>
            </div>

            {showFrontForm && (
              <div className="bg-slate-900/80 border border-green-500/30 rounded-2xl p-5 space-y-4">
                <h3 className="font-semibold text-green-400 flex items-center gap-2"><Navigation className="w-4 h-4" /> Шинэ ажлын фронт нэмэх</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { key: "name",         label: "Фронтын нэр",    type: "text",   ph: "2-р фронт" },
                    { key: "chainageStart",label: "Эхлэх км",        type: "number", ph: "45.000"     },
                    { key: "chainageEnd",  label: "Дуусах км",       type: "number", ph: "52.000"     },
                    { key: "supervisor",   label: "Ахлах инженер",   type: "text",   ph: ""           },
                    { key: "crewSize",     label: "Ажилчдын тоо",   type: "number", ph: "0"          },
                    { key: "date",         label: "Эхлэх огноо",     type: "date",   ph: ""           },
                  ].map(f => (
                    <div key={f.key} className="space-y-1">
                      <label className="text-xs text-white/40">{f.label}</label>
                      <input type={f.type} placeholder={f.ph} value={(frontForm as any)[f.key]}
                        onChange={e => setFrontForm(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500 transition-colors" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-white/40">Ажлын төрөл</label>
                    <select value={frontForm.activity} onChange={e => setFrontForm(p => ({ ...p, activity: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none">
                      {Object.entries(ACTIVITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-white/40">Явц (%)</label>
                    <input type="number" min="0" max="100" placeholder="0-100" value={frontForm.progress}
                      onChange={e => setFrontForm(p => ({ ...p, progress: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button data-testid="btn-save-front" onClick={() => createFront.mutate({
                    ...frontForm,
                    chainageStart: frontForm.chainageStart ? parseFloat(frontForm.chainageStart) : null,
                    chainageEnd:   frontForm.chainageEnd   ? parseFloat(frontForm.chainageEnd)   : null,
                    crewSize:      frontForm.crewSize       ? parseInt(frontForm.crewSize)        : 0,
                    progress:      frontForm.progress       ? parseFloat(frontForm.progress)      : 0,
                  })} disabled={createFront.isPending || !frontForm.name}
                    className="px-5 py-2 bg-green-600 hover:bg-green-500 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40">
                    {createFront.isPending ? "..." : "Нэмэх"}
                  </button>
                  <button onClick={() => setShowFrontForm(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm transition-all">Болих</button>
                </div>
              </div>
            )}

            {workFronts.length === 0 ? (
              <div className="p-12 text-center text-white/30">
                <Navigation className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p>Ажлын фронт бүртгэгдээгүй байна</p>
              </div>
            ) : (
              <div className="space-y-3">
                {workFronts.map((f: any) => {
                  const st = FRONT_STATUS[f.status] ?? FRONT_STATUS.active;
                  const prog = Math.min(100, Math.max(0, f.progress ?? 0));
                  return (
                    <div key={f.id} data-testid={`front-${f.id}`}
                      className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 hover:border-green-500/30 transition-all">
                      {editingFront === f.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2">
                            {[["progress","Явц %"],["supervisor","Ахлах инженер"],["crewSize","Ажилчид"]].map(([k,l]) => (
                              <div key={k}>
                                <label className="text-xs text-white/40">{l}</label>
                                <input type="number" value={editFrontData[k] ?? ""} onChange={e => setEditFrontData((p: any) => ({ ...p, [k]: e.target.value }))}
                                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
                              </div>
                            ))}
                          </div>
                          <div>
                            <label className="text-xs text-white/40">Статус</label>
                            <select value={editFrontData.status ?? f.status} onChange={e => setEditFrontData((p: any) => ({ ...p, status: e.target.value }))}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm focus:outline-none">
                              {Object.entries(FRONT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => updateFront.mutate({ id: f.id, data: { ...editFrontData, progress: parseFloat(editFrontData.progress ?? 0), crewSize: parseInt(editFrontData.crewSize ?? 0) } })}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-bold transition-all">
                              <Save className="w-3 h-3 inline mr-1" />Хадгалах
                            </button>
                            <button onClick={() => setEditingFront(null)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs transition-all">
                              <X className="w-3 h-3 inline mr-1" />Болих
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="font-bold text-white">{f.name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-lg border font-medium ${st.color}`}>{st.label}</span>
                                {f.chainageStart !== null && f.chainageEnd !== null && (
                                  <span className="text-xs text-white/40 font-mono">км {f.chainageStart?.toFixed(3)} – {f.chainageEnd?.toFixed(3)}</span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-3 text-xs text-white/40">
                                <span>🏗 {ACTIVITIES[f.activity] ?? f.activity}</span>
                                {f.supervisor && <span>👷 {f.supervisor}</span>}
                                {f.crewSize > 0 && <span>👥 {f.crewSize} хүн</span>}
                                <span>📅 {f.date}</span>
                              </div>
                              {f.notes && <p className="text-xs text-white/30 mt-1 italic">{f.notes}</p>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => { setEditingFront(f.id); setEditFrontData({ progress: f.progress, supervisor: f.supervisor, crewSize: f.crewSize, status: f.status }); }}
                                className="p-1.5 text-white/30 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => deleteFront.mutate(f.id)}
                                className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-white/30 mb-1">
                              <span>Явц</span><span>{prog}%</span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${prog >= 100 ? "bg-blue-500" : prog >= 70 ? "bg-green-500" : prog >= 30 ? "bg-amber-500" : "bg-red-500"}`}
                                style={{ width: `${prog}%` }} />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ДАЛД АЖЛЫН АКТ ── */}
        {tab === "acts" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-white">Далд Ажлын Акт</h2>
              <button data-testid="btn-add-act" onClick={() => setShowActForm(f => !f)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-sm font-bold transition-all">
                <Plus className="w-4 h-4" /> Шинэ акт
              </button>
            </div>

            {showActForm && (
              <div className="bg-slate-900/80 border border-purple-500/30 rounded-2xl p-5 space-y-4">
                <h3 className="font-semibold text-purple-400 flex items-center gap-2"><ScrollText className="w-4 h-4" /> Шинэ далд ажлын акт</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { key: "actNumber",  label: "Актын дугаар",      type: "text" },
                    { key: "date",       label: "Огноо",              type: "date" },
                    { key: "location",   label: "Км пикет",           type: "text" },
                    { key: "workType",   label: "Ажлын төрөл",        type: "text" },
                    { key: "inspector",  label: "Хяналт тавигч",      type: "text" },
                    { key: "contractor", label: "Гүйцэтгэгч",         type: "text" },
                  ].map(f => (
                    <div key={f.key} className="space-y-1">
                      <label className="text-xs text-white/40">{f.label}</label>
                      <input type={f.type} value={(actForm as any)[f.key]}
                        onChange={e => setActForm(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors" />
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/40">Тайлбар (гүйцэтгэсэн ажлын мэдээлэл)</label>
                  <textarea value={actForm.description} onChange={e => setActForm(p => ({ ...p, description: e.target.value }))}
                    rows={3} placeholder="Хийгдсэн ажлын мэдээлэл..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none" />
                </div>
                <div className="flex gap-2">
                  <button data-testid="btn-save-act" onClick={() => createAct.mutate(actForm)}
                    disabled={createAct.isPending || !actForm.actNumber || !actForm.location}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40">
                    {createAct.isPending ? "..." : "Бүртгэх"}
                  </button>
                  <button onClick={() => setShowActForm(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm transition-all">Болих</button>
                </div>
              </div>
            )}

            {hiddenActs.length === 0 ? (
              <div className="p-12 text-center text-white/30">
                <ScrollText className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p>Далд ажлын акт бүртгэгдээгүй байна</p>
              </div>
            ) : (
              <div className="space-y-3">
                {hiddenActs.map((a: any) => {
                  const st = ACT_STATUS[a.status] ?? ACT_STATUS.pending;
                  return (
                    <div key={a.id} data-testid={`act-${a.id}`}
                      className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 hover:border-purple-500/30 transition-all">
                      <div className="flex flex-wrap items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-bold text-white font-mono">#{a.actNumber}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-lg border font-medium ${st.color}`}>{st.label}</span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-white/40 mb-1">
                            <span>📍 {a.location}</span>
                            <span>🏗 {a.workType}</span>
                            <span>📅 {a.date}</span>
                            {a.inspector && <span>👁 {a.inspector}</span>}
                            {a.contractor && <span>🤝 {a.contractor}</span>}
                          </div>
                          {a.description && <p className="text-xs text-white/50 mt-1">{a.description}</p>}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {a.status === "pending" && (
                            <>
                              <button onClick={() => updateActStatus.mutate({ id: a.id, status: "approved" })}
                                className="px-2.5 py-1 bg-green-700/60 hover:bg-green-600 rounded-lg text-xs font-medium transition-all">
                                ✓ Зөвшөөрөх
                              </button>
                              <button onClick={() => updateActStatus.mutate({ id: a.id, status: "rejected" })}
                                className="px-2.5 py-1 bg-red-700/60 hover:bg-red-600 rounded-lg text-xs font-medium transition-all">
                                ✗ Буцаах
                              </button>
                            </>
                          )}
                          <button onClick={() => deleteAct.mutate(a.id)}
                            className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ТАЙЛАНГИЙН ХУУДАС ── */}
        {tab === "reports" && (
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-bold">{filterDate} — Ажлын тайлангууд</h2>
              <button onClick={() => refetchReports()} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {reportsLoading ? (
              <div className="p-12 text-center text-slate-400">Уншиж байна...</div>
            ) : reports.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <FileText className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                <p>Тайлан ороогүй байна</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {reports.map((r: any) => {
                  const emp = empMap.get(r.employeeId);
                  return (
                    <div key={r.id} className="p-4 hover:bg-white/2 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-white font-semibold">{emp?.name ?? `ID:${r.employeeId}`}</span>
                            {r.quantity && (
                              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-xs font-bold">
                                {r.quantity} {r.unit}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-300">{r.description}</p>
                          {r.issues && (
                            <div className="flex items-start gap-1.5 mt-1.5 text-xs text-red-400">
                              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                              <span>{r.issues}</span>
                            </div>
                          )}
                          <p className="text-xs text-slate-600 mt-1">
                            {new Date(r.createdAt).toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
