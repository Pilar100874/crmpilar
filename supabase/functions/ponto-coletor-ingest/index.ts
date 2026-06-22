// Ingest de lote vindo do Coletor Control iD (desktop Electron).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
type Reg = {
  cpf?: string; matricula?: string; codigo?: string;
  data_hora: string; tipo: string; equipamento_id?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { empresa_id, registros } = await req.json() as { empresa_id: string; registros: Reg[] };
    if (!empresa_id || !Array.isArray(registros)) {
      return new Response(JSON.stringify({ error: "empresa_id e registros[] obrigatórios" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: funcs } = await supabase.from("ponto_funcionarios")
      .select("id, cpf, matricula, codigo_relogio").eq("empresa_id", empresa_id);
    const byCpf = new Map((funcs || []).map((f: any) => [(f.cpf || "").replace(/\D/g, ""), f.id]));
    const byMat = new Map((funcs || []).map((f: any) => [String(f.matricula || ""), f.id]));
    const byCod = new Map((funcs || []).map((f: any) => [String(f.codigo_relogio || ""), f.id]));

    let inseridos = 0, ignorados: any[] = [];
    for (const r of registros) {
      const cpf = (r.cpf || "").replace(/\D/g, "");
      const fid = byCpf.get(cpf) || byMat.get(String(r.matricula || "")) || byCod.get(String(r.codigo || ""));
      if (!fid) { ignorados.push({ ...r, motivo: "funcionario_nao_encontrado" }); continue; }
      const { error } = await supabase.from("ponto_registros").insert({
        funcionario_id: fid,
        tipo: r.tipo, origem: "coletor_controlid",
        data_hora: r.data_hora,
        equipamento_id: r.equipamento_id,
        score_confianca: 100, // dispositivo físico autorizado
      });
      if (error) ignorados.push({ ...r, motivo: error.message });
      else inseridos++;
    }
    return new Response(JSON.stringify({ ok: true, inseridos, ignorados: ignorados.length, detalhes: ignorados.slice(0, 50) }),
      { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
