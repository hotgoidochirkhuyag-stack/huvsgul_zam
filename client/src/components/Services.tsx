import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Construction, Truck, Warehouse, PencilRuler, X, CheckCircle2, ChevronDown, Phone, User, Clock, CheckSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const TENDER_ITEMS = [
  "Авто замын доод давхарга угсрах",
  "Асфальт хольц хийж тавих (I давхарга)",
  "Асфальт хольц хийж тавих (II давхарга)",
  "Гүүрийн хийц угсрах",
  "Дренаж, ус зайлуулах системийн ажил",
  "Гэрлэн дохиоллын систем суурилуулах",
  "Хашлага, тэмдэглэл хийх",
  "Цементэн бетон хучилт хийх",
];

const BUDGET_CONTACTS = [
  { name: "Д.Батболд",   role: "Захирал",              phone: "9900-1234" },
  { name: "Г.Оюунчимэг", role: "Тооцооны инженер",     phone: "9911-5678" },
  { name: "Б.Мөнхбат",   role: "Зам гүүрийн инженер",  phone: "9922-9012" },
  { name: "С.Энхтүвшин", role: "Борлуулалт, гэрээ",    phone: "9933-3456" },
];

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

function FactoryOrderModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "success">("form");
  const [orderNum, setOrderNum] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    clientName:       "",
    clientPhone:      "",
    clientEmail:      "",
    productType:      PRODUCTS[2].value,
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
    description: "М100–М400 бетон зуурмаг, асфальт хольц, хайрга, элс — тохирлын гэрчилгээтэй, өндөр чанартай.",
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

export default function Services() {
  const [showOrderModal, setShowOrderModal] = useState(false);

  const { data: idleVehicles = [] } = useQuery<any[]>({
    queryKey: ["/api/public/idle-vehicles"],
    staleTime: 5 * 60 * 1000,
  });

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

              {/* Авто зам гүүр: тендерийн ажлын нэрс */}
              {service.id === 1 && (
                <div className="mt-1 space-y-1.5 flex-1">
                  {TENDER_ITEMS.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckSquare className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      <span className="text-xs text-muted-foreground leading-snug">{item}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Техникийн түрээс: 3+ өдрөөр сул байгаа техник */}
              {service.id === 3 && (
                <div className="mt-1 flex-1">
                  {idleVehicles.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Одоогоор сул техник байхгүй байна.</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-amber-400 font-semibold mb-2 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Түрээсэлж болох техник ({idleVehicles.length}):
                      </p>
                      {idleVehicles.slice(0, 5).map((v: any) => (
                        <div key={v.id} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Truck className="w-3 h-3 text-primary shrink-0" />
                            <span className="text-xs font-semibold text-foreground truncate">{v.name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">{v.plateNumber} · {v.type}</span>
                            {v.lastUsed ? (
                              <span className="text-[10px] text-amber-400">{v.lastUsed} сүүлд</span>
                            ) : (
                              <span className="text-[10px] text-slate-500">Бүртгэлгүй</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {idleVehicles.length > 5 && (
                        <p className="text-[10px] text-muted-foreground text-center pt-1">+{idleVehicles.length - 5} техник нэмэлтээр байна</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Зам гүүрийн төсөв: холбогдох хүмүүс */}
              {service.id === 4 && (
                <div className="mt-1 space-y-2 flex-1">
                  {BUDGET_CONTACTS.map((c, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <User className="w-3 h-3 text-primary shrink-0" />
                        <span className="text-xs font-semibold text-foreground">{c.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">{c.role}</span>
                        <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 transition-colors">
                          <Phone className="w-2.5 h-2.5" />
                          {c.phone}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {service.orderBtn && (
                <button
                  data-testid="btn-factory-order-open"
                  onClick={() => setShowOrderModal(true)}
                  className="mt-5 w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm rounded-lg transition-all flex items-center justify-center gap-2"
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
        {showOrderModal && <FactoryOrderModal onClose={() => setShowOrderModal(false)} />}
      </AnimatePresence>
    </section>
  );
}
