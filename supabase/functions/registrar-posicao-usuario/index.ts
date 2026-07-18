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
      .select("id, estabelecimento_id, nome")
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

    // Registra/atualiza o dispositivo em dispositivos_rastreamento (PWA)
    const device = body?.device;
    if (device?.device_uuid) {
      const nowIso = new Date().toISOString();
      // Resumo do dispositivo a partir do UA
      const ua = String(device.modelo ?? "");
      let resumo = "Dispositivo";
      if (/iPhone/i.test(ua)) resumo = "iPhone";
      else if (/iPad/i.test(ua)) resumo = "iPad";
      else if (/Android/i.test(ua)) {
        const m = ua.match(/Android[^;)]*;\s*[^;]*;\s*([^);]+)/) || ua.match(/;\s*([^;)]+)\s*Build/i);
        resumo = (m?.[1] || "Android").trim().slice(0, 40);
      } else if (/Windows/i.test(ua)) resumo = "Windows";
      else if (/Macintosh|Mac OS/i.test(ua)) resumo = "Mac";
      else if (/Linux/i.test(ua)) resumo = "Linux";

      const nomeUsuario = (usuario as any).nome || "Usuário";
      const nomeDispositivo = `${nomeUsuario} - ${resumo}`.slice(0, 100);

      // Usa service role para bypass de RLS (dispositivos podem exigir permissão)
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: existente } = await admin
        .from("dispositivos_rastreamento")
        .select("id")
        .eq("device_uuid", device.device_uuid)
        .maybeSingle();

      if (existente?.id) {
        await admin
          .from("dispositivos_rastreamento")
          .update({
            ultimo_acesso: nowIso,
            plataforma: device.plataforma ?? null,
            modelo: device.modelo ?? null,
            nome_dispositivo: nomeDispositivo,
          })
          .eq("id", existente.id);
      } else {
        await admin.from("dispositivos_rastreamento").insert({
          device_uuid: device.device_uuid,
          estabelecimento_id: usuario.estabelecimento_id,
          nome_dispositivo: nomeDispositivo,
          modelo: device.modelo ?? null,
          plataforma: device.plataforma ?? "pwa",
          status: "pendente",
          primeiro_acesso: nowIso,
          ultimo_acesso: nowIso,
        });
      }
    }

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
