import { motion } from "framer-motion";
import { Construction, Truck, Warehouse, PencilRuler } from "lucide-react";

const servicesData = [
  {
    id: 1,
    icon: Construction,
    title: "Авто зам гүүр         дэд бүтэц",
    description: "Олон улсын стандартад нийцсэн бүх төрлийн авто зам гүүр, талбайн барилга угсралт.",
    delay: 0.1
  },
  {
    id: 2,
    icon: Warehouse,
    title: "Бетон зуурмаг үйлдвэр",
    description: "Манай бетон зуурмагийн үйлдвэр чанарын баталгаатай, тохирлын гэрчилгээтэй бетон зуурмаг нийлүүлэх үйлчилгээ.",
    delay: 0.2
  },
  {
    id: 3,
    icon: Truck,
    title: "Техникийн түрээс",
    description: "Зам, гүүрийн зориулалттай хүнд даацын машин механизмын түрээс, засварлах үйлчилгээ.",
    delay: 0.3
  },
  {
    id: 4,
    icon: PencilRuler,
    title: "Зам гүүрийн төсөв",
    description: "Инженерчлэлийн шийдэл бүхий зам гүүрийн төсөв боловсруулах, зөвлөгөө өгөх үйлчилгээ",
    delay: 0.4
  }
];

export default function Services() {
  const scrollToContact = () => {
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="services" className="py-24 bg-background relative border-y border-border overflow-hidden">
      <div className="absolute inset-0 industrial-pattern opacity-5 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* ГАРЧИГ БОЛОН ТОВЧЛУУР ХЭСЭГ */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-start text-left mb-20 border-l-[3px] border-primary/50 pl-10 ml-2"
        >
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-primary font-bold tracking-[0.2em] uppercase text-sm flex items-center gap-4">
              <span className="w-12 h-0.5 bg-primary"></span>
              Харилцагчаа дээдэлсэн хамтын ажиллагаа
            </h2>
          </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between w-full gap-8">
            {/* Чиний хүссэн нүсэр загвар */}
            <h3 className="text-3xl md:text-4xl lg:text-4xl font-display font-black text-foreground uppercase leading-[1.1] max-w-3xl">
              Бид хамтын <span className="text-transparent border-text"> ажиллагаанд</span> <br className="hidden md:block" />
              бүх талын дэмжлэг <span className="text-transparent border-text"> үзүүлнэ</span>
            </h3>

            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="pb-2"
            >
              <button 
                onClick={scrollToContact}
                className="px-8 py-4 bg-transparent border-2 border-primary text-primary font-display font-bold uppercase tracking-widest text-[10px] transition-all relative group overflow-hidden whitespace-nowrap"
              >
                <span className="absolute inset-0 bg-primary translate-y-full group-hover:translate-y-0 transition-transform duration-300"></span>
                <span className="relative z-10 group-hover:text-primary-foreground transition-colors duration-300">
                  хамтран ажиллах санал хүлээн авах
                </span>
                <span className="absolute top-0 right-0 w-3 h-3 bg-primary translate-x-1.5 -translate-y-1.5 rotate-45 z-20"></span>
              </button>
            </motion.div>
          </div>
        </motion.div>

        {/* ҮЙЛЧИЛГЭЭНИЙ КАРТУУД */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {servicesData.map((service) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: service.delay }}
              className="group p-8 bg-card border border-border/50 hover:border-primary/50 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-12 h-12 bg-primary/5 translate-x-6 -translate-y-6 rotate-45 group-hover:bg-primary/10 transition-colors"></div>

              <div className="mb-6 relative">
                <service.icon className="w-12 h-12 text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>

              <h3 className="text-lg font-display font-bold text-foreground mb-4 group-hover:text-primary transition-colors">
                {service.title}
              </h3>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {service.description}
              </p>

              <div className="absolute bottom-0 left-0 h-0.5 bg-primary w-0 group-hover:w-full transition-all duration-500"></div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}