import { motion } from "framer-motion";
import { useProjects } from "@/hooks/use-projects";
import { Trash2, X, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Projects() {
  const { data: projects, isLoading, createProject, deleteProject } = useProjects();
  const [isAdding, setIsAdding] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    imageUrl: "",
    category: "Авто зам"
  });

  // Энд шүүлтүүрийг бүр авч хаясан - ямар ч дата ирсэн бүгдийг нь харуулна
  const allProjects = Array.isArray(projects) ? projects : [];

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
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <motion.div className="max-w-2xl">
            <h2 className="text-primary font-bold tracking-[0.2em] uppercase text-sm mb-4 flex items-center gap-4">
              <span className="w-12 h-0.5 bg-primary"></span>
              Манай амжилт
            </h2>
            <h3 className="text-4xl md:text-5xl font-display font-black text-foreground uppercase">
              Онцлох <span className="text-transparent border-text">Төслүүд</span>
            </h3>
            <style>{`.border-text { -webkit-text-stroke: 1px hsl(var(--foreground)); }`}</style>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[300px] w-full rounded-sm bg-card" />)
          ) : allProjects.length === 0 ? (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-sm">
              <p className="text-muted-foreground font-medium">Одоогоор төсөл бүртгэгдээгүй байна.</p>
            </div>
          ) : (
            allProjects.map((project, index) => (
              <motion.div key={project.id} className="group cursor-pointer relative" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}>
                <div className="absolute top-4 right-4 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="destructive" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); if (confirm("Устгах уу?")) deleteProject.mutate(project.id); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="relative h-[350px] overflow-hidden rounded-sm mb-6 bg-card border border-border">
                  <img 
                    src={project.imageUrl} 
                    alt={project.title} 
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out" 
                  />
                </div>
                <h4 className="text-2xl font-display font-bold text-foreground mb-3">{project.title}</h4>
                <p className="text-muted-foreground text-sm line-clamp-2">{project.description}</p>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}