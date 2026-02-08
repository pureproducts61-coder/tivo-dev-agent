import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { 
  Bot, 
  GitBranch, 
  Cloud, 
  Cog, 
  Layers, 
  Shield,
  Rocket,
  Code2
} from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "AI-Powered বিল্ড",
    description: "প্রম্পট দিন, প্রজেক্ট পান। AI সম্পূর্ণ কোড লিখবে।",
    gradient: "from-primary to-secondary",
  },
  {
    icon: Cog,
    title: "সম্পূর্ণ অটোমেশন",
    description: "মেইন্টেন্যান্স, আপডেট, স্কেলিং — সব অটোমেটিক।",
    gradient: "from-secondary to-accent",
  },
  {
    icon: Cloud,
    title: "HF Spaces ডিপ্লয়",
    description: "এক ক্লিকে Hugging Face Spaces-এ পাবলিশ করুন।",
    gradient: "from-accent to-primary",
  },
  {
    icon: GitBranch,
    title: "GitHub ইন্টিগ্রেশন",
    description: "অটোমেটিক GitHub পুশ ও ভার্সন কন্ট্রোল।",
    gradient: "from-primary to-accent",
  },
  {
    icon: Layers,
    title: "ফুলস্ট্যাক সাপোর্ট",
    description: "ফ্রন্টেন্ড থেকে ব্যাকেন্ড — সবকিছু হ্যান্ডেল করে।",
    gradient: "from-secondary to-primary",
  },
  {
    icon: Shield,
    title: "এন্টারপ্রাইজ সিকিউরিটি",
    description: "আপনার কোড ও ডেটা সুরক্ষিত থাকে।",
    gradient: "from-accent to-secondary",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export const Features = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 mesh-bg opacity-50" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full mb-6">
            <Rocket className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">ফিচারসমূহ</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            সব কিছু <span className="gradient-text">এক প্ল্যাটফর্মে</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            আইডিয়া থেকে প্রোডাকশন — সম্পূর্ণ অটোমেটেড ওয়ার্কফ্লো
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <GlassCard className="h-full" delay={index * 0.1}>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
