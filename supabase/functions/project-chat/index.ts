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
    const { messages, isBoss } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const bossContext = isBoss
      ? `\n\nIMPORTANT: The current user is the BOSS (Sheikh Razwan Bin Roushon). They have FULL admin/execution access. You can suggest and execute any command including deployment, GitHub push, database operations, etc. Always be respectful and efficient.`
      : `\n\nThe current user has restricted access. They can chat and get suggestions, but sensitive operations (deployment, GitHub push, etc.) require boss approval.`;

    const systemPrompt = `You are TIVO DEV AGENT — an AI-powered Development Command Center assistant.

Your capabilities:
1. Help users design and architect their applications
2. Suggest best practices and technologies
3. Write code snippets and explain implementations
4. Debug issues and suggest solutions
5. Help with project planning and feature prioritization
6. Search the web for latest information when needed
7. Help with GitHub, Vercel, and Supabase operations

Guidelines:
- Be concise but thorough
- Provide code examples with proper syntax highlighting
- Use markdown formatting for readability
- When suggesting sensitive actions (Push to GitHub, Deploy to Vercel, Publish, Delete), clearly state the action so the UI can show confirmation buttons
- Respond in the same language as the user (Bengali/Bangla or English)
${bossContext}`;

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
