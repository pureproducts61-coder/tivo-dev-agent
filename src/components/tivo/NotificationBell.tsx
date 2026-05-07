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
  type: 'build' | 'deploy' | 'connection' | 'activity' | 'info' | 'user' | 'api' | 'project' | 'system' | 'proposal';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: 'open-proposals';
}

interface NotificationBellProps {
  onOpenAdminProposals?: () => void;
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
  proposal: AlertTriangle,
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
  proposal: 'text-primary',
};

const DISMISSED_KEY = 'tivo_dismissed_notifs_v1';
const loadDismissed = (): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]')); } catch { return new Set(); }
};
const saveDismissed = (s: Set<string>) => {
  try { localStorage.setItem(DISMISSED_KEY, JSON.stringify([...s].slice(-500))); } catch {}
};

export const NotificationBell = ({ onOpenAdminProposals }: NotificationBellProps) => {
  const { isConnected, getLogs, status } = useBackendApi();
  const { isAdmin } = useAdmin();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingProposalCount, setPendingProposalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());
  const filterDismissed = useCallback((arr: Notification[]) => arr.filter(n => !dismissed.has(n.id)), [dismissed]);

  const notifyBrowser = useCallback((title: string, body: string) => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') new Notification(title, { body });
    else if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') new Notification(title, { body });
      });
    }
  }, []);

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

      const { data: pendingProposals, count } = await supabase
        .from('ai_proposals')
        .select('id, title, description, action_type, risk_level, created_at', { count: 'exact' })
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      setPendingProposalCount(count || 0);
      if (pendingProposals?.length) {
        const proposalNotifs: Notification[] = pendingProposals.map((p: any) => ({
          id: `proposal-${p.id}`,
          type: 'proposal' as const,
          title: p.title || `AI প্রস্তাব: ${p.action_type}`,
          message: `${p.risk_level || 'medium'} risk — ${p.description || 'Admin approval প্রয়োজন'}`,
          timestamp: p.created_at,
          read: false,
          action: 'open-proposals' as const,
        }));
        setNotifications(prev => {
          const kept = prev.filter(n => !n.id.startsWith('proposal-'));
          return [...proposalNotifs, ...kept];
        });
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [isAdmin, isConnected, getLogs]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchAdminNotifications();
    const channel = supabase
      .channel('notification_ai_proposals')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_proposals' }, (payload) => {
        const p: any = payload.new;
        if (p?.status === 'pending') {
          setPendingProposalCount(c => c + 1);
          setNotifications(prev => [{
            id: `proposal-${p.id}`,
            type: 'proposal',
            title: p.title || `AI প্রস্তাব: ${p.action_type}`,
            message: p.description || 'Admin approval প্রয়োজন',
            timestamp: p.created_at || new Date().toISOString(),
            read: false,
            action: 'open-proposals',
          }, ...prev.filter(n => n.id !== `proposal-${p.id}`)]);
          notifyBrowser('নতুন AI প্রপোজাল', p.title || p.action_type || 'Approval প্রয়োজন');
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ai_proposals' }, (payload) => {
        const p: any = payload.new;
        const old: any = payload.old;
        if (old?.status === 'pending' && p?.status !== 'pending') {
          setPendingProposalCount(c => Math.max(0, c - 1));
          setNotifications(prev => prev.filter(n => n.id !== `proposal-${p.id}`));
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'ai_proposals' }, (payload) => {
        const old: any = payload.old;
        if (old?.status === 'pending') setPendingProposalCount(c => Math.max(0, c - 1));
        setNotifications(prev => prev.filter(n => n.id !== `proposal-${old?.id}`));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin, fetchAdminNotifications, notifyBrowser]);

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

  const unreadCount = isAdmin && pendingProposalCount > 0 ? pendingProposalCount : notifications.filter(n => !n.read).length;
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
                    className={`px-4 py-3 flex gap-3 hover:bg-muted/30 transition-colors ${n.action ? 'cursor-pointer' : ''} ${n.read ? 'opacity-50' : ''}`}
                    onClick={() => {
                      if (n.action === 'open-proposals') {
                        setOpen(false);
                        onOpenAdminProposals?.();
                      }
                    }}
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
