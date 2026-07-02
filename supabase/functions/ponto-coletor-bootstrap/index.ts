// Bootstrap do Coletor Desktop: lista equipamentos ativos e recebe updates de status.
// Não exige login (verify_jwt = false). Usa anon key + service role internamente.
// Retorna apenas equipamentos ativos. A chave_comunicacao é usada pelo coletor
// para autenticar batidas no ponto-coletor-ingest.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let body: any = {};
    if (req.method === "POST") {
      try { body = await req.json(); } catch { body = {}; }
    }

    // Atualizações de status vindas do coletor (batch)
    if (Array.isArray(body.status_updates) && body.status_updates.length) {
      for (const u of body.status_updates) {
        if (!u?.id) continue;
        const updatePayload: any = {
          ultima_sync: u.ultima_sync || new Date().toISOString(),
          status: u.status || "online",
          ultimo_erro: u.ultimo_erro ?? null,
        };
        if (u.solicitar_teste !== undefined) {
          updatePayload.solicitar_teste = u.solicitar_teste;
        }
        if (u.resultado_teste !== undefined) {
          updatePayload.resultado_teste = u.resultado_teste;
        }
        await sb.from("ponto_equipamentos").update(updatePayload).eq("id", u.id);
      }
    }

    // Filtro por filial: se o coletor informar filial_id, retorna só os
    // equipamentos daquela filial (evita conflito de IPs iguais em várias filiais).
    let query = sb.from("ponto_equipamentos")
      .select("id, empresa_id, filial_id, nome, modelo, ip, porta, usuario, senha, chave_comunicacao, usa_https, ativo, status, data_inicio_coleta, solicitar_teste")
      .eq("ativo", true);
    if (body.filial_id) query = query.eq("filial_id", body.filial_id);
    const { data, error } = await query;
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, equipamentos: data || [] }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
