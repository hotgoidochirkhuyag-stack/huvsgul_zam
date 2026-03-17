import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";
import {
  UserCheck, ShieldCheck, TrendingUp, Factory, BookOpen, Target,
  AlertTriangle, CheckCircle2, Clock, Gauge, Bot, RefreshCw,
  Sparkles, FileText, ChevronRight, Video, Loader2,
} from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import { FactoryControl, type MeetingMode } from "@/components/FactoryControl";

type Tab = "attendance" | "project" | "production" | "norm" | "kpi" | "ai" | "meeting";

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
  const { data: norms = [], isLoading: ln } = useQuery<any[]>({
    queryKey: ["/api/norm-configs"],
    queryFn: () => fetch("/api/norm-configs", { headers: hdrs() }).then(r => r.json()),
  });
  const { data: kpis = [], isLoading: lk } = useQuery<any[]>({
    queryKey: ["/api/erp/kpi-configs"],
    queryFn: () => fetch("/api/erp/kpi-configs").then(r => r.json()),
  });

  return (
    <div className="space-y-6">
      {/* ТУЗ-ын норм */}
      <div className="bg-slate-900/60 rounded-2xl border border-amber-500/20 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-white text-sm">ТУЗ хурлаараа тогтоосон норм</h3>
          <span className="ml-auto text-xs text-slate-500">{norms.length} норм</span>
        </div>
        {ln ? (
          <div className="p-8 text-center text-slate-500">Уншиж байна...</div>
        ) : norms.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Норм бүртгэгдээгүй байна</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  {["Ажлын төрөл","Нэгж","Өдрийн норм","Урамшуулал","Эх сурвалж","Шинэчлэгдсэн"].map(h => (
                    <th key={h} className="text-left p-3 text-slate-400 text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {norms.map((n: any) => (
                  <tr key={n.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3 text-white font-medium text-sm">{n.workType}</td>
                    <td className="p-3 text-slate-300 text-sm">{n.unit}</td>
                    <td className="p-3 text-amber-400 font-bold">{n.dailyNorm}</td>
                    <td className="p-3 text-green-400 text-sm">{n.rewardPerUnit ? `${n.rewardPerUnit}₮` : "—"}</td>
                    <td className="p-3 text-slate-400 text-sm">{n.source ?? "—"}</td>
                    <td className="p-3 text-slate-500 text-xs">{n.updatedAt ? new Date(n.updatedAt).toLocaleDateString("mn-MN") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
      label:  "Хурлын заал",
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

/* ══════════════════════ MAIN ══════════════════════ */
const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "attendance",  label: "Ирц / ХАБЭА",         icon: UserCheck   },
  { key: "project",    label: "Төслийн явц",           icon: TrendingUp  },
  { key: "production", label: "Үйлдвэрлэлийн явц",    icon: Factory     },
  { key: "norm",       label: "Норм",                  icon: BookOpen    },
  { key: "kpi",        label: "KPI / OEE",             icon: Gauge       },
  { key: "ai",         label: "AI Агент",              icon: Bot         },
  { key: "meeting",    label: "Онлайн хурал",          icon: Video       },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("attendance");

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#020617]/95 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">ТУЗ-ын самбар</h1>
          <p className="text-slate-500 text-xs">Хөвсгөл Зам ХХК — Удирдлагын зөвлөлийн хяналт</p>
        </div>
        <LogoutButton />
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
        {tab === "meeting"     && <MeetingTab />}
      </main>
    </div>
  );
}
