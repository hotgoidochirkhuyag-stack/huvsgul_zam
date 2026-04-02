import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NotificationBell from "@/components/NotificationBell";
import {
  FlaskConical, Plus, Trash2, LogOut, RefreshCw, CheckCircle2,
  XCircle, Clock, FileText, AlertTriangle, ShieldCheck, History, Pencil,
  BarChart3, TrendingUp, TrendingDown, Printer, Sparkles, ClipboardList,
  ChevronDown, ChevronUp, Send, Award, QrCode, FileBarChart2, X
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { printReport } from "@/lib/printReport";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { NormConfig, NormAuditEntry } from "@shared/schema";

function getHeaders() {
  return { "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") ?? "" };
}

const TODAY = new Date().toISOString().slice(0, 10);
const DEVIATION_WARN = 0.10;

const CERT_TYPES = [
  { value: "iso9001",  label: "ISO 9001 — Чанарын менежмент" },
  { value: "iso14001", label: "ISO 14001 — Байгаль орчин" },
  { value: "iso45001", label: "ISO 45001 — Хөдөлмөрийн аюулгүй байдал" },
  { value: "gost",     label: "ГОСТ — Оросын стандарт" },
  { value: "mns",      label: "МНС — Монголын үндэсний стандарт" },
  { value: "local",    label: "Дотоодын гэрчилгээ" },
  { value: "other",    label: "Бусад" },
];

const PRODUCT_LABELS: Record<string, string> = {
  concrete_m200: "Бетон M200",
  concrete_m300: "Бетон M300",
  concrete_m400: "Бетон M400",
  asphalt:       "Асфальт бетон",
  crushed_stone: "Бутлуурын чулуу",
};

function getDaysUntilExpiry(dateStr: string) {
  const exp = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

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
    label: "Бетоны шахалтын бат бэх",
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

  const { data: _normsRaw, isLoading } = useQuery<any>({
    queryKey: ["/api/norm-configs"],
    queryFn: () => fetch("/api/norm-configs", { headers: { "x-admin-token": token } }).then(r => r.json()),
  });
  const norms: NormConfig[] = Array.isArray(_normsRaw) ? _normsRaw : [];

  const { data: _logRaw, isLoading: logLoading } = useQuery<any>({
    queryKey: ["/api/norm-audit-log"],
    queryFn: () => fetch("/api/norm-audit-log", { headers: { "x-admin-token": token } }).then(r => r.json()),
    enabled: showLog,
  });
  const auditLog: NormAuditEntry[] = Array.isArray(_logRaw) ? _logRaw : [];

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

  const [tab, setTab] = useState<"overview" | "list" | "add" | "norms" | "certs" | "orders">("overview");
  const [filterType,   setFilterType]   = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // ── Гэрчилгээ tab state ──────────────────────────────────────────────────
  const [certSubTab, setCertSubTab] = useState<"certs" | "quality" | "report">("certs");
  const [showCertForm,  setShowCertForm]  = useState(false);
  const [editCert,      setEditCert]      = useState<any>(null);
  const blankCert = { certNumber: "", certType: "iso9001", issuedBy: "", issuedDate: "", expiryDate: "", standardRef: "", scope: "", notes: "", isActive: true };
  const [certForm,  setCertForm]  = useState(blankCert);
  const [showQForm, setShowQForm] = useState(false);
  const [printCert, setPrintCert] = useState<any>(null);
  const blankQ = { batchNumber: "", productType: "concrete_m200", productName: "", quantity: 0, unit: "м³", customerName: "", deliveryDate: "", location: "", compliancePct: 100, isCompliant: true, certNumber: "", issuedBy: "Чанарын хяналтын инженер", standardRef: "МНС ISO 9001:2015", issuedDate: TODAY, notes: "" };
  const [qForm, setQForm] = useState<any>(blankQ);

  // ── Гэрчилгээ queries & mutations ──────────────────────────────────────────
  const { data: _certsRaw, isLoading: lcerts } = useQuery<any>({
    queryKey: ["/api/lab/certificates"],
    queryFn: () => fetch("/api/lab/certificates", { headers: getHeaders() }).then(r => r.json()),
  });
  const certs: any[] = Array.isArray(_certsRaw) ? _certsRaw : [];
  const activeCert = certs.find((c: any) => c.isActive);

  const saveCert = useMutation({
    mutationFn: async () => {
      const url = editCert ? `/api/lab/certificates/${editCert.id}` : "/api/lab/certificates";
      const method = editCert ? "PATCH" : "POST";
      const r = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(certForm) });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/lab/certificates"] });
      toast({ title: editCert ? "Гэрчилгээ шинэчлэгдлээ" : "Гэрчилгээ нэмэгдлээ ✓" });
      setShowCertForm(false); setEditCert(null); setCertForm(blankCert);
    },
    onError: (e: any) => toast({ title: "Алдаа", description: e.message, variant: "destructive" }),
  });

  const deleteCert = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/lab/certificates/${id}`, { method: "DELETE", headers: getHeaders() });
      if (!r.ok) throw new Error(await r.text());
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/lab/certificates"] }); toast({ title: "Устгагдлаа" }); },
  });

  const checkExpiry = useMutation({
    mutationFn: () => fetch("/api/lab/certificates/check-expiry", { method: "POST", headers: getHeaders() }).then(r => r.json()),
    onSuccess: (d: any) => toast({ title: `Шалгалт дууслаа — ${d.reminded} мэдэгдэл явуулав` }),
  });

  const { data: _qcertsRaw, isLoading: lqcerts } = useQuery<any>({
    queryKey: ["/api/lab/quality-certs"],
    queryFn: () => fetch("/api/lab/quality-certs", { headers: getHeaders() }).then(r => r.json()),
  });
  const qcerts: any[] = Array.isArray(_qcertsRaw) ? _qcertsRaw : [];

  const saveQCert = useMutation({
    mutationFn: async () => {
      const payload = { ...qForm, quantity: Number(qForm.quantity), isCompliant: Number(qForm.compliancePct) >= 100 };
      const r = await fetch("/api/lab/quality-certs", { method: "POST", headers: getHeaders(), body: JSON.stringify(payload) });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/lab/quality-certs"] });
      qc.invalidateQueries({ queryKey: ["/api/lab/compliance-report"] });
      toast({ title: "Чанарын гэрчилгээ бүртгэгдлээ ✓" });
      setShowQForm(false); setQForm(blankQ);
    },
    onError: (e: any) => toast({ title: "Алдаа", description: e.message, variant: "destructive" }),
  });

  const deleteQCert = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/lab/quality-certs/${id}`, { method: "DELETE", headers: getHeaders() });
      if (!r.ok) throw new Error(await r.text());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/lab/quality-certs"] });
      qc.invalidateQueries({ queryKey: ["/api/lab/compliance-report"] });
      toast({ title: "Устгагдлаа" });
    },
  });

  const { data: complianceReport, isLoading: lreport } = useQuery<any>({
    queryKey: ["/api/lab/compliance-report"],
    queryFn: () => fetch("/api/lab/compliance-report", { headers: getHeaders() }).then(r => r.json()),
  });

  function printQualityCert(cert: any) {
    const url = `/api/public/quality-cert/${cert.id}`;
    const w = window.open(url, "_blank", "width=800,height=1000");
    if (w) setTimeout(() => w.print(), 800);
  }

  const baseUrl = window.location.origin;

  const emptyForm = {
    testType: "marshall", location: "", sampleId: "", date: TODAY,
    material: "", value: "", value2: "", standard: "", status: "pending",
    notes: "", recordedBy: "",
  };
  const [form, setForm] = useState(emptyForm);

  const { data: _resultsRaw, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/lab-results"],
    queryFn: () => fetch("/api/lab-results", { headers: getHeaders() }).then(r => r.json()),
  });
  const results: any[] = Array.isArray(_resultsRaw) ? _resultsRaw : [];

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

  // Захиалгын туршилт хүсэлтүүд
  const { data: _reqRaw } = useQuery<any>({
    queryKey: ["/api/lab/test-requests"],
    queryFn: () => fetch("/api/lab/test-requests", { headers: getHeaders() }).then(r => r.json()),
  });
  const testRequests: any[] = Array.isArray(_reqRaw) ? _reqRaw : [];
  const pendingCount = testRequests.filter(r => r.status === "pending" || r.status === "in_testing").length;

  const [expandedReq, setExpandedReq] = useState<number | null>(null);
  const [reqForm, setReqForm] = useState<Record<number, any>>({});

  const submitTestResult = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      fetch(`/api/lab/test-requests/${id}`, {
        method: "PATCH", headers: getHeaders(),
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/lab/test-requests"] });
      toast({ title: "Туршилтын дүн илгээгдлээ ✓ Sales-д мэдэгдэл явуулсан" });
      setExpandedReq(null);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
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

  function handleLabPrint() {
    const passCount2  = results.filter(r => r.status === "pass").length;
    const failCount2  = results.filter(r => r.status === "fail").length;
    const pendCount   = results.filter(r => r.status === "pending").length;
    const passRate2   = results.filter(r => r.status !== "pending").length > 0
      ? Math.round(passCount2 / results.filter(r => r.status !== "pending").length * 100)
      : 0;

    const TEST_LABEL: Record<string, string> = {
      marshall: "Маршалл", concrete: "Бетон", compaction: "Нягтрал",
      sieve: "Шигшүүр", soil: "Хөрс",
    };
    const STATUS_LABEL: Record<string, string> = { pass: "Тэнцсэн", fail: "Тэнцээгүй", pending: "Хүлээгдэж байна" };

    const statRow = [
      "<div class='stat-row'>",
      "<div class='stat-box'><div class='stat-val'>" + results.length + "</div><div class='stat-lbl'>Нийт туршилт</div></div>",
      "<div class='stat-box'><div class='stat-val' style='color:#065f46'>" + passCount2 + "</div><div class='stat-lbl'>Тэнцсэн</div></div>",
      "<div class='stat-box'><div class='stat-val' style='color:#991b1b'>" + failCount2 + "</div><div class='stat-lbl'>Тэнцээгүй</div></div>",
      "<div class='stat-box'><div class='stat-val'>" + pendCount + "</div><div class='stat-lbl'>Хүлээгдэж байна</div></div>",
      "<div class='stat-box'><div class='stat-val'>" + passRate2 + "%</div><div class='stat-lbl'>Тэнцэлтийн хувь</div></div>",
      "</div>",
    ].join("");

    const rows = results.map(r => {
      const stClass = r.status === "pass" ? "ok" : r.status === "fail" ? "fail" : "gray";
      const stLabel = STATUS_LABEL[r.status] ?? r.status;
      return "<tr><td>" + r.date + "</td><td>" + (TEST_LABEL[r.testType] ?? r.testType) + "</td><td>" + (r.location ?? "—") + "</td><td>" + (r.sampleId ?? "—") + "</td><td>" + (r.value ?? "—") + (r.value2 ? " / " + r.value2 : "") + "</td><td><span class='badge " + stClass + "'>" + stLabel + "</span></td><td>" + (r.recordedBy ?? "—") + "</td></tr>";
    }).join("");

    const body = [
      statRow,
      "<div class='section-title'>Туршилтын дэлгэрэнгүй жагсаалт</div>",
      "<table><thead><tr><th>Огноо</th><th>Туршилтын төрөл</th><th>Байршил</th><th>Дээж ID</th><th>Утга</th><th>Статус</th><th>Хариуцсан</th></tr></thead><tbody>" + rows + "</tbody></table>",
    ].join("");

    printReport("Лабораторийн чанарын хяналтын тайлан", body);
  }

  const TABS: { key: "overview"|"list"|"add"|"norms"|"certs"|"orders"; label: string; icon: any; show: boolean; badge?: number }[] = [
    { key: "overview", label: "Хяналтын самбар",    icon: BarChart3,      show: true          },
    { key: "orders",   label: "Захиалгын туршилт",  icon: ClipboardList,  show: true,  badge: pendingCount },
    { key: "list",     label: "Туршилтын дүн",      icon: FileText,       show: true          },
    { key: "add",      label: "Шинэ туршилт",       icon: FlaskConical,   show: true          },
    { key: "norms",    label: "БНбД Норм",           icon: ShieldCheck,    show: canViewNorms  },
    { key: "certs",    label: "Гэрчилгээ",           icon: Award,          show: true          },
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
            <button onClick={() => setLocation("/price-proposals")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-400 border border-amber-600/40 hover:bg-amber-600/10 rounded-xl transition-all"
              data-testid="btn-price-proposals">
              <Sparkles size={12} /> Үнийн санал
            </button>
            <NotificationBell role="LAB" />
            <button onClick={() => refetch()}
              className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button data-testid="btn-logout"
              onClick={() => { localStorage.removeItem("adminToken"); localStorage.removeItem("userRole"); setLocation("/select-role"); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit flex-wrap">
          {TABS.filter(t => t.show).map(({ key, label, icon: Icon, badge }) => (
            <button key={key} data-testid={`tab-${key}`} onClick={() => setTab(key)}
              className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key
                  ? key === "norms"
                    ? "bg-amber-600/50 text-amber-100 shadow-sm"
                    : "bg-emerald-600 text-white shadow-sm"
                  : "text-white/50 hover:text-white"
              }`}>
              <Icon className="w-4 h-4" />
              {label}
              {badge != null && badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {badge}
                </span>
              )}
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
              <button
                data-testid="btn-print-lab-report"
                onClick={handleLabPrint}
                className="ml-auto flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all"
              >
                <Printer className="w-4 h-4" /> PDF тайлан
              </button>
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

        {/* ─── ГЭРЧИЛГЭЭ TAB ────────────────────────────────────────────────── */}
        {tab === "certs" && (
          <div className="space-y-4">
            {/* Print quality cert modal */}
            {printCert && (
              <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setPrintCert(null)}>
                <div className="bg-[#0f172a] border border-amber-500/30 rounded-2xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-amber-400 font-bold">Чанарын гэрчилгээний хуудас</h3>
                    <button onClick={() => setPrintCert(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
                  </div>
                  <div className="bg-white rounded-xl p-4 flex items-start gap-4">
                    <div className="shrink-0">
                      <QRCodeSVG value={`${baseUrl}/api/public/quality-cert/${printCert.id}`} size={120} level="H" />
                      <p className="text-center text-xs text-gray-500 mt-1">Скан хийн харах</p>
                    </div>
                    <div className="text-gray-800 text-sm space-y-1.5">
                      <p className="font-bold text-base text-gray-900">Хөвсгөл зам ХХК</p>
                      <p><span className="text-gray-500">Партийн №:</span> <strong>{printCert.batchNumber}</strong></p>
                      <p><span className="text-gray-500">Бүтээгдэхүүн:</span> {printCert.productName}</p>
                      <p><span className="text-gray-500">Тоо хэмжээ:</span> {printCert.quantity} {printCert.unit}</p>
                      {printCert.customerName && <p><span className="text-gray-500">Харилцагч:</span> {printCert.customerName}</p>}
                      {printCert.standardRef && <p><span className="text-gray-500">Стандарт:</span> {printCert.standardRef}</p>}
                      <p><span className="text-gray-500">Тохирлын хувь:</span> <strong className="text-green-600">{printCert.compliancePct}%</strong></p>
                      {activeCert && <p><span className="text-gray-500">Тохирлын гэрчилгээ:</span> {activeCert.certNumber}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => printQualityCert(printCert)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all">
                      <Printer size={15} /> Хэвлэх
                    </button>
                    <button onClick={() => window.open(`/api/public/quality-cert/${printCert.id}`, "_blank")}
                      className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition-all text-sm">
                      <QrCode size={15} /> QR харах
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab nav */}
            <div className="flex gap-1 bg-slate-900/60 border border-white/10 rounded-2xl p-1 w-fit">
              {([
                { key: "certs",   label: "Тохирлын гэрчилгээ", icon: Award },
                { key: "quality", label: "Чанарын гэрчилгээ",  icon: FlaskConical },
                { key: "report",  label: "Чанарын тохирлын тайлан", icon: FileBarChart2 },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setCertSubTab(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    certSubTab === key ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white"
                  }`}>
                  <Icon size={14} />{label}
                </button>
              ))}
            </div>

            {/* ── 1. ТОХИРЛЫН ГЭРЧИЛГЭЭНИЙ БҮРТГЭЛ ── */}
            {certSubTab === "certs" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-bold">Тохирлын гэрчилгээний бүртгэл</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Хугацаа дуусахаас 30 хоногийн өмнө <strong className="text-amber-400">23:00 цагт автоматаар</strong> мэдэгдэл илгээнэ</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => checkExpiry.mutate()} disabled={checkExpiry.isPending}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-xl transition-all">
                      <RefreshCw size={13} className={checkExpiry.isPending ? "animate-spin" : ""} />
                      Гараар шалгах
                    </button>
                    <button onClick={() => { setEditCert(null); setCertForm(blankCert); setShowCertForm(true); }}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-xl transition-all">
                      <Plus size={14} /> Гэрчилгээ нэмэх
                    </button>
                  </div>
                </div>
                {showCertForm && (
                  <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-5">
                    <h4 className="text-amber-400 font-bold mb-4">{editCert ? "Гэрчилгээ засах" : "Шинэ гэрчилгээ нэмэх"}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { k: "certNumber",  label: "Гэрчилгээний дугаар", placeholder: "ISO-2024-001" },
                        { k: "issuedBy",    label: "Олгосон байгууллага",  placeholder: "MCS Certification" },
                        { k: "issuedDate",  label: "Олгосон огноо",        placeholder: "2024-01-15", type: "date" },
                        { k: "expiryDate",  label: "Дуусах огноо",         placeholder: "2027-01-14", type: "date" },
                        { k: "standardRef", label: "Стандарт лавлагаа",    placeholder: "МNS ISO 9001:2015" },
                        { k: "scope",       label: "Хамрах хүрээ",         placeholder: "Авто замын бүтээц, бетон, асфальт" },
                      ].map(({ k, label, placeholder, type }) => (
                        <div key={k}>
                          <label className="text-slate-400 text-xs mb-1 block">{label}</label>
                          <input type={type || "text"} value={(certForm as any)[k] || ""} onChange={e => setCertForm(p => ({ ...p, [k]: e.target.value }))}
                            placeholder={placeholder}
                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 outline-none" />
                        </div>
                      ))}
                      <div>
                        <label className="text-slate-400 text-xs mb-1 block">Гэрчилгээний төрөл</label>
                        <select value={certForm.certType} onChange={e => setCertForm(p => ({ ...p, certType: e.target.value }))}
                          className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 outline-none">
                          {CERT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-slate-400 text-xs mb-1 block">Тэмдэглэл</label>
                        <input value={certForm.notes || ""} onChange={e => setCertForm(p => ({ ...p, notes: e.target.value }))}
                          className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 outline-none" />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4 justify-end">
                      <button onClick={() => { setShowCertForm(false); setEditCert(null); setCertForm(blankCert); }}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-xl">Болих</button>
                      <button onClick={() => saveCert.mutate()} disabled={saveCert.isPending}
                        className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm rounded-xl transition-all">
                        {saveCert.isPending ? "Хадгалж байна..." : "Хадгалах"}
                      </button>
                    </div>
                  </div>
                )}
                {lcerts ? <div className="text-center py-10 text-slate-500">Уншиж байна...</div> : certs.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 bg-slate-900/40 rounded-2xl border border-white/5">
                    <Award className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Тохирлын гэрчилгээ бүртгэгдээгүй байна</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {certs.map((c: any) => {
                      const days = getDaysUntilExpiry(c.expiryDate);
                      const expired = days <= 0;
                      const warning = days > 0 && days <= 30;
                      return (
                        <div key={c.id} className={`bg-slate-900/60 border rounded-2xl p-4 flex items-start gap-4 ${
                          expired ? "border-red-500/40" : warning ? "border-amber-500/40" : "border-white/10"
                        }`}>
                          <div className={`p-2.5 rounded-xl ${expired ? "bg-red-500/20" : warning ? "bg-amber-500/20" : "bg-green-500/20"}`}>
                            <Award className={`w-5 h-5 ${expired ? "text-red-400" : warning ? "text-amber-400" : "text-green-400"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-white font-bold text-sm">{c.certNumber}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                expired ? "bg-red-500/20 text-red-400" : warning ? "bg-amber-500/20 text-amber-400" : "bg-green-500/20 text-green-400"
                              }`}>
                                {expired ? "Хугацаа дууссан" : warning ? `${days} хоног үлдсэн ⚠️` : `${days} хоног үлдсэн`}
                              </span>
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                                {CERT_TYPES.find(t => t.value === c.certType)?.label.split(" — ")[0] ?? c.certType.toUpperCase()}
                              </span>
                              {!c.isActive && <span className="px-2 py-0.5 bg-slate-600/40 text-slate-400 rounded-full text-xs">Идэвхгүй</span>}
                            </div>
                            <p className="text-slate-400 text-xs mt-1">Олгосон: {c.issuedBy} · {c.issuedDate} — {c.expiryDate}</p>
                            {c.standardRef && <p className="text-slate-500 text-xs">{c.standardRef}</p>}
                            {c.scope && <p className="text-slate-500 text-xs">{c.scope}</p>}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => { setEditCert(c); setCertForm({ certNumber: c.certNumber, certType: c.certType, issuedBy: c.issuedBy, issuedDate: c.issuedDate, expiryDate: c.expiryDate, standardRef: c.standardRef || "", scope: c.scope || "", notes: c.notes || "", isActive: c.isActive }); setShowCertForm(true); }}
                              className="p-2 bg-slate-700 hover:bg-amber-600/20 text-slate-400 hover:text-amber-400 rounded-lg transition-all">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => { if (confirm("Устгах уу?")) deleteCert.mutate(c.id); }}
                              className="p-2 bg-slate-700 hover:bg-red-600/20 text-slate-400 hover:text-red-400 rounded-lg transition-all">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── 2. ЧАНАРЫН ГЭРЧИЛГЭЭ (Batch) ── */}
            {certSubTab === "quality" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-bold">Чанарын гэрчилгээ бүртгэл</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Захиалга / партийн чанарын гэрчилгээ — QR кодтой хэвлэнэ</p>
                  </div>
                  <button onClick={() => setShowQForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-xl transition-all">
                    <Plus size={14} /> Гэрчилгээ бүртгэх
                  </button>
                </div>
                {showQForm && (
                  <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-5">
                    <h4 className="text-amber-400 font-bold mb-4">Шинэ чанарын гэрчилгээ</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400 text-xs mb-1 block">Партийн дугаар *</label>
                        <input value={qForm.batchNumber} onChange={e => setQForm((p: any) => ({ ...p, batchNumber: e.target.value, productName: p.productName || PRODUCT_LABELS[p.productType] }))}
                          placeholder={`BATCH-${new Date().getFullYear()}-${String(qcerts.length + 1).padStart(3, "0")}`}
                          className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 outline-none" />
                      </div>
                      <div>
                        <label className="text-slate-400 text-xs mb-1 block">Бүтээгдэхүүний төрөл *</label>
                        <select value={qForm.productType} onChange={e => setQForm((p: any) => ({ ...p, productType: e.target.value, productName: PRODUCT_LABELS[e.target.value] || "" }))}
                          className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 outline-none">
                          {Object.entries(PRODUCT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-slate-400 text-xs mb-1 block">Тоо хэмжээ</label>
                        <div className="flex gap-2">
                          <input type="number" value={qForm.quantity} onChange={e => setQForm((p: any) => ({ ...p, quantity: e.target.value }))}
                            className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 outline-none" />
                          <select value={qForm.unit} onChange={e => setQForm((p: any) => ({ ...p, unit: e.target.value }))}
                            className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 outline-none">
                            <option value="м³">м³</option><option value="тн">тн</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-slate-400 text-xs mb-1 block">Тохирлын хувь (%)</label>
                        <input type="number" min={0} max={100} value={qForm.compliancePct} onChange={e => setQForm((p: any) => ({ ...p, compliancePct: Number(e.target.value), isCompliant: Number(e.target.value) >= 100 }))}
                          className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 outline-none" />
                      </div>
                      <div>
                        <label className="text-slate-400 text-xs mb-1 block">Харилцагч</label>
                        <input value={qForm.customerName} onChange={e => setQForm((p: any) => ({ ...p, customerName: e.target.value }))}
                          className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 outline-none" />
                      </div>
                      <div>
                        <label className="text-slate-400 text-xs mb-1 block">Нийлүүлэлтийн огноо</label>
                        <input type="date" value={qForm.deliveryDate} onChange={e => setQForm((p: any) => ({ ...p, deliveryDate: e.target.value }))}
                          className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 outline-none" />
                      </div>
                      <div>
                        <label className="text-slate-400 text-xs mb-1 block">Гэрчилгээний №</label>
                        <select value={qForm.certNumber} onChange={e => setQForm((p: any) => ({ ...p, certNumber: e.target.value }))}
                          className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 outline-none">
                          <option value="">— Сонгох —</option>
                          {certs.map((c: any) => <option key={c.id} value={c.certNumber}>{c.certNumber} ({c.certType.toUpperCase()})</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-slate-400 text-xs mb-1 block">Стандарт лавлагаа</label>
                        <input value={qForm.standardRef} onChange={e => setQForm((p: any) => ({ ...p, standardRef: e.target.value }))}
                          className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 outline-none" />
                      </div>
                      <div>
                        <label className="text-slate-400 text-xs mb-1 block">Байршил / объект</label>
                        <input value={qForm.location} onChange={e => setQForm((p: any) => ({ ...p, location: e.target.value }))}
                          className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 outline-none" />
                      </div>
                      <div>
                        <label className="text-slate-400 text-xs mb-1 block">Олгосон огноо</label>
                        <input type="date" value={qForm.issuedDate} onChange={e => setQForm((p: any) => ({ ...p, issuedDate: e.target.value }))}
                          className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 outline-none" />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4 justify-end">
                      <button onClick={() => { setShowQForm(false); setQForm(blankQ); }} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-xl">Болих</button>
                      <button onClick={() => saveQCert.mutate()} disabled={saveQCert.isPending}
                        className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm rounded-xl">
                        {saveQCert.isPending ? "Хадгалж байна..." : "Бүртгэх"}
                      </button>
                    </div>
                  </div>
                )}
                {lqcerts ? <div className="text-center py-10 text-slate-500">Уншиж байна...</div> : qcerts.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 bg-slate-900/40 rounded-2xl border border-white/5">
                    <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Чанарын гэрчилгээ байхгүй байна</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-white/10">
                    <table className="w-full">
                      <thead className="bg-slate-800/60">
                        <tr>
                          {["Партийн №", "Бүтээгдэхүүн", "Тоо хэмжээ", "Харилцагч", "Огноо", "Тохирол", ""].map(h => (
                            <th key={h} className="text-left p-3 text-slate-400 text-xs uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {qcerts.map((q: any) => (
                          <tr key={q.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                            <td className="p-3 text-white text-sm font-mono">{q.batchNumber}</td>
                            <td className="p-3 text-slate-300 text-sm">{q.productName || PRODUCT_LABELS[q.productType]}</td>
                            <td className="p-3 text-slate-300 text-sm">{q.quantity} {q.unit}</td>
                            <td className="p-3 text-slate-400 text-sm">{q.customerName || "—"}</td>
                            <td className="p-3 text-slate-400 text-sm">{q.deliveryDate || q.issuedDate || "—"}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                q.isCompliant ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                              }`}>{q.compliancePct ?? 100}%</span>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1.5">
                                <button onClick={() => setPrintCert(q)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 text-xs rounded-lg transition-all font-bold">
                                  <QrCode size={12} /> QR хэвлэх
                                </button>
                                <button onClick={() => { if (confirm("Устгах уу?")) deleteQCert.mutate(q.id); }}
                                  className="p-1.5 bg-slate-700 hover:bg-red-600/20 text-slate-400 hover:text-red-400 rounded-lg transition-all">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── 3. ТУЗ ТАЙЛАН ── */}
            {certSubTab === "report" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-white font-bold">Чанарын тохирлын тайлан</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Нийт үйлдвэрлэсэн бүтээгдэхүүний хэдэн хувь нь "Тохирлын гэрчилгээ"-ний шаардлагад 100% нийцсэн</p>
                </div>
                {lreport ? <div className="text-center py-10 text-slate-500">Уншиж байна...</div> : !complianceReport ? null : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 text-center">
                        <p className="text-slate-400 text-xs mb-1">Нийт парти</p>
                        <p className="text-3xl font-black text-white">{complianceReport.total}</p>
                      </div>
                      <div className="bg-slate-900/60 border border-green-500/20 rounded-2xl p-4 text-center">
                        <p className="text-slate-400 text-xs mb-1">100% нийцсэн</p>
                        <p className="text-3xl font-black text-green-400">{complianceReport.compliant}</p>
                      </div>
                      <div className="bg-slate-900/60 border border-red-500/20 rounded-2xl p-4 text-center">
                        <p className="text-slate-400 text-xs mb-1">Нийцээгүй</p>
                        <p className="text-3xl font-black text-red-400">{complianceReport.nonCompliant}</p>
                      </div>
                      <div className={`rounded-2xl p-4 text-center border ${
                        complianceReport.compliancePct >= 95 ? "bg-green-500/10 border-green-500/30" :
                        complianceReport.compliancePct >= 80 ? "bg-amber-500/10 border-amber-500/30" : "bg-red-500/10 border-red-500/30"
                      }`}>
                        <p className="text-slate-400 text-xs mb-1">Тохирлын хувь</p>
                        <p className={`text-3xl font-black ${
                          complianceReport.compliancePct >= 95 ? "text-green-400" :
                          complianceReport.compliancePct >= 80 ? "text-amber-400" : "text-red-400"
                        }`}>{complianceReport.compliancePct}%</p>
                      </div>
                    </div>
                    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white font-bold text-sm">Нийт тохирлын түвшин</span>
                        <span className="text-slate-400 text-xs">Зорилт: 95%+</span>
                      </div>
                      <div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${
                          complianceReport.compliancePct >= 95 ? "bg-green-500" : complianceReport.compliancePct >= 80 ? "bg-amber-500" : "bg-red-500"
                        }`} style={{ width: `${Math.min(100, complianceReport.compliancePct)}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>0%</span><span className="text-amber-400">95% зорилт</span><span>100%</span>
                      </div>
                    </div>
                    {Object.keys(complianceReport.byProduct ?? {}).length > 0 && (
                      <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-white/10">
                          <h4 className="text-white font-bold text-sm">Бүтээгдэхүүний төрлөөр</h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-slate-800/50">
                              <tr>
                                {["Бүтээгдэхүүн", "Нийт парти", "100% нийцсэн", "Тохирлын %"].map(h => (
                                  <th key={h} className="text-left p-3 text-slate-400 text-xs uppercase tracking-wider">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(complianceReport.byProduct).map(([prod, stats]: [string, any]) => {
                                const pct = stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 0;
                                return (
                                  <tr key={prod} className="border-t border-white/5 hover:bg-white/[0.02]">
                                    <td className="p-3 text-white text-sm">{PRODUCT_LABELS[prod] ?? prod}</td>
                                    <td className="p-3 text-slate-300 text-sm">{stats.total}</td>
                                    <td className="p-3 text-green-400 font-bold">{stats.compliant}</td>
                                    <td className="p-3">
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                          <div className={`h-full rounded-full ${pct >= 95 ? "bg-green-500" : pct >= 80 ? "bg-amber-500" : "bg-red-500"}`}
                                            style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className={`text-xs font-bold w-10 text-right ${pct >= 95 ? "text-green-400" : pct >= 80 ? "text-amber-400" : "text-red-400"}`}>{pct}%</span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {complianceReport.total === 0 && (
                      <div className="text-center py-12 text-slate-500 bg-slate-900/40 rounded-2xl border border-white/5">
                        <FileBarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p>"Чанарын гэрчилгээ" табаас партийн бүртгэл нэмнэ үү</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
        {/* ─── ORDERS TAB — Захиалгын туршилт ──────────────────────────────── */}
        {tab === "orders" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-emerald-300 flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Захиалгын туршилт хүсэлтүүд
              </h2>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-amber-500/15 text-amber-400 font-bold">
                  {testRequests.filter(r => r.status === "pending").length} хүлээгдэж байна
                </span>
                <span className="px-2 py-1 rounded bg-blue-500/15 text-blue-400 font-bold">
                  {testRequests.filter(r => r.status === "in_testing").length} хийгдэж байна
                </span>
                <span className="px-2 py-1 rounded bg-green-500/15 text-green-400 font-bold">
                  {testRequests.filter(r => r.status === "passed").length} тэнцсэн
                </span>
              </div>
            </div>

            {testRequests.length === 0 ? (
              <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-10 text-center text-white/30">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Захиалгаас туршилт хүсэлт ирээгүй байна
              </div>
            ) : (
              <div className="space-y-3">
                {testRequests.map((req: any) => {
                  const isOpen = expandedReq === req.id;
                  const statusCfg = {
                    pending:    { cls: "bg-amber-500/15 text-amber-400",  label: "Хүлээгдэж байна", icon: Clock },
                    in_testing: { cls: "bg-blue-500/15 text-blue-400",    label: "Хийгдэж байна",   icon: FlaskConical },
                    passed:     { cls: "bg-green-500/15 text-green-400",  label: "Тэнцсэн",         icon: CheckCircle2 },
                    failed:     { cls: "bg-red-500/15 text-red-400",      label: "Тэнцээгүй",       icon: XCircle },
                  }[req.status as string] ?? { cls: "bg-white/10 text-white/50", label: req.status, icon: Clock };
                  const StatusIcon = statusCfg.icon;
                  const isDone = req.status === "passed" || req.status === "failed";
                  const form = reqForm[req.id] ?? {};
                  const setF = (k: string, v: any) => setReqForm(prev => ({ ...prev, [req.id]: { ...prev[req.id], [k]: v } }));

                  return (
                    <div key={req.id} className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden"
                         data-testid={`lab-request-${req.id}`}>
                      {/* Header row */}
                      <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/3 transition-colors"
                           onClick={() => setExpandedReq(isOpen ? null : req.id)}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <FlaskConical className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm">{req.customerName}</div>
                            <div className="text-xs text-white/40">
                              {req.grade || req.product} · {req.quantity} {req.unit} · Захиалга #{req.salesOrderId}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold ${statusCfg.cls}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusCfg.label}
                          </span>
                          <span className="text-xs text-white/30">
                            {req.createdAt ? new Date(req.createdAt).toLocaleDateString("mn-MN") : ""}
                          </span>
                          {isOpen ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                        </div>
                      </div>

                      {/* Expanded form */}
                      {isOpen && (
                        <div className="border-t border-white/10 px-5 py-5">
                          {isDone ? (
                            /* Дүн харуулах */
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                              {[
                                { label: "Налуулалт (Slump)", value: req.slumpMm, unit: "мм" },
                                { label: "Нягтрал", value: req.densityKgM3, unit: "кг/м³" },
                                { label: "7 хоногийн бат бөх", value: req.strength7d, unit: "МПа" },
                                { label: "28 хоногийн бат бөх", value: req.strength28d, unit: "МПа" },
                                { label: "Агаарын агуулга", value: req.airContent, unit: "%" },
                                { label: "Температур", value: req.tempC, unit: "°C" },
                                { label: "Хариуцсан", value: req.testedBy, unit: "" },
                                { label: "Туршсан огноо", value: req.testedAt ? new Date(req.testedAt).toLocaleDateString("mn-MN") : null, unit: "" },
                              ].map(f => (
                                <div key={f.label} className="bg-white/5 rounded-xl p-3">
                                  <div className="text-xs text-white/40">{f.label}</div>
                                  <div className={`font-bold mt-0.5 ${f.value != null ? "text-white" : "text-white/20"}`}>
                                    {f.value != null ? `${f.value}${f.unit ? " " + f.unit : ""}` : "—"}
                                  </div>
                                </div>
                              ))}
                              {req.notes && (
                                <div className="col-span-full bg-white/5 rounded-xl p-3">
                                  <div className="text-xs text-white/40">Тэмдэглэл</div>
                                  <div className="text-sm mt-0.5">{req.notes}</div>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Дүн оруулах форм */
                            <div className="space-y-4">
                              <div className="text-xs text-amber-400 font-semibold uppercase tracking-widest mb-3">
                                Туршилтын дүн оруулах — {req.grade || req.product}
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {[
                                  { k: "slumpMm",     label: "Налуулалт (мм)",         type: "number", placeholder: "ж: 120" },
                                  { k: "densityKgM3", label: "Нягтрал (кг/м³)",        type: "number", placeholder: "ж: 2350" },
                                  { k: "strength7d",  label: "Бат бөх 7 хон (МПа)",    type: "number", placeholder: "ж: 18.5" },
                                  { k: "strength28d", label: "Бат бөх 28 хон (МПа)",   type: "number", placeholder: "ж: 28.0" },
                                  { k: "airContent",  label: "Агаарын агуулга (%)",     type: "number", placeholder: "ж: 3.5" },
                                  { k: "tempC",       label: "Температур (°C)",          type: "number", placeholder: "ж: 18" },
                                ].map(f => (
                                  <div key={f.k}>
                                    <label className="text-xs text-white/50 block mb-1">{f.label}</label>
                                    <input type={f.type} placeholder={f.placeholder}
                                      data-testid={`req-input-${req.id}-${f.k}`}
                                      value={form[f.k] ?? ""}
                                      onChange={e => setF(f.k, e.target.value)}
                                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50"
                                    />
                                  </div>
                                ))}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-white/50 block mb-1">Хариуцсан лаборант</label>
                                  <input type="text" placeholder="Овог нэр"
                                    data-testid={`req-input-${req.id}-testedBy`}
                                    value={form.testedBy ?? ""}
                                    onChange={e => setF("testedBy", e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-white/50 block mb-1">Тэмдэглэл</label>
                                  <input type="text" placeholder="Нэмэлт мэдэгдэл"
                                    data-testid={`req-input-${req.id}-notes`}
                                    value={form.notes ?? ""}
                                    onChange={e => setF("notes", e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-3 pt-2">
                                <button
                                  data-testid={`req-btn-inprogress-${req.id}`}
                                  onClick={() => submitTestResult.mutate({ id: req.id, data: { status: "in_testing", ...form } })}
                                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all">
                                  <FlaskConical className="w-4 h-4" />
                                  Туршилт хийгдэж байна
                                </button>
                                <button
                                  data-testid={`req-btn-passed-${req.id}`}
                                  onClick={() => submitTestResult.mutate({ id: req.id, data: { status: "passed", ...form } })}
                                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-green-600 hover:bg-green-500 text-white rounded-xl transition-all">
                                  <CheckCircle2 className="w-4 h-4" />
                                  Тэнцсэн — Мэдэгдэл явуулах
                                </button>
                                <button
                                  data-testid={`req-btn-failed-${req.id}`}
                                  onClick={() => submitTestResult.mutate({ id: req.id, data: { status: "failed", ...form } })}
                                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-red-600/80 hover:bg-red-600 text-white rounded-xl transition-all">
                                  <XCircle className="w-4 h-4" />
                                  Тэнцээгүй — Мэдэгдэл явуулах
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
