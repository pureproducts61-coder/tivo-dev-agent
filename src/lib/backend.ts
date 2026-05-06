// Backend connection config — stored server-side in user_secrets.
// Master secret is NEVER stored in localStorage anymore; it lives in edge-function env (HF_MASTER_SECRET).
// The client only knows the public backend URL and proxies authenticated requests through edge functions.
import { supabase } from "@/integrations/supabase/client";

const BACKEND_URL_KEY = "BACKEND_URL"; // user_secrets.key

let cachedUrl: string | null = null;

export const getBackendUrl = async (): Promise<string | null> => {
  if (cachedUrl !== null) return cachedUrl;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('user_secrets')
    .select('value')
    .eq('user_id', user.id)
    .eq('key', BACKEND_URL_KEY)
    .maybeSingle();
  cachedUrl = data?.value || null;
  return cachedUrl;
};

export const setBackendUrl = async (url: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  await supabase
    .from('user_secrets')
    .upsert({ user_id: user.id, key: BACKEND_URL_KEY, value: url.trim() }, { onConflict: 'user_id,key' });
  cachedUrl = url.trim();
};

export const clearBackendConfig = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('user_secrets').delete().eq('user_id', user.id).eq('key', BACKEND_URL_KEY);
  cachedUrl = null;
};

export const isBackendConfigured = async (): Promise<boolean> => {
  const url = await getBackendUrl();
  return !!url;
};

/**
 * Proxy backend calls through an edge function so the master secret stays on the server.
 * The edge function reads HF_MASTER_SECRET from env and forwards the request.
 */
export const backendFetch = async (path: string, options?: RequestInit) => {
  const url = await getBackendUrl();
  if (!url) throw new Error("Backend not configured");

  const { data: { session } } = await supabase.auth.getSession();
  const res = await supabase.functions.invoke('backend-proxy', {
    body: {
      url: `${url}${path}`,
      method: options?.method || 'GET',
      headers: options?.headers || {},
      body: options?.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : null,
    },
    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
  });

  if (res.error) throw new Error(res.error.message || 'Backend proxy error');
  return new Response(JSON.stringify(res.data), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
};
