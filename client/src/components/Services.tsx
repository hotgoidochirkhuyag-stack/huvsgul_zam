import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Construction, Truck, Warehouse, PencilRuler, X, CheckCircle2, ChevronDown, Phone, User, FileText, Wrench, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const adminHdrs = () => ({ "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") || "" });
const isAdminSession = () => localStorage.getItem("adminToken") === "authenticated";

const PRODUCTS = [
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



// ===== Зам гүүрийн төсөв: Холбогдох хүмүүс CRUD modal =====
const BLANK_CONTACT = { name: "", role: "", phone: "" };
function BudgetContactsModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const isAdmin = isAdminSession();
  const [editing, setEditing] = useState<any | null>(null);
  const [adding, setAdding]   = useState(false);
  const [form, setForm]       = useState(BLANK_CONTACT);

  const { data: contacts = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/budget-contacts"] });

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
  const { data: vehicles = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/public/available-vehicles"],
    staleTime: 60_000,
  });

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
  const [form, setForm] = useState({
    clientName:       "",
    clientPhone:      "",
    clientEmail:      "",
    productType:      initialProduct ?? PRODUCTS[2].value,
    quantity:         "",
    deliveryDate:     "",
    deliveryLocation: "",
    notes:            "",
  });

  const selected = PRODUCTS.find(p => p.value === form.productType) || PRODUCTS[2];

  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    if (!form.clientName || !form.clientPhone || !form.quantity) {
      toast({ title: "Заавал талбаруудыг бөглөнө үү", variant: "destructive" }); return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/factory-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          quantity: parseFloat(form.quantity),
          unit:     selected.unit,
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
              <div>
                <label className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-2 block">Бүтээгдэхүүн сонгох</label>
                <div className="relative">
                  <select
                    value={form.productType}
                    onChange={f("productType")}
                    data-testid="select-product-type"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-amber-500/50 appearance-none pr-10"
                  >
                    {PRODUCTS.map(p => <option key={p.value} value={p.value}>{p.label} ({p.unit})</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-2 block">Тоо хэмжээ ({selected.unit})</label>
                <input
                  type="number" min="1"
                  value={form.quantity}
                  onChange={f("quantity")}
                  placeholder={`Хэдэн ${selected.unit} захиалах вэ?`}
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
    description: "Бетон зуурмаг, асфальтбетон хольц, хайрга, элс — тохирлын гэрчилгээтэй, өндөр чанартай.",
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

// ===== Тендерт явуулсан төслүүд modal =====
const PROG_CLR = (p: number) =>
  p === 100 ? "bg-green-500" : p >= 60 ? "bg-blue-500" : p >= 30 ? "bg-amber-500" : "bg-red-400";

function TenderProjectsModal({ onClose }: { onClose: () => void }) {
  const { data: tenders = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/tender-projects"],
    queryFn: () => fetch("/api/tender-projects").then(r => r.json()),
  });
  const done   = tenders.filter((t: any) => t.progress === 100).length;
  const active = tenders.filter((t: any) => t.progress > 0 && t.progress < 100).length;
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-white">Тендерт явуулсан төслүүд</h2>
            <p className="text-slate-400 text-xs mt-0.5">Хөвсгөл Зам ХК-ийн оролцсон тендерүүд</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"><X className="w-5 h-5" /></button>
        </div>
        {/* Stats */}
        {tenders.length > 0 && (
          <div className="grid grid-cols-3 divide-x divide-white/10 border-b border-white/10">
            {[
              { label: "Нийт", val: tenders.length, color: "text-white" },
              { label: "Дууссан", val: done,   color: "text-green-400" },
              { label: "Явагдаж байна", val: active, color: "text-amber-400" },
            ].map(s => (
              <div key={s.label} className="py-3 text-center">
                <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
                <p className="text-slate-500 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        )}
        {/* List */}
        <div className="overflow-y-auto max-h-[60vh] p-4 space-y-3">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">Уншиж байна...</div>
          ) : tenders.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>Тендер байхгүй байна</p>
            </div>
          ) : tenders.map((t: any) => (
            <div key={t.id} className="bg-slate-800/50 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 rounded-lg text-xs font-bold">{t.category || "Авто зам"}</span>
                    {t.year && <span className="text-slate-500 text-xs">{t.year} он</span>}
                    {t.location && <span className="text-slate-500 text-xs">· {t.location}</span>}
                  </div>
                  <p className="text-white font-bold text-sm">{t.title}</p>
                  {t.description && <p className="text-slate-400 text-xs mt-1">{t.description}</p>}
                  <div className="mt-2.5">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Гүйцэтгэл</span>
                      <span className={`font-bold ${t.progress === 100 ? "text-green-400" : t.progress > 0 ? "text-amber-400" : "text-slate-500"}`}>{t.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${PROG_CLR(t.progress)}`} style={{ width: `${t.progress}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
                  хамтран ажиллах санал хүлээн авах
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

              {/* Авто зам гүүр: Тендерт явуулсан төслүүд → modal */}
              {service.id === 1 && (
                <button
                  onClick={() => setShowTenderModal(true)}
                  className="mt-auto w-full py-2.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20"
                >
                  <FileText className="w-4 h-4" />
                  Тендерт явуулсан төслүүд
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
