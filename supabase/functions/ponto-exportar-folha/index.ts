// Exportação dinâmica baseada em ponto_export_layouts (com fallback p/ layouts legacy).
// Suporta modo "consolidado": agrupa funcionários pelo layout vinculado (layout_exportacao_id)
// e gera um arquivo por layout em uma única operação.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const pad = (s: any, n: number, c = "0") => String(s ?? "").padStart(n, c).slice(0, n);

function fmtHoras(min: number, formato: string): string {
  if (!min) return formato === "sexagesimal" ? "00:00" : "0,00";
  if (formato === "centesimal") return (min / 60).toFixed(2).replace(".", ",");
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${pad(h, 2)}:${pad(m, 2)}`;
}

function getCampoValor(campo: string, e: any): number {
  switch (campo) {
    case "horas_extras_1": return e.extra_min || 0;
    case "horas_extras_2": return e.extra_min_2 || 0;
    case "horas_noturnas": return e.noturno_min_reduzido || e.noturno_min || 0;
    case "horas_atraso": return e.atraso_min || 0;
    case "dias_falta": return e.falta ? 1 : 0;
    case "desconto_dsr_dias": return e.dsr_dias || 0;
    case "desconto_dsr_horas": return e.dsr_min || 0;
    case "abono_horas": return e.abono_min || 0;
    case "banco_horas_credito": return Math.max(0, e.saldo_banco_min || 0);
    case "banco_horas_debito": return Math.max(0, -(e.saldo_banco_min || 0));
    case "adicional_periculosidade": return e.periculosidade_min || 0;
    default: return 0;
  }
}

function gerarComLayout(
  rows: any[],
  fmap: Map<string, any>,
  layout: any,
  codEmpresa: string,
  filMap: Map<string, string>,
) {
  const lines: string[] = [];
  const tamMat = layout.tamanho_matricula || 10;
  const formato = layout.formato_horas || "sexagesimal";
  const sep = layout.software?.includes("sage") ? ";" :
              layout.software?.includes("folhamatic") ? "|" :
              layout.software?.includes("senior") ? "" : "";
  if (sep) lines.push(["MATRICULA", "CPF", "DATA", "EVENTO", "VALOR"].join(sep));

  for (const e of rows) {
    const f = fmap.get(e.funcionario_id); if (!f) continue;
    if (layout.considerar_suspensao === false && f.status === "suspenso") continue;
    if (layout.considerar_comissionistas === false && f.tipo_contrato === "comissionista") continue;
    const cpf = pad((f.cpf || "").replace(/\D/g, ""), 11);
    const mat = pad(f.matricula || f.codigo_dominio || "", tamMat);
    const codFilial = (f.filial_id && filMap.get(f.filial_id)) || codEmpresa || "";
    for (const ev of layout.eventos || []) {
      const valor = getCampoValor(ev.campo, e);
      if (!valor) continue;
      if (ev.campo === "dias_falta" && layout.incluir_dias_falta === false) continue;
      if (ev.campo.startsWith("banco_horas_") && layout.considerar_banco_horas === false) continue;
      const valorFmt = ev.campo === "dias_falta" ? String(valor) : fmtHoras(valor, formato);
      const rub = ev.evento || "";
      if (sep) {
        lines.push([mat, cpf, e.data, rub, valorFmt].join(sep));
      } else {
        const codEmp4 = pad(codFilial, 4);
        const dt = (e.data as string).replace(/-/g, "");
        const valorNum = ev.campo === "dias_falta"
          ? pad(valor, 3)
          : pad(formato === "centesimal" ? Math.round((valor / 60) * 100) : valor, 5);
        lines.push(`${codEmp4}${cpf}${mat}${dt}${pad(rub, 4)}${valorNum}`);
      }
    }
  }
  return lines.join("\n");
}

function gerarLegacy(rows: any[], fmap: Map<string, any>, layout: string) {
  const lines: string[] = [];
  const sep = layout === "sage" ? ";" : layout === "folhamatic" ? "|" : null;
  if (sep) lines.push(["MATRICULA", "DATA", "EVENTO", "HORAS"].join(sep));
  for (const e of rows) {
    const f = fmap.get(e.funcionario_id); if (!f) continue;
    const mat = f.matricula || f.codigo_dominio || "";
    const push = (rub: string, min: number) => {
      if (!min) return;
      if (sep) lines.push([mat, e.data, rub, (min / 60).toFixed(2).replace(".", ",")].join(sep));
      else lines.push(`${pad(mat, 10)}${(e.data as string).replace(/-/g, "")}${pad(rub, 6)}${pad(Math.round((min/60)*100), 8)}`);
    };
    push("HE50", e.extra_min || 0);
    push("ADN", e.noturno_min_reduzido || e.noturno_min || 0);
    push("ATR", e.atraso_min || 0);
    push("FAL", e.falta ? 480 : 0);
  }
  return lines.join("\n");
}

function validarFuncs(funcs: any[], filMap: Map<string, string>, codEmpresa: string, layoutCfg: any, layout: string) {
  const erros: any[] = [];
  const isDominio = (layoutCfg?.software || layout).includes("dominio");
  if (isDominio && !codEmpresa) erros.push({ funcionario: "—", campo: "codigo_dominio_empresa", motivo: "Código Domínio da empresa não definido" });
  const tamMat = layoutCfg?.tamanho_matricula || 10;
  for (const f of funcs) {
    const cpfDigits = (f.cpf || "").replace(/\D/g, "");
    if (cpfDigits.length !== 11) erros.push({ funcionario: f.nome, campo: "cpf", valor: f.cpf, motivo: "CPF inválido" });
    if (!f.matricula) erros.push({ funcionario: f.nome, campo: "matricula", motivo: "matrícula vazia" });
    if (f.matricula && String(f.matricula).length > tamMat)
      erros.push({ funcionario: f.nome, campo: "matricula", valor: f.matricula, motivo: `matrícula maior que ${tamMat} dígitos` });
    if (isDominio && !f.codigo_dominio && !f.matricula)
      erros.push({ funcionario: f.nome, campo: "codigo_dominio", motivo: "código domínio vazio" });
    if (isDominio && f.filial_id && !filMap.get(f.filial_id))
      erros.push({ funcionario: f.nome, campo: "codigo_dominio_filial", motivo: "filial sem código Domínio" });
  }
  if (layoutCfg && (!layoutCfg.eventos || layoutCfg.eventos.length === 0))
    erros.push({ funcionario: "—", campo: "eventos", motivo: "Layout sem rubricas mapeadas" });
  return erros;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const {
      empresa_id, inicio, fim, layout_id, layout = "dominio",
      validar_apenas = false, consolidado = false, layout_padrao_id,
    } = await req.json();
    if (!empresa_id || !inicio || !fim) {
      return new Response(JSON.stringify({ error: "empresa_id, inicio, fim obrigatórios" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: funcs } = await supabase.from("ponto_funcionarios")
      .select("id, cpf, matricula, codigo_dominio, codigo_relogio, nome, filial_id, status, tipo_contrato, departamento_id, layout_exportacao_id")
      .eq("empresa_id", empresa_id);
    const { data: empresa } = await supabase.from("ponto_empresas")
      .select("codigo_dominio, razao_social").eq("id", empresa_id).maybeSingle();
    const codEmpresa = (empresa?.codigo_dominio || "").trim();
    const { data: filiais } = await supabase.from("ponto_filiais")
      .select("id, codigo_dominio, nome").eq("empresa_id", empresa_id);
    const filMap = new Map<string, string>(
      (filiais || []).map((fl: any) => [fl.id, (fl.codigo_dominio || codEmpresa || "").trim()])
    );

    // ============ MODO CONSOLIDADO ============
    if (consolidado) {
      const fallback = layout_padrao_id || layout_id || null;
      const grupos = new Map<string, any[]>();
      for (const f of funcs || []) {
        const lid = f.layout_exportacao_id || fallback;
        if (!lid) continue;
        if (!grupos.has(lid)) grupos.set(lid, []);
        grupos.get(lid)!.push(f);
      }
      const semLayout = (funcs || []).filter((f: any) => !f.layout_exportacao_id && !fallback);

      const { data: layoutsAll } = await supabase.from("ponto_export_layouts")
        .select("*").in("id", [...grupos.keys()]);
      const lmap = new Map<string, any>((layoutsAll || []).map((l: any) => [l.id, l]));

      const arquivos: any[] = [];
      const errosAll: any[] = [];
      for (const [lid, fs] of grupos.entries()) {
        const cfg = lmap.get(lid);
        if (!cfg) { errosAll.push({ funcionario: "—", campo: "layout", motivo: `Layout ${lid} não encontrado` }); continue; }
        const fmap = new Map(fs.map((f: any) => [f.id, f]));
        const erros = validarFuncs(fs, filMap, codEmpresa, cfg, layout);
        errosAll.push(...erros.map((e) => ({ ...e, layout: cfg.descricao || cfg.software })));
        if (validar_apenas) continue;
        const { data: esp } = await supabase.from("ponto_espelho_diario").select("*")
          .in("funcionario_id", [...fmap.keys()]).gte("data", inicio).lte("data", fim);
        const conteudo = gerarComLayout(esp || [], fmap, cfg, codEmpresa, filMap);
        const slug = (cfg.descricao || cfg.software || "layout").replace(/\W+/g, "_");
        const fileName = `${empresa_id}/consolidado/${slug}_${inicio}_${fim}_${Date.now()}.txt`;
        await supabase.storage.from("ponto-exports").upload(fileName, new TextEncoder().encode(conteudo),
          { contentType: "text/plain", upsert: true });
        await supabase.from("ponto_export_logs").insert({
          empresa_id, periodo_inicio: inicio, periodo_fim: fim,
          formato: cfg.software, layout: cfg.descricao || cfg.software,
          arquivo_url: fileName, arquivo_conteudo: conteudo.slice(0, 50000),
          total_registros: conteudo.split("\n").filter(Boolean).length,
          total_funcionarios: fs.length,
          status: erros.length ? "gerado_com_erros" : "gerado",
          erros_json: erros, observacao: "Exportação consolidada",
        });
        arquivos.push({
          layout_id: lid, layout_nome: cfg.descricao || cfg.software,
          software: cfg.software, arquivo_nome: `${slug}_${inicio}_${fim}.txt`,
          arquivo_url: fileName, conteudo, total_funcionarios: fs.length,
          total_linhas: conteudo.split("\n").filter(Boolean).length,
        });
      }
      if (semLayout.length) errosAll.push({
        funcionario: `${semLayout.length} funcionário(s)`,
        campo: "layout_exportacao_id",
        motivo: "Sem layout vinculado e sem layout padrão informado",
      });
      return new Response(JSON.stringify({
        ok: errosAll.length === 0, consolidado: true, arquivos, erros: errosAll,
        total_layouts: arquivos.length, total_funcionarios: (funcs || []).length,
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ============ MODO LAYOUT ÚNICO (comportamento original) ============
    let layoutCfg: any = null;
    if (layout_id) {
      const { data } = await supabase.from("ponto_export_layouts").select("*").eq("id", layout_id).maybeSingle();
      layoutCfg = data;
    }
    const erros = validarFuncs(funcs || [], filMap, codEmpresa, layoutCfg, layout);
    if (validar_apenas) {
      return new Response(JSON.stringify({ ok: erros.length === 0, erros }),
        { headers: { ...cors, "Content-Type": "application/json" } });
    }
    const fmap = new Map((funcs || []).map((f: any) => [f.id, f]));
    let funcIds = [...fmap.keys()];
    if (layoutCfg?.filtrar_por === "departamento" && layoutCfg?.filtro_fechamento) {
      funcIds = (funcs || []).filter((f: any) => f.departamento_id === layoutCfg.filtro_fechamento).map((f: any) => f.id);
    } else if (layoutCfg?.filtrar_por === "filial" && layoutCfg?.filtro_fechamento) {
      funcIds = (funcs || []).filter((f: any) => f.filial_id === layoutCfg.filtro_fechamento).map((f: any) => f.id);
    }
    const { data: esp } = await supabase
      .from("ponto_espelho_diario").select("*").in("funcionario_id", funcIds)
      .gte("data", inicio).lte("data", fim);
    const conteudo = layoutCfg
      ? gerarComLayout(esp || [], fmap, layoutCfg, codEmpresa, filMap)
      : gerarLegacy(esp || [], fmap, layout);
    const fileName = `${empresa_id}/${layoutCfg?.software || layout}_${inicio}_${fim}_${Date.now()}.txt`;
    await supabase.storage.from("ponto-exports").upload(fileName, new TextEncoder().encode(conteudo),
      { contentType: "text/plain", upsert: true });
    await supabase.from("ponto_export_logs").insert({
      empresa_id, periodo_inicio: inicio, periodo_fim: fim,
      formato: layoutCfg?.software || layout, layout: layoutCfg?.software || layout,
      arquivo_url: fileName, arquivo_conteudo: conteudo.slice(0, 50000),
      total_registros: conteudo.split("\n").filter(Boolean).length,
      total_funcionarios: (funcs || []).length,
      status: erros.length ? "gerado_com_erros" : "gerado", erros_json: erros,
    });
    return new Response(JSON.stringify({ ok: true, conteudo, arquivo_url: fileName, erros }),
      { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
