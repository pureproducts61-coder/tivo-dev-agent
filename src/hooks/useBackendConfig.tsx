import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { getBackendUrl, getMasterSecret, setBackendConfig, clearBackendConfig, isBackendConfigured } from '@/lib/backend';

interface BackendConfigContextType {
  backendUrl: string | null;
  isConfigured: boolean;
  configure: (url: string, secret: string) => void;
  disconnect: () => void;
}

const BackendConfigContext = createContext<BackendConfigContextType | undefined>(undefined);

export const BackendConfigProvider = ({ children }: { children: ReactNode }) => {
  const [backendUrl, setUrl] = useState<string | null>(getBackendUrl);
  const [configured, setConfigured] = useState(isBackendConfigured);

  const configure = useCallback((url: string, secret: string) => {
    setBackendConfig(url, secret);
    setUrl(url);
    setConfigured(true);
  }, []);

  const disconnect = useCallback(() => {
    clearBackendConfig();
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
