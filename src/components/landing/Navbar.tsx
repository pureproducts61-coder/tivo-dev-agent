import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 px-4 py-4"
    >
      <div className="container mx-auto">
        <div className="glass-card rounded-2xl px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold gradient-text">Auto Dev</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              ফিচারস
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              প্রাইসিং
            </a>
            <a href="#docs" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              ডকস
            </a>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" className="rounded-xl">
              লগইন
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground rounded-xl">
              সাইন আপ
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden glass-card rounded-2xl mt-2 p-4"
          >
            <div className="flex flex-col gap-3">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium py-2">
                ফিচারস
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium py-2">
                প্রাইসিং
              </a>
              <a href="#docs" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium py-2">
                ডকস
              </a>
              <hr className="border-border/50" />
              <Button variant="ghost" size="sm" className="justify-start rounded-xl">
                লগইন
              </Button>
              <Button size="sm" className="bg-primary text-primary-foreground rounded-xl">
                সাইন আপ
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
};
