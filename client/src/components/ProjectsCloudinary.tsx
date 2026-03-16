import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X } from "lucide-react"; // X икон нэмлээ
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
  const [isExpanded, setIsExpanded] = useState(false); // Танилцуулга нээлттэй эсэх

  useEffect(() => {
    if (images.length <= 1 || isExpanded) return; // Танилцуулга нээлттэй үед зураг солигдохыг зогсооно
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [images, isExpanded]);

  const currentProject = images[index];

  return (
    <div 
      className="group cursor-pointer relative"
      onClick={() => images.length > 0 && setIsExpanded(!isExpanded)}
    >
      {/* Слот хүрээ */}
      <div className={`relative h-[400px] w-full overflow-hidden rounded-sm border transition-all duration-500 ${isExpanded ? 'border-primary shadow-2xl' : 'border-border shadow-lg'}`}>
        {images.length > 0 ? (
          <AnimatePresence mode="wait">
            <motion.img
              key={currentProject.id}
              src={currentProject.imageUrl}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className={`w-full h-full object-cover transition-transform duration-700 ${!isExpanded && 'group-hover:scale-110'}`}
            />
          </AnimatePresence>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-card text-muted-foreground">
            Төсөл байхгүй
          </div>
        )}

        {/* Gradient Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 ${isExpanded ? 'opacity-95' : 'opacity-70 group-hover:opacity-90'}`} />

        {/* Category Label */}
        <div className="absolute top-4 left-4 z-20">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white bg-primary/90 px-3 py-1 rounded-sm">
            <MapPin className="w-3 h-3" /> {title}
          </span>
        </div>

        {/* Танилцуулга хэсэг (Comment маягаар гарч ирнэ) */}
        <AnimatePresence>
          {isExpanded && currentProject && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute inset-0 z-30 p-8 flex flex-col justify-end bg-primary/10 backdrop-blur-[2px]"
            >
              <button 
                onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <h4 className="text-white text-2xl font-black uppercase mb-4 leading-tight">
                {currentProject.title}
              </h4>
              <p className="text-white/80 text-sm leading-relaxed mb-6 line-clamp-6">
                {currentProject.description || "Энэхүү төслийн дэлгэрэнгүй мэдээлэл удахгүй шинэчлэгдэн орох болно. Бид чанартай гүйцэтгэлийг эрхэмлэдэг."}
              </p>
              <div className="w-16 h-1 bg-primary"></div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hover үед гарч ирэх үндсэн гарчиг (Expanded биш үед л харагдана) */}
        {!isExpanded && (
          <div className="absolute bottom-6 left-6 z-20 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            <h4 className="text-white text-lg font-bold uppercase tracking-wide">
              {images.length > 0 ? currentProject.title : title}
            </h4>
            <p className="text-primary text-[10px] font-bold mt-1">ДЭЛГЭРЭНГҮЙ ҮЗЭХ</p>
          </div>
        )}
      </div>
    </div>
  );
}