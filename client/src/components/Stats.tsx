import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Forklift, Factory, ShieldCheck, Plus, Trash2, ChevronLeft, ChevronRight, X, Check, Loader2 } from "lucide-react";
import { useGallery } from "@/hooks/use-gallery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const statsConfig = [
  { id: 1, icon: Forklift, label: "Техникийн бэлэн байдал", suffix: "%", value: "Уншиж байна...", delay: 0.1 },
  { id: 2, icon: Check, label: "Үйлдвэрлэлд бэлэн байгаа нөөц", suffix: "%", value: "Уншиж байна...", delay: 0.2 },
  { id: 3, icon: Factory, label: "Борлуулах боломжтой бетон зуурмаг ", suffix: " м3", value: "Уншиж байна...", delay: 0.3 },
  { id: 4, icon: ShieldCheck, label: "Бетон зуурмагийн чанарын баталгаа", suffix: "%", value: "Уншиж байна...", delay: 0.4 }
];

export default function Stats() {
  const [stats, setStats] = useState(statsConfig);
  const { data: gallery, createGallery, deleteGallery } = useGallery();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [newImage, setNewImage] = useState({ imageUrl: "", description: "" });
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0 });

  // Слайд автомат шилжилт
  useEffect(() => {
    if (!gallery || gallery.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % gallery.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [gallery]);

  // Google Sheet-ээс утга татах (5-р мөрөөс)
  const fetchAllData = async () => {
    try {
      const URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQb3rZqDRJ1qaDEmvNHcnhlHjAFAR1XBesPxDFH5d20X8GVU8VAsuijvUcz8asTLpe8YgT65Y9-7yFZ/pub?output=csv";
      const resp = await fetch(`${URL}&cache_bust=${Date.now()}`);
      const text = await resp.text();
      const rows = text.split(/\r?\n/).map(l => l.split(','));

      const targetRow = rows[4]; // 5-р мөр

      if (targetRow) {
        const values = [
          targetRow[1]?.replace(/"/g, '').trim(),
          targetRow[2]?.replace(/"/g, '').trim(),
          targetRow[3]?.replace(/"/g, '').trim(),
          targetRow[4]?.replace(/"/g, '').trim()
        ];

        setStats(prev => prev.map((s, index) => {
          const rawValue = values[index];
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

  // Баруун товч (ContextMenu)
  const handleRightClick = (e) => { 
    e.preventDefault(); 
    setContextMenu({ show: true, x: e.clientX, y: e.clientY }); 
  };

  const nextSlide = () => gallery && setCurrentSlide((prev) => (prev + 1) % gallery.length);
  const prevSlide = () => gallery && setCurrentSlide((prev) => (prev - 1 + gallery.length) % gallery.length);

  const handleAdd = () => {
    createGallery.mutate(newImage, { 
      onSuccess: () => {
        setIsAdding(false); 
        setNewImage({ imageUrl: "", description: "" }); 
      } 
    });
  };

  return (
    <section 
      id="about" 
      className="py-24 bg-card relative border-y border-border overflow-hidden group/section" 
      onClick={() => setContextMenu({ show: false, x: 0, y: 0 })}
    >
      <div className="absolute inset-0 industrial-pattern opacity-5 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-stretch">

          {/* Зүүн тал: Stats */}
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
                <motion.div key={stat.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: stat.delay }} className="bg-background/40 border border-border/50 p-6 rounded-sm group cursor-pointer hover:border-primary transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                  <div className={`absolute top-0 right-0 w-1 h-full bg-primary transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-bottom`}></div>
                  <stat.icon className="w-6 h-6 text-primary/60 group-hover:text-primary mb-4" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{stat.label}</p>
                  <h3 className="text-2xl md:text-3xl font-black text-foreground leading-tight">{stat.value}</h3>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Баруун тал: Слайдер */}
          <div className="relative flex flex-col min-h-[500px]" onContextMenu={handleRightClick}>
            <div className="relative flex-grow rounded-sm border border-border bg-muted overflow-hidden shadow-2xl group/slider">
              <AnimatePresence mode="wait">
                {gallery && gallery.length > 0 ? (
                  <motion.div key={currentSlide} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-black/5 p-1">
                    <img 
                      src={gallery[currentSlide].imageUrl} 
                      className="w-full h-full object-contain"
                      alt="Gallery" 
                    />
                  </motion.div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="animate-spin opacity-20" />
                  </div>
                )}
              </AnimatePresence>

              {gallery && gallery.length > 1 && (
                <div className="absolute bottom-8 right-8 flex gap-1">
                  <button onClick={prevSlide} className="p-4 bg-background/10 backdrop-blur-md text-white hover:bg-primary transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={nextSlide} className="p-4 bg-background/10 backdrop-blur-md text-white hover:bg-primary transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Context Menu */}
            {contextMenu.show && (
              <div style={{ top: contextMenu.y, left: contextMenu.x }} className="fixed z-[100] bg-background border border-border shadow-xl rounded-sm py-2 w-40">
                <button className="w-full text-left px-4 py-2 text-xs font-bold uppercase hover:bg-primary/10" onClick={() => setIsAdding(true)}>
                  <Plus className="w-3 h-3 inline mr-2"/> Зураг нэмэх
                </button>
                <button className="w-full text-left px-4 py-2 text-xs font-bold uppercase text-destructive hover:bg-destructive/10" onClick={() => {
                  if(confirm("Устгах уу?")) deleteGallery.mutate(gallery[currentSlide].id); 
                }}>
                  <Trash2 className="w-3 h-3 inline mr-2"/> Устгах
                </button>
              </div>
            )}

            {/* Зураг нэмэх Form */}
            {isAdding && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-background/90 p-8 flex flex-col justify-center gap-4">
                <h4 className="font-bold uppercase text-sm mb-2">Шинэ зуурмагийн зураг нэмэх</h4>
                <Input placeholder="Зургийн URL" value={newImage.imageUrl} onChange={e => setNewImage({...newImage, imageUrl: e.target.value})} />
                <Input placeholder="Тайлбар" value={newImage.description} onChange={e => setNewImage({...newImage, description: e.target.value})} />
                <div className="flex gap-2">
                  <Button onClick={handleAdd}>Хадгалах</Button>
                  <Button variant="outline" onClick={() => setIsAdding(false)}>Цуцлах</Button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}