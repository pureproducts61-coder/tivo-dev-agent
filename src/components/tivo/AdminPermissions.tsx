import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, Shield, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const ALL_FEATURES = [
  // AI Engine
  { key: 'chatStream', label: 'চ্যাট স্ট্রিমিং', category: 'AI Engine' },
  { key: 'autoBuild', label: 'অটো বিল্ড', category: 'AI Engine' },
  { key: 'fullStackBuild', label: 'ফুলস্ট্যাক বিল্ড', category: 'AI Engine' },
  { key: 'buildNative', label: 'নেটিভ বিল্ড (APK/EXE)', category: 'AI Engine' },
  { key: 'review', label: 'কোড রিভিউ', category: 'AI Engine' },
  { key: 'fix', label: 'কোড ফিক্স', category: 'AI Engine' },
  { key: 'refactor', label: 'কোড রিফ্যাক্টর', category: 'AI Engine' },
  { key: 'convert', label: 'কোড কনভার্ট', category: 'AI Engine' },
  { key: 'generateApi', label: 'API জেনারেট', category: 'AI Engine' },
  { key: 'generateDocs', label: 'ডকুমেন্টেশন জেনারেট', category: 'AI Engine' },
  { key: 'suggest', label: 'সাজেশন ও রাউটিং', category: 'AI Engine' },
  // Project Manager
  { key: 'projectCrud', label: 'প্রজেক্ট CRUD', category: 'Project' },
  { key: 'uploadFiles', label: 'ফাইল আপলোড', category: 'Project' },
  { key: 'publish', label: 'পাবলিশ', category: 'Project' },
  { key: 'download', label: 'ডাউনলোড (ZIP)', category: 'Project' },
  { key: 'versions', label: 'ভার্সন হিস্ট্রি', category: 'Project' },
  // Sandbox
  { key: 'validate', label: 'ভ্যালিডেশন', category: 'Sandbox' },
  { key: 'audit', label: 'সিকিউরিটি অডিট', category: 'Sandbox' },
  { key: 'visualAudit', label: 'ভিজ্যুয়াল অডিট', category: 'Sandbox' },
  { key: 'generateTests', label: 'টেস্ট জেনারেট', category: 'Sandbox' },
  { key: 'optimize', label: 'অপটিমাইজ', category: 'Sandbox' },
  { key: 'execute', label: 'কোড এক্সিকিউশন', category: 'Sandbox' },
  { key: 'codeToImage', label: 'কোড টু ইমেজ', category: 'Sandbox' },
  { key: 'generateSchema', label: 'স্কিমা জেনারেট', category: 'Sandbox' },
  { key: 'analyzeDeps', label: 'ডিপেন্ডেন্সি বিশ্লেষণ', category: 'Sandbox' },
];

const DEFAULT_TIERS: Record<string, Record<string, boolean>> = {
  free: Object.fromEntries(ALL_FEATURES.map(f => [f.key, ['chatStream', 'suggest', 'projectCrud', 'validate'].includes(f.key)])),
  standard: Object.fromEntries(ALL_FEATURES.map(f => [f.key, !['buildNative', 'fullStackBuild', 'execute'].includes(f.key)])),
  pro: Object.fromEntries(ALL_FEATURES.map(f => [f.key, true])),
  admin: Object.fromEntries(ALL_FEATURES.map(f => [f.key, true])),
};

export const AdminPermissions = () => {
  const { user } = useAuth();
  const [tiers, setTiers] = useState(DEFAULT_TIERS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('system_config').select('key, value').eq('key', 'feature_permissions');
      if (data?.[0]?.value) {
        setTiers(JSON.parse(data[0].value));
      }
    } catch { /* use defaults */ }
    setLoading(false);
  };

  const toggleFeature = (tier: string, feature: string) => {
    if (tier === 'admin') return; // admin always has all
    setTiers(prev => ({
      ...prev,
      [tier]: { ...prev[tier], [feature]: !prev[tier][feature] },
    }));
  };

  const savePermissions = async () => {
    setSaving(true);
    try {
      await supabase.from('system_config').upsert(
        { key: 'feature_permissions', value: JSON.stringify(tiers), updated_by: user?.id } as any,
        { onConflict: 'key' }
      );
      toast({ title: '✅ পারমিশন সেভ হয়েছে' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'ত্রুটি', description: e.message });
    }
    setSaving(false);
  };

  const tierLabels: Record<string, string> = {
    free: 'Free',
    standard: 'Standard',
    pro: 'Pro',
    admin: 'Admin',
  };

  const categories = [...new Set(ALL_FEATURES.map(f => f.category))];

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-primary" /> ফিচার পারমিশন ম্যানেজমেন্ট
        </h3>
        <Button size="sm" variant="ghost" onClick={loadPermissions} className="gap-1 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> রিফ্রেশ
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        প্রতিটি টিয়ারের জন্য ফিচার চালু/বন্ধ করুন। Admin টিয়ারে সবকিছু সবসময় চালু থাকবে।
      </p>

      <ScrollArea className="max-h-[400px]">
        {categories.map(cat => (
          <div key={cat} className="mb-4">
            <h4 className="text-xs font-semibold text-primary mb-2">{cat}</h4>
            <div className="space-y-1.5">
              {ALL_FEATURES.filter(f => f.category === cat).map(feature => (
                <div key={feature.key} className="glass-card rounded-lg p-2 flex items-center gap-3">
                  <span className="text-xs text-foreground flex-1 min-w-0 truncate">{feature.label}</span>
                  {Object.keys(tierLabels).map(tier => (
                    <div key={tier} className="flex flex-col items-center gap-0.5">
                      <span className="text-[8px] text-muted-foreground">{tierLabels[tier]}</span>
                      <Switch
                        checked={tiers[tier]?.[feature.key] ?? false}
                        onCheckedChange={() => toggleFeature(tier, feature.key)}
                        disabled={tier === 'admin'}
                        className="scale-75"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </ScrollArea>

      <Button onClick={savePermissions} disabled={saving} className="w-full gap-2">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> সেভ হচ্ছে...</> : <><Save className="w-4 h-4" /> পারমিশন সেভ করুন</>}
      </Button>
    </div>
  );
};
