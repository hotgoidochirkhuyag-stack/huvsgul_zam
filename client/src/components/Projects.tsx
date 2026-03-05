import { motion } from "framer-motion";
import { useProjects } from "@/hooks/use-projects";
import { ArrowRight, MapPin, Plus, Trash2, X, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Projects() {
  const { data: projects, isLoading, isError, createProject, deleteProject } = useProjects();
  const [isAdding, setIsAdding] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    imageUrl: "",
    category: "Авто зам"
  });

  const handleAdd = () => {
    createProject.mutate(newProject, {
      onSuccess: () => {
        setIsAdding(false);
        setNewProject({ title: "", description: "", imageUrl: "", category: "Авто зам" });
      }
    });
  };

  return (
    <section id="projects" className="py-32 bg-background relative group/section">
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
              Манай амжилт
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
          
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsAdding(!isAdding)}
              className="bg-primary/10 border-primary/50 text-primary hover:bg-primary/20 transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Төсөл нэмэх
            </Button>
            <motion.button 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground hover:text-primary transition-colors group"
            >
              Бүх төслийг харах
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </div>
        </div>

        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 p-6 bg-card border border-primary/20 rounded-md space-y-4 max-w-2xl mx-auto"
          >
            <h4 className="text-xl font-bold uppercase mb-4">Шинэ төсөл нэмэх</h4>
            <div className="grid grid-cols-1 gap-4">
              <Input 
                placeholder="Төслийн нэр" 
                value={newProject.title}
                onChange={e => setNewProject({...newProject, title: e.target.value})}
              />
              <Input 
                placeholder="Төрөл (жишээ: Авто зам)" 
                value={newProject.category}
                onChange={e => setNewProject({...newProject, category: e.target.value})}
              />
              <Input 
                placeholder="Зургийн URL" 
                value={newProject.imageUrl}
                onChange={e => setNewProject({...newProject, imageUrl: e.target.value})}
              />
              <Textarea 
                placeholder="Тайлбар" 
                value={newProject.description}
                onChange={e => setNewProject({...newProject, description: e.target.value})}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                <X className="w-4 h-4 mr-1" /> Цуцлах
              </Button>
              <Button variant="default" size="sm" onClick={handleAdd} disabled={createProject.isPending}>
                <Check className="w-4 h-4 mr-1" /> {createProject.isPending ? "Нэмж байна..." : "Хадгалах"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
            // Loading Skeletons
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col space-y-4">
                <Skeleton className="h-[300px] w-full rounded-sm bg-card" />
                <Skeleton className="h-6 w-3/4 bg-card" />
                <Skeleton className="h-4 w-1/2 bg-card" />
              </div>
            ))
          ) : isError || !projects || projects.length === 0 ? (
            // Empty / Error State
            <div className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-sm">
              <p className="text-muted-foreground font-medium">Одоогоор төсөл бүртгэгдээгүй байна.</p>
            </div>
          ) : (
            // Data Mapping
            projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group cursor-pointer relative"
              >
                <div className="absolute top-4 right-4 z-30 opacity-100">
                  <Button 
                    variant="destructive" 
                    size="icon"
                    className="h-8 w-8 bg-destructive/80 backdrop-blur-sm hover:bg-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Энэ төслийг устгахдаа итгэлтэй байна уу?")) {
                        deleteProject.mutate(project.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="relative h-[350px] overflow-hidden rounded-sm mb-6 bg-card border border-border">
                  <div className="absolute inset-0 bg-background/20 group-hover:bg-transparent transition-colors duration-500 z-10"></div>
                  {/* using project.imageUrl or fallback */}
                  <img 
                    src={project.imageUrl || "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=2071&auto=format&fit=crop"} 
                    alt={project.title}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=2071&auto=format&fit=crop";
                    }}
                  />
                  <div className="absolute bottom-0 left-0 p-4 z-20 w-full bg-gradient-to-t from-background to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                     <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-sm">
                        <MapPin className="w-3 h-3" />
                        {project.category}
                     </span>
                  </div>
                </div>
                
                <h4 className="text-2xl font-display font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {project.title}
                </h4>
                <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                  {project.description}
                </p>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
