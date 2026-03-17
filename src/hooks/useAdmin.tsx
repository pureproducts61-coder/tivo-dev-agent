import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AdminContextType {
  isAdmin: boolean;
  loading: boolean;
  checkAdmin: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType>({ isAdmin: false, loading: true, checkAdmin: async () => {} });

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const { user, session } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdmin = async () => {
    if (!session?.access_token) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('check-admin', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setIsAdmin(data?.isAdmin === true);
    } catch {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && session) {
      checkAdmin();
    } else {
      setIsAdmin(false);
      setLoading(false);
    }
  }, [user, session]);

  return (
    <AdminContext.Provider value={{ isAdmin, loading, checkAdmin }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => useContext(AdminContext);
