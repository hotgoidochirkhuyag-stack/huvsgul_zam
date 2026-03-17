import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Wrench, LogOut, CheckCircle2, XCircle, ClipboardList,
  Plus, ChevronDown, ChevronUp, Loader2, Car, User,
  AlertTriangle, CheckCheck, Clock, RefreshCw,
  PhoneCall, MessageCircle, Siren, MapPin, FileText,
  ClipboardCheck, Users, ChevronRight, Video, VideoOff, Copy, Check, Link2,
} from "lucide-react";
import type { Vehicle, VehicleInspection, Employee, BreakdownRequest } from "@shared/schema";

/* ─── Стандарт үзлэгийн зүйлс ─── */
const DEFAULT_CHECKS = [
  "Хөдөлгүүрийн тос, тослолт",
  "Хөргөлтийн шингэн (усны температур)",
  "Тоормосны систем",
  "Дугуйн даралт ба элэгдэл",
  "Гэрэл, дохио, дугаар",
  "Удирдлагын систем (хулдан)",
  "Аюулгүйн бүс",
  "Агаарын шүүлтүүр",
  "Шатахуун болон мастил алдагдал шалгах",
  "Кабин, дотор тоноглол",
  "Ажлын зэвсэглэл, тоног төхөөрөмж",
  "Гал унтраагч байгаа эсэх",
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  open:        { label: "Шийдвэрлэгдээгүй", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  in_progress: { label: "Явж байна",          color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  resolved:    { label: "Шийдвэрлэгдсэн",    color: "bg-green-500/20 text-green-400 border-green-500/30" },
};

function hdrs() {
  return {
    "Content-Type": "application/json",
    "x-admin-token": localStorage.getItem("adminToken") ?? "",
  };
}
function today() { return new Date().toISOString().slice(0, 10); }
function fmtTime(d: any) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" });
}
function fmtDateTime(d: any) {
  if (!d) return "";
  return new Date(d).toLocaleString("mn-MN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/* ════════════════════════════════════════════════════
   TAB 1 — Техникийн өмнөх үзлэг
════════════════════════════════════════════════════ */
function InspectionForm({ vehicles, onDone }: { vehicles: Vehicle[]; onDone: () => void }) {
  const qc = useQueryClient();
  const [vehicleId, setVehicleId] = useState<number | "">("");
  const [employeeName, setEmployeeName] = useState("");
  const [notes, setNotes] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>(
    Object.fromEntries(DEFAULT_CHECKS.map(k => [k, true]))
  );
  const allPassed = Object.values(checks).every(Boolean);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/checkin/vehicle-inspection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: Number(vehicleId), employeeName: employeeName.trim(),
          checks: JSON.stringify(DEFAULT_CHECKS.map(item => ({ item, ok: checks[item], note: "" }))),
          passed: allPassed, notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Алдаа");
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/erp/vehicle-inspections-today"] }); onDone(); },
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">Техник сонгох</label>
          <select data-testid="select-vehicle" value={vehicleId}
            onChange={e => setVehicleId(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/60">
            <option value="">— Техник сонгоно уу —</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.plateNumber} — {v.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">Үзлэг хийсэн ажилтан</label>
          <input data-testid="input-employee-name" type="text" value={employeeName}
            onChange={e => setEmployeeName(e.target.value)} placeholder="Овог нэр"
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/60" />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs text-slate-400 uppercase tracking-wider">Үзлэгийн зүйлс</label>
          <div className="flex gap-3">
            <button type="button" onClick={() => setChecks(Object.fromEntries(DEFAULT_CHECKS.map(k => [k, true])))}
              className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1">
              <CheckCheck size={12} /> Бүгд тэнцлэв
            </button>
            <button type="button" onClick={() => setChecks(Object.fromEntries(DEFAULT_CHECKS.map(k => [k, false])))}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
              <XCircle size={12} /> Бүгд арилгах
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {DEFAULT_CHECKS.map(item => (
            <button key={item} type="button" onClick={() => setChecks(p => ({ ...p, [item]: !p[item] }))}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left text-sm transition-all ${
                checks[item] ? "bg-green-500/10 border-green-500/30 text-green-300" : "bg-red-500/10 border-red-500/30 text-red-300"
              }`}>
              {checks[item] ? <CheckCircle2 size={16} className="shrink-0" /> : <XCircle size={16} className="shrink-0" />}
              {item}
            </button>
          ))}
        </div>
      </div>
      <textarea data-testid="input-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2}
        placeholder="Тэмдэглэл (заавал биш)..."
        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/60 resize-none" />
      <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border ${
        allPassed ? "bg-green-500/10 border-green-500/30 text-green-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
        {allPassed ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
        <span className="font-semibold text-sm">
          {allPassed ? "Техник ашиглалтад бэлэн — тэнцсэн" : "Зарим зүйл тэнцэлгүй — техник ашиглаж болохгүй"}
        </span>
      </div>
      <button data-testid="btn-submit-inspection" onClick={() => mutation.mutate()}
        disabled={vehicleId === "" || employeeName.trim().length === 0 || mutation.isPending}
        className="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-widest bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
        {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        Үзлэг бүртгэх
      </button>
      {mutation.isError && <p className="text-red-400 text-sm text-center">Алдаа гарлаа.</p>}
    </div>
  );
}

function InspectionRow({ insp, vehicles }: { insp: VehicleInspection; vehicles: Vehicle[] }) {
  const [open, setOpen] = useState(false);
  const vehicle = vehicles.find(v => v.id === insp.vehicleId);
  let checksArr: { item: string; ok: boolean }[] = [];
  try { checksArr = JSON.parse(insp.checks); } catch { /* */ }
  const failedItems = checksArr.filter(c => !c.ok);
  return (
    <div data-testid={`inspection-row-${insp.id}`} className="bg-slate-900/60 border border-white/10 rounded-xl overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setOpen(o => !o)}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${insp.passed ? "bg-green-500/20" : "bg-red-500/20"}`}>
          {insp.passed ? <CheckCircle2 className="text-green-400" size={20} /> : <XCircle className="text-red-400" size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm">{insp.employeeName}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${insp.passed ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
              {insp.passed ? "Тэнцсэн" : "Тэнцэлгүй"}
            </span>
            {failedItems.length > 0 && <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">{failedItems.length} зүйл дутуу</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-slate-400 flex items-center gap-1"><Car size={11} />
              {vehicle ? `${vehicle.plateNumber} — ${vehicle.name}` : `Техник #${insp.vehicleId}`}
            </span>
            <span className="text-xs text-slate-500 flex items-center gap-1"><Clock size={11} />{fmtTime(insp.createdAt)}</span>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
      </div>
      {open && (
        <div className="px-5 pb-4 border-t border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mt-3">
            {checksArr.map((c, i) => (
              <div key={i} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${c.ok ? "text-green-300 bg-green-500/5" : "text-red-300 bg-red-500/10"}`}>
                {c.ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}{c.item}
              </div>
            ))}
          </div>
          {insp.notes && <p className="mt-3 text-xs text-slate-400 italic">{insp.notes}</p>}
        </div>
      )}
    </div>
  );
}

function InspectionTab({ vehicles }: { vehicles: Vehicle[] }) {
  const [showForm, setShowForm] = useState(false);
  const todayStr = today();
  const { data: allInspections = [], isLoading, refetch } = useQuery<VehicleInspection[]>({
    queryKey: ["/api/erp/vehicle-inspections-today"],
    queryFn: () => fetch(`/api/erp/vehicle-inspections?date=${todayStr}`, { headers: hdrs() }).then(r => r.json()),
    refetchInterval: 30_000,
  });
  const inspections = useMemo(() => [...allInspections].sort((a, b) =>
    new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()), [allInspections]);
  const passedCount = inspections.filter(i => i.passed).length;
  const failedCount = inspections.filter(i => !i.passed).length;

  return (
    <div className="space-y-6">
      {/* Өнөөдрийн товч */}
      <div className="grid grid-cols-3 gap-4">
        <div data-testid="stat-total" className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 text-center">
          <div className="text-3xl font-black text-white mb-1">{inspections.length}</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider">Нийт үзлэг</div>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 text-center">
          <div className="text-3xl font-black text-green-400 mb-1">{passedCount}</div>
          <div className="text-xs text-green-500/80 uppercase tracking-wider">Тэнцсэн</div>
        </div>
        <div className={`rounded-2xl p-5 text-center border ${failedCount > 0 ? "bg-red-500/10 border-red-500/20" : "bg-slate-900/60 border-white/10"}`}>
          <div className={`text-3xl font-black mb-1 ${failedCount > 0 ? "text-red-400" : "text-slate-500"}`}>{failedCount}</div>
          <div className={`text-xs uppercase tracking-wider ${failedCount > 0 ? "text-red-500/80" : "text-slate-500"}`}>Тэнцэлгүй</div>
        </div>
      </div>

      {/* Шинэ үзлэг */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
        <button data-testid="btn-toggle-form" onClick={() => setShowForm(p => !p)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-600/20 rounded-lg flex items-center justify-center">
              <Plus className="text-amber-400" size={16} />
            </div>
            <span className="font-bold text-sm uppercase tracking-wider">Шинэ үзлэг бүртгэх</span>
          </div>
          {showForm ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>
        {showForm && (
          <div className="px-6 pb-6 border-t border-white/10 pt-5">
            {vehicles.length === 0
              ? <p className="text-slate-400 text-sm text-center py-6">Техник бүртгэгдээгүй байна.</p>
              : <InspectionForm vehicles={vehicles} onDone={() => setShowForm(false)} />}
          </div>
        )}
      </div>

      {/* Өнөөдрийн үзлэгүүд */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ClipboardList size={18} className="text-amber-400" />
            <h2 className="font-bold text-sm uppercase tracking-wider">Өнөөдрийн үзлэгүүд</h2>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{inspections.length}</span>
          </div>
          <button onClick={() => refetch()} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs">
            <RefreshCw size={12} /> Шинэчлэх
          </button>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 gap-2"><Loader2 size={20} className="animate-spin" /> Ачааллаж байна...</div>
        ) : inspections.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-white/5">
            <Car size={40} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400 text-sm">Өнөөдөр үзлэг хийгдээгүй байна</p>
          </div>
        ) : (
          <div className="space-y-3">{inspections.map(insp => <InspectionRow key={insp.id} insp={insp} vehicles={vehicles} />)}</div>
        )}
      </div>

      {/* Техникийн хяналт */}
      {vehicles.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Car size={18} className="text-blue-400" />
            <h2 className="font-bold text-sm uppercase tracking-wider">Техникийн хяналт</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {vehicles.map(v => {
              const todayInsp = inspections.find(i => i.vehicleId === v.id);
              return (
                <div key={v.id} data-testid={`vehicle-card-${v.id}`}
                  className={`bg-slate-900/60 border rounded-xl px-4 py-3 ${todayInsp ? todayInsp.passed ? "border-green-500/30" : "border-red-500/30" : "border-white/10"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm text-white">{v.plateNumber}</p>
                      <p className="text-xs text-slate-400">{v.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{v.type}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${todayInsp ? todayInsp.passed ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400" : "bg-slate-700/50 text-slate-400"}`}>
                      {todayInsp ? todayInsp.passed ? "✓ Тэнцсэн" : "✗ Тэнцэлгүй" : "Үзлэггүй"}
                    </span>
                  </div>
                  {todayInsp && <p className="text-xs text-slate-500 mt-2 flex items-center gap-1"><User size={10} />{todayInsp.employeeName}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   TAB 2 — Техник эвдэрсэн / Тусламж
════════════════════════════════════════════════════ */
function BreakdownForm({ vehicles, onDone }: { vehicles: Vehicle[]; onDone: () => void }) {
  const qc = useQueryClient();
  const [vehicleId, setVehicleId] = useState<number | "">("");
  const [reportedBy, setReportedBy] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [problem, setProblem] = useState("");

  const selectedVehicle = vehicles.find(v => v.id === Number(vehicleId));

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/erp/breakdowns", {
        method: "POST", headers: hdrs(),
        body: JSON.stringify({
          vehicleId: vehicleId !== "" ? Number(vehicleId) : undefined,
          vehicleName: selectedVehicle ? `${selectedVehicle.plateNumber} ${selectedVehicle.name}` : undefined,
          reportedBy: reportedBy.trim(), phone: phone.trim() || undefined,
          location: location.trim(), problem: problem.trim(),
        }),
      });
      if (!res.ok) throw new Error("Алдаа");
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/erp/breakdowns"] }); onDone(); },
  });

  const canSubmit = reportedBy.trim() && location.trim() && problem.trim();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">Эвдэрсэн техник</label>
          <select data-testid="select-bd-vehicle" value={vehicleId}
            onChange={e => setVehicleId(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/60">
            <option value="">— Сонгох (заавал биш) —</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.plateNumber} — {v.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">Мэдэгдсэн ажилтан *</label>
          <input data-testid="input-bd-reporter" type="text" value={reportedBy} onChange={e => setReportedBy(e.target.value)} placeholder="Овог нэр"
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-red-500/60" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">Утасны дугаар</label>
          <input data-testid="input-bd-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9900-0000"
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-red-500/60" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">Байршил / Объект *</label>
          <input data-testid="input-bd-location" type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Хаана байгаа вэ?"
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-red-500/60" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">Эвдрэлийн тайлбар *</label>
        <textarea data-testid="input-bd-problem" value={problem} onChange={e => setProblem(e.target.value)} rows={3}
          placeholder="Юу болсон, ямар шинж тэмдэг байна..."
          className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-red-500/60 resize-none" />
      </div>
      <button data-testid="btn-submit-breakdown" onClick={() => mutation.mutate()}
        disabled={!canSubmit || mutation.isPending}
        className="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-widest bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
        {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Siren size={16} />}
        Тусламж хүсэх
      </button>
      {mutation.isError && <p className="text-red-400 text-sm text-center">Алдаа гарлаа.</p>}
    </div>
  );
}

function BreakdownCard({ bd, onStatusChange }: { bd: BreakdownRequest; onStatusChange: (id: number, status: string, note?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [resolveNote, setResolveNote] = useState("");
  const st = STATUS_MAP[bd.status] ?? STATUS_MAP.open;

  return (
    <div data-testid={`breakdown-card-${bd.id}`}
      className={`border rounded-2xl overflow-hidden transition-all ${
        bd.status === "open" ? "border-red-500/40 bg-red-500/5" :
        bd.status === "in_progress" ? "border-amber-500/40 bg-amber-500/5" :
        "border-green-500/20 bg-slate-900/40"
      }`}>
      <div className="flex items-start gap-4 px-5 py-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
          bd.status === "open" ? "bg-red-500/20" : bd.status === "in_progress" ? "bg-amber-500/20" : "bg-green-500/20"}`}>
          {bd.status === "resolved" ? <CheckCircle2 size={20} className="text-green-400" /> :
           bd.status === "in_progress" ? <Wrench size={20} className="text-amber-400" /> :
           <Siren size={20} className="text-red-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${st.color}`}>{st.label}</span>
            {bd.vehicleName && <span className="text-xs text-slate-400 flex items-center gap-1"><Car size={10} />{bd.vehicleName}</span>}
          </div>
          <p className="text-white font-semibold text-sm leading-snug">{bd.problem}</p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-xs text-slate-400 flex items-center gap-1"><MapPin size={10} />{bd.location}</span>
            <span className="text-xs text-slate-400 flex items-center gap-1"><User size={10} />{bd.reportedBy}</span>
            <span className="text-xs text-slate-500 flex items-center gap-1"><Clock size={10} />{fmtDateTime(bd.createdAt)}</span>
          </div>
          {bd.phone && (
            <div className="flex items-center gap-2 mt-2">
              <a href={`tel:${bd.phone}`} data-testid={`btn-call-bd-${bd.id}`}
                className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-xs transition-all">
                <PhoneCall size={12} /> {bd.phone}
              </a>
              <a href={`viber://chat?number=${bd.phone.replace(/[-\s]/g, "")}`} data-testid={`btn-viber-bd-${bd.id}`}
                className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg text-xs transition-all">
                <MessageCircle size={12} /> Viber
              </a>
            </div>
          )}
          {bd.resolvedNote && (
            <p className="mt-2 text-xs text-green-400 italic">✓ {bd.resolvedNote}</p>
          )}
        </div>
        {bd.status !== "resolved" && (
          <button onClick={() => setOpen(o => !o)} className="text-slate-400 hover:text-white transition-colors mt-1">
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {open && bd.status !== "resolved" && (
        <div className="px-5 pb-4 border-t border-white/5 space-y-3">
          {bd.status === "open" && (
            <button onClick={() => onStatusChange(bd.id, "in_progress")}
              className="w-full py-2 rounded-xl text-sm font-semibold bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all flex items-center justify-center gap-2">
              <Wrench size={14} /> Засварт авах
            </button>
          )}
          <div>
            <textarea value={resolveNote} onChange={e => setResolveNote(e.target.value)} rows={2} placeholder="Хэрхэн шийдвэрлэсэн..."
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none resize-none mb-2" />
            <button onClick={() => { onStatusChange(bd.id, "resolved", resolveNote); setOpen(false); }}
              className="w-full py-2 rounded-xl text-sm font-semibold bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all flex items-center justify-center gap-2">
              <CheckCircle2 size={14} /> Шийдвэрлэгдсэн гэж тэмдэглэх
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BreakdownTab({ vehicles }: { vehicles: Vehicle[] }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  /* ── Jitsi видео дуудлага ── */
  const [jitsiReady, setJitsiReady] = useState(false);
  const [activeCall, setActiveCall] = useState<{ emp: Employee; roomName: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const meetRef = useRef<HTMLDivElement>(null);
  const apiRef  = useRef<any>(null);

  useEffect(() => {
    if ((window as any).JitsiMeetExternalAPI) { setJitsiReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://meet.jit.si/external_api.js";
    s.async = true;
    s.onload = () => setJitsiReady(true);
    document.body.appendChild(s);
    return () => { s.remove(); };
  }, []);

  useEffect(() => {
    if (!activeCall || !jitsiReady || !meetRef.current) return;
    if (apiRef.current) { apiRef.current.dispose(); apiRef.current = null; }
    apiRef.current = new (window as any).JitsiMeetExternalAPI("meet.jit.si", {
      roomName: activeCall.roomName,
      width: "100%", height: 460,
      parentNode: meetRef.current,
      userInfo: { displayName: "Инженер" },
      configOverwrite: { startWithAudioMuted: false, startWithVideoMuted: false },
      interfaceConfigOverwrite: { TOOLBAR_BUTTONS: ["microphone","camera","chat","hangup","tileview","fullscreen"] },
    });
    apiRef.current.addEventListener("videoConferenceLeft", () => endCall());
  }, [activeCall, jitsiReady]);

  const startCall = (emp: Employee) => {
    const safe = emp.name.replace(/\s+/g, "").replace(/[^a-zA-Z0-9А-ЯӨҮа-яөүё]/g, "");
    const roomName = `KhuvsgulZam_Zasvar_${safe}`;
    setActiveCall({ emp, roomName });
  };

  const endCall = () => {
    if (apiRef.current) { apiRef.current.dispose(); apiRef.current = null; }
    setActiveCall(null);
  };

  const meetingUrl = activeCall ? `https://meet.jit.si/${activeCall.roomName}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(meetingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { data: allBreakdowns = [], isLoading, refetch } = useQuery<BreakdownRequest[]>({
    queryKey: ["/api/erp/breakdowns"],
    queryFn: () => fetch("/api/erp/breakdowns", { headers: hdrs() }).then(r => r.json()),
    refetchInterval: 30_000,
  });

  const { data: allEmployees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/erp/employees"],
    queryFn: () => fetch("/api/erp/employees", { headers: hdrs() }).then(r => r.json()),
  });

  const { data: todayInspections = [] } = useQuery<VehicleInspection[]>({
    queryKey: ["/api/erp/vehicle-inspections-today"],
    queryFn: () => fetch(`/api/erp/vehicle-inspections?date=${today()}`, { headers: hdrs() }).then(r => r.json()),
    refetchInterval: 30_000,
  });

  // Өнөөдөр үзлэг хийсэн хүмүүс (давхардлыг арилгана) + тэдний техник мэдээлэлтэй
  const todayOperators = useMemo(() => {
    const seen = new Set<string>();
    return todayInspections
      .filter(insp => { if (seen.has(insp.employeeName)) return false; seen.add(insp.employeeName); return true; })
      .map(insp => {
        const emp = allEmployees.find(e => e.name === insp.employeeName);
        return { insp, emp };
      });
  }, [todayInspections, allEmployees]);

  const active = allBreakdowns.filter(b => b.status !== "resolved");
  const resolved = allBreakdowns.filter(b => b.status === "resolved");

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: number; status: string; note?: string }) => {
      const res = await fetch(`/api/erp/breakdowns/${id}`, {
        method: "PATCH", headers: hdrs(),
        body: JSON.stringify({ status, resolvedNote: note }),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/erp/breakdowns"] }),
  });

  return (
    <div className="space-y-6">
      {/* Товч статистик */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`rounded-2xl p-5 text-center border ${active.length > 0 ? "bg-red-500/10 border-red-500/20" : "bg-slate-900/60 border-white/10"}`}>
          <div className={`text-3xl font-black mb-1 ${active.length > 0 ? "text-red-400" : "text-white"}`}>{active.length}</div>
          <div className={`text-xs uppercase tracking-wider ${active.length > 0 ? "text-red-500/80" : "text-slate-400"}`}>Идэвхтэй</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 text-center">
          <div className="text-3xl font-black text-amber-400 mb-1">{allBreakdowns.filter(b => b.status === "in_progress").length}</div>
          <div className="text-xs text-amber-500/80 uppercase tracking-wider">Засварт байна</div>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 text-center">
          <div className="text-3xl font-black text-green-400 mb-1">{resolved.length}</div>
          <div className="text-xs text-green-500/80 uppercase tracking-wider">Шийдвэрлэгдсэн</div>
        </div>
      </div>

      {/* Шинэ мэдэгдэл */}
      <div className="bg-slate-900/60 border border-red-500/20 rounded-2xl overflow-hidden">
        <button data-testid="btn-toggle-bd-form" onClick={() => setShowForm(p => !p)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600/20 rounded-lg flex items-center justify-center"><Siren className="text-red-400" size={16} /></div>
            <span className="font-bold text-sm uppercase tracking-wider text-red-300">Техник эвдэрсэн — Тусламж хүсэх</span>
          </div>
          {showForm ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
        </button>
        {showForm && (
          <div className="px-6 pb-6 border-t border-red-500/20 pt-5">
            <BreakdownForm vehicles={vehicles} onDone={() => setShowForm(false)} />
          </div>
        )}
      </div>

      {/* ── Өнөөдөр техник ашиглаж буй хүмүүстэй холбогдох ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Video size={18} className="text-green-400" />
          <h2 className="font-bold text-sm uppercase tracking-wider">Өнөөдөр техник ашиглаж буй ажилтнууд</h2>
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{todayOperators.length}</span>
        </div>

        {/* Видео дуудлагын цонх */}
        {activeCall && (
          <div className="mb-4 bg-slate-900/80 border border-green-500/30 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                <span className="font-semibold text-sm text-white">
                  {activeCall.emp.name} — Видео дуудлага
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button data-testid="btn-copy-meet-link" onClick={copyLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs transition-all">
                  {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  {copied ? "Хуулагдлаа" : "Линк хуулах"}
                </button>
                {activeCall.emp.phone && (
                  <a href={`viber://chat?number=${activeCall.emp.phone.replace(/[-\s]/g, "")}`}
                    data-testid="btn-viber-meet-link"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg text-xs transition-all">
                    <MessageCircle size={12} /> Viber
                  </a>
                )}
                <button data-testid="btn-end-call" onClick={endCall}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-xs transition-all">
                  <VideoOff size={12} /> Дуусгах
                </button>
              </div>
            </div>
            <div className="px-5 py-2 bg-slate-800/50 border-b border-white/5">
              <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                <Link2 size={11} /><span className="text-blue-400">{meetingUrl}</span>
              </p>
            </div>
            <div ref={meetRef} className="w-full" />
          </div>
        )}

        {todayOperators.length === 0 ? (
          <div className="text-center py-10 bg-slate-900/40 rounded-2xl border border-white/5">
            <Car size={32} className="mx-auto text-slate-600 mb-2" />
            <p className="text-slate-400 text-sm">Өнөөдөр техник ашиглалтын үзлэг хийсэн хүн байхгүй байна</p>
            <p className="text-slate-600 text-xs mt-1">Техникийн үзлэг таб дээр бүртгэсний дараа энд харагдана</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {todayOperators.map(({ insp, emp }) => {
              const callName = emp?.name ?? insp.employeeName;
              const isOnCall = activeCall?.emp.name === callName;
              const fakeEmp: Employee = emp ?? {
                id: 0, name: insp.employeeName, department: "field", role: "Жолооч / Оператор",
                salaryBase: 0, phone: null, registerNumber: null, createdAt: new Date(),
              } as any;

              return (
                <div key={insp.id} data-testid={`operator-card-${insp.id}`}
                  className={`border rounded-2xl px-4 py-3 transition-all ${
                    isOnCall ? "bg-green-500/10 border-green-500/30" : "bg-slate-900/60 border-white/10"
                  }`}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isOnCall ? "bg-green-500/20" : insp.passed ? "bg-blue-500/20" : "bg-red-500/20"}`}>
                      <User size={18} className={isOnCall ? "text-green-400" : insp.passed ? "text-blue-400" : "text-red-400"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{insp.employeeName}</p>
                      <p className="text-xs text-slate-400">{emp?.role ?? "Жолооч / Оператор"}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Car size={10} /> Техник #{insp.vehicleId}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          insp.passed ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                          {insp.passed ? "✓ Тэнцсэн" : "✗ Тэнцэлгүй"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Товчнууд */}
                  <div className="flex gap-2">
                    <button data-testid={`btn-video-${insp.id}`}
                      onClick={() => isOnCall ? endCall() : startCall(fakeEmp)}
                      disabled={!jitsiReady}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 ${
                        isOnCall
                          ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      }`}>
                      {isOnCall ? <VideoOff size={14} /> : <Video size={14} />}
                      {isOnCall ? "Дуусгах" : jitsiReady ? "Видео залгах" : "..."}
                    </button>
                    {emp?.phone && (
                      <a href={`tel:${emp.phone}`} data-testid={`btn-call-${insp.id}`}
                        className="w-9 h-9 flex items-center justify-center bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl transition-all">
                        <PhoneCall size={15} />
                      </a>
                    )}
                    {emp?.phone && (
                      <a href={`viber://chat?number=${emp.phone.replace(/[-\s]/g, "")}`}
                        data-testid={`btn-viber-${insp.id}`}
                        className="w-9 h-9 flex items-center justify-center bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-xl transition-all">
                        <MessageCircle size={15} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Идэвхтэй эвдрэлүүд */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-red-400" />
            <h2 className="font-bold text-sm uppercase tracking-wider">Идэвхтэй мэдэгдлүүд</h2>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{active.length}</span>
          </div>
          <button onClick={() => refetch()} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs">
            <RefreshCw size={12} /> Шинэчлэх
          </button>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 gap-2"><Loader2 size={20} className="animate-spin" /></div>
        ) : active.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-white/5">
            <CheckCircle2 size={36} className="mx-auto text-green-500 mb-3" />
            <p className="text-slate-400 text-sm">Одоогоор идэвхтэй эвдрэл байхгүй</p>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map(bd => (
              <BreakdownCard key={bd.id} bd={bd}
                onStatusChange={(id, status, note) => statusMutation.mutate({ id, status, note })} />
            ))}
          </div>
        )}
      </div>

      {/* Шийдвэрлэгдсэн */}
      {resolved.length > 0 && (
        <div>
          <button onClick={() => setShowResolved(p => !p)}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-3 transition-colors">
            {showResolved ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Шийдвэрлэгдсэн ({resolved.length})
          </button>
          {showResolved && (
            <div className="space-y-3">
              {resolved.map(bd => (
                <BreakdownCard key={bd.id} bd={bd}
                  onStatusChange={(id, status, note) => statusMutation.mutate({ id, status, note })} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   MAIN DASHBOARD
════════════════════════════════════════════════════ */
type Tab = "inspection" | "breakdown";

export default function EngineerDashboard() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("inspection");

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("userRole");
    setLocation("/select-role");
  };

  const { data: vehicles = [], isLoading: vLoad } = useQuery<Vehicle[]>({
    queryKey: ["/api/erp/vehicles"],
    queryFn: () => fetch("/api/erp/vehicles", { headers: hdrs() }).then(r => r.json()),
  });

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-slate-900/60 px-6 py-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-600/20 rounded-xl flex items-center justify-center">
              <Wrench className="text-amber-400" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-widest text-white leading-tight">Инженерийн самбар</h1>
              <p className="text-xs text-slate-400">
                {new Date().toLocaleDateString("mn-MN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
              </p>
            </div>
          </div>
          <button data-testid="btn-logout" onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-sm transition-all">
            <LogOut size={14} /> Гарах
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10 bg-slate-900/40">
        <div className="max-w-5xl mx-auto px-6 flex gap-1 pt-2">
          <button data-testid="tab-inspection" onClick={() => setTab("inspection")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-xl transition-all ${
              tab === "inspection" ? "bg-amber-600/20 text-amber-400 border-b-2 border-amber-500" : "text-slate-400 hover:text-white"}`}>
            <ClipboardCheck size={16} /> Техникийн үзлэг
          </button>
          <button data-testid="tab-breakdown" onClick={() => setTab("breakdown")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-xl transition-all ${
              tab === "breakdown" ? "bg-red-600/20 text-red-400 border-b-2 border-red-500" : "text-slate-400 hover:text-white"}`}>
            <Siren size={16} /> Эвдрэл / Тусламж
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {vLoad ? (
          <div className="flex items-center justify-center py-20 text-slate-400 gap-2"><Loader2 size={20} className="animate-spin" /> Ачааллаж байна...</div>
        ) : tab === "inspection" ? (
          <InspectionTab vehicles={vehicles} />
        ) : (
          <BreakdownTab vehicles={vehicles} />
        )}
      </div>
    </div>
  );
}
