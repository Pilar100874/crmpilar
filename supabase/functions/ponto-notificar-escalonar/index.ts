// Escalonamento — reenvia notificações não confirmadas após X horas para os contatos de escalonamento
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: configs } = await sb.from("ponto_notificacoes_config")
      .select("*").eq("escalonamento_ativo", true);

    let escalados = 0;

    for (const cfg of configs || []) {
      const est = cfg.estabelecimento_id;
      const horas = cfg.escalonamento_horas || 24;
      const limite = new Date(Date.now() - horas * 3600_000).toISOString();

      // Busca envios que ainda não foram confirmados e não foram escalados
      const { data: pendentes } = await sb.from("ponto_notificacoes_envios")
        .select("id, tipo, titulo, mensagem, funcionario_id")
        .eq("estabelecimento_id", est)
        .eq("status", "enviado")
        .is("confirmado_em", null)
        .lte("created_at", limite)
        .in("tipo", ["he_pendente", "atestado_pendente", "fraude"])
        .limit(50);

      const telefones: string[] = cfg.escalonamento_telefones ?? [];
      const emails: string[] = cfg.escalonamento_emails ?? [];

      for (const p of pendentes || []) {
        const titulo = `⬆️ ESCALONADO: ${p.titulo || p.tipo}`;
        const msg = `Sem confirmação há ${horas}h.\n\n${p.mensagem || ""}`;

        for (const t of telefones) {
          try {
            await sb.functions.invoke("ponto-notificar-canal", {
              body: {
                estabelecimento_id: est, tipo: "escalonamento",
                canais: ["whatsapp"], titulo, mensagem: msg, forcar: true,
                dados: { detalhe: `Escalonado após ${horas}h` },
              },
            });
          } catch (_) {}
        }
        // Marca como escalado (evita reescalar)
        await sb.from("ponto_notificacoes_envios").update({
          confirmado_via: "escalonado", confirmado_em: new Date().toISOString(),
        }).eq("id", p.id);
        escalados++;
      }
    }

    return new Response(JSON.stringify({ ok: true, escalados }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
