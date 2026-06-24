// Régua de escalonamento — promove aprovações pendentes ao próximo nível quando SLA estoura.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { data: pendentes, error } = await supabase
      .from("ponto_aprovacao_fluxo")
      .select("*")
      .eq("status", "pendente")
      .lt("prazo_em", new Date().toISOString())
      .limit(500);
    if (error) throw error;

    const resultados: any[] = [];
    for (const fluxo of pendentes ?? []) {
      const { data: regra } = await supabase
        .from("ponto_aprovacao_regras")
        .select("*")
        .eq("id", fluxo.regra_id)
        .maybeSingle();
      const niveis = (regra?.niveis ?? []) as any[];
      const proximoNivel = fluxo.nivel_atual + 1;

      if (proximoNivel > niveis.length) {
        // Sem mais níveis — marca como escalado para administrador
        await supabase.from("ponto_aprovacao_fluxo").update({
          status: "escalado",
          escalado_em: new Date().toISOString(),
          observacao: `${fluxo.observacao ?? ""}\n[SLA estourado em todos os níveis]`,
        }).eq("id", fluxo.id);

        await supabase.from("ponto_anomalias").insert({
          empresa_id: fluxo.empresa_id,
          funcionario_id: null,
          data: new Date().toISOString().split("T")[0],
          tipo: "aprovacao_sla_estourado",
          severidade: "critica",
          descricao: `Aprovação ${fluxo.origem}#${fluxo.origem_id.substring(0, 8)} sem resposta após todos os níveis`,
          detalhes: { fluxo_id: fluxo.id },
        });
        resultados.push({ fluxo_id: fluxo.id, acao: "escalado_final" });
        continue;
      }

      const nv = niveis[proximoNivel - 1];
      const novaSla = nv.sla_horas ?? 24;
      const novoPrazo = new Date(Date.now() + novaSla * 3600 * 1000);

      await supabase.from("ponto_aprovacao_fluxo").update({
        nivel_atual: proximoNivel,
        aprovador_atual_id: nv.usuario_id ?? null,
        papel_atual: nv.papel ?? null,
        sla_horas: novaSla,
        prazo_em: novoPrazo.toISOString(),
        escalado_em: new Date().toISOString(),
        niveis_executados: [
          ...(fluxo.niveis_executados ?? []),
          { nivel: fluxo.nivel_atual, escalado_em: new Date().toISOString(), motivo: "sla_estourado" },
        ],
      }).eq("id", fluxo.id);
      resultados.push({ fluxo_id: fluxo.id, acao: "escalado_nivel", nivel: proximoNivel });
    }

    return new Response(JSON.stringify({ total: resultados.length, resultados }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
