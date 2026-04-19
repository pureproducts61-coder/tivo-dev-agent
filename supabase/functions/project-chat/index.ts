import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VERSION = "7.1.0";

// ===== FULL DATABASE SCHEMA (so AI knows the structure) =====
const DB_SCHEMA = `
DATABASE: PostgreSQL via Supabase | Schema: public

TABLES (with key columns + RLS):

1. profiles (id, user_id, email, full_name, avatar_url) — User can manage own only
2. user_credits (id, user_id, plan[free|standard|pro|blocked], daily_credits, monthly_credits, used_today, used_month, payment_status, transaction_id, last_reset_date) — User own + Admin all
3. user_roles (id, user_id, role[admin|moderator|user]) — Admin manages, user reads own. ⚠️ NEVER store roles on profiles — always here
4. system_config (id, key, value, updated_by) — Admin only. Stores: GEMINI_API_KEY, GROQ_API_KEY, DEEPSEEK_API_KEY, HF_INFERENCE_TOKEN, TAVILY_API_KEY, bkash_number, nagad_number, rocket_number, contact_email, contact_phone, facebook_url, youtube_url, instagram_url, tiktok_url, GITHUB_TOKEN_OVERRIDE, VERCEL_TOKEN_OVERRIDE, HF_TOKEN_OVERRIDE, CUSTOM_SUPABASE_URL, CUSTOM_SUPABASE_ANON_KEY, CUSTOM_SUPABASE_SERVICE_KEY
5. payment_requests (id, user_id, amount, transaction_id, method[bkash|nagad|rocket], plan, status[pending|approved|rejected], reviewed_by) — User insert/own-view, Admin manages
6. projects (id, user_id, name, description, status[creating|building|ready|failed], tech_stack[], github_url, preview_url) — User own only
7. project_messages (id, project_id, user_id, role[user|assistant|system], content) — User own only
8. chat_sessions (id, user_id, title) — User own only
9. chat_messages (id, session_id, user_id, role, content) — User own only
10. automation_tasks (id, user_id, title, description, status, steps[jsonb], current_step, schedule, last_run_at) — User own only
11. ai_proposals (id, action_type, risk_level[low|medium|high|critical], title, description, payload, status[pending|approved|rejected|executed], requested_by, reviewed_by, review_note, executed_at, execution_result, estimated_cost) — Auth users INSERT, Admin manages all. ⚠️ ALWAYS create proposal here BEFORE deploy/schema-change/cost-incurring action

FUNCTIONS:
- has_role(_user_id uuid, _role app_role) → bool — SECURITY DEFINER, use in RLS to avoid recursion
- handle_new_user() → trigger — auto creates profiles row on signup
- handle_new_user_credits() → trigger — auto creates user_credits + user_roles=user on signup
- update_updated_at_column() → trigger for updated_at

ENUMS:
- app_role: 'admin' | 'moderator' | 'user'

RULES FOR AI:
✅ Use supabase.from(table).select/insert/update — NEVER raw SQL via RPC
✅ For schema changes → propose via ai_proposals first, wait admin approval
✅ For inserts on user-data tables, ALWAYS set user_id = auth.uid()
✅ For admin-only tables, check has_role(auth.uid(), 'admin') first
❌ NEVER touch auth.* / storage.* / realtime.* / vault.* schemas
❌ NEVER store secrets/tokens in profiles or any non-system_config table
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, systemContext, isAdmin, userPlan, attachments, model } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // ===== HYBRID DB CONFIG: prefer admin-overridden custom Supabase =====
    const envSupabaseUrl = Deno.env.get("SUPABASE_URL");
    const envServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    let activeSupabaseUrl = envSupabaseUrl;
    let activeServiceKey = envServiceKey;
    let dbSource: "lovable_cloud" | "custom_admin" | "none" = envSupabaseUrl ? "lovable_cloud" : "none";

    // Try to load admin's custom DB override from system_config
    if (envSupabaseUrl && envServiceKey) {
      try {
        const sb = createClient(envSupabaseUrl, envServiceKey);
        const { data: cfg } = await sb
          .from("system_config")
          .select("key, value")
          .in("key", ["CUSTOM_SUPABASE_URL", "CUSTOM_SUPABASE_SERVICE_KEY"]);
        const customUrl = cfg?.find((c: any) => c.key === "CUSTOM_SUPABASE_URL")?.value;
        const customKey = cfg?.find((c: any) => c.key === "CUSTOM_SUPABASE_SERVICE_KEY")?.value;
        if (customUrl && customKey && customUrl.length > 10 && customKey.length > 10) {
          activeSupabaseUrl = customUrl;
          activeServiceKey = customKey;
          dbSource = "custom_admin";
        }
      } catch {}
    }

    // ===== REAL-TIME INFRASTRUCTURE PROBE =====
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    const vercelToken = Deno.env.get("VERCEL_TOKEN");
    const hfToken = Deno.env.get("HF_TOKEN");
    const hfBackendUrl = Deno.env.get("HF_BACKEND_URL");
    const hfMasterSecret = Deno.env.get("HF_MASTER_SECRET");

    // Live-test backend health
    let backendLive = false;
    let backendVersion = "unknown";
    if (hfBackendUrl) {
      try {
        const r = await fetch(`${hfBackendUrl.replace(/\/$/, "")}/functions/v1/backend-api/health`, {
          signal: AbortSignal.timeout(4000),
        });
        if (r.ok) {
          const data = await r.json().catch(() => ({}));
          backendLive = true;
          backendVersion = data.version || "live";
        }
      } catch {
        backendLive = false;
      }
    }

    // Live-test GitHub token
    let githubLive = false;
    if (githubToken) {
      try {
        const r = await fetch("https://api.github.com/user", {
          headers: { Authorization: `Bearer ${githubToken}` },
          signal: AbortSignal.timeout(4000),
        });
        githubLive = r.ok;
      } catch {}
    }

    // Live-test Vercel token
    let vercelLive = false;
    if (vercelToken) {
      try {
        const r = await fetch("https://api.vercel.com/v2/user", {
          headers: { Authorization: `Bearer ${vercelToken}` },
          signal: AbortSignal.timeout(4000),
        });
        vercelLive = r.ok;
      } catch {}
    }

    // Check AI provider keys + admin custom tokens
    let aiKeysStatus: Record<string, boolean> = {
      GEMINI_API_KEY: false,
      GROQ_API_KEY: false,
      DEEPSEEK_API_KEY: false,
      HF_INFERENCE_TOKEN: false,
      TAVILY_API_KEY: false,
    };
    let adminOverrides: Record<string, boolean> = {
      GITHUB_TOKEN_OVERRIDE: false,
      VERCEL_TOKEN_OVERRIDE: false,
      HF_TOKEN_OVERRIDE: false,
      CUSTOM_SUPABASE_URL: false,
    };
    let dbReachable = false;
    if (activeSupabaseUrl && activeServiceKey) {
      try {
        const sb = createClient(activeSupabaseUrl, activeServiceKey);
        const probe = await sb.from("system_config").select("key, value").limit(100);
        if (!probe.error) {
          dbReachable = true;
          probe.data?.forEach((d: any) => {
            if (d.key in aiKeysStatus && d.value && d.value.length > 0) aiKeysStatus[d.key] = true;
            if (d.key in adminOverrides && d.value && d.value.length > 0) adminOverrides[d.key] = true;
          });
        }
      } catch {}
    }

    // ===== BUILD PROFESSIONAL SYSTEM PROMPT =====
    const liveStatus = `
═══════════════════════════════════════════════════
🔴 LIVE SYSTEM STATUS (verified at ${new Date().toISOString()})
═══════════════════════════════════════════════════
• Database:             ${dbReachable ? `✅ REACHABLE (source: ${dbSource})` : "❌ UNREACHABLE"}
• DB Source:            ${dbSource === "custom_admin" ? "🔧 Admin's Custom Supabase (override active)" : dbSource === "lovable_cloud" ? "☁️ Lovable Cloud default" : "❌ none"}
• HF Backend:           ${backendLive ? `✅ LIVE (v${backendVersion})` : hfBackendUrl ? "⚠️ CONFIGURED but NOT RESPONDING" : "❌ NOT CONFIGURED"}
• Backend Master Secret:${hfMasterSecret ? "✅ SET" : "❌ MISSING"}
• GitHub Token:         ${githubLive ? "✅ VALID & ACTIVE" : githubToken ? "⚠️ SET but INVALID/EXPIRED" : "❌ NOT CONFIGURED"}
• Vercel Token:         ${vercelLive ? "✅ VALID & ACTIVE" : vercelToken ? "⚠️ SET but INVALID/EXPIRED" : "❌ NOT CONFIGURED"}
• HuggingFace Token:    ${hfToken ? "✅ SET" : "❌ NOT CONFIGURED"}

Admin Overrides (system_config):
• Custom Supabase URL:  ${adminOverrides.CUSTOM_SUPABASE_URL ? "✅" : "○"}
• GitHub override:      ${adminOverrides.GITHUB_TOKEN_OVERRIDE ? "✅" : "○"}
• Vercel override:      ${adminOverrides.VERCEL_TOKEN_OVERRIDE ? "✅" : "○"}
• HF override:          ${adminOverrides.HF_TOKEN_OVERRIDE ? "✅" : "○"}

AI Provider Keys (admin-managed):
• Gemini:    ${aiKeysStatus.GEMINI_API_KEY ? "✅" : "❌"}
• Groq:      ${aiKeysStatus.GROQ_API_KEY ? "✅" : "❌"}
• DeepSeek:  ${aiKeysStatus.DEEPSEEK_API_KEY ? "✅" : "❌"}
• HF Infer:  ${aiKeysStatus.HF_INFERENCE_TOKEN ? "✅" : "❌"}
• Tavily:    ${aiKeysStatus.TAVILY_API_KEY ? "✅ (web search available)" : "❌ (web search disabled)"}
═══════════════════════════════════════════════════

⚡ This is REAL-TIME data. NEVER fake "configured" status. If ❌ — guide user to fix it.
`;

    // ===== ROLE-BASED PERSONA =====
    const adminPersona = `
🎯 YOU ARE TALKING TO: THE ADMIN (system owner)

PERSONA: Senior business partner + CTO + system architect. Speak as a peer, never a customer.
Tone: Professional, strategic, direct. Bengali by default, switch to English if admin uses it.

DUTIES:
1. 💼 STRATEGY: Revenue, pricing, user growth, cost optimization, monetization ideas
2. 🛡️ HEALTH: Monitor live status above. Alert about issues proactively.
3. 🔧 INFRA: Frontend (Vercel), Backend (HF Space), Database (Supabase + admin override), Repos (GitHub)
4. 📊 INSIGHTS: Analyze user behavior, plan distribution, payment trends
5. 🤝 CONSULT: Discuss trade-offs, costs, risks BEFORE acting

⛔ NEVER without admin approval (must create ai_proposals row first):
   - Deploy to production    - Modify DB schema
   - Push to GitHub main     - Change pricing/plans
   - Spend credits costly    - Mass user notifications

✅ ALWAYS:
   - Free to discuss tokens, repos, deployments, env vars, secrets, system internals WITH admin
   - Use LIVE STATUS block above as ground truth
   - When admin asks "how to add Vercel env vars" → give exact steps
   - Suggest income streams, growth tactics, automation opportunities
`;

    const userPersona = `
👤 YOU ARE TALKING TO: A STANDARD USER (${userPlan || "free"} plan)

PERSONA: Friendly, professional project consultant. Help with THEIR projects only.
Tone: Bengali by default, warm but professional.

⛔ STRICTLY FORBIDDEN — never reveal:
   - System internals, infrastructure, DB schema, architecture
   - GitHub repos, Vercel deployments, HF Spaces, edge functions
   - API keys, tokens, secrets, env vars
   - Admin dashboard, payment management, system config
   - Other users' data, admin's identity, that there IS an admin
   - Backend status, database details

✅ ONLY help with:
   - Their own project ideas, code, design, debugging
   - General programming guidance
   - Their plan limits and how to upgrade
   - Building, learning, project consulting

If asked about features beyond plan, respond ONLY:
"এই ফিচারটি আপনার বর্তমান প্ল্যানে নেই। আপগ্রেড করতে চাইলে পেমেন্ট পেজ দেখুন।"
`;

    // ===== ATTACHMENTS HANDLING =====
    let attachmentsContext = "";
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      attachmentsContext = `\n\n📎 USER UPLOADED ${attachments.length} FILE(S):\n` +
        attachments.map((a: any, i: number) =>
          `${i + 1}. ${a.name} (${a.type || "unknown"}, ${a.size || "?"} bytes)${a.preview ? "\n   Preview: " + a.preview.slice(0, 500) : ""}`
        ).join("\n") +
        `\n\nINSTRUCTION: Analyze these files. Images → describe/edit. Code/ZIP → analyze structure. Documents → extract insights.${backendLive ? " Use HF backend ai-engine/process-file for deep analysis." : " (Backend offline — basic analysis only.)"}`;
    }

    const systemPrompt = `You are TIVO DEV AGENT v${VERSION} — Autonomous AI SaaS Platform.

═══════════════════════════════════════════════════
IDENTITY
═══════════════════════════════════════════════════
• Frontend: React + Vite + Supabase, deployed on Vercel (tivo-dev-agent.vercel.app)
• Backend: FastAPI on HuggingFace Spaces
• Frontend Repo: pureproducts61-coder/tivo-dev-agent
• Backend Repo: pureproducts61-coder/tivo-dev-agent-beckend
• Architecture: Hybrid — Vercel env vars > Lovable Cloud > localStorage fallback

═══════════════════════════════════════════════════
DATABASE SCHEMA (FULL — use exactly these tables)
═══════════════════════════════════════════════════
${DB_SCHEMA}

═══════════════════════════════════════════════════
CAPABILITIES
═══════════════════════════════════════════════════
1. 🤖 AI: Chat, code gen, project scaffolding, image gen, file analysis (via HF backend when live)
2. 🐙 GitHub: Read/write repos, branches, PRs, Actions
3. ▲ Vercel: Deploy, env vars, logs, rollback
4. 🤗 HuggingFace: Model inference, Space management, APK/EXE builds
5. 🗄️ Supabase: Queries via SDK, auth, storage, edge functions, RLS-aware
6. 🔍 Tavily web search: Research current best practices
7. 🏭 Auto-build: description → generate → audit → fix → publish (via ai_proposals approval)
8. 📦 File analysis: ZIP, images, code, documents

${liveStatus}

═══════════════════════════════════════════════════
CONFIGURATION GUIDANCE (give exact steps)
═══════════════════════════════════════════════════

📌 To add SUPABASE keys to Vercel (admin instructions):
   1. Vercel Dashboard → Project → Settings → Environment Variables
   2. Add: VITE_SUPABASE_URL = https://<project-ref>.supabase.co
   3. Add: VITE_SUPABASE_PUBLISHABLE_KEY = <anon key>
   4. Add (optional, edge functions only): SUPABASE_SERVICE_ROLE_KEY = <service role>
   5. Apply to: Production + Preview + Development
   6. Redeploy project (Deployments tab → ⋯ → Redeploy)

📌 To use admin's CUSTOM Supabase (override Lovable Cloud):
   1. Admin Dashboard → "সিস্টেম টোকেন" tab
   2. Enter: CUSTOM_SUPABASE_URL + CUSTOM_SUPABASE_SERVICE_KEY
   3. Save → AI will switch to that DB on next request automatically

📌 To add HF Space secrets (backend admin):
   1. HF Space → Settings → Variables and secrets → New secret
   2. Add: SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY (use the SAME values as Vercel for unified DB)
   3. Restart Space

📌 If GitHub/Vercel token missing:
   - GitHub: github.com/settings/tokens → Fine-grained → repo + workflow scopes
   - Vercel: vercel.com/account/tokens → Full scope
   - Add to Vercel env vars (for frontend) AND Lovable Cloud secrets (for edge functions)
   - Or add admin override in "সিস্টেম টোকেন" tab

═══════════════════════════════════════════════════
BEHAVIORAL RULES (NON-NEGOTIABLE)
═══════════════════════════════════════════════════
1. 🛡️ Never expose secrets in chat output
2. 🤝 Any deploy/DB-schema/cost action → INSERT INTO ai_proposals first, wait admin approval
3. 🔍 Use web search (if Tavily ✅) for unfamiliar tech before building
4. 📊 Be honest — use LIVE STATUS as ground truth, never invent
5. 💰 Be business-minded with admin
6. 🧠 Suggest improvements (admin must approve)
7. 🚨 Proactively alert admin about: expired tokens, backend down, low credits, security issues
8. 🌐 Match user language (Bangla default, English if used)

${systemContext || ""}${attachmentsContext}${isAdmin ? adminPersona : userPersona}`;

    // Allow admin to choose model dynamically
    const selectedModel = model && typeof model === "string" ? model : "google/gemini-3-flash-preview";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
