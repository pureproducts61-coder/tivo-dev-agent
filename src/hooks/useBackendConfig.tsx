import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { getBackendUrl, setBackendUrl, clearBackendConfig, isBackendConfigured } from '@/lib/backend';
import { useAuth } from '@/hooks/useAuth';

interface BackendConfigContextType {
  backendUrl: string | null;
  isConfigured: boolean;
  configure: (url: string, _secretIgnored?: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

const BackendConfigContext = createContext<BackendConfigContextType | undefined>(undefined);

export const BackendConfigProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [backendUrl, setUrl] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    if (!user) { setUrl(null); setConfigured(false); return; }
    (async () => {
      const u = await getBackendUrl();
      const c = await isBackendConfigured();
      setUrl(u);
      setConfigured(c);
    })();
  }, [user]);

  const configure = useCallback(async (url: string) => {
    await setBackendUrl(url);
    setUrl(url);
    setConfigured(true);
  }, []);

  const disconnect = useCallback(async () => {
    await clearBackendConfig();
    setUrl(null);
    setConfigured(false);
  }, []);

  return (
    <BackendConfigContext.Provider value={{ backendUrl, isConfigured: configured, configure, disconnect }}>
      {children}
    </BackendConfigContext.Provider>
  );
};

export const useBackendConfig = () => {
  const ctx = useContext(BackendConfigContext);
  if (!ctx) throw new Error('useBackendConfig must be used within BackendConfigProvider');
  return ctx;
};
