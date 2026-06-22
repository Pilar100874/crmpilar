// Varre registros recentes e gera alertas de compliance (CLT)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const empresa_id = body.empresa_id as string | undefined;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // pega funcionarios ativos
    let q = supabase.from("ponto_funcionarios").select("id, empresa_id, nome").eq("status", "ativo");
    if (empresa_id) q = q.eq("empresa_id", empresa_id);
    const { data: funcs } = await q;

    const novosAlertas: any[] = [];

    for (const f of funcs || []) {
      const { data: regs } = await supabase
        .from("ponto_registros")
        .select("id, data_hora, tipo")
        .eq("funcionario_id", f.id)
        .gte("data_hora", desde)
        .order("data_hora", { ascending: true });

      const lista = regs || [];
      // 1) Jornada > 10h sem encerrar
      const entradaAberta = lista.find(x => x.tipo === "entrada");
      const saidaFinal = [...lista].reverse().find(x => x.tipo === "saida");
      if (entradaAberta && !saidaFinal) {
        const horas = (Date.now() - new Date(entradaAberta.data_hora).getTime()) / 3600000;
        if (horas > 10) {
          novosAlertas.push({
            funcionario_id: f.id,
            empresa_id: f.empresa_id,
            registro_id: entradaAberta.id,
            nivel: "alto",
            categoria: "jornada_excedida",
            descricao: `Jornada acima de 10h sem encerramento (${horas.toFixed(1)}h)`,
          });
        }
      }

      // 2) >6h sem intervalo
      const entrada = lista.find(x => x.tipo === "entrada");
      const intervalo = lista.find(x => x.tipo === "saida_intervalo");
      if (entrada && !intervalo) {
        const horas = (Date.now() - new Date(entrada.data_hora).getTime()) / 3600000;
        if (horas > 6) {
          novosAlertas.push({
            funcionario_id: f.id,
            empresa_id: f.empresa_id,
            registro_id: entrada.id,
            nivel: "medio",
            categoria: "intervalo_nao_concedido",
            descricao: `Mais de 6h trabalhadas sem registro de intervalo`,
          });
        }
      }

      // 3) Intervalo < 60min (jornadas >6h)
      const saidaInt = lista.find(x => x.tipo === "saida_intervalo");
      const retornoInt = lista.find(x => x.tipo === "retorno_intervalo");
      if (saidaInt && retornoInt) {
        const m = (new Date(retornoInt.data_hora).getTime() - new Date(saidaInt.data_hora).getTime()) / 60000;
        if (m < 60) {
          novosAlertas.push({
            funcionario_id: f.id,
            empresa_id: f.empresa_id,
            registro_id: retornoInt.id,
            nivel: "medio",
            categoria: "intervalo_insuficiente",
            descricao: `Intervalo inferior a 60min (${Math.round(m)}min)`,
          });
        }
      }
    }

    // Evita duplicar: insere só se não existe alerta aberto da mesma categoria/registro
    let inseridos = 0;
    for (const a of novosAlertas) {
      const { data: existe } = await supabase
        .from("ponto_alertas").select("id")
        .eq("registro_id", a.registro_id).eq("categoria", a.categoria)
        .eq("resolvido", false).maybeSingle();
      if (!existe) {
        const { error } = await supabase.from("ponto_alertas").insert(a);
        if (!error) inseridos++;
      }
    }

    return new Response(JSON.stringify({ ok: true, verificados: funcs?.length || 0, novos_alertas: inseridos }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
