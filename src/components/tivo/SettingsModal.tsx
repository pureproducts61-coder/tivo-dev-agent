import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBackendConfig } from '@/hooks/useBackendConfig';
import { Unplug, CheckCircle2 } from 'lucide-react';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsModal = ({ open, onClose }: SettingsModalProps) => {
  const { backendUrl, isConfigured, configure, disconnect } = useBackendConfig();
  const [url, setUrl] = useState(backendUrl || '');
  const [secret, setSecret] = useState('');

  const handleSave = () => {
    if (url.trim() && secret.trim()) {
      configure(url.trim(), secret.trim());
      onClose();
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setUrl('');
    setSecret('');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">ব্যাকেন্ড কনফিগারেশন</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {isConfigured && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary">সংযুক্ত: {backendUrl}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="backend-url">Backend URL</Label>
            <Input
              id="backend-url"
              placeholder="https://api.example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-muted/50 border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="master-secret">Master Secret</Label>
            <Input
              id="master-secret"
              type="password"
              placeholder="আপনার Master Secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="bg-muted/50 border-border"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">
              সংযোগ করুন
            </Button>
            {isConfigured && (
              <Button variant="destructive" onClick={handleDisconnect} size="icon">
                <Unplug className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
