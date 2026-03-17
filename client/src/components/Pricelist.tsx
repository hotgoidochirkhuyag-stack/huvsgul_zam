import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContactSchema } from "@shared/schema";
import {
  Phone, Loader2, Calculator, Sparkles, TrendingUp,
  ChevronRight, RotateCcw, AlertCircle, BadgePercent,
} from "lucide-react";
import emailjs from "@emailjs/browser";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const priceRequestSchema = insertContactSchema.extend({
  product: z.string().min(1, "Бүтээгдэхүүн сонгоно уу"),
  quantity: z.string().min(1, "Тоо хэмжээ оруулна уу"),
});
type PriceRequestData = z.infer<typeof priceRequestSchema>;

type PriceResult = {
  product: string;
  quantity: number;
  unit: string;
  pricePerUnit: { min: number; max: number; avg: number };
  totalPrice: { min: number; max: number; avg: number };
  description: string;
  marketFactors: string[];
  note: string;
  discount: string;
};

function fmtMNT(n: number) {
  if (n >= 1_000_000_000) return `₮${(n / 1_000_000_000).toFixed(1)} тэрбум`;
  if (n >= 1_000_000) return `₮${(n / 1_000_000).toFixed(1)} сая`;
  return `₮${n.toLocaleString("mn-MN")}`;
}

/* ─── AI Тооцоолол панел ─────────────────────────────────────── */
function AiEstimator({
  product, quantity,
}: { product: string; quantity: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PriceResult | null>(null);
  const [error, setError] = useState("");

  const estimate = async () => {
    const qty = parseFloat(quantity);
    if (!product || !qty || qty <= 0) {
      setError("Материал болон тоо хэмжээг зөв оруулна уу.");
      return;
    }
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/price-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, quantity: qty }),
      });
      if (!res.ok) throw new Error("Server error");
      setResult(await res.json());
    } catch {
      setError("Тооцоолол хийхэд алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-border/60 rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 bg-primary/10 border-b border-border/40">
        <Sparkles className="w-4 h-4 text-primary shrink-0" />
        <span className="text-xs font-bold uppercase tracking-widest text-primary">
          AI Зах зээлийн үнийн тооцоолол
        </span>
      </div>

      <div className="p-5 bg-background/40">
        {/* Товч */}
        {!result && !loading && (
          <div className="text-center">
            <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
              Дээр сонгосон материал, тоо хэмжээний дагуу <br />
              <span className="text-foreground font-semibold">зах зээлийн үнийн дундаж тооцоолол</span>-ыг хийнэ.
            </p>
            {error && (
              <div className="flex items-center gap-2 text-destructive text-xs mb-3 justify-center">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}
            <button
              onClick={estimate}
              disabled={!product || !quantity}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold text-sm uppercase tracking-widest rounded-sm hover:bg-primary/90 transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              AI-ээр тооцоолох
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Ачааллаж байна */}
        {loading && (
          <div className="py-6 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 border-primary/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">Зах зээлийн мэдээлэл шинжилж байна...</p>
              <p className="text-xs text-muted-foreground mt-1">2024–2025 оны үнийн мэдээлэл дүн шинжилгээ хийгдэж байна</p>
            </div>
            {/* Animated progress bars */}
            <div className="w-full space-y-2">
              {["Үнийн мэдээлэл татаж байна", "Зах зээлийн хэлбэлзэл шинжилж байна", "Захиалгын хэмжээ тооцоолж байна"].map((t, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 0.8, delay: i * 0.3, ease: "easeInOut" }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{t}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Үр дүн */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              {/* Нийт дүн — гол мэдээлэл */}
              <div className="bg-primary/8 border border-primary/20 rounded-sm p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
                  {result.product} · {result.quantity} {result.unit}
                </p>
                <div className="flex items-baseline justify-center gap-2 mb-1">
                  <span className="text-2xl font-black text-foreground">{fmtMNT(result.totalPrice.min)}</span>
                  <span className="text-muted-foreground text-sm font-bold">–</span>
                  <span className="text-2xl font-black text-foreground">{fmtMNT(result.totalPrice.max)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Нэгж үнэ: {fmtMNT(result.pricePerUnit.min)} – {fmtMNT(result.pricePerUnit.max)} / {result.unit}
                </p>
                <div className="mt-3 h-2 bg-border rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>Хамгийн бага</span>
                  <span className="text-primary font-bold">Дундаж: {fmtMNT(result.totalPrice.avg)}</span>
                  <span>Хамгийн өндөр</span>
                </div>
              </div>

              {/* Материалын тайлбар */}
              <p className="text-xs text-muted-foreground leading-relaxed">{result.description}</p>

              {/* Үнэд нөлөөлөх хүчин зүйлс */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3" /> Үнэд нөлөөлөх хүчин зүйлс
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {result.marketFactors.map((f, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-foreground/70">
                      <span className="text-primary mt-0.5">▸</span> {f}
                    </div>
                  ))}
                </div>
              </div>

              {/* Анхаарал болон хямдрал */}
              {result.note && (
                <div className="bg-amber-500/8 border border-amber-500/20 rounded-sm px-3 py-2 text-xs text-amber-400/90 leading-relaxed">
                  ℹ {result.note}
                </div>
              )}
              {result.discount && (
                <div className="flex items-start gap-2 bg-green-500/8 border border-green-500/20 rounded-sm px-3 py-2 text-xs text-green-400 leading-relaxed">
                  <BadgePercent className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {result.discount}
                </div>
              )}

              {/* Дахин тооцоолох */}
              <button
                onClick={() => setResult(null)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Дахин тооцоолох
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Үндсэн компонент ──────────────────────────────────────── */
export default function Pricelist() {
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const form = useForm<PriceRequestData>({
    resolver: zodResolver(priceRequestSchema),
    defaultValues: { name: "", email: "", phone: "", message: "", product: "Бетон зуурмаг", quantity: "" },
  });

  const watchedProduct = form.watch("product");
  const watchedQty     = form.watch("quantity");

  const onSubmit = async (data: PriceRequestData) => {
    setIsSending(true);
    try {
      await emailjs.send(
        "service_zo80ffc", "template_1qp8wlm",
        { name: data.name, email: data.email, phone: data.phone, product: data.product, quantity: data.quantity, message: data.message },
        "jMUTsjEJc7DCIHEK4"
      );
      const productNote = `Бүтээгдэхүүн: ${data.product}${data.quantity ? `, Тоо хэмжээ: ${data.quantity}` : ""}. `;
      await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name, email: data.email, phone: data.phone,
          message: `${productNote}${data.message || "Үнийн санал авах хүсэлт"}`,
          type: "Үнийн санал",
        }),
      });
      toast({ title: "Хүсэлт амжилттай илгээгдлээ!", description: "Бид үнийн саналыг боловсруулаад тантай эргэж холбогдох болно." });
      form.reset();
    } catch {
      toast({ variant: "destructive", title: "Алдаа гарлаа", description: "Илгээхэд алдаа гарлаа. Та дахин оролдоно уу." });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section id="Pricelist" className="py-32 bg-card relative border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">

          {/* Зүүн — мэдээлэл + AI estimator */}
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
            <h3 className="text-3xl md:text-4xl font-display font-black text-foreground uppercase mb-8">
              Үнийн Санал <span className="text-primary">Авах</span>
            </h3>
            <p className="text-muted-foreground text-lg mb-10 max-w-md leading-relaxed">
              Манай үйлдвэрлэж буй барилгын материалын үнийн саналыг форм бөглөхөд л хангалттай. Бид таны хэрэгцээнд тохирсон хамгийн уян хатан нөхцөлийг санал болгоно.
            </p>

            <div className="space-y-6">
              {/* Утас */}
              <div className="flex items-start gap-6 group">
                <div className="w-14 h-14 bg-background border border-primary/20 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-primary transition-all duration-300">
                  <Phone className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
                </div>
                <div>
                  <h4 className="text-sm font-display font-bold text-foreground uppercase tracking-wide mb-1">Борлуулалтын алба</h4>
                  <a href="tel:+97699112701" className="text-primary hover:underline text-2xl font-black tracking-tight">+976 9911 2701</a>
                  <p className="text-muted-foreground text-sm mt-1">Даваа — Баасан: 09:00 – 18:00</p>
                </div>
              </div>

              {/* AI Estimator */}
              <AiEstimator product={watchedProduct} quantity={watchedQty} />
            </div>
          </motion.div>

          {/* Баруун — форм */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-background p-8 md:p-12 rounded-sm border border-border shadow-2xl shadow-black/50"
          >
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Тайлбар */}
              <div className="flex items-start gap-3 bg-primary/8 border border-primary/20 rounded-sm px-4 py-3">
                <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="text-foreground font-semibold">Материал</span> болон <span className="text-foreground font-semibold">тоо хэмжээ</span>-г оруулаад зүүн талын{" "}
                  <span className="text-primary font-bold">"AI-ээр тооцоолох"</span> товч дарвал зах зээл дээрх үнийн судалгаа харагдана.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Материал сонгох *</label>
                  <select
                    {...form.register("product")}
                    className="w-full bg-card border border-border px-4 py-3 rounded-sm text-foreground focus:border-primary focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="Бетон зуурмаг">Бетон зуурмаг</option>
                    <option value="Хайрга / Дайрга">Хайрга / Дайрга</option>
                    <option value="Элс / Угаасан элс">Элс / Угаасан элс</option>
                    <option value="Цемент">Цемент</option>
                    <option value="Бусад">Бусад</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Тоо хэмжээ (м³ / тн) *</label>
                  <input
                    {...form.register("quantity")}
                    className="w-full bg-card border border-border px-4 py-3 rounded-sm text-foreground focus:border-primary focus:outline-none transition-all"
                    placeholder="Жишээ: 50"
                  />
                  {form.formState.errors.quantity && <p className="text-destructive text-xs">{form.formState.errors.quantity.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Нэр *</label>
                  <input
                    {...form.register("name")}
                    className="w-full bg-card border border-border px-4 py-3 rounded-sm text-foreground focus:border-primary focus:outline-none transition-all"
                    placeholder="Таны нэр"
                  />
                  {form.formState.errors.name && <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Утас *</label>
                  <input
                    {...form.register("phone")}
                    className="w-full bg-card border border-border px-4 py-3 rounded-sm text-foreground focus:border-primary focus:outline-none transition-all"
                    placeholder="Холбоо барих утас"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">И-Мэйл</label>
                <input
                  {...form.register("email")}
                  type="email"
                  className="w-full bg-card border border-border px-4 py-3 rounded-sm text-foreground focus:border-primary focus:outline-none transition-all"
                  placeholder="И-Мэйл хаяг"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Нэмэлт мэдээлэл</label>
                <textarea
                  {...form.register("message")}
                  rows={3}
                  className="w-full bg-card border border-border px-4 py-3 rounded-sm text-foreground focus:border-primary focus:outline-none transition-all resize-none"
                  placeholder="Тээвэрлэлт эсвэл бусад шаардлага..."
                />
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="w-full py-4 bg-primary text-primary-foreground font-display font-bold uppercase tracking-widest rounded-sm hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-3"
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <><Calculator className="w-5 h-5" /> Үнийн санал авах</>
                )}
              </button>
            </form>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
