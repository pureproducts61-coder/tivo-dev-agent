import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const API_KEYS = ['GEMINI_API_KEY', 'GROQ_API_KEY', 'DEEPSEEK_API_KEY', 'HF_INFERENCE_TOKEN', 'TAVILY_API_KEY'];

export interface ConfigStatus {
  apiKeys: Record<string, boolean>;
  backend: { url: string; connected: boolean };
  supabaseConnected: boolean;
  summary: string;
}

export const useConfigStatus = () => {
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);

  const refresh = useCallback(async () => {
    const apiKeyStatus: Record<string, boolean> = {};
    try {
      const { data } = await supabase.from('system_config').select('key, value').in('key', API_KEYS);
      API_KEYS.forEach(k => {
        const found = data?.find((d: any) => d.key === k);
        apiKeyStatus[k] = !!found && (found as any).value?.length > 0;
      });
    } catch {
      API_KEYS.forEach(k => { apiKeyStatus[k] = false; });
    }

    let supabaseConnected = false;
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      supabaseConnected = !error;
    } catch {}

    const backendUrl = import.meta.env.VITE_HF_SPACE_URL || '';
    let backendConnected = false;
    if (backendUrl) {
      try {
        const r = await fetch(`${backendUrl}/functions/v1/backend-api/health`, { signal: AbortSignal.timeout(5000) }).catch(() => null);
        backendConnected = !!r?.ok;
      } catch {}
    }

    const configured = Object.entries(apiKeyStatus).filter(([, v]) => v).map(([k]) => k);
    const missing = Object.entries(apiKeyStatus).filter(([, v]) => !v).map(([k]) => k);

    const summary = [
      `Database: ${supabaseConnected ? '✅ কানেক্টেড' : '❌ কানেক্ট নেই'}`,
      `HF Backend: ${backendConnected ? '✅ কানেক্টেড' : '❌ কানেক্ট নেই'}`,
      configured.length > 0 ? `কনফিগারড API: ${configured.join(', ')}` : '',
      missing.length > 0 ? `সেট করা হয়নি: ${missing.join(', ')}` : 'সকল API কনফিগারড ✅',
    ].filter(Boolean).join('\n');

    setConfigStatus({ apiKeys: apiKeyStatus, backend: { url: backendUrl, connected: backendConnected }, supabaseConnected, summary });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { configStatus, refresh };
};
