import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BrandLogo } from './BrandLogo';
import { Sparkles, TrendingUp, Zap } from 'lucide-react';

const tips = [
  '💡 "Push to GitHub" বলে সরাসরি কোড পুশ করুন।',
  '🚀 Vercel ডিপ্লয় অটোমেশনে সেটআপ করুন।',
  '⚡ Build মোডে ফাইল তৈরি ও এডিট করতে পারবেন।',
  '🔄 Automation মোডে GitHub Actions ট্রিগার করুন।',
  '🛡️ Settings থেকে আপনার API টোকেন সিকিউরভাবে সেট করুন।',
];

export const CentralCard = () => {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % tips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md"
      >
        {/* Animated glow border */}
        <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-primary via-secondary to-primary animate-gradient opacity-60 blur-sm" />
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-primary via-secondary to-primary animate-gradient opacity-40" />

        {/* Card content */}
        <div className="relative glass-card rounded-2xl p-6 space-y-5 bg-card/95">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <BrandLogo size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold gradient-text">TIVO DEV AGENT</h2>
              <p className="text-xs text-muted-foreground">Autonomous AI SaaS Platform</p>
            </div>
          </div>

          {/* Daily Report */}
          <div className="glass-card rounded-xl p-4 space-y-2 bg-primary/5 border-primary/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">আজকের সাজেশন</span>
            </div>
            <motion.p
              key={tipIndex}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-sm text-muted-foreground"
            >
              {tips[tipIndex]}
            </motion.p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card rounded-lg p-3 text-center space-y-1">
              <TrendingUp className="w-4 h-4 text-primary mx-auto" />
              <p className="text-lg font-bold text-foreground">∞</p>
              <p className="text-[10px] text-muted-foreground">AI ক্ষমতা</p>
            </div>
            <div className="glass-card rounded-lg p-3 text-center space-y-1">
              <Zap className="w-4 h-4 text-secondary mx-auto" />
              <p className="text-lg font-bold text-foreground">24/7</p>
              <p className="text-[10px] text-muted-foreground">সবসময় সচল</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
