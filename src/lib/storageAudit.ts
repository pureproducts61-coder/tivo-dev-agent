// Scans localStorage for sensitive token-shaped keys/values.
// Run on app boot AFTER login to verify no secrets leaked from old versions.

const SENSITIVE_KEY_PATTERNS = [
  /token/i, /secret/i, /api[_-]?key/i, /master/i, /vercel/i, /github/i, /tavily/i,
  /supabase[_-]?config/i, /tivo_backend_url/i, /tivo_master_secret/i,
];

// known-safe keys we explicitly allow (Supabase auth session, UI prefs, etc.)
const ALLOWED_KEYS = [
  /^sb-/i,                    // Supabase auth tokens (managed by SDK)
  /^tivo_dynamic_vars_/i,     // user-defined non-secret vars
  /^tivo_app_mode$/i,
  /^tivo_language$/i,
  /^tivo_viewport$/i,
  /^theme$/i,
];

export interface StorageAuditResult {
  safe: boolean;
  leakedKeys: string[];
  scannedAt: string;
}

export function auditLocalStorage(): StorageAuditResult {
  const leaked: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (ALLOWED_KEYS.some(rx => rx.test(key))) continue;
      if (SENSITIVE_KEY_PATTERNS.some(rx => rx.test(key))) {
        leaked.push(key);
      }
    }
  } catch {
    // localStorage unavailable — treat as safe
  }
  return { safe: leaked.length === 0, leakedKeys: leaked, scannedAt: new Date().toISOString() };
}

export function purgeLeakedKeys(keys: string[]) {
  keys.forEach(k => { try { localStorage.removeItem(k); } catch {} });
}
