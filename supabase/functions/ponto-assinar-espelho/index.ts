// Fluxo de assinatura eletrônica do espelho de ponto mensal
// Ações: enviar (RH), visualizar (funcionário via token), aceitar/rejeitar (funcionário)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashEspelho(rows: any[]) {
  const payload = rows.map(r =>
    `${r.data}|${r.entrada||''}|${r.saida||''}|${r.minutos_trabalhados}|${r.extra_min}|${r.falta?1:0}`
  ).join("\n");
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const { action } = body;
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (action === "enviar") {
      const { funcionario_id, mes_referencia } = body;
      const ini = `${mes_referencia.slice(0,7)}-01`;
      const fimDate = new Date(ini); fimDate.setUTCMonth(fimDate.getUTCMonth()+1); fimDate.setUTCDate(0);
      const fim = fimDate.toISOString().slice(0,10);

      const { data: dias } = await sb.from("ponto_espelho_diario").select("*")
        .eq("funcionario_id", funcionario_id).gte("data", ini).lte("data", fim).order("data");
      const hash = await hashEspelho(dias || []);

      const { data: envio, error } = await sb.from("ponto_espelho_envios").upsert({
        funcionario_id, mes_referencia: ini, status: "enviado",
        hash_espelho: hash, enviado_em: new Date().toISOString(),
      }, { onConflict: "funcionario_id,mes_referencia" }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, envio, hash }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "visualizar") {
      const { token } = body;
      const { data: envio } = await sb.from("ponto_espelho_envios").select("*").eq("token", token).maybeSingle();
      if (!envio) throw new Error("Token inválido");
      if (envio.status === "enviado") {
        await sb.from("ponto_espelho_envios").update({
          status: "visualizado", visualizado_em: new Date().toISOString(),
        }).eq("id", envio.id);
      }
      const ini = envio.mes_referencia;
      const fimDate = new Date(ini); fimDate.setUTCMonth(fimDate.getUTCMonth()+1); fimDate.setUTCDate(0);
      const fim = fimDate.toISOString().slice(0,10);
      const { data: dias } = await sb.from("ponto_espelho_diario").select("*")
        .eq("funcionario_id", envio.funcionario_id).gte("data", ini).lte("data", fim).order("data");
      const { data: func } = await sb.from("ponto_funcionarios").select("nome, cpf, matricula").eq("id", envio.funcionario_id).single();
      return new Response(JSON.stringify({ ok: true, envio, dias, funcionario: func }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "responder") {
      const { token, aceite, motivo_rejeicao, ip, geo_lat, geo_lon, assinatura_base64 } = body;
      const { data: envio } = await sb.from("ponto_espelho_envios").select("*").eq("token", token).maybeSingle();
      if (!envio) throw new Error("Token inválido");

      if (aceite) {
        await sb.from("ponto_assinaturas_espelho").upsert({
          funcionario_id: envio.funcionario_id,
          mes_referencia: envio.mes_referencia,
          hash: envio.hash_espelho,
          hash_documento: envio.hash_espelho,
          assinado_em: new Date().toISOString(),
          assinatura_digital_base64: assinatura_base64 || null,
          ip, geo_lat, geo_lon,
        }, { onConflict: "funcionario_id,mes_referencia" });
      }
      await sb.from("ponto_espelho_envios").update({
        status: aceite ? "assinado" : "rejeitado",
        respondido_em: new Date().toISOString(),
        motivo_rejeicao: aceite ? null : motivo_rejeicao,
      }).eq("id", envio.id);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("ação inválida");
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
