import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  LogOut, Printer, Users, Truck, Package, ClipboardList,
  FlaskConical, Banknote, BarChart3, TrendingUp, Calendar,
  ShieldCheck, Fuel, HardHat, ChevronDown,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { printReport } from "@/lib/printReport";

function getHeaders() {
  return { "x-admin-token": localStorage.getItem("adminToken") ?? "" };
}

const MONTHS_MN = ["1-р","2-р","3-р","4-р","5-р","6-р","7-р","8-р","9-р","10-р","11-р","12-р"];
const PIE_COLORS = ["#d97706","#3b82f6","#10b981","#ef4444","#8b5cf6","#f59e0b","#06b6d4"];

const TEST_LABEL: Record<string, string> = {
  marshall: "Маршалл", concrete: "Бетон", compaction: "Нягтрал", sieve: "Шигшүүр", soil: "Хөрс",
};

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string;
}) {
  const cls = {
    amber: "text-amber-400 bg-amber-400/10",
    blue:  "text-blue-400 bg-blue-400/10",
    green: "text-green-400 bg-green-400/10",
    red:   "text-red-400 bg-red-400/10",
    purple:"text-purple-400 bg-purple-400/10",
    white: "text-white bg-white/10",
  }[color ?? "white"] ?? "text-white bg-white/10";

  return (
    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cls}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-white/50 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-white/30 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
        <Icon className="w-4 h-4 text-amber-400" />
        <h2 className="font-bold text-amber-300 text-base">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function AnnualReport() {
  const [, setLocation] = useLocation();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data, isLoading, isError } = useQuery<any>({
    queryKey: ["/api/annual-report", year],
    queryFn: () =>
      fetch(`/api/annual-report?year=${year}`, { headers: getHeaders() }).then(r => r.json()),
  });

  function fmt(n: number, div = 1) {
    if (div === 1000000) return (n / div).toFixed(1) + " сая₮";
    if (div === 1000) return (n / div).toFixed(0) + "К";
    return n.toLocaleString();
  }

  function handlePrint() {
    if (!data) return;
    const r = data;
    const now = new Date().toLocaleDateString("mn-MN");

    const statsRow = (items: { label: string; value: string | number }[]) =>
      "<div class='stat-row'>" +
      items.map(i => `<div class='stat-box'><div class='stat-val'>${i.value}</div><div class='stat-lbl'>${i.label}</div></div>`).join("") +
      "</div>";

    const table = (headers: string[], rows: string[][]) =>
      "<table><thead><tr>" + headers.map(h => `<th>${h}</th>`).join("") + "</tr></thead><tbody>" +
      rows.map(row => "<tr>" + row.map(c => `<td>${c}</td>`).join("") + "</tr>").join("") +
      "</tbody></table>";

    const res = r.resources ?? {};
    const perf = r.performance ?? {};
    const qual = r.quality ?? {};
    const fin  = r.finance ?? {};

    const deptRows   = Object.entries(res.employeesByDept ?? {}).map(([k, v]) => [k, String(v) + " хүн"]);
    const vtypeRows  = Object.entries(res.vehiclesByType  ?? {}).map(([k, v]) => [k, String(v) + " ширхэг"]);
    const labRows    = Object.entries(qual.byTestType ?? {}).map(([k, v]: any) => [
      TEST_LABEL[k] ?? k, String(v.pass ?? 0), String(v.fail ?? 0),
      ((v.pass + v.fail) > 0 ? Math.round(v.pass / (v.pass + v.fail) * 100) + "%" : "—"),
    ]);
    const monthHours = Object.entries(perf.hoursByMonth ?? {}).sort(([a],[b]) => a.localeCompare(b)).map(([m, h]) => {
      const idx = parseInt(m.slice(5)) - 1;
      return [MONTHS_MN[idx] + " сар", String((h as number).toFixed(1)) + " цаг"];
    });

    const ORDER_LABELS: Record<string, string> = { pending:"Хүлээгдэж байна", confirmed:"Баталгаажсан", inprogress:"Гүйцэтгэлд", done:"Дууссан", cancelled:"Цуцлагдсан" };
    const CONTRACT_LABELS: Record<string, string> = { draft:"Ноорог", active:"Хүчинтэй", completed:"Дууссан", terminated:"Цуцлагдсан" };
    const orderRows    = Object.entries(fin.ordersByStatus ?? {}).map(([k,v]) => [ORDER_LABELS[k] ?? k, String(v)]);
    const contractRows = Object.entries(fin.contractsByStatus ?? {}).map(([k,v]) => [CONTRACT_LABELS[k] ?? k, String(v)]);

    const body = [
      "<p style='text-align:center;font-size:13px;color:#555;margin-bottom:12px'>" + year + " оны үйл ажиллагааны тайлан · Гаргасан: " + now + "</p>",

      "<div class='section-title'>1. КОМПАНИЙН НӨӨЦ</div>",
      statsRow([
        { label: "Нийт ажилтан",   value: res.totalEmployees ?? 0 },
        { label: "Нийт техник",    value: res.totalVehicles  ?? 0 },
        { label: "Ажлын бэлэн",   value: res.readyVehicles  ?? 0 },
        { label: "Агуулахын материал", value: res.totalWarehouseItems ?? 0 },
        { label: "Дутуу нөөц",    value: res.lowStockItems   ?? 0 },
      ]),
      deptRows.length ? table(["Хэлтэс/Газар","Ажилтан"], deptRows) : "",
      vtypeRows.length ? table(["Техникийн төрөл","Тоо"], vtypeRows) : "",

      "<div class='section-title'>2. АЖЛЫН ГҮЙЦЭТГЭЛ</div>",
      statsRow([
        { label: "Ажлын тайлан",     value: perf.totalWorkReports ?? 0 },
        { label: "Нийт ажлын цаг",   value: (perf.totalEquipmentHours ?? 0).toFixed(1) + " ц" },
        { label: "Дизель зарцуулалт",value: (perf.totalFuelDiesel ?? 0).toFixed(0) + " л" },
        { label: "Бензин зарцуулалт",value: (perf.totalFuelPetrol ?? 0).toFixed(0) + " л" },
        { label: "Ажлын фронт",      value: perf.totalWorkFronts ?? 0 },
      ]),
      monthHours.length ? table(["Сар","Ажлын цаг"], monthHours) : "",

      "<div class='section-title'>3. ЧАНАРЫН ХЯНАЛТ (ЛАБОРАТОРИ)</div>",
      statsRow([
        { label: "Нийт туршилт",   value: qual.totalLabTests ?? 0 },
        { label: "Тэнцсэн",        value: qual.passCount ?? 0 },
        { label: "Тэнцээгүй",      value: qual.failCount ?? 0 },
        { label: "Тэнцэлтийн хувь", value: qual.passRate != null ? qual.passRate + "%" : "—" },
      ]),
      labRows.length ? table(["Туршилтын төрөл","Тэнцсэн","Тэнцээгүй","Хувь"], labRows) : "",

      "<div class='section-title'>4. САНХҮҮГИЙН ҮР ДҮН</div>",
      statsRow([
        { label: "Нийт захиалга",   value: fin.totalOrders ?? 0 },
        { label: "Захиалгын дүн",   value: ((fin.totalOrderAmount ?? 0) / 1000000).toFixed(1) + " сая₮" },
        { label: "Нийт гэрээ",      value: fin.totalContracts ?? 0 },
        { label: "Гэрээний дүн",    value: ((fin.totalContractAmount ?? 0) / 1000000).toFixed(1) + " сая₮" },
        { label: "Шатахуун төсөв",  value: ((fin.totalFuelBudget ?? 0) / 1000000).toFixed(1) + " сая₮" },
      ]),
      orderRows.length    ? table(["Захиалгын статус","Тоо"], orderRows)    : "",
      contractRows.length ? table(["Гэрээний статус","Тоо"], contractRows) : "",
    ].join("");

    printReport(year + " ОНЫ ҮЙЛ АЖИЛЛАГААНЫ ТАЙЛАН", body);
  }

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-slate-400">Уншиж байна...</div>
      </div>
    );
  }

  const res  = data?.resources   ?? {};
  const perf = data?.performance ?? {};
  const qual = data?.quality     ?? {};
  const fin  = data?.finance     ?? {};

  const hourChartData = Object.entries(perf.hoursByMonth ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([m, h]) => ({
      name: MONTHS_MN[parseInt(m.slice(5)) - 1],
      цаг: Number((h as number).toFixed(1)),
    }));

  const deptChartData = Object.entries(res.employeesByDept ?? {}).map(([name, value]) => ({ name, value }));
  const labChartData  = Object.entries(qual.byTestType ?? {}).map(([k, v]: any) => ({
    name: TEST_LABEL[k] ?? k,
    тэнцсэн: v.pass ?? 0,
    тэнцээгүй: v.fail ?? 0,
  }));

  const passRate = qual.passRate;

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0f172a]/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="font-bold text-base">Оны эцсийн тайлан</div>
              <div className="text-xs text-white/35">Хөвсгөл зам ХХК — Нэгтгэл тайлан</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Year selector */}
            <div className="relative">
              <select
                data-testid="select-year"
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="appearance-none bg-slate-800 border border-white/15 rounded-xl px-4 py-2 pr-8 text-sm font-bold text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {years.map(y => <option key={y} value={y}>{y} он</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            </div>
            <button
              data-testid="btn-print-annual-report"
              onClick={handlePrint}
              disabled={!data || isError}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-all"
            >
              <Printer className="w-4 h-4" /> PDF тайлан
            </button>
            <button
              data-testid="btn-logout"
              onClick={() => { localStorage.removeItem("adminToken"); localStorage.removeItem("userRole"); setLocation("/select-role"); }}
              className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 border border-white/10 rounded-xl px-3 py-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">

        {/* Title banner */}
        <div className="bg-gradient-to-r from-amber-600/20 via-[#0f172a] to-slate-900/60 border border-amber-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-amber-400 tracking-wide">{year} ОНЫ ҮЙЛ АЖИЛЛАГААНЫ ТАЙЛАН</h1>
              <p className="text-white/50 text-sm mt-1">Зам гүүр, барилга угсралтын Хөвсгөл зам ХХК · Нэгтгэл тайлан</p>
            </div>
            <Calendar className="w-12 h-12 text-amber-500/40" />
          </div>
        </div>

        {isError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center text-red-400">
            Өгөгдөл татахад алдаа гарлаа. Дахин оролдоно уу.
          </div>
        )}

        {data && (
          <>
            {/* ── 1. НӨӨЦ ── */}
            <Section title="1. КОМПАНИЙН НӨӨЦ" icon={HardHat}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatCard icon={Users}    label="Нийт ажилтан"     value={res.totalEmployees ?? 0}      color="blue"   />
                <StatCard icon={Truck}    label="Нийт техник"       value={res.totalVehicles  ?? 0}      color="amber"  />
                <StatCard icon={Truck}    label="Ажлын бэлэн"      value={res.readyVehicles  ?? 0}      color="green"  />
                <StatCard icon={Package}  label="Агуулахын материал" value={res.totalWarehouseItems ?? 0} color="purple" />
                <StatCard icon={Package}  label="Дутуу нөөц"       value={res.lowStockItems   ?? 0}      color="red"    />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deptChartData.length > 0 && (
                  <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4">
                    <h3 className="text-sm font-bold text-slate-300 mb-3">Ажилтан хэлтсээр</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={deptChartData} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name"
                          label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={10}>
                          {deptChartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #ffffff20", borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {Object.entries(res.vehiclesByType ?? {}).length > 0 && (
                  <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4">
                    <h3 className="text-sm font-bold text-slate-300 mb-3">Техник төрлөөр</h3>
                    <div className="space-y-2 pt-2">
                      {Object.entries(res.vehiclesByType ?? {}).map(([t, cnt]) => (
                        <div key={t} className="flex items-center justify-between text-sm">
                          <span className="text-white/60">{t}</span>
                          <span className="font-bold text-amber-400">{String(cnt)} ш</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {/* ── 2. АЖЛЫН ГҮЙЦЭТГЭЛ ── */}
            <Section title="2. АЖЛЫН ГҮЙЦЭТГЭЛ" icon={ClipboardList}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatCard icon={ClipboardList} label="Ажлын тайлан"      value={perf.totalWorkReports ?? 0} color="blue"  />
                <StatCard icon={Truck}         label="Техникийн ажлын цаг" value={(perf.totalEquipmentHours ?? 0).toFixed(1) + " ц"} color="amber" />
                <StatCard icon={Fuel}          label="Дизель"             value={(perf.totalFuelDiesel ?? 0).toFixed(0) + " л"} color="green" />
                <StatCard icon={Fuel}          label="Бензин"             value={(perf.totalFuelPetrol ?? 0).toFixed(0) + " л"} color="purple"/>
                <StatCard icon={TrendingUp}    label="Ажлын фронт"       value={perf.totalWorkFronts ?? 0} color="white" />
              </div>

              {hourChartData.length > 0 && (
                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-slate-300 mb-4">Сарын техникийн ажлын цаг</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={hourChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #ffffff20", borderRadius: 12 }} />
                      <Bar dataKey="цаг" fill="#d97706" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {Object.keys(perf.workReportsByDept ?? {}).length > 0 && (
                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4">
                  <h3 className="text-sm font-bold text-slate-300 mb-3">Тайлан хэлтсээр</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(perf.workReportsByDept ?? {}).map(([dept, cnt]) => (
                      <div key={dept} className="bg-white/5 rounded-xl px-3 py-2 flex justify-between">
                        <span className="text-xs text-white/60">{dept}</span>
                        <span className="text-xs font-bold text-white">{String(cnt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* ── 3. ЧАНАРЫН ХЯНАЛТ ── */}
            <Section title="3. ЧАНАРЫН ХЯНАЛТ (ЛАБОРАТОРИ)" icon={FlaskConical}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={FlaskConical} label="Нийт туршилт"      value={qual.totalLabTests ?? 0}                                       color="white"  />
                <StatCard icon={ShieldCheck}  label="Тэнцсэн"           value={qual.passCount ?? 0}                                           color="green"  />
                <StatCard icon={ShieldCheck}  label="Тэнцээгүй"         value={qual.failCount ?? 0}                                           color="red"    />
                <StatCard icon={TrendingUp}   label="Тэнцэлтийн хувь"  value={passRate != null ? passRate + "%" : "—"} sub="Чанарын үзүүлэлт"
                  color={passRate == null ? "white" : passRate >= 90 ? "green" : passRate >= 70 ? "amber" : "red"} />
              </div>

              {labChartData.length > 0 && (
                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-slate-300 mb-4">Туршилтын дүн төрлөөр</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={labChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #ffffff20", borderRadius: 12 }} />
                      <Legend />
                      <Bar dataKey="тэнцсэн"    fill="#10b981" radius={[3,3,0,0]} />
                      <Bar dataKey="тэнцээгүй" fill="#ef4444" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {qual.totalLabTests === 0 && (
                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-8 text-center text-white/30">
                  {year} онд лабораторийн туршилт бүртгэгдээгүй байна
                </div>
              )}
            </Section>

            {/* ── 4. САНХҮҮГИЙН ҮР ДҮН ── */}
            <Section title="4. САНХҮҮГИЙН ҮР ДҮН" icon={Banknote}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatCard icon={ClipboardList} label="Нийт захиалга"   value={fin.totalOrders ?? 0}                                               color="blue"  />
                <StatCard icon={Banknote}      label="Захиалгын дүн"   value={fmt(fin.totalOrderAmount ?? 0, 1000000)}                           color="amber" />
                <StatCard icon={ClipboardList} label="Нийт гэрээ"      value={fin.totalContracts ?? 0}                                            color="purple"/>
                <StatCard icon={Banknote}      label="Гэрээний дүн"    value={fmt(fin.totalContractAmount ?? 0, 1000000)}                         color="green" />
                <StatCard icon={Fuel}          label="Шатахуун төсөв"  value={fmt(fin.totalFuelBudget ?? 0, 1000000)}                             color="white" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(fin.ordersByStatus ?? {}).length > 0 && (
                  <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4">
                    <h3 className="text-sm font-bold text-slate-300 mb-3">Захиалгын статус</h3>
                    {(() => {
                      const ORDER_LABELS: Record<string, string> = {
                        pending:"Хүлээгдэж байна", confirmed:"Баталгаажсан", inprogress:"Гүйцэтгэлд", done:"Дууссан", cancelled:"Цуцлагдсан",
                      };
                      return Object.entries(fin.ordersByStatus ?? {}).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between py-1.5 border-b border-white/5 text-sm">
                          <span className="text-white/60">{ORDER_LABELS[k] ?? k}</span>
                          <span className="font-bold text-white">{String(v)}</span>
                        </div>
                      ));
                    })()}
                  </div>
                )}
                {Object.keys(fin.contractsByStatus ?? {}).length > 0 && (
                  <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4">
                    <h3 className="text-sm font-bold text-slate-300 mb-3">Гэрээний статус</h3>
                    {(() => {
                      const CONTRACT_LABELS: Record<string, string> = {
                        draft:"Ноорог", active:"Хүчинтэй", completed:"Дууссан", terminated:"Цуцлагдсан",
                      };
                      return Object.entries(fin.contractsByStatus ?? {}).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between py-1.5 border-b border-white/5 text-sm">
                          <span className="text-white/60">{CONTRACT_LABELS[k] ?? k}</span>
                          <span className="font-bold text-white">{String(v)}</span>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </Section>

            {/* Footer note */}
            <div className="text-center text-white/20 text-xs pb-8">
              Зам гүүр, барилга угсралтын Хөвсгөл зам ХХК · {year} оны үйл ажиллагааны нэгтгэл тайлан · Системээс автоматаар гаргасан
            </div>
          </>
        )}
      </div>
    </div>
  );
}
