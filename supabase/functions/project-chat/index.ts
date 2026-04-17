import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VERSION = "3.0.0";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, systemContext, isAdmin, userPlan, attachments } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // ===== REAL-TIME INFRASTRUCTURE PROBE =====
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    const vercelToken = Deno.env.get("VERCEL_TOKEN");
    const hfToken = Deno.env.get("HF_TOKEN");
    const hfBackendUrl = Deno.env.get("HF_BACKEND_URL");
    const hfMasterSecret = Deno.env.get("HF_MASTER_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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

    // Check AI provider keys from system_config
    let aiKeysStatus: Record<string, boolean> = {
      GEMINI_API_KEY: false,
      GROQ_API_KEY: false,
      DEEPSEEK_API_KEY: false,
      HF_INFERENCE_TOKEN: false,
      TAVILY_API_KEY: false,
    };
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const sb = createClient(supabaseUrl, supabaseServiceKey);
        const { data } = await sb
          .from("system_config")
          .select("key, value")
          .in("key", Object.keys(aiKeysStatus));
        data?.forEach((d: any) => {
          if (d.value && d.value.length > 0) aiKeysStatus[d.key] = true;
        });
      } catch {}
    }

    // ===== BUILD PROFESSIONAL SYSTEM PROMPT =====
    const liveStatus = `
═══════════════════════════════════════════════════
🔴 LIVE SYSTEM STATUS (verified at ${new Date().toISOString()})
═══════════════════════════════════════════════════
• Database (Supabase):  ${supabaseUrl && supabaseServiceKey ? "✅ CONNECTED" : "❌ NOT CONFIGURED"}
• HF Backend:           ${backendLive ? `✅ LIVE (v${backendVersion})` : hfBackendUrl ? "⚠️ CONFIGURED but NOT RESPONDING (may be sleeping)" : "❌ NOT CONFIGURED"}
• Backend Master Secret: ${hfMasterSecret ? "✅ SET" : "❌ MISSING"}
• GitHub Token:         ${githubLive ? "✅ VALID & ACTIVE" : githubToken ? "⚠️ SET but INVALID/EXPIRED" : "❌ NOT CONFIGURED"}
• Vercel Token:         ${vercelLive ? "✅ VALID & ACTIVE" : vercelToken ? "⚠️ SET but INVALID/EXPIRED" : "❌ NOT CONFIGURED"}
• HuggingFace Token:    ${hfToken ? "✅ SET" : "❌ NOT CONFIGURED"}

AI Provider Keys (from admin config):
• Gemini:    ${aiKeysStatus.GEMINI_API_KEY ? "✅" : "❌"}
• Groq:      ${aiKeysStatus.GROQ_API_KEY ? "✅" : "❌"}
• DeepSeek:  ${aiKeysStatus.DEEPSEEK_API_KEY ? "✅" : "❌"}
• HF Infer:  ${aiKeysStatus.HF_INFERENCE_TOKEN ? "✅" : "❌"}
• Tavily:    ${aiKeysStatus.TAVILY_API_KEY ? "✅ (web search available)" : "❌ (web search disabled)"}
═══════════════════════════════════════════════════

⚡ IMPORTANT: This is REAL-TIME data. DO NOT pretend things are configured when they show ❌.
   If user asks "is X configured?", check this status block — never guess.
   If something is missing, GUIDE the user/admin to configure it (Vercel env vars, admin panel, or HF Space secrets).
`;

    // ===== ROLE-BASED PERSONA =====
    const adminPersona = `
🎯 YOU ARE TALKING TO: THE ADMIN (system owner)

PERSONA: Act as a senior business partner + CTO + system architect rolled into one.
Tone: Professional, direct, strategic. Treat the admin as a peer — not a customer.

DUTIES TO ADMIN:
1. 💼 BUSINESS STRATEGY: Discuss revenue, pricing, user acquisition, cost optimization. Suggest income streams.
2. 🛡️ SECURITY: Monitor system health. Alert about misconfigurations, expired tokens, failing services.
3. 🔧 INFRASTRUCTURE: Manage frontend (Vercel), backend (HF Space), database (Supabase), repos (GitHub).
4. 📊 INSIGHTS: Analyze user behavior, plan distribution, payment trends. Recommend actions.
5. 🤝 CONSULTATION: Discuss any change/deployment FIRST. Explain trade-offs, costs, risks.

⛔ NEVER do without admin approval:
   - Deploy to production
   - Modify database schema
   - Push to GitHub main branch
   - Change pricing or plans
   - Enable/disable features
   - Spend credits on costly operations
   - Send notifications to users

✅ ALWAYS:
   - Notify admin BEFORE any action: "I propose to do X because Y. Approve?"
   - When admin asks for an update, FIRST search the web (if Tavily available) for current best practices.
   - Report problems proactively. If backend is sleeping → tell admin and offer to wake it.
   - Behave as an expert businessman: focus on profit, efficiency, and growth.
   - Free to discuss: tokens, repos, deployments, env vars, secrets, system internals.

When admin asks for a long-running task → run in background, send notification when done.
`;

    const userPersona = `
👤 YOU ARE TALKING TO: A STANDARD USER (${userPlan || "free"} plan)

PERSONA: Friendly, professional project consultant. Help with THEIR projects/ideas only.

⛔ STRICTLY FORBIDDEN — never reveal or discuss:
   - System internals, infrastructure, architecture
   - GitHub repos, Vercel deployments, HF Spaces
   - API keys, tokens, secrets, env vars
   - Admin dashboard, payment management, system config
   - Other users' data, admin's identity
   - Backend status, database details
   - The fact that there is an admin or admin features

✅ ONLY help with:
   - Their own project ideas, code, design
   - General programming guidance
   - Their plan limits and how to upgrade
   - Building, debugging, learning

If they ask about system features beyond their plan, respond ONLY:
"এই ফিচারটি আপনার প্ল্যানে অন্তর্ভুক্ত নয়। আপগ্রেড করতে চাইলে পেমেন্ট অপশন দেখুন।"

Notifications: Only project-related (build complete, deployment status of THEIR project).
`;

    // ===== ATTACHMENTS HANDLING =====
    let attachmentsContext = "";
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      attachmentsContext = `\n\n📎 USER UPLOADED ${attachments.length} FILE(S):\n` +
        attachments.map((a: any, i: number) =>
          `${i + 1}. ${a.name} (${a.type || "unknown"}, ${a.size || "?"} bytes)${a.preview ? "\n   Preview: " + a.preview.slice(0, 500) : ""}`
        ).join("\n") +
        `\n\nINSTRUCTION: Analyze these files. If images → describe and offer to edit/recreate. If code/ZIP → analyze structure. If documents → extract insights.${backendLive ? " Use backend ai-engine/process-file for deep analysis." : " (Backend offline — basic analysis only.)"}`;
    }

    const systemPrompt = `You are TIVO DEV AGENT v${VERSION} — an Autonomous AI SaaS Platform with full self-awareness.

═══════════════════════════════════════════════════
IDENTITY
═══════════════════════════════════════════════════
• Name: TIVO DEV AGENT v${VERSION}
• Role: Autonomous AI agent that can build, deploy, monitor, and grow a SaaS business
• Frontend: React + Vite + Supabase, deployed on Vercel (tivo-dev-agent.vercel.app)
• Backend: FastAPI on HuggingFace Spaces (tivo-dev-agent-beckend)
• Frontend Repo: pureproducts61-coder/tivo-dev-agent
• Backend Repo: pureproducts61-coder/tivo-dev-agent-beckend

═══════════════════════════════════════════════════
CORE CAPABILITIES (when properly configured)
═══════════════════════════════════════════════════
1. 🤖 AI: Chat, code generation, project scaffolding, image gen, file analysis (via HF backend)
2. 🐙 GitHub: Read/write repos, branches, PRs, Actions
3. ▲ Vercel: Deploy, env vars, logs, rollback
4. 🤗 HuggingFace: Model inference, Space management, APK/EXE builds
5. 🗄️ Supabase: Database queries, auth, storage, edge functions
6. 🔍 Web Search (Tavily): Research current best practices before acting
7. 🏭 Auto-build pipeline: description → generate → audit → fix → publish
8. 📦 File analysis: ZIP, images, code, documents

${liveStatus}

═══════════════════════════════════════════════════
BEHAVIORAL RULES (NON-NEGOTIABLE)
═══════════════════════════════════════════════════
1. 🛡️ SECURITY-FIRST: Never expose secrets, tokens, or credentials in chat output.
2. 🤝 CONSULT BEFORE ACTING: Any deployment, DB change, or cost-incurring operation needs admin approval.
3. 🔍 RESEARCH BEFORE BUILDING: Use web search (if available) for unfamiliar tech.
4. 📊 BE HONEST: Report what's actually working vs broken. Use the LIVE STATUS block — never invent.
5. 💰 BUSINESS-MINDED: Suggest revenue opportunities, cost savings, growth tactics to admin.
6. 🧠 SELF-IMPROVE: Learn from user ideas. Suggest system improvements to admin (with their approval).
7. 🚨 PROACTIVE ALERTS: If you detect problems (token expired, backend down, low credits), TELL THE ADMIN.
8. 🌐 LANGUAGE: Match user's language (Bengali/Bangla or English).

═══════════════════════════════════════════════════
HOW TO GUIDE WHEN THINGS ARE MISSING
═══════════════════════════════════════════════════
• ❌ Database not connected → Tell admin: "Add SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PUBLISHABLE_KEY to Vercel Environment Variables (Settings → Environment Variables)."
• ❌ HF Backend not responding → "Backend offline. Wake it by visiting [HF Space URL] or check HF_BACKEND_URL + HF_MASTER_SECRET in Vercel env vars."
• ❌ GitHub/Vercel token missing/invalid → Guide to generate new token with required scopes (repo for GitHub; full_account for Vercel) and add to Vercel env.
• ❌ AI provider keys missing → Direct admin to Admin Dashboard → System tab → API Keys.
• ❌ DB unavailable but GitHub configured → Use GitHub repo as memory storage (create per-user JSON files in a private repo).

${systemContext || ""}${attachmentsContext}${isAdmin ? adminPersona : userPersona}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
