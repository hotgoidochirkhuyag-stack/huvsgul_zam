import { useState } from "react";
import { motion } from "framer-motion";
import { HardHat, Factory, Users2, ShieldCheck } from "lucide-react";

// Google Sheets-ийн үндсэн URL (gid-г нь сольж өөр өөр шийт рүү хандана)
const baseCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRiWudLYJX4r1Xf-FaK71gxRgNY8uR_Jywrk14KIphZsPHcIBE7zC0w6C2HcKNSYltvvJKMMS5Fl2M1/pub?output=csv";

const statsConfig = [
  { 
    id: 1, 
    icon: HardHat, 
    label: "Техникийн бэлэн байдал", 
    gid: "0",      // Sheet1-ийн ID
    rowIndex: 3,   // Унших мөр
    colIndex: 7,   // H багана
    value: "50+", 
    delay: 0.1 
  },
  { 
    id: 2, 
    icon: Factory, 
    label: "Барилгын материал үйлдвэрлэл", 
    gid: "12345",  // Энд Sheet2-ийнхоо GID-г тавиарай
    rowIndex: 2, 
    colIndex: 7, 
    value: "3+", 
    delay: 0.2 
  },
  { 
    id: 3, 
    icon: Users2, 
    label: "Хүний нөөц", 
    gid: "67890",  // Энд Sheet3-ийнхоо GID-г тавиарай
    rowIndex: 5, 
    colIndex: 7, 
    value: "70+", 
    delay: 0.3 
  },
  { 
    id: 4, 
    icon: ShieldCheck, 
    label: "Чанарын баталгаа", 
    gid: "11223",  // Энд Sheet4-ийнхоо GID-г тавиарай
    rowIndex: 4, 
    colIndex: 7, 
    value: "100%", 
    delay: 0.4 
  }
];

export default function Stats() {
  const [stats, setStats] = useState(statsConfig);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const fetchLiveStat = async (stat: typeof statsConfig[0]) => {
    setLoadingId(stat.id);
    try {
      // gid параметрийг ашиглан тухайн шийт рүү хандана
      const url = `${baseCsvUrl}&gid=${stat.gid}&t=${new Date().getTime()}`;
      const res = await fetch(url);
      const text = await res.text();
      const rows = text.split('\n').map(row => row.split(','));

      const newValue = rows[stat.rowIndex]?.[stat.colIndex]?.trim() || "0";

      setStats(prev => prev.map(s => s.id === stat.id ? { ...s, value: newValue } : s));
    } catch (e) {
      console.error("Дата татахад алдаа гарлаа", e);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <section id="about" className="py-24 bg-card relative border-y border-border overflow-hidden">
      <div className="absolute inset-0 industrial-pattern opacity-10 pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Гарчиг хэсэг */}
        {/* Гарчиг хэсэг - Хамгийн зайтай, цэвэрхэн хувилбар */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-start text-left mb-20 border-l-[3px] border-[#d97706]/50 pl-10 ml-2"
        >
          <div className="flex items-center gap-3 mb-6">
             <h2 className="text-primary font-bold tracking-[0.2em] uppercase text-sm mb-4 flex items-center gap-4">
              <span className="w-12 h-0.5 bg-primary"></span>
              Манай чадавхи
            </h2>
          </div>
          <h3 className="text-3xl md:text-4xl lg:text-4xl font-display font-black text-foreground uppercase leading-[1.1] max-w-3xl">
            Инноваци шингэсэн <span className="text-transparent border-text"> инженерчлэл</span> <br className="hidden md:block" />
            Ирээдүйн эрсдэлгүй <span className="text-transparent border-text"> бүтээн байгуулалт </span>
          </h3>
        </motion.div>

        {/* Статистик картууд */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((stat) => (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: stat.delay }}
              className="flex flex-col items-center text-center group cursor-pointer"
              onClick={() => fetchLiveStat(stat)}
            >
              <div className={`w-20 h-20 bg-background border border-primary/20 rounded-sm flex items-center justify-center mb-6 
                group-hover:border-[#d97706] group-hover:shadow-[0_0_30px_rgba(217,119,6,0.3)] 
                transition-all duration-500 ${loadingId === stat.id ? 'animate-spin border-[#d97706]' : ''}`}>
                <stat.icon className={`w-10 h-10 ${loadingId === stat.id ? 'text-[#d97706]' : 'text-primary'}`} />
              </div>

              <h3 className="text-5xl font-display font-black text-foreground mb-3 tracking-tighter group-hover:text-[#d97706] transition-colors duration-300">
                {stat.value}
              </h3>

              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground group-hover:text-foreground">
                {stat.label}
              </p>
              <span className="text-[8px] text-[#d97706] mt-4 opacity-0 group-hover:opacity-100 transition-opacity uppercase font-bold">Энд дарахад өнөөрийн байдлаар харуулна</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}