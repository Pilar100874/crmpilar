// Resolve qual formulário deve ser preenchido em uma ocorrência de visita,
// aplicando precedência: usuário > filial > segmento do cliente > global.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { ocorrencia_id } = await req.json();
    if (!ocorrencia_id) {
      return new Response(JSON.stringify({ error: "ocorrencia_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: ocor } = await supabase
      .from("visita_ocorrencias")
      .select("*, visita_programacoes(filial_id, customer_id)")
      .eq("id", ocorrencia_id)
      .maybeSingle();

    if (!ocor) {
      return new Response(JSON.stringify({ error: "ocorrência não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const filialId = (ocor as any).visita_programacoes?.filial_id;
    const customerId = ocor.customer_id || (ocor as any).visita_programacoes?.customer_id;

    let segmentoId: string | null = null;
    if (customerId) {
      const { data: cli } = await supabase
        .from("customers").select("empresa_id, empresas(segmento_id)").eq("id", customerId).maybeSingle();
      segmentoId = (cli as any)?.empresas?.segmento_id ?? null;
    }

    const { data: regras } = await supabase
      .from("visita_formulario_regras")
      .select("*")
      .eq("estabelecimento_id", ocor.estabelecimento_id)
      .eq("ativa", true)
      .order("prioridade", { ascending: false });

    const list = regras || [];
    const regra =
      list.find((r: any) => r.escopo === "usuario" && r.usuario_id === ocor.usuario_id) ||
      list.find((r: any) => r.escopo === "filial" && r.filial_id === filialId) ||
      list.find((r: any) => r.escopo === "segmento" && r.segmento_id === segmentoId) ||
      list.find((r: any) => r.escopo === "global");

    if (!regra) {
      return new Response(JSON.stringify({ formulario: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: formulario } = await supabase
      .from("visita_formularios").select("*").eq("id", regra.formulario_id).maybeSingle();
    const { data: campos } = await supabase
      .from("visita_formulario_campos")
      .select("*").eq("formulario_id", regra.formulario_id).order("ordem");

    return new Response(JSON.stringify({
      formulario, campos: campos || [], obrigatorio: regra.obrigatorio_encerrar,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
