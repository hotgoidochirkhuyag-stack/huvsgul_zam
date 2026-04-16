import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles, ChevronDown, ChevronUp, Plus, Loader2, Check,
  ArrowRight, FlaskConical, DollarSign, TrendingUp,
  Trash2, RefreshCw, Send, AlertCircle, LogOut, FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const token = () => localStorage.getItem("adminToken") ?? "";
const role  = () => (localStorage.getItem("userRole") ?? "").toUpperCase();
const api   = (url: string, opts?: RequestInit) =>
  fetch(url, { ...opts, headers: { "Content-Type": "application/json", "x-admin-token": token(), ...(opts?.headers ?? {}) } });

// ── Статус тодорхойлогч ──────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; color: string; next?: string; nextLabel?: string }> = {
  draft:           { label: "Ноорог",               color: "bg-slate-600",  next: "lab_review",     nextLabel: "Lab-т илгээх" },
  lab_review:      { label: "Lab шалгаж байна",      color: "bg-blue-600",   next: "lab_approved",   nextLabel: "Батлах (Lab)" },
  lab_approved:    { label: "Lab баталсан",          color: "bg-teal-600",   next: "finance_pricing", nextLabel: "Санхүү үнэ бөглөх" },
  finance_pricing: { label: "Санхүүгийн судалгаа",  color: "bg-amber-600",  next: "completed",       nextLabel: "Дуусгах" },
  completed:       { label: "Дууссан",               color: "bg-green-600" },
};

// Бүтээгдэхүүн DB-ээс татна (hardcode байхгүй)

const CATEGORY_LABEL: Record<string, string> = {
  material: "Материал", labor: "Хөдөлмөр", equipment: "Тоног", overhead: "Бусад",
};

// ── Нэг санал карт ──────────────────────────────────────────────────────────
function ProposalCard({ proposal }: { proposal: any }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const r = role();

  const { data: full, isLoading } = useQuery<any>({
    queryKey: ["/api/price-proposals", proposal.id],
    queryFn: () => api(`/api/price-proposals/${proposal.id}`).then(r => r.json()),
    enabled: open,
  });

  const patchProposal = useMutation({
    mutationFn: (body: any) => api(`/api/price-proposals/${proposal.id}`, { method: "PATCH", body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/price-proposals"] }); qc.invalidateQueries({ queryKey: ["/api/price-proposals", proposal.id] }); toast({ title: "Шинэчлэгдлээ ✓" }); },
    onError: (e: any) => toast({ title: "Алдаа", description: e.message, variant: "destructive" }),
  });
  const patchItem = useMutation({
    mutationFn: ({ id, body }: any) => api(`/api/price-proposal-items/${id}`, { method: "PATCH", body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/price-proposals", proposal.id] }); },
  });
  const addItem = useMutation({
    mutationFn: () => api("/api/price-proposal-items", { method: "POST", body: JSON.stringify({ proposalId: proposal.id, category: "material", materialName: "Шинэ материал", norm: 0, unit: "кг", source: "lab_adjusted", sortOrder: 99 }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/price-proposals", proposal.id] }); toast({ title: "Мөр нэмэгдлээ" }); },
  });
  const deleteItem = useMutation({
    mutationFn: (id: number) => api(`/api/price-proposal-items/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/price-proposals", proposal.id] }); },
  });
  const recalc = useMutation({
    mutationFn: () => api(`/api/price-proposals/${proposal.id}/recalculate`, { method: "POST" }).then(r => r.json()),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/price-proposals"] });
      qc.invalidateQueries({ queryKey: ["/api/price-proposals", proposal.id] });
      toast({ title: `Тооцоолол дууслаа — Нэгж өртөг: ₮${data.finalUnitCost?.toLocaleString() ?? 0}, Санал үнэ: ₮${data.suggestedPrice?.toLocaleString() ?? 0}` });
    },
  });
  const deleteProposal = useMutation({
    mutationFn: () => api(`/api/price-proposals/${proposal.id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/price-proposals"] }); toast({ title: "Устгагдлаа" }); },
  });

  const st = STATUS[proposal.status] ?? { label: proposal.status, color: "bg-slate-600" };
  const items: any[] = full?.items ?? [];
  const materials = items.filter(i => i.category === "material" || i.category === "equipment" || i.category === "overhead");

  // Дараагийн алхам руу шилжих эрхийг шалгана
  const canAdvance =
    (proposal.status === "draft" && ["SALES", "ADMIN"].includes(r)) ||
    (proposal.status === "lab_review" && ["LAB", "ADMIN"].includes(r)) ||
    (proposal.status === "lab_approved" && ["ADMIN", "SALES", "WAREHOUSE"].includes(r)) ||
    (proposal.status === "finance_pricing" && ["ADMIN", "SALES", "WAREHOUSE"].includes(r));

  const isCompleted = proposal.status === "completed";
  const canEditNorms = ["LAB", "ADMIN"].includes(r) && ["lab_review", "lab_approved"].includes(proposal.status);
  const canEditPrices = ["ADMIN", "SALES", "WAREHOUSE"].includes(r) && ["lab_approved", "finance_pricing"].includes(proposal.status);
  // Admin бол completed саналын үнэ, тоог засах боломжтой
  const canEditCompleted = r === "ADMIN" && isCompleted;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden" data-testid={`proposal-card-${proposal.id}`}>
      {/* Толгой */}
      <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-700/30 transition-all" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-xs font-bold text-white px-2.5 py-1 rounded-full ${st.color}`}>{st.label}</span>
          <span className="text-white font-semibold text-sm">{proposal.productName}</span>
          <span className="text-slate-500 text-xs">/ {proposal.unit}</span>
          {proposal.suggestedPrice && (
            <span className="text-green-400 font-black text-sm">₮{proposal.suggestedPrice.toLocaleString()}/{proposal.unit}</span>
          )}
          {proposal.barterPrice && (
            <span className="text-blue-400 text-xs font-semibold">бартер: ₮{proposal.barterPrice.toLocaleString()}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canAdvance && st.next && (
            <button
              onClick={e => { e.stopPropagation(); patchProposal.mutate({ status: st.next }); }}
              disabled={patchProposal.isPending}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded-lg transition-all"
              data-testid={`btn-advance-${proposal.id}`}>
              <ArrowRight size={11} /> {st.nextLabel}
            </button>
          )}
          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </div>

      {/* Дэлгэрэнгүй */}
      {open && (
        <div className="border-t border-slate-700 px-5 py-4 space-y-5">
          {isLoading && <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-slate-500" /></div>}

          {/* Admin — completed саналын үнэ засах хэсэг */}
          {canEditCompleted && (
            <CompletedEditPanel proposal={proposal} patchProposal={patchProposal} recalc={recalc} />
          )}

          {/* AI тайлбар */}
          {full?.aiNotes && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
              <p className="text-xs text-amber-400 font-bold mb-1 flex items-center gap-1.5"><Sparkles size={12} /> AI тайлбар (БНбД)</p>
              <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">{full.aiNotes}</p>
            </div>
          )}

          {/* Орц нормын хүснэгт */}
          {materials.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FlaskConical size={12} className="text-teal-400" /> Орц норм (1 {proposal.unit}-д)
                </p>
                {canEditPrices && (
                  <button onClick={() => recalc.mutate()} disabled={recalc.isPending}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors">
                    <RefreshCw size={11} className={recalc.isPending ? "animate-spin" : ""} /> Тооцоолох
                  </button>
                )}
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-700">
                <table className="w-full text-xs">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="text-left px-3 py-2 text-slate-400">Материал</th>
                      <th className="text-center px-3 py-2 text-slate-400">Норм</th>
                      <th className="text-center px-3 py-2 text-slate-400">Нэгж</th>
                      <th className="text-center px-3 py-2 text-slate-400">Нэгж үнэ ₮</th>
                      <th className="text-right px-3 py-2 text-slate-400">Нийт/нэгж ₮</th>
                      <th className="text-center px-3 py-2 text-slate-400">Эх</th>
                      {canEditNorms && <th className="w-8" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {materials.map((item: any) => (
                      <ItemRow key={item.id} item={item} canEditNorm={canEditNorms} canEditPrice={canEditPrices}
                        canDelete={canEditNorms}
                        onSave={(body) => patchItem.mutate({ id: item.id, body })}
                        onDelete={() => deleteItem.mutate(item.id)} />
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-700/30">
                    <tr>
                      <td colSpan={canEditNorms ? 5 : 4} className="px-3 py-2 text-slate-400 font-bold">Материалын нийт өртөг</td>
                      <td className="px-3 py-2 text-right text-amber-400 font-black">
                        ₮{materials.reduce((s, i) => s + ((i.norm ?? 0) * (i.unitPrice ?? 0)), 0).toLocaleString()}
                      </td>
                      <td />
                    </tr>
                    {canEditNorms && (
                      <tr>
                        <td colSpan={7} className="px-3 py-2">
                          <button onClick={() => addItem.mutate()} disabled={addItem.isPending}
                            className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-bold transition-colors">
                            <Plus size={13} /> Мөр нэмэх
                          </button>
                        </td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Дүгнэлт */}
          {(proposal.finalUnitCost || proposal.suggestedPrice) && (
            <div className="bg-gradient-to-r from-amber-600/10 to-teal-600/10 border border-amber-600/30 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <TrendingUp size={12} className="text-amber-400" /> Үнийн дүгнэлт
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-slate-500 text-xs">Нийт өртөг / {proposal.unit}</p>
                  <p className="text-white font-black text-lg">₮{(proposal.finalUnitCost ?? 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Нэмэгдэл {proposal.markupPct ?? 15}%</p>
                  <p className="text-amber-400 font-black text-lg">₮{((proposal.suggestedPrice ?? 0) - (proposal.finalUnitCost ?? 0)).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Бэлэн мөнгөний үнэ / {proposal.unit}</p>
                  <p className="text-green-400 font-black text-xl">₮{(proposal.suggestedPrice ?? 0).toLocaleString()}</p>
                </div>
                {proposal.barterPrice && (
                  <div className="border-l border-slate-700 pl-4">
                    <p className="text-slate-500 text-xs">Бартерийн үнэ / {proposal.unit}</p>
                    <p className="text-blue-400 font-black text-xl">₮{(proposal.barterPrice).toLocaleString()}</p>
                  </div>
                )}
              </div>
              {canEditPrices && (
                <div className="mt-3 flex items-center gap-3">
                  <label className="text-xs text-slate-400">Нэмэгдэл %</label>
                  <input type="number" defaultValue={proposal.markupPct ?? 15} min={0} max={100}
                    onBlur={e => patchProposal.mutate({ markupPct: parseFloat(e.target.value) })}
                    className="w-20 bg-slate-700 border border-slate-600 text-white rounded-lg px-2 py-1 text-xs" />
                  <button onClick={() => recalc.mutate()} disabled={recalc.isPending}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded-lg transition-all">
                    <RefreshCw size={11} className={recalc.isPending ? "animate-spin" : ""} /> Дахин тооцоолох
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Устгах */}
          {["ADMIN"].includes(r) && (
            <div className="flex justify-end">
              <button onClick={() => { if (confirm("Устгах уу?")) deleteProposal.mutate(); }}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors">
                <Trash2 size={12} /> Устгах
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Батлагдсан саналын үнэ засах самбар (Admin-д) ────────────────────────────
function CompletedEditPanel({ proposal, patchProposal, recalc }: { proposal: any; patchProposal: any; recalc: any }) {
  const [markupPct, setMarkupPct] = useState(String(proposal.markupPct ?? 15));
  const [suggestedPrice, setSuggestedPrice] = useState(String(proposal.suggestedPrice ?? ""));
  const [barterPrice, setBarterPrice] = useState(String(proposal.barterPrice ?? ""));
  const [finalUnitCost, setFinalUnitCost] = useState(String(proposal.finalUnitCost ?? ""));
  const [productName, setProductName] = useState(proposal.productName ?? "");
  const [unit, setUnit] = useState(proposal.unit ?? "м³");

  const save = () => {
    patchProposal.mutate({
      markupPct: parseFloat(markupPct) || 15,
      suggestedPrice: parseFloat(suggestedPrice) || undefined,
      barterPrice: parseFloat(barterPrice) || undefined,
      finalUnitCost: parseFloat(finalUnitCost) || undefined,
      productName,
      unit,
    });
  };

  return (
    <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
      <p className="text-xs font-bold text-green-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Check size={12} /> Admin засварлах — Батлагдсан санал
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[11px] text-slate-400 mb-1 block">Бүтээгдэхүүний нэр</label>
          <input
            type="text" value={productName}
            onChange={e => setProductName(e.target.value)}
            onBlur={save}
            data-testid="input-completed-product-name"
            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-2.5 py-1.5 text-xs"
          />
        </div>
        <div>
          <label className="text-[11px] text-slate-400 mb-1 block">Нэгж ({proposal.unit})</label>
          <input
            type="text" value={unit}
            onChange={e => setUnit(e.target.value)}
            onBlur={save}
            data-testid="input-completed-unit"
            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-2.5 py-1.5 text-xs"
          />
        </div>
        <div>
          <label className="text-[11px] text-slate-400 mb-1 block">Нэмэгдэл %</label>
          <input
            type="number" value={markupPct}
            onChange={e => setMarkupPct(e.target.value)}
            onBlur={save}
            min={0} max={200}
            data-testid="input-completed-markup"
            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-2.5 py-1.5 text-xs"
          />
        </div>
        <div>
          <label className="text-[11px] text-slate-400 mb-1 block">Нэгж өртөг ₮</label>
          <input
            type="number" value={finalUnitCost}
            onChange={e => setFinalUnitCost(e.target.value)}
            onBlur={save}
            placeholder="0"
            data-testid="input-completed-unit-cost"
            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-2.5 py-1.5 text-xs"
          />
        </div>
        <div>
          <label className="text-[11px] text-slate-400 mb-1 block">Бэлэн мөнгөний үнэ ₮</label>
          <input
            type="number" value={suggestedPrice}
            onChange={e => setSuggestedPrice(e.target.value)}
            onBlur={save}
            placeholder="0"
            data-testid="input-completed-suggested-price"
            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-2.5 py-1.5 text-xs"
          />
        </div>
        <div>
          <label className="text-[11px] text-slate-400 mb-1 block">Бартерийн үнэ ₮</label>
          <input
            type="number" value={barterPrice}
            onChange={e => setBarterPrice(e.target.value)}
            onBlur={save}
            placeholder="0"
            data-testid="input-completed-barter-price"
            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-2.5 py-1.5 text-xs"
          />
        </div>
        <div className="flex items-end col-span-2 sm:col-span-1">
          <button
            onClick={() => recalc.mutate()}
            disabled={recalc.isPending}
            data-testid="btn-completed-recalc"
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded-lg transition-all"
          >
            <RefreshCw size={11} className={recalc.isPending ? "animate-spin" : ""} />
            Дахин тооцоолох
          </button>
        </div>
      </div>
      <p className="text-slate-500 text-[10px] mt-2">Утгуудыг бөглөж талбайгаас гарахад автоматаар хадгалагдана.</p>
    </div>
  );
}

// ── Орц мөр ─────────────────────────────────────────────────────────────────
function ItemRow({ item, canEditNorm, canEditPrice, canDelete, onSave, onDelete }: any) {
  const [name, setName] = useState(item.materialName ?? "");
  const [unit, setUnit] = useState(item.unit ?? "кг");
  const [norm, setNorm] = useState(String(item.norm ?? ""));
  const [price, setPrice] = useState(String(item.unitPrice ?? ""));
  const SOURCE_COLOR: Record<string, string> = { ai: "text-blue-400", lab_adjusted: "text-teal-400", finance_set: "text-amber-400", db_norm: "text-green-400", manual: "text-slate-400" };
  const SOURCE_LABEL: Record<string, string> = { ai: "AI", lab_adjusted: "Lab", finance_set: "Санхүү", db_norm: "БНбД", manual: "Гараар" };
  return (
    <tr className="hover:bg-slate-700/20 transition-colors group">
      <td className="px-3 py-2 text-white">
        {canEditNorm ? (
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            onBlur={() => onSave({ materialName: name })}
            className="w-full bg-slate-700 border border-slate-600 text-white rounded px-1.5 py-0.5 text-xs" />
        ) : item.materialName}
      </td>
      <td className="px-3 py-2 text-center">
        {canEditNorm ? (
          <input type="number" value={norm} onChange={e => setNorm(e.target.value)}
            onBlur={() => onSave({ norm: parseFloat(norm) })}
            className="w-20 bg-slate-700 border border-slate-600 text-white rounded px-1.5 py-0.5 text-xs text-center" />
        ) : <span className="text-slate-300">{item.norm}</span>}
      </td>
      <td className="px-3 py-2 text-center">
        {canEditNorm ? (
          <input type="text" value={unit} onChange={e => setUnit(e.target.value)}
            onBlur={() => onSave({ unit })}
            className="w-14 bg-slate-700 border border-slate-600 text-white rounded px-1.5 py-0.5 text-xs text-center" />
        ) : <span className="text-slate-400">{item.unit}</span>}
      </td>
      <td className="px-3 py-2 text-center">
        {canEditPrice ? (
          <input type="number" value={price} onChange={e => setPrice(e.target.value)}
            onBlur={() => onSave({ unitPrice: parseFloat(price) })}
            className="w-28 bg-slate-700 border border-slate-600 text-white rounded px-1.5 py-0.5 text-xs text-center"
            placeholder="0" />
        ) : <span className="text-slate-300">{item.unitPrice?.toLocaleString() ?? "—"}</span>}
      </td>
      <td className="px-3 py-2 text-right text-amber-300 font-medium">
        {item.unitPrice ? `₮${((item.norm ?? 0) * item.unitPrice).toLocaleString()}` : "—"}
      </td>
      <td className="px-3 py-2 text-center">
        <span className={`text-[10px] font-bold ${SOURCE_COLOR[item.source] ?? "text-slate-400"}`}>
          {SOURCE_LABEL[item.source] ?? item.source}
        </span>
      </td>
      {canDelete && (
        <td className="px-2 py-2 text-center">
          <button onClick={() => onDelete()}
            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all">
            <Trash2 size={13} />
          </button>
        </td>
      )}
    </tr>
  );
}


// ── Үндсэн хуудас ────────────────────────────────────────────────────────────
export default function PriceProposalPage() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const r = role();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ productId: 0, productName: "", unit: "м³", productCategory: "concrete" });

  const { data: _raw, isLoading } = useQuery<any[]>({
    queryKey: ["/api/price-proposals"],
    queryFn: () => api("/api/price-proposals").then(r => r.json()),
    refetchInterval: 15000,
  });

  const { data: companyProducts = [] } = useQuery<any[]>({
    queryKey: ["/api/company-products"],
    queryFn: () => fetch("/api/company-products").then(r => r.json()),
  });
  const proposals: any[] = Array.isArray(_raw) ? _raw : [];

  // Ролоос хамааран харагдах саналуудыг шүүнэ
  const visible = proposals.filter(p => {
    if (r === "ADMIN") return true;
    if (r === "SALES") return true;
    if (r === "LAB") return ["lab_review", "lab_approved", "finance_pricing", "completed"].includes(p.status);
    if (r === "WAREHOUSE") return ["lab_approved", "finance_pricing", "completed"].includes(p.status);
    return false;
  });

  const createMut = useMutation({
    mutationFn: () => {
      if (!form.productName) throw new Error("Бүтээгдэхүүн сонгоно уу");
      return api("/api/price-proposals", {
        method: "POST",
        body: JSON.stringify({
          productName: form.productName,
          productCategory: form.productCategory,
          unit: form.unit,
          requestedBy: r,
        }),
      }).then(r => r.json());
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/price-proposals"] }); setShowCreate(false); toast({ title: "Норм үүсгэж байна... ✨", description: "Хэдэн секунд хүлээнэ үү" }); },
    onError: (e: any) => toast({ title: "Алдаа", description: e.message, variant: "destructive" }),
  });

  const dashboardUrl: Record<string, string> = {
    SALES: "/dashboard/sales", LAB: "/dashboard/lab-qc", HR: "/dashboard/hr",
    ADMIN: "/dashboard/admin", BOARD: "/dashboard/admin",
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Толгой */}
      <div className="border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation(dashboardUrl[r] ?? "/")}
              className="text-slate-400 hover:text-white text-sm flex items-center gap-1.5 transition-colors">
              <LogOut size={14} /> Буцах
            </button>
            <span className="text-slate-700">|</span>
            <div>
              <h1 className="text-white font-black text-base flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" /> Үнийн санал / Орц норм
              </h1>
              <p className="text-slate-500 text-xs">AI + БНбД стандарт · Lab → Санхүү → Борлуулалт</p>
            </div>
          </div>
          {["SALES", "ADMIN"].includes(r) && (
            <button onClick={() => setShowCreate(s => !s)}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black text-sm font-bold rounded-xl transition-all"
              data-testid="btn-create-proposal">
              <Plus size={14} /> Шинэ санал
            </button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Workflow харуулалт */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-800/60 border border-slate-700 rounded-2xl px-5 py-3 text-xs overflow-x-auto">
          {[
            { s: "draft",           icon: Sparkles,  label: "AI норм",      role: "SALES" },
            { s: "lab_review",      icon: FlaskConical, label: "Lab шалгах", role: "LAB" },
            { s: "lab_approved",    icon: Check,     label: "Lab батласан",  role: "LAB" },
            { s: "finance_pricing", icon: DollarSign, label: "Санхүү үнэ",  role: "ADMIN" },
            { s: "completed",       icon: TrendingUp, label: "Борлуулалт",   role: "SALES" },
          ].map((step, i, arr) => (
            <div key={step.s} className="flex items-center gap-1 shrink-0">
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${step.role === r || r === "ADMIN" ? "bg-amber-500/20 text-amber-400" : "text-slate-500"}`}>
                <step.icon size={11} />
                <span className="font-medium">{step.label}</span>
                <span className="text-[10px] opacity-60">({step.role})</span>
              </div>
              {i < arr.length - 1 && <ArrowRight size={12} className="text-slate-600 shrink-0" />}
            </div>
          ))}
        </div>

        {/* Шинэ санал үүсгэх */}
        {showCreate && (
          <div className="bg-slate-800 border border-amber-600/30 rounded-2xl p-5 space-y-4">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <Sparkles size={14} className="text-amber-500" /> Бүтээгдэхүүн сонгох — AI орц норм үүсгэнэ
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Бүтээгдэхүүн</label>
                <select
                  value={form.productId}
                  onChange={e => {
                    const id = parseInt(e.target.value);
                    const prod = (companyProducts as any[]).find((p: any) => p.id === id);
                    if (prod) setForm({ productId: id, productName: prod.name, unit: prod.unit, productCategory: prod.category });
                  }}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl px-3 py-2.5 text-sm"
                  data-testid="select-product-type-proposal">
                  <option value={0}>-- Сонгоно уу --</option>
                  {(companyProducts as any[]).filter((p: any) => p.isActive !== false).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                  ))}
                </select>
              </div>
              {form.productName && (
                <div className="flex items-center gap-2 bg-slate-700/50 rounded-xl px-3 py-2">
                  <span className="text-xs text-slate-400">Нэгж:</span>
                  <span className="text-white font-bold text-sm">{form.unit}</span>
                  <span className="ml-auto text-xs text-amber-400 capitalize">{form.productCategory}</span>
                </div>
              )}
            </div>
            <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl px-4 py-2.5 text-xs text-blue-300">
              <Sparkles size={11} className="inline mr-1.5" />
              AI нь БНбД болон MNS стандарт дээр тулгуурлан автоматаар орц нормыг гаргана. Lab шалгаж засах боломжтой.
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-slate-400 bg-slate-700 rounded-xl">Болих</button>
              <button onClick={() => createMut.mutate()} disabled={createMut.isPending}
                className="flex items-center gap-2 px-5 py-2 text-sm bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-xl disabled:opacity-60"
                data-testid="btn-submit-proposal">
                {createMut.isPending ? <><Loader2 size={14} className="animate-spin" /> AI бэлдэж байна...</> : <><Sparkles size={14} /> Үүсгэх</>}
              </button>
            </div>
          </div>
        )}

        {/* Саналуудын жагсаалт */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-500" /></div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Sparkles size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Үнийн санал байхгүй байна</p>
            {["SALES", "ADMIN"].includes(r) && (
              <p className="text-xs mt-1 text-slate-600">+ Шинэ санал товч дарж үүсгэнэ</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map(p => <ProposalCard key={p.id} proposal={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
