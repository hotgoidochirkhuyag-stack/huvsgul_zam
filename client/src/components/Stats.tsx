import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Forklift, Factory, ShieldCheck, Loader2 } from "lucide-react";
import { useGallery } from "@/hooks/use-gallery";

const statsConfig = [
  { id: 1, icon: Forklift, label: "Техникийн бэлэн байдал", suffix: "%", value: "..."},
  { id: 2, icon: Factory, label: "Үйлдвэрлэлд бэлэн байгаа нөөц", suffix: "%", value: "..."},
  { id: 3, icon: Factory, label: "Борлуулах боломжтой бетон зуурмаг", suffix: " м3", value: "..."},
  { id: 4, icon: ShieldCheck, label: "Бетон зуурмагийн чанарын баталгаа", suffix: "%", value: "..."}
];

export default function Stats() {
  const [stats, setStats] = useState(statsConfig);
  const { data: rawGallery } = useGallery();
  const [currentSlide, setCurrentSlide] = useState(0);

  const gallery = Array.isArray(rawGallery) ? rawGallery : [];

  // Зургийн линкийг илрүүлэх функц (item-ээс imageUrl, url, эсвэл image.url-ийг хайна)
  const resolveImageUrl = (item) => {
    const url = item?.imageUrl || item?.url || item?.image?.url || "";
    // images.weserv.nl прокси нь CORS/ORB алдааг бүрэн шийднэ
    return url ? `https://images.weserv.nl/?url=${encodeURIComponent(url)}` : "";
  };

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQb3rZqDRJ1qaDEmvNHcnhlHjAFAR1XBesPxDFH5d20X8GVU8VAsuijvUcz8asTLpe8YgT65Y9-7yFZ/pub?output=csv";
        const resp = await fetch(URL, { cache: "no-store" });
        if (!resp.ok) return;
        const text = await resp.text();
        const rows = text.trim().split("\n").map((row) => row.split(","));
        const targetRow = rows?.[4];
        if (!targetRow) return;
        setStats(prev => prev.map((stat, index) => {
          const val = targetRow[index + 1]?.replace(/"/g, "").trim();
          return val ? { ...stat, value: val } : stat;
        }));
      } catch (err) { console.error("Google sheet error:", err); }
    };
    fetchAllData();
  }, []);

  useEffect(() => {
    if (gallery.length <= 1) return;
    const interval = setInterval(() => setCurrentSlide(prev => (prev + 1) % gallery.length), 5000);
    return () => clearInterval(interval);
  }, [gallery]);

  return (
    <section id="about" className="py-24 bg-card relative border-y border-border">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
        <div className="flex flex-col justify-between py-2">
          <div className="border-l-4 border-primary pl-8 mb-12">
            <h2 className="text-primary font-bold tracking-[0.2em] uppercase text-xs mb-3">Манай боломжууд</h2>
            <h3 className="text-4xl font-black uppercase text-foreground">Манай компани <br /> <span className="text-transparent" style={{ WebkitTextStroke: "1px hsl(var(--foreground))" }}>өнөөдөр</span></h3>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {stats.map((stat) => (
              <div key={stat.id} className="bg-background/40 border border-border/50 p-6 rounded-sm min-h-[140px]">
                <stat.icon className="w-6 h-6 text-primary mb-4" />
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">{stat.label}</p>
                <h3 className="text-2xl font-black text-foreground">{stat.value === "..." ? "..." : `${stat.value}${stat.suffix}`}</h3>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[500px] bg-muted rounded-sm overflow-hidden border border-border shadow-2xl">
          <AnimatePresence mode="wait">
            {gallery.length > 0 ? (
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 flex items-center justify-center p-1"
              >
                <img
                  src={resolveImageUrl(gallery[currentSlide])}
                  alt="Gallery"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    console.error("Зураг ачаалах алдаа:", gallery[currentSlide]);
                    e.currentTarget.style.display = "none";
                  }}
                />
              </motion.div>
            ) : (
              <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin w-10 h-10 opacity-20" /></div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}