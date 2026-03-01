import { motion } from "framer-motion";
import { Building2, Users, MapPin, Award } from "lucide-react";

const statsData = [
  {
    id: 1,
    icon: MapPin,
    value: "200+",
    label: "Хэрэгжүүлсэн Төсөл",
    delay: 0.1
  },
  {
    id: 2,
    icon: Building2,
    value: "30+",
    label: "Жилийн Туршлага",
    delay: 0.2
  },
  {
    id: 3,
    icon: Users,
    value: "250+",
    label: "Мэргэшсэн Инженерүүд",
    delay: 0.3
  },
  {
    id: 4,
    icon: Award,
    value: "100%",
    label: "Чанарын Баталгаа",
    delay: 0.4
  }
];

export default function Stats() {
  return (
    <section id="about" className="py-24 bg-card relative border-y border-border">
      <div className="absolute inset-0 industrial-pattern opacity-10 pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {statsData.map((stat) => (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: stat.delay }}
              className="flex flex-col items-center text-center group"
            >
              <div className="w-20 h-20 bg-background border border-primary/20 rounded-sm flex items-center justify-center mb-6 group-hover:border-primary group-hover:shadow-[0_0_20px_rgba(217,119,6,0.2)] transition-all duration-300">
                <stat.icon className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-5xl font-display font-black text-foreground mb-3 tracking-tighter group-hover:text-primary transition-colors duration-300">
                {stat.value}
              </h3>
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
