import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Forklift, Factory, ShieldCheck, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useGallery } from "@/hooks/use-gallery"; 

const statsConfig = [
  { id: 1, icon: Forklift, label: "Техникийн бэлэн байдал", suffix: "%", value: "Уншиж байна...", delay: 0.1 },
  { id: 2, icon: Factory, label: "Үйлдвэрлэлд бэлэн байгаа нөөц", suffix: "%", value: "Уншиж байна...", delay: 0.2 },
  { id: 3, icon: Factory, label: "Борлуулах боломжтой бетон зуурмаг", suffix: "м3", value: "Уншиж байна...", delay: 0.3 },
  { id: 4, icon: ShieldCheck, label: "Бетон зуурмагийн чанарын баталгаа", suffix: "%", value: "Уншиж байна...", delay: 0.4 }
];

export default function Stats() {
  const [stats, setStats] = useState(statsConfig);
  const { data: gallery } = useGallery("/api/stats");
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!gallery || gallery.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % gallery.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [gallery]);

  const fetchAllData = async () => {
    try {
      const resp = await fetch("/api/sheet-data");
      if (!resp.ok) throw new Error("Sheet fetch failed");
      const text = await resp.text();
      const rows = text.split(/\r?\n/).map((l: string) => l.split(','));

      console.log("DEBUG: Google Sheet-ийн эхний 10 мөр:", rows.slice(0, 10));

      const targetRow = rows[4];

      if (targetRow && targetRow.length > 0) {
        setStats(prev => prev.map((s, index) => {
          const rawValue = targetRow[index + 1]?.replace(/"/g, '').trim();
          if (!rawValue) return s;
          return { ...s, value: `${rawValue}${s.suffix || ""}` };
        }));
      }
    } catch (e) {
      console.error("Sheet error:", e);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  const nextSlide = () => gallery && setCurrentSlide((prev) => (prev + 1) % gallery.length);
  const prevSlide = () => gallery && setCurrentSlide((prev) => (prev - 1 + gallery.length) % gallery.length);

  return (
    <section id="about" className="py-24 bg-card relative border-y border-border overflow-hidden group/section">
      <div className="absolute inset-0 industrial-pattern opacity-5 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-stretch">

          <div className="flex flex-col justify-between py-2">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="border-l-4 border-primary pl-8 mb-12">
              <h2 className="text-primary font-bold tracking-[0.2em] uppercase text-xs mb-3">Манай боломжууд</h2>
              <h3 className="text-3xl md:text-4xl font-display font-black text-foreground uppercase leading-tight">
                Манай компани <br /> <span className="text-transparent border-text">өнөөдөр</span>
              </h3>
              <style>{`.border-text { -webkit-text-stroke: 1px hsl(var(--foreground)); }`}</style>
            </motion.div>

            <div className="grid grid-cols-2 gap-6 md:gap-8">
              {stats.map((stat) => (
                <motion.div 
                  key={stat.id} 
                  initial={{ opacity: 0, y: 20 }} 
                  whileInView={{ opacity: 1, y: 0 }} 
                  viewport={{ once: true }} 
                  transition={{ duration: 0.5, delay: stat.delay }}
                  whileHover={{ y: -5, scale: 1.02, borderColor: "hsl(var(--primary))" }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-background/40 border border-border/50 p-6 rounded-sm relative overflow-hidden flex flex-col justify-between min-h-[140px] cursor-pointer transition-colors duration-300"
                >
                  <stat.icon className="w-6 h-6 text-primary mb-4" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{stat.label}</p>
                  <h3 className="text-2xl md:text-3xl font-black text-foreground leading-tight">{stat.value}</h3>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="relative flex flex-col min-h-[500px]">
            <div className="relative flex-grow rounded-sm border border-border bg-muted overflow-hidden shadow-2xl">
              <AnimatePresence mode="wait">
                {gallery && gallery.length > 0 ? (
                  <motion.div key={currentSlide} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-black/5 p-1">
                    <img src={gallery[currentSlide].imageUrl} className="w-full h-full object-contain" alt="Gallery" />
                  </motion.div>
                ) : (
                  <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin opacity-20" /></div>
                )}
              </AnimatePresence>

              {gallery && gallery.length > 1 && (
                <div className="absolute bottom-8 right-8 flex gap-1">
                  <button onClick={prevSlide} className="p-4 bg-background/10 backdrop-blur-md text-white hover:bg-primary transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={nextSlide} className="p-4 bg-background/10 backdrop-blur-md text-white hover:bg-primary transition-colors"><ChevronRight className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}