import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Forklift, Factory, Users2, ShieldCheck, Plus, Trash2, ChevronLeft, ChevronRight, X, Check } from "lucide-react";
import { useGallery } from "@/hooks/use-gallery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Google Sheets-ийн үндсэн URL
const baseCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRiWudLYJX4r1Xf-FaK71gxRgNY8uR_Jywrk14KIphZsPHcIBE7zC0w6C2HcKNSYltvvJKMMS5Fl2M1/pub?output=csv";

const statsConfig = [
  { id: 1, icon: Forklift, label: "Техникийн бэлэн байдал", gid: "0", rowIndex: 3, colIndex: 7, value: "50+", delay: 0.1 },
  { id: 2, icon: Factory, label: "Барилгын материал үйлдвэрлэл", gid: "12345", rowIndex: 2, colIndex: 7, value: "3+", delay: 0.2 },
  { id: 3, icon: Users2, label: "Хүний нөөц", gid: "67890", rowIndex: 5, colIndex: 7, value: "70+", delay: 0.3 },
  { id: 4, icon: ShieldCheck, label: "Чанарын баталгаа", gid: "11223", rowIndex: 4, colIndex: 7, value: "100%", delay: 0.4 }
];

export default function Stats() {
  const [stats, setStats] = useState(statsConfig);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const { data: gallery, createGallery, deleteGallery } = useGallery();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [newImage, setNewImage] = useState({ imageUrl: "", description: "" });

  const fetchLiveStat = async (stat: typeof statsConfig[0]) => {
    setLoadingId(stat.id);
    try {
      const url = `${baseCsvUrl}&gid=${stat.gid}&t=${new Date().getTime()}`;
      const res = await fetch(url);
      const text = await res.text();
      const rows = text.split('\n').map(row => row.split(','));
      const newValue = rows[stat.rowIndex]?.[stat.colIndex]?.trim() || "0";
      setStats(prev => prev.map(s => s.id === stat.id ? { ...s, value: newValue } : s));
    } catch (e) {
      console.error("Дата татахад алдаа гарлаа", e);
    } finally {
      setLoadingId(null);
    }
  };

  const nextSlide = () => {
    if (gallery && gallery.length > 0) {
      setCurrentSlide((prev) => (prev + 1) % gallery.length);
    }
  };

  const prevSlide = () => {
    if (gallery && gallery.length > 0) {
      setCurrentSlide((prev) => (prev - 1 + gallery.length) % gallery.length);
    }
  };

  const handleAdd = () => {
    createGallery.mutate(newImage, {
      onSuccess: () => {
        setIsAdding(false);
        setNewImage({ imageUrl: "", description: "" });
      }
    });
  };

  return (
    <section id="about" className="py-24 bg-card relative border-y border-border overflow-hidden group/section">
      <div className="absolute inset-0 industrial-pattern opacity-10 pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Зүүн тал: Бичвэр болон Статистик */}
          <div>
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex flex-col items-start text-left mb-16 border-l-[3px] border-[#d97706]/50 pl-10"
            >
              <h2 className="text-primary font-bold tracking-[0.2em] uppercase text-sm mb-4 flex items-center gap-4">
                <span className="w-12 h-0.5 bg-primary"></span>
                Манай боломжууд
              </h2>
              <h3 className="text-2xl md:text-3xl font-display font-black text-foreground uppercase leading-[1.1] mb-8">
                Инноваци шингэсэн <span className="text-transparent border-text"> инженерчлэл</span> <br />
                Ирээдүйн эрсдэлгүй <span className="text-transparent border-text"> бүтээн байгуулалт </span>
              </h3>
              <style>{`.border-text { -webkit-text-stroke: 1px hsl(var(--foreground)); }`}</style>
            </motion.div>

            <div className="grid grid-cols-2 gap-8">
              {stats.map((stat) => (
                <motion.div
                  key={stat.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: stat.delay }}
                  className="flex flex-col items-center text-center group cursor-pointer"
                  onClick={() => fetchLiveStat(stat)}
                >
                  <div className={`w-16 h-16 bg-background border border-primary/20 rounded-sm flex items-center justify-center mb-4 
                    group-hover:border-[#d97706] transition-all duration-500 ${loadingId === stat.id ? 'animate-spin border-[#d97706]' : ''}`}>
                    <stat.icon className={`w-8 h-8 ${loadingId === stat.id ? 'text-[#d97706]' : 'text-primary'}`} />
                  </div>
                  <h3 className="text-3xl font-display font-black text-foreground mb-1 tracking-tighter group-hover:text-[#d97706] transition-colors">
                    {stat.value}
                  </h3>
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground group-hover:text-foreground">
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Баруун тал: Слайдер Галерей */}
          <div className="relative group">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-display font-bold uppercase tracking-widest text-foreground">Ажлын явц</h4>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsAdding(!isAdding)}
                className="bg-background/50 border-primary/30 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Plus className="w-4 h-4 mr-2" /> Зураг нэмэх
              </Button>
            </div>

            {isAdding && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-0 z-50 bg-background/95 backdrop-blur-md p-6 rounded-sm border border-primary/20 flex flex-col justify-center gap-4"
              >
                <Input placeholder="Зургийн URL" value={newImage.imageUrl} onChange={e => setNewImage({...newImage, imageUrl: e.target.value})} />
                <Input placeholder="Тайлбар" value={newImage.description} onChange={e => setNewImage({...newImage, description: e.target.value})} />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}><X className="w-4 h-4 mr-1" /> Цуцлах</Button>
                  <Button variant="default" size="sm" onClick={handleAdd} disabled={createGallery.isPending}><Check className="w-4 h-4 mr-1" /> Хадгалах</Button>
                </div>
              </motion.div>
            )}

            <div className="relative h-[400px] w-full overflow-hidden rounded-sm border border-border bg-muted">
              <AnimatePresence mode="wait">
                {gallery && gallery.length > 0 ? (
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.7 }}
                    className="absolute inset-0"
                  >
                    <img src={gallery[currentSlide].imageUrl} alt="Gallery" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"></div>
                    <div className="absolute bottom-6 left-6 right-6">
                      <p className="text-sm font-medium text-foreground">{gallery[currentSlide].description}</p>
                    </div>
                    
                    {/* Delete button */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => {
                          if (confirm("Устгах уу?")) deleteGallery.mutate(gallery[currentSlide].id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">Зураг байхгүй</div>
                )}
              </AnimatePresence>

              {gallery && gallery.length > 1 && (
                <>
                  <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-background/50 backdrop-blur-md rounded-full text-primary hover:bg-primary hover:text-primary-foreground transition-all">
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-background/50 backdrop-blur-md rounded-full text-primary hover:bg-primary hover:text-primary-foreground transition-all">
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
