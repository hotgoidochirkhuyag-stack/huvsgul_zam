import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin } from "lucide-react";
import { useGallery } from "@/hooks/use-gallery";

export default function ProjectsCloudinary() {
  const { data: allProjects } = useGallery("/api/projects");

  const roadProjects = allProjects?.filter((p: any) => p.category === 'Авто зам') || [];
  const bridgeProjects = allProjects?.filter((p: any) => p.category === 'Гүүр') || [];
  const constrProjects = allProjects?.filter((p: any) => p.category === 'Дэд бүтэц') || [];

  return (
    <section id="projects" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-primary font-bold tracking-[0.2em] uppercase text-sm mb-4 flex items-center gap-4">
          <span className="w-12 h-0.5 bg-primary"></span>
          Манай амжилт
        </h2>
        <h3 className="text-4xl md:text-5xl font-display font-black text-foreground uppercase">
          ОНЦЛОХ <span className="text-transparent border-text">ТӨСЛҮҮД</span>
        </h3>
        <div className="h-16"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <AutoRotatingSlot title="АВТО ЗАМ" images={roadProjects} />
          <AutoRotatingSlot title="ГҮҮРЭН БАЙГУУЛАМЖ" images={bridgeProjects} />
          <AutoRotatingSlot title="ДЭД БҮТЭЦ" images={constrProjects} />
        </div>
      </div>
    </section>
  );
}

function AutoRotatingSlot({ title, images }: { title: string, images: any[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [images]);

  return (
    <div className="group cursor-pointer relative">
      {/* Слот хүрээ */}
      <div className="relative h-[400px] w-full overflow-hidden rounded-sm border border-border shadow-lg">
        {images.length > 0 ? (
          <AnimatePresence mode="wait">
            <motion.img
              key={images[index].id}
              src={images[index].imageUrl}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          </AnimatePresence>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-card text-muted-foreground">
            Төсөл байхгүй
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-300" />

        {/* Category Label */}
        <div className="absolute top-4 left-4 z-20">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white bg-primary/90 px-3 py-1 rounded-sm">
            <MapPin className="w-3 h-3" /> {title}
          </span>
        </div>

        {/* Hover үед гарч ирэх гарчиг */}
        <div className="absolute bottom-6 left-6 z-20 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <h4 className="text-white text-lg font-bold uppercase tracking-wide">
            {images.length > 0 ? images[index].title : title}
          </h4>
          <div className="w-12 h-1 bg-primary mt-2"></div>
        </div>
      </div>
    </div>
  );
}