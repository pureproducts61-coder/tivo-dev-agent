import { useState } from 'react';
import { ExternalLink, MoreVertical, Rocket, Pencil, History, Globe } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface BuildProject {
  id: string;
  name: string;
  previewUrl?: string;
  status: string;
}

interface BuildViewProps {
  projects: BuildProject[];
}

export const BuildView = ({ projects }: BuildViewProps) => {
  if (projects.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center px-4">
        <div className="space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Rocket className="w-8 h-8 text-primary" />
          </div>
          <p className="text-muted-foreground text-sm">
            কোনো বিল্ড প্রজেক্ট নেই। নিচে প্রম্পট দিয়ে নতুন প্রজেক্ট তৈরি করুন।
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-hide">
      {projects.map((p, i) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass-card rounded-xl p-4 flex items-center justify-between"
        >
          <div>
            <h3 className="font-semibold text-foreground">{p.name}</h3>
            <span className="text-xs text-muted-foreground">{p.status}</span>
          </div>
          <div className="flex items-center gap-2">
            {p.previewUrl && (
              <Button size="sm" variant="ghost" className="gap-1 text-xs" asChild>
                <a href={p.previewUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5" /> প্রিভিউ
                </a>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-card border-border">
                <DropdownMenuItem className="gap-2"><Globe className="w-3.5 h-3.5" /> পাবলিশ</DropdownMenuItem>
                <DropdownMenuItem className="gap-2"><Pencil className="w-3.5 h-3.5" /> এডিট</DropdownMenuItem>
                <DropdownMenuItem className="gap-2"><Rocket className="w-3.5 h-3.5" /> ডিপ্লয়</DropdownMenuItem>
                <DropdownMenuItem className="gap-2"><History className="w-3.5 h-3.5" /> হিস্ট্রি</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
