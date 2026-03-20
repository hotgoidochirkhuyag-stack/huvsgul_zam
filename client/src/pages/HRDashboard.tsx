import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, Plus, Trash2, QrCode, LogOut, RefreshCw,
  Clock, ShieldCheck, Download, Search, Building2, HardHat, Factory, ChevronDown,
  Pencil, X, Check, Award, GraduationCap, Wrench, AlertTriangle, CheckCircle2,
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
  const [tab, setTab] = useState<"employees" | "attendance" | "certs" | "trainings" | "skills">("employees");
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [selectedQrEmployee, setSelectedQrEmployee] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: "", department: "field", role: "", salaryBase: "", phone: "", registerNumber: "" });
  const [regError, setRegError] = useState("");
  const [editEmp, setEditEmp] = useState<any>(null);
  const [editRegError, setEditRegError] = useState("");

  // Монгол улсын регистрийн дугаарын стандарт: 2 кирилл үсэг + 8 цифр (жишээ: АА12345678)
  const MN_REG = /^[А-ЯӨҮЁ]{2}\d{8}$/;
  const validateReg = (val: string) => {
    if (!val) return "";
    return MN_REG.test(val.toUpperCase()) ? "" : "Буруу формат. Жишээ: АА12345678 (2 үсэг + 8 цифр)";
  };

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
      body: JSON.stringify({
        ...newEmp,
        salaryBase: parseFloat(newEmp.salaryBase) || 0,
        registerNumber: newEmp.registerNumber ? newEmp.registerNumber.toUpperCase() : undefined,
      }),
    }).then(r => r.json()),
    onSuccess: (emp) => {
      qc.invalidateQueries({ queryKey: ["/api/erp/employees"] });
      setShowAddForm(false);
      setNewEmp({ name: "", department: "field", role: "", salaryBase: "", phone: "", registerNumber: "" });
      setRegError("");
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

  const updateEmployee = useMutation({
    mutationFn: () => fetch(`/api/erp/employees/${editEmp.id}`, {
      method: "PATCH",
      headers: getAdminHeaders(),
      body: JSON.stringify({
        name:           editEmp.name,
        department:     editEmp.department,
        role:           editEmp.role,
        salaryBase:     parseFloat(editEmp.salaryBase) || 0,
        phone:          editEmp.phone || null,
        registerNumber: editEmp.registerNumber ? editEmp.registerNumber.toUpperCase() : null,
      }),
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/erp/employees"] });
      setEditEmp(null);
      setEditRegError("");
      toast({ title: "Мэдээлэл шинэчлэгдлээ" });
    },
    onError: () => toast({ title: "Алдаа гарлаа", variant: "destructive" }),
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
            onClick={() => { localStorage.removeItem("adminToken"); localStorage.removeItem("userRole"); setLocation("/select-role"); }}
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
        <div className="flex flex-wrap gap-2 mb-5">
          {([
            { key: "employees",  label: "Ажилтнууд",      icon: Users          },
            { key: "attendance", label: "Өнөөдрийн ирц",  icon: Clock          },
            { key: "certs",      label: "Гэрчилгээ",       icon: Award          },
            { key: "trainings",  label: "Сургалт/ХАБЭА",   icon: GraduationCap  },
            { key: "skills",     label: "Чадварын матриц", icon: Wrench         },
          ] as { key: typeof tab; label: string; icon: any }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === t.key ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Бүтэн нэр */}
                  <input
                    value={newEmp.name}
                    onChange={e => setNewEmp(f => ({ ...f, name: e.target.value }))}
                    placeholder="Бүтэн нэр *"
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none text-sm focus:border-purple-500/50"
                  />
                  {/* Хэлтэс */}
                  <select
                    value={newEmp.department}
                    onChange={e => setNewEmp(f => ({ ...f, department: e.target.value }))}
                    className="bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
                  >
                    {DEPT_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                  {/* Албан тушаал */}
                  <input
                    value={newEmp.role}
                    onChange={e => setNewEmp(f => ({ ...f, role: e.target.value }))}
                    placeholder="Албан тушаал *"
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none text-sm focus:border-purple-500/50"
                  />
                  {/* Регистрийн дугаар */}
                  <div className="flex flex-col gap-1">
                    <div className="relative">
                      <input
                        value={newEmp.registerNumber}
                        onChange={e => {
                          const raw = e.target.value.toUpperCase().replace(/[^А-ЯӨҮЁ\d]/g, "").slice(0, 10);
                          setNewEmp(f => ({ ...f, registerNumber: raw }));
                          setRegError(validateReg(raw));
                        }}
                        placeholder="Регистрийн дугаар (АА12345678)"
                        maxLength={10}
                        className={`w-full bg-white/5 border rounded-xl px-4 py-2.5 text-white outline-none text-sm font-mono tracking-widest ${
                          regError ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-purple-500/50"
                        }`}
                      />
                      {newEmp.registerNumber.length === 10 && !regError && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 text-xs">✓</span>
                      )}
                    </div>
                    {regError && <p className="text-red-400 text-xs px-1">{regError}</p>}
                    <p className="text-slate-600 text-[10px] px-1">Жишээ: АА12345678 — 2 кирилл үсэг + 8 цифр</p>
                  </div>
                  {/* Утасны дугаар */}
                  <input
                    value={newEmp.phone}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^\d+\-\s]/g, "").slice(0, 15);
                      setNewEmp(f => ({ ...f, phone: raw }));
                    }}
                    placeholder="Утасны дугаар (жишээ: 99112233)"
                    type="tel"
                    maxLength={15}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none text-sm focus:border-purple-500/50"
                  />
                  {/* Үндсэн цалин */}
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
                    disabled={!newEmp.name || !newEmp.role || !!regError || addEmployee.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition-all"
                  >
                    {addEmployee.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Бүртгэж QR үүсгэх
                  </button>
                  <button
                    onClick={() => { setShowAddForm(false); setRegError(""); }}
                    className="px-4 py-2.5 text-slate-400 hover:text-white text-sm transition-all"
                  >
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
                      {["#", "Нэр", "Хэлтэс", "Албан тушаал", "Регистр", "Утас", "Цалин", "QR / Ажиллагаа"].map(h => (
                        <th key={h} className="text-left p-3.5 text-slate-400 text-xs uppercase tracking-wider font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e: any, i: number) => {
                      const dept = DEPT_LABEL[e.department] ?? { label: e.department, cls: "bg-slate-500/10 text-slate-400" };
                      const isEditing = editEmp?.id === e.id;

                      if (isEditing) {
                        return (
                          <tr key={e.id} className="border-t border-purple-500/30 bg-purple-600/5">
                            <td className="p-2.5 text-slate-500 text-sm">{i + 1}</td>
                            {/* Нэр */}
                            <td className="p-2">
                              <input
                                value={editEmp.name}
                                onChange={ev => setEditEmp((f: any) => ({ ...f, name: ev.target.value }))}
                                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-purple-500/50"
                              />
                            </td>
                            {/* Хэлтэс */}
                            <td className="p-2">
                              <select
                                value={editEmp.department}
                                onChange={ev => setEditEmp((f: any) => ({ ...f, department: ev.target.value }))}
                                className="w-full bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm outline-none"
                              >
                                {DEPT_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                              </select>
                            </td>
                            {/* Албан тушаал */}
                            <td className="p-2">
                              <input
                                value={editEmp.role}
                                onChange={ev => setEditEmp((f: any) => ({ ...f, role: ev.target.value }))}
                                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-purple-500/50"
                              />
                            </td>
                            {/* Регистр */}
                            <td className="p-2">
                              <div className="flex flex-col gap-0.5">
                                <input
                                  value={editEmp.registerNumber ?? ""}
                                  onChange={ev => {
                                    const raw = ev.target.value.toUpperCase().replace(/[^А-ЯӨҮЁ\d]/g, "").slice(0, 10);
                                    setEditEmp((f: any) => ({ ...f, registerNumber: raw }));
                                    setEditRegError(validateReg(raw));
                                  }}
                                  placeholder="АА12345678"
                                  maxLength={10}
                                  className={`w-full bg-slate-800 border rounded-lg px-3 py-1.5 text-white text-sm font-mono outline-none ${editRegError ? "border-red-500/50" : "border-white/10 focus:border-purple-500/50"}`}
                                />
                                {editRegError && <p className="text-red-400 text-[10px]">{editRegError}</p>}
                              </div>
                            </td>
                            {/* Утас */}
                            <td className="p-2">
                              <input
                                value={editEmp.phone ?? ""}
                                onChange={ev => {
                                  const raw = ev.target.value.replace(/[^\d+\-\s]/g, "").slice(0, 15);
                                  setEditEmp((f: any) => ({ ...f, phone: raw }));
                                }}
                                placeholder="99112233"
                                type="tel"
                                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-purple-500/50"
                              />
                            </td>
                            {/* Цалин */}
                            <td className="p-2">
                              <input
                                value={editEmp.salaryBase ?? ""}
                                onChange={ev => setEditEmp((f: any) => ({ ...f, salaryBase: ev.target.value }))}
                                type="number"
                                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-purple-500/50"
                              />
                            </td>
                            {/* Хадгалах / Цуцлах */}
                            <td className="p-2">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => updateEmployee.mutate()}
                                  disabled={!editEmp.name || !editEmp.role || !!editRegError || updateEmployee.isPending}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all"
                                >
                                  {updateEmployee.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                  Хадгалах
                                </button>
                                <button
                                  onClick={() => { setEditEmp(null); setEditRegError(""); }}
                                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={e.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                          <td className="p-3.5 text-slate-500 text-sm">{i + 1}</td>
                          <td className="p-3.5">
                            <p className="text-white font-semibold text-sm">{e.name}</p>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${dept.cls}`}>{dept.label}</span>
                          </td>
                          <td className="p-3.5 text-slate-300 text-sm">{e.role}</td>
                          <td className="p-3.5">
                            {e.registerNumber
                              ? <span className="font-mono text-xs bg-slate-800 px-2 py-1 rounded-lg text-slate-300 tracking-widest">{e.registerNumber}</span>
                              : <span className="text-slate-600 text-xs">—</span>}
                          </td>
                          <td className="p-3.5 text-slate-400 text-sm">
                            {e.phone ?? <span className="text-slate-600 text-xs">—</span>}
                          </td>
                          <td className="p-3.5 text-slate-400 text-sm">{e.salaryBase ? `${e.salaryBase.toLocaleString()}₮` : "—"}</td>
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
                                onClick={() => {
                                  setEditEmp({ ...e, salaryBase: e.salaryBase ?? "" });
                                  setEditRegError("");
                                  setShowAddForm(false);
                                }}
                                title="Засварлах"
                                className="p-1.5 text-purple-400/60 hover:text-purple-400 hover:bg-purple-500/20 rounded-lg transition-all"
                              >
                                <Pencil className="w-3.5 h-3.5" />
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

      {/* ── ГЭРЧИЛГЭЭ ── */}
      {tab === "certs" && <CertsTab employees={employees} qc={qc} toast={toast} />}

      {/* ── СУРГАЛТ / ХАБЭА ── */}
      {tab === "trainings" && <TrainingsTab employees={employees} qc={qc} toast={toast} />}

      {/* ── ЧАДВАРЫН МАТРИЦ ── */}
      {tab === "skills" && <SkillsTab employees={employees} qc={qc} toast={toast} />}

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

// ===================== ГЭРЧИЛГЭЭНИЙ ТАБ =====================
const CERT_TYPES: Record<string, string> = {
  driver_a: "Жолооч A анги", driver_b: "Жолооч B анги", driver_c: "Жолооч C анги",
  driver_d: "Жолооч D анги", welder: "Гагнуурчин", electrician: "Цахилгаанчин",
  crane: "Кран оператор", excavator: "Экскаватор оператор", хабэа: "ХАБЭА", other: "Бусад",
};

function expiryBadge(expiryDate: string | null | undefined) {
  if (!expiryDate) return <span className="px-2 py-0.5 rounded-lg text-xs bg-slate-700/50 text-slate-400">Хугацаагүй</span>;
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
  if (days < 0)   return <span className="px-2 py-0.5 rounded-lg text-xs bg-red-500/20 text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Дууссан</span>;
  if (days <= 30)  return <span className="px-2 py-0.5 rounded-lg text-xs bg-orange-500/20 text-orange-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{days}өдөр үлдсэн</span>;
  if (days <= 90)  return <span className="px-2 py-0.5 rounded-lg text-xs bg-yellow-500/20 text-yellow-400">{days}өдөр үлдсэн</span>;
  return <span className="px-2 py-0.5 rounded-lg text-xs bg-green-500/20 text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Хүчинтэй</span>;
}

function CertsTab({ employees, qc, toast }: { employees: any[]; qc: any; toast: any }) {
  const hdrs = () => ({ "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") ?? "" });
  const [filterEmp, setFilterEmp] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeId: "", certType: "driver_b", certName: "", certNumber: "", issuedBy: "", issuedDate: "", expiryDate: "", notes: "" });

  const { data: certs = [] } = useQuery<any[]>({
    queryKey: ["/api/employee-certificates"],
    queryFn: () => fetch("/api/employee-certificates", { headers: hdrs() }).then(r => r.json()),
  });
  const addMut = useMutation({
    mutationFn: (d: any) => fetch("/api/employee-certificates", { method: "POST", headers: hdrs(), body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/employee-certificates"] }); setShowForm(false); toast({ title: "Гэрчилгээ нэмэгдлээ" }); },
    onError: (e: any) => toast({ title: "Алдаа", description: e.message, variant: "destructive" }),
  });
  const delMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/employee-certificates/${id}`, { method: "DELETE", headers: hdrs() }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/employee-certificates"] }),
  });
  const empMap: Record<number, string> = {};
  employees.forEach(e => { empMap[e.id] = e.name; });
  const filtered = filterEmp === "all" ? certs : certs.filter(c => c.employeeId === parseInt(filterEmp));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-white flex items-center gap-2"><Award className="w-5 h-5 text-purple-400" />Мэргэжлийн гэрчилгээ</h2>
        <div className="flex items-center gap-2">
          <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)}
            className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
            <option value="all">Бүх ажилтан</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl transition-all">
            <Plus className="w-4 h-4" /> Нэмэх
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-slate-900/80 border border-purple-500/30 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2 font-semibold text-purple-300 text-sm mb-1">Шинэ гэрчилгээ нэмэх</div>
          <select value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}
            className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
            <option value="">Ажилтан сонгох</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select value={form.certType} onChange={e => { const label = CERT_TYPES[e.target.value]; setForm(p => ({ ...p, certType: e.target.value, certName: label })); }}
            className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
            {Object.entries(CERT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input value={form.certName} onChange={e => setForm(p => ({ ...p, certName: e.target.value }))}
            placeholder="Гэрчилгээний нэр" className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          <input value={form.certNumber} onChange={e => setForm(p => ({ ...p, certNumber: e.target.value }))}
            placeholder="Гэрчилгээний дугаар" className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          <input value={form.issuedBy} onChange={e => setForm(p => ({ ...p, issuedBy: e.target.value }))}
            placeholder="Олгосон байгууллага" className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          <div>
            <label className="text-xs text-white/40 mb-1 block">Олгосон огноо</label>
            <input type="date" value={form.issuedDate} onChange={e => setForm(p => ({ ...p, issuedDate: e.target.value }))}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Дуусах огноо</label>
            <input type="date" value={form.expiryDate} onChange={e => setForm(p => ({ ...p, expiryDate: e.target.value }))}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          </div>
          <div className="md:col-span-2 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-700 text-slate-300 text-sm rounded-xl">Цуцлах</button>
            <button onClick={() => { if (!form.employeeId || !form.certName) return; addMut.mutate({ ...form, employeeId: parseInt(form.employeeId) }); }}
              disabled={addMut.isPending}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl transition-all">
              Хадгалах
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/60">
            <tr className="text-left text-white/50 text-xs">
              <th className="px-4 py-3">Ажилтан</th>
              <th className="px-4 py-3">Гэрчилгээ</th>
              <th className="px-4 py-3">Дугаар</th>
              <th className="px-4 py-3">Олгосон</th>
              <th className="px-4 py-3">Дуусах</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-white/30">Гэрчилгээ бүртгэгдээгүй байна</td></tr>
            )}
            {filtered.map((c: any) => (
              <tr key={c.id} className="border-t border-white/5 hover:bg-white/3">
                <td className="px-4 py-3 font-medium text-white">{empMap[c.employeeId] ?? "—"}</td>
                <td className="px-4 py-3 text-white/70">{c.certName}</td>
                <td className="px-4 py-3 text-white/50">{c.certNumber ?? "—"}</td>
                <td className="px-4 py-3 text-white/50">{c.issuedDate ?? "—"}</td>
                <td className="px-4 py-3 text-white/50">{c.expiryDate ?? "—"}</td>
                <td className="px-4 py-3">{expiryBadge(c.expiryDate)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => delMut.mutate(c.id)} className="text-red-400/60 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===================== СУРГАЛТЫН ТАБ =====================
const TRAINING_TYPES: Record<string, string> = {
  хабэа_ерөнхий: "ХАБЭА ерөнхий", хабэа_тусгай: "ХАБЭА тусгай", гэрэл_дохио: "Гэрэл дохио",
  анхны_тусламж: "Анхны тусламж", гал_унтраах: "Гал унтраах", мэргэшлийн: "Мэргэшлийн", other: "Бусад",
};

function TrainingsTab({ employees, qc, toast }: { employees: any[]; qc: any; toast: any }) {
  const hdrs = () => ({ "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") ?? "" });
  const [filterEmp, setFilterEmp] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeId: "", trainingType: "хабэа_ерөнхий", trainingName: "ХАБЭА ерөнхий сургалт", completedDate: "", nextDueDate: "", conductedBy: "", hoursCompleted: "", passed: true, notes: "" });

  const { data: trainings = [] } = useQuery<any[]>({
    queryKey: ["/api/employee-trainings"],
    queryFn: () => fetch("/api/employee-trainings", { headers: hdrs() }).then(r => r.json()),
  });
  const addMut = useMutation({
    mutationFn: (d: any) => fetch("/api/employee-trainings", { method: "POST", headers: hdrs(), body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/employee-trainings"] }); setShowForm(false); toast({ title: "Сургалт нэмэгдлээ" }); },
  });
  const delMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/employee-trainings/${id}`, { method: "DELETE", headers: hdrs() }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/employee-trainings"] }),
  });
  const empMap: Record<number, string> = {};
  employees.forEach(e => { empMap[e.id] = e.name; });
  const filtered = filterEmp === "all" ? trainings : trainings.filter((t: any) => t.employeeId === parseInt(filterEmp));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-white flex items-center gap-2"><GraduationCap className="w-5 h-5 text-purple-400" />Сургалт / ХАБЭА бүртгэл</h2>
        <div className="flex items-center gap-2">
          <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)}
            className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
            <option value="all">Бүх ажилтан</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl transition-all">
            <Plus className="w-4 h-4" /> Нэмэх
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-slate-900/80 border border-purple-500/30 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2 font-semibold text-purple-300 text-sm mb-1">Сургалт бүртгэх</div>
          <select value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}
            className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
            <option value="">Ажилтан сонгох</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select value={form.trainingType} onChange={e => { setForm(p => ({ ...p, trainingType: e.target.value, trainingName: TRAINING_TYPES[e.target.value] })); }}
            className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
            {Object.entries(TRAINING_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input value={form.trainingName} onChange={e => setForm(p => ({ ...p, trainingName: e.target.value }))}
            placeholder="Сургалтын нэр" className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          <input value={form.conductedBy} onChange={e => setForm(p => ({ ...p, conductedBy: e.target.value }))}
            placeholder="Зохион байгуулагч" className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          <input type="number" value={form.hoursCompleted} onChange={e => setForm(p => ({ ...p, hoursCompleted: e.target.value }))}
            placeholder="Цаг (тоо)" className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
            <input type="checkbox" checked={form.passed} onChange={e => setForm(p => ({ ...p, passed: e.target.checked }))} className="accent-purple-500" />
            Тэнцсэн (хамарлаа)
          </label>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Явуулсан огноо</label>
            <input type="date" value={form.completedDate} onChange={e => setForm(p => ({ ...p, completedDate: e.target.value }))}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Дараагийн давтан сургалт</label>
            <input type="date" value={form.nextDueDate} onChange={e => setForm(p => ({ ...p, nextDueDate: e.target.value }))}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          </div>
          <div className="md:col-span-2 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-700 text-slate-300 text-sm rounded-xl">Цуцлах</button>
            <button onClick={() => { if (!form.employeeId || !form.completedDate) return; addMut.mutate({ ...form, employeeId: parseInt(form.employeeId), hoursCompleted: form.hoursCompleted ? parseInt(form.hoursCompleted) : null, nextDueDate: form.nextDueDate || null }); }}
              disabled={addMut.isPending}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl transition-all">
              Хадгалах
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/60">
            <tr className="text-left text-white/50 text-xs">
              <th className="px-4 py-3">Ажилтан</th>
              <th className="px-4 py-3">Сургалт</th>
              <th className="px-4 py-3">Хийсэн огноо</th>
              <th className="px-4 py-3">Цаг</th>
              <th className="px-4 py-3">Дараагийн</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-white/30">Сургалт бүртгэгдээгүй байна</td></tr>
            )}
            {filtered.map((t: any) => (
              <tr key={t.id} className="border-t border-white/5 hover:bg-white/3">
                <td className="px-4 py-3 font-medium text-white">{empMap[t.employeeId] ?? "—"}</td>
                <td className="px-4 py-3 text-white/70">{t.trainingName}</td>
                <td className="px-4 py-3 text-white/50">{t.completedDate}</td>
                <td className="px-4 py-3 text-white/50">{t.hoursCompleted ? `${t.hoursCompleted}ц` : "—"}</td>
                <td className="px-4 py-3 text-white/50">{t.nextDueDate ?? "—"}</td>
                <td className="px-4 py-3">{expiryBadge(t.nextDueDate)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => delMut.mutate(t.id)} className="text-red-400/60 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===================== ЧАДВАРЫН МАТРИЦ ТАБ =====================
const VEHICLE_TYPES = ["Экскаватор", "Бульдозер", "Автомашин", "Грейдер", "Асфальт угсраалт", "Кран", "Автогрейдер", "Дам зам тавих", "Компрессор", "Өөр"];
const SKILL_LEVELS: Record<string, { label: string; cls: string }> = {
  эхлэгч:      { label: "Эхлэгч",      cls: "bg-blue-500/20 text-blue-300"   },
  дундд:        { label: "Дунд",         cls: "bg-yellow-500/20 text-yellow-300"},
  мэргэжлийн:  { label: "Мэргэжлийн",  cls: "bg-green-500/20 text-green-300" },
};

function SkillsTab({ employees, qc, toast }: { employees: any[]; qc: any; toast: any }) {
  const hdrs = () => ({ "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") ?? "" });
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "matrix">("matrix");
  const [form, setForm] = useState({ employeeId: "", vehicleType: "Экскаватор", skillLevel: "мэргэжлийн", certifiedBy: "", validFrom: "", validUntil: "", notes: "" });

  const { data: skills = [] } = useQuery<any[]>({
    queryKey: ["/api/employee-skills"],
    queryFn: () => fetch("/api/employee-skills", { headers: hdrs() }).then(r => r.json()),
  });
  const addMut = useMutation({
    mutationFn: (d: any) => fetch("/api/employee-skills", { method: "POST", headers: hdrs(), body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/employee-skills"] }); setShowForm(false); toast({ title: "Чадвар нэмэгдлээ" }); },
  });
  const delMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/employee-skills/${id}`, { method: "DELETE", headers: hdrs() }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/employee-skills"] }),
  });

  const empMap: Record<number, string> = {};
  employees.forEach(e => { empMap[e.id] = e.name; });

  // Matrix data: employeeId → vehicleType → skill
  const matrix: Record<number, Record<string, any>> = {};
  skills.forEach((s: any) => {
    if (!matrix[s.employeeId]) matrix[s.employeeId] = {};
    matrix[s.employeeId][s.vehicleType] = s;
  });
  const empIdsWithSkills = Object.keys(matrix).map(Number);

  // Only vehicle types that appear in skills
  const usedTypes = Array.from(new Set(skills.map((s: any) => s.vehicleType)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-white flex items-center gap-2"><Wrench className="w-5 h-5 text-purple-400" />Чадварын матриц</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode(viewMode === "matrix" ? "list" : "matrix")}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-bold rounded-xl transition-all">
            {viewMode === "matrix" ? "Жагсаалт" : "Матриц"}
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl transition-all">
            <Plus className="w-4 h-4" /> Нэмэх
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-slate-900/80 border border-purple-500/30 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2 font-semibold text-purple-300 text-sm mb-1">Чадвар бүртгэх</div>
          <select value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}
            className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
            <option value="">Ажилтан сонгох</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select value={form.vehicleType} onChange={e => setForm(p => ({ ...p, vehicleType: e.target.value }))}
            className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
            {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={form.skillLevel} onChange={e => setForm(p => ({ ...p, skillLevel: e.target.value }))}
            className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
            {Object.entries(SKILL_LEVELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <input value={form.certifiedBy} onChange={e => setForm(p => ({ ...p, certifiedBy: e.target.value }))}
            placeholder="Зөвшөөрсөн хүн" className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          <div>
            <label className="text-xs text-white/40 mb-1 block">Эхлэх огноо</label>
            <input type="date" value={form.validFrom} onChange={e => setForm(p => ({ ...p, validFrom: e.target.value }))}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Дуусах огноо</label>
            <input type="date" value={form.validUntil} onChange={e => setForm(p => ({ ...p, validUntil: e.target.value }))}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          </div>
          <div className="md:col-span-2 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-700 text-slate-300 text-sm rounded-xl">Цуцлах</button>
            <button onClick={() => { if (!form.employeeId) return; addMut.mutate({ ...form, employeeId: parseInt(form.employeeId), validFrom: form.validFrom || null, validUntil: form.validUntil || null }); }}
              disabled={addMut.isPending}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl transition-all">
              Хадгалах
            </button>
          </div>
        </div>
      )}

      {viewMode === "matrix" && (
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-auto">
          {empIdsWithSkills.length === 0 ? (
            <div className="text-center py-8 text-white/30">Чадварын матриц хоосон байна. Дээрх "Нэмэх" товчоор ажилтны чадварыг бүртгэнэ үү.</div>
          ) : (
            <table className="w-full text-xs min-w-[600px]">
              <thead className="bg-slate-800/60">
                <tr>
                  <th className="px-4 py-3 text-left text-white/50 font-semibold w-32">Ажилтан</th>
                  {usedTypes.map(t => <th key={t} className="px-2 py-3 text-center text-white/50 font-semibold">{t}</th>)}
                </tr>
              </thead>
              <tbody>
                {empIdsWithSkills.map(eid => (
                  <tr key={eid} className="border-t border-white/5">
                    <td className="px-4 py-2.5 font-semibold text-white text-sm">{empMap[eid] ?? `#${eid}`}</td>
                    {usedTypes.map(vt => {
                      const s = matrix[eid]?.[vt];
                      if (!s) return <td key={vt} className="px-2 py-2.5 text-center text-white/15">—</td>;
                      const lv = SKILL_LEVELS[s.skillLevel] ?? { label: s.skillLevel, cls: "bg-slate-700 text-slate-300" };
                      return (
                        <td key={vt} className="px-2 py-2.5 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${lv.cls}`}>{lv.label}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {viewMode === "list" && (
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/60">
              <tr className="text-left text-white/50 text-xs">
                <th className="px-4 py-3">Ажилтан</th>
                <th className="px-4 py-3">Техникийн төрөл</th>
                <th className="px-4 py-3">Чадварын түвшин</th>
                <th className="px-4 py-3">Зөвшөөрсөн</th>
                <th className="px-4 py-3">Хүртэл</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {skills.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-white/30">Чадвар бүртгэгдээгүй</td></tr>}
              {skills.map((s: any) => {
                const lv = SKILL_LEVELS[s.skillLevel] ?? { label: s.skillLevel, cls: "bg-slate-700 text-slate-300" };
                return (
                  <tr key={s.id} className="border-t border-white/5 hover:bg-white/3">
                    <td className="px-4 py-3 font-medium text-white">{empMap[s.employeeId] ?? "—"}</td>
                    <td className="px-4 py-3 text-white/70">{s.vehicleType}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${lv.cls}`}>{lv.label}</span></td>
                    <td className="px-4 py-3 text-white/50">{s.certifiedBy ?? "—"}</td>
                    <td className="px-4 py-3 text-white/50">{s.validUntil ?? "—"}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => delMut.mutate(s.id)} className="text-red-400/60 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
