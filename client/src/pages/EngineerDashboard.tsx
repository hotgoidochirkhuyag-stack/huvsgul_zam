import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Wrench, LogOut, CheckCircle2, XCircle, ClipboardList,
  Plus, ChevronDown, ChevronUp, Loader2, Car, User,
  AlertTriangle, CheckCheck, Clock, RefreshCw,
} from "lucide-react";
import type { Vehicle, VehicleInspection } from "@shared/schema";

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

function hdrs() {
  return {
    "Content-Type": "application/json",
    "x-admin-token": localStorage.getItem("adminToken") ?? "",
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" });
}

/* ─── Шинэ үзлэг бүртгэх форм ─── */
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
          vehicleId: Number(vehicleId),
          employeeName: employeeName.trim(),
          checks: JSON.stringify(
            DEFAULT_CHECKS.map(item => ({ item, ok: checks[item], note: "" }))
          ),
          passed: allPassed,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Алдаа");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/erp/vehicle-inspections-today"] });
      onDone();
    },
  });

  const canSubmit = vehicleId !== "" && employeeName.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Техник + жолооч */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">Техник сонгох</label>
          <select
            data-testid="select-vehicle"
            value={vehicleId}
            onChange={e => setVehicleId(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/60"
          >
            <option value="">— Техник сонгоно уу —</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.plateNumber} — {v.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">Үзлэг хийсэн ажилтан</label>
          <input
            data-testid="input-employee-name"
            type="text"
            value={employeeName}
            onChange={e => setEmployeeName(e.target.value)}
            placeholder="Овог нэр"
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
          />
        </div>
      </div>

      {/* Checklist */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs text-slate-400 uppercase tracking-wider">Үзлэгийн зүйлс</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setChecks(Object.fromEntries(DEFAULT_CHECKS.map(k => [k, true])))}
              className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
            >
              <CheckCheck size={12} /> Бүгд тэнцлэв
            </button>
            <button
              type="button"
              onClick={() => setChecks(Object.fromEntries(DEFAULT_CHECKS.map(k => [k, false])))}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
            >
              <XCircle size={12} /> Бүгд арилгах
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {DEFAULT_CHECKS.map(item => (
            <button
              key={item}
              type="button"
              data-testid={`check-item-${item}`}
              onClick={() => setChecks(p => ({ ...p, [item]: !p[item] }))}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left text-sm transition-all ${
                checks[item]
                  ? "bg-green-500/10 border-green-500/30 text-green-300"
                  : "bg-red-500/10 border-red-500/30 text-red-300"
              }`}
            >
              {checks[item]
                ? <CheckCircle2 size={16} className="shrink-0" />
                : <XCircle size={16} className="shrink-0" />}
              <span>{item}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Тэмдэглэл */}
      <div>
        <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">Тэмдэглэл (заавал биш)</label>
        <textarea
          data-testid="input-notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Нэмэлт тайлбар..."
          className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/60 resize-none"
        />
      </div>

      {/* Нийт үр дүн */}
      <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border ${
        allPassed ? "bg-green-500/10 border-green-500/30 text-green-300" : "bg-red-500/10 border-red-500/30 text-red-300"
      }`}>
        {allPassed
          ? <CheckCircle2 size={20} />
          : <AlertTriangle size={20} />}
        <span className="font-semibold text-sm">
          {allPassed ? "Техник ашиглалтад бэлэн — тэнцсэн" : "Зарим зүйл тэнцэлгүй — техник ашиглаж болохгүй"}
        </span>
      </div>

      <button
        data-testid="btn-submit-inspection"
        onClick={() => mutation.mutate()}
        disabled={!canSubmit || mutation.isPending}
        className="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-widest bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        Үзлэг бүртгэх
      </button>

      {mutation.isError && (
        <p className="text-red-400 text-sm text-center">Алдаа гарлаа. Дахин оролдоно уу.</p>
      )}
    </div>
  );
}

/* ─── Нэг үзлэгийн мөр ─── */
function InspectionRow({ insp, vehicles }: { insp: VehicleInspection; vehicles: Vehicle[] }) {
  const [open, setOpen] = useState(false);

  const vehicle = vehicles.find(v => v.id === insp.vehicleId);
  let checksArr: { item: string; ok: boolean; note: string }[] = [];
  try { checksArr = JSON.parse(insp.checks); } catch { /* */ }

  const failedItems = checksArr.filter(c => !c.ok);

  return (
    <div
      data-testid={`inspection-row-${insp.id}`}
      className="bg-slate-900/60 border border-white/10 rounded-xl overflow-hidden"
    >
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        {/* Үзлэгийн статус */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          insp.passed ? "bg-green-500/20" : "bg-red-500/20"
        }`}>
          {insp.passed
            ? <CheckCircle2 className="text-green-400" size={20} />
            : <XCircle className="text-red-400" size={20} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span data-testid={`text-employee-${insp.id}`} className="font-semibold text-white text-sm">
              {insp.employeeName}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              insp.passed
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            }`}>
              {insp.passed ? "Тэнцсэн" : "Тэнцэлгүй"}
            </span>
            {failedItems.length > 0 && (
              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                {failedItems.length} зүйл дутуу
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Car size={11} />
              {vehicle ? `${vehicle.plateNumber} — ${vehicle.name}` : `Техник #${insp.vehicleId}`}
            </span>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock size={11} />
              {fmtDate(insp.createdAt?.toString() ?? insp.date)}
            </span>
          </div>
        </div>

        {open ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
      </div>

      {open && (
        <div className="px-5 pb-4 border-t border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mt-3">
            {checksArr.map((c, i) => (
              <div key={i} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${
                c.ok ? "text-green-300 bg-green-500/5" : "text-red-300 bg-red-500/10"
              }`}>
                {c.ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                {c.item}
              </div>
            ))}
          </div>
          {insp.notes && (
            <p className="mt-3 text-xs text-slate-400 italic">{insp.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── MAIN ─── */
export default function EngineerDashboard() {
  const [, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("userRole");
    setLocation("/select-role");
  };

  const todayStr = today();

  const { data: vehicles = [], isLoading: vLoad } = useQuery<Vehicle[]>({
    queryKey: ["/api/erp/vehicles"],
    queryFn: () => fetch("/api/erp/vehicles", { headers: hdrs() }).then(r => r.json()),
  });

  const { data: allInspections = [], isLoading: iLoad, refetch } = useQuery<VehicleInspection[]>({
    queryKey: ["/api/erp/vehicle-inspections-today"],
    queryFn: () =>
      fetch(`/api/erp/vehicle-inspections?date=${todayStr}`, { headers: hdrs() }).then(r => r.json()),
    refetchInterval: 30_000,
  });

  const inspections = useMemo(
    () => [...allInspections].sort((a, b) =>
      new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
    ),
    [allInspections]
  );

  const passedCount = inspections.filter(i => i.passed).length;
  const failedCount = inspections.filter(i => !i.passed).length;

  const isLoading = vLoad || iLoad;

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* ── Header ── */}
      <div className="border-b border-white/10 bg-slate-900/60 px-6 py-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-600/20 rounded-xl flex items-center justify-center">
              <Wrench className="text-amber-400" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-widest text-white leading-tight">
                Техникийн өмнөх үзлэг
              </h1>
              <p className="text-xs text-slate-400">
                {new Date().toLocaleDateString("mn-MN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid="btn-refresh"
              onClick={() => refetch()}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg text-xs transition-all"
            >
              <RefreshCw size={13} /> Шинэчлэх
            </button>
            <button
              data-testid="btn-logout"
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-sm transition-all"
            >
              <LogOut size={14} /> Гарах
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* ── Өнөөдрийн товч ── */}
        <div className="grid grid-cols-3 gap-4">
          <div data-testid="stat-total" className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 text-center">
            <div className="text-3xl font-black text-white mb-1">{inspections.length}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Нийт үзлэг</div>
          </div>
          <div data-testid="stat-passed" className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 text-center">
            <div className="text-3xl font-black text-green-400 mb-1">{passedCount}</div>
            <div className="text-xs text-green-500/80 uppercase tracking-wider">Тэнцсэн</div>
          </div>
          <div data-testid="stat-failed" className={`rounded-2xl p-5 text-center border ${
            failedCount > 0
              ? "bg-red-500/10 border-red-500/20"
              : "bg-slate-900/60 border-white/10"
          }`}>
            <div className={`text-3xl font-black mb-1 ${failedCount > 0 ? "text-red-400" : "text-slate-500"}`}>
              {failedCount}
            </div>
            <div className={`text-xs uppercase tracking-wider ${failedCount > 0 ? "text-red-500/80" : "text-slate-500"}`}>
              Тэнцэлгүй
            </div>
          </div>
        </div>

        {/* ── Шинэ үзлэг форм ── */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
          <button
            data-testid="btn-toggle-form"
            onClick={() => setShowForm(p => !p)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-600/20 rounded-lg flex items-center justify-center">
                <Plus className="text-amber-400" size={16} />
              </div>
              <span className="font-bold text-sm uppercase tracking-wider">Шинэ үзлэг бүртгэх</span>
            </div>
            {showForm
              ? <ChevronUp size={16} className="text-slate-400" />
              : <ChevronDown size={16} className="text-slate-400" />}
          </button>

          {showForm && (
            <div className="px-6 pb-6 border-t border-white/10">
              <div className="pt-5">
                {vLoad ? (
                  <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                    <Loader2 size={18} className="animate-spin" /> Техникийн жагсаалт ачааллаж байна...
                  </div>
                ) : vehicles.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-6">
                    Техник бүртгэгдээгүй байна. Эхлээд техник нэмнэ үү.
                  </p>
                ) : (
                  <InspectionForm
                    vehicles={vehicles}
                    onDone={() => setShowForm(false)}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Өнөөдрийн үзлэгүүд ── */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <ClipboardList size={18} className="text-amber-400" />
            <h2 className="font-bold text-sm uppercase tracking-wider">
              Өнөөдрийн үзлэгүүд
            </h2>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
              {inspections.length}
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
              <Loader2 size={20} className="animate-spin" /> Ачааллаж байна...
            </div>
          ) : inspections.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-white/5">
              <Car size={40} className="mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm">Өнөөдөр үзлэг хийгдээгүй байна</p>
              <p className="text-slate-600 text-xs mt-1">Дээрх формоор эхний үзлэг бүртгэнэ үү</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inspections.map(insp => (
                <InspectionRow key={insp.id} insp={insp} vehicles={vehicles} />
              ))}
            </div>
          )}
        </div>

        {/* ── Техникийн жагсаалт (хяналтын) ── */}
        {vehicles.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Car size={18} className="text-blue-400" />
              <h2 className="font-bold text-sm uppercase tracking-wider">Техникийн жагсаалт</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {vehicles.map(v => {
                const todayInsp = inspections.find(i => i.vehicleId === v.id);
                return (
                  <div
                    key={v.id}
                    data-testid={`vehicle-card-${v.id}`}
                    className={`bg-slate-900/60 border rounded-xl px-4 py-3 ${
                      todayInsp
                        ? todayInsp.passed
                          ? "border-green-500/30"
                          : "border-red-500/30"
                        : "border-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-sm text-white">{v.plateNumber}</p>
                        <p className="text-xs text-slate-400">{v.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{v.type}</p>
                      </div>
                      <div>
                        {todayInsp ? (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            todayInsp.passed
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}>
                            {todayInsp.passed ? "✓ Тэнцсэн" : "✗ Тэнцэлгүй"}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-700/50 text-slate-400">
                            Үзлэг хийгдээгүй
                          </span>
                        )}
                      </div>
                    </div>
                    {todayInsp && (
                      <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                        <User size={10} /> {todayInsp.employeeName}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
