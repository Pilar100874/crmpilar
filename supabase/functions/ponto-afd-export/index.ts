// AFD/AEJ/AFDT - Portaria MTE 671/2021
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const pad = (v: string | number, n: number, c = "0", left = true) => {
  const s = String(v ?? "");
  return left ? s.padStart(n, c).slice(-n) : s.padEnd(n, c).slice(0, n);
};
const dt = (d: Date) =>
  `${pad(d.getDate(), 2)}${pad(d.getMonth() + 1, 2)}${d.getFullYear()}`;
const hm = (d: Date) => `${pad(d.getHours(), 2)}${pad(d.getMinutes(), 2)}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { estabelecimento_id, empresa_id, data_inicio, data_fim, layout = "AFD" } = await req.json();
    if (!estabelecimento_id || !empresa_id || !data_inicio || !data_fim) {
      return new Response(JSON.stringify({ error: "Parâmetros obrigatórios ausentes" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: empresa } = await sb.from("ponto_empresas").select("*").eq("id", empresa_id).single();
    const { data: registros } = await sb
      .from("ponto_registros")
      .select("*, ponto_funcionarios(cpf, pis, nome)")
      .eq("estabelecimento_id", estabelecimento_id)
      .gte("data_hora", data_inicio)
      .lte("data_hora", data_fim + "T23:59:59")
      .order("data_hora");

    const linhas: string[] = [];
    const now = new Date();
    const cnpj = (empresa?.cnpj || "").replace(/\D/g, "").padStart(14, "0");
    const razao = pad(empresa?.razao_social || "EMPRESA", 150, " ", false);

    if (layout === "AFD") {
      // Header tipo 1
      linhas.push(`000000001${pad(cnpj, 14)}${pad("", 12)}${razao}${dt(new Date(data_inicio))}${dt(new Date(data_fim))}${dt(now)}${hm(now)}001`);
      let seq = 2;
      for (const r of registros || []) {
        const f: any = r.ponto_funcionarios;
        const d = new Date(r.data_hora);
        // Tipo 3 - marcação
        linhas.push(`${pad(seq++, 9)}3${dt(d)}${hm(d)}${pad((f?.pis || "").replace(/\D/g, ""), 12)}`);
      }
      linhas.push(`${pad(seq, 9)}9${pad(seq - 2, 9)}${pad(0, 9)}${pad(0, 9)}${pad(0, 9)}T`);
    } else if (layout === "AFDT") {
      linhas.push(`1${pad(cnpj, 14)}${pad("", 12)}${razao}${dt(new Date(data_inicio))}${dt(new Date(data_fim))}${dt(now)}${hm(now)}AFDT 671`);
      for (const r of registros || []) {
        const f: any = r.ponto_funcionarios;
        const d = new Date(r.data_hora);
        linhas.push(`2${dt(d)}${hm(d)}${pad((f?.pis || "").replace(/\D/g, ""), 12)}N${pad(0, 4)}`);
      }
      linhas.push(`9${pad((registros || []).length, 9)}`);
    } else if (layout === "AEJ") {
      linhas.push(`1${pad(cnpj, 14)}${razao}${dt(new Date(data_inicio))}${dt(new Date(data_fim))}${dt(now)}${hm(now)}AEJ 671`);
      const { data: espelhos } = await sb
        .from("ponto_espelho_diario")
        .select("*, ponto_funcionarios(pis, nome)")
        .eq("estabelecimento_id", estabelecimento_id)
        .gte("data", data_inicio)
        .lte("data", data_fim);
      for (const e of espelhos || []) {
        const f: any = e.ponto_funcionarios;
        linhas.push(`2${pad((f?.pis || "").replace(/\D/g, ""), 12)}${dt(new Date(e.data))}${pad(e.horas_trabalhadas || 0, 4)}${pad(e.he_50 || 0, 4)}${pad(e.he_100 || 0, 4)}${pad(e.adicional_noturno || 0, 4)}`);
      }
      linhas.push(`9${pad((espelhos || []).length, 9)}`);
    }

    const conteudo = linhas.join("\r\n");
    const filename = `${layout}_${cnpj}_${data_inicio}_${data_fim}.txt`;

    // Salva no bucket
    const path = `${estabelecimento_id}/${layout.toLowerCase()}/${filename}`;
    await sb.storage.from("ponto-exports").upload(path, new TextEncoder().encode(conteudo), {
      contentType: "text/plain", upsert: true,
    });
    const { data: urlData } = await sb.storage.from("ponto-exports").createSignedUrl(path, 3600);

    return new Response(JSON.stringify({ ok: true, filename, url: urlData?.signedUrl, linhas: linhas.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
