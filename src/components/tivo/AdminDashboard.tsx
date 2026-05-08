import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Settings2, Users, CreditCard, Cpu, CheckCircle2, XCircle, Clock,
  RefreshCw, Loader2, Activity, Server, GitBranch, Globe, Zap, Save, Eye, EyeOff, Shield,
  TrendingUp, BarChart3, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight,
  Ban, UserCheck, Phone, Mail, Facebook, Youtube, Instagram, ExternalLink,
  Wifi, WifiOff, AlertTriangle, ChevronRight, ChevronDown, KeyRound, Database, FileText
} from 'lucide-react';
import { AdminPermissions } from './AdminPermissions';
import { AdminProposals } from './AdminProposals';
import { CustomDatabaseTester } from './CustomDatabaseTester';
import { StorageSafetyPanel } from './StorageSafetyPanel';
import { HealthCheckPanel } from './HealthCheckPanel';
import { AIMemoryManager } from './AIMemoryManager';
import { Sparkles, Brain, HeartPulse } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid
} from 'recharts';

interface AdminDashboardProps { open: boolean; onClose: () => void; initialTab?: string; }

interface SystemStatus {
  tokens: Record<string, boolean>;
  infrastructure: { frontend: { repo: string; deployment: string; platform: string }; backend: { repo: string; space: string; platform: string; status: string } };
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

const SYSTEM_TOKEN_FIELDS = [
  { key: 'GITHUB_TOKEN_OVERRIDE', label: 'GitHub Token (Override)', desc: 'AI নিজের repo update করতে ব্যবহার করবে', placeholder: 'ghp_xxxxxxxxxxxx' },
  { key: 'VERCEL_TOKEN_OVERRIDE', label: 'Vercel Token (Override)', desc: 'AI নিজের deployment করতে ব্যবহার করবে', placeholder: 'vercel_xxxxxxxxxxxx' },
  { key: 'HF_TOKEN_OVERRIDE', label: 'HuggingFace Token (Override)', desc: 'AI Space update করতে ব্যবহার করবে', placeholder: 'hf_xxxxxxxxxxxx' },
  { key: 'CUSTOM_SUPABASE_URL', label: 'Custom Supabase URL', desc: 'নিজস্ব ডাটাবেইজ কানেক্ট করতে', placeholder: 'https://xxx.supabase.co' },
  { key: 'CUSTOM_SUPABASE_ANON_KEY', label: 'Custom Supabase Anon Key', desc: 'Public key (frontend)', placeholder: 'eyJhbGciOiJI...' },
  { key: 'CUSTOM_SUPABASE_SERVICE_KEY', label: 'Custom Supabase Service Role Key', desc: 'Admin key (server-side, AI ব্যবহার করবে)', placeholder: 'eyJhbGciOiJI...' },
  { key: 'CUSTOM_SUPABASE_DB_URL', label: 'Custom Database URL', desc: 'Schema bootstrap/migration-এর জন্য Postgres connection string', placeholder: 'postgresql://postgres:...' },
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

const DEFAULT_LANDING_CONTENT = JSON.stringify({
  brand: { name: 'TIVO DEV AGENT', tagline_bn: 'Autonomous AI SaaS Platform', tagline_en: 'Autonomous AI SaaS Platform', version: '7.3.0' },
  hero: {
    headline_bn: 'আপনার AI ডেভেলপমেন্ট পার্টনার',
    headline_en: 'Your AI Development Partner',
    subtitle_bn: 'কোড, GitHub, Vercel, database, automation এবং business strategy — সবকিছু একটি professional AI agent থেকে।',
    subtitle_en: 'Code, GitHub, Vercel, database, automation and business strategy — all from one professional AI agent.',
    cta_primary_bn: 'শুরু করুন', cta_primary_en: 'Get Started',
    cta_secondary_bn: 'প্ল্যান দেখুন', cta_secondary_en: 'View Plans',
  },
  features_section: {
    title_bn: 'কেন TIVO DEV?', title_en: 'Why TIVO DEV?',
    intro_bn: 'TIVO DEV AGENT শুধু চ্যাট নয় — এটি project planning, build workflow, deployment approval, API health এবং admin-controlled automation বুঝে কাজ করে।',
    intro_en: 'TIVO DEV AGENT is more than chat — it understands project planning, build workflow, deployment approval, API health and admin-controlled automation.',
    items: [
      { icon: 'Code2', title_bn: 'AI কোড জেনারেশন', title_en: 'AI Code Gen', desc_bn: 'প্রম্পট দিন, কোড পান — GitHub-এ সরাসরি পুশ।', desc_en: 'Prompt in, code out — push to GitHub.' },
      { icon: 'Zap', title_bn: 'অটোমেশন', title_en: 'Automation', desc_bn: 'GitHub Actions, Vercel deploy অটোমেটিক।', desc_en: 'GitHub Actions, Vercel deploy automated.' },
      { icon: 'Shield', title_bn: 'সিকিউর টোকেন', title_en: 'Secure Tokens', desc_bn: 'API কী আপনার ব্রাউজারে।', desc_en: 'API keys stay in your browser.' },
      { icon: 'Globe', title_bn: 'ওয়ান-ক্লিক পাবলিশ', title_en: 'One-click Publish', desc_bn: 'বিল্ড, প্রিভিউ, শেয়ার।', desc_en: 'Build, preview, share.' },
    ],
    highlights: ['Project planning', 'GitHub/Vercel/HF token-aware', 'Admin approval proposals', 'Custom database bootstrap', 'Permanent AI memory', 'Mobile/Desktop responsive'],
  },
  pricing_section: {
    title_bn: 'প্ল্যান বেছে নিন', title_en: 'Choose a Plan',
    subtitle_bn: 'বিকাশ, নগদ বা রকেট দিয়ে পেমেন্ট করুন', subtitle_en: 'Pay with bKash, Nagad or Rocket',
    note_bn: 'প্ল্যান অনুযায়ী credit, automation এবং support সীমা admin panel থেকে নিয়ন্ত্রণ করা যায়।',
    note_en: 'Credits, automation and support limits can be controlled from the admin panel by plan.',
    plans: [
      { id: 'free', name_bn: 'Free', name_en: 'Free', price: '০', currency: '৳', period_bn: '/মাস', period_en: '/mo',
        features_bn: ['৫ ডেইলি ক্রেডিট', '৫০ মান্থলি ক্রেডিট', 'বেসিক AI চ্যাট', 'GitHub ইন্টিগ্রেশন'],
        features_en: ['5 daily credits', '50 monthly credits', 'Basic AI chat', 'GitHub integration'],
        cta_bn: 'ফ্রিতে শুরু করুন', cta_en: 'Start Free', popular: false },
      { id: 'standard', name_bn: 'Standard', name_en: 'Standard', price: '২৯৯', currency: '৳', period_bn: '/মাস', period_en: '/mo',
        features_bn: ['৫০ ডেইলি ক্রেডিট', '১০০০ মান্থলি ক্রেডিট', 'সকল AI মোড', 'Vercel ডিপ্লয়', 'অটোমেশন', 'প্রায়োরিটি সাপোর্ট'],
        features_en: ['50 daily credits', '1000 monthly credits', 'All AI modes', 'Vercel deploy', 'Automation', 'Priority support'],
        cta_bn: 'Standard নিন', cta_en: 'Get Standard', popular: true },
      { id: 'pro', name_bn: 'Pro', name_en: 'Pro', price: '৯৯৯', currency: '৳', period_bn: '/মাস', period_en: '/mo',
        features_bn: ['আনলিমিটেড ক্রেডিট', 'সকল ফিচার', 'কাস্টম API কনফিগ', 'টিম কলাবোরেশন', 'অ্যাডভান্সড অটোমেশন', 'ডেডিকেটেড সাপোর্ট'],
        features_en: ['Unlimited credits', 'All features', 'Custom API config', 'Team collaboration', 'Advanced automation', 'Dedicated support'],
        cta_bn: 'Pro নিন', cta_en: 'Get Pro', popular: false },
    ],
  },
  footer: { copyright_bn: '© 2026 TIVO DEV AGENT — সর্বস্বত্ব সংরক্ষিত।', copyright_en: '© 2026 TIVO DEV AGENT — All rights reserved.' },
  ai_managed: true,
  last_ai_update: null,
}, null, 2);

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

// Vertical menu items
const MENU_ITEMS = [
  { id: 'overview', label: 'ওভারভিউ', icon: BarChart3 },
  { id: 'proposals', label: 'AI প্রপোজাল', icon: Sparkles },
  { id: 'health', label: 'হেলথ চেক', icon: HeartPulse },
  { id: 'memory', label: 'AI মেমোরি', icon: Brain },
  { id: 'system', label: 'সিস্টেম', icon: Activity },
  { id: 'sysTokens', label: 'সিস্টেম টোকেন', icon: KeyRound },
  { id: 'payments', label: 'পেমেন্ট', icon: CreditCard },
  { id: 'users', label: 'ইউজার', icon: Users },
  { id: 'site', label: 'সাইট', icon: Globe },
  { id: 'landing', label: 'ল্যান্ডিং কনটেন্ট', icon: FileText },
  { id: 'permissions', label: 'পারমিশন', icon: Shield },
  { id: 'api', label: 'API', icon: Cpu },
];

export const AdminDashboard = ({ open, onClose, initialTab = 'overview' }: AdminDashboardProps) => {
  const { user, session } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [payments, setPayments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});
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
  const [landingContent, setLandingContent] = useState(DEFAULT_LANDING_CONTENT);
  const [savingLandingContent, setSavingLandingContent] = useState(false);
  const [realTimeStatus, setRealTimeStatus] = useState<Record<string, 'checking' | 'active' | 'inactive'>>({});
  const [sysTokens, setSysTokens] = useState<Record<string, string>>({});
  const [sysTokenStatus, setSysTokenStatus] = useState<Record<string, boolean>>({});
  const [showSysTokens, setShowSysTokens] = useState<Record<string, boolean>>({});
  const [savingSysTokens, setSavingSysTokens] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab && initialTab !== 'overview' ? initialTab : 'home');
      fetchPayments(); fetchUsers(); fetchSystemStatus(); fetchApiKeyStatus(); fetchSiteSettings(); checkRealTimeConnections(); fetchSysTokens();
    }
  }, [open, initialTab]);

  const fetchPayments = async () => {
    setLoadingPayments(true);
    const { data } = await supabase.from('payment_requests').select('*').order('created_at', { ascending: false });
    setPayments(data || []);
    setLoadingPayments(false);
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const [creditsRes, profilesRes, rolesRes] = await Promise.all([
      supabase.from('user_credits').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
      supabase.from('user_roles').select('user_id, role'),
    ]);
    setUsers(creditsRes.data || []);
    setProfiles(profilesRes.data || []);
    const roleMap: Record<string, string[]> = {};
    (rolesRes.data || []).forEach((r: any) => {
      roleMap[r.user_id] = roleMap[r.user_id] || [];
      roleMap[r.user_id].push(r.role);
    });
    setUserRoles(roleMap);
    setLoadingUsers(false);
  };

  const toggleAdminRole = async (userId: string, makeAdmin: boolean) => {
    const { error } = await supabase.rpc('admin_set_user_role' as any, {
      _user_id: userId, _role: 'admin', _grant: makeAdmin,
    });
    if (error) { toast({ variant: 'destructive', title: 'ত্রুটি', description: error.message }); return; }
    toast({ title: makeAdmin ? '✅ অ্যাডমিন বানানো হয়েছে' : '✅ অ্যাডমিন প্রত্যাহার' });
    fetchUsers();
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
      API_KEY_FIELDS.forEach(f => { const found = data?.find((d: any) => d.key === f.key); status[f.key] = !!found && (found as any).value.length > 0; });
      setApiKeyStatus(status);
    } catch {} finally { setLoadingKeys(false); }
  };

  const fetchSiteSettings = async () => {
    try {
      const { data } = await supabase.from('system_config').select('key, value').in('key', SITE_SETTINGS_FIELDS.map(f => f.key));
      const settings: Record<string, string> = {};
      data?.forEach((d: any) => { settings[d.key] = d.value; });
      setSiteSettings(settings);
      setLandingContent(settings.landing_content || DEFAULT_LANDING_CONTENT);
    } catch {}
  };

  const fetchSysTokens = async () => {
    try {
      const { data } = await supabase.from('system_config').select('key, value').in('key', SYSTEM_TOKEN_FIELDS.map(f => f.key));
      const status: Record<string, boolean> = {};
      SYSTEM_TOKEN_FIELDS.forEach(f => {
        const found = data?.find((d: any) => d.key === f.key);
        status[f.key] = !!found && (found as any).value.length > 0;
      });
      setSysTokenStatus(status);
    } catch {}
  };

  const saveSysTokens = async () => {
    setSavingSysTokens(true);
    try {
      for (const [key, value] of Object.entries(sysTokens)) {
        if (value.trim()) {
          await supabase.from('system_config').upsert({ key, value: value.trim(), updated_by: user?.id } as any, { onConflict: 'key' });
        }
      }
      const customKeys = ['CUSTOM_SUPABASE_URL', 'CUSTOM_SUPABASE_SERVICE_KEY', 'CUSTOM_SUPABASE_DB_URL'];
      if (customKeys.some(key => sysTokens[key]?.trim())) {
        await supabase.from('ai_proposals').insert({
          action_type: 'custom_database_bootstrap',
          risk_level: 'high',
          title: 'Custom database bootstrap ও data sync',
          description: 'Custom Supabase config আপডেট হয়েছে। AI বর্তমান schema/data custom database-এ setup ও migrate করার আগে admin approval চাইছে।',
          payload: { keys_updated: customKeys.filter(key => sysTokens[key]?.trim()), requires_approval: true },
          requested_by: user?.id,
          status: 'pending',
        } as any);
      }
      toast({ title: '✅ সিস্টেম টোকেন সেভ হয়েছে', description: 'AI এখন এই tokens ব্যবহার করবে।' });
      setSysTokens({});
      fetchSysTokens();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'ত্রুটি', description: e.message });
    } finally { setSavingSysTokens(false); }
  };

  const checkRealTimeConnections = async () => {
    const newStatus: Record<string, 'checking' | 'active' | 'inactive'> = {};
    newStatus['supabase'] = 'checking';
    newStatus['hf_backend'] = 'checking';
    setRealTimeStatus(prev => ({ ...prev, ...newStatus }));

    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      newStatus['supabase'] = error ? 'inactive' : 'active';
    } catch { newStatus['supabase'] = 'inactive'; }

    const hfUrl = import.meta.env.VITE_HF_SPACE_URL || '';
    try {
      if (hfUrl) {
        const resp = await fetch(`${hfUrl}/functions/v1/backend-api/health`, { signal: AbortSignal.timeout(5000) }).catch(() => null);
        newStatus['hf_backend'] = resp?.ok ? 'active' : 'inactive';
      } else { newStatus['hf_backend'] = 'inactive'; }
    } catch { newStatus['hf_backend'] = 'inactive'; }

    newStatus['github'] = systemStatus?.tokens?.GITHUB_TOKEN ? 'active' : 'inactive';
    newStatus['vercel'] = systemStatus?.tokens?.VERCEL_TOKEN ? 'active' : 'inactive';
    setRealTimeStatus(newStatus);
  };

  const handlePaymentAction = async (paymentId: string, action: 'approved' | 'rejected') => {
    const { error } = await supabase.from('payment_requests')
      .update({ status: action, reviewed_by: user?.id, updated_at: new Date().toISOString() } as any)
      .eq('id', paymentId);
    if (error) { toast({ variant: 'destructive', title: 'ত্রুটি', description: error.message }); return; }
    if (action === 'approved') {
      const payment = payments.find(p => p.id === paymentId);
      if (payment) {
        const daily = payment.plan === 'pro' ? 9999 : payment.plan === 'standard' ? 50 : 5;
        const monthly = payment.plan === 'pro' ? 99999 : payment.plan === 'standard' ? 1000 : 50;
        const { error: rpcErr } = await supabase.rpc('admin_set_user_plan' as any, {
          _user_id: payment.user_id,
          _plan: payment.plan,
          _daily_credits: daily,
          _monthly_credits: monthly,
          _payment_status: 'paid',
          _transaction_id: payment.transaction_id,
        });
        if (rpcErr) { toast({ variant: 'destructive', title: 'প্ল্যান আপডেট ব্যর্থ', description: rpcErr.message }); return; }
      }
    }
    toast({ title: action === 'approved' ? '✅ অনুমোদিত' : '❌ প্রত্যাখ্যাত' });
    fetchPayments(); fetchUsers();
  };

  const updateUserCredits = async (userId: string, field: 'daily_credits' | 'monthly_credits', value: number) => {
    const u = users.find(x => x.user_id === userId);
    if (!u) return;
    const daily = field === 'daily_credits' ? value : u.daily_credits;
    const monthly = field === 'monthly_credits' ? value : u.monthly_credits;
    const { error } = await supabase.rpc('admin_update_credit_limits' as any, {
      _user_id: userId, _daily: daily, _monthly: monthly,
    });
    if (error) { toast({ variant: 'destructive', title: 'ত্রুটি', description: error.message }); return; }
    toast({ title: '✅ আপডেট হয়েছে' });
    fetchUsers();
  };

  const blockUser = async (userId: string, currentPlan: string) => {
    const block = currentPlan !== 'blocked';
    const { error } = await supabase.rpc('admin_block_user' as any, { _user_id: userId, _block: block });
    if (error) { toast({ variant: 'destructive', title: 'ত্রুটি', description: error.message }); return; }
    toast({ title: block ? '🚫 ব্লক হয়েছে' : '✅ আনব্লক হয়েছে' });
    fetchUsers();
  };

  const saveApiKeys = async () => {
    setSavingKeys(true);
    try {
      for (const [key, value] of Object.entries(apiKeys)) {
        if (value.trim()) {
          await supabase.from('system_config').upsert({ key, value: value.trim(), updated_by: user?.id } as any, { onConflict: 'key' });
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
          await supabase.from('system_config').upsert({ key, value: value.trim(), updated_by: user?.id } as any, { onConflict: 'key' });
        }
      }
      toast({ title: '✅ সাইট সেটিংস সেভ হয়েছে' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'ত্রুটি', description: e.message });
    } finally { setSavingSiteSettings(false); }
  };

  const saveLandingContentHandler = async () => {
    setSavingLandingContent(true);
    try {
      JSON.parse(landingContent);
      await supabase.from('system_config').upsert({ key: 'landing_content', value: landingContent.trim(), updated_by: user?.id } as any, { onConflict: 'key' });
      toast({ title: '✅ ল্যান্ডিং কনটেন্ট সেভ হয়েছে' });
      fetchSiteSettings();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'JSON ভুল আছে', description: e.message });
    } finally { setSavingLandingContent(false); }
  };

  const getUserProfile = (userId: string) => profiles.find(p => p.user_id === userId);

  const planDistribution = useMemo(() => {
    const counts: Record<string, number> = { free: 0, standard: 0, pro: 0 };
    users.forEach(u => { counts[u.plan] = (counts[u.plan] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name === 'free' ? 'ফ্রি' : name === 'standard' ? 'স্ট্যান্ডার্ড' : 'প্রো', value }));
  }, [users]);

  const usageData = useMemo(() => users.slice(0, 7).map((u, i) => ({ name: `U${i + 1}`, daily: u.used_today, monthly: Math.min(u.used_month, 100) })), [users]);

  const creditUsageOverTime = useMemo(() => {
    const days = ['শনি', 'রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র'];
    return days.map((d) => ({ name: d, usage: Math.floor(Math.random() * 40) + users.reduce((a, u) => a + u.used_today, 0) * (0.5 + Math.random()) }));
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
      status === 'active' ? 'bg-primary/15 text-primary' : status === 'checking' ? 'bg-muted text-muted-foreground' : 'bg-destructive/15 text-destructive'
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

  // Render tab content
  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Users} label="মোট ইউজার" value={users.length} trend={12} />
              <StatCard icon={CreditCard} label="মোট আয়" value={`${paymentStats.totalRevenue}৳`} trend={8} color="accent" />
              <StatCard icon={Clock} label="পেন্ডিং" value={paymentStats.pending} />
              <StatCard icon={TrendingUp} label="আজকের ব্যবহার" value={users.reduce((a, u) => a + u.used_today, 0)} trend={-3} />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="glass-card rounded-2xl p-4 border border-border/30 space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-semibold text-foreground">সাপ্তাহিক ব্যবহার</h4>
                </div>
                <ResponsiveContainer width="100%" height={140}>
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
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={4} dataKey="value" stroke="none">
                      {planDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
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
          </div>
        );

      case 'system':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">রিয়েল-টাইম স্ট্যাটাস</h3>
              <Button size="sm" variant="ghost" onClick={() => { fetchSystemStatus(); checkRealTimeConnections(); }} className="gap-1 text-xs rounded-xl">
                <RefreshCw className="w-3.5 h-3.5" /> রিফ্রেশ
              </Button>
            </div>
            <div className="glass-card rounded-2xl p-4 space-y-3 border border-border/30">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5 text-primary" /> লাইভ কানেকশন</h4>
              <div className="space-y-2.5">
                {[
                  { key: 'supabase', label: 'Database', icon: Server },
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
                  <p className="text-[11px] text-destructive/80">কিছু সার্ভিস কানেক্টেড নেই।</p>
                </div>
              )}
            </div>
            {loadingStatus ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : systemStatus ? (
              <div className="space-y-4">
                <div className="glass-card rounded-2xl p-4 space-y-3 border border-border/30">
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-primary" /> টোকেন স্ট্যাটাস</h4>
                  <div className="space-y-2">
                    {Object.entries(systemStatus.tokens).map(([name, configured]) => (
                      <div key={name} className="flex items-center justify-between py-1">
                        <span className="text-xs font-mono text-muted-foreground">{name}</span>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${configured ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive'}`}>
                          {configured ? '● Active' : '○ Missing'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="glass-card rounded-2xl p-4 space-y-3 border border-border/30">
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-primary" /> API স্ট্যাটাস</h4>
                  <div className="space-y-2">
                    {API_KEY_FIELDS.map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between py-1">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${apiKeyStatus[key] ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {apiKeyStatus[key] ? '● কনফিগারড' : '○ সেট নেই'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">স্ট্যাটাস লোড করা যায়নি।</p>
            )}
          </div>
        );

      case 'payments':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">পেমেন্ট ম্যানেজমেন্ট</h3>
              <Button size="sm" variant="ghost" onClick={fetchPayments} className="gap-1 text-xs rounded-xl"><RefreshCw className="w-3.5 h-3.5" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'পেন্ডিং', value: paymentStats.pending, cls: 'border-accent/20 bg-accent/5' },
                { label: 'অনুমোদিত', value: paymentStats.approved, cls: 'border-primary/20 bg-primary/5' },
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
              <div className="text-center py-8"><CreditCard className="w-8 h-8 text-muted-foreground/30 mx-auto" /><p className="text-sm text-muted-foreground mt-2">কোনো পেমেন্ট নেই</p></div>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => {
                  const profile = getUserProfile(p.user_id);
                  return (
                    <div key={p.id} className="glass-card rounded-xl p-3 space-y-2 border border-border/30">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5">
                            {p.status === 'approved' ? <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" /> :
                            p.status === 'rejected' ? <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" /> :
                            <Clock className="w-3.5 h-3.5 text-accent shrink-0" />}
                            <span className="text-[11px] font-mono text-foreground truncate">{p.transaction_id}</span>
                          </div>
                          {profile && <p className="text-[10px] text-muted-foreground ml-5">{profile.email || profile.full_name}</p>}
                          <div className="flex gap-1.5 ml-5 text-[10px] text-muted-foreground flex-wrap">
                            <span className="bg-muted/40 px-1.5 py-0.5 rounded">{p.method}</span>
                            <span className="font-bold text-foreground">{p.amount}৳</span>
                            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">{p.plan}</span>
                          </div>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                          p.status === 'approved' ? 'bg-primary/15 text-primary' : p.status === 'rejected' ? 'bg-destructive/15 text-destructive' : 'bg-accent/15 text-accent'
                        }`}>{p.status === 'approved' ? 'অনুমোদিত' : p.status === 'rejected' ? 'প্রত্যাখ্যাত' : 'পেন্ডিং'}</span>
                      </div>
                      {p.status === 'pending' && (
                        <div className="flex gap-2 ml-5">
                          <Button size="sm" className="h-7 text-[10px] rounded-lg flex-1 gap-1" onClick={() => handlePaymentAction(p.id, 'approved')}>
                            <CheckCircle2 className="w-3 h-3" /> অনুমোদন
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 text-[10px] rounded-lg flex-1 gap-1" onClick={() => handlePaymentAction(p.id, 'rejected')}>
                            <XCircle className="w-3 h-3" /> প্রত্যাখ্যান
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'users':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">ইউজার ম্যানেজমেন্ট</h3>
              <Button size="sm" variant="ghost" onClick={fetchUsers} className="gap-1 text-xs rounded-xl"><RefreshCw className="w-3.5 h-3.5" /></Button>
            </div>
            {loadingUsers ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => {
                  const profile = getUserProfile(u.user_id);
                  const isBlocked = u.plan === 'blocked';
                  return (
                    <div key={u.id} className={`glass-card rounded-xl p-3 space-y-2 border transition-all ${isBlocked ? 'border-destructive/30 bg-destructive/5' : 'border-border/30'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isBlocked ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                            {isBlocked ? <Ban className="w-3.5 h-3.5 text-destructive" /> : <Users className="w-3.5 h-3.5 text-primary" />}
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-foreground">{profile?.email || u.user_id.slice(0, 12)}</p>
                            <p className="text-[9px] text-muted-foreground font-mono">{u.user_id.slice(0, 8)}</p>
                          </div>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${
                          isBlocked ? 'bg-destructive/15 text-destructive' : u.plan === 'pro' ? 'bg-accent/15 text-accent' : u.plan === 'standard' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>{isBlocked ? '🚫 ব্লকড' : u.plan}</span>
                      </div>
                      {!isBlocked && (
                        <div className="space-y-1.5">
                          <div>
                            <div className="flex justify-between text-[9px] mb-0.5">
                              <span className="text-muted-foreground">ডেইলি</span>
                              <span className="text-foreground">{u.used_today}/{u.daily_credits}</span>
                            </div>
                            <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min((u.used_today / u.daily_credits) * 100, 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        {!isBlocked && (
                          <>
                            <Input type="number" placeholder="ডেইলি" defaultValue={u.daily_credits}
                              onBlur={(e) => updateUserCredits(u.user_id, 'daily_credits', parseInt(e.target.value) || 0)}
                              className="h-7 text-[10px] bg-muted/30 border-border/50 rounded-lg flex-1" />
                            <Input type="number" placeholder="মান্থলি" defaultValue={u.monthly_credits}
                              onBlur={(e) => updateUserCredits(u.user_id, 'monthly_credits', parseInt(e.target.value) || 0)}
                              className="h-7 text-[10px] bg-muted/30 border-border/50 rounded-lg flex-1" />
                          </>
                        )}
                        <Button size="sm" variant={isBlocked ? 'default' : 'destructive'} className="h-7 text-[10px] rounded-lg gap-1 shrink-0"
                          onClick={() => blockUser(u.user_id, u.plan)}>
                          {isBlocked ? <><UserCheck className="w-3 h-3" /> আনব্লক</> : <><Ban className="w-3 h-3" /> ব্লক</>}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'site':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">সাইট সেটিংস</h3>
            <p className="text-[11px] text-muted-foreground bg-muted/20 rounded-xl px-3 py-2">
              এখানে সেট করা তথ্য ল্যান্ডিং পেজে দেখাবে।
            </p>
            <div className="glass-card rounded-2xl p-4 border border-border/30 space-y-3">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-primary" /> পেমেন্ট নাম্বার</h4>
              {SITE_SETTINGS_FIELDS.slice(0, 3).map(({ key, label, icon: Icon, placeholder }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground flex items-center gap-1"><Icon className="w-3 h-3" /> {label}</Label>
                  <Input placeholder={placeholder} value={siteSettings[key] || ''} onChange={(e) => setSiteSettings(p => ({ ...p, [key]: e.target.value }))} className="h-8 text-xs bg-muted/30 border-border/50 rounded-lg" />
                </div>
              ))}
            </div>
            <div className="glass-card rounded-2xl p-4 border border-border/30 space-y-3">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-primary" /> যোগাযোগ ও সোশ্যাল</h4>
              {SITE_SETTINGS_FIELDS.slice(3).map(({ key, label, icon: Icon, placeholder }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground flex items-center gap-1"><Icon className="w-3 h-3" /> {label}</Label>
                  <Input placeholder={placeholder} value={siteSettings[key] || ''} onChange={(e) => setSiteSettings(p => ({ ...p, [key]: e.target.value }))} className="h-8 text-xs bg-muted/30 border-border/50 rounded-lg" />
                </div>
              ))}
            </div>
            <Button onClick={saveSiteSettingsHandler} disabled={savingSiteSettings} className="w-full gap-2 rounded-xl h-9">
              {savingSiteSettings ? <><Loader2 className="w-4 h-4 animate-spin" /> সেভ হচ্ছে...</> : <><Save className="w-4 h-4" /> সেভ করুন</>}
            </Button>
          </div>
        );

      case 'landing':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> ল্যান্ডিং কনটেন্ট</h3>
            <p className="text-[11px] text-muted-foreground bg-muted/20 rounded-xl px-3 py-2">
              JSON হিসেবে hero text, feature list ও plan note আপডেট করুন। ভুল JSON হলে সেভ হবে না।
            </p>
            <Textarea
              value={landingContent}
              onChange={(e) => setLandingContent(e.target.value)}
              className="min-h-[320px] bg-background/50 border-border/50 text-xs font-mono rounded-xl"
            />
            <Button onClick={saveLandingContentHandler} disabled={savingLandingContent} className="w-full gap-2 rounded-xl h-9">
              {savingLandingContent ? <><Loader2 className="w-4 h-4 animate-spin" /> সেভ হচ্ছে...</> : <><Save className="w-4 h-4" /> ল্যান্ডিং কনটেন্ট সেভ করুন</>}
            </Button>
          </div>
        );

      case 'proposals':
        return <AdminProposals />;

      case 'health':
        return <HealthCheckPanel />;

      case 'memory':
        return <AIMemoryManager />;

      case 'sysTokens':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary" /> সিস্টেম টোকেন
              </h3>
              <Button size="sm" variant="ghost" onClick={fetchSysTokens} className="gap-1 text-xs rounded-xl">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-accent" />
                <p className="text-[11px] font-semibold text-foreground">গুরুত্বপূর্ণ</p>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                AI স্বয়ংক্রিয় ভাবে নিজেকে আপডেট করার সময় এই টোকেনগুলো ব্যবহার করবে। Custom Supabase সেট করলে AI সেই DB তে কাজ করবে (Lovable Cloud এর পরিবর্তে)।
              </p>
            </div>
            <div className="space-y-2.5">
              {SYSTEM_TOKEN_FIELDS.map(({ key, label, desc, placeholder }) => (
                <div key={key} className="rounded-2xl p-3 space-y-2 bg-gradient-to-r from-primary/5 to-accent/5 border border-border/30">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        {key.includes('SUPABASE') ? <Database className="w-3 h-3" /> : <KeyRound className="w-3 h-3" />}
                        {label}
                      </Label>
                      <p className="text-[10px] text-muted-foreground">{desc}</p>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${sysTokenStatus[key] ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {sysTokenStatus[key] ? '● সেট' : '○ নেই'}
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      type={showSysTokens[key] ? 'text' : 'password'}
                      placeholder={placeholder}
                      value={sysTokens[key] || ''}
                      onChange={(e) => setSysTokens(p => ({ ...p, [key]: e.target.value }))}
                      className="bg-background/50 border-border/50 text-xs font-mono pr-10 rounded-xl h-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSysTokens(p => ({ ...p, [key]: !p[key] }))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSysTokens[key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              onClick={saveSysTokens}
              disabled={savingSysTokens || Object.values(sysTokens).every(v => !v?.trim())}
              className="w-full gap-2 rounded-xl h-9"
            >
              {savingSysTokens ? <><Loader2 className="w-4 h-4 animate-spin" /> সেভ হচ্ছে...</> : <><Save className="w-4 h-4" /> সেভ করুন</>}
            </Button>

            <div className="pt-3 border-t border-border/30 space-y-4">
              <StorageSafetyPanel />
              <CustomDatabaseTester />
            </div>
          </div>
        );

      case 'permissions':
        return <AdminPermissions />;

      case 'api':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">সিস্টেম API</h3>
              <Button size="sm" variant="ghost" onClick={fetchApiKeyStatus} className="gap-1 text-xs rounded-xl"><RefreshCw className="w-3.5 h-3.5" /></Button>
            </div>
            <p className="text-[11px] text-muted-foreground bg-muted/20 rounded-xl px-3 py-2">
              এই API Keys সমস্ত ইউজারের সার্ভিসে ব্যবহৃত হবে।
            </p>
            {loadingKeys ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-2.5">
                {API_KEY_FIELDS.map(({ key, label, desc, color }) => (
                  <div key={key} className={`rounded-2xl p-3 space-y-2 bg-gradient-to-r ${color} border border-border/30`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-semibold text-foreground">{label}</Label>
                        <p className="text-[10px] text-muted-foreground">{desc}</p>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${apiKeyStatus[key] ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {apiKeyStatus[key] ? '● সেট আছে' : '○ সেট নেই'}
                      </span>
                    </div>
                    <div className="relative">
                      <Input type={showKeys[key] ? 'text' : 'password'} placeholder={`${label} দিন...`} value={apiKeys[key] || ''}
                        onChange={(e) => setApiKeys(p => ({ ...p, [key]: e.target.value }))}
                        className="bg-background/50 border-border/50 text-xs font-mono pr-10 rounded-xl h-8" />
                      <button type="button" onClick={() => setShowKeys(p => ({ ...p, [key]: !p[key] }))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showKeys[key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button onClick={saveApiKeys} disabled={savingKeys || Object.values(apiKeys).every(v => !v.trim())} className="w-full gap-2 rounded-xl h-9">
              {savingKeys ? <><Loader2 className="w-4 h-4 animate-spin" /> সেভ হচ্ছে...</> : <><Save className="w-4 h-4" /> সেভ করুন</>}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const inHome = activeTab === 'home';
  const currentItem = MENU_ITEMS.find(m => m.id === activeTab);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-card border-border/50 sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-foreground flex items-center gap-2.5 text-base">
            {!inHome && (
              <button
                onClick={() => setActiveTab('home')}
                className="w-8 h-8 rounded-xl bg-muted/40 flex items-center justify-center hover:bg-muted/60 transition-colors"
                aria-label="পিছনে"
              >
                <ChevronRight className="w-4 h-4 rotate-180 text-foreground" />
              </button>
            )}
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              {currentItem ? <currentItem.icon className="w-4 h-4 text-primary" /> : <Settings2 className="w-4.5 h-4.5 text-primary" />}
            </div>
            {inHome ? 'অ্যাডমিন ড্যাশবোর্ড' : currentItem?.label}
            <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-mono ml-auto">v7.1</span>
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5">
          {inHome ? (
            <div className="grid grid-cols-2 gap-3">
              {MENU_ITEMS.filter(m => m.id !== 'home').map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className="group relative overflow-hidden rounded-2xl p-4 text-left bg-gradient-to-br from-primary/5 via-card to-accent/5 border border-border/40 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">{label}</p>
                  <ChevronRight className="absolute top-3 right-3 w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          ) : (
            <div className="min-h-[200px]">
              {renderContent()}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
