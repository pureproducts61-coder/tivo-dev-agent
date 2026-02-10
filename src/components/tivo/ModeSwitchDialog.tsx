import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppMode } from '@/hooks/useAppMode';

export const ModeSwitchDialog = () => {
  const { pendingModeSwitch, confirmModeSwitch, cancelModeSwitch } = useAppMode();

  if (!pendingModeSwitch) return null;

  const modeLabels: Record<string, string> = {
    build: 'Build মোড',
    automation: 'Automation মোড',
    plan: 'Plan মোড',
  };

  return (
    <Dialog open={!!pendingModeSwitch} onOpenChange={() => cancelModeSwitch()}>
      <DialogContent className="glass-card border-border sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>মোড পরিবর্তন</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          ব্যাকেন্ড <strong>{modeLabels[pendingModeSwitch]}</strong>-এ যেতে অনুরোধ করেছে। আপনি কি অনুমতি দিচ্ছেন?
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={cancelModeSwitch}>বাতিল</Button>
          <Button onClick={confirmModeSwitch}>অনুমতি দিন</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
