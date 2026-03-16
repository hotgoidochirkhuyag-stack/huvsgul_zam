import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react"; 
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id) => {
    setMobileMenuOpen(false);

    // Өөрчлөлт: admin гэсэн ID-г дарахад шууд сонголтын хуудас руу шилжинэ
    if (id === "admin") {
      window.location.href = "/select-role"; 
      return;
    }

    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  const navLinks = [
    { name: "БИДНИЙ ТУХАЙ", id: "about" },    
    { name: "ХИЙСЭН АЖЛУУД", id: "projects" },      
    { name: "ХАМТАРЧ АЖИЛЛАХ", id: "services" },    
    { name: "ҮНИЙН САНАЛ ", id: "Pricelist" }, 
  ];

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-background/90 backdrop-blur-md border-b border-primary/20 py-3 shadow-lg shadow-black/50" 
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">

          {/* Logo хэсэг */}
          <div 
            className="flex items-center gap-2 cursor-pointer group shrink-0"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <div className="w-10 h-10 flex items-center justify-center overflow-hidden shrink-0">
              <img 
                src="/logo.png" 
                alt="Хөвсгөл зам лого" 
                className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                onError={(e: any) => { e.target.style.display = 'none'; }} 
              />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-display font-bold text-base leading-none tracking-wider text-foreground uppercase whitespace-nowrap">
                ХӨВСГӨЛ ЗАМ
              </span>
              <span className="text-[10px] text-primary font-bold tracking-[0.2em] uppercase whitespace-nowrap">
                компани
              </span>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className="text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors duration-200 relative group whitespace-nowrap"
              >
                {link.name}
                <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </button>
            ))}
            <button 
              onClick={() => scrollTo("admin")}
              className="ml-4 px-6 py-2.5 bg-primary text-primary-foreground font-display font-bold uppercase tracking-wider text-sm rounded-sm hover:bg-primary/90 hover:shadow-[0_0_15px_rgba(217,119,6,0.4)] transition-all duration-300 active:scale-95 whitespace-nowrap"
            >
              EPR СИСТЕМ
            </button>
          </nav>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-foreground p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>

        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border overflow-hidden"
          >
            <div className="flex flex-col px-4 py-6 gap-4 text-left">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className="text-left text-lg font-display font-bold text-foreground py-2 border-b border-border/50 uppercase tracking-wide active:text-primary"
                >
                  {link.name}
                </button>
              ))}
              <button 
                onClick={() => scrollTo("admin")}
                className="mt-4 w-full py-4 bg-primary text-primary-foreground font-display font-bold uppercase tracking-wider rounded-sm active:scale-95 transition-transform"
              >
                EPR СИСТЕМ
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}