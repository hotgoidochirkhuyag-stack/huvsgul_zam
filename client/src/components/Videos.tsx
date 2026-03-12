import { motion } from "framer-motion";
import { useGallery } from "@/hooks/use-gallery";
import { Play } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Videos() {
  const { data: videos, isLoading } = useGallery("/api/videos");

  return (
    <section id="videos" className="py-32 bg-[#0a1120] text-white">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-primary font-bold tracking-[0.2em] uppercase text-sm mb-4 flex items-center gap-4">
          <span className="w-12 h-0.5 bg-primary"></span>
          Манай амжилт
        </h2>
        <h3 className="text-4xl md:text-5xl font-display font-black text-foreground uppercase">
          ОНЦЛОХ <span className="text-transparent border-text">БИЧЛЭГҮҮД</span>
        </h3>
        <div className="h-16"></div>
         <style>{`.border-text { -webkit-text-stroke: 1px hsl(var(--foreground)); }`}</style>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {isLoading ? (
            // Уншиж байх үеийн дүрсүүд
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[250px] w-full bg-slate-800" />
            ))
          ) : Array.isArray(videos) && videos.length > 0 ? (
            // Дата ирсэн үеийн бичлэгүүд
            videos.map((video: any) => (
              <motion.a
                key={video.id}
                href={video.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group block relative"
              >
                {/* Видеоны нүүр зураг */}
                <div className="relative h-[250px] w-full bg-slate-900 rounded-sm overflow-hidden border border-slate-700">
                  <img 
                    src={video.videoUrl.replace('/upload/', '/upload/w_600,h_400,c_fill,q_auto,f_jpg/')} 
                    alt={video.title}
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                  />
                  {/* Play товчлуур */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full border-2 border-white/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 bg-black/20">
                      <Play className="w-8 h-8 text-white fill-white" />
                    </div>
                  </div>
                </div>
                {/* Бичлэгийн гарчиг */}
                <h4 className="mt-4 font-bold text-lg uppercase tracking-wider text-slate-200 group-hover:text-amber-500 transition-colors">
                  {video.title}
                </h4>
              </motion.a>
            ))
          ) : (
            <p className="col-span-3 text-center text-slate-400">Одоогоор бичлэг олдсонгүй.</p>
          )}
        </div>
      </div>
    </section>
  );
}