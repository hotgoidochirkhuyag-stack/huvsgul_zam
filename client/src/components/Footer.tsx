import { HardHat, Facebook, Twitter, Linkedin, Instagram } from "lucide-react";

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-background border-t border-border pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Brand */}
          <div className="col-span-1 lg:col-span-1">
            <div 
              className="flex items-center gap-2 cursor-pointer mb-6"
              onClick={scrollToTop}
            >
              <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-sm">
                <HardHat className="text-primary-foreground w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-xl leading-none tracking-wider text-foreground">ХӨВСГӨЛ ЗАМ</span>
                <span className="text-[10px] text-primary font-bold tracking-[0.2em] uppercase">Компани</span>
              </div>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Монгол улсын дэд бүтцийн салбарт чанар, стандартын өндөр түвшинд бүтээн байгуулалт хийж буй тэргүүлэгч компани.
            </p>
            <div className="flex items-center gap-4">
              {[Facebook, Twitter, Linkedin, Instagram].map((Icon, idx) => (
                <a key={idx} href="#" className="w-10 h-10 bg-card border border-border flex items-center justify-center rounded-sm hover:border-primary hover:text-primary transition-colors duration-300">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-bold text-foreground uppercase tracking-wider mb-6">Холбоосууд</h4>
            <ul className="space-y-4">
              {['Бидний тухай', 'Үйлчилгээ', 'Төслүүд', 'Мэдээ мэдээлэл', 'Холбоо барих'].map((item, idx) => (
                <li key={idx}>
                  <button className="text-muted-foreground hover:text-primary text-sm font-medium transition-colors">
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-display font-bold text-foreground uppercase tracking-wider mb-6">Үйлчилгээ</h4>
            <ul className="space-y-4">
              {['Авто зам барилга', 'Гүүрийн байгууламж', 'Хүнд машин механизм', 'Зураг төсөл', 'Барилгын материал'].map((item, idx) => (
                <li key={idx}>
                  <button className="text-muted-foreground hover:text-primary text-sm font-medium transition-colors">
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
                className="w-full bg-card border border-border px-4 py-3 rounded-sm text-sm focus:outline-none focus:border-primary"
              />
              <button className="w-full bg-primary text-primary-foreground font-bold uppercase tracking-wider py-3 rounded-sm text-sm hover:bg-primary/90 transition-colors">
                Бүртгүүлэх
              </button>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Хөвсгөл Зам ХК. Бүх эрх хуулиар хамгаалагдсан.
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
