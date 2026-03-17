import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Forklift, Factory, ShieldCheck, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useGallery } from "@/hooks/use-gallery"; 

export default function Stats() {
  const { data: gallery } = useGallery("/api/stats");
  const [currentSlide, setCurrentSlide] = useState(0);

  const [techReadiness, setTechReadiness] = useState<number | null>(null);
  const [inventoryReadiness, setInventoryReadiness] = useState<number | null>(null);
  const [concreteSaleable, setConcreteSaleable] = useState<number | null>(null);
  const [qualityRate, setQualityRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gallery || gallery.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % gallery.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [gallery]);

  const fetchStats = async () => {
    try {
      const resp = await fetch("/api/public/stats");
      if (!resp.ok) return;
      const data = await resp.json();
      setTechReadiness(data.techReadiness);
      setInventoryReadiness(data.inventoryReadiness);
      setConcreteSaleable(data.concreteSaleable);
      setQualityRate(data.qualityRate);
    } catch (e) {
      console.error("Stats fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fmt = (val: number | null, suffix: string) =>
    loading || val === null ? "..." : `${val}${suffix}`;

  const stats = [
    {
      id: 1,
      icon: Forklift,
      label: "Техникийн бэлэн байдал",
      display: fmt(techReadiness, "%"),
      color: techReadiness !== null && techReadiness >= 80 ? "text-green-400" : techReadiness !== null && techReadiness >= 50 ? "text-amber-400" : "text-red-400",
      delay: 0.1,
    },
    {
      id: 2,
      icon: Factory,
      label: "Үйлдвэрлэлд бэлэн байгаа нөөц",
      display: fmt(inventoryReadiness, "%"),
      color: inventoryReadiness !== null && inventoryReadiness >= 80 ? "text-green-400" : inventoryReadiness !== null && inventoryReadiness >= 50 ? "text-amber-400" : "text-red-400",
      delay: 0.2,
    },
    {
      id: 3,
      icon: Factory,
      label: "Борлуулах боломжтой бетон зуурмаг",
      display: fmt(concreteSaleable, " м³"),
      color: "text-foreground",
      delay: 0.3,
    },
    {
      id: 4,
      icon: ShieldCheck,
      label: "Бетон зуурмагийн чанарын баталгаа",
      display: fmt(qualityRate, "%"),
      color: qualityRate !== null && qualityRate >= 90 ? "text-green-400" : qualityRate !== null && qualityRate >= 70 ? "text-amber-400" : "text-red-400",
      delay: 0.4,
    },
  ];

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
                  whileHover={{ y: -5, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-background/40 border border-border/50 hover:border-primary p-6 rounded-sm relative overflow-hidden flex flex-col justify-between min-h-[140px] cursor-pointer transition-colors duration-300"
                >
                  <stat.icon className="w-6 h-6 text-primary mb-4" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{stat.label}</p>
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
                  ) : (
                    <h3 className={`text-2xl md:text-3xl font-black leading-tight ${stat.color}`}>{stat.display}</h3>
                  )}
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
