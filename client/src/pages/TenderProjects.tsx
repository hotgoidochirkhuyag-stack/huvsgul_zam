import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Pencil, Trash2, FileText,
  MapPin, Calendar, CheckCircle2, Clock, Loader2,
  Construction, Save, X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const adminHdrs = () => ({
  "Content-Type": "application/json",
  "x-admin-token": localStorage.getItem("adminToken") || "",
});
const isAdmin = () => localStorage.getItem("adminToken") === "authenticated";

const CATEGORIES = ["Авто зам", "Гүүр", "Дэд бүтэц", "Авто зам, гүүр", "Бусад"];
const BLANK = {
  title: "", description: "", imageUrl: "/placeholder.jpg",
  category: "Авто зам", location: "", year: "", progress: 0,
};

const getStatus = (p: number | null) => {
  if (p === null || p === undefined) return { label: "Төлөвлөгдсөн", color: "bg-slate-600/40 text-slate-300 border-slate-500/30", bar: "bg-slate-500" };
  if (p >= 100) return { label: "Дууссан",            color: "bg-green-900/40 text-green-300 border-green-500/30",  bar: "bg-green-500"  };
  if (p >= 60)  return { label: "Дуусахдаа ойртсон", color: "bg-amber-900/40 text-amber-300 border-amber-500/30",  bar: "bg-amber-500"  };
  if (p >= 20)  return { label: "Явагдаж байна",      color: "bg-blue-900/40 text-blue-300 border-blue-500/30",    bar: "bg-blue-500"   };
  return                { label: "Эхлэх шатанд",      color: "bg-slate-700/40 text-slate-400 border-slate-600/30", bar: "bg-slate-500"  };
};

function ProjectForm({
  initial, onSave, onCancel, saving,
}: {
  initial: typeof BLANK;
  onSave: (data: typeof BLANK) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(initial);
  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-[#0f172a] border border-amber-500/30 rounded-2xl p-6 mb-6 shadow-xl"
    >
      <h3 className="text-amber-400 font-black text-base mb-4">
        {initial.title ? "Мэдээлэл засах" : "Шинэ тендерийн төсөл нэмэх"}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="text-slate-400 text-xs mb-1 block">Төслийн нэр *</label>
          <input
            value={form.title}
            onChange={f("title")}
            placeholder="Жишээ: МӨРӨН-ХАТГАЛ УЛСЫН ЧАН ЗАМЫН ЗАСВАР"
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/60 transition-colors"
          />
        </div>

        <div>
          <label className="text-slate-400 text-xs mb-1 block">Ангилал</label>
          <select
            value={form.category}
            onChange={f("category")}
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/60 transition-colors appearance-none cursor-pointer"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="text-slate-400 text-xs mb-1 block">Байршил</label>
          <input
            value={form.location}
            onChange={f("location")}
            placeholder="Жишээ: Хөвсгөл аймаг Мөрөн сум"
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/60 transition-colors"
          />
        </div>

        <div>
          <label className="text-slate-400 text-xs mb-1 block">Он</label>
          <input
            value={form.year}
            onChange={f("year")}
            placeholder="Жишээ: 2024 эсвэл 2022-2024"
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/60 transition-colors"
          />
        </div>

        <div>
          <label className="text-slate-400 text-xs mb-1 block">Гүйцэтгэл % (0–100)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={form.progress}
            onChange={f("progress")}
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/60 transition-colors"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-slate-400 text-xs mb-1 block">Тайлбар</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={f("description")}
            placeholder="Төслийн дэлгэрэнгүй тайлбар..."
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/60 transition-colors resize-none"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-5">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" /> Болих
        </button>
        <button
          onClick={() => onSave({ ...form, progress: Number(form.progress) } as any)}
          disabled={!form.title || saving}
          className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Хадгалж байна..." : "Хадгалах"}
        </button>
      </div>
    </motion.div>
  );
}

export default function TenderProjects() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [adding,  setAdding]  = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [delId,   setDelId]   = useState<number | null>(null);

  const { data: projects = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/tender-projects"],
    staleTime: 30_000,
  });

  const createMut = useMutation({
    mutationFn: (data: any) =>
      fetch("/api/tender-projects", { method: "POST", headers: adminHdrs(), body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/tender-projects"] }); setAdding(false); toast({ title: "✅ Төсөл нэмэгдлээ" }); },
    onError:   () => toast({ title: "Алдаа гарлаа", variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: (data: any) =>
      fetch(`/api/tender-projects/${data.id}`, { method: "PATCH", headers: adminHdrs(), body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/tender-projects"] }); setEditing(null); toast({ title: "✅ Засагдлаа" }); },
    onError:   () => toast({ title: "Алдаа гарлаа", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/tender-projects/${id}`, { method: "DELETE", headers: adminHdrs() }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["/api/tender-projects"] }); setDelId(null); toast({ title: "🗑️ Устгагдлаа" }); },
    onError:    () => toast({ title: "Алдаа гарлаа", variant: "destructive" }),
  });

  const finished = projects.filter((p: any) => (p.progress ?? 0) >= 100).length;
  const active   = projects.filter((p: any) => (p.progress ?? 0) > 0 && (p.progress ?? 0) < 100).length;

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Top nav */}
      <div className="sticky top-0 z-40 bg-[#0f172a]/95 backdrop-blur border-b border-white/10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/")}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Нүүр хуудас
            </button>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-2">
              <Construction className="w-4 h-4 text-amber-400" />
              <span className="font-black text-white text-sm">Тендерт явуулсан төслүүд</span>
            </div>
          </div>

          {isAdmin() && !adding && !editing && (
            <button
              onClick={() => { setAdding(true); setEditing(null); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-amber-900/30"
            >
              <Plus className="w-4 h-4" /> Шинэ төсөл нэмэх
            </button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Тендерт явуулсан төслүүд</h1>
          <p className="text-slate-400 text-sm">Хөвсгөл Зам ХК-ийн хэрэгжүүлсэн болон хэрэгжиж байгаа тендерийн төслүүд</p>

          {!isLoading && projects.length > 0 && (
            <div className="flex gap-4 mt-4">
              <div className="bg-slate-800/60 border border-white/8 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-slate-300 text-sm"><span className="font-black text-white">{finished}</span> Дууссан</span>
              </div>
              <div className="bg-slate-800/60 border border-white/8 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300 text-sm"><span className="font-black text-white">{active}</span> Явагдаж байна</span>
              </div>
              <div className="bg-slate-800/60 border border-white/8 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="text-slate-300 text-sm"><span className="font-black text-white">{projects.length}</span> Нийт</span>
              </div>
            </div>
          )}
        </div>

        {/* Add Form */}
        <AnimatePresence>
          {adding && (
            <ProjectForm
              initial={BLANK}
              saving={createMut.isPending}
              onSave={(data) => createMut.mutate(data)}
              onCancel={() => setAdding(false)}
            />
          )}
        </AnimatePresence>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-3" /> Уншиж байна...
          </div>
        )}

        {/* Empty */}
        {!isLoading && projects.length === 0 && (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400 text-lg font-bold mb-2">Одоогоор тендерт явуулсан төсөл байхгүй байна</p>
            <p className="text-slate-500 text-sm mb-6">Эхний тендерийн төслийг нэмж эхэлнэ үү</p>
            {isAdmin() && (
              <button
                onClick={() => setAdding(true)}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all flex items-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" /> Эхний төсөл нэмэх
              </button>
            )}
          </div>
        )}

        {/* Projects list */}
        <div className="space-y-4">
          {projects.map((p: any) => {
            const st = getStatus(p.progress);
            const isEditingThis = editing?.id === p.id;
            return (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0f172a] border border-white/8 rounded-2xl overflow-hidden hover:border-amber-500/20 transition-colors"
              >
                <AnimatePresence>
                  {isEditingThis ? (
                    <div className="p-4">
                      <ProjectForm
                        initial={{ title: p.title, description: p.description || "", imageUrl: p.imageUrl || "/placeholder.jpg", category: p.category || "Авто зам", location: p.location || "", year: p.year || "", progress: p.progress ?? 0 }}
                        saving={updateMut.isPending}
                        onSave={(data) => updateMut.mutate({ ...data, id: p.id })}
                        onCancel={() => setEditing(null)}
                      />
                    </div>
                  ) : (
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${st.color}`}>
                              {st.label}
                            </span>
                            {p.category && (
                              <span className="text-[11px] text-slate-400 bg-slate-700/50 border border-white/8 rounded-full px-2.5 py-1">
                                {p.category}
                              </span>
                            )}
                          </div>
                          <h2 className="text-white font-black text-base leading-snug mb-2">{p.title}</h2>
                          <div className="flex items-center gap-4 flex-wrap">
                            {p.location && (
                              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" /> {p.location}
                              </span>
                            )}
                            {p.year && (
                              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                                <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" /> {p.year} он
                              </span>
                            )}
                          </div>
                          {p.description && (
                            <p className="text-slate-500 text-xs mt-2 leading-relaxed">{p.description}</p>
                          )}
                        </div>

                        {isAdmin() && (
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button
                              onClick={() => { setEditing(p); setAdding(false); }}
                              className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all"
                              title="Засах"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDelId(p.id)}
                              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                              title="Устгах"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {p.progress !== null && p.progress !== undefined && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] text-slate-500">Гүйцэтгэл</span>
                            <span className="text-[12px] font-black text-amber-400">{p.progress}%</span>
                          </div>
                          <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(p.progress, 100)}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className={`h-full rounded-full ${st.bar}`}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Delete confirm dialog */}
      <AnimatePresence>
        {delId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f172a] border border-red-500/30 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl"
            >
              <Trash2 className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <h3 className="text-white font-black text-base mb-2">Төсөл устгах уу?</h3>
              <p className="text-slate-400 text-sm mb-5">Энэ үйлдлийг буцаах боломжгүй.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDelId(null)}
                  className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-bold rounded-xl transition-all"
                >
                  Болих
                </button>
                <button
                  onClick={() => deleteMut.mutate(delId)}
                  disabled={deleteMut.isPending}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {deleteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Устгах
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
