import { useState, useEffect, useCallback } from 'react';
import { Bell, X, CheckCircle2, AlertTriangle, Info, Server, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useBackendApi } from '@/hooks/useBackendApi';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Notification {
  id: string;
  type: 'build' | 'deploy' | 'connection' | 'activity' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

const typeIcons = {
  build: CheckCircle2,
  deploy: Server,
  connection: AlertTriangle,
  activity: Info,
  info: Info,
};

const typeColors = {
  build: 'text-primary',
  deploy: 'text-accent',
  connection: 'text-destructive',
  activity: 'text-muted-foreground',
  info: 'text-muted-foreground',
};

export const NotificationBell = () => {
  const { isConnected, getLogs, status } = useBackendApi();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Add connection status notification
  useEffect(() => {
    const connNotif: Notification = {
      id: 'conn-status',
      type: 'connection',
      title: status === 'connected' ? 'ব্যাকেন্ড সংযুক্ত' : status === 'sleeping' ? 'ব্যাকেন্ড ঘুমাচ্ছে' : 'ব্যাকেন্ড সংযোগ বিচ্ছিন্ন',
      message: status === 'connected' ? 'HF Space ব্যাকেন্ড সক্রিয় আছে।'
        : status === 'sleeping' ? 'HF Space ঘুমিয়ে আছে। কল করলে জেগে উঠবে।'
        : 'ব্যাকেন্ড সংযোগ করা যায়নি। লোকাল মোডে চলছে।',
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => {
      const filtered = prev.filter(n => n.id !== 'conn-status');
      return [connNotif, ...filtered];
    });
  }, [status]);

  const fetchLogs = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const data = await getLogs(20);
      if (Array.isArray(data?.logs)) {
        const logNotifs: Notification[] = data.logs.map((log: any, i: number) => ({
          id: `log-${log.id || i}`,
          type: log.type || 'info',
          title: log.action || log.title || 'Activity',
          message: log.message || log.details || '',
          timestamp: log.timestamp || new Date().toISOString(),
          read: false,
        }));
        setNotifications(prev => {
          const connNotifs = prev.filter(n => n.id === 'conn-status');
          return [...connNotifs, ...logNotifs];
        });
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [isConnected, getLogs]);

  useEffect(() => {
    if (open && isConnected) fetchLogs();
  }, [open, isConnected, fetchLogs]);

  // Poll every 30s if connected
  useEffect(() => {
    if (!isConnected) return;
    const iv = setInterval(fetchLogs, 30000);
    return () => clearInterval(iv);
  }, [isConnected, fetchLogs]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications(prev => prev.filter(n => n.id === 'conn-status'));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-lg">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 glass-card border-border">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-xs font-semibold text-foreground">নোটিফিকেশন</span>
          <div className="flex gap-1">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={markAllRead}>সব পড়া হয়েছে</Button>
            <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={clearAll}>মুছুন</Button>
          </div>
        </div>
        <ScrollArea className="max-h-72">
          {notifications.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">কোনো নোটিফিকেশন নেই</p>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map(n => {
                const Icon = typeIcons[n.type] || Info;
                return (
                  <div key={n.id} className={`px-3 py-2 flex gap-2 ${n.read ? 'opacity-60' : ''}`}>
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${typeColors[n.type]}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{n.title}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2">{n.message}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        {new Date(n.timestamp).toLocaleTimeString('bn-BD')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
