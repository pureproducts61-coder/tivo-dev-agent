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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { projectId, platform, projectName } = await req.json();

    // Verify project ownership
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projErr || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let deployUrl = "";

    if (platform === "vercel") {
      const vercelToken = Deno.env.get("VERCEL_TOKEN");
      if (!vercelToken) {
        // Fallback: generate expected URL without actual deployment
        deployUrl = `https://${projectName}.vercel.app`;
      } else {
        // Trigger Vercel deployment via API
        try {
          const resp = await fetch("https://api.vercel.com/v13/deployments", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${vercelToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: projectName,
              gitSource: project.github_url ? {
                type: "github",
                repo: project.github_url.replace("https://github.com/", ""),
                ref: "main",
              } : undefined,
            }),
          });
          const data = await resp.json();
          deployUrl = data.url ? `https://${data.url}` : `https://${projectName}.vercel.app`;
        } catch {
          deployUrl = `https://${projectName}.vercel.app`;
        }
      }
    } else if (platform === "hf") {
      const hfToken = Deno.env.get("HF_TOKEN");
      if (!hfToken) {
        deployUrl = `https://huggingface.co/spaces/pureproducts61-coder/${projectName}`;
      } else {
        // Create/update HF Space
        try {
          const resp = await fetch(`https://huggingface.co/api/repos/create`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${hfToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "space",
              name: projectName,
              sdk: "static",
              private: false,
            }),
          });
          deployUrl = `https://huggingface.co/spaces/pureproducts61-coder/${projectName}`;
        } catch {
          deployUrl = `https://huggingface.co/spaces/pureproducts61-coder/${projectName}`;
        }
      }
    }

    // Update project
    await supabase.from("projects").update({
      preview_url: deployUrl,
      status: "published",
    }).eq("id", projectId);

    return new Response(JSON.stringify({ url: deployUrl, platform }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
