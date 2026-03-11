import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import ProjectsCloudinary from "@/components/ProjectsCloudinary";
import Videos from "@/components/Videos";
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
        <ProjectsCloudinary />
        <Videos />
        <Services /> 
        <Pricelist />
        <Contact />
      </main>

      <Footer />
    </div>
  );
}