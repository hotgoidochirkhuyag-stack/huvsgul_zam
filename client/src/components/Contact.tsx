import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContactSchema, type InsertContact } from "@shared/schema";
import { Phone, Mail, MapPin, Loader2 } from "lucide-react";
import emailjs from '@emailjs/browser'; // EmailJS санг импортлох
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Contact() {
  const [isSending, setIsSending] = useState(false); // Илгээж буй төлөвийг хянах
  const { toast } = useToast();

  const form = useForm<InsertContact>({
    resolver: zodResolver(insertContactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: ""
    }
  });

  const onSubmit = async (data: InsertContact) => {
    setIsSending(true); // Ачаалж эхлэх

    try {
      // EmailJS ашиглан huvsgulzam@gmail.com руу мэйл илгээх хэсэг
      await emailjs.send(
        'service_zo80ffc',     // Таны Service ID
        'template_1qp8wlm',    // Таны Template ID
        {
          name: data.name,     // Template дээрх {{name}}
          email: data.email,   // Template дээрх {{email}}
          phone: data.phone,   // Template дээрх {{phone}}
          message: data.message // Template дээрх {{message}}
        },
        'jMUTsjEJc7DCIHEK4'    // Таны Public Key
      );

      toast({
        title: "Амжилттай илгээгдлээ!",
        description: "Бид таны хүсэлтийг хүлээн авлаа. Тантай тун удахгүй холбогдох болно.",
      });

      form.reset(); // Формыг цэвэрлэх
    } catch (error) {
      console.error("Email error:", error);
      toast({
        variant: "destructive",
        title: "Алдаа гарлаа",
        description: "Зурвас илгээхэд алдаа гарлаа. Та дахин оролдоно уу.",
      });
    } finally {
      setIsSending(false); // Ачаалж дуусах
    }
  };

  return (
    <section id="contact" className="py-32 bg-card relative border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">

          {/* Contact Info */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col justify-center"
          >
            <h2 className="text-primary font-bold tracking-[0.2em] uppercase text-sm mb-4 flex items-center gap-4">
              <span className="w-12 h-0.5 bg-primary"></span>
              Бидэнтэй нэгдэх
            </h2>
            <h3 className="text-4xl md:text-5xl font-display font-black text-foreground uppercase mb-8">
              Холбоо <span className="text-primary">Барих</span>
            </h3>
            <p className="text-muted-foreground text-lg mb-12 max-w-md leading-relaxed">
              Мэргэжлийн баг хамт олонтой холбогдож төслийнхөө талаар санал солилцох, үнийн санал авах боломжтой.
            </p>

            <div className="space-y-8">
              <div className="flex items-start gap-6 group">
                <div className="w-14 h-14 bg-background border border-primary/20 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                  <MapPin className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <div>
                  <h4 className="text-lg font-display font-bold text-foreground uppercase tracking-wide mb-1">Хаяг байршил</h4>
                  <p className="text-muted-foreground">Улаанбаатар хот, Сүхбаатар дүүрэг, Хөвсгөл зам ХХК байр</p>
                </div>
              </div>

              <div className="flex items-start gap-6 group">
                <div className="w-14 h-14 bg-background border border-primary/20 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                  <Phone className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <div>
                  <h4 className="text-lg font-display font-bold text-foreground uppercase tracking-wide mb-1">Утас</h4>
                  <p className="text-muted-foreground">+976 9911-2701, +976 0000-0000 </p>
                </div>
              </div>

              <div className="flex items-start gap-6 group">
                <div className="w-14 h-14 bg-background border border-primary/20 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                  <Mail className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <div>
                  <h4 className="text-lg font-display font-bold text-foreground uppercase tracking-wide mb-1">И-Мэйл</h4>
                  <p className="text-muted-foreground">huvsgulzam@gmail.com</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-background p-8 md:p-12 rounded-sm border border-border shadow-2xl shadow-black/50"
          >
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Нэр *</label>
                  <input
                    {...form.register("name")}
                    className="w-full bg-card border border-border px-4 py-3 rounded-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/50"
                    placeholder="Таны нэр"
                  />
                  {form.formState.errors.name && (
                    <p className="text-destructive text-xs mt-1">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Утас</label>
                  <input
                    {...form.register("phone")}
                    className="w-full bg-card border border-border px-4 py-3 rounded-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/50"
                    placeholder="Таны утас"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">И-Мэйл *</label>
                <input
                  {...form.register("email")}
                  type="email"
                  className="w-full bg-card border border-border px-4 py-3 rounded-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/50"
                  placeholder="И-Мэйл хаяг"
                />
                {form.formState.errors.email && (
                  <p className="text-destructive text-xs mt-1">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Зурвас *</label>
                <textarea
                  {...form.register("message")}
                  rows={5}
                  className="w-full bg-card border border-border px-4 py-3 rounded-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none placeholder:text-muted-foreground/50"
                  placeholder="Бидэнд илгээх зурвас..."
                ></textarea>
                {form.formState.errors.message && (
                  <p className="text-destructive text-xs mt-1">{form.formState.errors.message.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="w-full py-4 bg-primary text-primary-foreground font-display font-bold uppercase tracking-widest rounded-sm hover:bg-primary/90 transition-all duration-300 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Илгээж байна...
                  </>
                ) : (
                  "Зурвас илгээх"
                )}
              </button>
            </form>
          </motion.div>

        </div>
      </div>
    </section>
  );
}