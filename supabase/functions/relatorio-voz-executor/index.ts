// Executor determinístico de relatórios por voz.
// Não usa IA. Não aceita SQL do cliente. Constrói a query a partir do schema
// salvo em `relatorios_voz` (tabela_base, joins, campos, filtros_disponiveis,
// ordenacao, limite_padrao) OU executa uma api_endpoints previamente aprovada.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

type Filtro = {
  chave: string;
  coluna: string;
  tipo: "text" | "number" | "date" | "date_range" | "enum" | "boolean";
  operador?: "eq" | "ilike" | "gte" | "lte" | "in";
  obrigatorio?: boolean;
  opcoes?: string[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Não autenticado" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const body = await req.json().catch(() => ({}));
    const { relatorio_id, filtros = {}, salvar_nome = null, permanente = false } = body ?? {};
    if (!relatorio_id) return json({ error: "relatorio_id obrigatório" }, 400);

    const { data: rel, error: relErr } = await supabase
      .from("relatorios_voz")
      .select("*")
      .eq("id", relatorio_id)
      .maybeSingle();
    if (relErr) return json({ error: relErr.message }, 400);
    if (!rel) return json({ error: "Relatório não encontrado" }, 404);
    if (!rel.ativo) return json({ error: "Relatório inativo" }, 400);

    const filtrosDisp: Filtro[] = Array.isArray(rel.filtros_disponiveis) ? rel.filtros_disponiveis : [];

    // Validar obrigatórios
    const faltando = filtrosDisp.filter(f => f.obrigatorio && (filtros[f.chave] === undefined || filtros[f.chave] === null || filtros[f.chave] === ""));
    if (faltando.length) {
      return json({ error: "Filtros obrigatórios faltando", filtros_faltando: faltando.map(f => f.chave) }, 400);
    }

    let rows: any[] = [];

    if (rel.tipo_fonte === "api" && rel.api_endpoint_id) {
      const { data: ep } = await supabase.from("api_endpoints").select("query").eq("id", rel.api_endpoint_id).maybeSingle();
      if (!ep?.query) return json({ error: "API endpoint sem query" }, 400);
      // executa via RPC segura já existente
      const { data: result, error } = await supabase.rpc("execute_sql", { sql_query: ep.query });
      if (error) return json({ error: error.message }, 400);
      rows = Array.isArray(result) ? result : [];
    } else {
      if (!rel.tabela_base) return json({ error: "tabela_base não configurada" }, 400);

      const campos: string[] = Array.isArray(rel.campos_exibicao) && rel.campos_exibicao.length
        ? rel.campos_exibicao.map((c: any) => typeof c === "string" ? c : c.coluna)
        : ["*"];

      let q = supabase.from(rel.tabela_base).select(campos.join(","));

      for (const f of filtrosDisp) {
        const val = filtros[f.chave];
        if (val === undefined || val === null || val === "") continue;
        const op = f.operador ?? (f.tipo === "text" ? "ilike" : "eq");
        try {
          if (f.tipo === "date_range" && typeof val === "object") {
            if (val.de) q = q.gte(f.coluna, val.de);
            if (val.ate) q = q.lte(f.coluna, val.ate);
          } else if (op === "ilike") {
            q = q.ilike(f.coluna, `%${String(val).replace(/[%_]/g, "")}%`);
          } else if (op === "in" && Array.isArray(val)) {
            q = q.in(f.coluna, val);
          } else if (op === "gte") q = q.gte(f.coluna, val);
          else if (op === "lte") q = q.lte(f.coluna, val);
          else q = q.eq(f.coluna, val);
        } catch (_) { /* ignora filtro inválido */ }
      }

      const ord = rel.ordenacao ?? {};
      if (ord?.coluna) q = q.order(ord.coluna, { ascending: (ord.direcao ?? "asc") === "asc" });

      q = q.limit(Math.min(Number(rel.limite_padrao ?? 100), 1000));

      const { data, error } = await q;
      if (error) return json({ error: error.message }, 400);
      rows = data ?? [];
    }

    // Snapshot opcional
    let snapshot_id: string | null = null;
    if (salvar_nome) {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (uid) {
        const { data: snap, error: snapErr } = await supabase.from("relatorio_snapshots").insert({
          usuario_id: uid,
          estabelecimento_id: rel.estabelecimento_id,
          relatorio_voz_id: rel.id,
          nome: String(salvar_nome).slice(0, 200),
          filtros_aplicados: filtros,
          dados: rows,
          total_registros: rows.length,
          permanente: !!permanente,
        }).select("id").maybeSingle();
        if (!snapErr && snap?.id) snapshot_id = snap.id;
      }
    }

    return json({
      relatorio: { id: rel.id, nome: rel.nome, tipo_saida: rel.tipo_saida },
      total: rows.length,
      dados: rows,
      snapshot_id,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
