// Cron diário: detecta atrasos, faltas, HE pendentes, atestados pendentes, banco de horas a expirar
// e dispara notificações multi-canal via ponto-notificar-canal (Push, SMS, WhatsApp, E-mail, Webhook).
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
    const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    async function dispatch(estabelecimento_id: string, tipo: string, funcionario_id: string | null, dados: any) {
      await sb.functions.invoke("ponto-notificar-canal", {
        body: { estabelecimento_id, tipo, funcionario_id, dados },
      });
      total++;
    }

    for (const cfg of configs || []) {
      const est = cfg.estabelecimento_id;

      if (cfg.notif_falta) {
        const { data: faltas } = await sb.from("ponto_espelho_diario")
          .select("funcionario_id, data, ponto_funcionarios(nome)")
          .eq("estabelecimento_id", est).eq("data", ontem).eq("status", "falta");
        for (const f of faltas || []) {
          await dispatch(est, "falta", f.funcionario_id, { data: f.data, funcionario: (f as any).ponto_funcionarios?.nome });
        }
      }

      if (cfg.notif_atraso) {
        const { data: atrasos } = await sb.from("ponto_espelho_diario")
          .select("funcionario_id, data, ponto_funcionarios(nome)")
          .eq("estabelecimento_id", est).eq("data", ontem).eq("status", "atraso");
        for (const a of atrasos || []) {
          await dispatch(est, "atraso", a.funcionario_id, { data: a.data, funcionario: (a as any).ponto_funcionarios?.nome });
        }
      }

      if (cfg.notif_he_pendente) {
        const { data: pend } = await sb.from("ponto_ajustes")
          .select("id, funcionario_id")
          .eq("estabelecimento_id", est).eq("status", "pendente").eq("tipo", "hora_extra");
        // Agrupa por funcionario
        const grupo = new Map<string, number>();
        for (const p of pend || []) grupo.set(p.funcionario_id, (grupo.get(p.funcionario_id) || 0) + 1);
        for (const [funcId, qtd] of grupo) {
          await dispatch(est, "he_pendente", funcId, { quantidade: qtd });
        }
      }

      if (cfg.notif_atestado_pendente) {
        const { data: atest } = await sb.from("ponto_atestados")
          .select("id, funcionario_id").eq("estabelecimento_id", est).eq("status", "pendente");
        if ((atest || []).length) {
          await dispatch(est, "atestado_pendente", null, { quantidade: (atest || []).length });
        }
      }

      if (cfg.notif_banco_horas_expirar) {
        const limite = new Date(Date.now() + (cfg.dias_aviso_expiracao || 15) * 86400000).toISOString().slice(0, 10);
        const { data: bh } = await sb.from("ponto_banco_horas_saldos")
          .select("funcionario_id, saldo_minutos, data_expiracao")
          .eq("estabelecimento_id", est).eq("ativo", true)
          .lte("data_expiracao", limite).gt("saldo_minutos", 0);
        for (const b of bh || []) {
          await dispatch(est, "bh_expirar", b.funcionario_id, { data_expiracao: b.data_expiracao });
        }
      }

      // Fraude: pega anomalias de alta severidade não notificadas ainda
      if (cfg.notif_fraude) {
        const { data: fraudes } = await sb.from("ponto_anomalias")
          .select("id, funcionario_id, tipo, descricao, data")
          .eq("estabelecimento_id", est).eq("severidade", "alta")
          .gte("created_at", ontem + "T00:00:00");
        for (const f of fraudes || []) {
          await dispatch(est, "fraude", f.funcionario_id, {
            detalhe: (f as any).descricao || (f as any).tipo, data: (f as any).data || hoje,
          });
        }
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
