// Importador AFD (Arquivo Fonte de Dados) - Portaria MTE 1510/2009 e 671/2021
// Lê arquivos REP-A/REP-C/REP-P, parseia os registros tipo 3 (marcações)
// e insere em ponto_registros com deduplicação por NSR + funcionário + timestamp.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// AFD tipo 3 (marcação P671): NSR(9) + Tipo(1=3) + Data(DDMMYYYY ou YYYYMMDD) + Hora(HHMM) + CPF(12) + Tipo Marcacao(1)
// AFD legado (1510): NSR(9) + Tipo(1=3) + Data(DDMMYYYY) + Hora(HHMM) + PIS(12)
// Vamos tentar autodetectar tamanho e usar tipo 3 estritamente.
function parseDate(raw: string): string | null {
  // DDMMYYYY -> ISO YYYY-MM-DD
  if (raw.length === 8) {
    if (/^\d{8}$/.test(raw)) {
      // tenta DDMMYYYY (mais comum no AFD)
      const dd = raw.slice(0, 2);
      const mm = raw.slice(2, 4);
      const yyyy = raw.slice(4, 8);
      const y = parseInt(yyyy);
      if (y >= 2000 && y <= 2100) return `${yyyy}-${mm}-${dd}`;
      // fallback YYYYMMDD
      return `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`;
    }
  }
  return null;
}

function parseHora(raw: string): string | null {
  if (raw.length === 4 && /^\d{4}$/.test(raw)) {
    return `${raw.slice(0,2)}:${raw.slice(2,4)}:00`;
  }
  return null;
}

interface ParsedPunch {
  nsr: number;
  data: string;
  hora: string;
  identificador: string; // CPF ou PIS
  identificador_tipo: "cpf" | "pis";
}

function parseAFD(conteudo: string): { header: any; punches: ParsedPunch[]; totalLinhas: number; erros: string[] } {
  const lines = conteudo.split(/\r?\n/).filter(Boolean);
  const erros: string[] = [];
  let header: any = {};
  const punches: ParsedPunch[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length < 11) continue;
    const nsr = parseInt(line.slice(0, 9), 10);
    const tipo = line.slice(9, 10);

    if (tipo === "1") {
      // Header: NSR(9)+Tipo(1)+TipoIdent(1)+IdEmp(14)+Razao(150)...
      const tipoIdent = line.slice(10, 11); // 1=CNPJ 2=CPF
      const cnpj = line.slice(11, 25).replace(/\D/g, "");
      header = { cnpj, tipo_ident: tipoIdent === "1" ? "cnpj" : "cpf" };
    } else if (tipo === "3") {
      // Marcação: NSR(9)+Tipo(1)+Data(8)+Hora(4)+ID(12)
      const dataRaw = line.slice(10, 18);
      const horaRaw = line.slice(18, 22);
      const id = line.slice(22, 34).replace(/\D/g, "").padStart(11, "0");
      const data = parseDate(dataRaw);
      const hora = parseHora(horaRaw);
      if (!data || !hora) {
        erros.push(`Linha ${i + 1}: data/hora inválida (${dataRaw} ${horaRaw})`);
        continue;
      }
      // Heurística: 11 dígitos = CPF, 11 dígitos zero-padded de PIS também. Tentamos CPF primeiro.
      const ident_tipo: "cpf" | "pis" = id.length === 11 ? "cpf" : "pis";
      punches.push({ nsr, data, hora, identificador: id, identificador_tipo: ident_tipo });
    }
    // Tipos 2 (ajuste relógio), 4 (alteração funcionário), 5 (alteração responsável), 9 (trailer) — ignorados aqui
  }
  return { header, punches, totalLinhas: lines.length, erros };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json();
    const {
      empresa_id,
      conteudo_base64,
      nome_arquivo = "afd.txt",
      formato = "rep-c",
      filial_id = null,
      equipamento_id = null,
    } = body || {};

    if (!empresa_id || !conteudo_base64) {
      return new Response(JSON.stringify({ error: "empresa_id e conteudo_base64 obrigatórios" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: emp } = await sb.from("ponto_empresas").select("estabelecimento_id").eq("id", empresa_id).maybeSingle();
    const estabelecimento_id = (emp as any)?.estabelecimento_id;
    if (!estabelecimento_id) {
      return new Response(JSON.stringify({ error: "estabelecimento da empresa não encontrado" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (!empresa_id || !estabelecimento_id || !conteudo_base64) {
      return new Response(JSON.stringify({ error: "empresa_id, estabelecimento_id e conteudo_base64 obrigatórios" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Decodifica
    const conteudo = new TextDecoder("latin1").decode(
      Uint8Array.from(atob(conteudo_base64), (c) => c.charCodeAt(0))
    );

    const parsed = parseAFD(conteudo);

    // Cria importação
    const { data: imp, error: impErr } = await sb.from("ponto_afd_importacoes").insert({
      empresa_id, estabelecimento_id, filial_id, equipamento_id,
      nome_arquivo, formato,
      cnpj_cabecalho: parsed.header?.cnpj || null,
      total_linhas: parsed.totalLinhas,
      total_marcacoes: parsed.punches.length,
      status: "processando",
      erros: parsed.erros.slice(0, 100),
    }).select().single();
    if (impErr) throw impErr;

    // Resolve funcionários por CPF
    const cpfs = Array.from(new Set(parsed.punches.map((p) => p.identificador)));
    const { data: funcs } = await sb.from("ponto_funcionarios")
      .select("id, cpf, pis_pasep, empresa_id")
      .eq("empresa_id", empresa_id);

    const mapCpf = new Map<string, string>();
    const mapPis = new Map<string, string>();
    for (const f of funcs || []) {
      const cpfClean = (f.cpf || "").replace(/\D/g, "");
      const pisClean = (f.pis_pasep || "").replace(/\D/g, "");
      if (cpfClean) mapCpf.set(cpfClean.padStart(11, "0"), f.id);
      if (pisClean) mapPis.set(pisClean.padStart(11, "0"), f.id);
    }

    let importados = 0;
    let duplicados = 0;
    let erros = 0;
    const errosDetalhe: any[] = [];

    // Processa em lotes de 200
    const lote: any[] = [];
    for (const p of parsed.punches) {
      const funcId = mapCpf.get(p.identificador) || mapPis.get(p.identificador);
      if (!funcId) {
        erros++;
        if (errosDetalhe.length < 50) errosDetalhe.push({ cpf: p.identificador, motivo: "funcionário não encontrado" });
        continue;
      }
      const dataHora = `${p.data}T${p.hora}-03:00`;
      lote.push({
        funcionario_id: funcId,
        data_hora: dataHora,
        tipo: "auto", // tipo será inferido depois pela jornada
        origem: "afd_import",
        device_hash: `afd:${imp.id}`,
        score_confianca: 100,
        observacoes: `Importado AFD NSR ${p.nsr}`,
      });
      if (lote.length >= 200) {
        const { error: insErr, count } = await sb.from("ponto_registros")
          .insert(lote, { count: "exact" });
        if (insErr) {
          // tenta um a um para identificar duplicados
          for (const item of lote) {
            const { error: e1 } = await sb.from("ponto_registros").insert(item);
            if (!e1) importados++;
            else if (String(e1.message || "").includes("duplicate")) duplicados++;
            else { erros++; if (errosDetalhe.length < 50) errosDetalhe.push({ motivo: e1.message }); }
          }
        } else {
          importados += count || lote.length;
        }
        lote.length = 0;
      }
    }
    if (lote.length) {
      const { error: insErr, count } = await sb.from("ponto_registros").insert(lote, { count: "exact" });
      if (insErr) {
        for (const item of lote) {
          const { error: e1 } = await sb.from("ponto_registros").insert(item);
          if (!e1) importados++;
          else if (String(e1.message || "").includes("duplicate")) duplicados++;
          else { erros++; if (errosDetalhe.length < 50) errosDetalhe.push({ motivo: e1.message }); }
        }
      } else {
        importados += count || lote.length;
      }
    }

    await sb.from("ponto_afd_importacoes").update({
      marcacoes_importadas: importados,
      marcacoes_duplicadas: duplicados,
      marcacoes_erro: erros,
      erros: [...parsed.erros.slice(0, 50), ...errosDetalhe].slice(0, 100),
      status: "concluido",
    }).eq("id", imp.id);

    return new Response(JSON.stringify({
      ok: true, importacao_id: imp.id,
      total: parsed.punches.length,
      importados, duplicados, erros,
      header: parsed.header,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
