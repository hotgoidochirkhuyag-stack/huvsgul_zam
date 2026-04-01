import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NotificationBell from "@/components/NotificationBell";
import {
  Users, Plus, Trash2, QrCode, LogOut, RefreshCw,
  Clock, ShieldCheck, Download, Search, Building2, HardHat, Factory, ChevronDown,
  Pencil, X, Check, Award, GraduationCap, Wrench, AlertTriangle, CheckCircle2,
  Calculator, Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import QRCard from "@/components/QRCard";

function getAdminHeaders() {
  return { "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") ?? "" };
}

const DEPT_OPTIONS = [
  { value: "road",      label: "Зам гүүрийн төслийн",            icon: HardHat,   color: "yellow" },
  { value: "asphalt",   label: "Асфальт бетон хольцын үйлдвэр",  icon: Factory,   color: "orange" },
  { value: "concrete",  label: "Бетон зуурмагийн үйлдвэр",        icon: Factory,   color: "blue" },
  { value: "crushing",  label: "Бутлан ангилах үйлдвэр",          icon: HardHat,   color: "red" },
  { value: "materials", label: "Барилгын материалын үйлдвэрлэл",  icon: Building2, color: "green" },
  { value: "office",    label: "Оффисын",                         icon: Building2, color: "purple" },
  { value: "utility",   label: "Аж ахуйн",                        icon: HardHat,   color: "slate" },
];

const DEPT_LABEL: Record<string, { label: string; cls: string }> = {
  road:      { label: "Зам гүүрийн төслийн",           cls: "bg-yellow-500/10 text-yellow-400" },
  asphalt:   { label: "Асфальт бетон хольцын үйлдвэр", cls: "bg-orange-500/10 text-orange-400" },
  concrete:  { label: "Бетон зуурмагийн үйлдвэр",       cls: "bg-blue-500/10 text-blue-400" },
  crushing:  { label: "Бутлан ангилах үйлдвэр",         cls: "bg-red-500/10 text-red-400" },
  materials: { label: "Барилгын материалын үйлдвэрлэл", cls: "bg-green-500/10 text-green-400" },
  office:    { label: "Оффисын",                        cls: "bg-purple-500/10 text-purple-400" },
  utility:   { label: "Аж ахуйн",                       cls: "bg-slate-500/10 text-slate-400" },
  field:     { label: "Талбай",                         cls: "bg-amber-500/10 text-amber-400" },
  plant:     { label: "Үйлдвэр",                        cls: "bg-green-500/10 text-green-400" },
};

export default function HRDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);
  const [tab, setTab] = useState<"employees" | "attendance" | "certs" | "trainings" | "skills" | "norms">("employees");
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [selectedQrEmployee, setSelectedQrEmployee] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: "", department: "asphalt", role: "", salaryBase: "", phone: "", registerNumber: "" });
  const [regError, setRegError] = useState("");
  const [editEmp, setEditEmp] = useState<any>(null);
  const [editRegError, setEditRegError] = useState("");

  // Монгол улсын регистрийн дугаарын стандарт: 2 кирилл үсэг + 8 цифр (жишээ: АА12345678)
  const MN_REG = /^[А-ЯӨҮЁ]{2}\d{8}$/;
  const validateReg = (val: string) => {
    if (!val) return "";
    return MN_REG.test(val.toUpperCase()) ? "" : "Буруу формат. Жишээ: АА12345678 (2 үсэг + 8 цифр)";
  };

  const { data: _empRaw, isLoading } = useQuery<any>({
    queryKey: ["/api/erp/employees"],
    queryFn: () => fetch("/api/erp/employees", { headers: getAdminHeaders() }).then(r => r.json()),
  });
  const employees: any[] = Array.isArray(_empRaw) ? _empRaw : [];

  const { data: _attRaw, isLoading: attLoading } = useQuery<any>({
    queryKey: ["/api/erp/attendance", today],
    queryFn: () => fetch(`/api/erp/attendance?date=${today}`, { headers: getAdminHeaders() }).then(r => r.json()),
    enabled: tab === "attendance",
  });
  const attendanceList: any[] = Array.isArray(_attRaw) ? _attRaw : [];

  // Ур чадварын нэмэгдэл (skill bonus)
  const { data: _bonusRaw } = useQuery<any>({
    queryKey: ["/api/employees/skill-bonuses"],
    queryFn: () => fetch("/api/employees/skill-bonuses", { headers: getAdminHeaders() }).then(r => r.json()),
  });
  const bonusList: { employeeId: number; avgLevel: number; bonusPct: number; count: number }[] =
    Array.isArray(_bonusRaw) ? _bonusRaw : [];
  const bonusMap: Record<number, { avgLevel: number; bonusPct: number; count: number }> = {};
  bonusList.forEach(b => { bonusMap[b.employeeId] = { avgLevel: b.avgLevel, bonusPct: b.bonusPct, count: b.count }; });

  // Цалингийн тооцоолол
  const [calcEmpId, setCalcEmpId] = useState<number | null>(null);
  const [calcMonth, setCalcMonth] = useState(new Date().toISOString().slice(0, 7));
  const { data: calcData, isLoading: calcLoading } = useQuery<any>({
    queryKey: ["/api/salary-calc", calcEmpId, calcMonth],
    queryFn: () => fetch(`/api/salary-calc/${calcEmpId}?month=${calcMonth}`, { headers: getAdminHeaders() }).then(r => r.json()),
    enabled: calcEmpId !== null,
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
      setNewEmp({ name: "", department: "asphalt", role: "", salaryBase: "", phone: "", registerNumber: "" });
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
          <div className="flex items-center gap-2">
            <button onClick={() => setLocation("/price-proposals")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-400 border border-amber-600/40 hover:bg-amber-600/10 rounded-xl transition-all"
              data-testid="btn-price-proposals">
              <Sparkles size={12} /> Үнийн санал
            </button>
            <NotificationBell role="HR" />
            <button
              onClick={() => { localStorage.removeItem("adminToken"); localStorage.removeItem("userRole"); setLocation("/select-role"); }}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-xl text-sm transition-all"
            >
              <LogOut className="w-4 h-4" /> Гарах
            </button>
          </div>
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
            { key: "norms",      label: "Хөдөлмөрийн норм", icon: Factory       },
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
                      {["#", "Нэр", "Хэлтэс", "Албан тушаал", "Регистр", "Утас", "Цалин", "Ур чадварын нэмэгдэл", "QR / Ажиллагаа"].map(h => (
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
                            {/* Ур чадварын нэмэгдэл — засварлах үед харуулахгүй */}
                            <td className="p-2 text-slate-600 text-xs italic">Хадгалсны дараа шинэчлэгдэнэ</td>
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

                      const bonus = bonusMap[e.id];
                      const bonusAmt = bonus ? Math.round((e.salaryBase ?? 0) * bonus.bonusPct / 100) : 0;

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
                          <td className="p-3.5 text-sm">
                            <div className="text-slate-400">{e.salaryBase ? `${e.salaryBase.toLocaleString()}₮` : "—"}</div>
                            {bonus && bonusAmt > 0 && (
                              <div className="text-green-400 text-xs mt-0.5">+{bonusAmt.toLocaleString()}₮ нэмэгдэл</div>
                            )}
                          </td>
                          <td className="p-3.5" data-testid={`cell-skill-bonus-${e.id}`}>
                            {!bonus ? (
                              <span className="text-xs text-slate-600 italic">Үнэлгээ хийгдээгүй</span>
                            ) : bonus.bonusPct === 0 ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-slate-500">Дундаж: {bonus.avgLevel}</span>
                                <span className="text-xs text-slate-600">Нэмэгдэлгүй</span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-bold w-fit ${
                                  bonus.bonusPct === 50 ? "bg-amber-500/20 text-amber-300" :
                                  bonus.bonusPct === 30 ? "bg-green-500/20 text-green-300" :
                                  "bg-blue-500/20 text-blue-300"
                                }`}>+{bonus.bonusPct}%</span>
                                <span className="text-[10px] text-slate-500">Дундаж: {bonus.avgLevel} ({bonus.count} чадвар)</span>
                              </div>
                            )}
                          </td>
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
                                onClick={() => setCalcEmpId(e.id)}
                                title="Цалингийн тооцоолол"
                                data-testid={`btn-salary-calc-${e.id}`}
                                className="p-1.5 text-green-400/70 hover:text-green-300 hover:bg-green-500/20 rounded-lg transition-all"
                              >
                                <Calculator className="w-3.5 h-3.5" />
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

      {/* ── ХӨДӨЛМӨРИЙН НОРМ ── */}
      {tab === "norms" && <NormsTab qc={qc} toast={toast} />}

      {/* QR карт modal */}
      {selectedQrEmployee && (
        <QRCard
          employee={selectedQrEmployee}
          onClose={() => setSelectedQrEmployee(null)}
        />
      )}

      {/* Цалингийн тооцоолол modal */}
      {calcEmpId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/15 rounded-xl">
                  <Calculator className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">Цалингийн тооцоолол</h3>
                  <p className="text-slate-400 text-xs mt-0.5">{calcData?.employee?.name ?? "..."}</p>
                </div>
              </div>
              <button onClick={() => setCalcEmpId(null)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Сар сонгогч */}
            <div className="px-5 pt-4 flex items-center gap-3">
              <label className="text-slate-400 text-xs font-medium whitespace-nowrap">Тооцоолох сар:</label>
              <input
                type="month"
                value={calcMonth}
                onChange={e => setCalcMonth(e.target.value)}
                className="bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-green-500/50"
              />
            </div>

            {/* Агуулга */}
            <div className="p-5 space-y-3">
              {calcLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 text-green-400 animate-spin" />
                </div>
              ) : calcData?.error ? (
                <p className="text-red-400 text-sm text-center py-4">{calcData.error}</p>
              ) : calcData ? (
                <>
                  {/* Үндсэн цалин */}
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <span className="text-slate-400 text-sm">Үндсэн цалин</span>
                    <span className="text-white font-semibold">{(calcData.base ?? 0).toLocaleString()}₮</span>
                  </div>

                  {/* Ур чадварын нэмэгдэл */}
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <div>
                      <span className="text-slate-400 text-sm">Ур чадварын нэмэгдэл</span>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Дундаж: {calcData.skill?.avgLevel ?? 0} ({calcData.skill?.count ?? 0} чадвар)
                      </div>
                    </div>
                    <div className="text-right">
                      {calcData.skill?.bonusPct > 0 ? (
                        <>
                          <span className={`text-sm font-bold ${calcData.skill.bonusPct === 50 ? "text-amber-400" : calcData.skill.bonusPct === 30 ? "text-green-400" : "text-blue-400"}`}>
                            +{calcData.skill.bonusPct}%
                          </span>
                          <div className="text-xs text-green-300">+{(calcData.skill.bonus ?? 0).toLocaleString()}₮</div>
                        </>
                      ) : (
                        <span className="text-slate-500 text-sm">0%</span>
                      )}
                    </div>
                  </div>

                  {/* KPI нэмэгдэл */}
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <div>
                      <span className="text-slate-400 text-sm">KPI гүйцэтгэл</span>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {calcData.kpi?.totalTasks === 0
                          ? "Тухайн сард даалгавар байхгүй"
                          : `${calcData.kpi?.doneTasks}/${calcData.kpi?.totalTasks} даалгавар`}
                      </div>
                    </div>
                    <div className="text-right">
                      {calcData.kpi?.kpiPct !== null ? (
                        <>
                          <span className={`text-sm font-bold ${(calcData.kpi?.kpiPct ?? 0) >= 90 ? "text-green-400" : (calcData.kpi?.kpiPct ?? 0) >= 75 ? "text-blue-400" : "text-slate-400"}`}>
                            {calcData.kpi?.kpiPct}% → +{calcData.kpi?.bonusPct}%
                          </span>
                          <div className="text-xs text-green-300">+{(calcData.kpi?.bonus ?? 0).toLocaleString()}₮</div>
                        </>
                      ) : (
                        <span className="text-slate-500 text-sm">Мэдээлэл алга</span>
                      )}
                    </div>
                  </div>

                  {/* ХАБЭА коэффициент */}
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <div>
                      <span className="text-slate-400 text-sm">ХАБЭА коэффициент</span>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {calcData.hab?.habDays ?? calcData.att?.days ?? 0}/{calcData.hab?.totalPresent ?? calcData.att?.days ?? 0} өдөр аюулгүй ({calcData.hab?.pct ?? calcData.att?.pct ?? 0}%)
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${(calcData.hab?.coeff ?? calcData.att?.coeff ?? 1) < 0.9 ? "text-red-400" : (calcData.hab?.coeff ?? calcData.att?.coeff ?? 1) < 1 ? "text-amber-400" : "text-green-400"}`}>
                      × {calcData.hab?.coeff ?? calcData.att?.coeff ?? 1}
                    </span>
                  </div>

                  {/* Нийт */}
                  <div className="mt-2 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-slate-400 text-xs">Нэмэгдлийн өмнөх дүн:</span>
                      <span className="text-slate-300 text-sm">{(calcData.subtotal ?? 0).toLocaleString()}₮</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white font-bold text-sm">Гарт авах дүн:</span>
                      <span className="text-green-400 font-bold text-xl">{(calcData.finalSalary ?? 0).toLocaleString()}₮</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 text-center">
                      Нэмэгдэл: +{((calcData.finalSalary ?? 0) - (calcData.base ?? 0)).toLocaleString()}₮ ({calcData.base > 0 ? Math.round(((calcData.finalSalary - calcData.base) / calcData.base) * 100) : 0}%)
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
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

  const { data: _certsRaw } = useQuery<any>({
    queryKey: ["/api/employee-certificates"],
    queryFn: () => fetch("/api/employee-certificates", { headers: hdrs() }).then(r => r.json()),
  });
  const certs: any[] = Array.isArray(_certsRaw) ? _certsRaw : [];
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

  const { data: _trainRaw } = useQuery<any>({
    queryKey: ["/api/employee-trainings"],
    queryFn: () => fetch("/api/employee-trainings", { headers: hdrs() }).then(r => r.json()),
  });
  const trainings: any[] = Array.isArray(_trainRaw) ? _trainRaw : [];
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
const SKILL_CATEGORIES: { group: string; items: string[] }[] = [
  {
    group: "🛣️ Зам барилга",
    items: [
      "Зам зураглал (Survey)",
      "Газар шорооны ажил (Earthwork)",
      "Дэвсгэр давхарга тавих (Base course)",
      "Асфальт бетон хучилт (Asphalt paving)",
      "Замын тэмдэглэгээ (Road marking)",
      "Ус зайлуулах шуудуу (Drainage)",
    ],
  },
  {
    group: "🌉 Гүүр барилга",
    items: [
      "Гүүрийн суурь (Foundation)",
      "Гүүрийн тулгуур (Pier/Abutment)",
      "Дам нуруу угсрах (Beam erection)",
      "Гүүрийн дэр цутгах (Bridge deck)",
      "Гүүрийн ерөнхий угсралт (Bridge assembly)",
    ],
  },
  {
    group: "🏗️ Бетон зуурмаг",
    items: [
      "Бетон найрлага тооцоолох (Mix design)",
      "Бетон зуурах (Mixing operation)",
      "Гулсамал шалгалт (Slump test)",
      "Бетон цутгах (Pouring)",
      "Бетоны чанар хяналт (QC)",
      "Хатуурал хяналт (Curing)",
    ],
  },
  {
    group: "🧱 Бетон хийцлэл",
    items: [
      "Арматур зэрэгцүүлэх (Rebar layout)",
      "Арматур гагнах (Rebar welding)",
      "Хэвлэг угсрах (Formwork)",
      "Хэвлэг задлах (Stripping)",
      "Төмөр бетон хийц угсралт (RC assembly)",
      "Дефектоскопи шалгалт (Inspection)",
    ],
  },
  {
    group: "⚙️ Техник хэрэгсэл",
    items: [
      "Экскаватор", "Бульдозер", "Грейдер", "Автогрейдер",
      "Асфальт угсраалт", "Кран", "Компрессор", "Думпер", "Бетон насос",
    ],
  },
  {
    group: "📋 Бусад",
    items: ["Нормчлол (Estimating)", "ХАБЭА хяналт", "Лабораторийн шинжилгээ", "Өөр"],
  },
];

const VEHICLE_TYPES = SKILL_CATEGORIES.flatMap(c => c.items);

const SKILL_LEVELS: Record<string, { label: string; cls: string }> = {
  шинэ:        { label: "Шинэ",        cls: "bg-blue-400/20 text-blue-300"    },
  туршлагатай: { label: "Туршлагатай", cls: "bg-yellow-500/20 text-yellow-300"},
  мэргэшсэн:   { label: "Мэргэшсэн",  cls: "bg-green-500/20 text-green-300"  },
};

const LEVEL_META: Record<number, { label: string; cls: string; short: string }> = {
  1: { label: "Шинэ",        short: "1",  cls: "bg-blue-500/20 text-blue-300 border border-blue-500/30"      },
  2: { label: "Туршлагатай", short: "2",  cls: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30" },
  3: { label: "Мэргэшсэн",  short: "3",  cls: "bg-green-500/20 text-green-300 border border-green-500/30"    },
  4: { label: "Мастер",      short: "4",  cls: "bg-amber-500/20 text-amber-300 border border-amber-500/30"    },
};

function SkillsTab({ employees, qc, toast }: { employees: any[]; qc: any; toast: any }) {
  const hdrs = () => ({ "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") ?? "" });

  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [commissionNumber, setCommissionNumber] = useState("");
  const [levels, setLevels] = useState<Record<number, number>>({});   // skillId → level (1-4)
  const [viewEmpId, setViewEmpId] = useState<number | null>(null);

  // 1. Бүх чадварын сан
  const { data: _skillsRaw, isLoading: loadingSkills } = useQuery<any>({
    queryKey: ["/api/skills"],
    queryFn: () => fetch("/api/skills", { headers: hdrs() }).then(r => r.json()),
  });
  const allSkills: any[] = Array.isArray(_skillsRaw) ? _skillsRaw : [];

  // 2. Ажилтны одоогийн үнэлгээ
  const { data: _assRaw, isLoading: loadingAss } = useQuery<any>({
    queryKey: ["/api/skill-assessments", selectedEmpId],
    queryFn: () => selectedEmpId
      ? fetch(`/api/skill-assessments?employeeId=${selectedEmpId}`, { headers: hdrs() }).then(r => r.json())
      : Promise.resolve([]),
    enabled: !!selectedEmpId,
  });
  const assessments: any[] = Array.isArray(_assRaw) ? _assRaw : [];

  // assessments ирэхэд levels-д хуулна (зөвхөн шинэ өгөгдөл ирэхэд)
  const assessmentKey = assessments.map((a: any) => `${a.skillId}:${a.level}`).join(",");
  const [lastKey, setLastKey] = useState("");
  if (assessmentKey !== lastKey && assessments.length > 0) {
    setLastKey(assessmentKey);
    const m: Record<number, number> = {};
    assessments.forEach((a: any) => { m[a.skillId] = a.level; });
    setLevels(m);
    if (assessments[0]?.commissionNumber) setCommissionNumber(assessments[0].commissionNumber);
  }

  // 3. Хадгалах
  const saveMut = useMutation({
    mutationFn: (body: any) => fetch("/api/skill-assessments/upsert", { method: "POST", headers: hdrs(), body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/skill-assessments"] });
      toast({ title: `✅ ${data.saved} чадварын үнэлгээ хадгалагдлаа` });
    },
    onError: () => toast({ title: "Алдаа гарлаа", variant: "destructive" }),
  });

  // 4. Ангилалуудаар бүлэглэх
  const categories = Array.from(new Set(allSkills.map((s: any) => s.category)));

  // 5. Хуудасны бүтэц
  const empMap: Record<number, string> = {};
  employees.forEach(e => { empMap[e.id] = e.name; });

  const canSave = !!selectedEmpId && commissionNumber.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const assessmentList = Object.entries(levels)
      .filter(([, lv]) => lv > 0)
      .map(([skillId, level]) => ({ skillId: parseInt(skillId), level }));
    saveMut.mutate({ employeeId: selectedEmpId, commissionNumber: commissionNumber.trim(), assessments: assessmentList });
  };

  return (
    <div className="space-y-5">
      {/* Гарчиг */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-white flex items-center gap-2">
          <Wrench className="w-5 h-5 text-purple-400" />Ур чадварын матриц
        </h2>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-300">1 — Шинэ</span>
          <span className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-300">2 — Туршлагатай</span>
          <span className="px-2 py-1 rounded bg-green-500/10 text-green-300">3 — Мэргэшсэн</span>
          <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-300">4 — Мастер</span>
        </div>
      </div>

      {/* Ажилтан + Комиссын дугаар */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-white/50 mb-1.5 block font-semibold">Ажилтан сонгох</label>
            <select
              data-testid="select-employee"
              value={selectedEmpId ?? ""}
              onChange={e => {
                const id = e.target.value ? parseInt(e.target.value) : null;
                setSelectedEmpId(id);
                setLevels({});
                setCommissionNumber("");
              }}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50">
              <option value="">— Ажилтан сонгох —</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block font-semibold">
              Үнэлгээний комиссын шийдвэрийн дугаар <span className="text-red-400">*</span>
            </label>
            <input
              data-testid="input-commission-number"
              value={commissionNumber}
              onChange={e => setCommissionNumber(e.target.value)}
              placeholder="Жнь: КШ-2025/001"
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 placeholder:text-white/20"
            />
            {!commissionNumber.trim() && selectedEmpId && (
              <p className="text-xs text-red-400/70 mt-1">⚠ Дугаарыг заавал бөглөнө үү</p>
            )}
          </div>
        </div>

        {/* Чадварын жагсаалт + радио товч */}
        {selectedEmpId && (
          <div className="mt-2 space-y-4">
            {loadingSkills || loadingAss ? (
              <div className="text-center py-6 text-white/30 text-sm">Уншиж байна...</div>
            ) : (
              <>
                {categories.map(cat => {
                  const catSkills = allSkills.filter((s: any) => s.category === cat);
                  return (
                    <div key={cat}>
                      <div className="text-xs font-bold text-purple-300 mb-2 pb-1 border-b border-white/10">{cat}</div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[500px]">
                          <thead>
                            <tr className="text-xs text-white/30">
                              <th className="text-left py-1.5 pr-4 font-normal w-64">Чадвар</th>
                              {[1,2,3,4].map(lv => (
                                <th key={lv} className="text-center py-1.5 px-3 font-normal">
                                  <span className={`px-2 py-0.5 rounded text-xs ${LEVEL_META[lv].cls}`}>{lv}</span>
                                </th>
                              ))}
                              <th className="text-center py-1.5 px-2 font-normal text-white/20">Цэвэрлэх</th>
                            </tr>
                          </thead>
                          <tbody>
                            {catSkills.map((skill: any) => (
                              <tr key={skill.id} className="border-t border-white/5 hover:bg-white/2">
                                <td className="py-2 pr-4 text-white/80 text-xs leading-snug">{skill.name}</td>
                                {[1,2,3,4].map(lv => (
                                  <td key={lv} className="text-center py-2 px-3">
                                    <input
                                      type="radio"
                                      data-testid={`radio-skill-${skill.id}-level-${lv}`}
                                      name={`skill-${skill.id}`}
                                      checked={levels[skill.id] === lv}
                                      onChange={() => setLevels(prev => ({ ...prev, [skill.id]: lv }))}
                                      className="w-4 h-4 accent-purple-500 cursor-pointer"
                                    />
                                  </td>
                                ))}
                                <td className="text-center py-2 px-2">
                                  {levels[skill.id] && (
                                    <button
                                      onClick={() => setLevels(prev => { const n = { ...prev }; delete n[skill.id]; return n; })}
                                      className="text-white/20 hover:text-red-400 transition-colors text-xs">✕</button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}

                {/* Хадгалах товч */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <span className="text-xs text-white/30">
                    {Object.values(levels).filter(v => v > 0).length} чадвар үнэлэгдсэн
                  </span>
                  <button
                    data-testid="button-save-assessments"
                    onClick={handleSave}
                    disabled={!canSave || saveMut.isPending}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      canSave
                        ? "bg-purple-600 hover:bg-purple-500 text-white"
                        : "bg-slate-700 text-slate-500 cursor-not-allowed"
                    }`}>
                    <Check className="w-4 h-4" />
                    {saveMut.isPending ? "Хадгалж байна..." : "Хадгалах"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {!selectedEmpId && (
          <div className="text-center py-8 text-white/20 text-sm">
            Дээрээс ажилтан сонгоод үнэлгээ хийнэ үү
          </div>
        )}
      </div>

      {/* Бүх ажилтнуудын дүн харах */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
          <span className="text-sm font-bold text-white/70">Ажилтнуудын үнэлгээ харах</span>
          <select
            data-testid="select-view-employee"
            value={viewEmpId ?? ""}
            onChange={e => setViewEmpId(e.target.value ? parseInt(e.target.value) : null)}
            className="bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none">
            <option value="">— Ажилтан сонгох —</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <ViewAssessments empId={viewEmpId} allSkills={allSkills} hdrs={hdrs} />
      </div>
    </div>
  );
}

function ViewAssessments({ empId, allSkills, hdrs }: { empId: number | null; allSkills: any[]; hdrs: () => Record<string,string> }) {
  const { data: _raw } = useQuery<any>({
    queryKey: ["/api/skill-assessments", empId],
    queryFn: () => empId
      ? fetch(`/api/skill-assessments?employeeId=${empId}`, { headers: hdrs() }).then(r => r.json())
      : Promise.resolve([]),
    enabled: !!empId,
  });
  const assessments: any[] = Array.isArray(_raw) ? _raw : [];

  if (!empId) return <div className="text-center py-6 text-white/20 text-xs">Ажилтан сонгоно уу</div>;
  if (assessments.length === 0) return <div className="text-center py-6 text-white/20 text-xs">Үнэлгээ бүртгэгдээгүй байна</div>;

  const skillMap: Record<number, any> = {};
  allSkills.forEach(s => { skillMap[s.id] = s; });

  const commNum = assessments[0]?.commissionNumber ?? "—";

  return (
    <div className="p-4 space-y-3">
      <div className="text-xs text-white/40">Комиссын шийдвэрийн дугаар: <span className="text-amber-300 font-semibold">{commNum}</span></div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-white/30">
              <th className="text-left py-2 pr-4">Чадвар</th>
              <th className="text-left py-2">Ангилал</th>
              <th className="text-center py-2">Түвшин</th>
            </tr>
          </thead>
          <tbody>
            {assessments.map((a: any) => {
              const skill = skillMap[a.skillId];
              const lm = LEVEL_META[a.level];
              return (
                <tr key={a.id} className="border-t border-white/5">
                  <td className="py-1.5 pr-4 text-white/80">{skill?.name ?? `#${a.skillId}`}</td>
                  <td className="py-1.5 text-white/40">{skill?.category ?? "—"}</td>
                  <td className="py-1.5 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${lm?.cls ?? ""}`}>{lm?.label ?? a.level}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// ХӨДӨЛМӨРИЙН НОРМ ТАБ
// ──────────────────────────────────────────────────────────────────────────────
const PRODUCT_TYPES = [
  { value: "foam_block",    label: "Хөөсөн бетон блок" },
  { value: "concrete_b25", label: "Бетон B25" },
  { value: "concrete_b30", label: "Бетон B30" },
  { value: "asphalt",      label: "Асфальт холимог" },
  { value: "crushed_stone", label: "Бутлагдсан хайрга" },
  { value: "road_base",    label: "Зам суурь" },
];

function NormsTab({ qc, toast }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    productType: "foam_block", productLabel: "Хөөсөн бетон блок",
    roleName: "", unitsPerPersonPerDay: "", unit: "ш", hourlyRate: "", hoursPerDay: "8",
  });

  const { data: norms = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/labor-norms"],
    queryFn: () => fetch("/api/labor-norms").then(r => r.json()),
  });

  const addNorm = useMutation({
    mutationFn: () => fetch("/api/labor-norms", {
      method: "POST",
      headers: getAdminHeaders(),
      body: JSON.stringify({
        ...form,
        unitsPerPersonPerDay: parseFloat(form.unitsPerPersonPerDay),
        hourlyRate: parseFloat(form.hourlyRate) || 0,
        hoursPerDay: parseFloat(form.hoursPerDay) || 8,
      }),
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/labor-norms"] });
      setShowAdd(false);
      setForm({ productType: "foam_block", productLabel: "Хөөсөн бетон блок", roleName: "", unitsPerPersonPerDay: "", unit: "ш", hourlyRate: "", hoursPerDay: "8" });
      toast({ title: "Норм нэмэгдлээ" });
    },
  });

  const deleteNorm = useMutation({
    mutationFn: (id: number) => fetch(`/api/labor-norms/${id}`, { method: "DELETE", headers: getAdminHeaders() }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/labor-norms"] }); toast({ title: "Устгагдлаа" }); },
  });

  return (
    <div className="max-w-5xl mx-auto px-6 pb-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white font-black text-lg">Хөдөлмөрийн норм</h2>
          <p className="text-slate-400 text-xs mt-0.5">Бүтээгдэхүүн тус бүрийн мэргэжил + өдрийн гарц норм</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-sm transition-all">
          <Plus className="w-4 h-4" /> Норм нэмэх
        </button>
      </div>

      {showAdd && (
        <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-5 mb-6">
          <p className="text-white font-bold mb-4">Шинэ норм нэмэх</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Бүтээгдэхүүн</label>
              <select value={form.productType}
                onChange={e => {
                  const pt = PRODUCT_TYPES.find(p => p.value === e.target.value);
                  setForm(f => ({ ...f, productType: e.target.value, productLabel: pt?.label ?? e.target.value }));
                }}
                className="w-full bg-slate-700 border border-white/10 rounded-xl px-3 py-2 text-white text-sm">
                {PRODUCT_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Мэргэжил / Үүрэг</label>
              <input value={form.roleName} onChange={e => setForm(f => ({ ...f, roleName: e.target.value }))}
                placeholder="Операторч, Туслах ажилчин..."
                className="w-full bg-slate-700 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">1 хүн өдөрт хэдийг хийдэг вэ?</label>
              <div className="flex gap-2">
                <input type="number" value={form.unitsPerPersonPerDay}
                  onChange={e => setForm(f => ({ ...f, unitsPerPersonPerDay: e.target.value }))}
                  placeholder="150"
                  className="flex-1 bg-slate-700 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
                <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  placeholder="ш"
                  className="w-16 bg-slate-700 border border-white/10 rounded-xl px-3 py-2 text-white text-sm text-center" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Цагийн тариф (₮)</label>
              <input type="number" value={form.hourlyRate}
                onChange={e => setForm(f => ({ ...f, hourlyRate: e.target.value }))}
                placeholder="15000"
                className="w-full bg-slate-700 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => addNorm.mutate()} disabled={!form.roleName || !form.unitsPerPersonPerDay || addNorm.isPending}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all">
              {addNorm.isPending ? "Хадгалж байна..." : "Хадгалах"}
            </button>
            <button onClick={() => setShowAdd(false)}
              className="px-5 py-2 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded-xl text-sm transition-all">
              Болих
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-slate-400 py-10">Уншиж байна...</div>
      ) : norms.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-bold">Норм бүртгэгдээгүй байна</p>
          <p className="text-xs mt-1">Дээрх "Норм нэмэх" товчоор нэмнэ үү</p>
        </div>
      ) : (
        <div className="space-y-4">
          {PRODUCT_TYPES.map(pt => {
            const rows = norms.filter((n: any) => n.productType === pt.value);
            if (rows.length === 0) return null;
            return (
              <div key={pt.value} className="bg-slate-800/50 border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 bg-purple-600/10 border-b border-white/5 flex items-center gap-2">
                  <Factory className="w-4 h-4 text-purple-400" />
                  <span className="text-white font-bold text-sm">{pt.label}</span>
                  <span className="ml-auto text-xs text-slate-400">{rows.length} мэргэжил</span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-white/5">
                      <th className="text-left px-5 py-2">Мэргэжил</th>
                      <th className="text-center px-4 py-2">1 хүн/өдөр</th>
                      <th className="text-center px-4 py-2">Цаг/нэгж</th>
                      <th className="text-center px-4 py-2">Цагийн тариф</th>
                      <th className="w-10 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {rows.map((n: any) => (
                      <tr key={n.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-5 py-2.5 text-white font-medium">{n.roleName}</td>
                        <td className="px-4 py-2.5 text-center text-amber-400 font-bold">
                          {n.unitsPerPersonPerDay} {n.unit}
                        </td>
                        <td className="px-4 py-2.5 text-center text-slate-300">
                          {((n.hoursPerDay ?? 8) / n.unitsPerPersonPerDay).toFixed(3)} цаг
                        </td>
                        <td className="px-4 py-2.5 text-center text-green-400">
                          {n.hourlyRate ? `₮${n.hourlyRate.toLocaleString()}` : "—"}
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <button onClick={() => deleteNorm.mutate(n.id)}
                            className="text-red-400/50 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
