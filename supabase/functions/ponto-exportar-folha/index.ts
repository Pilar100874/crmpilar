// Exportação multi-layout (Dominio, Sage, Senior, Folhamatic) com validação prévia.
// Salva arquivo gerado em storage `ponto-exports` e em ponto_export_logs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const pad = (s: any, n: number, c = "0") => String(s ?? "").padStart(n, c).slice(0, n);

function gerarDominio(rows: any[], fmap: Map<string, any>, rmap: Record<string, string>, codEmpresa: string, filMap: Map<string, string>) {
  const lines: string[] = [];
  const codEmp = pad(codEmpresa || "", 4);
  for (const e of rows) {
    const f = fmap.get(e.funcionario_id); if (!f) continue;
    const codFilial = (f.filial_id && filMap.get(f.filial_id)) || codEmpresa || "";
    const codEmp4 = pad(codFilial, 4);
    const cpf = pad((f.cpf || "").replace(/\D/g, ""), 11);
    const mat = pad(f.codigo_dominio || f.matricula || "", 10);
    const dt = (e.data as string).replace(/-/g, "");
    const push = (rub: string, min: number) => {
      if (!min) return;
      const qtd = pad(Math.round((min / 60) * 100), 5);
      lines.push(`${codEmp4}${cpf}${mat}${dt}${pad(rub, 4)}${qtd}`);
    };
    push(rmap.hora_extra || "0050", e.extra_min || 0);
    push(rmap.adicional_noturno || "0060", e.noturno_min_reduzido || e.noturno_min || 0);
    push(rmap.atraso || "0070", e.atraso_min || 0);
    push(rmap.falta || "0080", e.falta ? 480 : 0);
    push(rmap.dsr || "0090", e.dsr_min || 0);
  }
  return lines.join("\n");
}

function gerarSage(rows: any[], fmap: Map<string, any>) {
  // Sage: CSV ;
  const head = "MATRICULA;DATA;EVENTO;HORAS";
  const lines = [head];
  for (const e of rows) {
    const f = fmap.get(e.funcionario_id); if (!f) continue;
    const mat = f.matricula || f.codigo_dominio || "";
    const dt = e.data;
    const push = (ev: string, min: number) => {
      if (!min) return;
      lines.push(`${mat};${dt};${ev};${(min/60).toFixed(2).replace(".",",")}`);
    };
    push("HE50", e.extra_min || 0);
    push("ADNOT", e.noturno_min_reduzido || e.noturno_min || 0);
    push("ATRASO", e.atraso_min || 0);
    push("FALTA", e.falta ? 480 : 0);
  }
  return lines.join("\n");
}

function gerarSenior(rows: any[], fmap: Map<string, any>) {
  // Senior: posicional 80 chars
  const lines: string[] = [];
  for (const e of rows) {
    const f = fmap.get(e.funcionario_id); if (!f) continue;
    const mat = pad(f.matricula, 10);
    const dt = (e.data as string).replace(/-/g, "");
    const push = (cod: string, min: number) => {
      if (!min) return;
      lines.push(`${mat}${dt}${pad(cod, 6)}${pad(Math.round((min/60)*100), 8)}`);
    };
    push("HE050", e.extra_min || 0);
    push("ADN020", e.noturno_min_reduzido || e.noturno_min || 0);
    push("ATR001", e.atraso_min || 0);
    push("FAL001", e.falta ? 480 : 0);
  }
  return lines.join("\n");
}

function gerarFolhamatic(rows: any[], fmap: Map<string, any>) {
  // Folhamatic: pipe-delimited
  const lines = ["CPF|MATRICULA|DATA|RUBRICA|HORAS_DEC"];
  for (const e of rows) {
    const f = fmap.get(e.funcionario_id); if (!f) continue;
    const cpf = (f.cpf || "").replace(/\D/g, "");
    const push = (rub: string, min: number) => {
      if (!min) return;
      lines.push(`${cpf}|${f.matricula}|${e.data}|${rub}|${(min/60).toFixed(2)}`);
    };
    push("050", e.extra_min || 0);
    push("060", e.noturno_min_reduzido || e.noturno_min || 0);
    push("070", e.atraso_min || 0);
    push("080", e.falta ? 480 : 0);
  }
  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { empresa_id, inicio, fim, layout = "dominio", validar_apenas = false } = await req.json();
    if (!empresa_id || !inicio || !fim) {
      return new Response(JSON.stringify({ error: "empresa_id, inicio, fim obrigatórios" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: funcs } = await supabase.from("ponto_funcionarios")
      .select("id, cpf, matricula, codigo_dominio, codigo_relogio, nome, filial_id").eq("empresa_id", empresa_id);

    const { data: empresa } = await supabase.from("ponto_empresas")
      .select("codigo_dominio, razao_social").eq("id", empresa_id).maybeSingle();
    const codEmpresa = (empresa?.codigo_dominio || "").trim();

    const { data: filiais } = await supabase.from("ponto_filiais")
      .select("id, codigo_dominio, nome").eq("empresa_id", empresa_id);
    const filMap = new Map<string, string>(
      (filiais || []).map((fl: any) => [fl.id, (fl.codigo_dominio || codEmpresa || "").trim()])
    );

    // Validação prévia
    const erros: any[] = [];
    if (layout === "dominio" && !codEmpresa) {
      erros.push({ funcionario: "—", campo: "codigo_dominio_empresa", motivo: "Código Domínio da empresa não definido" });
    }
    for (const f of funcs || []) {
      const cpfDigits = (f.cpf || "").replace(/\D/g, "");
      if (cpfDigits.length !== 11) erros.push({ funcionario: f.nome, campo: "cpf", valor: f.cpf, motivo: "CPF inválido" });
      if (!f.matricula) erros.push({ funcionario: f.nome, campo: "matricula", motivo: "matrícula vazia" });
      if (layout === "dominio" && !f.codigo_dominio && !f.matricula)
        erros.push({ funcionario: f.nome, campo: "codigo_dominio", motivo: "código domínio vazio" });
      if (layout === "dominio" && f.filial_id && !filMap.get(f.filial_id))
        erros.push({ funcionario: f.nome, campo: "codigo_dominio_filial", motivo: "filial sem código Domínio" });
    }

    if (validar_apenas) {
      return new Response(JSON.stringify({ ok: erros.length === 0, erros }),
        { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const fmap = new Map((funcs || []).map((f: any) => [f.id, f]));
    const { data: esp } = await supabase
      .from("ponto_espelho_diario").select("*").in("funcionario_id", [...fmap.keys()])
      .gte("data", inicio).lte("data", fim);

    const { data: rubricas } = await supabase
      .from("ponto_rubricas_dominio").select("evento, codigo_rubrica")
      .eq("empresa_id", empresa_id).eq("ativo", true);
    const rmap = Object.fromEntries((rubricas || []).map((r: any) => [r.evento, r.codigo_rubrica]));

    let conteudo = "";
    if (layout === "sage") conteudo = gerarSage(esp || [], fmap);
    else if (layout === "senior") conteudo = gerarSenior(esp || [], fmap);
    else if (layout === "folhamatic") conteudo = gerarFolhamatic(esp || [], fmap);
    else conteudo = gerarDominio(esp || [], fmap, rmap, codEmpresa, filMap);

    const fileName = `${empresa_id}/${layout}_${inicio}_${fim}_${Date.now()}.txt`;
    await supabase.storage.from("ponto-exports").upload(fileName, new TextEncoder().encode(conteudo),
      { contentType: "text/plain", upsert: true });

    await supabase.from("ponto_export_logs").insert({
      empresa_id, periodo_inicio: inicio, periodo_fim: fim,
      formato: layout, layout, arquivo_url: fileName,
      arquivo_conteudo: conteudo.slice(0, 50000),
      total_registros: conteudo.split("\n").filter(Boolean).length,
      total_funcionarios: (funcs || []).length,
      status: erros.length ? "gerado_com_erros" : "gerado",
      erros_json: erros,
    });

    return new Response(JSON.stringify({ ok: true, conteudo, arquivo_url: fileName, erros }),
      { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
