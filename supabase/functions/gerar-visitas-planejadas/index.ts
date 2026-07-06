// Gera as ocorrências (visita_ocorrencias) do dia atual para todas as
// programações ativas. Idempotente: usa índice único (programacao, usuario, data).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Programacao {
  id: string;
  estabelecimento_id: string;
  responsavel_tipo: "usuario" | "filial" | "todos";
  responsavel_usuario_id: string | null;
  filial_id: string | null;
  frequencia_tipo: "dia" | "semana" | "mes" | "intervalo_dias";
  frequencia_qtd: number;
  intervalo_dias: number | null;
  dias_semana: number[];
  hora_inicio: string;
  hora_fim: string;
  data_inicio: string;
  data_fim: string | null;
  ativa: boolean;
}

function toDate(s: string) { return new Date(s + "T00:00:00Z"); }
function isoDay(d: Date) { return d.toISOString().slice(0, 10); }

function ocorrenciasEsperadasHoje(p: Programacao, hoje: Date): number {
  const dow = hoje.getUTCDay(); // 0..6
  if (!p.dias_semana?.includes(dow)) return 0;

  const inicio = toDate(p.data_inicio);
  if (hoje < inicio) return 0;
  if (p.data_fim && hoje > toDate(p.data_fim)) return 0;

  switch (p.frequencia_tipo) {
    case "dia":
      return Math.max(1, p.frequencia_qtd || 1);
    case "semana": {
      // qtd por semana distribuídas nos dias_semana
      const perDay = Math.max(1, Math.ceil((p.frequencia_qtd || 1) / (p.dias_semana.length || 1)));
      return perDay;
    }
    case "mes": {
      // qtd por mês distribuídas
      const perDay = Math.max(1, Math.ceil((p.frequencia_qtd || 1) / 20));
      return perDay;
    }
    case "intervalo_dias": {
      const n = Math.max(1, p.intervalo_dias || 1);
      const diffDias = Math.floor((hoje.getTime() - inicio.getTime()) / 86400000);
      return diffDias % n === 0 ? 1 : 0;
    }
  }
  return 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const hoje = new Date();
  const hojeStr = isoDay(hoje);

  const { data: progs, error } = await supabase
    .from("visita_programacoes")
    .select("*")
    .eq("ativa", true);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let criadas = 0;
  for (const p of (progs as Programacao[])) {
    const qtd = ocorrenciasEsperadasHoje(p, hoje);
    if (qtd <= 0) continue;

    // Resolve responsáveis
    let usuarios: (string | null)[] = [null];
    if (p.responsavel_tipo === "usuario" && p.responsavel_usuario_id) {
      usuarios = [p.responsavel_usuario_id];
    } else if (p.responsavel_tipo === "filial" || p.responsavel_tipo === "todos") {
      // Deixa como null (visita "aberta" à filial/todos); a verificação vai
      // procurar posições de qualquer usuário do estabelecimento.
      usuarios = [null];
    }

    for (const uid of usuarios) {
      for (let i = 0; i < qtd; i++) {
        const { error: upErr } = await supabase.from("visita_ocorrencias").upsert({
          estabelecimento_id: p.estabelecimento_id,
          programacao_id: p.id,
          usuario_id: uid,
          data_prevista: hojeStr,
          janela_inicio: p.hora_inicio,
          janela_fim: p.hora_fim,
          status: "pendente",
        }, { onConflict: "programacao_id,usuario_id,data_prevista", ignoreDuplicates: true });
        if (!upErr) criadas++;
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, data: hojeStr, criadas }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
