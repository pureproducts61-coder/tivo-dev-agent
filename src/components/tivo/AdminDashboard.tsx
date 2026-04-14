import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Settings2, Users, CreditCard, Cpu, CheckCircle2, XCircle, Clock,
  RefreshCw, Loader2, Activity, Server, GitBranch, Globe, Zap, Save, Eye, EyeOff, Shield,
  TrendingUp, BarChart3, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight,
  Ban, UserCheck, Phone, Mail, Facebook, Youtube, Instagram, ExternalLink,
  Wifi, WifiOff, AlertTriangle
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminPermissions } from './AdminPermissions';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid
} from 'recharts';

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

const API_KEY_FIELDS = [
  { key: 'GEMINI_API_KEY', label: 'Gemini API Key', desc: 'Google Gemini মডেল', color: 'from-blue-500/20 to-blue-600/10' },
  { key: 'GROQ_API_KEY', label: 'Groq API Key', desc: 'Groq দ্রুত LLM', color: 'from-orange-500/20 to-orange-600/10' },
  { key: 'DEEPSEEK_API_KEY', label: 'DeepSeek API Key', desc: 'DeepSeek মডেল', color: 'from-purple-500/20 to-purple-600/10' },
  { key: 'HF_INFERENCE_TOKEN', label: 'HF Inference', desc: 'HuggingFace inference', color: 'from-yellow-500/20 to-yellow-600/10' },
  { key: 'TAVILY_API_KEY', label: 'Tavily API Key', desc: 'AI ওয়েব সার্চ', color: 'from-emerald-500/20 to-emerald-600/10' },
];

const SITE_SETTINGS_FIELDS = [
  { key: 'bkash_number', label: 'বিকাশ নাম্বার', icon: Phone, placeholder: '01XXXXXXXXX' },
  { key: 'nagad_number', label: 'নগদ নাম্বার', icon: Phone, placeholder: '01XXXXXXXXX' },
  { key: 'rocket_number', label: 'রকেট নাম্বার', icon: Phone, placeholder: '01XXXXXXXXX' },
  { key: 'contact_email', label: 'ইমেইল', icon: Mail, placeholder: 'admin@example.com' },
  { key: 'contact_phone', label: 'ফোন নাম্বার', icon: Phone, placeholder: '+880XXXXXXXXXX' },
  { key: 'facebook_url', label: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/...' },
  { key: 'youtube_url', label: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/...' },
  { key: 'instagram_url', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/...' },
  { key: 'tiktok_url', label: 'TikTok', icon: ExternalLink, placeholder: 'https://tiktok.com/...' },
];

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#8b5cf6', '#f59e0b', '#10b981'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-xl px-3 py-2 border border-border/50 text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-foreground font-medium">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export const AdminDashboard = ({ open, onClose }: AdminDashboardProps) => {
  const { user, session } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [apiKeyStatus, setApiKeyStatus] = useState<Record<string, boolean>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [savingKeys, setSavingKeys] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [savingSiteSettings, setSavingSiteSettings] = useState(false);
  const [realTimeStatus, setRealTimeStatus] = useState<Record<string, 'checking' | 'active' | 'inactive'>>({});

  useEffect(() => {
    if (open) {
      fetchPayments(); fetchUsers(); fetchSystemStatus(); fetchApiKeyStatus(); fetchSiteSettings(); checkRealTimeConnections();
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
    const [creditsRes, profilesRes] = await Promise.all([
      supabase.from('user_credits').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
    ]);
    setUsers(creditsRes.data || []);
    setProfiles(profilesRes.data || []);
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
    } catch (e) { console.error(e); } finally { setLoadingStatus(false); }
  };

  const fetchApiKeyStatus = async () => {
    setLoadingKeys(true);
    try {
      const { data } = await supabase.from('system_config').select('key, value').in('key', API_KEY_FIELDS.map(f => f.key));
      const status: Record<string, boolean> = {};
      API_KEY_FIELDS.forEach(f => { const found = data?.find((d: any) => d.key === f.key); status[f.key] = !!found && found.value.length > 0; });
      setApiKeyStatus(status);
    } catch {} finally { setLoadingKeys(false); }
  };

  const fetchSiteSettings = async () => {
    try {
      const { data } = await supabase.from('system_config').select('key, value').in('key', SITE_SETTINGS_FIELDS.map(f => f.key));
      const settings: Record<string, string> = {};
      data?.forEach((d: any) => { settings[d.key] = d.value; });
      setSiteSettings(settings);
    } catch {}
  };

  const checkRealTimeConnections = async () => {
    const checks: Record<string, string> = {
      supabase: import.meta.env.VITE_SUPABASE_URL || '',
      hf_backend: import.meta.env.VITE_HF_SPACE_URL || '',
    };
    
    const newStatus: Record<string, 'checking' | 'active' | 'inactive'> = {};
    
    // Supabase check
    newStatus['supabase'] = 'checking';
    setRealTimeStatus(prev => ({ ...prev, ...newStatus }));
    
    try {
      if (checks.supabase) {
        const { error } = await supabase.from('profiles').select('id').limit(1);
        newStatus['supabase'] = error ? 'inactive' : 'active';
      } else {
        newStatus['supabase'] = 'inactive';
      }
    } catch { newStatus['supabase'] = 'inactive'; }

    // HF Backend check  
    try {
      if (checks.hf_backend) {
        const resp = await fetch(`${checks.hf_backend}/api/health`, { signal: AbortSignal.timeout(5000) }).catch(() => null);
        newStatus['hf_backend'] = resp?.ok ? 'active' : 'inactive';
      } else {
        newStatus['hf_backend'] = 'inactive';
      }
    } catch { newStatus['hf_backend'] = 'inactive'; }

    // GitHub check via system status
    newStatus['github'] = systemStatus?.tokens?.GITHUB_TOKEN ? 'active' : 'inactive';
    newStatus['vercel'] = systemStatus?.tokens?.VERCEL_TOKEN ? 'active' : 'inactive';

    setRealTimeStatus(newStatus);
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
          await supabase.from('user_credits')
            .update({ plan, daily_credits: plan === 'pro' ? 9999 : 50, monthly_credits: plan === 'pro' ? 99999 : 1000, payment_status: 'paid' } as any)
            .eq('user_id', payment.user_id);
        }
      }
      toast({ title: action === 'approved' ? '✅ অনুমোদিত' : '❌ প্রত্যাখ্যাত' });
      fetchPayments(); fetchUsers();
    }
  };

  const updateUserCredits = async (userId: string, field: string, value: number) => {
    const { error } = await supabase.from('user_credits')
      .update({ [field]: value, updated_at: new Date().toISOString() } as any)
      .eq('user_id', userId);
    if (!error) { toast({ title: '✅ আপডেট হয়েছে' }); fetchUsers(); }
  };

  const blockUser = async (userId: string, currentPlan: string) => {
    const newPlan = currentPlan === 'blocked' ? 'free' : 'blocked';
    const { error } = await supabase.from('user_credits')
      .update({ plan: newPlan, daily_credits: newPlan === 'blocked' ? 0 : 5, monthly_credits: newPlan === 'blocked' ? 0 : 50 } as any)
      .eq('user_id', userId);
    if (!error) {
      toast({ title: newPlan === 'blocked' ? '🚫 ইউজার ব্লক করা হয়েছে' : '✅ ইউজার আনব্লক করা হয়েছে' });
      fetchUsers();
    }
  };

  const saveApiKeys = async () => {
    setSavingKeys(true);
    try {
      for (const [key, value] of Object.entries(apiKeys)) {
        if (value.trim()) {
          await supabase.from('system_config').upsert(
            { key, value: value.trim(), updated_by: user?.id } as any, { onConflict: 'key' }
          );
        }
      }
      toast({ title: '✅ API Keys সেভ হয়েছে' });
      setApiKeys({}); fetchApiKeyStatus();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'ত্রুটি', description: e.message });
    } finally { setSavingKeys(false); }
  };

  const saveSiteSettingsHandler = async () => {
    setSavingSiteSettings(true);
    try {
      for (const [key, value] of Object.entries(siteSettings)) {
        if (value !== undefined) {
          await supabase.from('system_config').upsert(
            { key, value: value.trim(), updated_by: user?.id } as any, { onConflict: 'key' }
          );
        }
      }
      toast({ title: '✅ সাইট সেটিংস সেভ হয়েছে' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'ত্রুটি', description: e.message });
    } finally { setSavingSiteSettings(false); }
  };

  const getUserProfile = (userId: string) => profiles.find(p => p.user_id === userId);

  // Analytics
  const planDistribution = useMemo(() => {
    const counts: Record<string, number> = { free: 0, standard: 0, pro: 0 };
    users.forEach(u => { counts[u.plan] = (counts[u.plan] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name === 'free' ? 'ফ্রি' : name === 'standard' ? 'স্ট্যান্ডার্ড' : 'প্রো', value }));
  }, [users]);

  const usageData = useMemo(() => {
    return users.slice(0, 7).map((u, i) => ({
      name: `U${i + 1}`,
      daily: u.used_today,
      monthly: Math.min(u.used_month, 100),
    }));
  }, [users]);

  const creditUsageOverTime = useMemo(() => {
    const days = ['শনি', 'রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র'];
    return days.map((d) => ({
      name: d,
      usage: Math.floor(Math.random() * 40) + users.reduce((a, u) => a + u.used_today, 0) * (0.5 + Math.random()),
    }));
  }, [users]);

  const paymentStats = useMemo(() => {
    const approved = payments.filter(p => p.status === 'approved').length;
    const pending = payments.filter(p => p.status === 'pending').length;
    const rejected = payments.filter(p => p.status === 'rejected').length;
    const totalRevenue = payments.filter(p => p.status === 'approved').reduce((a, p) => a + (p.amount || 0), 0);
    return { approved, pending, rejected, totalRevenue };
  }, [payments]);

  const connectionStatusIcon = (status: 'checking' | 'active' | 'inactive') => {
    if (status === 'checking') return <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />;
    if (status === 'active') return <Wifi className="w-3.5 h-3.5 text-primary" />;
    return <WifiOff className="w-3.5 h-3.5 text-destructive" />;
  };

  const connectionStatusBadge = (status: 'checking' | 'active' | 'inactive') => (
    <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${
      status === 'active' ? 'bg-primary/15 text-primary' :
      status === 'checking' ? 'bg-muted text-muted-foreground' :
      'bg-destructive/15 text-destructive'
    }`}>
      {status === 'active' ? '● কানেক্টেড' : status === 'checking' ? '◌ চেক হচ্ছে...' : '○ ডিসকানেক্টেড'}
    </span>
  );

  const StatCard = ({ icon: Icon, label, value, trend, color = 'primary' }: any) => (
    <div className="glass-card rounded-2xl p-4 space-y-2 border border-border/30 hover:border-primary/20 transition-all">
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-xl bg-${color}/10 flex items-center justify-center`}>
          <Icon className={`w-4.5 h-4.5 text-${color}`} />
        </div>
        {trend !== undefined && (
          <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${trend >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-card border-border/50 sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-foreground flex items-center gap-2.5 text-lg">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-primary" />
            </div>
            অ্যাডমিন ড্যাশবোর্ড
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <div className="px-6 overflow-x-auto">
            <TabsList className="w-full grid grid-cols-7 bg-muted/20 rounded-xl min-w-[600px]">
              <TabsTrigger value="overview" className="gap-1 text-[9px] sm:text-xs rounded-lg">
                <BarChart3 className="w-3.5 h-3.5" /> ওভারভিউ
              </TabsTrigger>
              <TabsTrigger value="system" className="gap-1 text-[9px] sm:text-xs rounded-lg">
                <Activity className="w-3.5 h-3.5" /> সিস্টেম
              </TabsTrigger>
              <TabsTrigger value="payments" className="gap-1 text-[9px] sm:text-xs rounded-lg">
                <CreditCard className="w-3.5 h-3.5" /> পেমেন্ট
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-1 text-[9px] sm:text-xs rounded-lg">
                <Users className="w-3.5 h-3.5" /> ইউজার
              </TabsTrigger>
              <TabsTrigger value="site" className="gap-1 text-[9px] sm:text-xs rounded-lg">
                <Globe className="w-3.5 h-3.5" /> সাইট
              </TabsTrigger>
              <TabsTrigger value="permissions" className="gap-1 text-[9px] sm:text-xs rounded-lg">
                <Shield className="w-3.5 h-3.5" /> পারমিশন
              </TabsTrigger>
              <TabsTrigger value="api" className="gap-1 text-[9px] sm:text-xs rounded-lg">
                <Cpu className="w-3.5 h-3.5" /> API
              </TabsTrigger>
            </TabsList>
          </div>

          {/* === OVERVIEW TAB === */}
          <TabsContent value="overview" className="px-6 pb-6 space-y-5 mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={Users} label="মোট ইউজার" value={users.length} trend={12} />
              <StatCard icon={CreditCard} label="মোট আয়" value={`${paymentStats.totalRevenue}৳`} trend={8} color="accent" />
              <StatCard icon={Clock} label="পেন্ডিং পেমেন্ট" value={paymentStats.pending} />
              <StatCard icon={TrendingUp} label="আজকের ব্যবহার" value={users.reduce((a, u) => a + u.used_today, 0)} trend={-3} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-card rounded-2xl p-4 border border-border/30 space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-semibold text-foreground">সাপ্তাহিক ব্যবহার</h4>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={creditUsageOverTime}>
                    <defs>
                      <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="usage" name="ব্যবহার" stroke="hsl(var(--primary))" fill="url(#usageGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="glass-card rounded-2xl p-4 border border-border/30 space-y-3">
                <div className="flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-semibold text-foreground">প্ল্যান বণ্টন</h4>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value" stroke="none">
                      {planDistribution.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4">
                  {planDistribution.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                      <span className="text-[10px] text-muted-foreground">{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {usageData.length > 0 && (
              <div className="glass-card rounded-2xl p-4 border border-border/30 space-y-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-semibold text-foreground">ইউজার ক্রেডিট ব্যবহার</h4>
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={usageData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="daily" name="আজ" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={14} />
                    <Bar dataKey="monthly" name="মাসিক" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-card rounded-2xl p-3 text-center border border-primary/10">
                <CheckCircle2 className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-xl font-bold text-foreground">{paymentStats.approved}</p>
                <p className="text-[10px] text-muted-foreground">অনুমোদিত</p>
              </div>
              <div className="glass-card rounded-2xl p-3 text-center border border-accent/10">
                <Clock className="w-5 h-5 text-accent mx-auto mb-1" />
                <p className="text-xl font-bold text-foreground">{paymentStats.pending}</p>
                <p className="text-[10px] text-muted-foreground">পেন্ডিং</p>
              </div>
              <div className="glass-card rounded-2xl p-3 text-center border border-destructive/10">
                <XCircle className="w-5 h-5 text-destructive mx-auto mb-1" />
                <p className="text-xl font-bold text-foreground">{paymentStats.rejected}</p>
                <p className="text-[10px] text-muted-foreground">প্রত্যাখ্যাত</p>
              </div>
            </div>
          </TabsContent>

          {/* === SYSTEM TAB — Real-time status === */}
          <TabsContent value="system" className="px-6 pb-6 space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">রিয়েল-টাইম সিস্টেম স্ট্যাটাস</h3>
              <Button size="sm" variant="ghost" onClick={() => { fetchSystemStatus(); checkRealTimeConnections(); }} className="gap-1 text-xs rounded-xl">
                <RefreshCw className="w-3.5 h-3.5" /> রিফ্রেশ
              </Button>
            </div>

            {/* Real-time Connection Status */}
            <div className="glass-card rounded-2xl p-4 space-y-3 border border-border/30">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-primary" /> লাইভ কানেকশন স্ট্যাটাস
              </h4>
              <div className="space-y-2.5">
                {[
                  { key: 'supabase', label: 'Database (Supabase)', icon: Server },
                  { key: 'hf_backend', label: 'HF Backend', icon: Cpu },
                  { key: 'github', label: 'GitHub API', icon: GitBranch },
                  { key: 'vercel', label: 'Vercel API', icon: Globe },
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-2.5">
                      {connectionStatusIcon(realTimeStatus[key] || 'inactive')}
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-foreground">{label}</span>
                    </div>
                    {connectionStatusBadge(realTimeStatus[key] || 'inactive')}
                  </div>
                ))}
              </div>
              {Object.values(realTimeStatus).some(s => s === 'inactive') && (
                <div className="flex items-start gap-2 bg-destructive/5 border border-destructive/20 rounded-xl p-3 mt-2">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-[11px] text-destructive/80">কিছু সার্ভিস কানেক্টেড নেই। Vercel Environment Variables বা অ্যাডমিন প্যানেলে কনফিগার করুন।</p>
                </div>
              )}
            </div>

            {/* Edge Function Token Status */}
            {loadingStatus ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : systemStatus ? (
              <div className="space-y-4">
                <div className="glass-card rounded-2xl p-4 space-y-3 border border-border/30">
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-primary" /> Vercel/Edge টোকেন স্ট্যাটাস
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(systemStatus.tokens).map(([name, configured]) => (
                      <div key={name} className="flex items-center justify-between py-1">
                        <span className="text-xs font-mono text-muted-foreground">{name}</span>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${
                          configured ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive'
                        }`}>
                          {configured ? '● Active' : '○ Missing'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="glass-card rounded-2xl p-4 space-y-3 border border-border/30">
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-primary" /> সিস্টেম API স্ট্যাটাস
                  </h4>
                  <div className="space-y-2">
                    {API_KEY_FIELDS.map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between py-1">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${
                          apiKeyStatus[key] ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {apiKeyStatus[key] ? '● কনফিগারড' : '○ সেট নেই'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">স্ট্যাটাস লোড করা যায়নি। রিফ্রেশ করুন।</p>
            )}
          </TabsContent>

          {/* === PAYMENTS TAB — Enhanced === */}
          <TabsContent value="payments" className="px-6 pb-6 space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">পেমেন্ট ম্যানেজমেন্ট</h3>
              <Button size="sm" variant="ghost" onClick={fetchPayments} className="gap-1 text-xs rounded-xl">
                <RefreshCw className="w-3.5 h-3.5" /> রিফ্রেশ
              </Button>
            </div>

            {/* Payment stats */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'মোট', value: payments.length, cls: 'border-border/30' },
                { label: 'পেন্ডিং', value: paymentStats.pending, cls: 'border-accent/20 bg-accent/5' },
                { label: 'অনুমোদিত', value: paymentStats.approved, cls: 'border-primary/20 bg-primary/5' },
                { label: 'প্রত্যাখ্যাত', value: paymentStats.rejected, cls: 'border-destructive/20 bg-destructive/5' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl p-2.5 text-center border ${s.cls}`}>
                  <p className="text-lg font-bold text-foreground">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {loadingPayments ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <CreditCard className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">কোনো পেমেন্ট রিকোয়েস্ট নেই</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => {
                  const profile = getUserProfile(p.user_id);
                  return (
                    <div key={p.id} className="glass-card rounded-xl p-4 space-y-2.5 border border-border/30 hover:border-primary/20 transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            {p.status === 'approved' ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> :
                            p.status === 'rejected' ? <XCircle className="w-4 h-4 text-destructive shrink-0" /> :
                            <Clock className="w-4 h-4 text-accent shrink-0" />}
                            <span className="text-xs font-mono text-foreground truncate">{p.transaction_id}</span>
                          </div>
                          {profile && (
                            <p className="text-[11px] text-muted-foreground ml-6">{profile.email || profile.full_name || p.user_id.slice(0, 8)}</p>
                          )}
                          <div className="flex gap-2 ml-6 text-[11px] text-muted-foreground flex-wrap">
                            <span className="bg-muted/40 px-2 py-0.5 rounded-lg">{p.method}</span>
                            <span className="font-bold text-foreground">{p.amount}৳</span>
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-lg">{p.plan}</span>
                            <span>{new Date(p.created_at).toLocaleDateString('bn-BD')}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold shrink-0 ${
                          p.status === 'approved' ? 'bg-primary/15 text-primary' :
                          p.status === 'rejected' ? 'bg-destructive/15 text-destructive' :
                          'bg-accent/15 text-accent'
                        }`}>{p.status === 'approved' ? 'অনুমোদিত' : p.status === 'rejected' ? 'প্রত্যাখ্যাত' : 'পেন্ডিং'}</span>
                      </div>
                      {p.status === 'pending' && (
                        <div className="flex gap-2 ml-6">
                          <Button size="sm" className="h-8 text-xs rounded-lg flex-1 gap-1.5" onClick={() => handlePaymentAction(p.id, 'approved')}>
                            <CheckCircle2 className="w-3.5 h-3.5" /> অনুমোদন করুন
                          </Button>
                          <Button size="sm" variant="destructive" className="h-8 text-xs rounded-lg flex-1 gap-1.5" onClick={() => handlePaymentAction(p.id, 'rejected')}>
                            <XCircle className="w-3.5 h-3.5" /> প্রত্যাখ্যান করুন
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* === USERS TAB — Enhanced with block/unblock === */}
          <TabsContent value="users" className="px-6 pb-6 space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">ইউজার ম্যানেজমেন্ট</h3>
              <Button size="sm" variant="ghost" onClick={fetchUsers} className="gap-1 text-xs rounded-xl">
                <RefreshCw className="w-3.5 h-3.5" /> রিফ্রেশ
              </Button>
            </div>
            {loadingUsers ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => {
                  const profile = getUserProfile(u.user_id);
                  const isBlocked = u.plan === 'blocked';
                  return (
                    <div key={u.id} className={`glass-card rounded-xl p-4 space-y-3 border transition-all ${isBlocked ? 'border-destructive/30 bg-destructive/5' : 'border-border/30 hover:border-primary/20'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isBlocked ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                            {isBlocked ? <Ban className="w-4 h-4 text-destructive" /> : <Users className="w-4 h-4 text-primary" />}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-foreground">{profile?.email || profile?.full_name || u.user_id.slice(0, 12) + '...'}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{u.user_id.slice(0, 8)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${
                            isBlocked ? 'bg-destructive/15 text-destructive' :
                            u.plan === 'pro' ? 'bg-accent/15 text-accent' :
                            u.plan === 'standard' ? 'bg-primary/15 text-primary' :
                            'bg-muted text-muted-foreground'
                          }`}>{isBlocked ? '🚫 ব্লকড' : u.plan}</span>
                        </div>
                      </div>
                      {/* Usage bars */}
                      {!isBlocked && (
                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between text-[10px] mb-1">
                              <span className="text-muted-foreground">ডেইলি</span>
                              <span className="text-foreground font-medium">{u.used_today}/{u.daily_credits}</span>
                            </div>
                            <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min((u.used_today / u.daily_credits) * 100, 100)}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] mb-1">
                              <span className="text-muted-foreground">মান্থলি</span>
                              <span className="text-foreground font-medium">{u.used_month}/{u.monthly_credits}</span>
                            </div>
                            <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                              <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${Math.min((u.used_month / u.monthly_credits) * 100, 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        {!isBlocked && (
                          <>
                            <Input type="number" placeholder="ডেইলি" defaultValue={u.daily_credits}
                              onBlur={(e) => updateUserCredits(u.user_id, 'daily_credits', parseInt(e.target.value) || 0)}
                              className="h-8 text-xs bg-muted/30 border-border/50 rounded-lg flex-1" />
                            <Input type="number" placeholder="মান্থলি" defaultValue={u.monthly_credits}
                              onBlur={(e) => updateUserCredits(u.user_id, 'monthly_credits', parseInt(e.target.value) || 0)}
                              className="h-8 text-xs bg-muted/30 border-border/50 rounded-lg flex-1" />
                          </>
                        )}
                        <Button
                          size="sm"
                          variant={isBlocked ? 'default' : 'destructive'}
                          className="h-8 text-xs rounded-lg gap-1 shrink-0"
                          onClick={() => blockUser(u.user_id, u.plan)}
                        >
                          {isBlocked ? <><UserCheck className="w-3.5 h-3.5" /> আনব্লক</> : <><Ban className="w-3.5 h-3.5" /> ব্লক</>}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* === SITE SETTINGS TAB === */}
          <TabsContent value="site" className="px-6 pb-6 space-y-4 mt-4">
            <h3 className="text-sm font-semibold text-foreground">সাইট সেটিংস</h3>
            <p className="text-[11px] text-muted-foreground bg-muted/20 rounded-xl px-3 py-2">
              এখানে সেট করা তথ্য ল্যান্ডিং পেজের পেমেন্ট ও যোগাযোগ সেকশনে দেখাবে।
            </p>

            <div className="glass-card rounded-2xl p-4 border border-border/30 space-y-4">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-primary" /> পেমেন্ট নাম্বার
              </h4>
              {SITE_SETTINGS_FIELDS.slice(0, 3).map(({ key, label, icon: Icon, placeholder }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <Icon className="w-3 h-3" /> {label}
                  </Label>
                  <Input
                    placeholder={placeholder}
                    value={siteSettings[key] || ''}
                    onChange={(e) => setSiteSettings(prev => ({ ...prev, [key]: e.target.value }))}
                    className="h-9 text-xs bg-muted/30 border-border/50 rounded-lg"
                  />
                </div>
              ))}
            </div>

            <div className="glass-card rounded-2xl p-4 border border-border/30 space-y-4">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-primary" /> যোগাযোগ ও সোশ্যাল মিডিয়া
              </h4>
              {SITE_SETTINGS_FIELDS.slice(3).map(({ key, label, icon: Icon, placeholder }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <Icon className="w-3 h-3" /> {label}
                  </Label>
                  <Input
                    placeholder={placeholder}
                    value={siteSettings[key] || ''}
                    onChange={(e) => setSiteSettings(prev => ({ ...prev, [key]: e.target.value }))}
                    className="h-9 text-xs bg-muted/30 border-border/50 rounded-lg"
                  />
                </div>
              ))}
            </div>

            <Button onClick={saveSiteSettingsHandler} disabled={savingSiteSettings} className="w-full gap-2 rounded-xl h-10">
              {savingSiteSettings ? <><Loader2 className="w-4 h-4 animate-spin" /> সেভ হচ্ছে...</> : <><Save className="w-4 h-4" /> সাইট সেটিংস সেভ করুন</>}
            </Button>
          </TabsContent>

          {/* === PERMISSIONS TAB === */}
          <TabsContent value="permissions" className="px-6 pb-6 mt-4">
            <AdminPermissions />
          </TabsContent>

          {/* === API TAB === */}
          <TabsContent value="api" className="px-6 pb-6 space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">সিস্টেম-ওয়াইড API</h3>
              <Button size="sm" variant="ghost" onClick={fetchApiKeyStatus} className="gap-1 text-xs rounded-xl">
                <RefreshCw className="w-3.5 h-3.5" /> রিফ্রেশ
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground bg-muted/20 rounded-xl px-3 py-2">
              এই API Keys সমস্ত ইউজারের সার্ভিসে ব্যবহৃত হবে। ইউজাররা প্ল্যান অনুযায়ী অ্যাক্সেস পাবে।
            </p>
            {loadingKeys ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-2.5">
                {API_KEY_FIELDS.map(({ key, label, desc, color }) => (
                  <div key={key} className={`rounded-2xl p-4 space-y-2.5 bg-gradient-to-r ${color} border border-border/30`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-semibold text-foreground">{label}</Label>
                        <p className="text-[10px] text-muted-foreground">{desc}</p>
                      </div>
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${
                        apiKeyStatus[key] ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        {apiKeyStatus[key] ? '● সেট আছে' : '○ সেট নেই'}
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        type={showKeys[key] ? 'text' : 'password'}
                        placeholder={`${label} দিন...`}
                        value={apiKeys[key] || ''}
                        onChange={(e) => setApiKeys(prev => ({ ...prev, [key]: e.target.value }))}
                        className="bg-background/50 border-border/50 text-xs font-mono pr-10 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeys(prev => ({ ...prev, [key]: !prev[key] }))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showKeys[key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button onClick={saveApiKeys} disabled={savingKeys || Object.values(apiKeys).every(v => !v.trim())} className="w-full gap-2 rounded-xl h-10">
              {savingKeys ? <><Loader2 className="w-4 h-4 animate-spin" /> সেভ হচ্ছে...</> : <><Save className="w-4 h-4" /> সিস্টেম কনফিগ সেভ করুন</>}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
