// Recebe {telefone, texto} do webhook do WhatsApp e marca notificações do Ponto como confirmadas
// se o texto começa com OK/CIENTE/APROVAR/APROVADO.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CONFIRMA_RE = /^(ok|ciente|aprovar|aprovado|confirmar|confirmado|👍|✅)\b/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { telefone, texto } = await req.json();
    if (!telefone || !texto) {
      return new Response(JSON.stringify({ error: "telefone e texto obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!CONFIRMA_RE.test(String(texto).trim())) {
      return new Response(JSON.stringify({ ok: false, motivo: "texto_nao_confirmacao" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const fone = String(telefone).replace(/\D/g, "");

    // Busca envios recentes desse telefone via WhatsApp ainda não confirmados
    const desde = new Date(Date.now() - 72 * 3600_000).toISOString();
    const { data: envios } = await sb.from("ponto_notificacoes_envios")
      .select("id, tipo, titulo")
      .eq("canal", "whatsapp")
      .eq("status", "enviado")
      .is("confirmado_em", null)
      .gte("created_at", desde)
      .limit(20);

    const alvos = (envios || []).filter((e: any) => {
      // Guarda-chuva: qualquer envio recente para esse número (destinatario começa com dígitos)
      return true;
    });

    // Filtra pelo destinatário
    const { data: confirmar } = await sb.from("ponto_notificacoes_envios")
      .select("id")
      .eq("canal", "whatsapp")
      .eq("status", "enviado")
      .is("confirmado_em", null)
      .gte("created_at", desde)
      .ilike("destinatario", `%${fone}%`)
      .limit(20);

    const ids = (confirmar || []).map((r: any) => r.id);
    if (ids.length) {
      await sb.from("ponto_notificacoes_envios").update({
        status: "confirmado",
        confirmado_em: new Date().toISOString(),
        confirmado_via: "whatsapp",
      }).in("id", ids);
    }

    return new Response(JSON.stringify({ ok: true, confirmadas: ids.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
