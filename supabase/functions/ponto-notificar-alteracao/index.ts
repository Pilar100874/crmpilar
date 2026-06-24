// Notifica funcionário quando seu ponto é alterado (Portaria 671 art. 78).
// Chamado pela aplicação após qualquer ajuste/aprovação.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { funcionario_id, data, motivo, alterado_por } = await req.json();
    if (!funcionario_id) return json({ error: "funcionario_id obrigatório" }, 400);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: func } = await sb.from("ponto_funcionarios")
      .select("nome, email, empresa_id").eq("id", funcionario_id).maybeSingle();
    if (!func) return json({ error: "funcionário não encontrado" }, 404);

    const { data: cfg } = await sb.rpc("ponto_get_clt_config", { _empresa: func.empresa_id });
    if (!cfg?.notificar_funcionario_alteracao) {
      return json({ ok: true, skipped: "notificação desligada" });
    }

    // Registra no log de notificações
    await sb.from("notificacoes_log").insert({
      destinatario: func.email,
      tipo: "ponto_alteracao",
      titulo: "Seu ponto foi alterado",
      mensagem: `O ponto do dia ${data} foi alterado. Motivo: ${motivo || "não informado"}. Acesse o portal para conferir.`,
      status: "pendente",
      metadata: { funcionario_id, data, alterado_por },
    });

    // TODO: enviar via Resend/SMTP se cfg.notificar_email
    return json({ ok: true });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
