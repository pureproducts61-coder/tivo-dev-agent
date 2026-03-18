import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Settings2, Users, CreditCard, Cpu, CheckCircle2, XCircle, Clock,
  RefreshCw, Loader2, Activity, Server, GitBranch, Globe, Zap
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AdminDashboardProps {
  open: boolean;
  onClose: () => void;
}

interface SystemStatus {
  tokens: Record<string, boolean>;
  infrastructure: {
    frontend: { repo: string; deployment: string; platform: string };
    backend: { repo: string; space: string; platform: string; status: string };
  };
  stats: { totalUsers: number; pendingPayments: number };
  availableCapabilities: string[];
}

export const AdminDashboard = ({ open, onClose }: AdminDashboardProps) => {
  const { user, session } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // API Management state
  const [apiKeys, setApiKeys] = useState({
    gemini: '', groq: '', deepseek: '', hf_inference: '', tavily: '',
  });

  useEffect(() => {
    if (open) {
      fetchPayments();
      fetchUsers();
      fetchSystemStatus();
      const stored = localStorage.getItem('tivo_admin_api_keys');
      if (stored) setApiKeys(JSON.parse(stored));
    }
  }, [open]);

  const fetchPayments = async () => {
    setLoadingPayments(true);
    const { data } = await supabase.from('payment_requests').select('*').order('created_at', { ascending: false });
    setPayments(data || []);
    setLoadingPayments(false);
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data } = await supabase.from('user_credits').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
    setLoadingUsers(false);
  };

  const fetchSystemStatus = async () => {
    if (!session?.access_token) return;
    setLoadingStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke('system-status', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (data && !error) setSystemStatus(data);
    } catch (e) {
      console.error('Failed to fetch system status:', e);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handlePaymentAction = async (paymentId: string, action: 'approved' | 'rejected') => {
    const { error } = await supabase.from('payment_requests')
      .update({ status: action, reviewed_by: user?.id, updated_at: new Date().toISOString() } as any)
      .eq('id', paymentId);

    if (!error) {
      if (action === 'approved') {
        const payment = payments.find(p => p.id === paymentId);
        if (payment) {
          const plan = payment.plan;
          const dailyCredits = plan === 'pro' ? 9999 : 50;
          const monthlyCredits = plan === 'pro' ? 99999 : 1000;
          await supabase.from('user_credits')
            .update({ plan, daily_credits: dailyCredits, monthly_credits: monthlyCredits, payment_status: 'paid' } as any)
            .eq('user_id', payment.user_id);
        }
      }
      toast({ title: action === 'approved' ? '✅ অনুমোদিত' : '❌ প্রত্যাখ্যাত' });
      fetchPayments();
      fetchUsers();
    }
  };

  const updateUserCredits = async (userId: string, field: string, value: number) => {
    const { error } = await supabase.from('user_credits')
      .update({ [field]: value, updated_at: new Date().toISOString() } as any)
      .eq('user_id', userId);
    if (!error) {
      toast({ title: '✅ আপডেট হয়েছে' });
      fetchUsers();
    }
  };

  const saveApiKeys = () => {
    localStorage.setItem('tivo_admin_api_keys', JSON.stringify(apiKeys));
    toast({ title: '✅ API Keys সেভ হয়েছে' });
  };

  const statusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle2 className="w-4 h-4 text-primary" />;
    if (status === 'rejected') return <XCircle className="w-4 h-4 text-destructive" />;
    return <Clock className="w-4 h-4 text-accent" />;
  };

  const tokenStatusBadge = (configured: boolean) => (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
      configured ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'
    }`}>
      {configured ? '✅ Active' : '❌ Missing'}
    </span>
  );

  const backendStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      connected: 'bg-primary/20 text-primary',
      error: 'bg-destructive/20 text-destructive',
      unreachable: 'bg-accent/20 text-accent',
      not_configured: 'bg-muted text-muted-foreground',
    };
    const labels: Record<string, string> = {
      connected: '🟢 Connected',
      error: '🔴 Error',
      unreachable: '🟡 Unreachable',
      not_configured: '⚪ Not Configured',
    };
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${styles[status] || styles.not_configured}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-card border-border sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" /> অ্যাডমিন ড্যাশবোর্ড
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="system" className="w-full">
          <TabsList className="w-full grid grid-cols-4 bg-muted/30">
            <TabsTrigger value="system" className="gap-1 text-[10px] sm:text-xs">
              <Activity className="w-3.5 h-3.5" /> সিস্টেম
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-1 text-[10px] sm:text-xs">
              <CreditCard className="w-3.5 h-3.5" /> পেমেন্ট
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1 text-[10px] sm:text-xs">
              <Users className="w-3.5 h-3.5" /> ইউজার
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-1 text-[10px] sm:text-xs">
              <Cpu className="w-3.5 h-3.5" /> API
            </TabsTrigger>
          </TabsList>

          {/* System Autonomy Tab */}
          <TabsContent value="system" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">সিস্টেম স্ট্যাটাস ও অটোনমি</h3>
              <Button size="sm" variant="ghost" onClick={fetchSystemStatus} className="gap-1 text-xs">
                <RefreshCw className="w-3.5 h-3.5" /> রিফ্রেশ
              </Button>
            </div>

            {loadingStatus ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : systemStatus ? (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-card rounded-xl p-3 text-center space-y-1">
                    <Users className="w-4 h-4 text-primary mx-auto" />
                    <p className="text-lg font-bold text-foreground">{systemStatus.stats.totalUsers}</p>
                    <p className="text-[10px] text-muted-foreground">মোট ইউজার</p>
                  </div>
                  <div className="glass-card rounded-xl p-3 text-center space-y-1">
                    <CreditCard className="w-4 h-4 text-accent mx-auto" />
                    <p className="text-lg font-bold text-foreground">{systemStatus.stats.pendingPayments}</p>
                    <p className="text-[10px] text-muted-foreground">পেন্ডিং পেমেন্ট</p>
                  </div>
                </div>

                {/* Token Status */}
                <div className="glass-card rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-primary" /> টোকেন স্ট্যাটাস
                  </h4>
                  <div className="space-y-1.5">
                    {Object.entries(systemStatus.tokens).map(([name, configured]) => (
                      <div key={name} className="flex items-center justify-between">
                        <span className="text-xs font-mono text-muted-foreground">{name}</span>
                        {tokenStatusBadge(configured)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Infrastructure */}
                <div className="glass-card rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-primary" /> ইনফ্রাস্ট্রাকচার
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Frontend</span>
                      </div>
                      <span className="text-[10px] font-mono text-foreground">{systemStatus.infrastructure.frontend.deployment}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <GitBranch className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Frontend Repo</span>
                      </div>
                      <span className="text-[10px] font-mono text-foreground">{systemStatus.infrastructure.frontend.repo.split('/')[1]}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Server className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Backend</span>
                      </div>
                      {backendStatusBadge(systemStatus.infrastructure.backend.status)}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <GitBranch className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Backend Repo</span>
                      </div>
                      <span className="text-[10px] font-mono text-foreground">{systemStatus.infrastructure.backend.repo.split('/')[1]}</span>
                    </div>
                  </div>
                </div>

                {/* Update Proposals placeholder */}
                <div className="glass-card rounded-xl p-4 space-y-2 border-primary/10">
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-primary" /> আপডেট প্রোপোজাল
                  </h4>
                  <p className="text-xs text-muted-foreground text-center py-4">
                    কোনো পেন্ডিং আপডেট প্রোপোজাল নেই। AI চ্যাটে আপডেট সাজেস্ট করবে।
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">স্ট্যাটাস লোড করা যায়নি। রিফ্রেশ করুন।</p>
            )}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">পেমেন্ট রিকোয়েস্ট</h3>
              <Button size="sm" variant="ghost" onClick={fetchPayments} className="gap-1 text-xs">
                <RefreshCw className="w-3.5 h-3.5" /> রিফ্রেশ
              </Button>
            </div>
            {loadingPayments ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : payments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">কোনো পেমেন্ট রিকোয়েস্ট নেই</p>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="glass-card rounded-lg p-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {statusIcon(p.status)}
                        <span className="text-xs font-mono text-foreground truncate">{p.transaction_id}</span>
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{p.method}</span>
                        <span>{p.amount}৳</span>
                        <span>{p.plan}</span>
                      </div>
                    </div>
                    {p.status === 'pending' && (
                      <div className="flex gap-1.5 shrink-0">
                        <Button size="sm" className="h-7 text-xs" onClick={() => handlePaymentAction(p.id, 'approved')}>
                          অনুমোদন
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handlePaymentAction(p.id, 'rejected')}>
                          বাতিল
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">ইউজার ও ক্রেডিট</h3>
              <Button size="sm" variant="ghost" onClick={fetchUsers} className="gap-1 text-xs">
                <RefreshCw className="w-3.5 h-3.5" /> রিফ্রেশ
              </Button>
            </div>
            {loadingUsers ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="glass-card rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground truncate">{u.user_id?.slice(0, 8)}...</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        u.plan === 'pro' ? 'bg-accent/20 text-accent' :
                        u.plan === 'standard' ? 'bg-primary/20 text-primary' :
                        'bg-muted text-muted-foreground'
                      }`}>{u.plan}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">ডেইলি: </span>
                        <span className="text-foreground">{u.used_today}/{u.daily_credits}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">মান্থলি: </span>
                        <span className="text-foreground">{u.used_month}/{u.monthly_credits}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="ডেইলি"
                        defaultValue={u.daily_credits}
                        onBlur={(e) => updateUserCredits(u.user_id, 'daily_credits', parseInt(e.target.value) || 0)}
                        className="h-7 text-xs bg-muted/50 border-border"
                      />
                      <Input
                        type="number"
                        placeholder="মান্থলি"
                        defaultValue={u.monthly_credits}
                        onBlur={(e) => updateUserCredits(u.user_id, 'monthly_credits', parseInt(e.target.value) || 0)}
                        className="h-7 text-xs bg-muted/50 border-border"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* API Management Tab */}
          <TabsContent value="api" className="space-y-4 mt-4">
            <h3 className="text-sm font-semibold text-foreground">API কনফিগারেশন</h3>
            {Object.entries({
              gemini: 'Gemini API Key',
              groq: 'Groq API Key',
              deepseek: 'DeepSeek API Key',
              hf_inference: 'HF Inference Token',
              tavily: 'Tavily API Key',
            }).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <Input
                  type="password"
                  placeholder={`${label} দিন...`}
                  value={(apiKeys as any)[key]}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, [key]: e.target.value }))}
                  className="bg-muted/50 border-border text-xs font-mono"
                />
              </div>
            ))}
            <Button onClick={saveApiKeys} className="w-full gap-2">
              <Settings2 className="w-4 h-4" /> সেভ করুন
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
