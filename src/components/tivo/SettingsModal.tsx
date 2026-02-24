import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Save, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useTokens, TokenSet } from '@/hooks/useTokens';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const TOKEN_FIELDS: { key: keyof TokenSet; label: string; placeholder: string }[] = [
  { key: 'GITHUB_TOKEN', label: 'GitHub Token', placeholder: 'ghp_xxxxxxxxxxxx' },
  { key: 'VERCEL_TOKEN', label: 'Vercel Token', placeholder: 'vercel_xxxxxxxxxxxx' },
  { key: 'TAVILY_API_KEY', label: 'Tavily API Key', placeholder: 'tvly-xxxxxxxxxxxx' },
  { key: 'SUPABASE_CONFIG', label: 'Supabase Config (URL|Key)', placeholder: 'https://xxx.supabase.co|your-anon-key' },
];

export const SettingsModal = ({ open, onClose }: SettingsModalProps) => {
  const { tokens, setToken, clearAllTokens, hasToken } = useTokens();
  const [showToken, setShowToken] = useState<Record<string, boolean>>({});
  const [localTokens, setLocalTokens] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  // Sync local state when dialog opens
  if (open && !initialized) {
    const local: Record<string, string> = {};
    TOKEN_FIELDS.forEach(({ key }) => { local[key] = tokens[key]; });
    setLocalTokens(local);
    setInitialized(true);
  }
  if (!open && initialized) {
    setInitialized(false);
  }

  const handleSave = () => {
    TOKEN_FIELDS.forEach(({ key }) => {
      setToken(key, localTokens[key] || '');
    });
    toast({ title: '✅ সেভ হয়েছে', description: 'আপনার টোকেনগুলো নিরাপদে সংরক্ষিত হয়েছে।' });
    onClose();
  };

  const handleClearAll = () => {
    clearAllTokens();
    setLocalTokens({});
    toast({ title: 'মুছে ফেলা হয়েছে', description: 'সকল টোকেন রিমুভ করা হয়েছে।' });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">🔑 টোকেন ও API কনফিগারেশন</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          আপনার টোকেনগুলো শুধুমাত্র আপনার ব্রাউজারে সংরক্ষিত — অন্য কেউ এক্সেস করতে পারবে না।
        </p>

        <div className="space-y-4 pt-2">
          {TOKEN_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key} className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                {label}
                {hasToken(key) && <CheckCircle2 className="w-3 h-3 text-primary" />}
              </Label>
              <div className="relative">
                <Input
                  id={key}
                  type={showToken[key] ? 'text' : 'password'}
                  placeholder={placeholder}
                  value={localTokens[key] || ''}
                  onChange={(e) => setLocalTokens(prev => ({ ...prev, [key]: e.target.value }))}
                  className="bg-muted/50 border-border pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(prev => ({ ...prev, [key]: !prev[key] }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showToken[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} className="flex-1 gap-2">
              <Save className="w-4 h-4" /> সেভ করুন
            </Button>
            <Button variant="destructive" onClick={handleClearAll} size="icon">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
