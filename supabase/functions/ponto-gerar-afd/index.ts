// Gera arquivo AFD (Arquivo Fonte de Dados) conforme Portaria MTE 671/2021
// Layout: registros tipo 1 (cabeçalho), 2 (empresa), 3 (marcações), 4 (ajustes), 5 (operador), 9 (trailer)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash } from "https://deno.land/std@0.224.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const pad = (v: any, n: number, c = "0", left = true) => {
  const s = String(v ?? "");
  return left ? s.padStart(n, c).slice(-n) : s.padEnd(n, c).slice(0, n);
};
const fmtData = (d: Date) =>
  `${pad(d.getUTCDate(), 2)}${pad(d.getUTCMonth() + 1, 2)}${d.getUTCFullYear()}`;
const fmtHora = (d: Date) => `${pad(d.getUTCHours(), 2)}${pad(d.getUTCMinutes(), 2)}`;
const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { empresa_id, data_inicio, data_fim } = await req.json();
    if (!empresa_id || !data_inicio || !data_fim) {
      return new Response(JSON.stringify({ error: "empresa_id, data_inicio e data_fim obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: emp } = await sb.from("ponto_empresas")
      .select("razao_social, cnpj, cei, endereco, cnpj_responsavel, razao_responsavel")
      .eq("id", empresa_id).single();
    if (!emp) throw new Error("Empresa não encontrada");

    const { data: regs } = await sb.from("ponto_registros")
      .select("nsr, data_hora, tipo, funcionario_id, hash_assinatura, ponto_funcionarios!inner(cpf, pis, empresa_id)")
      .eq("ponto_funcionarios.empresa_id", empresa_id)
      .gte("data_hora", `${data_inicio}T00:00:00Z`)
      .lte("data_hora", `${data_fim}T23:59:59Z`)
      .not("nsr", "is", null)
      .order("nsr", { ascending: true });

    const linhas: string[] = [];
    const now = new Date();
    const cnpjOrCei = onlyDigits(emp.cnpj || emp.cei || "");
    const tipoIdent = emp.cnpj ? "1" : "2";

    // Tipo 1 — Cabeçalho
    linhas.push([
      pad(0, 9), "1",
      pad(cnpjOrCei, 14),
      pad("", 12), // CEI
      pad((emp.razao_social || "").toUpperCase(), 150, " ", false),
      fmtData(new Date(data_inicio)),
      fmtData(new Date(data_fim)),
      fmtData(now), fmtHora(now),
    ].join(""));

    let nsrAtual = 0;
    let nsrInicial = 0, nsrFinal = 0;
    let totalMarc = 0;

    for (const r of regs || []) {
      nsrAtual++;
      if (!nsrInicial) nsrInicial = r.nsr;
      nsrFinal = r.nsr;
      totalMarc++;
      const dt = new Date(r.data_hora);
      const f: any = r.ponto_funcionarios;
      // Tipo 3 — Marcação de ponto
      linhas.push([
        pad(r.nsr, 9), "3",
        fmtData(dt), fmtHora(dt),
        pad(onlyDigits(f.pis || f.cpf || ""), 12),
      ].join(""));
    }

    // Tipo 9 — Trailer
    const totalT2 = 0, totalT3 = totalMarc, totalT4 = 0, totalT5 = 0;
    linhas.push([
      pad(nsrAtual + 1, 9), "9",
      pad(totalT2, 9), pad(totalT3, 9), pad(totalT4, 9), pad(totalT5, 9),
      "9",
    ].join(""));

    const conteudo = linhas.join("\r\n") + "\r\n";
    const hash = Array.from(new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(conteudo))
    )).map(b => b.toString(16).padStart(2, "0")).join("");

    // Upload no storage
    const path = `${empresa_id}/AFD_${data_inicio}_${data_fim}_${Date.now()}.txt`;
    await sb.storage.from("ponto-exports").upload(path, conteudo, {
      contentType: "text/plain", upsert: true,
    });

    const { data: log } = await sb.from("ponto_afd_arquivos").insert({
      empresa_id, data_inicio, data_fim,
      nsr_inicial: nsrInicial, nsr_final: nsrFinal,
      total_registros: totalMarc, hash_arquivo: hash, storage_path: path,
    }).select().single();

    const { data: url } = await sb.storage.from("ponto-exports").createSignedUrl(path, 3600);

    return new Response(JSON.stringify({
      ok: true, arquivo: log, download_url: url?.signedUrl, hash,
      total_registros: totalMarc, conteudo_preview: conteudo.slice(0, 500),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
