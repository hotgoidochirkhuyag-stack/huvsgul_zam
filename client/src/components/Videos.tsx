import { motion } from "framer-motion";
import { useVideos } from "@/hooks/use-cloudinary";
import { Play } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Videos() {
  const { data: videos, isLoading, isError } = useVideos();
  const displayVideos = Array.isArray(videos) ? videos.slice(0, 3) : [];

  return (
    <section id="videos" className="py-32 bg-background relative group/section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl"
          >
            <h2 className="text-primary font-bold tracking-[0.2em] uppercase text-sm mb-4 flex items-center gap-4">
              <span className="w-12 h-0.5 bg-primary"></span>
              Бичлэгүүд
            </h2>
            <h3 className="text-4xl md:text-5xl font-display font-black text-foreground uppercase">
              Онцлох <span className="text-transparent border-text">Төслүүд</span>
            </h3>
            <style>{`
              .border-text {
                -webkit-text-stroke: 1px hsl(var(--foreground));
              }
            `}</style>
          </motion.div>
        </div>

        {/* Videos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col space-y-4">
                <Skeleton className="h-[250px] w-full rounded-sm bg-card" />
                <Skeleton className="h-6 w-3/4 bg-card" />
              </div>
            ))
          ) : isError || displayVideos.length === 0 ? (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-sm">
              <p className="text-muted-foreground font-medium">Cloudinary-д бичлэг байхгүй байна. (videos/ хавтас сунгаа)</p>
            </div>
          ) : (
            displayVideos.map((video: any, index: number) => (
              <motion.a
                key={video.id}
                href={video.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group cursor-pointer relative"
              >
                <div className="relative h-[250px] overflow-hidden rounded-sm mb-4 bg-card border border-border">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80 group-hover:to-background transition-colors duration-500 z-10"></div>
                  
                  {/* Video thumbnail - extract from URL or show placeholder */}
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Play className="w-16 h-16 text-primary/40 group-hover:text-primary group-hover:scale-110 transition-all duration-300" />
                  </div>
                  
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <div className="w-16 h-16 rounded-full bg-primary/80 group-hover:bg-primary flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                      <Play className="w-8 h-8 text-white fill-white ml-1" />
                    </div>
                  </div>
                </div>
                
                <h4 className="text-lg font-display font-bold text-foreground group-hover:text-primary transition-colors">
                  {video.title}
                </h4>
              </motion.a>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
