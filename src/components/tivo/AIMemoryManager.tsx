import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Brain, Plus, Trash2, Save, RefreshCw, Loader2, Merge, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Memory {
  id: string;
  scope: string;
  title: string;
  content: string;
  tags: string[];
  source: string;
  confidence: number;
  metadata: any;
  updated_at: string;
}

const SCOPES = ['system', 'user', 'project', 'research'];

export const AIMemoryManager = () => {
  const { user } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const [editing, setEditing] = useState<Partial<Memory> | null>(null);

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_memories')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setMemories((data || []) as Memory[]);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'লোড ত্রুটি', description: e.message });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchMemories(); }, []);

  const startNew = () => setEditing({ scope: 'system', title: '', content: '', tags: [], source: 'admin', confidence: 1.0 });

  const saveMemory = async (mode: 'overwrite' | 'merge' | 'new' = 'new') => {
    if (!editing?.title?.trim() || !editing?.content?.trim()) {
      toast({ variant: 'destructive', title: 'Title ও Content দিন' });
      return;
    }
    setSaving(true);
    try {
      const tagsArr = Array.isArray(editing.tags) ? editing.tags : String(editing.tags || '').split(',').map(s => s.trim()).filter(Boolean);

      if (mode === 'merge' && editing.id) {
        const existing = memories.find(m => m.id === editing.id);
        if (existing) {
          const merged = `${existing.content}\n\n---\n\n${editing.content}`;
          const mergedTags = Array.from(new Set([...(existing.tags || []), ...tagsArr]));
          const { error } = await supabase.from('ai_memories').update({
            content: merged, tags: mergedTags, source: 'admin_merge', updated_at: new Date().toISOString(),
          } as any).eq('id', editing.id);
          if (error) throw error;
          toast({ title: '🔀 Merge সফল' });
        }
      } else if (mode === 'overwrite' && editing.id) {
        const { error } = await supabase.from('ai_memories').update({
          title: editing.title, content: editing.content, tags: tagsArr,
          scope: editing.scope || 'system', source: 'admin_overwrite', confidence: editing.confidence ?? 1.0,
          updated_at: new Date().toISOString(),
        } as any).eq('id', editing.id);
        if (error) throw error;
        toast({ title: '♻️ Overwrite সফল' });
      } else {
        const { error } = await supabase.from('ai_memories').insert({
          title: editing.title!, content: editing.content!, tags: tagsArr,
          scope: editing.scope || 'system', source: 'admin', confidence: editing.confidence ?? 1.0,
          owner_user_id: ['user', 'project'].includes(editing.scope || '') ? user?.id : null,
        } as any);
        if (error) throw error;
        toast({ title: '✅ Memory যোগ হয়েছে' });
      }

      setEditing(null);
      fetchMemories();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'সেভ ব্যর্থ', description: e.message });
    } finally { setSaving(false); }
  };

  const deleteMemory = async (id: string) => {
    if (!confirm('এই memory delete করবেন?')) return;
    const { error } = await supabase.from('ai_memories').delete().eq('id', id);
    if (error) toast({ variant: 'destructive', title: 'ত্রুটি', description: error.message });
    else { toast({ title: '🗑️ মুছে ফেলা হয়েছে' }); fetchMemories(); }
  };

  const filtered = memories.filter(m => filter === 'all' || m.scope === filter);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">AI Permanent Memory</span>
          <Badge variant="outline" className="text-[10px]">{memories.length}</Badge>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={fetchMemories} className="h-7 rounded-lg">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </Button>
          <Button size="sm" onClick={startNew} className="h-7 gap-1 rounded-lg text-xs">
            <Plus className="w-3.5 h-3.5" /> নতুন
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground bg-muted/20 rounded-xl px-3 py-2 leading-relaxed">
        🧠 AI durable knowledge — DB-তে সেভ থাকে, GitHub-এ private repo-তে fallback backup হয়। save/overwrite/merge অপশন আছে।
      </p>

      <div className="flex flex-wrap gap-1.5">
        {(['all', ...SCOPES] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-all ${filter === s ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'}`}>
            {s}
          </button>
        ))}
      </div>

      {editing && (
        <div className="glass-card rounded-xl p-3 border border-primary/30 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Scope</Label>
              <select value={editing.scope || 'system'} onChange={(e) => setEditing({ ...editing, scope: e.target.value })}
                className="w-full mt-1 bg-muted/30 border border-border/50 rounded-lg px-2 py-1 text-xs">
                {SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Confidence (0-1)</Label>
              <Input type="number" step="0.1" min="0" max="1" value={editing.confidence ?? 1}
                onChange={(e) => setEditing({ ...editing, confidence: parseFloat(e.target.value) })}
                className="mt-1 h-7 text-xs bg-muted/30 border-border/50 rounded-lg" />
            </div>
          </div>
          <Input placeholder="Title" value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            className="h-8 text-xs bg-muted/30 border-border/50 rounded-lg" />
          <Textarea placeholder="Content..." value={editing.content || ''} onChange={(e) => setEditing({ ...editing, content: e.target.value })}
            className="text-xs min-h-[100px] bg-muted/30 border-border/50 rounded-lg" />
          <Input placeholder="tag1, tag2, ..." value={Array.isArray(editing.tags) ? editing.tags.join(', ') : (editing.tags || '')}
            onChange={(e) => setEditing({ ...editing, tags: e.target.value as any })}
            className="h-7 text-xs bg-muted/30 border-border/50 rounded-lg" />
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" onClick={() => saveMemory('new')} disabled={saving} className="h-7 gap-1 text-xs rounded-lg">
              <Save className="w-3 h-3" /> {editing.id ? 'Save as New' : 'Save'}
            </Button>
            {editing.id && (
              <>
                <Button size="sm" variant="outline" onClick={() => saveMemory('overwrite')} disabled={saving} className="h-7 gap-1 text-xs rounded-lg">
                  <FileText className="w-3 h-3" /> Overwrite
                </Button>
                <Button size="sm" variant="outline" onClick={() => saveMemory('merge')} disabled={saving} className="h-7 gap-1 text-xs rounded-lg">
                  <Merge className="w-3 h-3" /> Merge
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)} className="h-7 text-xs rounded-lg">বাতিল</Button>
          </div>
        </div>
      )}

      <ScrollArea className="max-h-[460px]">
        <div className="space-y-2 pr-2">
          {filtered.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground text-center py-6">কোনো memory নেই</p>
          )}
          {filtered.map(m => (
            <div key={m.id} className="glass-card rounded-xl p-3 border border-border/30 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-foreground">{m.title}</span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1.5">{m.scope}</Badge>
                    <Badge variant="outline" className="text-[9px] h-4 px-1.5">{m.source}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">{m.content}</p>
                  {m.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {m.tags.map(t => <span key={t} className="text-[9px] bg-muted/40 px-1.5 py-0.5 rounded">{t}</span>)}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-lg" onClick={() => setEditing(m)} title="Edit">
                    <FileText className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-lg text-destructive" onClick={() => deleteMemory(m.id)} title="Delete">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <p className="text-[9px] text-muted-foreground/70">{new Date(m.updated_at).toLocaleString('bn-BD')}</p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
