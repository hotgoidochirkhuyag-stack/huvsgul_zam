import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContactSchema, type InsertContact } from "@shared/schema";
import { Phone, Mail, MapPin, Loader2, Calculator, Facebook, MessageCircle, Send } from "lucide-react";
import emailjs from '@emailjs/browser';
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const priceRequestSchema = insertContactSchema.extend({
  product: z.string().min(1, "Бүтээгдэхүүн сонгоно уу"),
  quantity: z.string().min(1, "Тоо хэмжээ оруулна уу"),
});

type PriceRequestData = z.infer<typeof priceRequestSchema>;

export default function Pricelist() {
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const form = useForm<PriceRequestData>({
    resolver: zodResolver(priceRequestSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
      product: "Бетон зуурмаг",
      quantity: ""
    }
  });

  const onSubmit = async (data: PriceRequestData) => {
    setIsSending(true);
    try {
      await emailjs.send(
        'service_zo80ffc',
        'template_1qp8wlm',
        {
          name: data.name,
          email: data.email,
          phone: data.phone,
          product: data.product,
          quantity: data.quantity,
          message: data.message
        },
        'jMUTsjEJc7DCIHEK4'
      );

      toast({
        title: "Хүсэлт амжилттай илгээгдлээ!",
        description: "Бид үнийн саналыг боловсруулаад тантай эргэж холбогдох болно.",
      });

      form.reset();
    } catch (error) {
      console.error("Email error:", error);
      toast({
        variant: "destructive",
        title: "Алдаа гарлаа",
        description: "Илгээхэд алдаа гарлаа. Та дахин оролдоно уу.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section id="Pricelist" className="py-32 bg-card relative border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">

          {/* Мэдээллийн хэсэг */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col justify-center"
          >
            <h2 className="text-primary font-bold tracking-[0.2em] uppercase text-sm mb-4 flex items-center gap-4">
              <span className="w-12 h-0.5 bg-primary"></span>
              Бүтээн байгуулалтын түнш
            </h2>
            <h3 className="text-3xl md:text-4xl font-display font-black text-foreground uppercase mb-8">
              Үнийн Санал <span className="text-primary">Авах</span>
            </h3>
            <p className="text-muted-foreground text-lg mb-12 max-w-md leading-relaxed">
              Манай үйлдвэрлэж буй барилгын материалын үнийн саналыг авахын тулд форм бөглөхөд л хангалттай. Бид таны хэрэгцээнд тохирсон хамгийн уян хатан нөхцөлийг санал болгоно.
            </p>

            <div className="space-y-10">
              {/* Борлуулалтын албаны утас - Хэмжээ хэвээрээ */}
              <div className="flex items-start gap-6 group">
                <div className="w-12 h-12 bg-background border border-primary/20 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-primary transition-all duration-300">
                  <Phone className="w-5 h-5 text-primary group-hover:text-primary-foreground" />
                </div>
                <div>
                  <h4 className="text-md font-display font-bold text-foreground uppercase tracking-wide">Борлуулалтын алба</h4>
                  <a href="tel:+97699112701" className="text-primary hover:underline text-xl font-black tracking-tight">+976 99112701</a>
                </div>
              </div>

              {/* Сошиал сувгууд: Зөвхөн энэ хэсгийг томруулав */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-10 gap-x-12 pt-10 border-t border-border/50">
                {[
                  { icon: Facebook, title: "Facebook", desc: "Хөвсгөл Зам ХХК", link: "https://www.facebook.com/h.vsg.l.zam.hhk" },
                  { icon: MessageCircle, title: "WhatsApp", desc: "Шууд чатлах", link: "https://wa.me/97699112701" },
                  { icon: Send, title: "WeChat ID", desc: "HuvsgulZam_Admin", link: null },
                  { icon: Phone, title: "Viber", desc: "Viber чат", link: "viber://chat?number=+97699112701" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-6 group">
                    <div className="w-16 h-16 bg-background border-2 border-primary/10 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:border-primary transition-all duration-300 shadow-sm">
                      <item.icon className="w-7 h-7 text-primary group-hover:text-primary-foreground" />
                    </div>
                    <div className="flex flex-col">
                      <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-1.5">
                        {item.title}
                      </h4>
                      {item.link ? (
                        <a 
                          href={item.link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-foreground hover:text-primary text-lg font-black transition-colors leading-tight"
                        >
                          {item.desc}
                        </a>
                      ) : (
                        <p className="text-foreground text-lg font-black leading-tight">{item.desc}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Үнийн саналын форм */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-background p-8 md:p-12 rounded-sm border border-border shadow-2xl shadow-black/50"
          >
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Тоо хэмжээ (м3 / тн) *</label>
                  <input
                    {...form.register("quantity")}
                    className="w-full bg-card border border-border px-4 py-3 rounded-sm text-foreground focus:border-primary focus:outline-none transition-all"
                    placeholder="Жишээ: 50 м3"
                  />
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
                  <>
                    <Calculator className="w-5 h-5" />
                    Үнийн санал авах
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}