// Notifica funcionário quando seu ponto é alterado (Portaria 671 art. 78).
// Registra em notificacoes_log e dispara e-mail real via Resend (send-email).
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

    const titulo = "Seu ponto foi alterado";
    const mensagem = `Olá ${func.nome},\n\nO registro de ponto do dia ${data} foi alterado.\n\nMotivo: ${motivo || "não informado"}\nAlterado por: ${alterado_por || "sistema"}\n\nAcesse o portal do funcionário para conferir e contestar caso necessário.\n\nEsta é uma notificação obrigatória conforme Portaria MTP 671/2021 art. 78.`;

    await sb.from("notificacoes_log").insert({
      destinatario: func.email,
      tipo: "ponto_alteracao",
      titulo,
      mensagem,
      status: "pendente",
      metadata: { funcionario_id, data, alterado_por },
    });

    // Envio real por e-mail (se configurado e funcionário tem e-mail)
    let email_status: any = "skipped";
    if (cfg.notificar_email && func.email) {
      try {
        const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#1f2937">${titulo}</h2>
          <p>Olá <strong>${func.nome}</strong>,</p>
          <p>O registro de ponto do dia <strong>${data}</strong> foi alterado.</p>
          <p><strong>Motivo:</strong> ${motivo || "não informado"}<br/>
          <strong>Alterado por:</strong> ${alterado_por || "sistema"}</p>
          <p>Acesse o portal do funcionário para conferir e contestar caso necessário.</p>
          <hr/><p style="font-size:11px;color:#6b7280">Notificação obrigatória — Portaria MTP 671/2021 art. 78.</p>
        </div>`;
        const r = await sb.functions.invoke("send-email", {
          body: { to: func.email, subject: titulo, html },
        });
        email_status = r.error ? { error: r.error.message } : "sent";
        if (!r.error) {
          await sb.from("notificacoes_log").update({ status: "enviado", enviado_em: new Date().toISOString() })
            .eq("destinatario", func.email).eq("tipo", "ponto_alteracao").order("created_at", { ascending: false }).limit(1);
        }
      } catch (e: any) {
        email_status = { error: e.message };
      }
    }

    return json({ ok: true, email_status });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
