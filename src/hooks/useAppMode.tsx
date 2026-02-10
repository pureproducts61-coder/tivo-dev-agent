import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export type AppMode = 'plan' | 'build' | 'automation';

interface AppModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  pendingModeSwitch: AppMode | null;
  requestModeSwitch: (mode: AppMode) => void;
  confirmModeSwitch: () => void;
  cancelModeSwitch: () => void;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

export const AppModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<AppMode>('plan');
  const [pendingModeSwitch, setPendingModeSwitch] = useState<AppMode | null>(null);

  const setMode = useCallback((m: AppMode) => setModeState(m), []);

  const requestModeSwitch = useCallback((m: AppMode) => {
    if (m !== mode) setPendingModeSwitch(m);
  }, [mode]);

  const confirmModeSwitch = useCallback(() => {
    if (pendingModeSwitch) {
      setModeState(pendingModeSwitch);
      setPendingModeSwitch(null);
    }
  }, [pendingModeSwitch]);

  const cancelModeSwitch = useCallback(() => setPendingModeSwitch(null), []);

  return (
    <AppModeContext.Provider value={{ mode, setMode, pendingModeSwitch, requestModeSwitch, confirmModeSwitch, cancelModeSwitch }}>
      {children}
    </AppModeContext.Provider>
  );
};

export const useAppMode = () => {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error('useAppMode must be used within AppModeProvider');
  return ctx;
};
