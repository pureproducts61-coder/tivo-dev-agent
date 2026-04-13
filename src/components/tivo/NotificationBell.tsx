import { useState, useEffect, useCallback } from 'react';
import { Bell, X, CheckCircle2, AlertTriangle, Info, Server, Loader2, Users, Database, Key, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useBackendApi } from '@/hooks/useBackendApi';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: string;
  type: 'build' | 'deploy' | 'connection' | 'activity' | 'info' | 'user' | 'api' | 'project' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

const typeIcons: Record<string, any> = {
  build: Code2,
  deploy: Server,
  connection: AlertTriangle,
  activity: Users,
  info: Info,
  user: Users,
  api: Key,
  project: CheckCircle2,
  system: Database,
};

const typeColors: Record<string, string> = {
  build: 'text-emerald-400',
  deploy: 'text-blue-400',
  connection: 'text-amber-400',
  activity: 'text-purple-400',
  info: 'text-muted-foreground',
  user: 'text-cyan-400',
  api: 'text-orange-400',
  project: 'text-primary',
  system: 'text-rose-400',
};

export const NotificationBell = () => {
  const { isConnected, getLogs, status } = useBackendApi();
  const { isAdmin } = useAdmin();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Connection status notification
  useEffect(() => {
    const connNotif: Notification = {
      id: 'conn-status',
      type: 'connection',
      title: status === 'connected' ? 'ব্যাকেন্ড সংযুক্ত' : status === 'sleeping' ? 'ব্যাকেন্ড ঘুমাচ্ছে' : 'লোকাল মোড',
      message: status === 'connected' ? 'HF Space ব্যাকেন্ড সক্রিয়।'
        : status === 'sleeping' ? 'HF Space ঘুমিয়ে আছে, জেগে উঠবে।'
        : 'ব্যাকেন্ড ছাড়া চলছে।',
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => {
      const filtered = prev.filter(n => n.id !== 'conn-status');
      return [connNotif, ...filtered];
    });
  }, [status]);

  // Fetch user-specific project notifications
  const fetchUserNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, status, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (projects?.length) {
        const projectNotifs: Notification[] = projects.map(p => ({
          id: `proj-${p.id}`,
          type: 'project' as const,
          title: p.name,
          message: `স্ট্যাটাস: ${p.status}`,
          timestamp: p.updated_at,
          read: false,
        }));
        setNotifications(prev => {
          const nonProject = prev.filter(n => !n.id.startsWith('proj-'));
          return [...nonProject, ...projectNotifs];
        });
      }
    } catch {}
  }, [user]);

  // Admin: fetch system-wide logs
  const fetchAdminNotifications = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      // Fetch system logs from backend
      if (isConnected) {
        const data = await getLogs(15);
        if (Array.isArray(data?.logs)) {
          const logNotifs: Notification[] = data.logs.map((log: any, i: number) => ({
            id: `log-${log.id || i}`,
            type: log.type || 'system',
            title: log.action || log.title || 'System Activity',
            message: log.message || log.details || '',
            timestamp: log.timestamp || new Date().toISOString(),
            read: false,
          }));
          setNotifications(prev => {
            const kept = prev.filter(n => n.id === 'conn-status' || n.id.startsWith('proj-'));
            return [...kept, ...logNotifs];
          });
        }
      }

      // Fetch recent user activity for admin
      const { data: recentUsers } = await supabase
        .from('user_credits')
        .select('user_id, plan, used_today, updated_at')
        .order('updated_at', { ascending: false })
        .limit(5);

      if (recentUsers?.length) {
        const userNotifs: Notification[] = recentUsers.map((u, i) => ({
          id: `user-${u.user_id}-${i}`,
          type: 'user' as const,
          title: `ইউজার ${u.user_id.slice(0, 8)}...`,
          message: `প্ল্যান: ${u.plan} | আজ ব্যবহার: ${u.used_today}`,
          timestamp: u.updated_at,
          read: false,
        }));
        setNotifications(prev => {
          const kept = prev.filter(n => !n.id.startsWith('user-'));
          return [...kept, ...userNotifs];
        });
      }

      // Fetch pending payments
      const { data: pendingPayments } = await supabase
        .from('payment_requests')
        .select('id, plan, amount, created_at')
        .eq('status', 'pending')
        .limit(3);

      if (pendingPayments?.length) {
        const payNotifs: Notification[] = pendingPayments.map(p => ({
          id: `pay-${p.id}`,
          type: 'api' as const,
          title: `পেমেন্ট অনুরোধ: ${p.plan}`,
          message: `${p.amount}৳ - অনুমোদনের অপেক্ষায়`,
          timestamp: p.created_at,
          read: false,
        }));
        setNotifications(prev => {
          const kept = prev.filter(n => !n.id.startsWith('pay-'));
          return [...kept, ...payNotifs];
        });
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [isAdmin, isConnected, getLogs]);

  useEffect(() => {
    if (open) {
      if (isAdmin) fetchAdminNotifications();
      else fetchUserNotifications();
    }
  }, [open, isAdmin, fetchAdminNotifications, fetchUserNotifications]);

  // Poll
  useEffect(() => {
    const iv = setInterval(() => {
      if (isAdmin) fetchAdminNotifications();
      else fetchUserNotifications();
    }, 45000);
    return () => clearInterval(iv);
  }, [isAdmin, fetchAdminNotifications, fetchUserNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const clearAll = () => setNotifications(prev => prev.filter(n => n.id === 'conn-status'));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-muted/50">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-primary/30"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0 glass-card border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {isAdmin ? 'সিস্টেম নোটিফিকেশন' : 'নোটিফিকেশন'}
            </span>
          </div>
          <div className="flex gap-1">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            <Button variant="ghost" size="sm" className="h-7 text-[11px] rounded-lg" onClick={markAllRead}>পড়া হয়েছে</Button>
            <Button variant="ghost" size="sm" className="h-7 text-[11px] rounded-lg" onClick={clearAll}>মুছুন</Button>
          </div>
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">কোনো নোটিফিকেশন নেই</p>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map(n => {
                const Icon = typeIcons[n.type] || Info;
                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`px-4 py-3 flex gap-3 hover:bg-muted/30 transition-colors ${n.read ? 'opacity-50' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      n.read ? 'bg-muted/30' : 'bg-primary/10'
                    }`}>
                      <Icon className={`w-4 h-4 ${typeColors[n.type]}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {new Date(n.timestamp).toLocaleString('bn-BD', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
