import { motion } from "framer-motion";
import { Github, Twitter, Linkedin } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="py-12 border-t border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold gradient-text">Auto Dev</span>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">প্রাইভেসি</a>
            <a href="#" className="hover:text-foreground transition-colors">টার্মস</a>
            <a href="#" className="hover:text-foreground transition-colors">যোগাযোগ</a>
          </div>

          <div className="flex items-center gap-4">
            <motion.a 
              href="#" 
              whileHover={{ scale: 1.1 }}
              className="p-2 rounded-xl glass-card text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="w-5 h-5" />
            </motion.a>
            <motion.a 
              href="#" 
              whileHover={{ scale: 1.1 }}
              className="p-2 rounded-xl glass-card text-muted-foreground hover:text-foreground transition-colors"
            >
              <Twitter className="w-5 h-5" />
            </motion.a>
            <motion.a 
              href="#" 
              whileHover={{ scale: 1.1 }}
              className="p-2 rounded-xl glass-card text-muted-foreground hover:text-foreground transition-colors"
            >
              <Linkedin className="w-5 h-5" />
            </motion.a>
          </div>
        </div>
        
        <div className="mt-8 text-center text-sm text-muted-foreground">
          © 2026 Auto Dev. সর্বস্বত্ব সংরক্ষিত।
        </div>
      </div>
    </footer>
  );
};
