import { Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface AutomationViewProps {
  logs: string[];
}

export const AutomationView = ({ logs }: AutomationViewProps) => {
  if (logs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center px-4">
        <div className="space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto">
            <Zap className="w-8 h-8 text-secondary" />
          </div>
          <p className="text-muted-foreground text-sm">
            অটোমেশন লগ এখানে দেখা যাবে। ব্যাকেন্ড সংযোগ করুন এবং অটোমেশন শুরু করুন।
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-hide">
      {logs.map((log, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.02 }}
          className="font-mono text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2"
        >
          {log}
        </motion.div>
      ))}
    </div>
  );
};
