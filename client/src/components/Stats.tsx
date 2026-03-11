import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Forklift, Factory, ShieldCheck, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useStats } from "@/hooks/use-cloudinary";

const statsConfig = [
  { id: 1, icon: Forklift, label: "Техникийн бэлэн байдал", suffix: "%", value: "98%"},
  { id: 2, icon: Factory, label: "Үйлдвэрлэлд бэлэн байгаа нөөц", suffix: "%", value: "95%"},
  { id: 3, icon: Factory, label: "Борлуулах боломжтой бетон зуурмаг", suffix: " м3", value: "500+"},
  { id: 4, icon: ShieldCheck, label: "Бетон зуурмагийн чанарын баталгаа", suffix: "%", value: "100%"}
];

export default function Stats() {
  const [stats] = useState(statsConfig);
  const { data: statsImages, isLoading } = useStats();
  const [currentSlide, setCurrentSlide] = useState(0);

  const gallery = Array.isArray(statsImages) ? statsImages : [];

  useEffect(() => {
    if (gallery.length <= 1) return;
    const interval = setInterval(() => setCurrentSlide(prev => (prev + 1) % gallery.length), 5000);
    return () => clearInterval(interval);
  }, [gallery]);

  const nextSlide = () => {
    if (gallery.length > 0) setCurrentSlide((prev) => (prev + 1) % gallery.length);
  };

  const prevSlide = () => {
    if (gallery.length > 0) setCurrentSlide((prev) => (prev - 1 + gallery.length) % gallery.length);
  };

  return (
    <section id="about" className="py-24 bg-card relative border-y border-border overflow-hidden group/section">
      <div className="absolute inset-0 industrial-pattern opacity-5 pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-stretch">
          {/* Зүүн тал: Статистик */}
          <div className="flex flex-col justify-between py-2">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="border-l-4 border-primary pl-8 mb-12">
              <h2 className="text-primary font-bold tracking-[0.2em] uppercase text-xs mb-3">Манай боломжууд</h2>
              <h3 className="text-3xl md:text-4xl font-display font-black text-foreground uppercase leading-tight">Манай компани <br /> <span className="text-transparent border-text">өнөөдөр</span></h3>
              <style>{`.border-text { -webkit-text-stroke: 1px hsl(var(--foreground)); }`}</style>
            </motion.div>

            <div className="grid grid-cols-2 gap-6 md:gap-8">
              {stats.map((stat) => (
                <motion.div key={stat.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: stat.id * 0.1 }} className="bg-background/40 border border-border/50 p-6 rounded-sm group cursor-pointer hover:border-primary transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-1 h-full bg-primary transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-bottom"></div>
                  <div className="flex items-center gap-4 mb-4"><stat.icon className="w-6 h-6 text-primary/60 group-hover:text-primary" /></div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{stat.label}</p>
                  <h3 className="text-3xl font-black text-foreground leading-tight">{stat.value}{stat.suffix}</h3>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Баруун тал: Stats gallery */}
          <div className="relative flex flex-col min-h-[500px]">
            <div className="relative flex-grow rounded-sm border border-border bg-muted overflow-hidden shadow-2xl group/slider">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin opacity-20 w-12 h-12" /></div>
                ) : gallery && gallery.length > 0 ? (
                  <motion.div key={currentSlide} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-black/5">
                    <img src={gallery[currentSlide].imageUrl} alt="Stats" className="w-full h-full object-contain" />
                  </motion.div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">stats/ хавтас хоосон байна</div>
                )}
              </AnimatePresence>
              
              {gallery && gallery.length > 1 && (
                <div className="absolute bottom-8 right-8 flex gap-1">
                  <button onClick={prevSlide} className="p-4 bg-background/10 backdrop-blur-md text-white hover:bg-primary transition-colors rounded-full"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={nextSlide} className="p-4 bg-background/10 backdrop-blur-md text-white hover:bg-primary transition-colors rounded-full"><ChevronRight className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
