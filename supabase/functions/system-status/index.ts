import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check which tokens/services are available
    const tokenStatus: Record<string, boolean> = {};
    const tokenNames = ["GITHUB_TOKEN", "VERCEL_TOKEN", "HF_TOKEN", "HF_BACKEND_URL", "HF_MASTER_SECRET"];
    
    for (const name of tokenNames) {
      tokenStatus[name] = !!Deno.env.get(name);
    }

    // Test backend connectivity if configured
    let backendStatus = "not_configured";
    const backendUrl = Deno.env.get("HF_BACKEND_URL");
    const masterSecret = Deno.env.get("HF_MASTER_SECRET");

    if (backendUrl && masterSecret) {
      try {
        const healthCheck = await fetch(`${backendUrl}/health`, {
          headers: { "X-Master-Secret": masterSecret },
          signal: AbortSignal.timeout(5000),
        });
        backendStatus = healthCheck.ok ? "connected" : "error";
      } catch {
        backendStatus = "unreachable";
      }
    }

    // Get basic stats
    const { count: userCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    const { count: pendingPayments } = await supabase.from("payment_requests").select("*", { count: "exact", head: true }).eq("status", "pending");

    const infrastructure = {
      frontend: {
        repo: "pureproducts61-coder/tivo-dev-agent",
        deployment: "tivo-dev-agent.vercel.app",
        platform: "Vercel",
      },
      backend: {
        repo: "pureproducts61-coder/tivo-dev-agent-beckend",
        space: "tivo-dev-agent-beckend",
        platform: "HuggingFace Spaces",
        status: backendStatus,
      },
    };

    return new Response(JSON.stringify({
      tokens: tokenStatus,
      infrastructure,
      stats: {
        totalUsers: userCount || 0,
        pendingPayments: pendingPayments || 0,
      },
      availableCapabilities: Object.entries(tokenStatus)
        .filter(([_, v]) => v)
        .map(([k]) => k),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
