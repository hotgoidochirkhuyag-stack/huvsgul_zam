import { Facebook, Twitter, Linkedin, Instagram } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Footer() {
  const { toast } = useToast();

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: offset, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubscribe = () => {
    toast({
      title: "Бүртгэл амжилттай",
      description: "Та мэдээлэл хүлээн авагчаар амжилттай бүртгэгдлээ.",
    });
  };

  return (
    <footer className="bg-background border-t border-border pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">

          {/* Brand - Дүрсгүй хувилбар */}
          <div className="col-span-1 lg:col-span-1">
            <div 
              className="flex flex-col cursor-pointer mb-6"
              onClick={() => scrollToSection("hero")}
            >
              <span className="font-display font-bold text-2xl leading-none tracking-wider text-foreground uppercase">
                Хөвсгөл Зам
              </span>
              <span className="text-[11px] text-primary font-bold tracking-[0.3em] uppercase mt-1">
                Компани
              </span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Монгол улсын дэд бүтцийн салбарт чанар, стандартын өндөр түвшинд бүтээн байгуулалт хийж буй тэргүүлэгч компани.
            </p>
            <div className="flex items-center gap-4">
              {[
                { Icon: Facebook, link: "https://www.facebook.com/h.vsg.l.zam.hhk" },
                { Icon: Twitter, link: "#" },
                { Icon: Linkedin, link: "#" },
                { Icon: Instagram, link: "#" }
              ].map((item, idx) => (
                <a 
                  key={idx} 
                  href={item.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-card border border-border flex items-center justify-center rounded-sm hover:border-primary hover:text-primary transition-colors duration-300"
                >
                  <item.Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-bold text-foreground uppercase tracking-wider mb-6">Холбоосууд</h4>
            <ul className="space-y-4">
              {[
                { name: 'Бидний тухай', id: 'about' },
                { name: 'Хийсэн ажлууд', id: 'projects' },
                { name: 'Хамтарч ажиллах', id: 'services' },
                { name: 'Үнийн санал ', id: 'pricelist' }
              ].map((item, idx) => (
                <li key={idx}>
                  <button 
                    onClick={() => scrollToSection(item.id)}
                    className="text-muted-foreground hover:text-primary text-sm font-medium transition-colors"
                  >
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Services / Cooperation */}
          <div>
            <h4 className="font-display font-bold text-foreground uppercase tracking-wider mb-6">Үйлчилгээ</h4>
            <ul className="space-y-4">
              {['Авто зам', 'Гүүрийн байгууламж', 'Хүнд машин механизм', 'Барилгын материал'].map((item, idx) => (
                <li key={idx}>
                  <button 
                    onClick={() => scrollToSection("services")}
                    className="text-muted-foreground hover:text-primary text-sm font-medium transition-colors text-left"
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-display font-bold text-foreground uppercase tracking-wider mb-6">Мэдээлэл авах</h4>
            <p className="text-muted-foreground text-sm mb-4">
              Шинэ төсөл, бүтээн байгуулалтын мэдээллийг цаг алдалгүй хүлээн авах.
            </p>
            <div className="flex flex-col gap-2">
              <input 
                type="email" 
                placeholder="И-Мэйл хаяг" 
                className="w-full bg-card border border-border px-4 py-3 rounded-sm text-sm focus:outline-none focus:border-primary transition-colors"
              />
              <button 
                onClick={handleSubscribe}
                className="w-full bg-primary text-primary-foreground font-bold uppercase tracking-wider py-3 rounded-sm text-sm hover:bg-primary/90 transition-all active:scale-[0.98]"
              >
                Бүртгүүлэх
              </button>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Хөвсгөл Зам ХХК. Бүх эрх хуулиар хамгаалагдсан.
          </p>
          <div className="flex items-center gap-6">
            <button className="text-muted-foreground hover:text-foreground text-xs uppercase tracking-wider font-semibold transition-colors">Үйлчилгээний нөхцөл</button>
            <button className="text-muted-foreground hover:text-foreground text-xs uppercase tracking-wider font-semibold transition-colors">Нууцлалын бодлого</button>
          </div>
        </div>
      </div>
    </footer>
  );
}