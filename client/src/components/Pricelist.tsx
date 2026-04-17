import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Phone, Loader2, FileText, ChevronRight, Building2,
  Package, Tag, Filter, CheckCircle, ExternalLink,
} from "lucide-react";
import emailjs from "@emailjs/browser";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import type { CompanyProduct } from "@shared/schema";

const quoteSchema = z.object({
  name:            z.string().min(1, "Нэр оруулна уу"),
  company:         z.string().optional(),
  phone:           z.string().min(6, "Утас оруулна уу"),
  email:           z.string().email("Зөв и-мэйл").or(z.literal("")),
  product:         z.string().min(1, "Бүтээгдэхүүн сонгоно уу"),
  productId:       z.string().optional(),
  unit:            z.string().optional(),
  unitPrice:       z.string().optional(),
  quantity:        z.string().min(1, "Тоо хэмжээ оруулна уу"),
  deliveryAddress: z.string().optional(),
  note:            z.string().optional(),
});
type QuoteData = z.infer<typeof quoteSchema>;

type CatalogItem = {
  id: number;
  productName: string;
  productType: string;
  unit: string;
  suggestedPrice: number;
  barterPrice: number | null;
  updatedAt: string;
};

type ProductCategory = { id: number; key: string; label: string; filterLabel: string; isActive: boolean; showFilter: boolean; sortOrder: number };

function fmtMNT(n: number) {
  if (n >= 1_000_000) return `₮${(n / 1_000_000).toFixed(1)} сая`;
  return "₮" + n.toLocaleString("mn-MN");
}

/* ─── Үнийн каталог ──────────────────────────────────────────── */
function ProductCatalog({ onSelect }: {
  onSelect: (item: { name: string; unit: string; price: number }) => void;
}) {
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: catalog = [], isLoading } = useQuery<CatalogItem[]>({
    queryKey: ["/api/public/price-catalog"],
    queryFn: () => fetch("/api/public/price-catalog").then(r => r.json()),
  });

  const { data: categories = [] } = useQuery<ProductCategory[]>({
    queryKey: ["/api/product-categories"],
    queryFn: () => fetch("/api/product-categories").then(r => r.json()),
  });

  const { data: products = [] } = useQuery<CompanyProduct[]>({
    queryKey: ["/api/company-products"],
  });

  const categoryMap = Object.fromEntries(categories.map(c => [c.key, c.label]));
  const getCategory = (productType: string) => {
    const base = productType.replace("_custom", "");
    return categoryMap[base] || "Бусад";
  };

  const filters = [
    { key: "all", label: "Бүгд" },
    ...categories.filter(c => c.isActive && c.showFilter).map(c => ({ key: c.key, label: c.filterLabel })),
  ];

  const filtered = activeFilter === "all"
    ? catalog
    : catalog.filter(c => c.productType.includes(activeFilter));

  const showProducts = products.filter(p => p.isActive);

  return (
    <div className="border border-border/60 rounded-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 bg-primary/10 border-b border-border/40">
        <Tag className="w-4 h-4 text-primary shrink-0" />
        <span className="text-xs font-bold uppercase tracking-widest text-primary">
          Манай бүтээгдэхүүний үнэ
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">Батлагдсан үнэ</span>
      </div>

      <div className="p-4 bg-background/40">
        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Ачааллаж байна...</p>
          </div>
        ) : catalog.length > 0 ? (
          <>
            {/* Шүүлтүүр */}
            <div className="flex gap-1.5 flex-wrap mb-3">
              {filters.map(f => (
                <button key={f.key} onClick={() => setActiveFilter(f.key)}
                  className={`px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wide transition-all ${
                    activeFilter === f.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-border/30 text-muted-foreground hover:bg-border/60"
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Жагсаалт */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-4">Энэ ангиллын мэдээлэл алга</p>
              ) : filtered.map((item) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => onSelect({ name: item.productName, unit: item.unit, price: item.suggestedPrice })}
                  className="w-full text-left border border-border/50 rounded-sm p-3 bg-background/60 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                  data-testid={`catalog-item-${item.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground leading-tight truncate">{item.productName}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{getCategory(item.productType)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-primary">{fmtMNT(item.suggestedPrice)}</p>
                      <p className="text-[10px] text-muted-foreground">/ {item.unit} · бэлэн</p>
                      {item.barterPrice && (
                        <p className="text-[10px] text-blue-400 font-semibold mt-0.5">
                          {fmtMNT(item.barterPrice)} · бартер
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-1.5 text-[10px] text-primary/70 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-3 h-3" /> Формд нэмэх
                  </div>
                </motion.button>
              ))}
            </div>
          </>
        ) : (
          /* Дууссан санал байхгүй бол бүтээгдэхүүний жагсаалт харуулна */
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
              <Package className="w-3 h-3" /> Манай бүтээгдэхүүнүүд
            </p>
            {showProducts.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-4">Бүтээгдэхүүн байхгүй байна</p>
            ) : showProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect({ name: p.name, unit: p.unit, price: 0 })}
                className="w-full text-left flex items-center gap-3 border border-border/40 rounded-sm p-2.5 bg-background/50 hover:border-primary/30 transition-all group"
                data-testid={`product-item-${p.id}`}
              >
                <div className="w-7 h-7 bg-primary/10 rounded flex items-center justify-center shrink-0">
                  <Package className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{categoryMap[p.category] || p.category} · {p.unit}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Амжилтын хэсэг ──────────────────────────────────────────── */
function QuoteSuccess({ data, onReset }: {
  data: { quoteId: number; product: string; quantity: string; unit: string; unitPrice: string; totalAmount: number; validUntil: string; contractUrl: string; name: string; company: string; phone: string; email: string; deliveryAddress: string; };
  onReset: () => void;
}) {
  const quoteParams = new URLSearchParams({
    quoteId:   String(data.quoteId),
    name:      data.name,
    company:   data.company || "",
    phone:     data.phone,
    email:     data.email || "",
    product:   data.product,
    quantity:  data.quantity,
    unit:      data.unit || "",
    unitPrice: data.unitPrice || "0",
    totalAmount: String(data.totalAmount),
    validUntil:  data.validUntil,
    contractUrl: data.contractUrl,
    deliveryAddress: data.deliveryAddress || "",
  });

  const previewUrl = `/quote-preview?${quoteParams.toString()}`;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/30 rounded-sm px-4 py-3">
        <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-green-300">Хүсэлт амжилттай хүлээн авлаа!</p>
          <p className="text-xs text-green-400/80 mt-0.5">Борлуулалтын алба удахгүй тантай холбогдох болно.</p>
        </div>
      </div>

      <div className="bg-background/60 border border-border/60 rounded-sm p-4 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Таны хүсэлтийн дэлгэрэнгүй</p>
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Бүтээгдэхүүн:</span><span className="font-semibold text-foreground">{data.product}</span></div>
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Тоо хэмжээ:</span><span className="font-semibold text-foreground">{data.quantity} {data.unit}</span></div>
        {data.totalAmount > 0 && (
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Ойролцоо дүн:</span><span className="font-black text-primary text-sm">{fmtMNT(data.totalAmount)}</span></div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <a href={previewUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-sm transition-all"
          data-testid="btn-view-quote">
          <FileText className="w-4 h-4" /> Үнийн санал харах
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
        <a href={data.contractUrl}
          className="flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-sm transition-all"
          data-testid="btn-go-contract">
          <FileText className="w-4 h-4" /> Гэрээ байгуулах
        </a>
      </div>

      <button onClick={onReset} className="text-xs text-muted-foreground hover:text-primary transition-colors w-full text-center">
        ← Шинэ хүсэлт гаргах
      </button>
    </motion.div>
  );
}

/* ─── Үндсэн компонент ──────────────────────────────────────── */
export default function Pricelist() {
  const [isSending, setIsSending] = useState(false);
  const [quoteResult, setQuoteResult] = useState<any>(null);
  const { toast } = useToast();

  const { data: products = [] } = useQuery<CompanyProduct[]>({
    queryKey: ["/api/company-products"],
  });
  const { data: catalog = [] } = useQuery<CatalogItem[]>({
    queryKey: ["/api/public/price-catalog"],
    queryFn: () => fetch("/api/public/price-catalog").then(r => r.json()),
  });

  const form = useForm<QuoteData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: { name: "", company: "", email: "", phone: "", product: "", productId: "", unit: "", unitPrice: "", quantity: "", deliveryAddress: "", note: "" },
  });

  const handleCatalogSelect = (item: { name: string; unit: string; price: number }) => {
    form.setValue("product", item.name);
    form.setValue("unit", item.unit);
    if (item.price > 0) form.setValue("unitPrice", String(item.price));
  };

  const onSubmit = async (data: QuoteData) => {
    setIsSending(true);
    try {
      const unitPrice = parseFloat(data.unitPrice || "0") || 0;
      const qty = parseFloat(data.quantity) || 1;
      const totalAmount = Math.round(unitPrice * qty);

      const r = await fetch("/api/public/quote-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, unitPrice, totalAmount }),
      });
      if (!r.ok) throw new Error("Алдаа");
      const result = await r.json();

      // EmailJS-ийн мэдэгдэл (алдаа гарсан ч үйл явцад нөлөөлөхгүй)
      emailjs.send(
        "service_zo80ffc", "template_1qp8wlm",
        { name: data.name, email: data.email, phone: data.phone, product: data.product, quantity: data.quantity, message: data.note || "" },
        "jMUTsjEJc7DCIHEK4"
      ).catch(() => {});

      setQuoteResult({ ...result, ...data, unitPrice: data.unitPrice || "0" });
    } catch {
      toast({ variant: "destructive", title: "Алдаа гарлаа", description: "Дахин оролдоно уу." });
    } finally {
      setIsSending(false);
    }
  };

  const activeProducts = products.filter(p => p.isActive);

  return (
    <section id="Pricelist" className="py-32 bg-card relative border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">

          {/* Зүүн — каталог + холбоо */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col justify-center"
          >
            <h2 className="text-primary font-bold tracking-[0.2em] uppercase text-sm mb-4 flex items-center gap-4">
              <span className="w-12 h-0.5 bg-primary" />
              Бүтээн байгуулалтын түнш
            </h2>
            <h3 className="text-3xl md:text-4xl font-display font-black text-foreground uppercase mb-6">
              Үнийн санал <span className="text-primary">Авах</span>
            </h3>
            <p className="text-muted-foreground text-base mb-8 max-w-md leading-relaxed">
              Доорх жагсаалтаас бүтээгдэхүүн сонгоход форм автоматаар бөглөгдөнө. Хүсэлт илгээсний дараа PDF үнийн санал болон онлайн гэрээний линк нээгдэнэ.
            </p>

            <div className="space-y-5">
              {/* Утас */}
              <div className="flex items-start gap-5 group">
                <div className="w-12 h-12 bg-background border border-primary/20 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-primary transition-all duration-300">
                  <Phone className="w-5 h-5 text-primary group-hover:text-primary-foreground" />
                </div>
                <div>
                  <h4 className="text-sm font-display font-bold text-foreground uppercase tracking-wide mb-1">Борлуулалтын алба</h4>
                  <a href="tel:+97695412701" className="text-primary hover:underline text-xl font-black tracking-tight">+976 9541-2701</a>
                  <p className="text-muted-foreground text-sm mt-0.5">Даваа — Баасан: 09:00 – 18:00</p>
                </div>
              </div>

              {/* Каталог */}
              <ProductCatalog onSelect={handleCatalogSelect} />
            </div>
          </motion.div>

          {/* Баруун — форм / амжилтын хэсэг */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-background p-8 md:p-10 rounded-sm border border-border shadow-2xl shadow-black/50"
          >
            <AnimatePresence mode="wait">
              {quoteResult ? (
                <QuoteSuccess
                  key="success"
                  data={quoteResult}
                  onReset={() => { setQuoteResult(null); form.reset(); }}
                />
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <div>
                    <h4 className="text-foreground font-bold text-lg mb-1">Үнийн санал хүсэх</h4>
                    <p className="text-xs text-muted-foreground">Зүүн талаас бүтээгдэхүүн сонгоход автоматаар бөглөгдөнө</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Нэр *</label>
                      <input {...form.register("name")} placeholder="Таны нэр"
                        className="w-full mt-1 bg-card border border-border px-3 py-2.5 rounded-sm text-foreground text-sm focus:border-primary focus:outline-none"
                        data-testid="input-quote-name" />
                      {form.formState.errors.name && <p className="text-destructive text-[10px] mt-0.5">{form.formState.errors.name.message}</p>}
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Байгууллага</label>
                      <input {...form.register("company")} placeholder="Компанийн нэр"
                        className="w-full mt-1 bg-card border border-border px-3 py-2.5 rounded-sm text-foreground text-sm focus:border-primary focus:outline-none"
                        data-testid="input-quote-company" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Утас *</label>
                      <input {...form.register("phone")} placeholder="9911-XXXX"
                        className="w-full mt-1 bg-card border border-border px-3 py-2.5 rounded-sm text-foreground text-sm focus:border-primary focus:outline-none"
                        data-testid="input-quote-phone" />
                      {form.formState.errors.phone && <p className="text-destructive text-[10px] mt-0.5">{form.formState.errors.phone.message}</p>}
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">И-Мэйл</label>
                      <input {...form.register("email")} type="email" placeholder="email@example.com"
                        className="w-full mt-1 bg-card border border-border px-3 py-2.5 rounded-sm text-foreground text-sm focus:border-primary focus:outline-none"
                        data-testid="input-quote-email" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Бүтээгдэхүүн *</label>
                    <select {...form.register("product")}
                      className="w-full mt-1 bg-card border border-border px-3 py-2.5 rounded-sm text-foreground text-sm focus:border-primary focus:outline-none cursor-pointer"
                      data-testid="select-quote-product"
                      onChange={e => {
                        form.setValue("product", e.target.value);
                        const found = catalog.find(c => c.productName === e.target.value);
                        if (found) { form.setValue("unit", found.unit); form.setValue("unitPrice", String(found.suggestedPrice)); }
                      }}>
                      <option value="">— сонгоно уу —</option>
                      {catalog.length > 0
                        ? catalog.map(c => <option key={c.id} value={c.productName}>{c.productName} ({c.unit})</option>)
                        : activeProducts.map(p => <option key={p.id} value={p.name}>{p.name} ({p.unit})</option>)
                      }
                    </select>
                    {form.formState.errors.product && <p className="text-destructive text-[10px] mt-0.5">{form.formState.errors.product.message}</p>}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Тоо хэмжээ *</label>
                      <input {...form.register("quantity")} placeholder="100"
                        className="w-full mt-1 bg-card border border-border px-3 py-2.5 rounded-sm text-foreground text-sm focus:border-primary focus:outline-none"
                        data-testid="input-quote-quantity" />
                      {form.formState.errors.quantity && <p className="text-destructive text-[10px] mt-0.5">{form.formState.errors.quantity.message}</p>}
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Нэгж</label>
                      <input {...form.register("unit")} placeholder="м³"
                        className="w-full mt-1 bg-card border border-border px-3 py-2.5 rounded-sm text-foreground text-sm focus:border-primary focus:outline-none"
                        data-testid="input-quote-unit" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Нэгж үнэ ₮</label>
                      <input {...form.register("unitPrice")} placeholder="195,000"
                        className="w-full mt-1 bg-card border border-border px-3 py-2.5 rounded-sm text-foreground text-sm focus:border-primary focus:outline-none"
                        data-testid="input-quote-price" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Хүргэлтийн хаяг</label>
                    <input {...form.register("deliveryAddress")} placeholder="Хаяг, дүүрэг, хот"
                      className="w-full mt-1 bg-card border border-border px-3 py-2.5 rounded-sm text-foreground text-sm focus:border-primary focus:outline-none"
                      data-testid="input-quote-address" />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Нэмэлт тайлбар</label>
                    <textarea {...form.register("note")} rows={2} placeholder="Тусгай шаардлага, тээвэрлэлт..."
                      className="w-full mt-1 bg-card border border-border px-3 py-2.5 rounded-sm text-foreground text-sm focus:border-primary focus:outline-none resize-none"
                      data-testid="textarea-quote-note" />
                  </div>

                  <button type="submit" disabled={isSending}
                    className="w-full py-3.5 bg-primary text-primary-foreground font-display font-bold uppercase tracking-widest rounded-sm hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-3"
                    data-testid="btn-submit-quote">
                    {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><FileText className="w-5 h-5" /> Үнийн санал авах</>}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
