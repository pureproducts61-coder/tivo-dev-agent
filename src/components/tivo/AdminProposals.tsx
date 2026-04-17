import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import {
  Loader2, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle,
  Bell, BellOff, Zap, Database, DollarSign, Settings2, Sparkles, Shield
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AIProposal {
  id: string;
  title: string;
  description: string;
  action_type: string;
  payload: any;
  risk_level: string;
  estimated_cost: number;
  status: string;
  requested_by: string | null;
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
  executed_at: string | null;
  execution_result: any;
}

const ACTION_ICONS: Record<string, any> = {
  deployment: Zap,
  schema_change: Database,
  cost_action: DollarSign,
  config_change: Settings2,
  other: Sparkles,
};

const ACTION_LABELS: Record<string, string> = {
  deployment: 'ডিপ্লয়মেন্ট',
  schema_change: 'স্কিমা পরিবর্তন',
  cost_action: 'খরচ সম্পর্কিত',
  config_change: 'কনফিগ পরিবর্তন',
  other: 'অন্যান্য',
};

const RISK_STYLES: Record<string, string> = {
  low: 'bg-primary/15 text-primary border-primary/20',
  medium: 'bg-accent/15 text-accent border-accent/20',
  high: 'bg-orange-500/15 text-orange-500 border-orange-500/20',
  critical: 'bg-destructive/15 text-destructive border-destructive/20',
};

const RISK_LABELS: Record<string, string> = {
  low: 'নিম্ন',
  medium: 'মাঝারি',
  high: 'উচ্চ',
  critical: 'জরুরি',
};

export const AdminProposals = () => {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<AIProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all' | 'approved' | 'rejected'>('pending');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [pushEnabled, setPushEnabled] = useState(false);
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchProposals();
    checkPushPermission();

    // Realtime subscription for new proposals
    const channel = supabase
      .channel('ai_proposals_admin')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_proposals' }, (payload) => {
        const newProposal = payload.new as AIProposal;
        setProposals(prev => [newProposal, ...prev]);
        notifyNewProposal(newProposal);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ai_proposals' }, (payload) => {
        const updated = payload.new as AIProposal;
        setProposals(prev => prev.map(p => p.id === updated.id ? updated : p));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const checkPushPermission = () => {
    if (typeof Notification === 'undefined') return;
    setPushEnabled(Notification.permission === 'granted');
  };

  const requestPushPermission = async () => {
    if (typeof Notification === 'undefined') {
      toast({ variant: 'destructive', title: 'এই ব্রাউজার পুশ নোটিফিকেশন সাপোর্ট করে না' });
      return;
    }
    const result = await Notification.requestPermission();
    setPushEnabled(result === 'granted');
    if (result === 'granted') {
      toast({ title: '🔔 পুশ নোটিফিকেশন চালু হয়েছে' });
      new Notification('TIVO Admin', { body: 'নতুন AI প্রপোজাল আসলে আপনাকে জানানো হবে', icon: '/favicon.ico' });
    }
  };

  const notifyNewProposal = (proposal: AIProposal) => {
    if (seenIdsRef.current.has(proposal.id)) return;
    seenIdsRef.current.add(proposal.id);

    // Toast in app
    toast({
      title: `🤖 নতুন AI প্রপোজাল (${RISK_LABELS[proposal.risk_level] || ''})`,
      description: proposal.title,
    });

    // Browser push notification
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const isCritical = proposal.risk_level === 'critical' || proposal.risk_level === 'high';
      try {
        new Notification(`🤖 ${ACTION_LABELS[proposal.action_type] || 'AI প্রপোজাল'}`, {
          body: `${proposal.title}\n${proposal.description.slice(0, 120)}`,
          icon: '/favicon.ico',
          tag: proposal.id,
          requireInteraction: isCritical,
        });
      } catch (e) {
        console.warn('Notification failed:', e);
      }
    }
  };

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_proposals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      const list = (data || []) as AIProposal[];
      list.forEach(p => seenIdsRef.current.add(p.id));
      setProposals(list);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'লোড করা যায়নি', description: e.message });
    } finally { setLoading(false); }
  };

  const reviewProposal = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('ai_proposals')
        .update({
          status,
          reviewed_by: user?.id,
          review_note: reviewNote.trim() || null,
        } as any)
        .eq('id', id);
      if (error) throw error;
      toast({ title: status === 'approved' ? '✅ অনুমোদিত' : '❌ প্রত্যাখ্যাত' });
      setReviewingId(null);
      setReviewNote('');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'ত্রুটি', description: e.message });
    }
  };

  const filteredProposals = proposals.filter(p => filter === 'all' || p.status === filter);
  const pendingCount = proposals.filter(p => p.status === 'pending').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-primary" /> AI প্রপোজাল
          {pendingCount > 0 && (
            <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full font-bold">
              {pendingCount} পেন্ডিং
            </span>
          )}
        </h3>
        <div className="flex gap-1">
          <Button
            size="sm" variant="ghost"
            onClick={pushEnabled ? undefined : requestPushPermission}
            className="gap-1 text-xs h-7 rounded-lg"
            title={pushEnabled ? 'পুশ নোটিফিকেশন চালু আছে' : 'পুশ নোটিফিকেশন চালু করুন'}
          >
            {pushEnabled ? <Bell className="w-3.5 h-3.5 text-primary" /> : <BellOff className="w-3.5 h-3.5 text-muted-foreground" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={fetchProposals} className="gap-1 text-xs h-7 rounded-lg">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground bg-muted/20 rounded-xl px-3 py-2 leading-relaxed">
        AI deployment, schema পরিবর্তন বা খরচ-সম্পর্কিত যেকোনো অ্যাকশন করার আগে এখানে অনুমতি চাইবে।
        {!pushEnabled && ' পুশ নোটিফিকেশন চালু করতে 🔔 আইকনে ক্লিক করুন।'}
      </p>

      {/* Filter chips */}
      <div className="flex gap-1.5 flex-wrap">
        {([
          { k: 'pending', l: `পেন্ডিং (${pendingCount})` },
          { k: 'approved', l: 'অনুমোদিত' },
          { k: 'rejected', l: 'প্রত্যাখ্যাত' },
          { k: 'all', l: 'সব' },
        ] as const).map(f => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k as any)}
            className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-all ${
              filter === f.k ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : filteredProposals.length === 0 ? (
        <div className="text-center py-10 glass-card rounded-2xl border border-border/30">
          <Sparkles className="w-8 h-8 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">
            {filter === 'pending' ? 'কোনো পেন্ডিং প্রপোজাল নেই' : 'কোনো প্রপোজাল নেই'}
          </p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">
            AI কোনো গুরুত্বপূর্ণ অ্যাকশন প্রস্তাব করলে এখানে দেখাবে
          </p>
        </div>
      ) : (
        <ScrollArea className="max-h-[480px]">
          <div className="space-y-2 pr-2">
            {filteredProposals.map(p => {
              const Icon = ACTION_ICONS[p.action_type] || Sparkles;
              const isReviewing = reviewingId === p.id;
              return (
                <div key={p.id} className="glass-card rounded-2xl p-3 space-y-2 border border-border/30">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground break-words">{p.title}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground">
                            {ACTION_LABELS[p.action_type] || p.action_type}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border ${RISK_STYLES[p.risk_level] || RISK_STYLES.medium}`}>
                            ⚠ {RISK_LABELS[p.risk_level] || p.risk_level}
                          </span>
                          {p.estimated_cost > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/15 text-accent">
                              ৳{p.estimated_cost}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                      p.status === 'approved' ? 'bg-primary/15 text-primary'
                        : p.status === 'rejected' ? 'bg-destructive/15 text-destructive'
                        : p.status === 'executed' ? 'bg-accent/15 text-accent'
                        : p.status === 'failed' ? 'bg-destructive/15 text-destructive'
                        : 'bg-accent/15 text-accent'
                    }`}>
                      {p.status === 'approved' ? '✓ অনুমোদিত' : p.status === 'rejected' ? '✗ প্রত্যাখ্যাত'
                        : p.status === 'executed' ? '⚡ সম্পন্ন' : p.status === 'failed' ? '⚠ ব্যর্থ' : '⏳ পেন্ডিং'}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed break-words">{p.description}</p>

                  {p.payload && Object.keys(p.payload).length > 0 && (
                    <details className="text-[10px]">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">📋 বিস্তারিত ডেটা</summary>
                      <pre className="mt-1 bg-muted/30 rounded-lg p-2 overflow-x-auto text-[9px] font-mono">
                        {JSON.stringify(p.payload, null, 2)}
                      </pre>
                    </details>
                  )}

                  {p.review_note && (
                    <div className="text-[10px] bg-muted/20 rounded-lg p-2 border-l-2 border-primary/50">
                      <span className="font-semibold text-foreground">নোট:</span> <span className="text-muted-foreground">{p.review_note}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[9px] text-muted-foreground/70">
                    <span>{new Date(p.created_at).toLocaleString('bn-BD')}</span>
                  </div>

                  {p.status === 'pending' && (
                    <>
                      {isReviewing ? (
                        <div className="space-y-2 pt-1">
                          <Textarea
                            placeholder="রিভিউ নোট (ঐচ্ছিক)..."
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                            className="text-[11px] min-h-[60px] bg-muted/30 border-border/50 rounded-lg"
                          />
                          <div className="flex gap-1.5">
                            <Button size="sm" className="h-7 text-[10px] rounded-lg flex-1 gap-1" onClick={() => reviewProposal(p.id, 'approved')}>
                              <CheckCircle2 className="w-3 h-3" /> অনুমোদন
                            </Button>
                            <Button size="sm" variant="destructive" className="h-7 text-[10px] rounded-lg flex-1 gap-1" onClick={() => reviewProposal(p.id, 'rejected')}>
                              <XCircle className="w-3 h-3" /> প্রত্যাখ্যান
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-[10px] rounded-lg" onClick={() => { setReviewingId(null); setReviewNote(''); }}>
                              বাতিল
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-1.5 pt-1">
                          <Button size="sm" className="h-7 text-[10px] rounded-lg flex-1 gap-1" onClick={() => reviewProposal(p.id, 'approved')}>
                            <CheckCircle2 className="w-3 h-3" /> দ্রুত অনুমোদন
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 text-[10px] rounded-lg flex-1 gap-1" onClick={() => reviewProposal(p.id, 'rejected')}>
                            <XCircle className="w-3 h-3" /> দ্রুত প্রত্যাখ্যান
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg gap-1" onClick={() => setReviewingId(p.id)}>
                            নোট সহ
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
