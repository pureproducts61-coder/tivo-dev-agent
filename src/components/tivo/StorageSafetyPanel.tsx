import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { auditLocalStorage, purgeLeakedKeys, type StorageAuditResult } from '@/lib/storageAudit';

export const StorageSafetyPanel = () => {
  const [result, setResult] = useState<StorageAuditResult | null>(null);

  const scan = () => setResult(auditLocalStorage());

  useEffect(() => { scan(); }, []);

  const purge = () => {
    if (!result) return;
    purgeLeakedKeys(result.leakedKeys);
    scan();
  };

  if (!result) return null;
  const safe = result.safe;

  return (
    <div className={`rounded-xl border p-4 ${safe ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/10'}`}>
      <div className="flex items-start gap-3">
        {safe ? (
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        ) : (
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {safe ? 'লোকাল স্টোরেজ নিরাপদ' : 'সংবেদনশীল কী সনাক্ত হয়েছে'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {safe
              ? 'কোনো API token, secret বা master key ব্রাউজার স্টোরেজে নেই। সব secret সার্ভার-সাইডে।'
              : `${result.leakedKeys.length}টি সম্ভাব্য secret-পরিচিত key পাওয়া গেছে। অবিলম্বে মুছে ফেলুন।`}
          </p>
          {!safe && (
            <ul className="mt-2 text-[11px] font-mono text-rose-300 space-y-0.5 max-h-32 overflow-y-auto">
              {result.leakedKeys.map(k => <li key={k}>• {k}</li>)}
            </ul>
          )}
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={scan} className="h-7 text-xs gap-1.5">
              <RefreshCw className="w-3 h-3" /> পুনরায় স্ক্যান
            </Button>
            {!safe && (
              <Button size="sm" variant="destructive" onClick={purge} className="h-7 text-xs gap-1.5">
                <Trash2 className="w-3 h-3" /> মুছে ফেলুন
              </Button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/70 mt-2">
            শেষ স্ক্যান: {new Date(result.scannedAt).toLocaleString('bn-BD')}
          </p>
        </div>
      </div>
    </div>
  );
};
