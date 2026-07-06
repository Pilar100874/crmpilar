import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const positions: Array<{ lat: number; lng: number; accuracy?: number; bateria?: number; data_hora?: string; origem?: string }> =
      Array.isArray(body?.positions) ? body.positions : [body];

    // Resolve usuario.id + estabelecimento
    const { data: usuario, error: uErr } = await supabase
      .from("usuarios")
      .select("id, estabelecimento_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (uErr || !usuario) {
      return new Response(JSON.stringify({ error: "usuario_nao_encontrado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = positions
      .filter((p) => typeof p?.lat === "number" && typeof p?.lng === "number")
      .map((p) => ({
        usuario_id: usuario.id,
        estabelecimento_id: usuario.estabelecimento_id,
        lat: p.lat,
        lng: p.lng,
        accuracy: p.accuracy ?? null,
        bateria: p.bateria ?? null,
        origem: p.origem ?? "pwa",
        data_hora: p.data_hora ?? new Date().toISOString(),
      }));

    if (rows.length === 0) {
      return new Response(JSON.stringify({ inserted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insErr } = await supabase.from("usuario_posicoes").insert(rows);
    if (insErr) {
      return new Response(JSON.stringify({ error: "insert_failed", details: insErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ inserted: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "internal", details: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
