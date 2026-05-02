import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Activity, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface ProviderStatus {
  name: string;
  ok: boolean;
  status: number;
  error?: string;
}

export const HealthCheckPanel = () => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('db-admin-tools', {
        body: { action: 'health_matrix' },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) throw error;
      setData(res);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'ত্রুটি', description: e.message });
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const providers = data?.providers ? Object.values(data.providers) as ProviderStatus[] : [];
  const liveCount = providers.filter(p => p.ok).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">লাইভ হেলথ চেক</span>
          {data && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${liveCount > 0 ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive'}`}>
              {liveCount}/{providers.length} live
            </span>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={refresh} disabled={loading} className="h-7 rounded-lg">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground bg-muted/20 rounded-xl px-3 py-2 leading-relaxed">
        HF Backend offline হলেও কোন কোন token/API live আছে — এখানে রিয়েলটাইম দেখা যাবে। AI fallback chain অনুসারে কাজ করবে।
      </p>

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {providers.map((p) => (
              <div key={p.name} className={`glass-card rounded-xl p-3 border ${p.ok ? 'border-primary/30' : 'border-destructive/30'}`}>
                <div className="flex items-center gap-2">
                  {p.ok ? <CheckCircle2 className="w-4 h-4 text-primary" /> : p.status === 0 ? <XCircle className="w-4 h-4 text-destructive" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                  <span className="text-xs font-semibold text-foreground">{p.name}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {p.ok ? `✓ HTTP ${p.status}` : p.error || `HTTP ${p.status}`}
                </p>
              </div>
            ))}
          </div>

          <div className="glass-card rounded-xl p-3 border border-primary/20 bg-primary/5">
            <p className="text-[11px] font-semibold text-foreground">⚡ Fallback Chain</p>
            <p className="text-[10px] text-muted-foreground mt-1">{data.fallbackChain}</p>
            {data.checkedAt && <p className="text-[9px] text-muted-foreground/70 mt-1">Checked: {new Date(data.checkedAt).toLocaleString('bn-BD')}</p>}
          </div>
        </>
      )}
    </div>
  );
};
