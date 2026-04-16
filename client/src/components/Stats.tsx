import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Forklift, Factory, ShieldCheck, ZoomIn, FileCheck, Loader2 } from "lucide-react";
import { useGallery } from "@/hooks/use-gallery";
import { QRCodeSVG } from "qrcode.react";

/* ─── ЗҮҮН ТАЛ: ТОМ ЗУРГИЙН КОМПОНЕНТ ─── */
function AutoRotatingSlot({ images }: { images: any[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!images || images.length <= 1) return;
    const timer = setInterval(() => setIndex((p) => (p + 1) % images.length), 8000);
    return () => clearInterval(timer);
  }, [images]);

  if (!images || images.length === 0) {
    return (
      <div className="h-full min-h-[600px] bg-slate-900/50 flex items-center justify-center rounded-sm border border-border">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  const current = images[index];

  return (
    <div className="flex flex-col h-full min-h-[600px] w-full overflow-hidden rounded-sm border border-border bg-[#0a0a0a] shadow-2xl select-none">
      {/* Зураг хэсэг */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black cursor-default">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="relative w-full h-full flex items-center justify-center"
          >
            <img
              src={current.imageUrl}
              className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-20 pointer-events-none"
              alt=""
              onContextMenu={(e) => e.preventDefault()}
            />
            <img
              src={current.imageUrl}
              className="relative z-10 max-w-full max-h-full object-contain p-2 pointer-events-none"
              alt={current.description}
              onContextMenu={(e) => e.preventDefault()} // Хулганы баруун товч хаах
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Тайлбар */}
      <div className="bg-background/40 border-t border-border p-6 min-h-[100px] flex items-center">
        <motion.p
          key={`text-${index}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-white font-bold uppercase text-lg italic tracking-tight leading-tight"
        >
          {current.description}
        </motion.p>
      </div>
    </div>
  );
}

export default function Stats() {
  const { data: gallery = [] } = useGallery("/api/stats");
  const [activeStat, setActiveStat] = useState(0);
  const [loading, setLoading] = useState(true);
  const [zoomCert, setZoomCert] = useState<string | null>(null);
  const [vals, setVals] = useState({ tech: 0, inv: 0, conc: 0, qual: 0 });

  const CERTS = [
    { src: "https://res.cloudinary.com/dfmhppwwu/image/upload/cert/2.jpg", number: "ДБ149/25", label: "Бетон зуурмаг" },
    { src: "https://res.cloudinary.com/dfmhppwwu/image/upload/cert/2.jpg", number: "ДБ150/25", label: "Дүүргэгч материал" },
    { src: "https://res.cloudinary.com/dfmhppwwu/image/upload/cert/3.png", number: "МЖ 085827", label: "Авто пүү (150тн)" },
  ];

  useEffect(() => {
    async function fetchStats() {
      try {
        const resp = await fetch("/api/public/stats");
        if (resp.ok) {
          const data = await resp.json();
          setVals({ tech: data.techReadiness || 0, inv: data.inventoryReadiness || 0, conc: data.concreteSaleable || 0, qual: data.qualityRate || 0 });
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    fetchStats();
    const t = setInterval(() => setActiveStat((p) => (p + 1) % 4), 6000);
    return () => clearInterval(t);
  }, []);

  const stats = [
    { icon: Forklift, label: "Техникийн бэлэн байдал", val: vals.tech, unit: "%", color: "text-amber-400" },
    { icon: Factory, label: "Үйлдвэрлэлд бэлэн нөөц", val: vals.inv, unit: "%", color: "text-blue-400" },
    { icon: Factory, label: "Борлуулах бетон", val: vals.conc, unit: " м³", color: "text-white" },
    { icon: ShieldCheck, label: "Чанарын баталгаа", val: vals.qual, unit: "%", color: "text-green-400" },
  ];

  const cur = stats[activeStat];

  return (
    <section id="about" className="py-24 bg-card relative overflow-hidden select-none">
      <style>{`.border-text { -webkit-text-stroke: 1px hsl(var(--foreground)); color: transparent; }`}</style>

      {/* Zoom Modal (Энд мөн татаж авахыг хаасан) */}
      {zoomCert && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-pointer" 
          onClick={() => setZoomCert(null)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <img 
            src={zoomCert} 
            className="max-w-4xl max-h-[90vh] rounded-sm shadow-2xl border border-white/10 pointer-events-none" 
            alt="Full" 
          />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="border-l-4 border-primary pl-8 mb-12">
          <h2 className="text-primary font-bold tracking-[0.2em] uppercase text-[10px] mb-2">Бидний тухай</h2>
          <h3 className="text-4xl md:text-5xl font-black text-foreground uppercase leading-tight">
             МАНАЙ КОМПАНИ <br /> <span className="border-text">өнөөдөр</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
          {/* ЗҮҮН ТАЛ */}
          <div className="h-full">
            <AutoRotatingSlot images={gallery} />
          </div>

          {/* БАРУУН ТАЛ */}
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-background/40 border border-border p-6 rounded-sm min-h-[250px] flex flex-col justify-center relative shadow-lg">
                <AnimatePresence mode="wait">
                  <motion.div key={activeStat} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                    <cur.icon size={28} className="text-primary mb-4" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">{cur.label}</p>
                    <div className="flex items-baseline gap-2">
                      <h2 className={`text-6xl font-black tracking-tighter ${cur.color}`}>{loading ? "..." : cur.val}</h2>
                      <span className="text-lg font-bold text-muted-foreground uppercase italic">{cur.unit}</span>
                    </div>
                  </motion.div>
                </AnimatePresence>
                <div className="flex gap-2 mt-8">
                  {stats.map((_, i) => ( <div key={i} className={`h-1 transition-all duration-500 ${i === activeStat ? "w-10 bg-primary" : "w-3 bg-border"}`} /> ))}
                </div>
              </div>

              <div className="bg-background/40 border border-border p-6 rounded-sm flex flex-col items-center justify-center min-h-[250px] text-center shadow-lg">
                <div className="bg-white p-3 rounded-sm mb-4">
                  <QRCodeSVG value="https://khuvsgulzam.mn/quality" size={110} level="H" fgColor="#0f172a" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-foreground leading-tight">Бүтээгдэхүүний түүх,<br/>Чанарын баталгаа</p>
              </div>
            </div>

            <div className="flex-1 bg-background/30 border border-border/60 rounded-sm p-8 flex flex-col justify-between shadow-inner">
              <div className="flex items-center gap-2 mb-8">
                <FileCheck className="w-5 h-5 text-primary" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Тохирлын гэрчилгээнүүд & Баталгаажуулалт</p>
              </div>

              <div className="grid grid-cols-3 gap-6">
                {CERTS.map((c, i) => (
                  <div key={i} className="group cursor-pointer" onClick={() => setZoomCert(c.src)}>
                    <div className="aspect-[3/4.5] rounded-sm overflow-hidden border border-border bg-black/20 mb-3 relative">
                      <img 
                        src={c.src} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 pointer-events-none" 
                        alt={c.label}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    </div>
                    <div className="text-left">
                       <p className="text-[9px] font-black text-foreground uppercase truncate">{c.label}</p>
                       <p className="text-primary font-mono text-[8px] font-bold tracking-tight">{c.number}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}