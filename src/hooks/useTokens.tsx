import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface TokenSet {
  GITHUB_TOKEN: string;
  VERCEL_TOKEN: string;
  TAVILY_API_KEY: string;
  SUPABASE_CONFIG: string;
}

const TOKEN_KEYS: (keyof TokenSet)[] = ['GITHUB_TOKEN', 'VERCEL_TOKEN', 'TAVILY_API_KEY', 'SUPABASE_CONFIG'];

interface TokenContextType {
  tokens: TokenSet;
  getToken: (key: keyof TokenSet) => string;
  setToken: (key: keyof TokenSet, value: string) => Promise<void>;
  clearAllTokens: () => Promise<void>;
  hasToken: (key: keyof TokenSet) => boolean;
  loading: boolean;
}

const emptyTokens: TokenSet = { GITHUB_TOKEN: '', VERCEL_TOKEN: '', TAVILY_API_KEY: '', SUPABASE_CONFIG: '' };

const TokenContext = createContext<TokenContextType | undefined>(undefined);

// Legacy migration: remove old localStorage tokens once
function purgeLegacyLocalStorage(userId: string) {
  const prefix = `tivo_${userId}_`;
  TOKEN_KEYS.forEach(key => localStorage.removeItem(`${prefix}${key}`));
  // Remove pre-v7 global backend secret keys
  localStorage.removeItem('tivo_backend_url');
  localStorage.removeItem('tivo_master_secret');
}

export const TokenProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<TokenSet>({ ...emptyTokens });
  const [loading, setLoading] = useState(false);

  // Load tokens from server when user changes
  useEffect(() => {
    if (!user) {
      setTokens({ ...emptyTokens });
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_secrets')
          .select('key,value')
          .eq('user_id', user.id);
        if (cancelled) return;
        if (error) throw error;
        const loaded: any = { ...emptyTokens };
        (data || []).forEach((row: any) => {
          if (TOKEN_KEYS.includes(row.key)) loaded[row.key] = row.value || '';
        });
        setTokens(loaded);
        purgeLegacyLocalStorage(user.id);
      } catch {
        if (!cancelled) setTokens({ ...emptyTokens });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const getToken = useCallback((key: keyof TokenSet) => tokens[key], [tokens]);

  const setToken = useCallback(async (key: keyof TokenSet, value: string) => {
    if (!user) return;
    const trimmed = value.trim();
    if (trimmed) {
      await supabase
        .from('user_secrets')
        .upsert({ user_id: user.id, key, value: trimmed }, { onConflict: 'user_id,key' });
    } else {
      await supabase
        .from('user_secrets')
        .delete()
        .eq('user_id', user.id)
        .eq('key', key);
    }
    setTokens(prev => ({ ...prev, [key]: trimmed }));
  }, [user]);

  const clearAllTokens = useCallback(async () => {
    if (!user) return;
    await supabase.from('user_secrets').delete().eq('user_id', user.id).in('key', TOKEN_KEYS as string[]);
    setTokens({ ...emptyTokens });
  }, [user]);

  const hasToken = useCallback((key: keyof TokenSet) => !!tokens[key], [tokens]);

  return (
    <TokenContext.Provider value={{ tokens, getToken, setToken, clearAllTokens, hasToken, loading }}>
      {children}
    </TokenContext.Provider>
  );
};

export const useTokens = () => {
  const ctx = useContext(TokenContext);
  if (!ctx) throw new Error('useTokens must be used within TokenProvider');
  return ctx;
};
