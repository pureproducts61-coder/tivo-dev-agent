import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Globe, Rocket, Copy, ExternalLink, Loader2, Check, GitBranch
} from 'lucide-react';

interface PublishModalProps {
  open: boolean;
  onClose: () => void;
  project: {
    id: string;
    name: string;
    description: string | null;
    github_url: string | null;
    preview_url: string | null;
  };
  onProjectUpdated?: (project: any) => void;
}

type Platform = 'vercel' | 'hf';

export const PublishModal = ({ open, onClose, project, onProjectUpdated }: PublishModalProps) => {
  const { session } = useAuth();
  const [platform, setPlatform] = useState<Platform>('vercel');
  const [projectName, setProjectName] = useState(project.name.toLowerCase().replace(/\s+/g, '-'));
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handlePublish = async () => {
    if (!session?.access_token) return;
    setPublishing(true);

    try {
      // Call edge function to trigger deployment
      const { data, error } = await supabase.functions.invoke('publish-project', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { projectId: project.id, platform, projectName },
      });

      if (error) throw error;

      const url = data?.url || (platform === 'vercel'
        ? `https://${projectName}.vercel.app`
        : `https://huggingface.co/spaces/pureproducts61-coder/${projectName}`);

      setPublishedUrl(url);

      // Update project with preview URL
      await supabase.from('projects').update({
        preview_url: url,
        status: 'published',
        updated_at: new Date().toISOString(),
      } as any).eq('id', project.id);

      if (onProjectUpdated) {
        onProjectUpdated({ ...project, preview_url: url, status: 'published' });
      }

      toast({ title: '🚀 পাবলিশ সফল!', description: `${platform === 'vercel' ? 'Vercel' : 'HuggingFace'}-এ ডিপ্লয় হয়েছে` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'পাবলিশ ত্রুটি', description: e.message || 'ডিপ্লয় করতে সমস্যা হয়েছে' });
    } finally {
      setPublishing(false);
    }
  };

  const copyUrl = () => {
    if (publishedUrl) {
      navigator.clipboard.writeText(publishedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: '📋 কপি হয়েছে!' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setPublishedUrl(null); } }}>
      <DialogContent className="glass-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" /> প্রজেক্ট পাবলিশ
          </DialogTitle>
        </DialogHeader>

        {!publishedUrl ? (
          <div className="space-y-4">
            {/* Project Name */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">প্রজেক্ট নাম</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                className="bg-muted/50 border-border font-mono text-sm"
                placeholder="my-project"
              />
            </div>

            {/* Platform Selection */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">ডিপ্লয়মেন্ট প্ল্যাটফর্ম</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPlatform('vercel')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    platform === 'vercel'
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  <Globe className="w-5 h-5 text-foreground mb-1" />
                  <p className="text-sm font-medium text-foreground">Vercel</p>
                  <p className="text-[10px] text-muted-foreground">দ্রুত ডিপ্লয়মেন্ট</p>
                </button>
                <button
                  onClick={() => setPlatform('hf')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    platform === 'hf'
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  <GitBranch className="w-5 h-5 text-foreground mb-1" />
                  <p className="text-sm font-medium text-foreground">HuggingFace</p>
                  <p className="text-[10px] text-muted-foreground">AI স্পেস</p>
                </button>
              </div>
            </div>

            {/* Preview URL */}
            <div className="glass-card rounded-xl p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">প্রিভিউ URL</p>
              <p className="text-xs font-mono text-primary">
                {platform === 'vercel'
                  ? `https://${projectName}.vercel.app`
                  : `huggingface.co/spaces/.../${projectName}`}
              </p>
            </div>

            <Button
              onClick={handlePublish}
              disabled={publishing || !projectName}
              className="w-full gap-2"
            >
              {publishing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> পাবলিশ হচ্ছে...</>
              ) : (
                <><Rocket className="w-4 h-4" /> পাবলিশ করুন</>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-1">🎉 সফলভাবে পাবলিশ হয়েছে!</p>
              <p className="text-xs text-muted-foreground">আপনার প্রজেক্ট এখন লাইভ</p>
            </div>

            <div className="glass-card rounded-xl p-3 flex items-center gap-2">
              <p className="text-xs font-mono text-primary flex-1 truncate">{publishedUrl}</p>
              <Button size="icon" variant="ghost" onClick={copyUrl} className="shrink-0 h-7 w-7">
                {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-1.5 text-xs"
                onClick={() => window.open(publishedUrl, '_blank')}
              >
                <ExternalLink className="w-3.5 h-3.5" /> ওপেন করুন
              </Button>
              <Button className="flex-1 gap-1.5 text-xs" onClick={() => { onClose(); setPublishedUrl(null); }}>
                সম্পন্ন
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
