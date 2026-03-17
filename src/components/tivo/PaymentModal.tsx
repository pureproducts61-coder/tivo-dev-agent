import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Smartphone, CheckCircle2, Loader2 } from 'lucide-react';

const PAYMENT_METHODS = [
  { id: 'bkash', name: 'বিকাশ', color: 'bg-pink-600', number: '01XXXXXXXXX' },
  { id: 'nagad', name: 'নগদ', color: 'bg-orange-500', number: '01XXXXXXXXX' },
  { id: 'rocket', name: 'রকেট', color: 'bg-purple-600', number: '01XXXXXXXXX' },
];

const PLAN_PRICES: Record<string, number> = {
  standard: 299,
  pro: 999,
};

interface PaymentModalProps {
  plan: string | null;
  onClose: () => void;
}

export const PaymentModal = ({ plan, onClose }: PaymentModalProps) => {
  const { user } = useAuth();
  const [method, setMethod] = useState('bkash');
  const [trxId, setTrxId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!plan) return null;

  const price = PLAN_PRICES[plan] || 0;
  const selectedMethod = PAYMENT_METHODS.find(m => m.id === method)!;

  const handleSubmit = async () => {
    if (!trxId.trim() || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('payment_requests' as any).insert({
        user_id: user.id,
        plan,
        method,
        transaction_id: trxId.trim(),
        amount: price,
        status: 'pending',
      });
      if (error) throw error;
      setSubmitted(true);
      toast({ title: '✅ পেমেন্ট রিকোয়েস্ট পাঠানো হয়েছে', description: 'অ্যাডমিন যাচাই করলে আপনার প্ল্যান আপডেট হবে।' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'ত্রুটি', description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setTrxId('');
    onClose();
  };

  return (
    <Dialog open={!!plan} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="glass-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            💳 {plan === 'standard' ? 'Standard' : 'Pro'} প্ল্যান — {price}৳/মাস
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
            <p className="text-foreground font-semibold">রিকোয়েস্ট পাঠানো হয়েছে!</p>
            <p className="text-sm text-muted-foreground">অ্যাডমিন যাচাই করলে ক্রেডিট আপডেট হবে।</p>
            <Button onClick={handleClose} variant="outline">বন্ধ করুন</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Payment method selector */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">পেমেন্ট মেথড বেছে নিন</Label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                      method === m.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${m.color} flex items-center justify-center`}>
                      <Smartphone className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs font-medium text-foreground">{m.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="glass-card rounded-xl p-4 space-y-2 bg-primary/5 border-primary/10">
              <p className="text-sm font-medium text-foreground">📱 নির্দেশনা:</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>{selectedMethod.name} অ্যাপ ওপেন করুন</li>
                <li>"Send Money" বা "পেমেন্ট" এ যান</li>
                <li>নম্বর: <span className="font-mono text-primary">{selectedMethod.number}</span></li>
                <li>পরিমাণ: <span className="font-bold text-foreground">{price}৳</span></li>
                <li>ট্রানজেকশন আইডি নিচে পেস্ট করুন</li>
              </ol>
            </div>

            {/* Transaction ID */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">ট্রানজেকশন আইডি (TrxID)</Label>
              <Input
                placeholder="উদাহরণ: 2K4H8J9L0P"
                value={trxId}
                onChange={(e) => setTrxId(e.target.value)}
                className="bg-muted/50 border-border font-mono"
              />
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full gap-2"
              disabled={!trxId.trim() || submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {submitting ? 'পাঠানো হচ্ছে...' : 'পেমেন্ট রিকোয়েস্ট পাঠান'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
