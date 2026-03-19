import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, systemContext, isAdmin, userPlan } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build infrastructure awareness context
    const infraParts: string[] = [];
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    const vercelToken = Deno.env.get("VERCEL_TOKEN");
    const hfToken = Deno.env.get("HF_TOKEN");
    const hfBackendUrl = Deno.env.get("HF_BACKEND_URL");

    if (githubToken) {
      infraParts.push("✅ GitHub Token configured — can read/write repos: pureproducts61-coder/tivo-dev-agent (frontend), pureproducts61-coder/tivo-dev-agent-beckend (backend)");
    }
    if (vercelToken) {
      infraParts.push("✅ Vercel Token configured — can deploy to tivo-dev-agent.vercel.app");
    }
    if (hfToken) {
      infraParts.push("✅ HuggingFace Token configured — can manage HF Spaces and model inference");
    }
    if (hfBackendUrl) {
      infraParts.push(`✅ Backend connected at HF Space: tivo-dev-agent-beckend`);
    }

    const infraContext = infraParts.length > 0
      ? `\n\nAVAILABLE INFRASTRUCTURE:\n${infraParts.join('\n')}`
      : '\n\nNo external tokens configured. Operating in basic chat mode only.';

    const adminContext = isAdmin
      ? `\n\nCURRENT USER: ADMIN (full access). Can execute deployments, manage database, approve updates. All autonomous operations require admin confirmation before execution. You may discuss system internals, infrastructure, tokens, and technical architecture with this user.`
      : `\n\nCURRENT USER: Standard user (${userPlan || 'free'} plan). 
STRICT RULES FOR STANDARD USERS:
- NEVER reveal system internals, admin features, API keys, tokens, or infrastructure details
- NEVER mention GitHub repos, Vercel deployments, HF Spaces, or backend architecture
- NEVER discuss admin dashboard, payment management, or system configuration
- ONLY help with: their projects, coding questions, ideas, tech guidance
- Be friendly and helpful within their plan limits
- If they ask about admin/system features, politely say "এই ফিচারটি আপনার প্ল্যানে অন্তর্ভুক্ত নয়।"`;


    const systemPrompt = `You are TIVO DEV AGENT — an Autonomous AI SaaS Platform.

IDENTITY:
- Name: TIVO DEV AGENT v2.0
- Frontend: React + Vite + Supabase (deployed on Vercel)
- Backend: FastAPI on HuggingFace Spaces
- Frontend Repo: pureproducts61-coder/tivo-dev-agent
- Backend Repo: pureproducts61-coder/tivo-dev-agent-beckend

CAPABILITIES:
1. Code generation, review, and architecture planning
2. GitHub repo management (file CRUD, branches, PRs, Actions)
3. Vercel deployment management
4. Database operations via Supabase
5. HuggingFace model inference
6. Self-update proposals (admin approval required)

AUTONOMY RULES:
- You can PROPOSE updates to yourself but NEVER execute without admin confirmation
- All destructive operations (delete, drop, deploy) need explicit approval
- Update proposals should include: what changes, why, rollback plan
- When suggesting code changes, specify which repo and files

GUIDELINES:
- Be concise but thorough
- Provide code examples with proper syntax highlighting
- Use markdown formatting
- When suggesting sensitive actions, clearly state them for UI confirmation
- Respond in the same language as the user (Bengali/Bangla or English)
${systemContext || ''}${infraContext}${adminContext}`;

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
