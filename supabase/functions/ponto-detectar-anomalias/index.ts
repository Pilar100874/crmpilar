// Detecta anomalias CLT cruzando ponto_espelho_diario + ponto_registros com ponto_clt_config.
// Pode ser chamado on-demand pela tela ou via cron diário.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { empresa_id, dias = 30 } = await req.json().catch(() => ({}));
    if (!empresa_id) return json({ error: "empresa_id obrigatório" }, 400);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: cfg } = await sb.rpc("ponto_get_clt_config", { _empresa: empresa_id });
    if (!cfg) return json({ error: "config não encontrada" }, 404);

    const since = new Date(); since.setDate(since.getDate() - dias);
    const sinceStr = since.toISOString().slice(0, 10);

    // 1) Espelhos com HE / jornada acima dos limites
    const { data: espelhos } = await sb.from("ponto_espelho_diario")
      .select("funcionario_id, data, extra_min, trabalho_min, ponto_funcionarios!inner(empresa_id, nome)")
      .gte("data", sinceStr);

    let detectadas = 0;
    const anomalias: any[] = [];

    for (const e of (espelhos || []).filter((x: any) => x.ponto_funcionarios?.empresa_id === empresa_id)) {
      if ((e.extra_min || 0) > cfg.max_horas_extras_dia_min) {
        anomalias.push({
          empresa_id, funcionario_id: e.funcionario_id, data: e.data,
          tipo: "he_acima_limite",
          severidade: e.extra_min > cfg.max_horas_extras_dia_min * 2 ? "critica" : "alta",
          descricao: `HE de ${e.extra_min} min excede limite de ${cfg.max_horas_extras_dia_min} min`,
          detalhes: { he_min: e.extra_min, limite_min: cfg.max_horas_extras_dia_min },
        });
      }
      if ((e.trabalho_min || 0) > cfg.max_jornada_total_dia_min) {
        anomalias.push({
          empresa_id, funcionario_id: e.funcionario_id, data: e.data,
          tipo: "jornada_acima_limite", severidade: "alta",
          descricao: `Jornada de ${e.trabalho_min} min excede ${cfg.max_jornada_total_dia_min} min/dia`,
          detalhes: { jornada_min: e.trabalho_min, limite_min: cfg.max_jornada_total_dia_min },
        });
      }
    }

    // 2) Interjornada — busca pares consecutivos de batidas saída→entrada
    const { data: regs } = await sb.from("ponto_registros")
      .select("funcionario_id, data_hora, tipo, ponto_funcionarios!inner(empresa_id)")
      .gte("data_hora", since.toISOString())
      .order("funcionario_id").order("data_hora");

    const porFunc: Record<string, any[]> = {};
    for (const r of (regs || []).filter((x: any) => x.ponto_funcionarios?.empresa_id === empresa_id)) {
      (porFunc[r.funcionario_id] = porFunc[r.funcionario_id] || []).push(r);
    }
    const interMs = cfg.interjornada_min_horas * 3600 * 1000;
    for (const [funcId, lista] of Object.entries(porFunc)) {
      for (let i = 1; i < lista.length; i++) {
        const dt = new Date(lista[i].data_hora).getTime() - new Date(lista[i - 1].data_hora).getTime();
        if (dt > 0 && dt < interMs) {
          // Só conta se houve troca de "dia" (provável fim de expediente → início do próximo)
          const d1 = new Date(lista[i - 1].data_hora).toDateString();
          const d2 = new Date(lista[i].data_hora).toDateString();
          if (d1 !== d2) {
            anomalias.push({
              empresa_id, funcionario_id: funcId, data: lista[i].data_hora.slice(0, 10),
              tipo: "interjornada_violada", severidade: "alta",
              descricao: `Interjornada de ${(dt / 3600000).toFixed(1)}h, mínimo ${cfg.interjornada_min_horas}h`,
              detalhes: { horas: dt / 3600000, minimo: cfg.interjornada_min_horas },
            });
          }
        }
      }
    }

    // 3) Padrão suspeito: jornada sempre exatamente 480 min
    if (cfg.detectar_padrao_suspeito) {
      const { data: exatos } = await sb.from("ponto_espelho_diario")
        .select("funcionario_id, ponto_funcionarios!inner(empresa_id, nome)")
        .eq("trabalho_min", 480)
        .gte("data", sinceStr);
      const cnt: Record<string, number> = {};
      for (const e of (exatos || []).filter((x: any) => x.ponto_funcionarios?.empresa_id === empresa_id)) {
        cnt[e.funcionario_id] = (cnt[e.funcionario_id] || 0) + 1;
      }
      for (const [funcId, n] of Object.entries(cnt)) {
        if (n >= 15) { // 15+ dias exatos = suspeito
          anomalias.push({
            empresa_id, funcionario_id: funcId, data: sinceStr,
            tipo: "padrao_suspeito", severidade: "media",
            descricao: `${n} dias com jornada de exatos 8h00 — investigar autenticidade`,
            detalhes: { dias: n },
          });
        }
      }
    }

    // Insere lote (sem duplicar — checa por funcionario+data+tipo do dia)
    for (const a of anomalias) {
      const { data: existe } = await sb.from("ponto_anomalias")
        .select("id").eq("funcionario_id", a.funcionario_id)
        .eq("data", a.data).eq("tipo", a.tipo).eq("resolvida", false).maybeSingle();
      if (existe) continue;
      const { error } = await sb.from("ponto_anomalias").insert(a);
      if (!error) detectadas++;
    }

    return json({ ok: true, detectadas, analisadas: anomalias.length });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
