import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Forklift, Factory, Users2, ShieldCheck, Plus, Trash2, ChevronLeft, ChevronRight, X, Check, Loader2 } from "lucide-react";
import { useGallery } from "@/hooks/use-gallery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const qualityCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQilkXX437LFOuscH-NGEAsw17iyIcZnbpJoxL4Y4iWDcwbRL6QnGZI_v_dFRbwW20EygKZFD5Btkgh/pub?output=csv";
const machineryCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTJsqvRK4M2dD9_LD_lnoqJCojJbxBgI4AohAGc9_k54Dmx9g3U32RD5qE-59glMO-kT6F4ftlwljOw/pub?output=csv";

const statsConfig = [
  { id: 1, icon: Forklift, label: "Техникийн бэлэн байдал", type: "dynamic", value: "Уншиж байна...", delay: 0.1 },
  { id: 2, icon: Factory, label: "Бетон зуурмаг нийлүүлэх боломж", type: "dynamic", value: "Уншиж байна...", delay: 0.2 },
  { id: 3, icon: Users2, label: "Хүний нөөцийн хүрэлцээ", type: "fixed", value: "70+", delay: 0.3 },
  { id: 4, icon: ShieldCheck, label: "Бетон зуурмагийн чанарын баталгаа", type: "dynamic", value: "Уншиж байна...", delay: 0.4 }
];

// UI дотор ашиглахдаа:
{statsConfig.map((item) => {
  const Icon = item.icon; 

  return (
    <div key={item.id} className="flex items-center gap-3 p-4 border rounded-lg">
      <Icon className="w-8 h-8 text-blue-600" />
      <div className="flex flex-col">
        <span className="text-sm text-gray-500">{item.label}</span>
        <span className="font-bold text-lg">{item.value}</span>
      </div>
    </div>
  );
})}

export default function Stats() {
  const [stats, setStats] = useState(statsConfig);
  const { data: gallery, createGallery, deleteGallery } = useGallery();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [newImage, setNewImage] = useState({ imageUrl: "", description: "" });
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0 });

  useEffect(() => {
    if (!gallery || gallery.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % gallery.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [gallery]);

  const fetchAllData = async () => {
    // 1. Техникийн бэлэн байдал (L2 нүднээс унших)
    try {
      const resp = await fetch(`${machineryCsvUrl}&cache_bust=${Date.now()}`);
      const text = await resp.text();
      const rows = text.split(/\r?\n/).map(l => l.split(','));

      // rows[1] бол 2-р мөр, [11] бол L багана
      if (rows.length > 1 && rows[1][11] !== undefined) {
        let readinessValue = rows[1][11].replace(/"/g, '').trim(); 
        const numValue = parseFloat(readinessValue);
        const finalDisplay = isNaN(numValue) ? readinessValue : Math.round(numValue);

        setStats(prev => prev.map(s => s.id === 1 ? { ...s, value: `${finalDisplay}%` } : s));
      }
    } catch (e) { console.error("Machinery data error:", e); }

    // 2. Бетон зуурмаг нийлүүлэх боломж
    try {
      const resp1 = await fetch(`https://docs.google.com/spreadsheets/d/e/2PACX-1vS3i5DTJM-AS_YL2J03LeFa1DOWPVAFuy0KLSfG1C6qOZLUjHo68C9kzwmPHq8Q8eyDAdkN-wAKgIyj/pub?gid=57463284&single=true&output=csv&cache_bust=${Date.now()}`);
      const text1 = await resp1.text();
      const rows1 = text1.split(/\r?\n/).map(l => l.split(',').map(c => c.replace(/"/g, '').trim()));
      const concreteRows = rows1.filter(r => r[1] === "Бетон зуурмаг");
      if (concreteRows.length > 0) {
        const lastRow = concreteRows[concreteRows.length - 1];
        const value = lastRow[6] || "0";
        const datePart = lastRow[0]?.split(" ")[0] || ""; 
        setStats(prev => prev.map(s => s.id === 2 ? { ...s, value: `${datePart} - ${value} м3` } : s));
      }
    } catch (e) { console.error(e); }

    // 3. Чанарын баталгаа
    try {
      const resp2 = await fetch(`${qualityCsvUrl}&cache_bust=${Date.now()}`);
      const text2 = await resp2.text();
      const rows2 = text2.split(/\r?\n/).map(l => l.split(',').map(c => c.trim()));
      const validRows = rows2.filter(r => r.length > 1);
      if (validRows.length > 1) {
        const lastRow = validRows[validRows.length - 1];
        const datePart = lastRow[0]?.split(" ")[0] || "";
        const notePart = lastRow[lastRow.length - 2] || "Мэдээлэл алга";
        setStats(prev => prev.map(s => s.id === 4 ? { ...s, value: `${datePart} - ${notePart}` } : s));
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchAllData(); }, []);

  const handleRightClick = (e) => { e.preventDefault(); setContextMenu({ show: true, x: e.clientX, y: e.clientY }); };
  const nextSlide = () => gallery && setCurrentSlide((prev) => (prev + 1) % gallery.length);
  const prevSlide = () => gallery && setCurrentSlide((prev) => (prev - 1 + gallery.length) % gallery.length);
  const handleAdd = () => createGallery.mutate(newImage, { onSuccess: () => { setIsAdding(false); setNewImage({ imageUrl: "", description: "" }); } });

  return (
    <section id="about" className="py-24 bg-card relative border-y border-border overflow-hidden group/section" onClick={() => setContextMenu({ show: false, x: 0, y: 0 })}>
      <div className="absolute inset-0 industrial-pattern opacity-5 pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-stretch">
          <div className="flex flex-col justify-between py-2">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="border-l-4 border-primary pl-8 mb-12">
              <h2 className="text-primary font-bold tracking-[0.2em] uppercase text-xs mb-3">Манай боломжууд</h2>
              <h3 className="text-3xl md:text-4xl font-display font-black text-foreground uppercase leading-tight">Манай компани <br /> <span className="text-transparent border-text">өнөөдөр</span></h3>
              <style>{`.border-text { -webkit-text-stroke: 1px hsl(var(--foreground)); }`}</style>
            </motion.div>

            <div className="grid grid-cols-2 gap-6 md:gap-8">
              {stats.map((stat) => (
                <motion.div key={stat.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: stat.delay }} className="bg-background/40 border border-border/50 p-6 rounded-sm group cursor-pointer hover:border-primary transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
                  <div className={`absolute top-0 right-0 w-1 h-full bg-primary transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-bottom`}></div>
                  <div className="flex items-center gap-4 mb-4"><stat.icon className="w-6 h-6 text-primary/60 group-hover:text-primary" /></div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{stat.label}</p>
                  {stat.type === "dynamic" ? (
                    <div className="mt-2">
                      <h3 className="text-3xl font-black text-foreground leading-tight">{stat.value.includes(" - ") ? stat.value.split(" - ")[1] : stat.value}</h3>
                      <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{stat.value.includes(" - ") ? stat.value.split(" - ")[0] : ""}</p>
                    </div>
                  ) : <h3 className="text-3xl font-black text-foreground leading-tight">{stat.value}</h3>}
                </motion.div>
              ))}
            </div>
          </div>

          <div className="relative flex flex-col min-h-[500px]" onContextMenu={handleRightClick}>
            <div className="relative flex-grow rounded-sm border border-border bg-muted overflow-hidden shadow-2xl group/slider">
              <AnimatePresence mode="wait">
                {gallery && gallery.length > 0 ? (
                  <motion.div key={currentSlide} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-black/5">
                    <img src={gallery[currentSlide].imageUrl} className="w-full h-full object-contain" />
                  </motion.div>
                ) : <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin opacity-20" /></div>}
              </AnimatePresence>
              {gallery && gallery.length > 1 && (
                <div className="absolute bottom-8 right-8 flex gap-1">
                  <button onClick={prevSlide} className="p-4 bg-background/10 backdrop-blur-md text-white hover:bg-primary"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={nextSlide} className="p-4 bg-background/10 backdrop-blur-md text-white hover:bg-primary"><ChevronRight className="w-4 h-4" /></button>
                </div>
              )}
            </div>

            {contextMenu.show && (
              <div style={{ top: contextMenu.y, left: contextMenu.x }} className="fixed z-[100] bg-background border border-border shadow-xl rounded-sm py-2 w-40">
                <button className="w-full text-left px-4 py-2 text-xs font-bold uppercase hover:bg-primary/10" onClick={() => setIsAdding(true)}><Plus className="w-3 h-3 inline mr-2"/> Зураг нэмэх</button>
                <button className="w-full text-left px-4 py-2 text-xs font-bold uppercase text-destructive hover:bg-destructive/10" onClick={() => { if(confirm("Устгах уу?")) deleteGallery.mutate(gallery[currentSlide].id); }}><Trash2 className="w-3 h-3 inline mr-2"/> Устгах</button>
              </div>
            )}

            {isAdding && (
              <motion.div className="absolute inset-0 z-50 bg-background/80 p-8 flex flex-col justify-center gap-4">
                <Input placeholder="URL" value={newImage.imageUrl} onChange={e => setNewImage({...newImage, imageUrl: e.target.value})} />
                <Input placeholder="Тайлбар" value={newImage.description} onChange={e => setNewImage({...newImage, description: e.target.value})} />
                <div className="flex gap-2"><Button onClick={handleAdd}>Хадгалах</Button><Button variant="outline" onClick={() => setIsAdding(false)}>Цуцлах</Button></div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}