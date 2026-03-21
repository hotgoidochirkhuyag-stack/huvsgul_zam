import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";
import {
  UserCheck, ShieldCheck, TrendingUp, Factory, BookOpen, Target,
  AlertTriangle, CheckCircle2, Clock, Gauge, Bot, RefreshCw,
  Sparkles, FileText, ChevronRight, Video, Loader2, Globe,
  MapPin, Ruler, Calendar, Building2, DollarSign, Pencil, Save, X, ImageIcon,
  Plus, Trash2, Download, FolderOpen, KeyRound, Eye, EyeOff, Check,
} from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import { FactoryControl, type MeetingMode } from "@/components/FactoryControl";
import { useToast } from "@/hooks/use-toast";

type Tab = "attendance" | "project" | "production" | "norm" | "kpi" | "ai" | "meeting" | "website" | "credentials";

function hdrs() {
  return {
    "Content-Type": "application/json",
    "x-admin-token": localStorage.getItem("adminToken") || "",
  };
}

const COLORS = ["#d97706", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#f59e0b"];

/* ── Helpers ── */
function StatCard({
  icon: Icon, label, value, sub, color = "amber",
}: { icon: any; label: string; value: string | number; sub?: string; color?: string }) {
  const bg: Record<string, string> = {
    amber: "bg-amber-600/15 border-amber-500/30", blue: "bg-blue-600/15 border-blue-500/30",
    green: "bg-green-600/15 border-green-500/30", red: "bg-red-600/15 border-red-500/30",
    purple: "bg-purple-600/15 border-purple-500/30",
  };
  const ic: Record<string, string> = {
    amber: "text-amber-400", blue: "text-blue-400", green: "text-green-400",
    red: "text-red-400", purple: "text-purple-400",
  };
  return (
    <div className={`rounded-2xl p-5 border ${bg[color] ?? bg.amber} flex items-center gap-4`}>
      <div className={`p-3 rounded-xl ${bg[color]?.split(" ")[0]}`}>
        <Icon className={`w-6 h-6 ${ic[color] ?? ic.amber}`} />
      </div>
      <div>
        <p className="text-slate-400 text-xs">{label}</p>
        <p className="text-2xl font-black text-white">{value}</p>
        {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ══════════════════════ 1. ИРЕЦ / ХАБЭА ══════════════════════ */
function AttendanceTab() {
  const { data: rows = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/erp/attendance"],
    queryFn: () => fetch("/api/erp/attendance", { headers: hdrs() }).then(r => r.json()),
  });

  const total = rows.length;
  const checkedIn = rows.filter(r => r.checkIn).length;
  const safetyOk = rows.filter(r => r.safetyConfirmed).length;
  const lateCount = rows.filter(r => (r.lateMinutes ?? 0) > 0).length;
  const safetyPct = total > 0 ? Math.round((safetyOk / total) * 100) : 0;

  /* Last 7 days chart */
  const byDate: Record<string, { date: string; ирц: number; хабэа: number }> = {};
  rows.forEach(r => {
    const d = r.date ?? r.createdAt?.slice(0, 10) ?? "—";
    if (!byDate[d]) byDate[d] = { date: d.slice(5), ирц: 0, хабэа: 0 };
    if (r.checkIn) byDate[d].ирц++;
    if (r.safetyConfirmed) byDate[d].хабэа++;
  });
  const chartData = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)).slice(-10);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={UserCheck} label="Нийт бүртгэл" value={total} color="blue" />
        <StatCard icon={CheckCircle2} label="Ирсэн" value={checkedIn} color="green" />
        <StatCard icon={ShieldCheck} label="ХАБЭА баталгаажсан" value={`${safetyOk} (${safetyPct}%)`} color="amber" />
        <StatCard icon={Clock} label="Хоцорсон" value={lateCount} color="red" />
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-slate-500">Уншиж байна...</div>
      ) : chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-500">Өгөгдөл байхгүй</div>
      ) : (
        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-5">
          <h3 className="text-sm font-bold text-slate-300 mb-4">Өдрийн ирц / ХАБЭА баталгаа</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #ffffff20", borderRadius: 12 }} />
              <Legend wrapperStyle={{ color: "#94a3b8" }} />
              <Bar dataKey="ирц" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Ирц" />
              <Bar dataKey="хабэа" fill="#d97706" radius={[4, 4, 0, 0]} name="ХАБЭА" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-slate-900/60 rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-sm font-bold text-slate-300">Сүүлийн ирцийн бүртгэл</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  {["Огноо","Ирсэн цаг","Гарсан цаг","ХАБЭА","Хоцролт"].map(h => (
                    <th key={h} className="text-left p-3 text-slate-400 text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((r: any) => (
                  <tr key={r.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3 text-slate-300 text-sm">{r.date ?? "—"}</td>
                    <td className="p-3 text-white text-sm">{r.checkIn ?? "—"}</td>
                    <td className="p-3 text-slate-300 text-sm">{r.checkOut ?? "—"}</td>
                    <td className="p-3">
                      {r.safetyConfirmed
                        ? <span className="text-green-400 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Тийм</span>
                        : <span className="text-red-400 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Үгүй</span>}
                    </td>
                    <td className="p-3 text-sm">
                      {(r.lateMinutes ?? 0) > 0
                        ? <span className="text-red-400">{r.lateMinutes} мин</span>
                        : <span className="text-slate-500">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════ 2. ТӨСЛИЙН ЯВЦ ══════════════════════ */
function ProjectTab() {
  const { data: reports = [], isLoading: lr } = useQuery<any[]>({
    queryKey: ["/api/erp/daily-reports"],
    queryFn: () => fetch("/api/erp/daily-reports", { headers: hdrs() }).then(r => r.json()),
  });
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/erp/projects"],
    queryFn: () => fetch("/api/erp/projects").then(r => r.json()),
  });

  /* Quantity by date */
  const byDate: Record<string, { date: string; гүйцэтгэл: number }> = {};
  reports.forEach((r: any) => {
    const d = r.date?.slice(5) ?? "—";
    if (!byDate[d]) byDate[d] = { date: d, гүйцэтгэл: 0 };
    byDate[d].гүйцэтгэл += r.quantity ?? 0;
  });
  const lineData = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)).slice(-15);

  /* By workType pie */
  const byType: Record<string, number> = {};
  reports.forEach((r: any) => { byType[r.workType] = (byType[r.workType] ?? 0) + (r.quantity ?? 0); });
  const pieData = Object.entries(byType).map(([name, value]) => ({ name, value: Math.round(value) }));

  const activeProjects = projects.filter((p: any) => p.status === "active");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={Target} label="Идэвхтэй төсөл" value={activeProjects.length} color="blue" />
        <StatCard icon={TrendingUp} label="Нийт тайлан" value={reports.length} color="green" />
        <StatCard icon={CheckCircle2} label="Нийт гүйцэтгэл" value={`${reports.reduce((s:number, r:any) => s + (r.quantity ?? 0), 0).toFixed(0)}`} color="amber" />
      </div>

      {lr ? (
        <div className="h-64 flex items-center justify-center text-slate-500">Уншиж байна...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-slate-900/60 rounded-2xl border border-white/10 p-5">
            <h3 className="text-sm font-bold text-slate-300 mb-4">Өдрийн гүйцэтгэл (сүүлийн 15 хоног)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #ffffff20", borderRadius: 12 }} />
                <Line type="monotone" dataKey="гүйцэтгэл" stroke="#d97706" strokeWidth={2} dot={{ fill: "#d97706", r: 3 }} name="Гүйцэтгэл" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-5">
            <h3 className="text-sm font-bold text-slate-300 mb-4">Ажлын төрлөөр</h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #ffffff20", borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-slate-500 text-sm">Өгөгдөл байхгүй</div>
            )}
          </div>
        </div>
      )}

      {activeProjects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeProjects.map((p: any) => (
            <div key={p.id} className="bg-slate-900/60 rounded-2xl border border-blue-500/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <p className="font-bold text-white text-sm">{p.name}</p>
              </div>
              <p className="text-slate-400 text-xs">{p.location ?? "Байршил тодорхойгүй"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════ 3. ҮЙЛДВЭРЛЭЛИЙН ЯВЦ ══════════════════════ */
function ProductionTab() {
  const { data: logs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/erp/production-logs"],
    queryFn: () => fetch("/api/erp/production-logs", { headers: hdrs() }).then(r => r.json()),
  });
  const { data: plants = [] } = useQuery<any[]>({
    queryKey: ["/api/erp/plants"],
    queryFn: () => fetch("/api/erp/plants").then(r => r.json()),
  });

  const byDate: Record<string, { date: string; гаралт: number }> = {};
  logs.forEach((l: any) => {
    const d = l.date?.slice(5) ?? "—";
    if (!byDate[d]) byDate[d] = { date: d, гаралт: 0 };
    byDate[d].гаралт += l.outputQuantity ?? 0;
  });
  const lineData = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)).slice(-15);

  const byPlant: Record<string, number> = {};
  logs.forEach((l: any) => {
    const pname = plants.find((p: any) => p.id === l.plantId)?.name ?? `Үйлдвэр ${l.plantId}`;
    byPlant[pname] = (byPlant[pname] ?? 0) + (l.outputQuantity ?? 0);
  });
  const barData = Object.entries(byPlant).map(([name, гаралт]) => ({ name, гаралт: Math.round(гаралт) }));

  const totalOutput = logs.reduce((s: number, l: any) => s + (l.outputQuantity ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={Factory} label="Нийт гаралт" value={`${totalOutput.toFixed(0)}`} color="blue" />
        <StatCard icon={TrendingUp} label="Бүртгэлийн тоо" value={logs.length} color="green" />
        <StatCard icon={Target} label="Идэвхтэй үйлдвэр" value={plants.filter((p: any) => p.isActive !== false).length} color="amber" />
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-slate-500">Уншиж байна...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-slate-900/60 rounded-2xl border border-white/10 p-5">
            <h3 className="text-sm font-bold text-slate-300 mb-4">Өдрийн гаралт (м³ / тн)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #ffffff20", borderRadius: 12 }} />
                <Line type="monotone" dataKey="гаралт" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", r: 3 }} name="Гаралт" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-5">
            <h3 className="text-sm font-bold text-slate-300 mb-4">Үйлдвэрээр</h3>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #ffffff20", borderRadius: 12 }} />
                  <Bar dataKey="гаралт" radius={[0, 4, 4, 0]} name="Гаралт">
                    {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-slate-500 text-sm">Өгөгдөл байхгүй</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════ 4. НОРМ ══════════════════════ */
function NormTab() {
  const { data: kpis = [], isLoading: lk } = useQuery<any[]>({
    queryKey: ["/api/erp/kpi-configs"],
    queryFn: () => fetch("/api/erp/kpi-configs").then(r => r.json()),
  });

  return (
    <div className="space-y-6">
      {/* KPI тохиргооны норм */}
      <div className="bg-slate-900/60 rounded-2xl border border-blue-500/20 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-400" />
          <h3 className="font-bold text-white text-sm">KPI өдрийн норм (стандарт)</h3>
          <span className="ml-auto text-xs text-slate-500">{kpis.length} норм</span>
        </div>
        {lk ? (
          <div className="p-8 text-center text-slate-500">Уншиж байна...</div>
        ) : kpis.length === 0 ? (
          <div className="p-8 text-center text-slate-500">KPI норм байхгүй</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  {["Ажлын төрөл","Нэгж","Өдрийн норм","Урамшуулал/нэгж"].map(h => (
                    <th key={h} className="text-left p-3 text-slate-400 text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kpis.map((k: any) => (
                  <tr key={k.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3 text-white text-sm">{k.workType}</td>
                    <td className="p-3 text-slate-300 text-sm">{k.unit}</td>
                    <td className="p-3 text-blue-400 font-bold">{k.dailyNorm}</td>
                    <td className="p-3 text-green-400 text-sm">{k.rewardPerUnit ? `${k.rewardPerUnit}₮` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════ 5. KPI / OEE ══════════════════════ */
function KpiTab() {
  const { data: kpiTeam = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/erp/kpi-team"],
    queryFn: () => fetch("/api/erp/kpi-team", { headers: hdrs() }).then(r => r.json()),
  });

  const topPerformers = [...kpiTeam].sort((a, b) => (b.kpiPct ?? 0) - (a.kpiPct ?? 0)).slice(0, 10);
  const barData = topPerformers.map((e: any) => ({
    name: e.name?.slice(0, 8) ?? `#${e.employeeId}`,
    KPI: Math.round(e.kpiPct ?? 0),
  }));

  const avgKpi = kpiTeam.length > 0
    ? Math.round(kpiTeam.reduce((s: number, e: any) => s + (e.kpiPct ?? 0), 0) / kpiTeam.length)
    : 0;
  const above100 = kpiTeam.filter((e: any) => (e.kpiPct ?? 0) >= 100).length;

  /* OEE = Availability × Performance × Quality (simplified) */
  const oeeApprox = Math.min(99, Math.round(avgKpi * 0.88));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Gauge} label="Дундаж KPI" value={`${avgKpi}%`} color={avgKpi >= 90 ? "green" : avgKpi >= 70 ? "amber" : "red"} />
        <StatCard icon={Target} label="OEE (тооцоо)" value={`${oeeApprox}%`} color={oeeApprox >= 85 ? "green" : oeeApprox >= 65 ? "amber" : "red"} />
        <StatCard icon={CheckCircle2} label="Норм хангасан" value={above100} sub="100%+ дүн" color="green" />
        <StatCard icon={AlertTriangle} label="Норм хангаагүй" value={kpiTeam.length - above100} color="red" />
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-slate-500">Уншиж байна...</div>
      ) : barData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-500">KPI өгөгдөл байхгүй</div>
      ) : (
        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-5">
          <h3 className="text-sm font-bold text-slate-300 mb-4">Шилдэг 10 ажилтан (KPI %)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} domain={[0, 150]} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #ffffff20", borderRadius: 12 }} />
              <Bar dataKey="KPI" radius={[4, 4, 0, 0]} name="KPI %">
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.KPI >= 100 ? "#10b981" : entry.KPI >= 80 ? "#d97706" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {kpiTeam.length > 0 && (
        <div className="bg-slate-900/60 rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-sm font-bold text-slate-300">Бүх ажилтны KPI дүн</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  {["#","Нэр","Гүйцэтгэл","Норм","KPI %","Урамшуулал"].map(h => (
                    <th key={h} className="text-left p-3 text-slate-400 text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...kpiTeam].sort((a, b) => (b.kpiPct ?? 0) - (a.kpiPct ?? 0)).map((e: any, i: number) => {
                  const pct = Math.round(e.kpiPct ?? 0);
                  return (
                    <tr key={e.employeeId} className="border-t border-white/5 hover:bg-white/[0.02]">
                      <td className="p-3 text-slate-500 text-sm">{i + 1}</td>
                      <td className="p-3 text-white text-sm font-medium">{e.name ?? `#${e.employeeId}`}</td>
                      <td className="p-3 text-slate-300 text-sm">{(e.totalQuantity ?? 0).toFixed(1)} {e.unit ?? ""}</td>
                      <td className="p-3 text-slate-400 text-sm">{e.dailyNorm ?? "—"}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${pct >= 100 ? "bg-green-600/20 text-green-400" : pct >= 80 ? "bg-amber-600/20 text-amber-400" : "bg-red-600/20 text-red-400"}`}>
                          {pct}%
                        </span>
                      </td>
                      <td className="p-3 text-green-400 text-sm">{e.bonus ? `${e.bonus.toFixed(0)}₮` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════ 6. AI АГЕНТ ══════════════════════ */
const SECTION_COLORS: Record<string, string> = {
  "1. Бэлтгэл ажил":         "blue",
  "2. Хөрсний ажил":          "amber",
  "3. Суурь давхарга":        "orange",
  "4. Асфальтбетон хучилт":   "red",
  "5. Бетон хучилт":          "purple",
  "6. Ус зайлуулах":          "cyan",
  "7. Замын тоноглол":        "green",
  "8. Гүүр, байгууламж":      "rose",
  "9. Тусгай ажлууд":         "indigo",
};
const SC = (s: string) => SECTION_COLORS[s] ?? "slate";

function AiAgentTab() {
  const [activeSection, setActiveSection] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const { data: catalog, isLoading: catalogLoading } = useQuery<{ norms: any[]; sections: string[] }>({
    queryKey: ["/api/erp/norm-catalog"],
    queryFn: () => fetch("/api/erp/norm-catalog", { headers: hdrs() }).then(r => r.json()),
  });

  const { data: kpiList = [] } = useQuery<any[]>({
    queryKey: ["/api/erp/kpi-configs"],
    queryFn: () => fetch("/api/erp/kpi-configs", { headers: hdrs() }).then(r => r.json()),
  });

  const syncNorm = useMutation({
    mutationFn: (section: string) =>
      fetch("/api/erp/sync-norms", {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({ section }),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/erp/kpi-configs"] });
    },
  });

  const sections = catalog?.sections ?? [];
  const allNorms  = catalog?.norms ?? [];

  const importedSet = new Set(kpiList.map((k: any) => k.workType));

  const filtered = allNorms.filter(n => {
    const matchSection = activeSection === "ALL" || n.section === activeSection;
    const matchSearch  = !search || n.workType.toLowerCase().includes(search.toLowerCase()) || n.code?.includes(search);
    return matchSection && matchSearch;
  });

  const sectionCounts = sections.map(s => ({
    section: s,
    total: allNorms.filter(n => n.section === s).length,
    imported: allNorms.filter(n => n.section === s && importedSet.has(n.workType)).length,
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900/30 to-slate-900/60 rounded-2xl border border-blue-500/20 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/20 rounded-xl border border-blue-500/20">
              <Bot className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-white text-lg">ЗЗБНбД 81-013-2019</h2>
                <span className="px-2 py-0.5 bg-blue-600/30 text-blue-300 text-xs font-bold rounded-full">Норм</span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Авто зам, замын байгууламжийн барилга, засварын ажлын төсөв бодох норм
              </p>
            </div>
          </div>
          <div className="sm:ml-auto flex gap-2 flex-wrap">
            <button
              data-testid="btn-import-all"
              onClick={() => syncNorm.mutate("ALL")}
              disabled={syncNorm.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all"
            >
              {syncNorm.isPending
                ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Орж байна...</>
                : <><RefreshCw className="w-3.5 h-3.5" /> Бүгдийг KPI-д оруулах</>}
            </button>
          </div>
        </div>

        {syncNorm.data && (
          <div className={`mt-3 p-3 rounded-xl text-sm flex items-center gap-2 ${
            syncNorm.data.success
              ? "bg-green-500/10 border border-green-500/30 text-green-300"
              : "bg-amber-500/10 border border-amber-500/30 text-amber-300"
          }`}>
            {syncNorm.data.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{syncNorm.data.message}</span>
            {syncNorm.data.success && <span className="ml-auto text-xs font-bold text-green-400">{syncNorm.data.updated} норм</span>}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-white">{allNorms.length}</div>
            <div className="text-xs text-slate-400 mt-0.5">Нийт норм</div>
          </div>
          <div className="bg-green-500/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-green-400">{importedSet.size}</div>
            <div className="text-xs text-green-500/80 mt-0.5">Системд орсон</div>
          </div>
          <div className="bg-amber-500/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-amber-400">{sections.length}</div>
            <div className="text-xs text-amber-500/80 mt-0.5">Хэсэг</div>
          </div>
        </div>
      </div>

      {/* Хэсгүүд */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Хэсгүүд</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {/* ALL товч */}
          <button
            onClick={() => setActiveSection("ALL")}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
              activeSection === "ALL"
                ? "bg-blue-600/20 border-blue-500/40"
                : "bg-slate-900/60 border-white/10 hover:border-white/20"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm">Бүгд</p>
              <p className="text-xs text-slate-400">{allNorms.length} норм</p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); syncNorm.mutate("ALL"); }}
              className="shrink-0 px-2 py-1 text-xs bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 rounded-lg"
            >Оруулах</button>
          </button>

          {sectionCounts.map(({ section, total, imported }) => {
            const c = SC(section);
            return (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  activeSection === section
                    ? `bg-${c}-600/20 border-${c}-500/40`
                    : "bg-slate-900/60 border-white/10 hover:border-white/20"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg bg-${c}-600/20 flex items-center justify-center shrink-0`}>
                  <FileText className={`w-4 h-4 text-${c}-400`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-xs leading-snug">{section}</p>
                  <p className="text-xs text-slate-500">{imported}/{total} орсон</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); syncNorm.mutate(section); }}
                  className="shrink-0 px-2 py-1 text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 rounded-lg"
                >Оруулах</button>
              </button>
            );
          })}
        </div>
      </div>

      {/* Хайлт + норм хүснэгт */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <BookOpen className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-white text-sm">
            {activeSection === "ALL" ? "Бүх норм" : activeSection}
          </h3>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{filtered.length}</span>
          <div className="ml-auto">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Хайх..."
              className="bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-amber-500/50 placeholder:text-slate-600 w-48"
            />
          </div>
        </div>

        {catalogLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Ачааллаж байна...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/60">
                <tr>
                  {["Код", "Ажлын төрөл", "Хэсэг", "Нэгж", "Өдрийн норм", "Эх сурвалж", "Төлөв"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-slate-400 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((n: any, i: number) => {
                  const isImported = importedSet.has(n.workType);
                  const c = SC(n.section);
                  return (
                    <tr key={i} className="border-t border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{n.code ?? "—"}</td>
                      <td className="px-4 py-2.5 text-white text-sm max-w-xs">
                        <p className="leading-snug">{n.workType}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full bg-${c}-500/10 text-${c}-400 whitespace-nowrap`}>
                          {n.section?.replace(/^\d+\. /, "") ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs font-mono">{n.unit}</td>
                      <td className="px-4 py-2.5 text-amber-400 font-bold text-sm">{n.dailyNorm.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">{n.source}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isImported
                            ? "bg-green-500/15 text-green-400"
                            : "bg-slate-700/50 text-slate-500"
                        }`}>
                          {isImported ? "✓ Орсон" : "Оруулаагүй"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════ 7. ОНЛАЙН ХУРАЛ ══════════════════════ */
function MeetingTab() {
  const [mode, setMode] = useState<MeetingMode>("CONFERENCE_HALL");

  const MODES: { key: MeetingMode; label: string; sub: string; icon: any; bg: string; border: string; active: string }[] = [
    {
      key:    "CONFERENCE_HALL",
      label:  "Ажлын явцтай танилцах",
      sub:    "Инженер, оператор, механик, лаборатори болон бусад ажилтнуудтай хамтарсан хурал",
      icon:   Video,
      bg:     "bg-blue-600/20",
      border: "border-blue-500/20",
      active: "bg-blue-600 border-blue-500",
    },
    {
      key:    "BOARD_DIRECTOR",
      label:  "ТУЗ / Захирал",
      sub:    "ТУЗ-ын гишүүд, Захирал болон удирдлагын зөвлөлийн хаалттай хурал",
      icon:   Video,
      bg:     "bg-amber-600/20",
      border: "border-amber-500/20",
      active: "bg-amber-600 border-amber-500",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2.5 bg-indigo-600/20 rounded-xl">
          <Video className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="font-bold text-white">Онлайн хурал / Видео холболт</h2>
          <p className="text-slate-500 text-xs">Хурлын горим сонгоод хурал эхлүүлнэ үү</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MODES.map(m => {
          const Icon = m.icon;
          const isActive = mode === m.key;
          return (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`p-5 rounded-2xl border text-left transition-all hover:scale-[1.01] ${
                isActive ? `${m.active} text-white` : `${m.bg} ${m.border} hover:border-white/20`
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl ${isActive ? "bg-white/20" : m.bg}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-black text-white text-base mb-1">{m.label}</p>
                  <p className={`text-xs leading-relaxed ${isActive ? "text-white/70" : "text-slate-500"}`}>{m.sub}</p>
                </div>
              </div>
              {isActive && (
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span className="text-xs text-white/70 font-semibold">Сонгогдсон</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-5">
        <FactoryControl mode={mode} />
      </div>
    </div>
  );
}

/* ══════════════════════ 8. ВЭБСАЙТ — Онцлох төслүүд ══════════════════════ */
function WebsiteTab() {
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const { data: projects = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()),
  });

  const updateProject = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetch(`/api/projects/metadata`, {
        method: "PATCH",
        headers: hdrs(),
        body: JSON.stringify({ publicId: id, ...data }),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setEditId(null);
    },
  });

  const startEdit = (p: any) => {
    setEditId(p.id);
    setEditForm({
      title: p.title ?? "",
      description: p.description ?? "",
      location: p.location ?? "",
      length: p.length ?? "",
      year: p.year ?? "",
      clientName: p.clientName ?? "",
      contractValue: p.contractValue ?? "",
      progress: p.progress ?? 0,
    });
  };

  const CATS: Record<string, string> = {
    "Авто зам": "amber",
    "Гүүр": "blue",
    "Дэд бүтэц": "green",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 rounded-2xl border border-white/10 p-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-600/20 rounded-xl border border-amber-500/20">
            <Globe className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="font-black text-white text-lg">Онцлох төслүүд</h2>
            <p className="text-slate-400 text-xs mt-0.5">Нүүр хуудасны "Онцлох төслүүд" хэсгийн мэдээлэл засах</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Ачааллаж байна...
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((p: any) => {
            const c = CATS[p.category] ?? "slate";
            const isEditing = editId === p.id;

            return (
              <div key={p.id} className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
                {/* Card header */}
                <div className="flex items-center gap-4 p-4 border-b border-white/5">
                  <img src={p.imageUrl} alt={p.title} className="w-16 h-16 object-cover rounded-xl shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold bg-${c}-500/15 text-${c}-400`}>
                        {p.category}
                      </span>
                    </div>
                    <p className="font-bold text-white text-sm truncate">{p.title}</p>
                    <p className="text-slate-500 text-xs truncate">{p.description}</p>
                  </div>
                  <button
                    onClick={() => isEditing ? setEditId(null) : startEdit(p)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isEditing
                        ? "bg-slate-700 text-slate-400 hover:bg-slate-600"
                        : "bg-amber-600/20 text-amber-400 hover:bg-amber-600/30"
                    }`}
                  >
                    {isEditing ? <><X size={12} /> Болих</> : <><Pencil size={12} /> Засах</>}
                  </button>
                </div>

                {/* Edit form */}
                {isEditing && (
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { key: "title",         label: "Гарчиг",          icon: <FileText size={13} />, ph: "Төслийн нэр" },
                        { key: "location",      label: "Байршил",          icon: <MapPin size={13} />, ph: "Мурэн — Тосонцэнгэл" },
                        { key: "length",        label: "Урт / Хэмжээ",    icon: <Ruler size={13} />, ph: "245 км" },
                        { key: "year",          label: "Хугацаа",          icon: <Calendar size={13} />, ph: "2021–2024" },
                        { key: "clientName",    label: "Захиалагч",        icon: <Building2 size={13} />, ph: "ЗТХЯ" },
                        { key: "contractValue", label: "Гэрээний дүн",    icon: <DollarSign size={13} />, ph: "₮12.5 тэрбум" },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
                            <span className="text-amber-400">{f.icon}</span> {f.label}
                          </label>
                          <input
                            type="text"
                            value={editForm[f.key]}
                            onChange={e => setEditForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                            placeholder={f.ph}
                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50 placeholder-slate-600"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Description */}
                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block">Тайлбар (Modal-д харагдана)</label>
                      <textarea
                        value={editForm.description}
                        onChange={e => setEditForm((p: any) => ({ ...p, description: e.target.value }))}
                        rows={3}
                        placeholder="Төслийн дэлгэрэнгүй тайлбар..."
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50 placeholder-slate-600 resize-none"
                      />
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-slate-400">Гүйцэтгэлийн явц</label>
                        <span className="text-amber-400 font-bold text-sm">{editForm.progress}%</span>
                      </div>
                      <input
                        type="range" min="0" max="100" step="1"
                        value={editForm.progress}
                        onChange={e => setEditForm((p: any) => ({ ...p, progress: parseInt(e.target.value) }))}
                        className="w-full accent-amber-500"
                      />
                      <div className="h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all"
                          style={{ width: `${editForm.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Save button */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => updateProject.mutate({ id: p.id, data: editForm })}
                        disabled={updateProject.isPending}
                        className="flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all"
                      >
                        {updateProject.isPending ? <><RefreshCw size={14} className="animate-spin" /> Хадгалж байна...</> : <><Save size={14} /> Хадгалах</>}
                      </button>
                      <button onClick={() => setEditId(null)} className="px-4 py-2 bg-slate-800 text-slate-400 hover:bg-slate-700 rounded-xl text-sm transition-all">
                        Болих
                      </button>
                    </div>
                  </div>
                )}

                {/* Preview (when not editing) */}
                {!isEditing && (
                  <div className="px-4 pb-4 pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { icon: <MapPin size={11} />, val: p.location },
                      { icon: <Ruler size={11} />, val: p.length },
                      { icon: <Calendar size={11} />, val: p.year },
                      { icon: <Building2 size={11} />, val: p.clientName },
                    ].map((item, i) => item.val && (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="text-amber-400/60">{item.icon}</span>
                        <span>{item.val}</span>
                      </div>
                    ))}
                    {p.progress != null && (
                      <div className="col-span-2 sm:col-span-4 mt-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-500">Явц</span>
                          <span className="text-xs text-amber-400 font-bold">{p.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${p.progress}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {projects.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <Globe className="w-10 h-10 mx-auto mb-3 text-slate-700" />
              <p>Онцлох төсөл бүртгэгдээгүй байна</p>
            </div>
          )}
        </div>
      )}

      {/* ── PDF Баримтууд ── */}
      <PdfDocumentsManager />

      {/* ── Stats зургийн тайлбар ── */}
      <StatsImageDescriptions />
    </div>
  );
}

function StatsImageDescriptions() {
  const [editId, setEditId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");

  const { data: images = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/stats"],
    queryFn: () => fetch("/api/stats").then(r => r.json()),
  });

  const updateDesc = useMutation({
    mutationFn: ({ publicId, description }: { publicId: string; description: string }) =>
      fetch("/api/stats/metadata", {
        method: "PATCH",
        headers: hdrs(),
        body: JSON.stringify({ publicId, description }),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setEditId(null);
    },
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 rounded-2xl border border-white/10 p-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-600/20 rounded-xl border border-amber-500/20">
            <ImageIcon className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="font-black text-white text-lg">Stats хэсгийн зургууд</h2>
            <p className="text-slate-400 text-xs mt-0.5">Нүүр хуудасны "Манай компани өнөөдөр" хэсгийн зурагны тайлбар засах</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Ачааллаж байна...
        </div>
      ) : (
        <div className="space-y-3">
          {images.map((img: any) => {
            const isEditing = editId === img.id;
            return (
              <div key={img.id} className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  <img src={img.imageUrl} alt={img.description} className="w-16 h-16 object-cover rounded-xl shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{img.description}</p>
                    <p className="text-slate-600 text-xs truncate">{img.id}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (isEditing) { setEditId(null); }
                      else { setEditId(img.id); setEditDesc(img.description ?? ""); }
                    }}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isEditing
                        ? "bg-slate-700 text-slate-400 hover:bg-slate-600"
                        : "bg-amber-600/20 text-amber-400 hover:bg-amber-600/30"
                    }`}
                  >
                    {isEditing ? <><X size={12} /> Болих</> : <><Pencil size={12} /> Засах</>}
                  </button>
                </div>
                {isEditing && (
                  <div className="px-4 pb-4 space-y-3">
                    <input
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                      placeholder="Зурагны тайлбар..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateDesc.mutate({ publicId: img.id, description: editDesc })}
                        disabled={updateDesc.isPending}
                        className="flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all"
                      >
                        {updateDesc.isPending ? <><RefreshCw size={14} className="animate-spin" /> Хадгалж байна...</> : <><Save size={14} /> Хадгалах</>}
                      </button>
                      <button onClick={() => setEditId(null)} className="px-4 py-2 bg-slate-800 text-slate-400 hover:bg-slate-700 rounded-xl text-sm transition-all">Болих</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {images.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <ImageIcon className="w-10 h-10 mx-auto mb-3 text-slate-700" />
              <p>Stats зураг бүртгэгдээгүй байна</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const DOC_CATEGORIES = [
  { value: "general",  label: "Нийтлэг" },
  { value: "design",   label: "Зураг төсөл" },
  { value: "contract", label: "Гэрээ" },
  { value: "report",   label: "Тайлан" },
  { value: "norm",     label: "Норм стандарт" },
];

function PdfDocumentsManager() {
  const [form, setForm] = useState({ title: "", category: "general", description: "", fileUrl: "", fileSize: "" });
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const { data: docs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/project-documents"],
    queryFn: () => fetch("/api/project-documents").then(r => r.json()),
  });

  const addDoc = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/project-documents", {
        method: "POST", headers: hdrs(), body: JSON.stringify(form),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
        throw new Error(body?.error || `HTTP ${r.status}`);
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-documents"] });
      setForm({ title: "", category: "general", description: "", fileUrl: "", fileSize: "" });
      setShowForm(false);
      toast({ title: "PDF баримт нэмэгдлээ ✓" });
    },
    onError: (e: any) => toast({ title: e.message || "Хадгалахад алдаа гарлаа", variant: "destructive" }),
  });

  const delDoc = useMutation({
    mutationFn: (id: number) => fetch(`/api/project-documents/${id}`, { method: "DELETE", headers: hdrs() }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-documents"] });
      toast({ title: "Устгагдлаа" });
    },
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 rounded-2xl border border-white/10 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600/20 rounded-xl border border-red-500/20">
              <FileText className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h2 className="font-black text-white text-lg">PDF Баримтууд</h2>
              <p className="text-slate-400 text-xs mt-0.5">Нүүр хуудасны "Онцлох төслүүд" хэсгийн татах боломжтой баримтууд</p>
            </div>
          </div>
          <button onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm transition-all">
            <Plus className="w-4 h-4" /> Баримт нэмэх
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-slate-900/60 border border-amber-500/20 rounded-2xl p-5 space-y-3">
          <p className="text-amber-400 font-bold text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Шинэ PDF баримт</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Гарчиг *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Гэрээний баримт #01" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Ангилал</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
                {DOC_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">PDF / файлын URL (Google Drive, Cloudinary гэх мэт) *</label>
            <input value={form.fileUrl} onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))}
              placeholder="https://drive.google.com/..." className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Хэмжээ (заавал биш)</label>
              <input value={form.fileSize} onChange={e => setForm(f => ({ ...f, fileSize: e.target.value }))}
                placeholder="2.3 MB" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Тайлбар (заавал биш)</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Товч тайлбар..." className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => addDoc.mutate()} disabled={addDoc.isPending || !form.title || !form.fileUrl}
              className="flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition-all">
              {addDoc.isPending ? <><RefreshCw className="w-4 h-4 animate-spin" /> Хадгалж байна...</> : <><Save className="w-4 h-4" /> Хадгалах</>}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-800 text-slate-400 hover:bg-slate-700 rounded-xl text-sm">Болих</button>
          </div>
        </div>
      )}

      {/* Document list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-slate-400 gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Ачааллаж байна...</div>
      ) : docs.length === 0 ? (
        <div className="text-center py-12 text-slate-500 flex flex-col items-center gap-3">
          <FolderOpen className="w-10 h-10 opacity-30" />
          <p>Баримт бүртгэгдээгүй байна</p>
          <p className="text-xs text-slate-600">Дээрх "Баримт нэмэх" товч дарж PDF URL нэмнэ үү</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc: any) => (
            <div key={doc.id} className="flex items-center gap-4 p-4 bg-slate-900/60 border border-white/10 rounded-2xl group">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{doc.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-amber-400/70">{DOC_CATEGORIES.find(c => c.value === doc.category)?.label ?? doc.category}</span>
                  {doc.fileSize && <span className="text-[10px] text-slate-600">· {doc.fileSize}</span>}
                  {doc.description && <span className="text-[10px] text-slate-600 truncate">· {doc.description}</span>}
                </div>
              </div>
              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/15 text-blue-400 hover:bg-blue-600/25 border border-blue-500/20 rounded-xl text-xs font-semibold transition-all">
                <Download className="w-3.5 h-3.5" /> Нээх
              </a>
              <button onClick={() => { if (confirm("Устгах уу?")) delDoc.mutate(doc.id); }}
                disabled={delDoc.isPending}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-red-600/10 text-red-400 hover:bg-red-600/20 border border-red-500/20 rounded-xl text-xs font-semibold transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════ MAIN ══════════════════════ */
/* ═══════════════════ НЭВТРЭЛТИЙН ТОХИРГОО ════════════════════ */
const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Администратор", BOARD: "ТУЗ / Захирал", PROJECT: "Төслийн удирдагч",
  ENGINEER: "Инженер", HR: "ХНС", SUPERVISOR: "Хяналтын инженер",
  MECHANIC: "Механик", WAREHOUSE: "Агуулах", LAB: "Лаборатори",
};

function CredentialsTab() {
  const { toast } = useToast();
  const hdrsLocal = () => ({ "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") ?? "" });

  const { data: creds = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/credentials"],
    queryFn: () => fetch("/api/admin/credentials", { headers: hdrsLocal() }).then(r => r.json()),
  });

  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm]       = useState({ username: "", password: "" });
  const [showPw, setShowPw]   = useState<Record<string, boolean>>({});
  const [saving, setSaving]   = useState(false);

  const startEdit = (c: any) => { setEditing(c.role); setForm({ username: c.username, password: c.password }); };
  const cancelEdit = () => setEditing(null);

  const save = async () => {
    if (!form.username.trim() || !form.password.trim()) {
      toast({ title: "Нэр болон нууц үг оруулна уу", variant: "destructive" }); return;
    }
    setSaving(true);
    const r = await fetch(`/api/admin/credentials/${editing}`, {
      method: "PUT", headers: hdrsLocal(), body: JSON.stringify(form),
    });
    setSaving(false);
    if (r.ok) { toast({ title: "Амжилттай хадгалагдлаа" }); setEditing(null); refetch(); }
    else toast({ title: "Алдаа гарлаа", variant: "destructive" });
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2.5 bg-amber-600/20 rounded-xl"><KeyRound className="w-5 h-5 text-amber-400" /></div>
        <div>
          <h2 className="font-bold text-white">Нэвтрэлтийн тохиргоо</h2>
          <p className="text-slate-500 text-xs">Роль бүрийн нэвтрэх нэр, нууц үгийг өөрчлөх</p>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-300">
        Анхааруулга: Нууц үгийг мартвал дахин нэвтрэх боломжгүй болно. Заавал аюулгүй газарт хадгалаарай.
      </div>

      <div className="space-y-2">
        {creds.map((c: any) => (
          <div key={c.role} className="bg-slate-800/50 border border-white/10 rounded-2xl p-4">
            {editing === c.role ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-white">{ROLE_LABELS[c.role] ?? c.role}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-600/20 text-amber-400 font-bold">{c.role}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Нэвтрэх нэр</label>
                    <input
                      value={form.username}
                      onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
                      placeholder="Нэвтрэх нэр"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Нууц үг</label>
                    <div className="relative">
                      <input
                        type={showPw[c.role] ? "text" : "password"}
                        value={form.password}
                        onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 pr-10 text-sm text-white outline-none focus:border-amber-500/50"
                        placeholder="Нууц үг"
                      />
                      <button onClick={() => setShowPw(p => ({ ...p, [c.role]: !p[c.role] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                        {showPw[c.role] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={cancelEdit} className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-bold transition-all">Цуцлах</button>
                  <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold transition-all disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Хадгалах
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center">
                    <KeyRound className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{ROLE_LABELS[c.role] ?? c.role}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-400 font-bold">{c.role}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Нэвтрэх нэр: <span className="text-slate-300 font-mono">{c.username}</span></p>
                  </div>
                </div>
                <button onClick={() => startEdit(c)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-700 hover:bg-amber-600/20 hover:border-amber-500/30 border border-transparent text-slate-400 hover:text-amber-400 text-xs font-bold transition-all">
                  <Pencil className="w-3.5 h-3.5" /> Засах
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "attendance",   label: "Ирц / ХАБЭА",         icon: UserCheck   },
  { key: "project",     label: "Төслийн явц",           icon: TrendingUp  },
  { key: "production",  label: "Үйлдвэрлэлийн явц",    icon: Factory     },
  { key: "norm",        label: "Норм",                  icon: BookOpen    },
  { key: "kpi",         label: "KPI / OEE",             icon: Gauge       },
  { key: "ai",          label: "AI Агент",              icon: Bot         },
  { key: "meeting",     label: "Онлайн хурал",          icon: Video       },
  { key: "website",     label: "Вэбсайт",               icon: Globe       },
  { key: "credentials", label: "Нэвтрэлт",              icon: KeyRound    },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("attendance");
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#020617]/95 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">ТУЗ-ын самбар</h1>
          <p className="text-slate-500 text-xs">Хөвсгөл Зам ХХК — Удирдлагын зөвлөлийн хяналт</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="btn-annual-report"
            onClick={() => setLocation("/dashboard/annual-report")}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/40 text-amber-300 text-sm font-bold rounded-xl transition-all"
          >
            <FileText className="w-4 h-4" />
            Оны тайлан
          </button>
          <LogoutButton />
        </div>
      </header>

      {/* Tab nav */}
      <div className="sticky top-[69px] z-10 bg-[#020617]/90 backdrop-blur border-b border-white/10 px-6">
        <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-none">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${
                tab === t.key
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="p-6 max-w-7xl mx-auto">
        {tab === "attendance"  && <AttendanceTab />}
        {tab === "project"     && <ProjectTab />}
        {tab === "production"  && <ProductionTab />}
        {tab === "norm"        && <NormTab />}
        {tab === "kpi"         && <KpiTab />}
        {tab === "ai"          && <AiAgentTab />}
        {tab === "meeting"      && <MeetingTab />}
        {tab === "website"      && <WebsiteTab />}
        {tab === "credentials"  && <CredentialsTab />}
      </main>
    </div>
  );
}
