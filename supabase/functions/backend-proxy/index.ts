// Edge function that forwards authenticated requests to the user's HF backend
// using the server-stored HF_MASTER_SECRET. The master secret never touches the client.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json().catch(() => ({}));
    const targetUrl: string | undefined = body?.url;
    const method: string = body?.method || 'GET';
    const headers: Record<string, string> = body?.headers || {};
    const reqBody: string | null = body?.body ?? null;

    if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
      return new Response(JSON.stringify({ error: 'Invalid url' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const masterSecret = Deno.env.get('HF_MASTER_SECRET');
    if (!masterSecret) {
      return new Response(JSON.stringify({ error: 'Backend not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const upstream = await fetch(targetUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        'X-Master-Secret': masterSecret,
      },
      body: reqBody,
    });

    const text = await upstream.text();
    let data: any = text;
    try { data = JSON.parse(text); } catch {}
    return new Response(JSON.stringify({ status: upstream.status, ok: upstream.ok, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
