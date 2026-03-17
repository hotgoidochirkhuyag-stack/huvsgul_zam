import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FlaskConical, Plus, Trash2, LogOut, RefreshCw, CheckCircle2,
  XCircle, Clock, ChevronDown, FileText, AlertTriangle, BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

function getHeaders() {
  return { "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") ?? "" };
}

const TODAY = new Date().toISOString().slice(0, 10);

const TEST_TYPES: Record<string, { label: string; unit: string; standard?: number; standardLabel?: string; fields: { key: string; label: string; placeholder: string }[] }> = {
  marshall: {
    label: "Marshall Туршилт (Асфальт)",
    unit: "%", standard: 3.0, standardLabel: "Агаарын хоосон орон ≤ 3.5%",
    fields: [
      { key: "value",  label: "Агаарын хоосон орон (%)",      placeholder: "2.0–4.0" },
      { key: "value2", label: "Тогтвортой байдал (Marshall Stability, kN)", placeholder: "≥ 8.0" },
    ],
  },
  compressive: {
    label: "Бетоны Даралтын Бат Бэх",
    unit: "МПа", standard: 25, standardLabel: "C25/30: ≥ 25 МПа (28 хоног)",
    fields: [
      { key: "value",  label: "Даралтын бат бэх (МПа)",   placeholder: "≥ 25" },
      { key: "value2", label: "Тест хийсэн хоног",         placeholder: "7 / 28" },
    ],
  },
  density: {
    label: "Нягтралын Коэффициент",
    unit: "Кн", standard: 0.95, standardLabel: "Кн ≥ 0.95 (замын суурь), ≥ 0.98 (замын хэвтрэг)",
    fields: [
      { key: "value",  label: "Нягтралын коэффициент (Кн)", placeholder: "0.95–1.00" },
      { key: "value2", label: "Давхарга (суурь / хэвтрэг / хучаас)", placeholder: "Суурь" },
    ],
  },
  sieve: {
    label: "Агрегатын Тоосорхойн Шинжилгээ",
    unit: "%", standard: 100, standardLabel: "БНбД дагуу фракцын хуваарилалт",
    fields: [
      { key: "value",  label: "0-2мм фракцын хувь (%)", placeholder: "%" },
      { key: "value2", label: "4.75мм дайрах хувь (%)", placeholder: "%" },
    ],
  },
  atterberg: {
    label: "Атерберг Хязгаар (Грунт)",
    unit: "%", standard: 0, standardLabel: "LL ≤ 35%, PI ≤ 12% замын суурийн грунтад",
    fields: [
      { key: "value",  label: "Шингэний хязгаар LL (%)", placeholder: "≤ 35" },
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

export default function LabQCDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const token = localStorage.getItem("adminToken") ?? "";

  const [tab, setTab] = useState<"list" | "add">("list");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const emptyForm = {
    testType: "marshall",
    location: "",
    sampleId: "",
    date: TODAY,
    material: "",
    value: "",
    value2: "",
    standard: "",
    status: "pending",
    notes: "",
    recordedBy: "",
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
        value: data.value ? parseFloat(data.value) : null,
        value2: data.value2 ? parseFloat(data.value2) : null,
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
    mutationFn: (id: number) => fetch(`/api/lab-results/${id}`, { method: "DELETE", headers: getHeaders() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/lab-results"] }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      fetch(`/api/lab-results/${id}`, { method: "PUT", headers: getHeaders(), body: JSON.stringify({ status }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/lab-results"] }),
  });

  const filtered = results.filter(r =>
    (filterType === "all" || r.testType === filterType) &&
    (filterStatus === "all" || r.status === filterStatus)
  );

  const passCount  = results.filter(r => r.status === "pass").length;
  const failCount  = results.filter(r => r.status === "fail").length;
  const pendCount  = results.filter(r => r.status === "pending").length;
  const passRate   = results.length > 0 ? Math.round(passCount / results.filter(r => r.status !== "pending").length * 100) || 0 : 0;

  const activeTestDef = TEST_TYPES[form.testType];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0f172a]/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="font-bold text-base leading-tight">Лабораторийн Хяналт</div>
              <div className="text-xs text-white/40">Чанарын шалгалтын бүртгэл</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button data-testid="btn-logout" onClick={() => { localStorage.removeItem("adminToken"); localStorage.removeItem("userRole"); setLocation("/admin"); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Нийт туршилт", value: results.length, color: "text-white", bg: "bg-white/5" },
            { label: "Тэнцсэн", value: passCount, color: "text-green-400", bg: "bg-green-500/10" },
            { label: "Тэнцээгүй", value: failCount, color: "text-red-400", bg: "bg-red-500/10" },
            { label: "Тэнцэлтийн хувь", value: `${passRate}%`, color: passRate >= 90 ? "text-green-400" : passRate >= 70 ? "text-amber-400" : "text-red-400", bg: "bg-white/5" },
          ].map(c => (
            <div key={c.label} className={`rounded-2xl border border-white/10 p-4 ${c.bg}`}>
              <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
              <div className="text-xs text-white/40 mt-0.5">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
          {[["list", "Бүх туршилт", FileText], ["add", "+ Шинэ туршилт", FlaskConical]].map(([key, label, Icon]: any) => (
            <button key={key} data-testid={`tab-${key}`} onClick={() => setTab(key as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key ? "bg-emerald-600 text-white shadow-sm" : "text-white/50 hover:text-white"
              }`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {/* LIST TAB */}
        {tab === "list" && (
          <div className="space-y-4">
            {/* Filters */}
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
                <button onClick={() => setTab("add")} className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold transition-all">
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
                            {r.value !== null && r.value !== undefined && (
                              <span className="text-emerald-400 font-bold">{r.value} {r.unit}</span>
                            )}
                            {r.value2 !== null && r.value2 !== undefined && (
                              <span className="text-white/60">{def?.fields[1]?.label}: {r.value2}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-white/30 mt-1.5">
                            {r.location && <span>📍 {r.location}</span>}
                            {r.material && <span>🪨 {r.material}</span>}
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

        {/* ADD TAB */}
        {tab === "add" && (
          <div className="max-w-2xl">
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-emerald-400" />
                Шинэ туршилтын үр дүн бүртгэх
              </h2>

              {/* Test type */}
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

              {/* Row: date, location, sampleId */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "date",     label: "Огноо",          type: "date"   },
                  { key: "location", label: "Км пикет",       type: "text"   },
                  { key: "sampleId", label: "Дэвтрийн №",     type: "text"   },
                ].map(f => (
                  <div key={f.key} className="space-y-1">
                    <label className="text-xs text-white/40">{f.label}</label>
                    <input data-testid={`input-${f.key}`} type={f.type} value={(form as any)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
                  </div>
                ))}
              </div>

              {/* Material and recorded by */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "material",   label: "Материал / хольц" },
                  { key: "recordedBy", label: "Бүртгэсэн инженер" },
                ].map(f => (
                  <div key={f.key} className="space-y-1">
                    <label className="text-xs text-white/40">{f.label}</label>
                    <input data-testid={`input-${f.key}`} type="text" value={(form as any)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
                  </div>
                ))}
              </div>

              {/* Dynamic value fields based on test type */}
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

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs text-white/40">Статус</label>
                <div className="flex gap-2">
                  {[["pass", "Тэнцсэн", "bg-green-700/60 border-green-500/50 text-green-300"],
                    ["pending", "Хүлээгдэж байна", "bg-amber-700/60 border-amber-500/50 text-amber-300"],
                    ["fail", "Тэнцээгүй", "bg-red-700/60 border-red-500/50 text-red-300"]].map(([val, lbl, active]) => (
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

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs text-white/40">Тэмдэглэл</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2} placeholder="Нэмэлт тэмдэглэл..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>

              <button data-testid="btn-save-lab" onClick={() => createResult.mutate(form)}
                disabled={createResult.isPending}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold text-sm transition-all disabled:opacity-40">
                {createResult.isPending ? "Хадгалж байна..." : "Туршилтын үр дүн бүртгэх"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
