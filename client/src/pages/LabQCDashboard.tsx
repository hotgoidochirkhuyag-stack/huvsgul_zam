import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FlaskConical, Plus, Trash2, LogOut, RefreshCw, CheckCircle2,
  XCircle, Clock, FileText, AlertTriangle, ShieldCheck, History, Pencil,
  BarChart3, TrendingUp, TrendingDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { NormConfig, NormAuditEntry } from "@shared/schema";

function getHeaders() {
  return { "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") ?? "" };
}

const TODAY = new Date().toISOString().slice(0, 10);
const DEVIATION_WARN = 0.10;

const TEST_TYPES: Record<string, {
  label: string; unit: string; standard?: number; standardLabel?: string;
  fields: { key: string; label: string; placeholder: string }[];
}> = {
  marshall: {
    label: "Marshall Туршилт (Асфальт)",
    unit: "%", standard: 3.0, standardLabel: "Агаарын хоосон орон ≤ 3.5%",
    fields: [
      { key: "value",  label: "Агаарын хоосон орон (%)",                   placeholder: "2.0–4.0" },
      { key: "value2", label: "Тогтвортой байдал (Marshall Stability, kN)", placeholder: "≥ 8.0"  },
    ],
  },
  compressive: {
    label: "Бетоны Даралтын Бат Бэх",
    unit: "МПа", standard: 25, standardLabel: "C25/30: ≥ 25 МПа (28 хоног)",
    fields: [
      { key: "value",  label: "Даралтын бат бэх (МПа)", placeholder: "≥ 25"  },
      { key: "value2", label: "Тест хийсэн хоног",       placeholder: "7 / 28" },
    ],
  },
  density: {
    label: "Нягтралын Коэффициент",
    unit: "Кн", standard: 0.95, standardLabel: "Кн ≥ 0.95 (замын суурь), ≥ 0.98 (замын хэвтрэг)",
    fields: [
      { key: "value",  label: "Нягтралын коэффициент (Кн)",            placeholder: "0.95–1.00" },
      { key: "value2", label: "Давхарга (суурь / хэвтрэг / хучаас)",   placeholder: "Суурь"     },
    ],
  },
  sieve: {
    label: "Агрегатын Тоосорхойн Шинжилгээ",
    unit: "%", standard: 100, standardLabel: "БНбД дагуу фракцын хуваарилалт",
    fields: [
      { key: "value",  label: "0-2мм фракцын хувь (%)",  placeholder: "%" },
      { key: "value2", label: "4.75мм дайрах хувь (%)",  placeholder: "%" },
    ],
  },
  atterberg: {
    label: "Атерберг Хязгаар (Грунт)",
    unit: "%", standard: 0, standardLabel: "LL ≤ 35%, PI ≤ 12% замын суурийн грунтад",
    fields: [
      { key: "value",  label: "Шингэний хязгаар LL (%)",   placeholder: "≤ 35" },
      { key: "value2", label: "Пластикийн индекс PI (%)", placeholder: "≤ 12" },
    ],
  },
};

function StatusBadge({ status }: { status: string }) {
  if (status === "pass") return (
    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/15 text-green-400 rounded-lg text-xs font-medium">
      <CheckCircle2 className="w-3 h-3" /> Тэнцсэн
    </span>
  );
  if (status === "fail") return (
    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/15 text-red-400 rounded-lg text-xs font-medium">
      <XCircle className="w-3 h-3" /> Тэнцээгүй
    </span>
  );
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/15 text-amber-400 rounded-lg text-xs font-medium">
      <Clock className="w-3 h-3" /> Хүлээгдэж байна
    </span>
  );
}

// ─── Норм таб (харах + засах) ─────────────────────────────────────────────────
function NormEditorTab({ token, role, canEdit }: { token: string; role: string; canEdit: boolean }) {
  const { toast } = useToast();
  const [editValues, setEditValues] = useState<Record<number, string>>({});
  const [notes, setNotes]           = useState<Record<number, string>>({});
  const [saving, setSaving]         = useState<Record<number, boolean>>({});
  const [catTab, setCatTab]         = useState<"asphalt" | "concrete" | "crushing">("asphalt");
  const [showLog, setShowLog]       = useState(false);
  const qc = useQueryClient();

  const { data: norms = [], isLoading } = useQuery<NormConfig[]>({
    queryKey: ["/api/norm-configs"],
    queryFn: () => fetch("/api/norm-configs", { headers: { "x-admin-token": token } }).then(r => r.json()),
  });

  const { data: auditLog = [], isLoading: logLoading } = useQuery<NormAuditEntry[]>({
    queryKey: ["/api/norm-audit-log"],
    queryFn: () => fetch("/api/norm-audit-log", { headers: { "x-admin-token": token } }).then(r => r.json()),
    enabled: showLog,
  });

  const handleSave = async (norm: NormConfig) => {
    const rawVal = editValues[norm.id];
    if (rawVal === undefined || rawVal === "") return;
    const newRate = parseFloat(rawVal);
    if (isNaN(newRate) || newRate <= 0) {
      toast({ title: "Буруу утга", description: "Эерэг тоо оруулна уу", variant: "destructive" });
      return;
    }
    setSaving(s => ({ ...s, [norm.id]: true }));
    try {
      const r = await fetch(`/api/norm-configs/${norm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ rate: newRate, changedBy: role, note: notes[norm.id] || null }),
      });
      if (!r.ok) throw new Error(await r.text());
      await qc.invalidateQueries({ queryKey: ["/api/norm-configs"] });
      await qc.invalidateQueries({ queryKey: ["/api/norm-audit-log"] });
      setEditValues(v => { const c = { ...v }; delete c[norm.id]; return c; });
      setNotes(n => { const c = { ...n }; delete c[norm.id]; return c; });
      toast({ title: "Хадгалагдлаа ✓", description: `${norm.materialName}: ${norm.rate} → ${newRate} ${norm.unit}` });
    } catch {
      toast({ title: "Хадгалахад алдаа гарлаа", variant: "destructive" });
    }
    setSaving(s => ({ ...s, [norm.id]: false }));
  };

  const tabNorms = norms.filter(n => n.category === catTab);
  const grouped: Record<string, NormConfig[]> = {};
  tabNorms.forEach(n => { (grouped[n.recipeKey] = grouped[n.recipeKey] || []).push(n); });

  const catMeta: Record<string, { label: string; color: string }> = {
    asphalt:  { label: "Асфальт рецептүүд",  color: "text-amber-400"  },
    concrete: { label: "Бетоны ангилал",      color: "text-blue-400"   },
    crushing: { label: "Бутлах үйлдвэр",      color: "text-green-400"  },
  };

  return (
    <div className="space-y-5">
      {/* Гарчиг + харах/засах горим мэдэгдэл */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-white text-base">БНбД Нормчлолын тохиргоо</h3>
          {!canEdit && (
            <p className="text-xs text-amber-400/70 mt-0.5 flex items-center gap-1">
              <ShieldCheck size={12} /> Зөвхөн харах горим — засах эрх технологич инженерт байна
            </p>
          )}
        </div>
      </div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {(["asphalt", "concrete", "crushing"] as const).map(cat => (
            <button key={cat} onClick={() => { setCatTab(cat); setShowLog(false); }}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                catTab === cat && !showLog
                  ? "bg-amber-600/40 text-amber-300"
                  : "text-white/40 hover:text-white/70"
              }`}>
              {catMeta[cat].label}
            </button>
          ))}
        </div>
        {canEdit && (
          <button onClick={() => setShowLog(s => !s)}
            className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold transition-all ${
              showLog
                ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/30"
                : "bg-white/5 text-white/40 hover:bg-white/10 border border-white/10"
            }`}>
            <History size={13} /> Засварын түүх
          </button>
        )}
      </div>

      {/* БНбД norm editor */}
      {!showLog && (
        <div className="space-y-6">
          {isLoading && (
            <div className="text-center text-white/30 py-10">Ачааллаж байна…</div>
          )}
          {!isLoading && Object.entries(grouped).map(([recipeKey, mats]) => (
            <div key={recipeKey} className="bg-slate-900/50 border border-white/8 rounded-2xl p-5">
              <div className={`text-xs font-bold uppercase tracking-widest mb-4 ${catMeta[catTab].color}`}>
                {recipeKey}
              </div>
              <div className="space-y-3">
                {mats.map(norm => {
                  const current   = editValues[norm.id] !== undefined ? parseFloat(editValues[norm.id]) : norm.rate;
                  const deviation = norm.bnbdRate > 0 ? Math.abs(current - norm.bnbdRate) / norm.bnbdRate : 0;
                  const isDeviated = deviation > DEVIATION_WARN;
                  const isEditing  = editValues[norm.id] !== undefined;
                  return (
                    <div key={norm.id}
                      className={`rounded-xl border px-4 py-3 transition-all ${
                        isDeviated
                          ? "border-red-500/40 bg-red-900/10"
                          : isEditing
                          ? "border-amber-500/40 bg-amber-900/8"
                          : "border-white/5 bg-white/2"
                      }`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-white/80 flex-1 min-w-[150px]">
                          {norm.materialName}
                        </span>

                        {/* БНбД лавлах утга */}
                        <span className="flex items-center gap-1 text-xs text-emerald-400/60">
                          <ShieldCheck size={11} />
                          БНбД: <strong>{norm.bnbdRate}</strong> {norm.unit}
                          {norm.bnbdRef && (
                            <span className="text-white/20 ml-1">({norm.bnbdRef})</span>
                          )}
                        </span>

                        {/* Утга харах / засах */}
                        {canEdit ? (
                          <input
                            type="number" step="0.001" min="0"
                            value={editValues[norm.id] ?? norm.rate}
                            onChange={e => setEditValues(v => ({ ...v, [norm.id]: e.target.value }))}
                            className="w-24 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-amber-500/60 transition-colors"
                            data-testid={`input-norm-${norm.id}`}
                          />
                        ) : (
                          <span className="w-24 text-center font-bold text-white text-sm px-2 py-1.5 bg-white/5 rounded-lg">
                            {norm.rate}
                          </span>
                        )}
                        <span className="text-xs text-white/30 w-6">{norm.unit}</span>

                        {canEdit && isEditing && (
                          <button onClick={() => handleSave(norm)} disabled={saving[norm.id]}
                            data-testid={`btn-save-norm-${norm.id}`}
                            className="text-xs px-3 py-1.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 rounded-lg font-semibold transition-all disabled:opacity-40">
                            {saving[norm.id] ? "…" : "Хадгалах"}
                          </button>
                        )}
                      </div>

                      {/* Хазайлт анхааруулга */}
                      {isDeviated && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                          <AlertTriangle size={12} />
                          БНбД нормоос <strong>{(deviation * 100).toFixed(1)}%</strong> хазайж байна
                          — зохих зөвшөөрөл шаардлагатай
                        </div>
                      )}

                      {/* Тайлбар талбар — зөвхөн засах үед */}
                      {canEdit && isEditing && (
                        <input type="text"
                          placeholder="Засварын шалтгаан / тайлбар (заавал биш)…"
                          value={notes[norm.id] ?? ""}
                          onChange={e => setNotes(n => ({ ...n, [norm.id]: e.target.value }))}
                          className="mt-2 w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white/60 placeholder:text-white/20 focus:outline-none focus:border-amber-500/20"
                        />
                      )}

                      {/* Сүүлчийн засвар */}
                      {norm.updatedBy && !isEditing && (
                        <div className="mt-1.5 text-xs text-white/20">
                          Сүүлд засав:{" "}
                          <span className="text-white/40 font-medium">{norm.updatedBy}</span>
                          {norm.updatedAt && (
                            <span className="ml-1">
                              · {new Date(norm.updatedAt).toLocaleDateString("mn-MN")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Footer мессеж */}
          {!isLoading && (
            <div className="flex items-center gap-2 text-xs text-white/20 px-1">
              <ShieldCheck size={12} className="text-emerald-400/40 shrink-0" />
              БНбД нормоос ±10%-иас хэтэрсэн утгыг улаанаар тэмдэглэнэ.
              Засвар бүр роль, огноо, шалтгааны хамт бүртгэгдэнэ.
            </div>
          )}
        </div>
      )}

      {/* Засварын түүх */}
      {showLog && (
        <div className="bg-slate-900/50 border border-white/8 rounded-2xl p-5 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-400/70 mb-1">
            Засварын бүртгэл (сүүлийн 50)
          </div>
          {logLoading && <div className="text-white/30 text-sm text-center py-6">Уншиж байна…</div>}
          {!logLoading && auditLog.length === 0 && (
            <div className="text-white/20 text-sm text-center py-8">
              Одоогоор норм засварласан бүртгэл байхгүй байна
            </div>
          )}
          {auditLog.map(log => (
            <div key={log.id} className="border border-white/5 bg-white/2 rounded-xl px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="font-semibold text-white/70">{log.materialName}</span>
                <span className="text-white/25 italic">{log.recipeKey}</span>
                <span className="text-red-400/70 font-mono">{log.oldRate}</span>
                <span className="text-white/20">→</span>
                <span className="text-emerald-400/70 font-mono">{log.newRate}</span>
                <span className="ml-auto text-amber-400/60 font-semibold">{log.changedBy}</span>
                <span className="text-white/20">
                  {log.changedAt ? new Date(log.changedAt).toLocaleString("mn-MN") : ""}
                </span>
              </div>
              {log.note && (
                <div className="text-xs text-white/30 mt-1 italic">"{log.note}"</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LabQCDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const token = localStorage.getItem("adminToken") ?? "";
  const role  = localStorage.getItem("userRole") ?? "LAB";
  // Норм харах — LAB, ENGINEER, BOARD, ADMIN
  const canViewNorms = ["LAB", "ENGINEER", "BOARD", "ADMIN"].includes(role);
  // Норм засах — зөвхөн ENGINEER (технологич инженер)
  const canEditNorms = role === "ENGINEER";

  const [tab, setTab] = useState<"overview" | "list" | "add" | "norms">("overview");
  const [filterType,   setFilterType]   = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const emptyForm = {
    testType: "marshall", location: "", sampleId: "", date: TODAY,
    material: "", value: "", value2: "", standard: "", status: "pending",
    notes: "", recordedBy: "",
  };
  const [form, setForm] = useState(emptyForm);

  const { data: results = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/lab-results"],
    queryFn: () => fetch("/api/lab-results", { headers: getHeaders() }).then(r => r.json()),
  });

  const createResult = useMutation({
    mutationFn: (data: any) => fetch("/api/lab-results", {
      method: "POST", headers: getHeaders(),
      body: JSON.stringify({
        ...data,
        value:    data.value    ? parseFloat(data.value)    : null,
        value2:   data.value2   ? parseFloat(data.value2)   : null,
        standard: data.standard ? parseFloat(data.standard) : null,
      }),
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/lab-results"] });
      toast({ title: "Туршилтын үр дүн бүртгэгдлээ ✓" });
      setForm(emptyForm);
      setTab("list");
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteResult = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/lab-results/${id}`, { method: "DELETE", headers: getHeaders() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/lab-results"] }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      fetch(`/api/lab-results/${id}`, {
        method: "PUT", headers: getHeaders(),
        body: JSON.stringify({ status }),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/lab-results"] }),
  });

  const filtered   = results.filter(r =>
    (filterType   === "all" || r.testType === filterType) &&
    (filterStatus === "all" || r.status   === filterStatus)
  );
  const passCount  = results.filter(r => r.status === "pass").length;
  const failCount  = results.filter(r => r.status === "fail").length;
  const passRate   = results.filter(r => r.status !== "pending").length > 0
    ? Math.round(passCount / results.filter(r => r.status !== "pending").length * 100)
    : 0;

  const activeTestDef = TEST_TYPES[form.testType];

  const recentFailed = results.filter(r => r.status === "fail").slice(0, 5);
  const thisMonth    = new Date().toISOString().slice(0, 7);
  const monthResults = results.filter(r => r.date?.startsWith(thisMonth));
  const monthPass    = monthResults.filter(r => r.status === "pass").length;
  const monthFail    = monthResults.filter(r => r.status === "fail").length;
  const recent5      = results.slice(0, 5);

  const TABS: { key: "overview"|"list"|"add"|"norms"; label: string; icon: any; show: boolean }[] = [
    { key: "overview", label: "Хяналтын самбар",    icon: BarChart3,    show: true          },
    { key: "list",     label: "Туршилтын дүн",      icon: FileText,     show: true          },
    { key: "add",      label: "Шинэ туршилт",       icon: FlaskConical, show: true          },
    { key: "norms",    label: "БНбД Норм",           icon: ShieldCheck,  show: canViewNorms  },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617] text-white">
      {/* Sticky Header */}
      <header className="border-b border-white/10 bg-[#0f172a]/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="font-bold text-base leading-tight">
                Лаборатори &amp; Норм Удирдлага
              </div>
              <div className="text-xs text-white/35">
                Чанарын шалгалт · БНбД нормын бүртгэл
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()}
              className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button data-testid="btn-logout"
              onClick={() => { localStorage.removeItem("adminToken"); localStorage.removeItem("userRole"); setLocation("/admin"); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit flex-wrap">
          {TABS.filter(t => t.show).map(({ key, label, icon: Icon }) => (
            <button key={key} data-testid={`tab-${key}`} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key
                  ? key === "norms"
                    ? "bg-amber-600/50 text-amber-100 shadow-sm"
                    : "bg-emerald-600 text-white shadow-sm"
                  : "text-white/50 hover:text-white"
              }`}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ─── OVERVIEW TAB ─────────────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="space-y-5">
            {/* Энэ сарын дүн */}
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
              <h2 className="font-bold text-emerald-300 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                {new Date().toLocaleDateString("mn-MN", { year: "numeric", month: "long" })} — Хяналтын дүн
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Нийт туршилт",    value: results.length,  color: "text-white",     bg: "bg-white/5"       },
                  { label: "Тэнцсэн",          value: passCount,       color: "text-green-400",  bg: "bg-green-500/10"  },
                  { label: "Тэнцээгүй",        value: failCount,       color: "text-red-400",    bg: "bg-red-500/10"    },
                  { label: "Тэнцэлтийн хувь", value: `${passRate}%`,
                    color: passRate >= 90 ? "text-green-400" : passRate >= 70 ? "text-amber-400" : "text-red-400",
                    bg: "bg-white/5" },
                ].map(c => (
                  <div key={c.label} className={`rounded-2xl border border-white/10 p-4 ${c.bg}`}>
                    <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
                    <div className="text-xs text-white/40 mt-0.5">{c.label}</div>
                  </div>
                ))}
              </div>

              {/* Сарын харьцуулалт */}
              {monthResults.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-slate-400">Энэ сарын тэнцсэн:</span>
                    <span className="font-bold text-green-400">{monthPass}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    <span className="text-slate-400">Энэ сарын тэнцээгүй:</span>
                    <span className="font-bold text-red-400">{monthFail}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Сүүлийн тэнцээгүй туршилтууд */}
            {recentFailed.length > 0 && (
              <div className="bg-red-900/10 border border-red-500/20 rounded-2xl p-5">
                <h3 className="font-bold text-red-400 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Тэнцээгүй туршилтууд (сүүлийн {recentFailed.length})
                </h3>
                <div className="space-y-2">
                  {recentFailed.map((r: any) => {
                    const def = TEST_TYPES[r.testType];
                    return (
                      <div key={r.id} className="bg-red-900/20 border border-red-500/15 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{def?.label ?? r.testType}</p>
                          <p className="text-xs text-white/40 mt-0.5">
                            {r.date} {r.location && `· ${r.location}`} {r.material && `· ${r.material}`}
                          </p>
                        </div>
                        {r.value != null && (
                          <span className="text-red-300 font-bold text-sm">{r.value} {r.unit}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Сүүлийн 5 туршилт */}
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-bold text-sm text-white/70">Сүүлийн туршилтууд</h3>
                <button onClick={() => setTab("list")} className="text-xs text-emerald-400 hover:underline">Бүгдийг харах →</button>
              </div>
              {recent5.length === 0 ? (
                <div className="p-8 text-center text-white/30 text-sm">
                  <FlaskConical className="w-8 h-8 mx-auto mb-2 text-white/10" />
                  Туршилтын бүртгэл байхгүй байна
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {recent5.map((r: any) => {
                    const def = TEST_TYPES[r.testType];
                    return (
                      <div key={r.id} className="px-5 py-3 flex flex-wrap items-center gap-3 hover:bg-white/2 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white/80">{def?.label ?? r.testType}</p>
                          <p className="text-xs text-white/30">{r.date} {r.location && `· ${r.location}`}</p>
                        </div>
                        {r.value != null && <span className="text-xs font-mono text-white/60">{r.value} {r.unit}</span>}
                        <StatusBadge status={r.status} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Шуурхай товчнууд */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setTab("add")}
                className="flex items-center justify-center gap-2 py-4 bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600/30 rounded-2xl text-emerald-300 font-bold text-sm transition-all">
                <FlaskConical className="w-5 h-5" /> Шинэ туршилт нэмэх
              </button>
              {canViewNorms && (
                <button onClick={() => setTab("norms")}
                  className="flex items-center justify-center gap-2 py-4 bg-amber-600/10 border border-amber-500/20 hover:bg-amber-600/20 rounded-2xl text-amber-300 font-bold text-sm transition-all">
                  <ShieldCheck className="w-5 h-5" /> {canEditNorms ? "Норм тохиргоо (БНбД)" : "БНбД Норм харах"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── LIST TAB ─────────────────────────────────────────────────────── */}
        {tab === "list" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none">
                <option value="all">Бүх туршилтын төрөл</option>
                {Object.entries(TEST_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none">
                <option value="all">Бүх статус</option>
                <option value="pass">Тэнцсэн</option>
                <option value="fail">Тэнцээгүй</option>
                <option value="pending">Хүлээгдэж байна</option>
              </select>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-white/40">Уншиж байна...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-white/40">
                <FlaskConical className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p>Туршилтын бүртгэл байхгүй байна</p>
                <button onClick={() => setTab("add")}
                  className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold transition-all">
                  Шинэ туршилт нэмэх
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((r: any) => {
                  const def = TEST_TYPES[r.testType];
                  return (
                    <div key={r.id} data-testid={`lab-row-${r.id}`}
                      className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all">
                      <div className="flex flex-wrap items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-semibold text-white">{def?.label ?? r.testType}</span>
                            <StatusBadge status={r.status} />
                            {r.sampleId && (
                              <span className="text-xs text-white/30 font-mono">#{r.sampleId}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm">
                            {r.value != null && (
                              <span className="text-emerald-400 font-bold">{r.value} {r.unit}</span>
                            )}
                            {r.value2 != null && (
                              <span className="text-white/60">{def?.fields[1]?.label}: {r.value2}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-white/30 mt-1.5">
                            {r.location   && <span>📍 {r.location}</span>}
                            {r.material   && <span>🪨 {r.material}</span>}
                            <span>📅 {r.date}</span>
                            {r.recordedBy && <span>👤 {r.recordedBy}</span>}
                          </div>
                          {def?.standardLabel && (
                            <div className="text-xs text-white/20 mt-1">Стандарт: {def.standardLabel}</div>
                          )}
                          {r.notes && <p className="text-xs text-white/40 mt-1 italic">{r.notes}</p>}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {r.status === "pending" && (
                            <>
                              <button onClick={() => updateStatus.mutate({ id: r.id, status: "pass" })}
                                className="px-2.5 py-1 bg-green-700/60 hover:bg-green-600 rounded-lg text-xs font-medium transition-all">
                                ✓ Тэнцсэн
                              </button>
                              <button onClick={() => updateStatus.mutate({ id: r.id, status: "fail" })}
                                className="px-2.5 py-1 bg-red-700/60 hover:bg-red-600 rounded-lg text-xs font-medium transition-all">
                                ✗ Тэнцээгүй
                              </button>
                            </>
                          )}
                          <button onClick={() => deleteResult.mutate(r.id)}
                            className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── ADD TAB ──────────────────────────────────────────────────────── */}
        {tab === "add" && (
          <div className="max-w-2xl">
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-emerald-400" />
                Шинэ туршилтын үр дүн бүртгэх
              </h2>

              <div className="space-y-1.5">
                <label className="text-xs text-white/50">Туршилтын төрөл</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(TEST_TYPES).map(([key, def]) => (
                    <button key={key} data-testid={`test-type-${key}`}
                      onClick={() => setForm(f => ({ ...f, testType: key }))}
                      className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                        form.testType === key
                          ? "bg-emerald-600/20 border-emerald-500/50 text-emerald-300"
                          : "bg-white/5 border-white/10 text-white/50 hover:border-white/20"
                      }`}>
                      <div className="font-semibold">{def.label}</div>
                      <div className="text-xs opacity-60 mt-0.5">{def.standardLabel}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "date",     label: "Огноо",      type: "date" },
                  { key: "location", label: "Км пикет",   type: "text" },
                  { key: "sampleId", label: "Дэвтрийн №", type: "text" },
                ].map(f => (
                  <div key={f.key} className="space-y-1">
                    <label className="text-xs text-white/40">{f.label}</label>
                    <input data-testid={`input-${f.key}`} type={f.type}
                      value={(form as any)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "material",   label: "Материал / хольц" },
                  { key: "recordedBy", label: "Бүртгэсэн инженер" },
                ].map(f => (
                  <div key={f.key} className="space-y-1">
                    <label className="text-xs text-white/40">{f.label}</label>
                    <input data-testid={`input-${f.key}`} type="text"
                      value={(form as any)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {activeTestDef.fields.map((f, i) => (
                  <div key={f.key} className="space-y-1">
                    <label className="text-xs text-white/40">{f.label}</label>
                    <input data-testid={`input-${f.key}-${i}`} type="text"
                      value={i === 0 ? form.value : form.value2}
                      placeholder={f.placeholder}
                      onChange={e => setForm(p => i === 0 ? { ...p, value: e.target.value } : { ...p, value2: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-white/40">Статус</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    ["pass",    "Тэнцсэн",           "bg-green-700/60 border-green-500/50 text-green-300"],
                    ["pending", "Хүлээгдэж байна",   "bg-amber-700/60 border-amber-500/50 text-amber-300"],
                    ["fail",    "Тэнцээгүй",         "bg-red-700/60   border-red-500/50   text-red-300"  ],
                  ].map(([val, lbl, active]) => (
                    <button key={val} data-testid={`status-${val}`}
                      onClick={() => setForm(p => ({ ...p, status: val }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        form.status === val ? active : "bg-white/5 border-white/10 text-white/40"
                      }`}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-white/40">Тэмдэглэл</label>
                <textarea value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2} placeholder="Нэмэлт тэмдэглэл..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>

              <button data-testid="btn-save-lab"
                onClick={() => createResult.mutate(form)}
                disabled={createResult.isPending}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold text-sm transition-all disabled:opacity-40">
                {createResult.isPending ? "Хадгалж байна..." : "Туршилтын үр дүн бүртгэх"}
              </button>
            </div>
          </div>
        )}

        {/* ─── NORMS TAB ────────────────────────────────────────────────────── */}
        {tab === "norms" && canViewNorms && (
          <NormEditorTab token={token} role={role} canEdit={canEditNorms} />
        )}
      </div>
    </div>
  );
}
