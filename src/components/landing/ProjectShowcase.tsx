import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { 
  ShoppingCart, 
  MessageSquare, 
  BarChart3, 
  Image,
  ExternalLink,
  GitBranch,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";

const projects = [
  {
    icon: ShoppingCart,
    title: "E-Commerce Store",
    description: "সম্পূর্ণ অনলাইন শপ পেমেন্ট ইন্টিগ্রেশন সহ",
    status: "Deployed",
    tech: ["React", "Node.js", "Stripe"],
    gradient: "from-primary/20 to-secondary/20",
  },
  {
    icon: MessageSquare,
    title: "AI Chatbot",
    description: "GPT-পাওয়ার্ড কাস্টমার সার্ভিস বট",
    status: "Running",
    tech: ["Python", "FastAPI", "OpenAI"],
    gradient: "from-secondary/20 to-accent/20",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "রিয়েল-টাইম ডেটা ভিজুয়ালাইজেশন",
    status: "Deployed",
    tech: ["Next.js", "Prisma", "Chart.js"],
    gradient: "from-accent/20 to-primary/20",
  },
  {
    icon: Image,
    title: "Image Generator",
    description: "AI ইমেজ জেনারেশন অ্যাপ",
    status: "Building",
    tech: ["Gradio", "Diffusion", "HF"],
    gradient: "from-primary/20 to-accent/20",
  },
];

export const ProjectShowcase = () => {
  return (
    <section className="py-24 relative overflow-hidden mesh-bg">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            আপনার <span className="gradient-text">প্রজেক্টসমূহ</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            সব প্রজেক্ট এক ড্যাশবোর্ডে — মনিটর, ম্যানেজ ও অটোমেট করুন
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {projects.map((project, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <GlassCard className="h-full">
                <div className={`w-full h-32 rounded-xl bg-gradient-to-br ${project.gradient} mb-4 flex items-center justify-center`}>
                  <project.icon className="w-12 h-12 text-foreground/70" />
                </div>
                
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-1">
                      {project.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {project.description}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                    project.status === "Deployed" 
                      ? "bg-green-500/20 text-green-600" 
                      : project.status === "Running"
                      ? "bg-primary/20 text-primary"
                      : "bg-yellow-500/20 text-yellow-600"
                  }`}>
                    {project.status === "Deployed" && <Check className="w-3 h-3" />}
                    {project.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {project.tech.map((tech, i) => (
                    <span 
                      key={i}
                      className="px-2 py-1 bg-muted rounded-lg text-xs text-muted-foreground"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 rounded-xl">
                    <GitBranch className="w-4 h-4 mr-1" />
                    GitHub
                  </Button>
                  <Button size="sm" className="flex-1 rounded-xl bg-primary text-primary-foreground">
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Open
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
