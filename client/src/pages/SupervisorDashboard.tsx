import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList, Plus, Trash2, LogOut, RefreshCw,
  MapPin, Wrench, Users, FileText, ChevronDown,
  CheckCircle2, Clock, AlertCircle, Calendar
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

  const [tab, setTab] = useState<"tasks" | "reports">("tasks");
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
              <h1 className="text-lg font-black uppercase tracking-widest text-white">Ахлах — Даалгавар</h1>
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
          <div className="flex gap-2">
            <button onClick={() => setTab("tasks")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === "tasks" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
              <ClipboardList className="w-4 h-4" /> Даалгавар
            </button>
            <button onClick={() => setTab("reports")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === "reports" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
              <FileText className="w-4 h-4" /> Тайлангууд
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
