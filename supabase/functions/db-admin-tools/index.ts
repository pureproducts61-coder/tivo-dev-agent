import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Required public tables for TIVO platform
const REQUIRED_TABLES = [
  "profiles", "user_credits", "user_roles", "system_config",
  "payment_requests", "projects", "project_messages",
  "chat_sessions", "chat_messages", "automation_tasks",
  "ai_proposals", "ai_memories",
];

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Authorization required" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth check — require admin role
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Invalid session" }, 401);

    const adminCheck = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await adminCheck
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Admin only" }, 403);

    const { action, customUrl, customServiceKey } = await req.json();

    // ==================== TEST CONNECTION ====================
    if (action === "test_connection") {
      const url = (customUrl || "").trim();
      const key = (customServiceKey || "").trim();
      if (!url || !key) return json({ ok: false, error: "URL & service key required" });

      const startedAt = Date.now();
      let reachable = false;
      const tableStatus: Record<string, { exists: boolean; rls: boolean | null; error?: string }> = {};
      let authReachable = false;

      try {
        const target = createClient(url, key);

        // Probe each required table
        for (const t of REQUIRED_TABLES) {
          try {
            const { error } = await target.from(t).select("*", { count: "exact", head: true });
            if (!error) {
              tableStatus[t] = { exists: true, rls: null };
              reachable = true;
            } else if (/relation .* does not exist/i.test(error.message) || /not exist/i.test(error.message)) {
              tableStatus[t] = { exists: false, rls: null };
            } else {
              tableStatus[t] = { exists: true, rls: null, error: error.message };
              reachable = true;
            }
          } catch (e: any) {
            tableStatus[t] = { exists: false, rls: null, error: e.message };
          }
        }

        // RLS check using anon perspective if possible
        try {
          // We don't have the anon key here, so we approximate with a no-auth fetch
          const r = await fetch(`${url.replace(/\/$/, "")}/rest/v1/profiles?select=id&limit=1`, {
            headers: { apikey: key, Authorization: `Bearer ${key}` },
          });
          authReachable = r.status < 500;
        } catch {}
      } catch (e: any) {
        return json({ ok: false, error: e.message, tableStatus });
      }

      const missing = REQUIRED_TABLES.filter(t => !tableStatus[t]?.exists);
      return json({
        ok: reachable,
        reachable,
        authReachable,
        tableStatus,
        missingTables: missing,
        existingTables: REQUIRED_TABLES.filter(t => tableStatus[t]?.exists),
        durationMs: Date.now() - startedAt,
        summary: reachable
          ? `${REQUIRED_TABLES.length - missing.length}/${REQUIRED_TABLES.length} tables found. ${missing.length} missing.`
          : "Connection failed — verify URL & service key.",
      });
    }

    // ==================== PROPOSE BOOTSTRAP ====================
    if (action === "propose_bootstrap") {
      const url = (customUrl || "").trim();
      const key = (customServiceKey || "").trim();
      if (!url || !key) return json({ ok: false, error: "URL & service key required" });

      const target = createClient(url, key);
      const missing: string[] = [];
      for (const t of REQUIRED_TABLES) {
        try {
          const { error } = await target.from(t).select("*", { count: "exact", head: true });
          if (error && /not exist/i.test(error.message)) missing.push(t);
        } catch { missing.push(t); }
      }

      const { data: proposal, error: pErr } = await adminCheck
        .from("ai_proposals")
        .insert({
          action_type: "schema_change",
          risk_level: missing.length > 5 ? "high" : "medium",
          title: `Custom DB Schema Bootstrap (${missing.length} table)`,
          description: `Custom Supabase database-এ ${missing.length}টি প্রয়োজনীয় table তৈরি করা হবে: ${missing.join(", ") || "কোনোটিই নেই"}. RLS সহ পূর্ণ schema সেটাপ হবে।`,
          payload: { customUrl: url.replace(/\/$/, ""), missingTables: missing, existingTables: REQUIRED_TABLES.filter(t => !missing.includes(t)) },
          requested_by: userData.user.id,
          status: "pending",
        } as any)
        .select()
        .single();

      if (pErr) return json({ ok: false, error: pErr.message });
      return json({ ok: true, proposal, missingTables: missing });
    }

    // ==================== HEALTH MATRIX ====================
    if (action === "health_matrix") {
      const githubToken = Deno.env.get("GITHUB_TOKEN");
      const vercelToken = Deno.env.get("VERCEL_TOKEN");
      const hfToken = Deno.env.get("HF_TOKEN");
      const hfBackendUrl = Deno.env.get("HF_BACKEND_URL");

      const probe = async (name: string, url: string, headers: Record<string, string>) => {
        try {
          const r = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
          return { name, ok: r.ok, status: r.status };
        } catch (e: any) {
          return { name, ok: false, status: 0, error: e.message };
        }
      };

      const results: any = { db: { ok: true, source: "lovable_cloud" }, providers: {} };

      results.providers.github = githubToken
        ? await probe("GitHub", "https://api.github.com/user", { Authorization: `Bearer ${githubToken}` })
        : { name: "GitHub", ok: false, status: 0, error: "not configured" };

      results.providers.vercel = vercelToken
        ? await probe("Vercel", "https://api.vercel.com/v2/user", { Authorization: `Bearer ${vercelToken}` })
        : { name: "Vercel", ok: false, status: 0, error: "not configured" };

      results.providers.hf_backend = hfBackendUrl
        ? await probe("HF Backend", `${hfBackendUrl.replace(/\/$/, "")}/functions/v1/backend-api/health`, {})
        : { name: "HF Backend", ok: false, status: 0, error: "not configured" };

      results.providers.hf_token = { name: "HF Token", ok: !!hfToken, status: hfToken ? 200 : 0 };
      results.providers.lovable_ai = { name: "Lovable AI Gateway", ok: !!Deno.env.get("LOVABLE_API_KEY"), status: 200 };

      // Determine fallback chain
      const liveProviders = Object.entries(results.providers)
        .filter(([_, v]: any) => v.ok)
        .map(([k]) => k);

      results.fallbackChain = liveProviders.length > 0
        ? `Active: ${liveProviders.join(" → ")}`
        : "⚠️ Only Lovable AI Gateway available";

      return json({ ok: true, ...results, checkedAt: new Date().toISOString() });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    return json({ error: e.message || "Internal error" }, 500);
  }
});
