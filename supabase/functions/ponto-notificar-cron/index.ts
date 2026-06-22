// Cron diário: detecta atrasos, faltas, HE pendentes, atestados pendentes, banco de horas a expirar
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: configs } = await sb.from("ponto_notificacoes_config").select("*");

    let total = 0;
    const hoje = new Date().toISOString().slice(0, 10);

    for (const cfg of configs || []) {
      const alertas: any[] = [];

      if (cfg.notif_falta) {
        const { data: faltas } = await sb.from("ponto_espelho_diario")
          .select("*, ponto_funcionarios(nome)")
          .eq("estabelecimento_id", cfg.estabelecimento_id)
          .eq("data", new Date(Date.now() - 86400000).toISOString().slice(0, 10))
          .eq("status", "falta");
        for (const f of faltas || []) {
          alertas.push({ tipo: "falta", funcionario: (f as any).ponto_funcionarios?.nome, data: f.data });
        }
      }

      if (cfg.notif_he_pendente) {
        const { data: pend } = await sb.from("ponto_ajustes")
          .select("id, funcionario_id")
          .eq("estabelecimento_id", cfg.estabelecimento_id)
          .eq("status", "pendente").eq("tipo", "hora_extra");
        if ((pend || []).length) alertas.push({ tipo: "he_pendente", quantidade: (pend || []).length });
      }

      if (cfg.notif_atestado_pendente) {
        const { data: atest } = await sb.from("ponto_atestados")
          .select("id").eq("estabelecimento_id", cfg.estabelecimento_id).eq("status", "pendente");
        if ((atest || []).length) alertas.push({ tipo: "atestado_pendente", quantidade: (atest || []).length });
      }

      if (cfg.notif_banco_horas_expirar) {
        const limite = new Date(Date.now() + cfg.dias_aviso_expiracao * 86400000).toISOString().slice(0, 10);
        const { data: bh } = await sb.from("ponto_banco_horas_saldos")
          .select("funcionario_id, saldo_minutos, data_expiracao")
          .eq("estabelecimento_id", cfg.estabelecimento_id).eq("ativo", true)
          .lte("data_expiracao", limite).gt("saldo_minutos", 0);
        for (const b of bh || []) alertas.push({ tipo: "bh_expirar", ...b });
      }

      if (alertas.length === 0) continue;
      total += alertas.length;

      await sb.from("ponto_alertas").insert(alertas.map((a) => ({
        estabelecimento_id: cfg.estabelecimento_id,
        tipo: a.tipo, severidade: "media",
        mensagem: JSON.stringify(a), data_referencia: hoje,
      })));

      // Webhook opcional
      if (cfg.webhook_url) {
        try {
          await fetch(cfg.webhook_url, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estabelecimento_id: cfg.estabelecimento_id, alertas, data: hoje }),
          });
        } catch (_) { /* ignore */ }
      }
    }

    return new Response(JSON.stringify({ ok: true, total }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
