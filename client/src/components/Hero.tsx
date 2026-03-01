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
      {/* Background Image / Overlay */}
      <div className="absolute inset-0 z-0">
        {/* landing page hero heavy road construction machinery landscape */}
        <img 
          src="https://pixabay.com/get/g9d5d7b25337a2dfe498e3f083730345f57c0bba3ce6367246e7ed8d5253c2c098a00aa29c14852771465dcf083b9079a9bff344f144a3ef3573b9b5c3f41a2a4_1280.jpg" 
          alt="Road Construction" 
          className="w-full h-full object-cover animate-pan"
        />
        <div className="absolute inset-0 bg-background/80 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent"></div>
        <div className="absolute inset-0 industrial-pattern opacity-20"></div>
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
