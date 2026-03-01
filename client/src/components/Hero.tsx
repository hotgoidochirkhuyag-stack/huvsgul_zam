import { motion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";

export default function Hero() {
  const scrollToAbout = () => {
    const el = document.getElementById("about");
    if (el) {
      const offset = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: offset, behavior: "smooth" });
    }
  };

  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-background">
      {/* Background Video / Overlay */}
      <div className="absolute inset-0 z-0">
        <video 
          autoPlay 
          muted 
          loop 
          playsInline 
          className="w-full h-full object-cover"
        >
          <source src="/videos/hero-bg.mp4" type="video/mp4" />
          {/* Fallback image if video fails to load */}
          <img 
            src="https://images.unsplash.com/photo-1541888050604-20b12bc12e75?auto=format&fit=crop&q=80" 
            alt="Road Construction" 
            className="w-full h-full object-cover"
          />
        </video>
        <div className="absolute inset-0 bg-slate-900/60 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900/40"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex flex-col items-start mt-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl"
        >
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-primary/10 border border-primary/30 rounded-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-primary font-bold tracking-widest uppercase text-xs sm:text-sm">
              Монгол улсын дэд бүтцийн хөгжилд
            </span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-black text-foreground uppercase leading-[1.1] mb-6">
            Ирээдүйг <br />
            <span className="text-primary text-glow">Бүтээнэ</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground font-medium max-w-2xl mb-10 leading-relaxed border-l-4 border-primary pl-6">
            Бид 30 гаруй жилийн туршлагаараа чанар стандартын өндөр түвшинд авто зам, гүүр, барилга байгууламжийн төслүүдийг амжилттай хэрэгжүүлж байна.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => {
                const el = document.getElementById("projects");
                if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: "smooth" });
              }}
              className="px-8 py-4 bg-primary text-primary-foreground font-display font-bold uppercase tracking-wider rounded-sm flex items-center justify-center gap-3 hover:bg-primary/90 hover:gap-5 transition-all duration-300 box-glow"
            >
              Төслүүдтэй танилцах
              <ArrowRight className="w-5 h-5" />
            </button>
            <button 
              onClick={() => {
                const el = document.getElementById("contact");
                if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: "smooth" });
              }}
              className="px-8 py-4 bg-transparent border-2 border-primary text-primary font-display font-bold uppercase tracking-wider rounded-sm flex items-center justify-center hover:bg-primary/10 transition-colors duration-300"
            >
              Холбогдох
            </button>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer z-20"
        onClick={scrollToAbout}
      >
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Доош гүйлгэх</span>
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        >
          <ChevronDown className="w-6 h-6 text-primary" />
        </motion.div>
      </motion.div>
    </section>
  );
}
