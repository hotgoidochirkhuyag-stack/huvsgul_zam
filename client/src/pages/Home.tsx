import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import Projects from "@/components/Projects";
import Services from "@/components/Services"; 
import Pricelist from "@/components/Pricelist"; 
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Navbar />

      <main className="flex-grow">
        <Hero />
        <Stats />
        <Projects />
        <Services /> 
        <Pricelist />
        <Contact /> {/* Энд хаалтыг нь зөв хааж, main дотор оруулав */}
      </main>

      <Footer />
    </div>
  );
}