import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Forklift, Factory, ShieldCheck, MapPin, Loader2 } from "lucide-react";
import { useGallery } from "@/hooks/use-gallery";

/* ─── AutoRotatingSlot — ProjectsCloudinary-тай ижил ─────── */
function AutoRotatingSlot({ images }: { images: { id: string; imageUrl: string; description: string }[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => setIndex(p => (p + 1) % images.length), 3500);
    return () => clearInterval(timer);
  }, [images]);

  const current = images[index];

  return (
    <div className="relative">
      <div className="group relative h-[500px] w-full overflow-hidden rounded-sm border border-border shadow-lg hover:border-amber-500/50 transition-all duration-500">
        {images.length > 0 ? (
          <AnimatePresence mode="wait">
            <motion.img
              key={current.id}
              src={current.imageUrl}
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              alt={current.description}
            />
          </AnimatePresence>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-card">
            <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
          </div>
        )}

        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-300" />

        {/* Ангилал тэмдэглэгэ */}
        <div className="absolute top-4 left-4 z-20">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white bg-primary/90 px-3 py-1 rounded-sm">
            <MapPin size={10} /> ХӨВСГӨЛ ЗАМ ХХК
          </span>
        </div>

        {/* Hover info */}
        {images.length > 0 && current.description && (
          <div className="absolute bottom-0 left-0 right-0 z-20 p-6 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            <h4 className="text-white text-base font-black uppercase tracking-wide leading-tight">
              {current.description}
            </h4>
          </div>
        )}
      </div>

      {/* Цэгэн навигац */}
      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`rounded-full transition-all ${i === index ? "w-5 h-1.5 bg-amber-500" : "w-1.5 h-1.5 bg-white/20 hover:bg-white/40"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Үндсэн Stats компонент ─────────────────────────────── */
export default function Stats() {
  const { data: gallery = [] } = useGallery("/api/stats");

  const [techReadiness, setTechReadiness] = useState<number | null>(null);
  const [inventoryReadiness, setInventoryReadiness] = useState<number | null>(null);
  const [concreteSaleable, setConcreteSaleable] = useState<number | null>(null);
  const [qualityRate, setQualityRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

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
      id: 1, icon: Forklift,
      label: "Техникийн бэлэн байдал",
      display: fmt(techReadiness, "%"),
      color: techReadiness !== null && techReadiness >= 80 ? "text-green-400" : techReadiness !== null && techReadiness >= 50 ? "text-amber-400" : "text-red-400",
      delay: 0.1,
    },
    {
      id: 2, icon: Factory,
      label: "Үйлдвэрлэлд бэлэн байгаа нөөц",
      display: fmt(inventoryReadiness, "%"),
      color: inventoryReadiness !== null && inventoryReadiness >= 80 ? "text-green-400" : inventoryReadiness !== null && inventoryReadiness >= 50 ? "text-amber-400" : "text-red-400",
      delay: 0.2,
    },
    {
      id: 3, icon: Factory,
      label: "Борлуулах боломжтой бетон зуурмаг",
      display: fmt(concreteSaleable, " м³"),
      color: "text-foreground",
      delay: 0.3,
    },
    {
      id: 4, icon: ShieldCheck,
      label: "Бетон зуурмагийн чанарын баталгаа",
      display: fmt(qualityRate, "%"),
      color: qualityRate !== null && qualityRate >= 90 ? "text-green-400" : qualityRate !== null && qualityRate >= 70 ? "text-amber-400" : "text-red-400",
      delay: 0.4,
    },
  ];

  return (
    <section id="about" className="py-24 bg-card relative border-y border-border overflow-hidden group/section">
      <div className="absolute inset-0 industrial-pattern opacity-5 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-stretch">

          {/* Зүүн — гарчиг + 4 stat */}
          <div className="flex flex-col justify-between py-2">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="border-l-4 border-primary pl-8 mb-12"
            >
              <h2 className="text-primary font-bold tracking-[0.2em] uppercase text-xs mb-3">Манай боломжууд</h2>
              <h3 className="text-3xl md:text-4xl font-display font-black text-foreground uppercase leading-tight">
                Манай компани <br /> <span className="text-transparent border-text">өнөөдөр</span>
              </h3>
              <style>{`.border-text { -webkit-text-stroke: 1px hsl(var(--foreground)); }`}</style>
            </motion.div>

            <div className="grid grid-cols-2 gap-6 md:gap-8">
              {stats.map(stat => (
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

          {/* Баруун — AutoRotatingSlot */}
          <div className="flex flex-col justify-center">
            <AutoRotatingSlot images={gallery} />
          </div>

        </div>
      </div>
    </section>
  );
}
