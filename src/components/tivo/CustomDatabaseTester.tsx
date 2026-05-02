import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Database, CheckCircle2, XCircle, Wand2, Eye, EyeOff } from 'lucide-react';

export const CustomDatabaseTester = () => {
  const { session } = useAuth();
  const [url, setUrl] = useState('');
  const [serviceKey, setServiceKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runTest = async () => {
    if (!url.trim() || !serviceKey.trim()) {
      toast({ variant: 'destructive', title: 'URL ও Service Key দিন' });
      return;
    }
    setTesting(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('db-admin-tools', {
        body: { action: 'test_connection', customUrl: url.trim(), customServiceKey: serviceKey.trim() },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) throw error;
      setResult(data);
      if (data?.ok) toast({ title: '✅ কানেকশন সফল', description: data.summary });
      else toast({ variant: 'destructive', title: '❌ কানেকশন ব্যর্থ', description: data?.error || 'অজানা ত্রুটি' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'ত্রুটি', description: e.message });
    } finally { setTesting(false); }
  };

  const proposeBootstrap = async () => {
    setProposing(true);
    try {
      const { data, error } = await supabase.functions.invoke('db-admin-tools', {
        body: { action: 'propose_bootstrap', customUrl: url.trim(), customServiceKey: serviceKey.trim() },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) throw error;
      if (data?.ok) toast({ title: '📝 Proposal তৈরি হয়েছে', description: `${data.missingTables?.length || 0}টি missing table-এর জন্য approval আবশ্যক।` });
      else toast({ variant: 'destructive', title: 'ত্রুটি', description: data?.error });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'ত্রুটি', description: e.message });
    } finally { setProposing(false); }
  };

  return (
    <div className="space-y-3">
      <div className="glass-card rounded-xl p-3 border border-border/40 bg-primary/5">
        <p className="text-xs text-muted-foreground leading-relaxed">
          🔌 <span className="font-semibold text-foreground">Custom Supabase Test Flow</span> — URL/Service Key দিয়ে যাচাই করুন, schema/RLS রিপোর্ট দেখুন, এবং missing table থাকলে approval-ভিত্তিক sync proposal তৈরি করুন।
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Custom Supabase URL</Label>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://xxxx.supabase.co"
          className="bg-muted/30 border-border/50 rounded-xl text-xs"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Service Role Key</Label>
        <div className="relative">
          <Input
            value={serviceKey}
            onChange={(e) => setServiceKey(e.target.value)}
            type={showKey ? 'text' : 'password'}
            placeholder="eyJhbG..."
            className="bg-muted/30 border-border/50 rounded-xl text-xs pr-10"
          />
          <button
            type="button"
            onClick={() => setShowKey(s => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={runTest} disabled={testing} className="flex-1 gap-2 rounded-xl">
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          {testing ? 'যাচাই হচ্ছে...' : 'টেস্ট করুন'}
        </Button>
        {result?.ok && result?.missingTables?.length > 0 && (
          <Button onClick={proposeBootstrap} disabled={proposing} variant="outline" className="gap-2 rounded-xl">
            {proposing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            Sync Propose
          </Button>
        )}
      </div>

      {result && (
        <div className="glass-card rounded-xl p-3 border border-border/40 space-y-2">
          <div className="flex items-center gap-2">
            {result.ok ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <XCircle className="w-4 h-4 text-destructive" />}
            <span className="text-xs font-semibold text-foreground">{result.summary || result.error}</span>
          </div>
          {result.tableStatus && (
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              {Object.entries(result.tableStatus).map(([t, s]: any) => (
                <div key={t} className={`flex items-center gap-1 px-2 py-1 rounded ${s.exists ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                  {s.exists ? '✅' : '❌'} <span className="font-mono truncate">{t}</span>
                </div>
              ))}
            </div>
          )}
          {result.durationMs && <p className="text-[10px] text-muted-foreground">⏱ {result.durationMs}ms</p>}
        </div>
      )}
    </div>
  );
};
