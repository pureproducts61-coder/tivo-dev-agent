import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Save, Trash2, Plus, X, Key } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

interface KV {
  id: string;
  key: string;
  value: string;
  show?: boolean;
}

const STORAGE_KEY_PREFIX = 'tivo_dynamic_vars_';

export const SettingsModal = ({ open, onClose }: SettingsModalProps) => {
  const { user } = useAuth();
  const [vars, setVars] = useState<KV[]>([]);
  const [initialized, setInitialized] = useState(false);

  const storageKey = user ? `${STORAGE_KEY_PREFIX}${user.id}` : '';

  // Load on open
  useEffect(() => {
    if (open && user && !initialized) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setVars(parsed.map((v: any) => ({ ...v, show: false })));
          }
        } else {
          setVars([{ id: crypto.randomUUID(), key: '', value: '', show: false }]);
        }
      } catch {
        setVars([{ id: crypto.randomUUID(), key: '', value: '', show: false }]);
      }
      setInitialized(true);
    }
    if (!open) setInitialized(false);
  }, [open, user, storageKey, initialized]);

  const addVariable = () => {
    setVars(prev => [...prev, { id: crypto.randomUUID(), key: '', value: '', show: false }]);
  };

  const removeVariable = (id: string) => {
    setVars(prev => prev.filter(v => v.id !== id));
  };

  const updateVar = (id: string, field: 'key' | 'value', val: string) => {
    setVars(prev => prev.map(v => v.id === id ? { ...v, [field]: val } : v));
  };

  const toggleShow = (id: string) => {
    setVars(prev => prev.map(v => v.id === id ? { ...v, show: !v.show } : v));
  };

  const handleSave = () => {
    if (!user) return;
    const cleaned = vars.filter(v => v.key.trim()).map(v => ({
      id: v.id,
      key: v.key.trim(),
      value: v.value,
    }));
    localStorage.setItem(storageKey, JSON.stringify(cleaned));
    toast({
      title: '✅ সেভ হয়েছে',
      description: `${cleaned.length}টি ভেরিয়েবল আপনার ব্রাউজারে নিরাপদে সংরক্ষিত।`,
    });
    onClose();
  };

  const handleClearAll = () => {
    if (!user) return;
    localStorage.removeItem(storageKey);
    setVars([{ id: crypto.randomUUID(), key: '', value: '', show: false }]);
    toast({ title: 'মুছে ফেলা হয়েছে', description: 'সকল ভেরিয়েবল রিমুভ করা হয়েছে।' });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-card border-border sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Key className="w-4 h-4 text-primary" />
            </div>
            ভেরিয়েবল ম্যানেজমেন্ট
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-1">
          আপনার নিজস্ব Key-Value পেয়ার এড করুন। শুধু আপনার ব্রাউজারে সংরক্ষিত — অন্য কেউ এক্সেস করতে পারবে না।
        </p>

        <div className="space-y-3 pt-2">
          {vars.map((v, idx) => (
            <div key={v.id} className="space-y-1.5 bg-muted/20 rounded-xl p-3 border border-border/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground">#{idx + 1}</span>
                <button
                  onClick={() => removeVariable(v.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="মুছুন"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <Input
                placeholder="Key (যেমন: MY_API_KEY)"
                value={v.key}
                onChange={(e) => updateVar(v.id, 'key', e.target.value)}
                className="bg-background/50 border-border/50 text-xs font-mono h-8"
              />
              <div className="relative">
                <Input
                  type={v.show ? 'text' : 'password'}
                  placeholder="Value"
                  value={v.value}
                  onChange={(e) => updateVar(v.id, 'value', e.target.value)}
                  className="bg-background/50 border-border/50 text-xs font-mono pr-9 h-8"
                />
                <button
                  type="button"
                  onClick={() => toggleShow(v.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {v.show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}

          <Button
            onClick={addVariable}
            variant="outline"
            className="w-full gap-2 border-dashed h-9 text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Add Variable
          </Button>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} className="flex-1 gap-2 h-9">
              <Save className="w-4 h-4" /> সেভ করুন
            </Button>
            <Button variant="destructive" onClick={handleClearAll} size="icon" className="h-9 w-9">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
