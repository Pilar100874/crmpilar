// Gera AEJ (Arquivo Eletrônico de Jornada) conforme Portaria 671/2021 para fiscalização.
// Formato texto posicional, similar ao AFD mas com jornada calculada (entrada/saída/intervalos).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function pad(s: string | number, len: number, ch = "0") {
  return String(s).padStart(len, ch).slice(-len);
}
function padR(s: string, len: number) {
  return String(s).padEnd(len, " ").slice(0, len);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { empresa_id, data_inicio, data_fim } = await req.json();
    if (!empresa_id || !data_inicio || !data_fim) {
      return json({ error: "empresa_id, data_inicio, data_fim obrigatórios" }, 400);
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: emp } = await sb.from("ponto_empresas")
      .select("cnpj, razao_social, cei, cno").eq("id", empresa_id).maybeSingle();
    if (!emp) return json({ error: "empresa não encontrada" }, 404);

    const { data: espelhos } = await sb.from("ponto_espelho_diario")
      .select("funcionario_id, data, trabalho_min, extra_min, falta_min, ponto_funcionarios!inner(cpf, pis, nome, matricula, empresa_id)")
      .gte("data", data_inicio).lte("data", data_fim);

    const filtrados = (espelhos || []).filter((e: any) => e.ponto_funcionarios?.empresa_id === empresa_id);

    const linhas: string[] = [];
    let nsr = 1;

    // Header
    linhas.push(
      pad(nsr++, 9) + "1" +
      "2" + // CNPJ
      pad((emp.cnpj || "").replace(/\D/g, ""), 14) +
      padR(emp.razao_social || "", 150) +
      padR(emp.cei || emp.cno || "", 12) +
      new Date().toISOString().slice(0, 10).replace(/-/g, "") +
      data_inicio.replace(/-/g, "") +
      data_fim.replace(/-/g, "")
    );

    // Jornadas (tipo 7 = jornada AEJ)
    for (const e of filtrados) {
      const f = e.ponto_funcionarios;
      linhas.push(
        pad(nsr++, 9) + "7" +
        e.data.replace(/-/g, "") +
        pad((f.cpf || "").replace(/\D/g, ""), 12) +
        padR(f.nome || "", 52) +
        pad(e.trabalho_min || 0, 5) +
        pad(e.extra_min || 0, 5) +
        pad(e.falta_min || 0, 5)
      );
    }

    // Trailer
    linhas.push(pad(nsr, 9) + "9" + pad(nsr - 1, 9));

    const conteudo = linhas.join("\n");

    // Salva log
    await sb.from("ponto_export_logs").insert({
      empresa_id,
      tipo: "aej",
      formato: "aej-671",
      periodo_inicio: data_inicio,
      periodo_fim: data_fim,
      status: "gerado",
      total_funcionarios: new Set(filtrados.map((x: any) => x.funcionario_id)).size,
      conteudo_preview: conteudo.slice(0, 500),
    });

    return new Response(conteudo, {
      headers: { ...corsHeaders, "Content-Type": "text/plain", "Content-Disposition": `attachment; filename="AEJ_${data_inicio}_${data_fim}.txt"` },
    });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
