import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, Calendar, Ruler, Building2, TrendingUp, DollarSign, ChevronLeft, ChevronRight, FileText, Download, FolderOpen } from "lucide-react";
import { useGallery } from "@/hooks/use-gallery";
import { useQuery } from "@tanstack/react-query";

type ProjectDocument = {
  id: number;
  title: string;
  category: string;
  description?: string;
  fileUrl: string;
  fileSize?: string;
  uploadedAt?: string;
};

const DOC_CATEGORIES: Record<string, string> = {
  general:  "Нийтлэг",
  design:   "Зураг төсөл",
  contract: "Гэрээ",
  report:   "Тайлан",
  norm:     "Норм стандарт",
};

function PdfDownloadModal({ onClose }: { onClose: () => void }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const { data: _docsRaw, isLoading } = useQuery<any>({
    queryKey: ["/api/project-documents"],
  });
  const docs: ProjectDocument[] = Array.isArray(_docsRaw) ? _docsRaw : [];

  const categories = ["all", ...Array.from(new Set(docs.map(d => d.category)))];
  const filtered = activeCategory === "all" ? docs : docs.filter(d => d.category === activeCategory);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25 }}
        className="relative bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base leading-tight">PDF Баримтууд</h3>
              <p className="text-white/40 text-xs">Татаж авах боломжтой файлууд</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category filter */}
        {categories.length > 1 && (
          <div className="flex gap-2 px-6 py-3 border-b border-white/8 overflow-x-auto">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? "bg-amber-500 text-[#0f172a]"
                    : "bg-white/5 text-white/40 hover:text-white/70 border border-white/10"
                }`}>
                {cat === "all" ? `Бүгд (${docs.length})` : `${DOC_CATEGORIES[cat] ?? cat} (${docs.filter(d => d.category === cat).length})`}
              </button>
            ))}
          </div>
        )}

        {/* Document list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {isLoading && (
            <div className="py-12 flex flex-col items-center gap-3 text-white/30">
              <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
              <span className="text-sm">Ачааллаж байна...</span>
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="py-12 flex flex-col items-center gap-3 text-white/30">
              <FolderOpen className="w-10 h-10 opacity-40" />
              <span className="text-sm">Баримт хоосон байна</span>
              <span className="text-xs text-white/20">Удирдлагын самбараас PDF файл нэмнэ үү</span>
            </div>
          )}
          {filtered.map((doc, i) => (
            <motion.a
              key={doc.id}
              href={doc.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 p-4 rounded-xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-amber-500/30 transition-all group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate leading-tight">{doc.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-amber-400/70 font-medium">
                    {DOC_CATEGORIES[doc.category] ?? doc.category}
                  </span>
                  {doc.fileSize && <span className="text-[10px] text-white/30">· {doc.fileSize}</span>}
                  {doc.description && <span className="text-[10px] text-white/30 truncate">· {doc.description}</span>}
                </div>
              </div>
              <Download className="w-4 h-4 text-white/20 group-hover:text-amber-400 transition-colors shrink-0" />
            </motion.a>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/8 text-[11px] text-white/25 text-center">
          Нийт {filtered.length} файл · PDF, DOC, XLSX форматтай баримтуудыг татаж авах боломжтой
        </div>
      </motion.div>
    </motion.div>
  );
}

type Project = {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  location?: string;
  length?: string;
  year?: string;
  clientName?: string;
  contractValue?: string;
  progress?: number;
};

/* ─── Бүтэн дэлгэцийн Modal ─────────────────────────────────── */
function ProjectModal({ project, onClose, onPrev, onNext, hasPrev, hasNext }: {
  project: Project;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  const prog = project.progress ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 24 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#0f172a] rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col md:flex-row"
        onClick={e => e.stopPropagation()}
      >
        {/* Хаах товч */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white/70 hover:text-white transition-all"
        >
          <X size={18} />
        </button>

        {/* Зураг хэсэг */}
        <div className="relative md:w-[52%] h-64 md:h-auto shrink-0">
          <img
            src={project.imageUrl}
            alt={project.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-[#0f172a]/80" />
          {/* Ангилал тэмдэглэгэ */}
          <div className="absolute top-4 left-4 z-10">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white bg-amber-600/90 px-3 py-1 rounded-sm">
              <MapPin size={10} /> {project.category}
            </span>
          </div>
          {/* Навигац */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 md:hidden">
            <button onClick={onPrev} disabled={!hasPrev}
              className="w-9 h-9 rounded-full bg-black/50 disabled:opacity-30 flex items-center justify-center text-white hover:bg-black/70 transition-all">
              <ChevronLeft size={18} />
            </button>
            <button onClick={onNext} disabled={!hasNext}
              className="w-9 h-9 rounded-full bg-black/50 disabled:opacity-30 flex items-center justify-center text-white hover:bg-black/70 transition-all">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Мэдээлэл хэсэг */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col">
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase leading-tight mb-3">
              {project.title}
            </h2>
            <div className="w-12 h-1 bg-amber-500 mb-5" />
            <p className="text-slate-300 text-sm leading-relaxed">
              {project.description || "Энэхүү төслийн дэлгэрэнгүй мэдээлэл удахгүй шинэчлэгдэн орох болно."}
            </p>
          </div>

          {/* Дэлгэрэнгүй мэдээлэл */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {project.location && (
              <InfoBadge icon={<MapPin size={14} />} label="Байршил" value={project.location} />
            )}
            {project.length && (
              <InfoBadge icon={<Ruler size={14} />} label="Урт / Хэмжээ" value={project.length} />
            )}
            {project.year && (
              <InfoBadge icon={<Calendar size={14} />} label="Хугацаа" value={project.year} />
            )}
            {project.clientName && (
              <InfoBadge icon={<Building2 size={14} />} label="Захиалагч" value={project.clientName} />
            )}
            {project.contractValue && (
              <InfoBadge icon={<DollarSign size={14} />} label="Гэрээний дүн" value={project.contractValue} />
            )}
          </div>

          {/* Явцын мөр */}
          {project.progress != null && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  <TrendingUp size={12} /> Гүйцэтгэлийн явц
                </span>
                <span className="text-amber-400 font-black text-lg">{prog}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${prog}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                />
              </div>
            </div>
          )}

          {/* Навигацийн товчлуурууд (desktop) */}
          <div className="hidden md:flex items-center gap-3 mt-auto pt-4 border-t border-white/10">
            <button onClick={onPrev} disabled={!hasPrev}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-sm text-slate-300 transition-all">
              <ChevronLeft size={15} /> Өмнөх
            </button>
            <button onClick={onNext} disabled={!hasNext}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 disabled:opacity-30 text-sm text-amber-300 transition-all">
              Дараах <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function InfoBadge({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-xl p-3 border border-white/8">
      <div className="flex items-center gap-1.5 text-amber-400 mb-1">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      </div>
      <p className="text-white text-sm font-semibold leading-snug">{value}</p>
    </div>
  );
}

/* ─── Автоматаар солигддог слот ─────────────────────────────── */
function AutoRotatingSlot({
  title, images, onOpenModal,
}: {
  title: string;
  images: Project[];
  onOpenModal: (project: Project) => void;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => setIndex(p => (p + 1) % images.length), 3500);
    return () => clearInterval(timer);
  }, [images]);

  const current = images[index];

  return (
    <div
      className="group cursor-pointer relative"
      onClick={() => current && onOpenModal(current)}
    >
      <div className="relative h-[400px] w-full overflow-hidden rounded-sm border border-border shadow-lg group-hover:border-amber-500/50 transition-all duration-500">
        {images.length > 0 ? (
          <AnimatePresence mode="wait">
            <motion.img
              key={current.id}
              src={current.imageUrl}
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          </AnimatePresence>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-card text-muted-foreground text-sm">
            Төсөл байхгүй
          </div>
        )}

        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-300" />

        {/* Ангилал */}
        <div className="absolute top-4 left-4 z-20">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white bg-primary/90 px-3 py-1 rounded-sm">
            <MapPin size={10} /> {title}
          </span>
        </div>

        {/* Hover info */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-6 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <h4 className="text-white text-lg font-black uppercase tracking-wide leading-tight mb-1">
            {images.length > 0 ? current.title : title}
          </h4>
          {images.length > 0 && current.location && (
            <p className="text-amber-300 text-xs flex items-center gap-1">
              <MapPin size={10} /> {current.location}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-amber-400 text-[10px] font-bold uppercase tracking-widest">ДЭЛГЭРЭНГҮЙ ҮЗЭХ →</span>
          </div>
        </div>

        {/* Progress bar (bottom) */}
        {images.length > 0 && current.progress != null && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${current.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Dot navigation (multiple projects) */}
      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setIndex(i); }}
              className={`rounded-full transition-all ${i === index ? "w-5 h-1.5 bg-amber-500" : "w-1.5 h-1.5 bg-white/20 hover:bg-white/40"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Үндсэн компонент ──────────────────────────────────────── */
export default function ProjectsCloudinary() {
  const [showPdfModal, setShowPdfModal] = useState(false);
  const { data: allProjects } = useGallery("/api/projects");
  const [modalProject, setModalProject] = useState<Project | null>(null);
  const [modalCategory, setModalCategory] = useState<Project[]>([]);
  const [modalIdx, setModalIdx] = useState(0);

  const roadProjects    = (allProjects?.filter((p: any) => p.category === "Авто зам") ?? []) as Project[];
  const bridgeProjects  = (allProjects?.filter((p: any) => p.category === "Гүүр") ?? []) as Project[];
  const constrProjects  = (allProjects?.filter((p: any) => p.category === "Дэд бүтэц") ?? []) as Project[];

  const openModal = (project: Project, list: Project[]) => {
    const idx = list.findIndex(p => p.id === project.id);
    setModalCategory(list);
    setModalIdx(idx >= 0 ? idx : 0);
    setModalProject(project);
  };

  const goNext = () => {
    const next = modalIdx + 1;
    if (next < modalCategory.length) {
      setModalIdx(next);
      setModalProject(modalCategory[next]);
    }
  };

  const goPrev = () => {
    const prev = modalIdx - 1;
    if (prev >= 0) {
      setModalIdx(prev);
      setModalProject(modalCategory[prev]);
    }
  };

  return (
    <section id="projects" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-primary font-bold tracking-[0.2em] uppercase text-sm mb-4 flex items-center gap-4">
          <span className="w-12 h-0.5 bg-primary" />
          Манай амжилт
        </h2>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h3 className="text-4xl md:text-5xl font-display font-black text-foreground uppercase">
            ОНЦЛОХ <span className="text-transparent border-text">ТӨСЛҮҮД</span>
          </h3>
          <button
            onClick={() => setShowPdfModal(true)}
            data-testid="btn-open-pdf-modal"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-amber-500/15 border border-white/10 hover:border-amber-500/40 rounded-xl text-sm font-semibold text-white/70 hover:text-amber-400 transition-all group mb-1"
          >
            <FileText className="w-4 h-4 text-red-400 group-hover:text-red-300 transition-colors" />
            PDF баримтууд
            <Download className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
        <div className="h-16" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <AutoRotatingSlot title="АВТО ЗАМ"           images={roadProjects}   onOpenModal={p => openModal(p, roadProjects)} />
          <AutoRotatingSlot title="ГҮҮРЭН БАЙГУУЛАМЖ"  images={bridgeProjects} onOpenModal={p => openModal(p, bridgeProjects)} />
          <AutoRotatingSlot title="ДЭД БҮТЭЦ"          images={constrProjects} onOpenModal={p => openModal(p, constrProjects)} />
        </div>
      </div>

      {/* Project Modal */}
      <AnimatePresence>
        {modalProject && (
          <ProjectModal
            project={modalProject}
            onClose={() => setModalProject(null)}
            onPrev={goPrev}
            onNext={goNext}
            hasPrev={modalIdx > 0}
            hasNext={modalIdx < modalCategory.length - 1}
          />
        )}
      </AnimatePresence>

      {/* PDF Download Modal */}
      <AnimatePresence>
        {showPdfModal && <PdfDownloadModal onClose={() => setShowPdfModal(false)} />}
      </AnimatePresence>
    </section>
  );
}
