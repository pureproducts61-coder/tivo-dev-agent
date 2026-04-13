import { useState } from 'react';
import { Zap, Hammer, Globe, History, Plus, Trash2, MessageSquare, Menu, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

  // When "history" tab is active, show sessions list expanded
  const showHistoryExpanded = activeTab === 'history';

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Nav Items */}
      <div className="p-2 space-y-0.5">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onTabChange(item.id);
              setMobileOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === item.id
                ? 'bg-primary/15 text-primary shadow-sm shadow-primary/5'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
            {item.id === 'history' && !collapsed && sessions.length > 0 && (
              <span className="ml-auto text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                {sessions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Chat Sessions - show when history is active OR always in sidebar */}
      {!collapsed && (
        <div className="flex-1 flex flex-col min-h-0 border-t border-border/50 mt-2 pt-2">
          <div className="flex items-center justify-between px-3 pb-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              সাম্প্রতিক চ্যাট
            </span>
            <button
              onClick={onNewSession}
              className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
              title="নতুন চ্যাট"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-1.5 space-y-0.5 scrollbar-hide">
            <AnimatePresence>
              {sessions.map((s) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className={`group flex items-center gap-2 px-2.5 py-2 rounded-xl text-sm cursor-pointer transition-all ${
                    activeSessionId === s.id
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                  onClick={() => {
                    onSessionSelect(s.id);
                    onTabChange('history');
                    setMobileOpen(false);
                  }}
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="truncate block text-xs font-medium">{s.title}</span>
                    <span className="text-[9px] text-muted-foreground/60">
                      {new Date(s.updated_at).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(s.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all rounded-lg hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {sessions.length === 0 && (
              <div className="text-center py-6 space-y-2">
                <MessageSquare className="w-6 h-6 text-muted-foreground/30 mx-auto" />
                <p className="text-[11px] text-muted-foreground/60">কোনো চ্যাট হিস্ট্রি নেই</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-[60] p-2 rounded-xl glass-card border border-border/50"
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-[260px] z-[60] glass-card border-r border-border/50 md:hidden"
            >
              <div className="flex items-center justify-between p-3 border-b border-border/50">
                <span className="font-bold text-sm gradient-text">TIVO DEV</span>
                <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-muted/50">
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
        className={`hidden md:flex flex-col border-r border-border/50 bg-sidebar/50 transition-all duration-300 ${
          collapsed ? 'w-14' : 'w-[230px]'
        }`}
      >
        <div className="flex items-center justify-between p-2 border-b border-border/50">
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
