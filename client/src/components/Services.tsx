import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Construction, Truck, Warehouse, PencilRuler, X, CheckCircle2, ChevronDown, Phone, User, FileText, Wrench, Plus, Pencil, Trash2, MapPin, Calendar, Info, HelpCircle } from "lucide-react";

// ─── Бетоны маркийн тайлбар ──────────────────────────────────────
const CONCRETE_INFO: Record<string, { use: string; strength: string; examples: string; color: string }> = {
  M100:  { use: "Суурийн угтвар, нягтруулга",   strength: "В7.5 · 7.5 МПа",  examples: "Шат, засварын угтвар давхарга",                    color: "blue"   },
  M150:  { use: "Жижиг байгууламжийн суурь",    strength: "В10 · 10 МПа",   examples: "Гараж, саравч, хашаа, 1 давхар байшин",            color: "blue"   },
  M200:  { use: "Орон сууцны суурь",             strength: "В15 · 15 МПа",   examples: "1–2 давхар хувийн байшин, подвал, тавцан",          color: "green"  },
  M250:  { use: "Дунд давхар барилгын суурь",    strength: "В20 · 20 МПа",   examples: "3–5 давхар байшин, тавцан, давааны хучилт",         color: "green"  },
  M300:  { use: "Өндөр барилга, дам нуруу",      strength: "В22.5 · 22.5 МПа", examples: "6+ давхар барилга, дам нуруу, хучилт, чийгтэй орчин", color: "amber"  },
  M350:  { use: "Инженерийн байгууламж",         strength: "В25 · 25 МПа",   examples: "Авто замын хавтан, гүүрийн хэсэг, тулгуур",        color: "amber"  },
  M400:  { use: "Тусгай өндөр ачаалал",          strength: "В30 · 30 МПа",   examples: "Гүүр, том инженерийн байгууламж, хэт ачаалал",      color: "red"    },
  M450:  { use: "Гүүр, суваг, тусгай",           strength: "В35 · 35 МПа",   examples: "Гидротехникийн байгууламж, том гүүр",               color: "red"    },
  M500:  { use: "Маш хатуу байгууламж",          strength: "В40 · 40 МПа",   examples: "Цөмийн байгууламж, тусгай инженерийн объект",       color: "red"    },
  M550:  { use: "Тусгай зориулалт",              strength: "В45 · 45 МПа",   examples: "Стратегийн инженерийн байгууламж",                  color: "red"    },
  B15:   { use: "Орон сууцны суурь",             strength: "В15 · 15 МПа",   examples: "1–2 давхар байшин, подвал, хашааны суурь",          color: "green"  },
  B20:   { use: "Барилгын суурь, тавцан",        strength: "В20 · 20 МПа",   examples: "3–5 давхар барилга, хучилт, шат",                  color: "green"  },
  B25:   { use: "Дам нуруу, хавтан",             strength: "В25 · 25 МПа",   examples: "Монолит хучилт, хавтан, тулгуур",                  color: "amber"  },
  B30:   { use: "Инженерийн байгууламж",         strength: "В30 · 30 МПа",   examples: "Гүүр, өндөр ачаалалтай байгууламж",                color: "amber"  },
};

// Зориулалтаар санал болгох маркийн загвар
const USE_CASES = [
  { icon: "🏠", label: "Гараж / Саравч",           desc: "1 давхар, жижиг байгууламж",      recommend: ["M150", "M200"] },
  { icon: "🏡", label: "Хувийн байшины суурь",     desc: "1–2 давхар орон сууц",            recommend: ["M200", "M250"] },
  { icon: "🏢", label: "Олон давхар барилгын суурь", desc: "3+ давхар барилга",              recommend: ["M250", "M300"] },
  { icon: "🛣", label: "Зам / Хашааны хучилт",     desc: "Авто зам, явган хүний зам",       recommend: ["M300", "M350"] },
  { icon: "🌉", label: "Гүүр / Инженерийн объект", desc: "Тусгай байгууламж",               recommend: ["M350", "M400"] },
  { icon: "🧱", label: "Тавцан / Шат",             desc: "Барилгын дотоод хэсэг",           recommend: ["M200", "M250"] },
];
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const adminHdrs = () => ({ "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") || "" });
const isAdminSession = () => localStorage.getItem("adminToken") === "authenticated";

// Бүтээгдэхүүн DB-ээс татна — hardcode байхгүй



// ===== Зам гүүрийн төсөв: Холбогдох хүмүүс CRUD modal =====
const BLANK_CONTACT = { name: "", role: "", phone: "" };
function BudgetContactsModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const isAdmin = isAdminSession();
  const [editing, setEditing] = useState<any | null>(null);
  const [adding, setAdding]   = useState(false);
  const [form, setForm]       = useState(BLANK_CONTACT);

  const { data: _contactsRaw, isLoading } = useQuery<any>({ queryKey: ["/api/budget-contacts"] });
  const contacts: any[] = Array.isArray(_contactsRaw) ? _contactsRaw : [];

  const save = useMutation({
    mutationFn: () => {
      const url  = editing ? `/api/budget-contacts/${editing.id}` : "/api/budget-contacts";
      const meth = editing ? "PATCH" : "POST";
      return fetch(url, { method: meth, headers: adminHdrs(), body: JSON.stringify(form) }).then(r => r.json());
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/budget-contacts"] }); setEditing(null); setAdding(false); toast({ title: editing ? "Засагдлаа" : "Нэмэгдлээ" }); },
    onError:   () => toast({ title: "Алдаа гарлаа", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => fetch(`/api/budget-contacts/${id}`, { method: "DELETE", headers: adminHdrs() }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["/api/budget-contacts"] }); toast({ title: "Устгагдлаа" }); },
  });

  const openAdd  = () => { setForm(BLANK_CONTACT); setAdding(true); setEditing(null); };
  const openEdit = (c: any) => { setForm({ name: c.name, role: c.role, phone: c.phone }); setEditing(c); setAdding(false); };
  const f = (k: string) => (e: any) => setForm((prev: any) => ({ ...prev, [k]: e.target.value }));
  const showForm = adding || !!editing;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()} className="bg-[#0f172a] border border-amber-500/20 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center"><User className="w-5 h-5 text-amber-400" /></div>
            <div><h2 className="font-black text-white text-base">Холбогдох хүмүүс</h2><p className="text-slate-400 text-xs">Зам гүүрийн төсөвтэй холбоотой мэргэжилтнүүд</p></div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && !showForm && <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-all"><Plus className="w-3.5 h-3.5" />Нэмэх</button>}
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 hover:bg-white/5 rounded-lg transition-all"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {/* Form */}
          {showForm && (
            <div className="bg-slate-800/60 border border-white/10 rounded-xl p-4 mb-4 space-y-3">
              <p className="text-amber-400 text-sm font-bold">{editing ? "Засах" : "Шинэ хүн нэмэх"}</p>
              {[{ k: "name", label: "Нэр *" }, { k: "role", label: "Албан тушаал *" }, { k: "phone", label: "Утас *" }].map(({ k, label }) => (
                <div key={k}><label className="text-slate-400 text-xs mb-1 block">{label}</label>
                  <input value={(form as any)[k]} onChange={f(k)} className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50" />
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setAdding(false); setEditing(null); }} className="flex-1 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm font-bold hover:bg-slate-600 transition-all">Болих</button>
                <button onClick={() => save.mutate()} disabled={!form.name || !form.role || !form.phone || save.isPending} className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold disabled:opacity-50 transition-all">{save.isPending ? "Хадгалж байна..." : "Хадгалах"}</button>
              </div>
            </div>
          )}

          {/* List */}
          {isLoading && <div className="text-center py-10 text-slate-400 text-sm">Уншиж байна...</div>}
          {!isLoading && contacts.length === 0 && !showForm && (
            <div className="text-center py-10 text-slate-400 text-sm">
              <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Одоогоор хүн бүртгэлгүй байна.</p>
              {isAdmin && <button onClick={openAdd} className="mt-3 text-amber-400 text-xs underline">+ Анхны хүн нэмэх</button>}
            </div>
          )}
          <div className="space-y-2">
            {contacts.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between bg-white/5 border border-white/8 rounded-xl px-4 py-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <User className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-sm font-semibold text-white">{c.name}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[11px] text-slate-400">{c.role}</span>
                    <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 transition-colors">
                      <Phone className="w-3 h-3" />{c.phone}
                    </a>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 ml-3 shrink-0">
                    <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-white/5 rounded-lg transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => del.mutate(c.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ===== Түрээслэх техник modal =====
function AvailableVehiclesModal({ onClose }: { onClose: () => void }) {
  const { data: _vehiclesRaw, isLoading } = useQuery<any>({
    queryKey: ["/api/public/available-vehicles"],
    staleTime: 60_000,
  });
  const vehicles: any[] = Array.isArray(_vehiclesRaw) ? _vehiclesRaw : [];

  const byType = vehicles.reduce<Record<string, any[]>>((acc, v) => {
    const t = v.type || "Бусад";
    if (!acc[t]) acc[t] = [];
    acc[t].push(v);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#0f172a] border border-amber-500/20 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-black text-white text-base">Түрээслэх техник</h2>
              <p className="text-slate-400 text-xs">Ажилд бэлэн, түрээсэлж болох техник ({vehicles.length})</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 hover:bg-white/5 rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[70vh] space-y-5">
          {isLoading && (
            <div className="text-center py-10 text-slate-400 text-sm">Уншиж байна...</div>
          )}
          {!isLoading && vehicles.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-sm">Одоогоор бэлэн техник байхгүй байна.</div>
          )}
          {Object.entries(byType).map(([type, list]) => (
            <div key={type}>
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">{type} ({list.length})</span>
              </div>
              <div className="space-y-2">
                {list.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between bg-white/5 border border-white/8 rounded-lg px-4 py-2.5">
                    <div>
                      <p className="text-white text-sm font-semibold">{v.name}</p>
                      <p className="text-slate-400 text-[11px]">{v.plateNumber}{v.capacity ? ` · ${v.capacity}` : ""}</p>
                    </div>
                    <span className="text-[11px] text-green-400 font-bold bg-green-500/10 border border-green-500/20 rounded-full px-2.5 py-0.5">
                      Бэлэн
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ===== Үйлдвэрийн захиалгын modal =====
function FactoryOrderModal({ onClose, initialProduct }: { onClose: () => void; initialProduct?: string }) {
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "success">("form");
  const [orderNum, setOrderNum] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number>(0);
  const [showUseCases, setShowUseCases] = useState(false);
  const [pickedUseCase, setPickedUseCase] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientName:       "",
    clientPhone:      "",
    clientEmail:      "",
    quantity:         "",
    deliveryDate:     "",
    deliveryLocation: "",
    notes:            "",
  });

  // DB-ийн бүтээгдэхүүн татах
  const { data: dbProducts = [] } = useQuery<any[]>({
    queryKey: ["/api/company-products"],
    queryFn: () => fetch("/api/company-products").then(r => r.json()),
  });
  const activeProducts = (dbProducts as any[]).filter((p: any) => p.isActive !== false);

  // Анх нээхэд бүтээгдэхүүн сонгох
  const selected = activeProducts.find((p: any) => p.id === selectedId)
    || activeProducts.find((p: any) => initialProduct && p.name.includes(initialProduct))
    || activeProducts[0];

  // Сонгогдсон бетон маркийн тайлбар олох
  const getConcreteInfo = (name: string) => {
    if (!name) return null;
    const match = Object.keys(CONCRETE_INFO).find(k => name.includes(k));
    return match ? CONCRETE_INFO[match] : null;
  };
  const concreteInfo = selected?.category === "concrete" ? getConcreteInfo(selected.name) : null;

  // Зориулалтаар бүтээгдэхүүн санал болгох
  const applyUseCase = (uc: typeof USE_CASES[0]) => {
    const concretes = activeProducts.filter((p: any) => p.category === "concrete");
    for (const recommend of uc.recommend) {
      const found = concretes.find((p: any) => p.name.includes(recommend));
      if (found) { setSelectedId(found.id); break; }
    }
    setPickedUseCase(uc.label);
    setShowUseCases(false);
  };

  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    if (!form.clientName || !form.clientPhone || !form.quantity) {
      toast({ title: "Нэр, утас, тоо хэмжээ бөглөнө үү", variant: "destructive" }); return;
    }
    if (!form.clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.clientEmail)) {
      toast({ title: "Зөв и-мэйл хаяг оруулна уу", variant: "destructive" }); return;
    }
    if (!selected) {
      toast({ title: "Бүтээгдэхүүн сонгоно уу", variant: "destructive" }); return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/factory-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          productType: selected.category,
          productName: selected.name,
          quantity:    parseFloat(form.quantity),
          unit:        selected.unit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrderNum(data.orderNumber);
      setStep("success");
    } catch {
      toast({ title: "Алдаа гарлаа, дахин оролдоно уу", variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#0f172a] border border-amber-500/20 rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        {step === "success" ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-xl font-black text-white mb-2">Захиалга амжилттай!</h2>
            <p className="text-slate-400 text-sm mb-4">Таны захиалгын дугаар:</p>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-6 py-3 inline-block mb-6">
              <span className="text-amber-400 font-mono font-black text-lg">{orderNum}</span>
            </div>
            <p className="text-slate-400 text-xs mb-6">Манай менежер тантай удахгүй холбогдох болно.</p>
            <button onClick={onClose} className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm">Хаах</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div>
                <h2 className="font-black text-white text-lg">Үйлдвэрийн захиалга</h2>
                <p className="text-slate-400 text-xs mt-0.5">Бетон зуурмаг, асфальт хольц, хайрга, элс захиалга</p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 hover:bg-white/5 rounded-lg transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Product selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 text-xs font-bold uppercase tracking-wider">Бүтээгдэхүүн сонгох</label>
                  <button
                    type="button"
                    onClick={() => setShowUseCases(v => !v)}
                    data-testid="button-usecase-helper"
                    className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors font-semibold"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Ямар зориулалттай вэ?
                  </button>
                </div>

                {/* Use-case wizard */}
                <AnimatePresence>
                  {showUseCases && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-slate-900/60 border border-amber-500/20 rounded-xl p-3">
                        <p className="text-slate-400 text-xs mb-2.5 font-medium">Зориулалтаа сонгоход тохирох марк санал болгоно:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {USE_CASES.map(uc => (
                            <button
                              key={uc.label}
                              type="button"
                              onClick={() => applyUseCase(uc)}
                              data-testid={`button-usecase-${uc.label}`}
                              className={`text-left p-2.5 rounded-lg border transition-all hover:border-amber-500/50 hover:bg-amber-500/5 ${
                                pickedUseCase === uc.label ? "border-amber-500/60 bg-amber-500/10" : "border-white/10 bg-slate-800/60"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-base">{uc.icon}</span>
                                <span className="text-white text-xs font-bold leading-tight">{uc.label}</span>
                              </div>
                              <p className="text-slate-400 text-[10px] leading-tight">{uc.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Dropdown */}
                <div className="relative">
                  <select
                    value={selected?.id ?? 0}
                    onChange={e => { setSelectedId(parseInt(e.target.value)); setPickedUseCase(null); setShowUseCases(false); }}
                    data-testid="select-product-type"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-amber-500/50 appearance-none pr-10"
                  >
                    {activeProducts.length === 0 && <option value={0}>Уншиж байна...</option>}
                    {Object.entries(
                      activeProducts.reduce<Record<string, any[]>>((acc, p: any) => {
                        const c = p.category || "other";
                        if (!acc[c]) acc[c] = [];
                        acc[c].push(p);
                        return acc;
                      }, {})
                    ).map(([cat, items]) => (
                      <optgroup key={cat} label={
                        cat === "concrete" ? "🏗 Бетон зуурмаг" :
                        cat === "asphalt"  ? "🛣 Асфальт" :
                        cat === "stone"    ? "⛏ Чулуу / Хайрга" :
                        cat === "sand"     ? "🏖 Элс" : "Бусад"
                      }>
                        {items.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Concrete grade description card */}
                <AnimatePresence>
                  {concreteInfo && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className={`rounded-xl p-3 border flex gap-2.5 ${
                        concreteInfo.color === "green" ? "bg-green-500/8 border-green-500/25" :
                        concreteInfo.color === "amber" ? "bg-amber-500/8 border-amber-500/25" :
                        concreteInfo.color === "red"   ? "bg-red-500/8   border-red-500/25" :
                                                         "bg-blue-500/8  border-blue-500/25"
                      }`}
                    >
                      <Info className={`w-4 h-4 mt-0.5 shrink-0 ${
                        concreteInfo.color === "green" ? "text-green-400" :
                        concreteInfo.color === "amber" ? "text-amber-400" :
                        concreteInfo.color === "red"   ? "text-red-400"   : "text-blue-400"
                      }`} />
                      <div className="min-w-0">
                        <p className="text-white text-xs font-bold">{concreteInfo.use}</p>
                        <p className={`text-[11px] font-semibold mt-0.5 ${
                          concreteInfo.color === "green" ? "text-green-400" :
                          concreteInfo.color === "amber" ? "text-amber-400" :
                          concreteInfo.color === "red"   ? "text-red-400"   : "text-blue-400"
                        }`}>{concreteInfo.strength}</p>
                        <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">{concreteInfo.examples}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-2 block">Тоо хэмжээ ({selected?.unit ?? "нэгж"})</label>
                <input
                  type="number" min="1"
                  value={form.quantity}
                  onChange={f("quantity")}
                  placeholder={`Хэдэн ${selected?.unit ?? "нэгж"} захиалах вэ?`}
                  data-testid="input-quantity"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-2 block">Хүргэлтийн огноо</label>
                  <input
                    type="date" value={form.deliveryDate} onChange={f("deliveryDate")}
                    data-testid="input-delivery-date"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-2 block">Утасны дугаар *</label>
                  <input
                    type="tel" value={form.clientPhone} onChange={f("clientPhone")}
                    placeholder="99xxxxxx"
                    data-testid="input-client-phone"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-2 block">Захиалагчийн нэр *</label>
                <input
                  type="text" value={form.clientName} onChange={f("clientName")}
                  placeholder="Байгууллага эсвэл хувь хүний нэр"
                  data-testid="input-client-name"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-2 block">И-мэйл хаяг *</label>
                <input
                  type="email" value={form.clientEmail} onChange={f("clientEmail")}
                  placeholder="email@example.com"
                  data-testid="input-client-email"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-2 block">Хүргэлтийн хаяг</label>
                <input
                  type="text" value={form.deliveryLocation} onChange={f("deliveryLocation")}
                  placeholder="Барилгын талбайн хаяг, байршил"
                  data-testid="input-delivery-location"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-2 block">Нэмэлт тэмдэглэл</label>
                <textarea
                  value={form.notes} onChange={f("notes")} rows={2}
                  placeholder="Тусгай шаардлага, холилтын горим гэх мэт..."
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>
            </div>

            <div className="p-5 border-t border-white/10 flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 font-bold transition-all">Болих</button>
              <button
                onClick={submit} disabled={loading}
                data-testid="btn-submit-factory-order"
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold disabled:opacity-50 transition-all"
              >
                {loading ? "Илгээж байна..." : "Захиалах"}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

const servicesData = [
  {
    id: 1,
    icon: Construction,
    title: "Авто зам гүүр, дэд бүтцийн ажлууд",
    description: "Олон улсын стандартад нийцсэн бүх төрлийн авто зам гүүр, талбайн барилга угсралт.",
    delay: 0.1,
    orderBtn: false,
  },
  {
    id: 2,
    icon: Warehouse,
    title: "Бетон зуурмагийн үйлдвэр",
    description: "Бетон зуурмаг, төмөр бетон хийц, хайрга, элс — тохирлын гэрчилгээтэй, өндөр чанартай.",
    delay: 0.2,
    orderBtn: true,
  },
  {
    id: 3,
    icon: Truck,
    title: "Техникийн түрээс",
    description: "Зам, гүүрийн зориулалттай хүнд даацын машин механизмын түрээс, засварлах үйлчилгээ.",
    delay: 0.3,
    orderBtn: false,
  },
  {
    id: 4,
    icon: PencilRuler,
    title: "Зам гүүрийн төсөв",
    description: "Инженерчлэлийн шийдэл бүхий зам гүүрийн төсөв боловсруулах, зөвлөгөө өгөх үйлчилгээ",
    delay: 0.4,
    orderBtn: false,
  }
];

// ===== Хамтрах боломжтой төслүүд modal =====
const CATS_FILTER = ["Бүгд", "Авто зам", "Гүүр", "Барилга", "Дэд бүтэц"];

function TenderProjectsModal({ onClose }: { onClose: () => void }) {
  const [activeCat, setActiveCat] = useState("Бүгд");

  const { data: _tendersRaw, isLoading } = useQuery<any>({
    queryKey: ["/api/tender-projects"],
    queryFn: () => fetch("/api/tender-projects").then(r => r.json()),
    staleTime: 60_000,
  });
  const tenders: any[] = Array.isArray(_tendersRaw) ? _tendersRaw : [];
  const filtered = activeCat === "Бүгд" ? tenders : tenders.filter((t: any) => t.category === activeCat);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Хамтрах боломжтой төслүүд</h2>
            <p className="text-slate-400 text-xs mt-0.5">Зам гүүр, барилга угсралтын Хөвсгөл зам ХХК</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"><X className="w-5 h-5" /></button>
        </div>

        {/* Ангиллын шүүлт */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 overflow-x-auto shrink-0">
          {CATS_FILTER.map(c => (
            <button key={c} onClick={() => setActiveCat(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeCat === c
                  ? "bg-amber-600 text-white"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              }`}>
              {c}
              {c !== "Бүгд" && tenders.filter((t: any) => t.category === c).length > 0 && (
                <span className="ml-1 opacity-70">({tenders.filter((t: any) => t.category === c).length})</span>
              )}
              {c === "Бүгд" && <span className="ml-1 opacity-70">({tenders.length})</span>}
            </button>
          ))}
        </div>

        {/* Жагсаалт */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Уншиж байна...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Энэ ангилалд төсөл байхгүй байна</p>
            </div>
          ) : filtered.map((t: any) => {
            const prods: string[] = t.requiredProducts
              ? t.requiredProducts.split(",").map((s: string) => s.trim()).filter(Boolean)
              : [];
            return (
              <div key={t.id} className="bg-slate-800/60 border border-white/8 rounded-xl p-4 hover:border-amber-500/20 transition-all group">
                {/* Ангилал + байршил + он */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 rounded-lg text-xs font-bold">{t.category || "Авто зам"}</span>
                  {t.location && (
                    <span className="flex items-center gap-1 text-slate-400 text-xs">
                      <MapPin className="w-3 h-3" />{t.location}
                    </span>
                  )}
                  {t.year && <span className="text-slate-500 text-xs">{t.year} он</span>}
                </div>

                {/* Гарчиг */}
                <p className="text-white font-bold text-sm mb-1">{t.title}</p>
                {t.description && <p className="text-slate-400 text-xs mb-3">{t.description}</p>}

                {/* Шаардах бүтээгдэхүүн */}
                {prods.length > 0 && (
                  <div className="mb-3">
                    <p className="text-slate-500 text-[11px] mb-1.5 uppercase tracking-wider">Нийлүүлэх бүтээгдэхүүн:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {prods.map((prod, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-500/15 text-blue-300 border border-blue-500/20 rounded-full text-xs">
                          {prod}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Хугацаа + холбоо барих */}
                <div className="flex items-center justify-between mt-2">
                  {t.deadline ? (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" /> Хугацаа: <span className="text-white font-semibold">{t.deadline}</span>
                    </span>
                  ) : <span />}
                  <a href="#contact"
                    onClick={onClose}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-all">
                    Холбоо барих →
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Services() {
  const [showOrderModal,    setShowOrderModal]    = useState(false);
  const [showVehiclesModal, setShowVehiclesModal] = useState(false);
  const [showBudgetModal,   setShowBudgetModal]   = useState(false);
  const [showTenderModal,   setShowTenderModal]   = useState(false);

  const scrollToContact = () => {
    const el = document.getElementById("contact");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="services" className="py-24 bg-background relative border-y border-border overflow-hidden">
      <div className="absolute inset-0 industrial-pattern opacity-5 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-start text-left mb-20 border-l-[3px] border-primary/50 pl-10 ml-2"
        >
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-primary font-bold tracking-[0.2em] uppercase text-sm flex items-center gap-4">
              <span className="w-12 h-0.5 bg-primary"></span>
              Бидэнтэй нэгдэх
            </h2>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between w-full gap-8">
            <h3 className="text-3xl md:text-4xl lg:text-4xl font-display font-black text-foreground uppercase leading-[1.1] max-w-3xl">
              Хөгжилд <span className="text-transparent border-text"> тэмүүлсэн</span> <br className="hidden md:block" />
              Хамтын  <span className="text-transparent border-text"> ажиллагаа</span>
            </h3>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="pb-2">
              <button
                onClick={scrollToContact}
                className="px-8 py-4 bg-transparent border-2 border-primary text-primary font-display font-bold uppercase tracking-widest text-[10px] transition-all relative group overflow-hidden whitespace-nowrap"
              >
                <span className="absolute inset-0 bg-primary translate-y-full group-hover:translate-y-0 transition-transform duration-300"></span>
                <span className="relative z-10 text-lg md:text-xl font-bold uppercase tracking-wider group-hover:text-primary-foreground transition-colors duration-300">
                 ---- хамтран ажиллах санал ----
                </span>
                <span className="absolute top-0 right-0 w-3 h-3 bg-primary translate-x-1.5 -translate-y-1.5 rotate-45 z-20"></span>
              </button>
            </motion.div>
          </div>
        </motion.div>

        {/* Service cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {servicesData.map((service) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: service.delay }}
              className="group p-8 bg-card border border-border/50 hover:border-primary/50 transition-all duration-300 relative overflow-hidden flex flex-col"
            >
              <div className="absolute top-0 right-0 w-12 h-12 bg-primary/5 translate-x-6 -translate-y-6 rotate-45 group-hover:bg-primary/10 transition-colors"></div>

              <div className="mb-6 relative">
                <service.icon className="w-12 h-12 text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>

              <h3 className="text-lg font-display font-bold text-foreground mb-4 group-hover:text-primary transition-colors">
                {service.title}
              </h3>

              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {service.description}
              </p>

              {/* Авто зам гүүр: Хамтрах боломжтой төслүүд → modal */}
              {service.id === 1 && (
                <button
                  onClick={() => setShowTenderModal(true)}
                  className="mt-auto w-full py-2.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20"
                >
                  <FileText className="w-4 h-4" />
                  Хамтрах боломжтой төсөл
                </button>
              )}

              {/* Техникийн түрээс: Түрээслэх техник товч */}
              {service.id === 3 && (
                <button
                  onClick={() => setShowVehiclesModal(true)}
                  className="mt-auto w-full py-2.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20"
                >
                  <Truck className="w-4 h-4" />
                  Түрээслэх техник
                </button>
              )}

              {/* Зам гүүрийн төсөв: Холбогдох хүмүүс товч */}
              {service.id === 4 && (
                <button
                  onClick={() => setShowBudgetModal(true)}
                  className="mt-auto w-full py-2.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20"
                >
                  <User className="w-4 h-4" />
                  Холбогдох хүмүүс
                </button>
              )}

              {service.orderBtn && (
                <button
                  data-testid="btn-factory-order-open"
                  onClick={() => setShowOrderModal(true)}
                  className="mt-auto w-full py-2.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20"
                >
                  <Warehouse className="w-4 h-4" />
                  Үйлдвэрт захиалга өгөх
                </button>
              )}

              <div className="absolute bottom-0 left-0 h-0.5 bg-primary w-0 group-hover:w-full transition-all duration-500"></div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showTenderModal   && <TenderProjectsModal   onClose={() => setShowTenderModal(false)} />}
        {showVehiclesModal && <AvailableVehiclesModal onClose={() => setShowVehiclesModal(false)} />}
        {showBudgetModal   && <BudgetContactsModal   onClose={() => setShowBudgetModal(false)} />}
        {showOrderModal    && <FactoryOrderModal      onClose={() => setShowOrderModal(false)} />}
      </AnimatePresence>
    </section>
  );
}
