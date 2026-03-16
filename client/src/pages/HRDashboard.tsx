import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, Plus, Trash2, QrCode, LogOut, RefreshCw,
  Clock, ShieldCheck, Download, Search, Building2, HardHat, Factory, ChevronDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import QRCard from "@/components/QRCard";

function getAdminHeaders() {
  return { "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") ?? "" };
}

const DEPT_OPTIONS = [
  { value: "office", label: "Оффис", icon: Building2, color: "blue" },
  { value: "field",  label: "Талбай", icon: HardHat,  color: "amber" },
  { value: "plant",  label: "Үйлдвэр", icon: Factory, color: "green" },
];

const DEPT_LABEL: Record<string, { label: string; cls: string }> = {
  office: { label: "Оффис",   cls: "bg-blue-500/10 text-blue-400" },
  field:  { label: "Талбай",  cls: "bg-amber-500/10 text-amber-400" },
  plant:  { label: "Үйлдвэр", cls: "bg-green-500/10 text-green-400" },
};

export default function HRDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);
  const [tab, setTab] = useState<"employees" | "attendance">("employees");
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [selectedQrEmployee, setSelectedQrEmployee] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: "", department: "field", role: "", salaryBase: "" });

  const { data: employees = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/erp/employees"],
    queryFn: () => fetch("/api/erp/employees", { headers: getAdminHeaders() }).then(r => r.json()),
  });

  const { data: attendanceList = [], isLoading: attLoading } = useQuery<any[]>({
    queryKey: ["/api/erp/attendance", today],
    queryFn: () => fetch(`/api/erp/attendance?date=${today}`, { headers: getAdminHeaders() }).then(r => r.json()),
    enabled: tab === "attendance",
  });

  const addEmployee = useMutation({
    mutationFn: () => fetch("/api/erp/employees", {
      method: "POST",
      headers: getAdminHeaders(),
      body: JSON.stringify({ ...newEmp, salaryBase: parseFloat(newEmp.salaryBase) || 0 }),
    }).then(r => r.json()),
    onSuccess: (emp) => {
      qc.invalidateQueries({ queryKey: ["/api/erp/employees"] });
      setShowAddForm(false);
      setNewEmp({ name: "", department: "field", role: "", salaryBase: "" });
      toast({ title: `${emp.name} бүртгэгдлээ — QR: ${emp.qrCode}` });
      // Шинэ ажилтны QR картыг автоматаар нээнэ
      setSelectedQrEmployee(emp);
    },
    onError: () => toast({ title: "Алдаа гарлаа", variant: "destructive" }),
  });

  const deleteEmployee = useMutation({
    mutationFn: (id: number) => fetch(`/api/erp/employees/${id}`, { method: "DELETE", headers: getAdminHeaders() }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/erp/employees"] });
      toast({ title: "Ажилтан устгагдлаа" });
    },
  });

  // Хайлт + шүүлт
  const filtered = employees.filter(e => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.role?.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === "all" || e.department === filterDept;
    return matchSearch && matchDept;
  });

  // Ирцийн мэдээллийг ажилтантай холбох
  const attMap = new Map(attendanceList.map((a: any) => [a.employeeId, a]));

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-slate-900/60 backdrop-blur-xl px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-purple-600/20 rounded-xl">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-widest text-white">Хүний Нөөц</h1>
              <p className="text-xs text-slate-500">Хөвсгөл Зам ХХК — HR Систем</p>
            </div>
          </div>
          <button
            onClick={() => { localStorage.clear(); setLocation("/admin?role=HR"); }}
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
            { label: "Нийт ажилтан", value: employees.length, cls: "text-white", bg: "bg-slate-800/50" },
            { label: "Өнөөдөр ирсэн", value: attendanceList.filter((a: any) => a.checkIn).length, cls: "text-green-400", bg: "bg-green-500/10" },
            { label: "ХАБЭА баталгаажсан", value: attendanceList.filter((a: any) => a.safetyConfirmed).length, cls: "text-amber-400", bg: "bg-amber-500/10" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border border-white/10 rounded-2xl p-4 text-center`}>
              <p className={`text-3xl font-black ${s.cls}`}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          <button onClick={() => setTab("employees")} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === "employees" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
            <Users className="w-4 h-4" /> Ажилтнууд
          </button>
          <button onClick={() => setTab("attendance")} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === "attendance" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
            <Clock className="w-4 h-4" /> Өнөөдрийн ирц
          </button>
        </div>

        {/* ── АЖИЛТНУУДЫН ЖАГСААЛТ ── */}
        {tab === "employees" && (
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            {/* Toolbar */}
            <div className="px-5 py-4 border-b border-white/10 flex flex-wrap items-center gap-3">
              {/* Хайлт */}
              <div className="flex-1 min-w-48 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Нэр, албан тушаалаар хайх..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white outline-none focus:border-purple-500/50"
                />
              </div>
              {/* Хэлтсийн шүүлт */}
              <div className="relative">
                <select
                  value={filterDept}
                  onChange={e => setFilterDept(e.target.value)}
                  className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none pr-8 appearance-none"
                >
                  <option value="all">Бүх хэлтэс</option>
                  {DEPT_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-sm transition-all ml-auto"
              >
                <Plus className="w-4 h-4" /> Ажилтан нэмэх
              </button>
            </div>

            {/* Шинэ ажилтан нэмэх маягт */}
            {showAddForm && (
              <div className="p-5 border-b border-white/10 bg-purple-600/5">
                <p className="text-sm font-bold text-purple-300 mb-3">Шинэ ажилтан бүртгэх</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <input
                    value={newEmp.name}
                    onChange={e => setNewEmp(f => ({ ...f, name: e.target.value }))}
                    placeholder="Бүтэн нэр"
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none text-sm focus:border-purple-500/50"
                  />
                  <select
                    value={newEmp.department}
                    onChange={e => setNewEmp(f => ({ ...f, department: e.target.value }))}
                    className="bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
                  >
                    {DEPT_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                  <input
                    value={newEmp.role}
                    onChange={e => setNewEmp(f => ({ ...f, role: e.target.value }))}
                    placeholder="Албан тушаал"
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none text-sm focus:border-purple-500/50"
                  />
                  <input
                    value={newEmp.salaryBase}
                    onChange={e => setNewEmp(f => ({ ...f, salaryBase: e.target.value }))}
                    placeholder="Үндсэн цалин ₮"
                    type="number"
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none text-sm focus:border-purple-500/50"
                  />
                </div>
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => addEmployee.mutate()}
                    disabled={!newEmp.name || !newEmp.role || addEmployee.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition-all"
                  >
                    {addEmployee.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Бүртгэж QR үүсгэх
                  </button>
                  <button onClick={() => setShowAddForm(false)} className="px-4 py-2.5 text-slate-400 hover:text-white text-sm transition-all">
                    Болих
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">* Хадгалмагц QR карт автоматаар нээгдэж хэвлэх боломжтой болно</p>
              </div>
            )}

            {/* Ажилтны хүснэгт */}
            {isLoading ? (
              <div className="p-12 text-center text-slate-400">Уншиж байна...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                {search || filterDept !== "all" ? "Хайлтын үр дүн олдсонгүй" : "Ажилтан бүртгэгдээгүй байна"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/40">
                    <tr>
                      {["#", "Нэр", "Хэлтэс", "Албан тушаал", "Цалин", "QR код", "Ажиллагаа"].map(h => (
                        <th key={h} className="text-left p-3.5 text-slate-400 text-xs uppercase tracking-wider font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e: any, i: number) => {
                      const dept = DEPT_LABEL[e.department] ?? { label: e.department, cls: "bg-slate-500/10 text-slate-400" };
                      return (
                        <tr key={e.id} className="border-t border-white/5 hover:bg-white/2 transition-colors">
                          <td className="p-3.5 text-slate-500 text-sm">{i + 1}</td>
                          <td className="p-3.5">
                            <p className="text-white font-semibold text-sm">{e.name}</p>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${dept.cls}`}>{dept.label}</span>
                          </td>
                          <td className="p-3.5 text-slate-300 text-sm">{e.role}</td>
                          <td className="p-3.5 text-slate-400 text-sm">{e.salaryBase ? `${e.salaryBase.toLocaleString()}₮` : "—"}</td>
                          <td className="p-3.5 text-slate-500 text-xs font-mono">{e.qrCode}</td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setSelectedQrEmployee(e)}
                                title="QR карт харах, хэвлэх"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 rounded-lg text-xs font-bold transition-all"
                              >
                                <QrCode className="w-3.5 h-3.5" /> QR
                              </button>
                              <button
                                onClick={() => { if (confirm(`${e.name}-г устгах уу?`)) deleteEmployee.mutate(e.id); }}
                                className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-5 py-3 border-t border-white/5 text-xs text-slate-500">
                  Нийт {filtered.length} ажилтан
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ӨНӨӨДРИЙН ИРЦ ── */}
        {tab === "attendance" && (
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="font-bold">Өнөөдрийн ирц</h2>
                <p className="text-xs text-slate-500 mt-0.5">{today} — ХАБЭА баталгаажуулалт</p>
              </div>
              <button
                onClick={() => qc.invalidateQueries({ queryKey: ["/api/erp/attendance", today] })}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {attLoading ? (
              <div className="p-12 text-center text-slate-400">Уншиж байна...</div>
            ) : employees.length === 0 ? (
              <div className="p-12 text-center text-slate-400">Ажилтан бүртгэгдээгүй</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/40">
                    <tr>
                      {["Ажилтан", "Хэлтэс", "Ирсэн цаг", "Явсан цаг", "ХАБЭА", "Хожимдол", "Байдал"].map(h => (
                        <th key={h} className="text-left p-3.5 text-slate-400 text-xs uppercase tracking-wider font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((e: any) => {
                      const att = attMap.get(e.id);
                      const dept = DEPT_LABEL[e.department] ?? { label: e.department, cls: "bg-slate-500/10 text-slate-400" };
                      return (
                        <tr key={e.id} className="border-t border-white/5 hover:bg-white/2">
                          <td className="p-3.5">
                            <p className="text-white text-sm font-medium">{e.name}</p>
                            <p className="text-xs text-slate-500">{e.role}</p>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-1 rounded-lg text-xs ${dept.cls}`}>{dept.label}</span>
                          </td>
                          <td className="p-3.5">
                            {att?.checkIn
                              ? <span className="text-green-400 font-mono font-bold text-sm">{att.checkIn}</span>
                              : <span className="text-slate-600 text-xs">Ирээгүй</span>}
                          </td>
                          <td className="p-3.5">
                            {att?.checkOut
                              ? <span className="text-blue-400 font-mono text-sm">{att.checkOut}</span>
                              : att?.checkIn
                                ? <span className="text-slate-500 text-xs">Явааагүй</span>
                                : <span className="text-slate-700 text-xs">—</span>}
                          </td>
                          <td className="p-3.5">
                            {att?.safetyConfirmed
                              ? <span className="flex items-center gap-1 text-green-400 text-xs font-medium"><ShieldCheck className="w-3.5 h-3.5" /> Тийм</span>
                              : <span className="text-slate-600 text-xs">Үгүй</span>}
                          </td>
                          <td className="p-3.5">
                            {att?.lateMinutes > 0
                              ? <span className="text-amber-400 font-bold text-sm">+{att.lateMinutes} мин</span>
                              : att?.checkIn
                                ? <span className="text-green-400 text-xs">Цагт</span>
                                : <span className="text-slate-700 text-xs">—</span>}
                          </td>
                          <td className="p-3.5">
                            {!att?.checkIn
                              ? <span className="px-2 py-1 rounded-lg text-xs bg-slate-700/50 text-slate-400">Ирээгүй</span>
                              : att.checkOut
                                ? <span className="px-2 py-1 rounded-lg text-xs bg-blue-500/10 text-blue-400">Дууссан</span>
                                : <span className="px-2 py-1 rounded-lg text-xs bg-green-500/10 text-green-400">Ажиллаж байна</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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
