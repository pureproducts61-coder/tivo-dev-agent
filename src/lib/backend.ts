// Backend connection config — stored in localStorage
const BACKEND_URL_KEY = "tivo_backend_url";
const MASTER_SECRET_KEY = "tivo_master_secret";

export const getBackendUrl = (): string | null => localStorage.getItem(BACKEND_URL_KEY);
export const getMasterSecret = (): string | null => localStorage.getItem(MASTER_SECRET_KEY);

export const setBackendConfig = (url: string, secret: string) => {
  localStorage.setItem(BACKEND_URL_KEY, url);
  localStorage.setItem(MASTER_SECRET_KEY, secret);
};

export const clearBackendConfig = () => {
  localStorage.removeItem(BACKEND_URL_KEY);
  localStorage.removeItem(MASTER_SECRET_KEY);
};

export const isBackendConfigured = (): boolean => {
  return !!(getBackendUrl() && getMasterSecret());
};

// Generic fetch wrapper for backend API calls
export const backendFetch = async (path: string, options?: RequestInit) => {
  const url = getBackendUrl();
  const secret = getMasterSecret();
  if (!url || !secret) throw new Error("Backend not configured");

  const res = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Master-Secret": secret,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend error ${res.status}: ${text}`);
  }

  return res;
};
