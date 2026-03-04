import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import Projects from "@/components/Projects";
import Services from "@/components/Services"; // 1. Services-ийг импортлох
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
        {/* 2. Services-ийг Projects болон Contact-ын дунд нэмэх */}
        <Services /> 
        <Contact />
      </main>

      <Footer />
    </div>
  );
}