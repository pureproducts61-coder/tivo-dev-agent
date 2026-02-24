import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

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
  setToken: (key: keyof TokenSet, value: string) => void;
  clearAllTokens: () => void;
  hasToken: (key: keyof TokenSet) => boolean;
}

const emptyTokens: TokenSet = { GITHUB_TOKEN: '', VERCEL_TOKEN: '', TAVILY_API_KEY: '', SUPABASE_CONFIG: '' };

const TokenContext = createContext<TokenContextType | undefined>(undefined);

function storagePrefix(userId: string) {
  return `tivo_${userId}_`;
}

export const TokenProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<TokenSet>({ ...emptyTokens });

  // Load tokens when user changes
  useEffect(() => {
    if (!user) {
      setTokens({ ...emptyTokens });
      return;
    }
    const prefix = storagePrefix(user.id);
    const loaded: any = {};
    TOKEN_KEYS.forEach(key => {
      loaded[key] = localStorage.getItem(`${prefix}${key}`) || '';
    });
    setTokens(loaded);
  }, [user]);

  const getToken = useCallback((key: keyof TokenSet) => tokens[key], [tokens]);

  const setToken = useCallback((key: keyof TokenSet, value: string) => {
    if (!user) return;
    const prefix = storagePrefix(user.id);
    const trimmed = value.trim();
    if (trimmed) {
      localStorage.setItem(`${prefix}${key}`, trimmed);
    } else {
      localStorage.removeItem(`${prefix}${key}`);
    }
    setTokens(prev => ({ ...prev, [key]: trimmed }));
  }, [user]);

  const clearAllTokens = useCallback(() => {
    if (!user) return;
    const prefix = storagePrefix(user.id);
    TOKEN_KEYS.forEach(key => localStorage.removeItem(`${prefix}${key}`));
    setTokens({ ...emptyTokens });
  }, [user]);

  const hasToken = useCallback((key: keyof TokenSet) => !!tokens[key], [tokens]);

  return (
    <TokenContext.Provider value={{ tokens, getToken, setToken, clearAllTokens, hasToken }}>
      {children}
    </TokenContext.Provider>
  );
};

export const useTokens = () => {
  const ctx = useContext(TokenContext);
  if (!ctx) throw new Error('useTokens must be used within TokenProvider');
  return ctx;
};
