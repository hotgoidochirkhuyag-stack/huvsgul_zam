import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users, Briefcase, Factory, ClipboardList, TrendingUp, Award,
  Plus, Trash2, RefreshCw, Settings, LogOut, Clock, ShieldCheck, QrCode
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import QRCard from "@/components/QRCard";

function getAdminHeaders() {
  return { "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") ?? "" };
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
      <div className={`p-3 bg-${color}-600/20 rounded-xl`}>
        <Icon className={`w-5 h-5 text-${color}-400`} />
      </div>
      <div>
        <p className="text-slate-400 text-xs uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

type Tab = "kpi" | "attendance" | "employees" | "projects" | "plants" | "kpi-config" | "norm-agent";

export default function ERPDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("kpi");
  const [normOrder, setNormOrder] = useState("");
  const [newEmp, setNewEmp] = useState({ name: "", department: "field", role: "", salaryBase: "" });
  const [newProj, setNewProj] = useState({ name: "", location: "", status: "active" });
  const [newPlant, setNewPlant] = useState({ name: "", type: "concrete", location: "" });
  const [newKpi, setNewKpi] = useState({ workType: "", unit: "м³", dailyNorm: "", rewardPerUnit: "", source: "" });
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [showAddProj, setShowAddProj] = useState(false);
  const [showAddPlant, setShowAddPlant] = useState(false);
  const [showAddKpi, setShowAddKpi] = useState(false);
  const [selectedQrEmployee, setSelectedQrEmployee] = useState<any>(null);

  const { data: summary } = useQuery<any>({ queryKey: ["/api/erp/summary"], queryFn: () => fetch("/api/erp/summary", { headers: getAdminHeaders() }).then(r => r.json()) });
  const { data: kpiTeam = [], isLoading: kpiLoading } = useQuery<any[]>({ queryKey: ["/api/erp/kpi-team"], queryFn: () => fetch("/api/erp/kpi-team", { headers: getAdminHeaders() }).then(r => r.json()), enabled: tab === "kpi" });
  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["/api/erp/employees"], queryFn: () => fetch("/api/erp/employees", { headers: getAdminHeaders() }).then(r => r.json()), enabled: tab === "employees" });
  const { data: erpProjects = [] } = useQuery<any[]>({ queryKey: ["/api/erp/projects"], queryFn: () => fetch("/api/erp/projects").then(r => r.json()) });
  const { data: plants = [] } = useQuery<any[]>({ queryKey: ["/api/erp/plants"], queryFn: () => fetch("/api/erp/plants").then(r => r.json()), enabled: tab === "plants" });
  const { data: kpiConfigs = [] } = useQuery<any[]>({ queryKey: ["/api/erp/kpi-configs"], queryFn: () => fetch("/api/erp/kpi-configs").then(r => r.json()) });

  const addEmployee = useMutation({
    mutationFn: () => fetch("/api/erp/employees", { method: "POST", headers: getAdminHeaders(), body: JSON.stringify({ ...newEmp, salaryBase: parseFloat(newEmp.salaryBase) || 0 }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/erp/employees"] }); qc.invalidateQueries({ queryKey: ["/api/erp/summary"] }); setShowAddEmp(false); setNewEmp({ name: "", department: "field", role: "", salaryBase: "" }); toast({ title: "Ажилтан нэмэгдлээ" }); },
  });

  const deleteEmployee = useMutation({
    mutationFn: (id: number) => fetch(`/api/erp/employees/${id}`, { method: "DELETE", headers: getAdminHeaders() }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/erp/employees"] }); qc.invalidateQueries({ queryKey: ["/api/erp/summary"] }); toast({ title: "Ажилтан устгагдлаа" }); },
  });

  const addProject = useMutation({
    mutationFn: () => fetch("/api/erp/projects", { method: "POST", headers: getAdminHeaders(), body: JSON.stringify(newProj) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/erp/projects"] }); setShowAddProj(false); setNewProj({ name: "", location: "", status: "active" }); toast({ title: "Төсөл нэмэгдлээ" }); },
  });

  const addPlant = useMutation({
    mutationFn: () => fetch("/api/erp/plants", { method: "POST", headers: getAdminHeaders(), body: JSON.stringify(newPlant) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/erp/plants"] }); setShowAddPlant(false); setNewPlant({ name: "", type: "concrete", location: "" }); toast({ title: "Үйлдвэр нэмэгдлээ" }); },
  });

  const addKpi = useMutation({
    mutationFn: () => fetch("/api/erp/kpi-configs", { method: "POST", headers: getAdminHeaders(), body: JSON.stringify({ ...newKpi, dailyNorm: parseFloat(newKpi.dailyNorm), rewardPerUnit: parseFloat(newKpi.rewardPerUnit) || 0 }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/erp/kpi-configs"] }); setShowAddKpi(false); setNewKpi({ workType: "", unit: "м³", dailyNorm: "", rewardPerUnit: "", source: "" }); toast({ title: "KPI норм нэмэгдлээ" }); },
  });

  const deleteKpi = useMutation({
    mutationFn: (id: number) => fetch(`/api/erp/kpi-configs/${id}`, { method: "DELETE", headers: getAdminHeaders() }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/erp/kpi-configs"] }); toast({ title: "Норм устгагдлаа" }); },
  });

  const syncNorm = useMutation({
    mutationFn: () => fetch("/api/erp/sync-norms", { method: "POST", headers: getAdminHeaders(), body: JSON.stringify({ orderNumber: normOrder }) }).then(r => r.json()),
    onSuccess: (d) => { toast({ title: d.message }); qc.invalidateQueries({ queryKey: ["/api/erp/kpi-configs"] }); },
  });

  const today = new Date().toISOString().slice(0, 10);
  const { data: attendanceList = [] } = useQuery<any[]>({
    queryKey: ["/api/erp/attendance", today],
    queryFn: () => fetch(`/api/erp/attendance?date=${today}`, { headers: getAdminHeaders() }).then(r => r.json()),
    enabled: tab === "attendance",
  });

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: "kpi", label: "KPI", icon: TrendingUp },
    { key: "attendance", label: "Ирц / ХАБЭА", icon: Clock },
    { key: "employees", label: "Ажилтан", icon: Users },
    { key: "projects", label: "Төсөл", icon: Briefcase },
    { key: "plants", label: "Үйлдвэр", icon: Factory },
    { key: "kpi-config", label: "Норм", icon: Settings },
    { key: "norm-agent", label: "AI Агент", icon: RefreshCw },
  ];

  const deptLabel: Record<string, string> = { office: "Оффис", field: "Талбай", plant: "Үйлдвэр" };
  const plantLabel: Record<string, string> = { concrete: "Бетон", crusher: "Бутлуур", asphalt: "Асфальт" };
  const statusLabel: Record<string, { label: string; cls: string }> = {
    exceeded: { label: "Хэтэрсэн", cls: "text-green-400 bg-green-500/10" },
    met: { label: "Хангасан", cls: "text-blue-400 bg-blue-500/10" },
    below: { label: "Хүрэхгүй", cls: "text-red-400 bg-red-500/10" },
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">ERP Удирдлагын Систем</h1>
          <p className="text-slate-400 text-xs">Хөвсгөл Зам ХХК</p>
        </div>
        <button onClick={() => { localStorage.clear(); setLocation("/admin/ADMIN"); }} className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-xl text-sm transition-all">
          <LogOut size={14} /> Гарах
        </button>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <StatCard label="Ажилтан" value={summary.totalEmployees} icon={Users} color="blue" />
            <StatCard label="Идэвхтэй төсөл" value={summary.activeProjects} icon={Briefcase} color="amber" />
            <StatCard label="Үйлдвэр" value={summary.totalPlants} icon={Factory} color="green" />
            <StatCard label="Өнөөдрийн тайлан" value={summary.todayReports} icon={ClipboardList} color="purple" />
            <StatCard label="Нийт урамшуулал" value={`${(summary.totalBonusPaid ?? 0).toLocaleString()}₮`} icon={Award} color="amber" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === t.key ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* KPI Хариу */}
        {tab === "kpi" && (
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-bold text-white">Сүүлийн 30 хоногийн KPI</h2>
              <button onClick={() => qc.invalidateQueries({ queryKey: ["/api/erp/kpi-team"] })} className="text-slate-400 hover:text-white transition-all">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {kpiLoading ? (
              <div className="p-10 text-center text-slate-400">Тооцоолж байна...</div>
            ) : kpiTeam.length === 0 ? (
              <div className="p-10 text-center text-slate-400">Тайлан байхгүй байна</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/50">
                    <tr>{["Ажилтан", "Хэлтэс", "Огноо", "Ажлын төрөл", "Гүйцэтгэл", "Норм", "Хувь", "Урамшуулал", "Үнэлэмж"].map(h => (
                      <th key={h} className="text-left p-3 text-slate-400 text-xs uppercase tracking-wider">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {kpiTeam.map((r: any, i: number) => (
                      <tr key={i} className="border-t border-white/5 hover:bg-white/3 transition-colors">
                        <td className="p-3 text-white font-medium">{r.employeeName}</td>
                        <td className="p-3 text-slate-400 text-sm">{deptLabel[r.department] ?? r.department}</td>
                        <td className="p-3 text-slate-400 text-sm">{r.date}</td>
                        <td className="p-3 text-slate-300 text-sm">{r.workType}</td>
                        <td className="p-3 text-white">{r.quantity} {r.unit}</td>
                        <td className="p-3 text-slate-400">{r.dailyNorm} {r.unit}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-700 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${r.achievement >= 100 ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${Math.min(r.achievement, 100)}%` }} />
                            </div>
                            <span className={`font-bold text-sm ${r.achievement >= 100 ? "text-green-400" : "text-red-400"}`}>{r.achievement}%</span>
                          </div>
                        </td>
                        <td className="p-3 text-amber-400 font-medium">{r.bonus > 0 ? `+${r.bonus.toLocaleString()}₮` : "—"}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${statusLabel[r.status]?.cls}`}>{statusLabel[r.status]?.label}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Ирц / ХАБЭА */}
        {tab === "attendance" && (
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="font-bold">Өнөөдрийн ирц — {today}</h2>
                <p className="text-xs text-slate-500 mt-0.5">ХАБЭА баталгаажуулалтын байдал</p>
              </div>
              <button onClick={() => qc.invalidateQueries({ queryKey: ["/api/erp/attendance", today] })} className="text-slate-400 hover:text-white transition-all">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {attendanceList.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">Өнөөдрийн бүртгэл байхгүй байна</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/50">
                    <tr>{["Ажилтан", "Ирсэн цаг", "Явсан цаг", "ХАБЭА", "Хожимдол", "Байдал"].map(h => (
                      <th key={h} className="text-left p-3 text-slate-400 text-xs uppercase tracking-wider">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {attendanceList.map((a: any) => (
                      <tr key={a.id} className="border-t border-white/5 hover:bg-white/3">
                        <td className="p-3 text-white font-medium text-sm">#{a.employeeId}</td>
                        <td className="p-3 text-green-400 font-mono font-bold">{a.checkIn ?? "—"}</td>
                        <td className="p-3 text-blue-400 font-mono">{a.checkOut ?? <span className="text-slate-600">Яваагүй</span>}</td>
                        <td className="p-3">
                          {a.safetyConfirmed
                            ? <span className="flex items-center gap-1 text-green-400 text-xs"><ShieldCheck className="w-3.5 h-3.5" /> Баталгаажсан</span>
                            : <span className="text-slate-500 text-xs">—</span>}
                        </td>
                        <td className="p-3">
                          {(a.lateMinutes ?? 0) > 0
                            ? <span className="text-amber-400 text-sm font-bold">+{a.lateMinutes} мин</span>
                            : <span className="text-green-400 text-xs">Цагт ирсэн</span>}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${a.checkOut ? "bg-blue-500/10 text-blue-400" : "bg-green-500/10 text-green-400"}`}>
                            {a.checkOut ? "Дууссан" : "Ажиллаж байна"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Ажилтнууд */}
        {tab === "employees" && (
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-bold">Ажилтнуудын жагсаалт</h2>
              <button onClick={() => setShowAddEmp(!showAddEmp)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-sm transition-all">
                <Plus className="w-4 h-4" /> Нэмэх
              </button>
            </div>
            {showAddEmp && (
              <div className="p-5 border-b border-white/10 bg-slate-800/30 grid grid-cols-2 md:grid-cols-5 gap-3">
                <input value={newEmp.name} onChange={e => setNewEmp(f => ({ ...f, name: e.target.value }))} placeholder="Нэр" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none text-sm col-span-2 md:col-span-1" />
                <select value={newEmp.department} onChange={e => setNewEmp(f => ({ ...f, department: e.target.value }))} className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm">
                  <option value="office">Оффис</option>
                  <option value="field">Талбай</option>
                  <option value="plant">Үйлдвэр</option>
                </select>
                <input value={newEmp.role} onChange={e => setNewEmp(f => ({ ...f, role: e.target.value }))} placeholder="Албан тушаал" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none text-sm" />
                <input value={newEmp.salaryBase} onChange={e => setNewEmp(f => ({ ...f, salaryBase: e.target.value }))} placeholder="Үндсэн цалин ₮" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none text-sm" type="number" />
                <button onClick={() => addEmployee.mutate()} disabled={!newEmp.name || addEmployee.isPending} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl px-4 py-2 text-sm font-bold transition-all">Хадгалах</button>
              </div>
            )}
            <table className="w-full">
              <thead className="bg-slate-800/50"><tr>{["#", "Нэр", "Хэлтэс", "Албан тушаал", "Үндсэн цалин", "QR код", ""].map(h => <th key={h} className="text-left p-3 text-slate-400 text-xs uppercase tracking-wider">{h}</th>)}</tr></thead>
              <tbody>
                {employees.map((e: any, i: number) => (
                  <tr key={e.id} className="border-t border-white/5 hover:bg-white/3">
                    <td className="p-3 text-slate-500 text-sm">{i + 1}</td>
                    <td className="p-3 text-white font-medium">{e.name}</td>
                    <td className="p-3"><span className="px-2 py-1 rounded-lg text-xs bg-blue-500/10 text-blue-400">{deptLabel[e.department] ?? e.department}</span></td>
                    <td className="p-3 text-slate-300 text-sm">{e.role}</td>
                    <td className="p-3 text-slate-300 text-sm">{e.salaryBase?.toLocaleString()}₮</td>
                    <td className="p-3 text-slate-500 text-xs font-mono">{e.qrCode}</td>
                    <td className="p-3 flex items-center gap-1">
                      <button
                        onClick={() => setSelectedQrEmployee(e)}
                        className="p-1.5 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-all"
                        title="QR код харах / хэвлэх"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteEmployee.mutate(e.id)} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Төслүүд */}
        {tab === "projects" && (
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-bold">ERP Төслүүд</h2>
              <button onClick={() => setShowAddProj(!showAddProj)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-sm transition-all"><Plus className="w-4 h-4" /> Нэмэх</button>
            </div>
            {showAddProj && (
              <div className="p-5 border-b border-white/10 bg-slate-800/30 grid grid-cols-2 md:grid-cols-4 gap-3">
                <input value={newProj.name} onChange={e => setNewProj(f => ({ ...f, name: e.target.value }))} placeholder="Төслийн нэр" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none text-sm col-span-2 md:col-span-1" />
                <input value={newProj.location} onChange={e => setNewProj(f => ({ ...f, location: e.target.value }))} placeholder="Байршил" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none text-sm" />
                <select value={newProj.status} onChange={e => setNewProj(f => ({ ...f, status: e.target.value }))} className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm">
                  <option value="active">Идэвхтэй</option><option value="completed">Дууссан</option><option value="paused">Түр зогссон</option>
                </select>
                <button onClick={() => addProject.mutate()} disabled={!newProj.name || addProject.isPending} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl px-4 py-2 text-sm font-bold transition-all">Хадгалах</button>
              </div>
            )}
            <table className="w-full">
              <thead className="bg-slate-800/50"><tr>{["#", "Нэр", "Байршил", "Төлөв"].map(h => <th key={h} className="text-left p-3 text-slate-400 text-xs uppercase tracking-wider">{h}</th>)}</tr></thead>
              <tbody>
                {erpProjects.map((p: any, i: number) => (
                  <tr key={p.id} className="border-t border-white/5 hover:bg-white/3">
                    <td className="p-3 text-slate-500 text-sm">{i + 1}</td>
                    <td className="p-3 text-white font-medium">{p.name}</td>
                    <td className="p-3 text-slate-400 text-sm">{p.location ?? "—"}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded-lg text-xs font-medium ${p.status === "active" ? "bg-green-500/10 text-green-400" : p.status === "completed" ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400"}`}>{p.status === "active" ? "Идэвхтэй" : p.status === "completed" ? "Дууссан" : "Түр зогссон"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Үйлдвэрүүд */}
        {tab === "plants" && (
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-bold">Үйлдвэрүүд</h2>
              <button onClick={() => setShowAddPlant(!showAddPlant)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-sm transition-all"><Plus className="w-4 h-4" /> Нэмэх</button>
            </div>
            {showAddPlant && (
              <div className="p-5 border-b border-white/10 bg-slate-800/30 grid grid-cols-2 md:grid-cols-4 gap-3">
                <input value={newPlant.name} onChange={e => setNewPlant(f => ({ ...f, name: e.target.value }))} placeholder="Үйлдвэрийн нэр" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none text-sm" />
                <select value={newPlant.type} onChange={e => setNewPlant(f => ({ ...f, type: e.target.value }))} className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm">
                  <option value="concrete">Бетон зуурмаг</option><option value="crusher">Бутлан ангилах</option><option value="asphalt">Асфальт хольц</option>
                </select>
                <input value={newPlant.location} onChange={e => setNewPlant(f => ({ ...f, location: e.target.value }))} placeholder="Байршил" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none text-sm" />
                <button onClick={() => addPlant.mutate()} disabled={!newPlant.name || addPlant.isPending} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl px-4 py-2 text-sm font-bold transition-all">Хадгалах</button>
              </div>
            )}
            <table className="w-full">
              <thead className="bg-slate-800/50"><tr>{["#", "Нэр", "Төрөл", "Байршил"].map(h => <th key={h} className="text-left p-3 text-slate-400 text-xs uppercase tracking-wider">{h}</th>)}</tr></thead>
              <tbody>
                {plants.map((p: any, i: number) => (
                  <tr key={p.id} className="border-t border-white/5 hover:bg-white/3">
                    <td className="p-3 text-slate-500 text-sm">{i + 1}</td>
                    <td className="p-3 text-white font-medium">{p.name}</td>
                    <td className="p-3"><span className="px-2 py-1 rounded-lg text-xs bg-green-500/10 text-green-400">{plantLabel[p.type] ?? p.type}</span></td>
                    <td className="p-3 text-slate-400 text-sm">{p.location ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* KPI Норм тохиргоо */}
        {tab === "kpi-config" && (
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-bold">KPI / БНбД Норм тохиргоо</h2>
              <button onClick={() => setShowAddKpi(!showAddKpi)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-sm transition-all"><Plus className="w-4 h-4" /> Нэмэх</button>
            </div>
            {showAddKpi && (
              <div className="p-5 border-b border-white/10 bg-slate-800/30 grid grid-cols-2 md:grid-cols-6 gap-3">
                <input value={newKpi.workType} onChange={e => setNewKpi(f => ({ ...f, workType: e.target.value }))} placeholder="Ажлын төрөл" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none text-sm col-span-2" />
                <input value={newKpi.unit} onChange={e => setNewKpi(f => ({ ...f, unit: e.target.value }))} placeholder="Нэгж" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none text-sm" />
                <input value={newKpi.dailyNorm} onChange={e => setNewKpi(f => ({ ...f, dailyNorm: e.target.value }))} placeholder="Өдрийн норм" type="number" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none text-sm" />
                <input value={newKpi.rewardPerUnit} onChange={e => setNewKpi(f => ({ ...f, rewardPerUnit: e.target.value }))} placeholder="Урамш/нэгж ₮" type="number" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none text-sm" />
                <button onClick={() => addKpi.mutate()} disabled={!newKpi.workType || !newKpi.dailyNorm || addKpi.isPending} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl px-4 py-2 text-sm font-bold transition-all">Хадгалах</button>
              </div>
            )}
            <table className="w-full">
              <thead className="bg-slate-800/50"><tr>{["Ажлын төрөл", "Нэгж", "Өдрийн норм", "Урам/нэгж", "Эх сурвалж", ""].map(h => <th key={h} className="text-left p-3 text-slate-400 text-xs uppercase tracking-wider">{h}</th>)}</tr></thead>
              <tbody>
                {kpiConfigs.map((k: any) => (
                  <tr key={k.id} className="border-t border-white/5 hover:bg-white/3">
                    <td className="p-3 text-white">{k.workType}</td>
                    <td className="p-3 text-slate-400">{k.unit}</td>
                    <td className="p-3 text-white font-bold">{k.dailyNorm}</td>
                    <td className="p-3 text-amber-400">{k.rewardPerUnit > 0 ? `${k.rewardPerUnit.toLocaleString()}₮` : "—"}</td>
                    <td className="p-3 text-slate-500 text-xs">{k.source ?? "—"}</td>
                    <td className="p-3"><button onClick={() => deleteKpi.mutate(k.id)} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* AI Норм агент */}
        {tab === "norm-agent" && (
          <div className="space-y-4">
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-blue-600/20 rounded-xl"><RefreshCw className="w-6 h-6 text-blue-400" /></div>
                <div>
                  <h2 className="font-bold text-white text-lg">AI Норм Шинэчлэгч Агент</h2>
                  <p className="text-slate-400 text-sm mt-1">ЗТХЯ, legalinfo.mn-аас тушаалын нормуудыг автоматаар татаж KPI тохиргоог шинэчилнэ</p>
                </div>
              </div>
              <div className="flex gap-3">
                <input
                  value={normOrder}
                  onChange={e => setNormOrder(e.target.value)}
                  placeholder="Тушаалын дугаар (жишээ: А-63, А-141)"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50"
                />
                <button
                  onClick={() => syncNorm.mutate()}
                  disabled={!normOrder || syncNorm.isPending}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-xl transition-all flex items-center gap-2"
                >
                  {syncNorm.isPending ? <><RefreshCw className="w-4 h-4 animate-spin" /> Татаж байна...</> : <><RefreshCw className="w-4 h-4" /> Татах</>}
                </button>
              </div>
              {syncNorm.data && (
                <div className={`mt-4 p-4 rounded-xl text-sm ${syncNorm.data.success ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-amber-500/10 border border-amber-500/30 text-amber-400"}`}>
                  {syncNorm.data.message}
                </div>
              )}
            </div>
            <div className="bg-slate-800/30 border border-white/5 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Дэмжигдсэн тушаалуудын жишээ</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {["А-63", "А-141", "А-200", "А-89"].map(o => (
                  <button key={o} onClick={() => setNormOrder(o)} className="p-3 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl text-sm text-slate-300 transition-all text-left">
                    <p className="font-bold text-white">{o}</p>
                    <p className="text-xs text-slate-500 mt-1">ЗТХЯ тушаал</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QR карт modal */}
      {selectedQrEmployee && (
        <QRCard
          employee={selectedQrEmployee}
          onClose={() => setSelectedQrEmployee(null)}
        />
      )}
    </div>
  );
}
