import { useState, useEffect } from 'react';
import { Zap, Hammer, Globe, History, Plus, Trash2, MessageSquare, Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface ChatSession {
  id: string;
  title: string;
  updated_at: string;
}

const navItems = [
  { label: 'অটোমেটেড', icon: Zap, id: 'automated' },
  { label: 'বিল্ট', icon: Hammer, id: 'built' },
  { label: 'পাবলিশড', icon: Globe, id: 'published' },
  { label: 'চ্যাট হিস্ট্রি', icon: History, id: 'history' },
];

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  activeSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  sessions: ChatSession[];
  onDeleteSession: (id: string) => void;
}

export const AppSidebar = ({
  activeTab,
  onTabChange,
  activeSessionId,
  onSessionSelect,
  onNewSession,
  sessions,
  onDeleteSession,
}: AppSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Nav Items */}
      <div className="p-2 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onTabChange(item.id);
              setMobileOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === item.id
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </div>

      {/* Chat Sessions */}
      {!collapsed && (
        <div className="flex-1 flex flex-col min-h-0 border-t border-border mt-2 pt-2">
          <div className="flex items-center justify-between px-3 pb-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">সেশনস</span>
            <button
              onClick={onNewSession}
              className="p-1 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-primary transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 space-y-0.5 scrollbar-hide">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm cursor-pointer transition-all ${
                  activeSessionId === s.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
                onClick={() => {
                  onSessionSelect(s.id);
                  setMobileOpen(false);
                }}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate flex-1 text-xs">{s.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(s.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">কোনো সেশন নেই</p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-[60] p-2 rounded-xl glass-card border border-border"
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[55] md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-[260px] z-[60] glass-card border-r border-border md:hidden"
            >
              <div className="flex items-center justify-between p-3 border-b border-border">
                <span className="font-bold text-sm gradient-text">TIVO DEV</span>
                <button onClick={() => setMobileOpen(false)} className="p-1 rounded-lg hover:bg-muted/50">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-border bg-sidebar transition-all duration-300 ${
          collapsed ? 'w-14' : 'w-[220px]'
        }`}
      >
        <div className="flex items-center justify-between p-2 border-b border-border">
          {!collapsed && <span className="font-bold text-sm gradient-text pl-1">TIVO DEV</span>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground mx-auto"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
        {sidebarContent}
      </aside>
    </>
  );
};
