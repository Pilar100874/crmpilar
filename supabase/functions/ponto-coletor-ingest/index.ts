// Ingest de lote vindo do Coletor Control iD (desktop Electron).
// Valida chave_comunicacao do equipamento, status ativo, data_inicio_coleta.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-chave-comunicacao",
};
type Reg = {
  cpf?: string; matricula?: string; codigo?: string;
  data_hora: string; tipo: string; equipamento_id?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { empresa_id, registros, equipamento_id: equipamentoIdBody, chave_comunicacao } = await req.json() as {
      empresa_id: string; registros: Reg[]; equipamento_id?: string; chave_comunicacao?: string;
    };
    if (!empresa_id || !Array.isArray(registros)) {
      return new Response(JSON.stringify({ error: "empresa_id e registros[] obrigatórios" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Validação do equipamento (se informado)
    const chaveHeader = req.headers.get("x-chave-comunicacao") || chave_comunicacao;
    const equipamentoId = equipamentoIdBody || registros.find(r => r.equipamento_id)?.equipamento_id;
    let equipamento: any = null;
    if (equipamentoId) {
      const { data } = await supabase.from("ponto_equipamentos")
        .select("id, status, chave_comunicacao, data_inicio_coleta, emails_notificacao, nome")
        .eq("id", equipamentoId).maybeSingle();
      equipamento = data;
      if (!equipamento) {
        return new Response(JSON.stringify({ error: "equipamento não encontrado" }),
          { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
      }
      if (equipamento.status === "inativo") {
        return new Response(JSON.stringify({ error: "equipamento inativo" }),
          { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
      }
      if (equipamento.chave_comunicacao && equipamento.chave_comunicacao !== chaveHeader) {
        return new Response(JSON.stringify({ error: "chave_comunicacao inválida" }),
          { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
      }
    }

    const { data: funcs } = await supabase.from("ponto_funcionarios")
      .select("id, cpf, matricula, codigo_relogio, data_inicio_ponto, registra_ponto, status").eq("empresa_id", empresa_id);
    const byCpf = new Map((funcs || []).map((f: any) => [(f.cpf || "").replace(/\D/g, ""), f]));
    const byMat = new Map((funcs || []).map((f: any) => [String(f.matricula || ""), f]));
    const byCod = new Map((funcs || []).map((f: any) => [String(f.codigo_relogio || ""), f]));

    let inseridos = 0; const ignorados: any[] = [];
    for (const r of registros) {
      const cpf = (r.cpf || "").replace(/\D/g, "");
      const f = byCpf.get(cpf) || byMat.get(String(r.matricula || "")) || byCod.get(String(r.codigo || ""));
      if (!f) { ignorados.push({ ...r, motivo: "funcionario_nao_encontrado" }); continue; }
      if (f.registra_ponto === false) { ignorados.push({ ...r, motivo: "funcionario_nao_registra_ponto" }); continue; }
      if (f.status && !["ativo", "ferias", "afastado"].includes(f.status)) {
        ignorados.push({ ...r, motivo: `funcionario_status_${f.status}` }); continue;
      }
      // Validações do equipamento por data
      if (equipamento?.data_inicio_coleta && r.data_hora < equipamento.data_inicio_coleta) {
        ignorados.push({ ...r, motivo: "anterior_data_inicio_coleta" }); continue;
      }
      if (f.data_inicio_ponto && r.data_hora.slice(0, 10) < f.data_inicio_ponto) {
        ignorados.push({ ...r, motivo: "anterior_inicio_ponto_funcionario" }); continue;
      }
      const { error } = await supabase.from("ponto_registros").insert({
        funcionario_id: f.id,
        tipo: r.tipo, origem: "coletor_controlid",
        data_hora: r.data_hora,
        equipamento_id: r.equipamento_id || equipamentoId,
        score_confianca: 100,
      });
      if (error) ignorados.push({ ...r, motivo: error.message });
      else inseridos++;
    }

    // Atualiza ultima_sync do equipamento
    if (equipamentoId) {
      await supabase.from("ponto_equipamentos").update({ ultima_sync: new Date().toISOString() }).eq("id", equipamentoId);
    }

    return new Response(JSON.stringify({ ok: true, inseridos, ignorados: ignorados.length, detalhes: ignorados.slice(0, 50) }),
      { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
