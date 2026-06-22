// Importa funcionários em lote via CSV
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const parseCSV = (txt: string): Record<string, string>[] => {
  const lines = txt.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0].split(/[;,]/).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((l) => {
    const cells = l.split(/[;,]/);
    const o: any = {};
    header.forEach((h, i) => (o[h] = (cells[i] || "").trim()));
    return o;
  });
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { estabelecimento_id, ponto_empresa_id, csv, arquivo_nome } = await req.json();
    if (!estabelecimento_id || !ponto_empresa_id || !csv) {
      return new Response(JSON.stringify({ error: "Parâmetros obrigatórios ausentes" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const rows = parseCSV(csv);
    const { data: log } = await sb.from("ponto_importacoes").insert({
      estabelecimento_id, tipo: "funcionarios", arquivo_nome, total_linhas: rows.length,
      status: "processando",
    }).select().single();

    const erros: any[] = [];
    let ok = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        if (!r.nome || !r.cpf) throw new Error("nome e cpf obrigatórios");
        await sb.from("ponto_funcionarios").insert({
          estabelecimento_id,
          ponto_empresa_id,
          nome: r.nome,
          cpf: r.cpf.replace(/\D/g, ""),
          pis: r.pis ? r.pis.replace(/\D/g, "") : null,
          matricula: r.matricula || null,
          email: r.email || null,
          telefone: r.telefone || null,
          cargo: r.cargo || null,
          data_admissao: r.data_admissao || null,
          ativo: true,
        });
        ok++;
      } catch (e) {
        erros.push({ linha: i + 2, erro: String(e), dados: r });
      }
    }

    await sb.from("ponto_importacoes").update({
      total_sucesso: ok, total_erro: erros.length, erros,
      status: "concluido",
    }).eq("id", log!.id);

    return new Response(JSON.stringify({ ok: true, importacao_id: log!.id, sucesso: ok, erros: erros.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
