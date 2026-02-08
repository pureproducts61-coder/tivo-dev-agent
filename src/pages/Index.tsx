import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { EditorPreview } from "@/components/landing/EditorPreview";
import { ProjectShowcase } from "@/components/landing/ProjectShowcase";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Features />
      <EditorPreview />
      <ProjectShowcase />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
