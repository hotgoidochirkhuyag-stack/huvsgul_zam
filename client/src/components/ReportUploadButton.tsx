import { useState } from "react";
import { Upload, Paperclip, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORIES = [
  { value: "monthly",   label: "Сарын тайлан"       },
  { value: "project",   label: "Төслийн тайлан"      },
  { value: "financial", label: "Санхүүгийн тайлан"   },
  { value: "safety",    label: "ХАБЭА тайлан"        },
  { value: "lab",       label: "Лабораторийн тайлан" },
  { value: "hr",        label: "ХР / Хүний нөөц"     },
  { value: "other",     label: "Бусад"               },
];

interface Props {
  /** Нэвтрэрсэн хэрэглэгчийн роль (SUPERVISOR, SALES, PROJECT...) */
  role: string;
}

export default function ReportUploadButton({ role }: Props) {
  const { toast }   = useToast();
  const qc          = useQueryClient();
  const [open, setOpen]       = useState(false);
  const [uploading, setUpl]   = useState(false);
  const [title, setTitle]     = useState("");
  const [desc, setDesc]       = useState("");
  const [cat, setCat]         = useState("other");
  const [date, setDate]       = useState("");
  const [file, setFile]       = useState<File | null>(null);

  const token = () => localStorage.getItem("adminToken") ?? "";

  const reset = () => { setTitle(""); setDesc(""); setCat("other"); setDate(""); setFile(null); setOpen(false); };

  const submit = async () => {
    if (!file || !title.trim()) {
      toast({ title: "Гарчиг болон файл шаардлагатай", variant: "destructive" }); return;
    }
    setUpl(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title.trim());
    fd.append("description", desc);
    fd.append("category", cat);
    fd.append("meetingDate", date);
    try {
      const r = await fetch("/api/meeting-reports", {
        method: "POST",
        headers: { "x-admin-token": token() },
        body: fd,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Upload failed");
      toast({ title: "Тайлан амжилттай оруулагдлаа!" });
      qc.invalidateQueries({ queryKey: ["/api/meeting-reports"] });
      reset();
    } catch (e: any) {
      toast({ title: "Алдаа: " + e.message, variant: "destructive" });
    } finally { setUpl(false); }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-400 text-xs font-bold transition-all"
        data-testid="button-open-report-upload"
      >
        <Upload className="w-3.5 h-3.5" /> Тайлан оруулах
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) reset(); }}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold">Тайлан оруулах</h3>
                <p className="text-slate-500 text-xs mt-0.5">Хурлын тайлан хуваалцах</p>
              </div>
              <button onClick={reset} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Гарчиг *</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
                  placeholder="Тайлангийн нэр..." data-testid="input-modal-report-title" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Ангилал</label>
                  <select value={cat} onChange={e => setCat(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50">
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Хурлын огноо</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50" />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Тэмдэглэл</label>
                <input value={desc} onChange={e => setDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
                  placeholder="Тайлбар..." />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Файл (PDF, Excel, Word, PPT) *</label>
                <div className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${file ? "border-amber-500/50 bg-amber-500/5" : "border-white/10 hover:border-amber-500/30"}`}
                  onClick={() => document.getElementById(`rf-${role}`)?.click()}>
                  <input id={`rf-${role}`} type="file"
                    accept=".pdf,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.jpg,.jpeg,.png,.webp"
                    className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)}
                    data-testid="input-modal-report-file" />
                  {file ? (
                    <div className="flex items-center justify-center gap-2 text-amber-400">
                      <Paperclip className="w-4 h-4" />
                      <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                    </div>
                  ) : (
                    <div className="text-slate-500 text-sm py-1">
                      <Upload className="w-5 h-5 mx-auto mb-1 opacity-50" />
                      Файл сонгох
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={reset} className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-bold">Цуцлах</button>
              <button onClick={submit} disabled={uploading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold disabled:opacity-50"
                data-testid="button-modal-submit-report">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Оруулж байна..." : "Хадгалах"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
