import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  MessageSquare, Trash2, Users, Mail, Filter, Layers,
  Phone, Calendar, ChevronDown, ChevronUp, HelpCircle,
  ShoppingCart, FileText, BarChart3, Plus, X, Edit2,
  CheckCircle2, Clock, AlertTriangle, TrendingUp, Banknote,
  Package, FileSignature, Printer, Download, ExternalLink,
} from "lucide-react";
import { printReport } from "@/lib/printReport";
import { useToast } from "@/hooks/use-toast";
import LogoutButton from "@/components/LogoutButton";
import NotificationBell from "@/components/NotificationBell";
import ReportUploadButton from "@/components/ReportUploadButton";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

function hdrs() {
  return {
    "Content-Type": "application/json",
    "x-admin-token": localStorage.getItem("adminToken") || "",
  };
}

// ─── CONSTANTS ────────────────────────────────────────────────────
const TYPE_STYLE: Record<string, { bg: string; text: string }> = {
  "Холбоо барих":  { bg: "bg-green-600/20",  text: "text-green-400"  },
  "Үнийн санал":   { bg: "bg-amber-600/20",  text: "text-amber-400"  },
  "Ажлын байр":    { bg: "bg-purple-600/20", text: "text-purple-400" },
  "Төслийн мэдээ": { bg: "bg-blue-600/20",   text: "text-blue-400"   },
  "Зөвлөгөө авах": { bg: "bg-cyan-600/20",   text: "text-cyan-400"   },
};

const ORDER_STATUS: Record<string, { label: string; color: string; icon: any }> = {
  pending:     { label: "Хүлээгдэж байна", color: "text-amber-400 bg-amber-500/10",   icon: Clock         },
  confirmed:   { label: "Баталгаажсан",    color: "text-blue-400 bg-blue-500/10",     icon: CheckCircle2  },
  in_progress: { label: "Явагдаж байна",   color: "text-purple-400 bg-purple-500/10", icon: TrendingUp    },
  completed:   { label: "Гүйцэтгэгдсэн",  color: "text-green-400 bg-green-500/10",   icon: CheckCircle2  },
  cancelled:   { label: "Цуцлагдсан",      color: "text-red-400 bg-red-500/10",       icon: X             },
};

const CONTRACT_STATUS: Record<string, { label: string; color: string }> = {
  active:    { label: "Хүчинтэй",   color: "text-green-400 bg-green-500/10"  },
  completed: { label: "Дууссан",    color: "text-blue-400 bg-blue-500/10"    },
  expired:   { label: "Хугацаа дууссан", color: "text-red-400 bg-red-500/10" },
};

const FACTORY_PRODUCTS = [
  { label: "М100 Бетон зуурмаг",  value: "М100 бетон",    unit: "м³" },
  { label: "М150 Бетон зуурмаг",  value: "М150 бетон",    unit: "м³" },
  { label: "М200 Бетон зуурмаг",  value: "М200 бетон",    unit: "м³" },
  { label: "М250 Бетон зуурмаг",  value: "М250 бетон",    unit: "м³" },
  { label: "М300 Бетон зуурмаг",  value: "М300 бетон",    unit: "м³" },
  { label: "М350 Бетон зуурмаг",  value: "М350 бетон",    unit: "м³" },
  { label: "М400 Бетон зуурмаг",  value: "М400 бетон",    unit: "м³" },
  { label: "Асфальт хольц (AC)",  value: "Асфальт хольц", unit: "тн" },
  { label: "Хайрга (0-5мм)",      value: "Хайрга 0-5мм",  unit: "м³" },
  { label: "Хайрга (5-20мм)",     value: "Хайрга 5-20мм", unit: "м³" },
  { label: "Шигшсэн элс",        value: "Элс",            unit: "м³" },
];
const WORK_TYPES = FACTORY_PRODUCTS.map(p => p.value);
const TABS = [
  { key: "requests",  label: "Хүсэлт",                  icon: MessageSquare },
  { key: "orders",    label: "Үйлдвэрийн захиалга",      icon: ShoppingCart  },
  { key: "contracts", label: "Гэрээ",                    icon: FileSignature },
  { key: "tenders",   label: "Тендерт явуулсан төслүүд", icon: FileText      },
  { key: "contacts",  label: "Холбогдох хүмүүс",         icon: Users         },
  { key: "report",    label: "Тайлан",                   icon: BarChart3     },
];

const CATEGORIES = ["Авто зам", "Гүүр", "Дэд бүтэц", "Барилга", "Бусад"];
const PROGRESS_COLOR = (p: number) =>
  p === 100 ? "bg-green-500" : p >= 60 ? "bg-blue-500" : p >= 30 ? "bg-amber-500" : "bg-red-500";

// ─── TENDER FORM ──────────────────────────────────────────────────
function TenderForm({ initial, onClose, onSaved }: { initial?: any; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const isEdit = !!initial;
  const [form, setForm] = useState({
    title:       initial?.title       ?? "",
    description: initial?.description ?? "",
    category:    initial?.category    ?? "Авто зам",
    location:    initial?.location    ?? "",
    year:        initial?.year        ?? new Date().getFullYear().toString(),
    progress:    initial?.progress    ?? 0,
  });
  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));
  const save = useMutation({
    mutationFn: () => {
      const url  = isEdit ? `/api/tender-projects/${initial.id}` : "/api/tender-projects";
      const meth = isEdit ? "PATCH" : "POST";
      return fetch(url, { method: meth, headers: hdrs(), body: JSON.stringify({ ...form, progress: Number(form.progress) }) })
        .then(r => { if (!r.ok) throw new Error(); return r.json(); });
    },
    onSuccess: () => { toast({ title: isEdit ? "Засагдлаа ✅" : "Нэмэгдлээ ✅" }); onSaved(); onClose(); },
    onError:   () => toast({ title: "Алдаа гарлаа", variant: "destructive" }),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="font-bold text-white">{isEdit ? "Тендер засах" : "Шинэ тендер нэмэх"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Тендерийн нэр *</label>
            <input value={form.title} onChange={f("title")} placeholder="Жишээ: МӨРӨН ХОТЫН ЗАМЫН ЗАСВАР" className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Ангилал</label>
              <select value={form.category} onChange={f("category")} className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Он</label>
              <input value={form.year} onChange={f("year")} placeholder="2025" className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50" />
            </div>
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Байршил</label>
            <input value={form.location} onChange={f("location")} placeholder="Мөрөн хот" className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50" />
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Гүйцэтгэлийн хувь: <span className="text-amber-400 font-bold">{form.progress}%</span></label>
            <input type="range" min="0" max="100" step="5" value={form.progress} onChange={f("progress")} className="w-full accent-amber-500" />
            <div className="flex justify-between text-xs text-slate-500 mt-1"><span>0%</span><span>50%</span><span>100%</span></div>
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Тайлбар</label>
            <textarea value={form.description} onChange={f("description")} rows={2} placeholder="Ажлын товч тодорхойлолт..." className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none resize-none" />
          </div>
        </div>
        <div className="p-5 border-t border-white/10 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm hover:bg-slate-700">Болих</button>
          <button onClick={() => save.mutate()} disabled={save.isPending || !form.title.trim()} className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold disabled:opacity-50">
            {save.isPending ? "Хадгалж байна..." : "Хадгалах"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TENDERS TAB ──────────────────────────────────────────────────
function TendersTab() {
  const { toast } = useToast();
  const [modal, setModal] = useState<null | "new" | any>(null);
  const [delId, setDelId] = useState<number | null>(null);

  const { data: _tendersRaw2, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/tender-projects"],
    queryFn: () => fetch("/api/tender-projects").then(r => r.json()),
  });
  const tenders: any[] = Array.isArray(_tendersRaw2) ? _tendersRaw2 : [];

  const del = useMutation({
    mutationFn: (id: number) => fetch(`/api/tender-projects/${id}`, { method: "DELETE", headers: hdrs() }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/tender-projects"] }); toast({ title: "Устгагдлаа" }); setDelId(null); },
  });

  const done    = tenders.filter((t: any) => t.progress === 100).length;
  const active  = tenders.filter((t: any) => t.progress > 0 && t.progress < 100).length;
  const waiting = tenders.filter((t: any) => t.progress === 0).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FileText}     label="Нийт тендер"    value={tenders.length} color="blue"   />
        <StatCard icon={CheckCircle2} label="Дууссан"        value={done}           color="green"  />
        <StatCard icon={TrendingUp}   label="Явагдаж байна"  value={active}         color="amber"  />
        <StatCard icon={Clock}        label="Эхлээгүй"       value={waiting}        color="purple" />
      </div>

      <div className="flex justify-end">
        <button onClick={() => setModal("new")} className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm transition-all">
          <Plus className="w-4 h-4" /> Тендер нэмэх
        </button>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-slate-400">Уншиж байна...</div>
      ) : tenders.length === 0 ? (
        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-16 text-center text-slate-500">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="mb-4">Тендер байхгүй байна</p>
          <button onClick={() => setModal("new")} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-bold">
            + Анхны тендер нэмэх
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tenders.map((t: any) => (
            <div key={t.id} className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 rounded-lg text-xs font-bold">{t.category}</span>
                    {t.year && <span className="text-slate-500 text-xs">{t.year} он</span>}
                    {t.location && <span className="text-slate-500 text-xs">· {t.location}</span>}
                  </div>
                  <h3 className="text-white font-bold text-sm leading-snug">{t.title}</h3>
                  {t.description && <p className="text-slate-400 text-xs mt-1 line-clamp-2">{t.description}</p>}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Гүйцэтгэл</span>
                      <span className={`font-bold ${t.progress === 100 ? "text-green-400" : t.progress > 0 ? "text-amber-400" : "text-slate-500"}`}>{t.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${PROGRESS_COLOR(t.progress)}`} style={{ width: `${t.progress}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setModal(t)} className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-xl transition-all" title="Засах"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => setDelId(t.id)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-xl transition-all" title="Устгах"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <TenderForm
          initial={modal === "new" ? undefined : modal}
          onClose={() => setModal(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["/api/tender-projects"] })}
        />
      )}

      {delId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="font-bold text-white">Устгах уу?</h3>
            <p className="text-slate-400 text-sm">Энэ тендерийн бичлэгийг устгах гэж байна.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setDelId(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm hover:bg-slate-700">Болих</button>
              <button onClick={() => del.mutate(delId!)} disabled={del.isPending} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold disabled:opacity-50">
                {del.isPending ? "Устгаж байна..." : "Устгах"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STAT CARD ───────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color = "blue" }: any) {
  const colors: Record<string, string> = {
    blue:   "bg-blue-600/20 text-blue-400",
    green:  "bg-green-600/20 text-green-400",
    amber:  "bg-amber-600/20 text-amber-400",
    purple: "bg-purple-600/20 text-purple-400",
    red:    "bg-red-600/20 text-red-400",
  };
  return (
    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-slate-400 text-xs">{label}</p>
        <p className="text-2xl font-black text-white">{value}</p>
      </div>
    </div>
  );
}

// ─── REQUESTS TAB ─────────────────────────────────────────────────
function RequestsTab() {
  const { toast } = useToast();
  const [filter, setFilter] = useState("Бүгд");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const FILTER_ITEMS = ["Бүгд", "Холбоо барих", "Үнийн санал", "Ажлын байр", "Төслийн мэдээ", "Зөвлөгөө авах"];

  const { data: _contactsRaw2, isLoading: lC } = useQuery<any>({
    queryKey: ["/api/contacts"],
    queryFn: () => fetch("/api/contacts", { headers: hdrs() }).then(r => r.json()),
  });
  const contacts: any[] = Array.isArray(_contactsRaw2) ? _contactsRaw2 : [];
  const { data: _subsRaw, isLoading: lS } = useQuery<any>({
    queryKey: ["/api/subscriptions"],
    queryFn: () => fetch("/api/subscriptions", { headers: hdrs() }).then(r => r.json()),
  });
  const subs: any[] = Array.isArray(_subsRaw) ? _subsRaw : [];

  const delContact = useMutation({
    mutationFn: (id: number) => fetch(`/api/contacts/${id}`, { method: "DELETE", headers: hdrs() }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/contacts"] }); toast({ title: "Устгагдлаа" }); },
  });
  const delSub = useMutation({
    mutationFn: (id: number) => fetch(`/api/subscriptions/${id}`, { method: "DELETE", headers: hdrs() }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] }); toast({ title: "Устгагдлаа" }); },
  });

  const all = [
    ...contacts.map((c: any) => ({ id: `c-${c.id}`, rawId: c.id, kind: "contact" as const, name: c.name, email: c.email, phone: c.phone || "—", info: c.message, type: c.type || "Холбоо барих", date: c.createdAt })),
    ...subs.map((s: any)     => ({ id: `s-${s.id}`, rawId: s.id, kind: "sub"     as const, name: "—",     email: s.email, phone: "—",            info: "И-мэйл бүртгэл",     type: s.type,                date: s.createdAt })),
  ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  const filtered = filter === "Бүгд" ? all : all.filter(r => r.type === filter);
  const countOf = (t: string) => t === "Ажлын байр" || t === "Төслийн мэдээ" || t === "Зөвлөгөө авах"
    ? subs.filter((s: any) => s.type === t).length
    : contacts.filter((c: any) => c.type === t).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-slate-500" />
        {FILTER_ITEMS.map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f ? "bg-amber-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
            {f} <span className="opacity-60">({f === "Бүгд" ? all.length : countOf(f)})</span>
          </button>
        ))}
      </div>

      <div className="bg-slate-900/60 rounded-2xl border border-white/10 overflow-hidden">
        {(lC || lS) ? (
          <div className="p-16 text-center text-slate-400">Уншиж байна...</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-slate-500"><Layers className="w-12 h-12 mx-auto mb-4 opacity-20" /><p>Бүртгэл байхгүй</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/60 border-b border-white/10">
                <tr>{["#","Төрөл","Нэр","И-мэйл","Утас","Мэдэгдэл","Огноо",""].map(h => (
                  <th key={h} className="text-left p-4 text-slate-400 text-xs uppercase tracking-widest">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => {
                  const style = TYPE_STYLE[row.type] || { bg: "bg-slate-700", text: "text-slate-300" };
                  const isExp = expandedId === row.id;
                  return (
                    <>
                      <tr key={row.id} onClick={() => setExpandedId(isExp ? null : row.id)} className="border-b border-white/5 hover:bg-white/[0.03] cursor-pointer">
                        <td className="p-4 text-slate-500 text-sm">{i + 1}</td>
                        <td className="p-4"><span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${style.bg} ${style.text}`}>{row.type}</span></td>
                        <td className="p-4 text-white font-medium text-sm">{row.name}</td>
                        <td className="p-4 text-slate-300 text-sm"><a href={`mailto:${row.email}`} onClick={e => e.stopPropagation()} className="hover:text-amber-400">{row.email}</a></td>
                        <td className="p-4 text-slate-400 text-sm">{row.phone}</td>
                        <td className="p-4 text-slate-300 text-sm max-w-[200px]"><p className="truncate">{row.info}</p></td>
                        <td className="p-4 text-slate-500 text-xs whitespace-nowrap"><Calendar className="w-3 h-3 inline mr-1" />{row.date ? new Date(row.date).toLocaleDateString("mn-MN") : "—"}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            {isExp ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                            <button onClick={e => { e.stopPropagation(); row.kind === "contact" ? delContact.mutate(row.rawId) : delSub.mutate(row.rawId); }} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                      {isExp && row.kind === "contact" && (
                        <tr key={`${row.id}-exp`} className="border-b border-white/5 bg-slate-900/40">
                          <td colSpan={8} className="px-8 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div><p className="text-slate-500 text-xs uppercase mb-1">Нэр</p><p className="text-white">{row.name}</p></div>
                              <div><p className="text-slate-500 text-xs uppercase mb-1">И-мэйл</p><a href={`mailto:${row.email}`} className="text-amber-400 hover:underline">{row.email}</a></div>
                              <div><p className="text-slate-500 text-xs uppercase mb-1">Утас</p><p className="text-white">{row.phone}</p></div>
                              <div className="md:col-span-3"><p className="text-slate-500 text-xs uppercase mb-1">Мэдэгдэл</p><p className="text-slate-200 bg-slate-800/50 rounded-xl p-4">{row.info}</p></div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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

// ─── ORDER FORM ───────────────────────────────────────────────────
function OrderForm({ initial, onClose, onSaved }: { initial?: any; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const isEdit = !!initial;
  const [form, setForm] = useState({
    orderNumber:      initial?.orderNumber      ?? `ZAH-${Date.now().toString().slice(-5)}`,
    clientName:       initial?.clientName       ?? "",
    clientPhone:      initial?.clientPhone      ?? "",
    clientEmail:      initial?.clientEmail      ?? "",
    productType:      initial?.productType      ?? FACTORY_PRODUCTS[2].value,
    quantity:         initial?.quantity         ?? "",
    deliveryDate:     initial?.deliveryDate     ?? "",
    deliveryLocation: initial?.deliveryLocation ?? "",
    status:           initial?.status           ?? "pending",
    notes:            initial?.notes            ?? "",
  });

  const selected = FACTORY_PRODUCTS.find(p => p.value === form.productType) || FACTORY_PRODUCTS[2];

  const save = useMutation({
    mutationFn: () => {
      const url  = isEdit ? `/api/project/orders/${initial.id}` : "/api/project/orders";
      const meth = isEdit ? "PATCH" : "POST";
      return fetch(url, { method: meth, headers: hdrs(), body: JSON.stringify({
        ...form,
        quantity: form.quantity ? parseFloat(String(form.quantity)) : null,
        unit:     selected.unit,
      }) }).then(r => { if (!r.ok) throw new Error(); return r.json(); });
    },
    onSuccess: () => { toast({ title: isEdit ? "Шинэчлэгдлээ" : "Нэмэгдлээ" }); onSaved(); onClose(); },
    onError:   () => toast({ title: "Алдаа гарлаа", variant: "destructive" }),
  });

  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="font-bold text-white">{isEdit ? "Захиалга засах" : "Шинэ захиалга"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Захиалгын дугаар</label>
            <input type="text" value={form.orderNumber} onChange={f("orderNumber")} className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50" />
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Бүтээгдэхүүн</label>
            <select value={form.productType} onChange={f("productType")} className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
              {FACTORY_PRODUCTS.map(p => <option key={p.value} value={p.value}>{p.label} ({p.unit})</option>)}
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Тоо хэмжээ ({selected.unit})</label>
            <input type="number" min="0" value={form.quantity} onChange={f("quantity")} className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50" />
          </div>
          {[
            { label: "Захиалагч нэр",    key: "clientName"       },
            { label: "Утас",             key: "clientPhone"      },
            { label: "И-мэйл",          key: "clientEmail"      },
            { label: "Хүргэлтийн хаяг", key: "deliveryLocation" },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="text-slate-400 text-xs mb-1 block">{label}</label>
              <input type="text" value={(form as any)[key]} onChange={f(key)} className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50" />
            </div>
          ))}
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Хүргэлтийн огноо</label>
            <input type="date" value={form.deliveryDate} onChange={f("deliveryDate")} className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50" />
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Статус</label>
            <select value={form.status} onChange={f("status")} className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
              {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Тэмдэглэл</label>
            <textarea value={form.notes} onChange={f("notes")} rows={2} className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none resize-none" />
          </div>
        </div>
        <div className="p-5 border-t border-white/10 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm hover:bg-slate-700">Болих</button>
          <button onClick={() => save.mutate()} disabled={save.isPending} className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold disabled:opacity-50">
            {save.isPending ? "Хадгалж байна..." : "Хадгалах"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ORDERS TAB ───────────────────────────────────────────────────
function OrdersTab() {
  const { toast } = useToast();
  const [modal, setModal] = useState<null | "new" | any>(null);

  const { data: _projOrdersRaw, isLoading } = useQuery<any>({
    queryKey: ["/api/project/orders"],
    queryFn: () => fetch("/api/project/orders", { headers: hdrs() }).then(r => r.json()),
  });
  const orders: any[] = Array.isArray(_projOrdersRaw) ? _projOrdersRaw : [];

  const del = useMutation({
    mutationFn: (id: number) => fetch(`/api/project/orders/${id}`, { method: "DELETE", headers: hdrs() }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/project/orders"] }); toast({ title: "Устгагдлаа" }); },
  });

  const totalAmt = orders.reduce((s: number, o: any) => s + (o.amount || 0), 0);
  const byStatus = Object.keys(ORDER_STATUS).map(k => ({ key: k, label: ORDER_STATUS[k].label, count: orders.filter((o: any) => o.status === k).length }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Package}      label="Нийт захиалга"   value={orders.length}                              color="blue"   />
        <StatCard icon={Banknote}     label="Нийт дүн"        value={`${(totalAmt/1000000).toFixed(1)}сая₮`}    color="amber"  />
        <StatCard icon={CheckCircle2} label="Гүйцэтгэгдсэн"  value={byStatus.find(s=>s.key==="completed")?.count??0} color="green"  />
        <StatCard icon={Clock}        label="Хүлээгдэж байна" value={byStatus.find(s=>s.key==="pending")?.count??0}   color="purple" />
      </div>

      <div className="flex justify-end">
        <button data-testid="btn-new-order" onClick={() => setModal("new")} className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm transition-all">
          <Plus className="w-4 h-4" /> Шинэ захиалга
        </button>
      </div>

      <div className="bg-slate-900/60 rounded-2xl border border-white/10 overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-slate-400">Уншиж байна...</div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center text-slate-500"><ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-20" /><p>Захиалга байхгүй байна</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/60 border-b border-white/10">
                <tr>{["Дугаар","Захиалагч","Утас","Бүтээгдэхүүн","Тоо/нэгж","Нийт дүн","Хүргэлт","Статус",""].map(h => (
                  <th key={h} className="text-left p-4 text-slate-400 text-xs uppercase tracking-wider">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {orders.map((o: any) => {
                  const st = ORDER_STATUS[o.status] || ORDER_STATUS.pending;
                  const Icon = st.icon;
                  return (
                    <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-4 text-amber-400 font-mono text-sm font-bold">{o.orderNumber}</td>
                      <td className="p-4 text-white text-sm font-medium">{o.clientName}</td>
                      <td className="p-4 text-slate-400 text-sm">{o.clientPhone || "—"}</td>
                      <td className="p-4 text-slate-300 text-sm font-medium">{o.productType || o.workType || "—"}</td>
                      <td className="p-4 text-blue-300 text-sm">{o.quantity ? `${o.quantity} ${o.unit || "м³"}` : "—"}</td>
                      <td className="p-4 text-green-400 font-bold text-sm">{o.amount ? `${Number(o.amount).toLocaleString()}₮` : "—"}</td>
                      <td className="p-4 text-slate-400 text-sm">{o.deliveryDate || o.location || "—"}</td>
                      <td className="p-4">
                        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold w-fit ${st.color}`}>
                          <Icon className="w-3 h-3" />{st.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <button data-testid={`btn-edit-order-${o.id}`} onClick={() => setModal(o)} className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button data-testid={`btn-del-order-${o.id}`} onClick={() => del.mutate(o.id)} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <OrderForm
          initial={modal === "new" ? undefined : modal}
          onClose={() => setModal(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["/api/project/orders"] })}
        />
      )}
    </div>
  );
}

// ─── CONTRACT FORM ────────────────────────────────────────────────
function ContractForm({ initial, onClose, onSaved }: { initial?: any; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const isEdit = !!initial;
  const [form, setForm] = useState({
    contractNumber: initial?.contractNumber ?? `GEE-${Date.now().toString().slice(-5)}`,
    clientName:     initial?.clientName     ?? "",
    workType:       initial?.workType       ?? WORK_TYPES[0],
    amount:         initial?.amount         ?? "",
    startDate:      initial?.startDate      ?? "",
    endDate:        initial?.endDate        ?? "",
    status:         initial?.status         ?? "active",
    description:    initial?.description    ?? "",
  });

  const save = useMutation({
    mutationFn: () => {
      const url  = isEdit ? `/api/project/contracts/${initial.id}` : "/api/project/contracts";
      const meth = isEdit ? "PATCH" : "POST";
      return fetch(url, { method: meth, headers: hdrs(), body: JSON.stringify({ ...form, amount: parseFloat(String(form.amount)) || 0 }) }).then(r => { if (!r.ok) throw new Error(); return r.json(); });
    },
    onSuccess: () => { toast({ title: isEdit ? "Шинэчлэгдлээ" : "Нэмэгдлээ" }); onSaved(); onClose(); },
    onError:   () => toast({ title: "Алдаа гарлаа", variant: "destructive" }),
  });

  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="font-bold text-white">{isEdit ? "Гэрээ засах" : "Шинэ гэрээ"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          {[
            { label: "Гэрээний дугаар", key: "contractNumber" },
            { label: "Гэрэглэгч нэр",  key: "clientName"     },
            { label: "Гэрээний дүн (₮)", key: "amount", type: "number" },
            { label: "Эхлэх огноо",    key: "startDate", type: "date" },
            { label: "Дуусах огноо",   key: "endDate",   type: "date" },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="text-slate-400 text-xs mb-1 block">{label}</label>
              <input type={type || "text"} value={(form as any)[key]} onChange={f(key)} className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50" />
            </div>
          ))}
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Ажлын төрөл</label>
            <select value={form.workType} onChange={f("workType")} className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
              {WORK_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Статус</label>
            <select value={form.status} onChange={f("status")} className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
              {Object.entries(CONTRACT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Тайлбар</label>
            <textarea value={form.description} onChange={f("description")} rows={3} className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none resize-none" />
          </div>
        </div>
        <div className="p-5 border-t border-white/10 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm hover:bg-slate-700">Болих</button>
          <button onClick={() => save.mutate()} disabled={save.isPending} className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold disabled:opacity-50">
            {save.isPending ? "Хадгалж байна..." : "Хадгалах"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CONTRACTS TAB ────────────────────────────────────────────────
function ContractsTab() {
  const { toast } = useToast();
  const [modal, setModal] = useState<null | "new" | any>(null);

  const { data: _contractsRaw, isLoading } = useQuery<any>({
    queryKey: ["/api/project/contracts"],
    queryFn: () => fetch("/api/project/contracts", { headers: hdrs() }).then(r => r.json()),
  });
  const contracts: any[] = Array.isArray(_contractsRaw) ? _contractsRaw : [];

  const del = useMutation({
    mutationFn: (id: number) => fetch(`/api/project/contracts/${id}`, { method: "DELETE", headers: hdrs() }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/project/contracts"] }); toast({ title: "Устгагдлаа" }); },
  });

  const totalAmt = contracts.reduce((s: number, c: any) => s + (c.amount || 0), 0);
  const active   = contracts.filter((c: any) => c.status === "active").length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FileText}    label="Нийт гэрээ"   value={contracts.length}                          color="blue"  />
        <StatCard icon={Banknote}    label="Нийт дүн"     value={`${(totalAmt/1000000).toFixed(1)}сая₮`}   color="amber" />
        <StatCard icon={CheckCircle2} label="Хүчинтэй"    value={active}                                    color="green" />
        <StatCard icon={AlertTriangle} label="Дууссан/хугацаа" value={contracts.length - active}            color="red"   />
      </div>

      <div className="flex justify-end">
        <button data-testid="btn-new-contract" onClick={() => setModal("new")} className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm transition-all">
          <Plus className="w-4 h-4" /> Шинэ гэрээ
        </button>
      </div>

      <div className="bg-slate-900/60 rounded-2xl border border-white/10 overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-slate-400">Уншиж байна...</div>
        ) : contracts.length === 0 ? (
          <div className="p-16 text-center text-slate-500"><FileText className="w-12 h-12 mx-auto mb-4 opacity-20" /><p>Гэрээ байхгүй байна</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/60 border-b border-white/10">
                <tr>{["Дугаар","Байгуулагч","Ажлын төрөл","Дүн","Эхлэх","Дуусах","Статус",""].map(h => (
                  <th key={h} className="text-left p-4 text-slate-400 text-xs uppercase tracking-wider">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {contracts.map((c: any) => {
                  const st = CONTRACT_STATUS[c.status] || CONTRACT_STATUS.active;
                  return (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-4 text-amber-400 font-mono text-sm font-bold">{c.contractNumber}</td>
                      <td className="p-4 text-white text-sm font-medium">{c.clientName}</td>
                      <td className="p-4 text-slate-300 text-sm">{c.workType}</td>
                      <td className="p-4 text-green-400 font-bold text-sm">{Number(c.amount).toLocaleString()}₮</td>
                      <td className="p-4 text-slate-400 text-sm">{c.startDate || "—"}</td>
                      <td className="p-4 text-slate-400 text-sm">{c.endDate || "—"}</td>
                      <td className="p-4"><span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${st.color}`}>{st.label}</span></td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <button data-testid={`btn-edit-contract-${c.id}`} onClick={() => setModal(c)} className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button data-testid={`btn-del-contract-${c.id}`} onClick={() => del.mutate(c.id)} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <ContractForm
          initial={modal === "new" ? undefined : modal}
          onClose={() => setModal(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["/api/project/contracts"] })}
        />
      )}
    </div>
  );
}

// ─── REPORT TAB ───────────────────────────────────────────────────
const PIE_COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444"];

const REPORT_CAT: Record<string, string> = {
  monthly: "Сарын тайлан", project: "Төслийн тайлан", financial: "Санхүүгийн тайлан",
  safety: "ХАБЭА тайлан", lab: "Лабораторийн тайлан", hr: "ХР / Хүний нөөц", other: "Бусад",
};

const OFFICE_TYPES = ["docx", "doc", "xlsx", "xls", "pptx", "ppt"];
const IMAGE_TYPES  = ["jpg", "jpeg", "png", "webp", "gif"];

function getReportViewUrl(id: number, fileName: string, fileType: string): string {
  const t     = (fileType || "").toLowerCase();
  const token = localStorage.getItem("adminToken") || "";
  const name  = fileName || `report.${t}`;

  // Office файлуудыг Microsoft Online Viewer-ээр нээнэ
  // — src нь extension-тэй proxy URL байх ёстой (Cloudinary raw-д extension байхгүй)
  if (OFFICE_TYPES.includes(t)) {
    const proxyUrl = `${window.location.origin}/api/meeting-reports/${id}/view/${encodeURIComponent(name)}?token=${encodeURIComponent(token)}`;
    return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(proxyUrl)}`;
  }

  // PDF болон зургийг proxy-гаар inline харуулна
  return `/api/meeting-reports/${id}/view/${encodeURIComponent(name)}?token=${encodeURIComponent(token)}`;
}

function ReportTab() {
  const { data: _rptOrdersRaw } = useQuery<any>({ queryKey: ["/api/project/orders"],    queryFn: () => fetch("/api/project/orders",    { headers: hdrs() }).then(r => r.json()) });
  const orders: any[] = Array.isArray(_rptOrdersRaw) ? _rptOrdersRaw : [];
  const { data: _rptContractsRaw } = useQuery<any>({ queryKey: ["/api/project/contracts"], queryFn: () => fetch("/api/project/contracts", { headers: hdrs() }).then(r => r.json()) });
  const contracts: any[] = Array.isArray(_rptContractsRaw) ? _rptContractsRaw : [];

  const { data: _mrRaw } = useQuery<any>({ queryKey: ["/api/meeting-reports"], queryFn: () => fetch("/api/meeting-reports", { headers: hdrs() }).then(r => r.json()) });
  const meetingReports: any[] = Array.isArray(_mrRaw) ? _mrRaw : [];

  const totalOrderAmt    = orders.reduce((s: number, o: any) => s + (o.amount    || 0), 0);
  const totalContractAmt = contracts.reduce((s: number, c: any) => s + (c.amount || 0), 0);

  const orderByStatus = Object.entries(ORDER_STATUS).map(([k, v]) => ({
    name: v.label, value: orders.filter((o: any) => o.status === k).length,
  })).filter(d => d.value > 0);

  const contractByStatus = Object.entries(CONTRACT_STATUS).map(([k, v]) => ({
    name: v.label, value: contracts.filter((c: any) => c.status === k).length,
  })).filter(d => d.value > 0);

  const workTypeData = WORK_TYPES.map(wt => ({
    name:     wt.length > 6 ? wt.slice(0, 6) + "…" : wt,
    захиалга: orders.filter((o: any) => o.workType === wt).length,
    гэрээ:    contracts.filter((c: any) => c.workType === wt).length,
  })).filter(d => d.захиалга > 0 || d.гэрээ > 0);

  function handleProjectPrint() {
    const oRows = orders.map((o: any) => {
      const st = ORDER_STATUS[o.status as keyof typeof ORDER_STATUS] ?? { label: o.status };
      return "<tr><td>" + o.title + "</td><td>" + (o.workType ?? "—") + "</td><td>" + (o.customer ?? "—") + "</td><td style='text-align:right'>" + Number(o.amount ?? 0).toLocaleString() + "₮</td><td><span class='badge gray'>" + st.label + "</span></td></tr>";
    }).join("");
    const cRows = contracts.map((c: any) => {
      const st = CONTRACT_STATUS[c.status as keyof typeof CONTRACT_STATUS] ?? { label: c.status };
      return "<tr><td>" + c.title + "</td><td>" + (c.workType ?? "—") + "</td><td>" + (c.party ?? "—") + "</td><td style='text-align:right'>" + Number(c.amount ?? 0).toLocaleString() + "₮</td><td><span class='badge gray'>" + st.label + "</span></td></tr>";
    }).join("");
    const statRow = [
      "<div class='stat-row'>",
      "<div class='stat-box'><div class='stat-val'>" + orders.length + "</div><div class='stat-lbl'>Нийт захиалга</div></div>",
      "<div class='stat-box'><div class='stat-val'>" + contracts.length + "</div><div class='stat-lbl'>Нийт гэрээ</div></div>",
      "<div class='stat-box'><div class='stat-val'>" + (totalOrderAmt / 1000000).toFixed(1) + " сая₮</div><div class='stat-lbl'>Захиалгын нийт дүн</div></div>",
      "<div class='stat-box'><div class='stat-val'>" + (totalContractAmt / 1000000).toFixed(1) + " сая₮</div><div class='stat-lbl'>Гэрээний нийт дүн</div></div>",
      "</div>",
    ].join("");
    const body = [
      statRow,
      "<div class='section-title'>Захиалгын жагсаалт</div>",
      "<table><thead><tr><th>Захиалга</th><th>Ажлын төрөл</th><th>Харилцагч</th><th>Дүн</th><th>Статус</th></tr></thead><tbody>" + (oRows || "<tr><td colspan='5'>Захиалга байхгүй</td></tr>") + "</tbody></table>",
      "<div class='section-title'>Гэрээний жагсаалт</div>",
      "<table><thead><tr><th>Гэрээ</th><th>Ажлын төрөл</th><th>Тал</th><th>Дүн</th><th>Статус</th></tr></thead><tbody>" + (cRows || "<tr><td colspan='5'>Гэрээ байхгүй</td></tr>") + "</tbody></table>",
    ].join("");
    printReport("Төслийн санхүүгийн тайлан", body);
  }

  return (
    <div className="space-y-6">
      {/* Header with PDF button */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg text-white/80">Төслийн тайлан</h2>
        <button
          data-testid="btn-print-project-report"
          onClick={handleProjectPrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all"
        >
          <Printer className="w-4 h-4" /> PDF тайлан
        </button>
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Package}     label="Нийт захиалга"  value={orders.length}                               color="blue"  />
        <StatCard icon={FileText}    label="Нийт гэрээ"     value={contracts.length}                            color="purple"/>
        <StatCard icon={Banknote}    label="Захиалгын дүн"  value={`${(totalOrderAmt/1000000).toFixed(1)}сая₮`}  color="amber" />
        <StatCard icon={TrendingUp}  label="Гэрээний дүн"   value={`${(totalContractAmt/1000000).toFixed(1)}сая₮`} color="green" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Work type grouped bar */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-300 mb-4">Ажлын төрлөөр (захиалга vs гэрээ)</h3>
          {workTypeData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">Өгөгдөл байхгүй</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={workTypeData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #ffffff20", borderRadius: 12 }} />
                <Legend />
                <Bar dataKey="захиалга" fill="#f59e0b" radius={[3,3,0,0]} />
                <Bar dataKey="гэрээ"    fill="#3b82f6" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie charts */}
        <div className="grid grid-rows-2 gap-5">
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-300 mb-2">Захиалгын статус</h3>
            {orderByStatus.length === 0 ? (
              <div className="h-20 flex items-center justify-center text-slate-500 text-sm">Өгөгдөл байхгүй</div>
            ) : (
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={orderByStatus} cx="50%" cy="50%" outerRadius={50} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={10}>
                    {orderByStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #ffffff20", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-300 mb-2">Гэрээний статус</h3>
            {contractByStatus.length === 0 ? (
              <div className="h-20 flex items-center justify-center text-slate-500 text-sm">Өгөгдөл байхгүй</div>
            ) : (
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={contractByStatus} cx="50%" cy="50%" outerRadius={50} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={10}>
                    {contractByStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #ffffff20", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Financial summary table */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-sm font-bold text-slate-300">Санхүүгийн тойм</h3>
        </div>
        <table className="w-full">
          <thead className="bg-slate-800/40">
            <tr>{["","Тоо","Нийт дүн","Дундаж дүн"].map(h => <th key={h} className="text-left p-4 text-slate-400 text-xs uppercase tracking-wider">{h}</th>)}</tr>
          </thead>
          <tbody>
            <tr className="border-t border-white/5">
              <td className="p-4 text-amber-400 font-bold">Захиалга</td>
              <td className="p-4 text-white">{orders.length}</td>
              <td className="p-4 text-green-400 font-bold">{totalOrderAmt.toLocaleString()}₮</td>
              <td className="p-4 text-slate-300">{orders.length ? Math.round(totalOrderAmt / orders.length).toLocaleString() : 0}₮</td>
            </tr>
            <tr className="border-t border-white/5">
              <td className="p-4 text-blue-400 font-bold">Гэрээ</td>
              <td className="p-4 text-white">{contracts.length}</td>
              <td className="p-4 text-green-400 font-bold">{totalContractAmt.toLocaleString()}₮</td>
              <td className="p-4 text-slate-300">{contracts.length ? Math.round(totalContractAmt / contracts.length).toLocaleString() : 0}₮</td>
            </tr>
            <tr className="border-t border-amber-500/20 bg-amber-500/5">
              <td className="p-4 text-white font-black">Нийт</td>
              <td className="p-4 text-white font-bold">{orders.length + contracts.length}</td>
              <td className="p-4 text-amber-400 font-black">{(totalOrderAmt + totalContractAmt).toLocaleString()}₮</td>
              <td className="p-4 text-slate-400">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Байршуулсан тайлангийн жагсаалт ── */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            Байршуулсан тайлангууд
            {meetingReports.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">{meetingReports.length}</span>
            )}
          </h3>
          <ReportUploadButton role="PROJECT" />
        </div>
        {meetingReports.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">
            <Download className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Тайлан байршуулаагүй байна
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {meetingReports.map((r: any) => (
              <div key={r.id} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-all">
                <div className="p-2 rounded-xl bg-amber-500/10 flex-shrink-0">
                  <FileText className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold text-sm truncate">{r.title}</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs flex-shrink-0">
                      {REPORT_CAT[r.category] ?? r.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {r.description && <span className="text-slate-400 text-xs truncate max-w-[240px]">{r.description}</span>}
                    {r.meetingDate && <span className="text-slate-500 text-xs flex items-center gap-1"><Calendar className="w-3 h-3" />{r.meetingDate}</span>}
                    <span className="text-slate-600 text-xs">{r.uploadedByRole} · {r.uploadedBy}</span>
                    {r.createdAt && <span className="text-slate-600 text-xs">{new Date(r.createdAt).toLocaleDateString("mn-MN")}</span>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <a
                    href={getReportViewUrl(r.id, r.fileName, r.fileType)}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`link-report-view-${r.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-300 text-xs font-bold transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Нээх
                  </a>
                  <a
                    href={`/api/meeting-reports/${r.id}/view/${encodeURIComponent(r.fileName || `report.${r.fileType}`)}?token=${encodeURIComponent(localStorage.getItem("adminToken") || "")}&download=1`}
                    target="_blank"
                    data-testid={`link-report-download-${r.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700/60 hover:bg-slate-600/60 border border-white/10 text-slate-300 text-xs font-bold transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CONTACTS TAB ─────────────────────────────────────────────────
function ContactForm({ initial, onClose, onSaved }: { initial?: any; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const isEdit = !!initial;
  const [form, setForm] = useState({ name: initial?.name ?? "", role: initial?.role ?? "", phone: initial?.phone ?? "" });
  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));
  const save = useMutation({
    mutationFn: () => {
      const url  = isEdit ? `/api/budget-contacts/${initial.id}` : "/api/budget-contacts";
      const meth = isEdit ? "PATCH" : "POST";
      return fetch(url, { method: meth, headers: hdrs(), body: JSON.stringify(form) })
        .then(r => { if (!r.ok) throw new Error(); return r.json(); });
    },
    onSuccess: () => { toast({ title: isEdit ? "Засагдлаа ✅" : "Нэмэгдлээ ✅" }); onSaved(); onClose(); },
    onError:   () => toast({ title: "Алдаа гарлаа", variant: "destructive" }),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="font-bold text-white">{isEdit ? "Хүн засах" : "Шинэ хүн нэмэх"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          {[
            { label: "Овог нэр",   key: "name",  placeholder: "Б. Болд" },
            { label: "Албан тушаал", key: "role", placeholder: "Ахлах инженер" },
            { label: "Утасны дугаар", key: "phone", placeholder: "9911-2233" },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="text-slate-400 text-xs mb-1 block">{label}</label>
              <input value={(form as any)[key]} onChange={f(key)} placeholder={placeholder}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50" />
            </div>
          ))}
        </div>
        <div className="p-5 border-t border-white/10 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm hover:bg-slate-700">Болих</button>
          <button onClick={() => save.mutate()} disabled={save.isPending || !form.name.trim()} className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold disabled:opacity-50">
            {save.isPending ? "Хадгалж байна..." : "Хадгалах"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ContactsTab() {
  const { toast } = useToast();
  const [modal, setModal] = useState<null | "new" | any>(null);
  const [delId, setDelId] = useState<number | null>(null);

  const { data: _budContactsRaw, isLoading } = useQuery<any>({
    queryKey: ["/api/budget-contacts"],
    queryFn: () => fetch("/api/budget-contacts", { headers: hdrs() }).then(r => r.json()),
  });
  const contacts: any[] = Array.isArray(_budContactsRaw) ? _budContactsRaw : [];

  const del = useMutation({
    mutationFn: (id: number) => fetch(`/api/budget-contacts/${id}`, { method: "DELETE", headers: hdrs() }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/budget-contacts"] }); toast({ title: "Устгагдлаа" }); setDelId(null); },
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard icon={Users} label="Нийт хүмүүс" value={contacts.length} color="blue" />
        <StatCard icon={Phone} label="Холбоо барих боломжтой" value={contacts.filter((c: any) => c.phone).length} color="green" />
      </div>

      <div className="flex justify-end">
        <button onClick={() => setModal("new")} className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm transition-all">
          <Plus className="w-4 h-4" /> Хүн нэмэх
        </button>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-slate-400">Уншиж байна...</div>
      ) : contacts.length === 0 ? (
        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-16 text-center text-slate-500">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="mb-4">Холбогдох хүн байхгүй байна</p>
          <button onClick={() => setModal("new")} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-bold">+ Хүн нэмэх</button>
        </div>
      ) : (
        <div className="bg-slate-900/60 rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-800/60 border-b border-white/10">
              <tr>{["#", "Овог нэр", "Албан тушаал", "Утас", ""].map(h => (
                <th key={h} className="text-left p-4 text-slate-400 text-xs uppercase tracking-widest">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {contacts.map((c: any, i: number) => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="p-4 text-slate-500 text-sm">{i + 1}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                        {c.name?.charAt(0) || "?"}
                      </div>
                      <span className="text-white font-medium text-sm">{c.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-slate-700/60 text-slate-300 rounded-lg text-xs">{c.role}</span>
                  </td>
                  <td className="p-4">
                    <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 text-sm transition-colors">
                      <Phone className="w-3.5 h-3.5" />{c.phone}
                    </a>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setModal(c)} className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded-xl transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDelId(c.id)} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-xl transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <ContactForm
          initial={modal === "new" ? undefined : modal}
          onClose={() => setModal(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["/api/budget-contacts"] })}
        />
      )}

      {delId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="font-bold text-white">Устгах уу?</h3>
            <p className="text-slate-400 text-sm">Энэ хүний мэдээллийг устгах гэж байна.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setDelId(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm hover:bg-slate-700">Болих</button>
              <button onClick={() => del.mutate(delId!)} disabled={del.isPending} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold disabled:opacity-50">
                {del.isPending ? "Устгаж байна..." : "Устгах"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────
export default function ProjectDashboard() {
  const [tab, setTab] = useState("requests");

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-8">
      {/* Header */}
      <header className="flex justify-between items-start mb-8 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Төслийн хөгжүүлэлт</h1>
          <p className="text-slate-400 mt-1">Захиалга · Гэрээ · Борлуулалт — Хөвсгөл Зам ХХК</p>
        </div>
        <div className="flex items-center gap-2">
          <ReportUploadButton role="PROJECT" />
          <NotificationBell role="PROJECT" />
          <LogoutButton />
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/60 border border-white/10 rounded-2xl p-1.5 mb-6 w-fit">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              data-testid={`tab-${t.key}`}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === t.key
                  ? "bg-amber-600 text-white shadow"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "requests"  && <RequestsTab />}
      {tab === "orders"    && <OrdersTab />}
      {tab === "contracts" && <ContractsTab />}
      {tab === "tenders"   && <TendersTab />}
      {tab === "contacts"  && <ContactsTab />}
      {tab === "report"    && <ReportTab />}
    </div>
  );
}
