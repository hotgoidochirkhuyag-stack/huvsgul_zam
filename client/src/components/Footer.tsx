import { useState } from "react";
import { Facebook, MessageCircle, MessageSquare, PhoneCall } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Footer() {
  const { toast } = useToast();
  const [jobEmail, setJobEmail] = useState("");
  const [newsEmail, setNewsEmail] = useState("");
  const [jobLoading, setJobLoading] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: offset, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubscribe = async (email: string, type: string, setLoading: (v: boolean) => void, setEmail: (v: string) => void) => {
    if (!email || !email.includes("@")) {
      toast({ variant: "destructive", title: "Алдаа", description: "Зөв и-мэйл хаяг оруулна уу." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Алдаа гарлаа");
      }
      toast({ title: "Бүртгэл амжилттай", description: `${type} чиглэлээр мэдээлэл хүлээн авагчаар бүртгэгдлээ.` });
      setEmail("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Алдаа", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-background border-t border-border pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">

          {/* 1. Компани тухай & ЛОГО */}
          <div className="col-span-1">
            <div
              className="flex flex-col cursor-pointer mb-6 group/logo"
              onClick={() => scrollToSection("hero")}
            >
              <div className="mb-4">
                <img
                  src="/logo.png"
                  alt="Хөвсгөл Зам Лого"
                  className="h-16 w-auto object-contain brightness-0 invert dark:brightness-100 dark:invert-0 transition-transform group-hover/logo:scale-105 duration-300"
                />
              </div>
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
          </div>

          {/* 2. Шууд холбогдох */}
          <div>
            <h4 className="font-display font-bold text-foreground uppercase tracking-wider mb-6">Холбоо барих</h4>
            <ul className="space-y-5">
              <li>
                <a href="https://www.facebook.com/h.vsg.l.zam.hhk" target="_blank" rel="noreferrer" className="group flex flex-col">
                  <span className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
                    <Facebook className="w-4 h-4" /> Facebook
                  </span>
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors text-sm mt-1">Хөвсгөл Зам ХХК</span>
                </a>
              </li>
              <li>
                <a href="https://wa.me/97699110000" target="_blank" rel="noreferrer" className="group flex flex-col">
                  <span className="flex items-center gap-2 text-xs font-bold text-green-500 uppercase tracking-widest">
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </span>
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors text-sm mt-1">Чатлах</span>
                </a>
              </li>
              <li>
                <div
                  className="group flex flex-col cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText("huvsgulzam_Admin");
                    toast({ title: "WeChat ID хуулагдлаа", description: "huvsgulzam_Admin" });
                  }}
                >
                  <span className="flex items-center gap-2 text-xs font-bold text-emerald-500 uppercase tracking-widest">
                    <MessageSquare className="w-4 h-4" /> WeChat ID
                  </span>
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors text-sm mt-1">huvsgulzam_Admin</span>
                </div>
              </li>
              <li>
                <a href="viber://chat?number=97699110000" className="group flex flex-col">
                  <span className="flex items-center gap-2 text-xs font-bold text-purple-500 uppercase tracking-widest">
                    <PhoneCall className="w-4 h-4" /> Viber
                  </span>
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors text-sm mt-1">Viber чат</span>
                </a>
              </li>
            </ul>
          </div>

          {/* 3. Ажлын байр */}
          <div>
            <h4 className="font-display font-bold text-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
              Ажлын байр
            </h4>
            <p className="text-muted-foreground text-[13px] mb-4">
              Хөвсгөл зам компанид ажиллахыг хүсвэл и-мэйл хаягаа илгээнэ үү. Бид танд нээлтэй ажлын байрны талаар мэдээлэл илгээн манай хамт олонд нэгдэх боломжийг бүрдүүлэх болно.
            </p>
            <div className="space-y-2">
              <input
                type="email"
                value={jobEmail}
                onChange={(e) => setJobEmail(e.target.value)}
                placeholder="И-Мэйл хаяг"
                className="w-full bg-card border border-border px-4 py-2.5 rounded-sm text-sm focus:outline-none focus:border-primary transition-colors"
              />
              <button
                onClick={() => handleSubscribe(jobEmail, "Ажлын байр", setJobLoading, setJobEmail)}
                disabled={jobLoading}
                className="w-full bg-card border border-primary/50 text-primary font-bold uppercase tracking-widest py-2.5 rounded-sm text-[10px] hover:bg-primary hover:text-white transition-all disabled:opacity-50"
              >
                {jobLoading ? "Илгээж байна..." : "Илгээх"}
              </button>
            </div>
          </div>

          {/* 4. Төслийн мэдээлэл */}
          <div>
            <h4 className="font-display font-bold text-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
              Төслийн мэдээ
            </h4>
            <p className="text-muted-foreground text-[13px] mb-4">
              Хэрэгжиж буй болон шинээр эхлэх төсөл, бүтээн байгуулалтын талаар мэдээлэл авахыг хүсвэл и-мэйл хаягаа илгээнэ үү.
            </p>
            <div className="space-y-2">
              <input
                type="email"
                value={newsEmail}
                onChange={(e) => setNewsEmail(e.target.value)}
                placeholder="И-Мэйл хаяг"
                className="w-full bg-card border border-border px-4 py-2.5 rounded-sm text-sm focus:outline-none focus:border-primary transition-colors"
              />
              <button
                onClick={() => handleSubscribe(newsEmail, "Төслийн мэдээ", setNewsLoading, setNewsEmail)}
                disabled={newsLoading}
                className="w-full bg-card border border-primary/50 text-primary font-bold uppercase tracking-widest py-2.5 rounded-sm text-[10px] hover:bg-primary hover:text-white transition-all disabled:opacity-50"
              >
                {newsLoading ? "Илгээж байна..." : "Илгээх"}
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
            <a href="/admin" className="text-muted-foreground hover:text-foreground text-xs uppercase tracking-wider font-semibold transition-colors">Удирдах самбар</a>
            <button className="text-muted-foreground hover:text-foreground text-xs uppercase tracking-wider font-semibold transition-colors">Нууцлалын бодлого</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
