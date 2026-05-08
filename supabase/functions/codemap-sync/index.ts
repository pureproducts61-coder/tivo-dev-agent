import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pulls the GitHub repo file tree + DB schema digest and stores into ai_system_core
// so the AI is no longer "blind" — it knows what files exist and which DB tables it can touch.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Auth: require admin
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.replace("Bearer ", "").trim();
    if (!jwt) return json({ error: "auth required" }, 401);
    const { data: { user } } = await sb.auth.getUser(jwt);
    if (!user) return json({ error: "invalid token" }, 401);
    const { data: roleRow } = await sb.from("user_roles")
      .select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "admin only" }, 403);

    const results: any = { repo_tree: null, db_schema: null, errors: [] };

    // 1. Pull repo file tree
    if (GITHUB_TOKEN) {
      try {
        const userRes = await fetch("https://api.github.com/user", {
          headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
        });
        const ghUser = await userRes.json();
        const owner = ghUser.login;
        const repo = "tivo-dev-agent";
        const branchRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/main`, {
          headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
        });
        if (branchRes.ok) {
          const branch = await branchRes.json();
          const sha = branch.commit?.sha;
          const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`, {
            headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
          });
          if (treeRes.ok) {
            const tree = await treeRes.json();
            const files = (tree.tree || [])
              .filter((t: any) => t.type === "blob" && t.path && !t.path.includes("node_modules"))
              .map((t: any) => ({ path: t.path, size: t.size }));
            const digest = {
              repo: `${owner}/${repo}`,
              commit: sha,
              total_files: files.length,
              files: files.slice(0, 1500),
              indexed_at: new Date().toISOString(),
            };
            await sb.from("ai_system_core").upsert(
              { kind: "repo_tree", key: `${owner}/${repo}`, content: digest, source: "github" },
              { onConflict: "kind,key" }
            );
            results.repo_tree = { repo: `${owner}/${repo}`, files: files.length };
          }
        }
      } catch (e) {
        results.errors.push({ stage: "repo_tree", error: String(e) });
      }
    } else {
      results.errors.push({ stage: "repo_tree", error: "GITHUB_TOKEN missing" });
    }

    // 2. DB schema digest (table list + RLS counts)
    try {
      const tableNames = [
        "profiles", "user_credits", "user_roles", "system_config", "payment_requests",
        "projects", "project_messages", "chat_sessions", "chat_messages",
        "automation_tasks", "ai_proposals", "ai_memories", "ai_system_core",
        "ai_rollback_snapshots", "user_secrets",
      ];
      const counts: Record<string, number | string> = {};
      for (const t of tableNames) {
        const { count, error } = await sb.from(t).select("id", { count: "exact", head: true });
        counts[t] = error ? `err:${error.code}` : (count ?? 0);
      }
      const digest = { tables: counts, captured_at: new Date().toISOString() };
      await sb.from("ai_system_core").upsert(
        { kind: "db_schema", key: "public", content: digest, source: "supabase" },
        { onConflict: "kind,key" }
      );
      results.db_schema = digest;
    } catch (e) {
      results.errors.push({ stage: "db_schema", error: String(e) });
    }

    return json({ ok: true, results });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
