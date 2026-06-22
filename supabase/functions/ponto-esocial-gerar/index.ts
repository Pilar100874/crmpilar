// Gera eventos eSocial (S-2230 afastamento, S-2240 condições, S-1200 remuneração)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const xmlEscape = (s: string) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { estabelecimento_id, evento, referencia_id } = await req.json();
    if (!estabelecimento_id || !evento) {
      return new Response(JSON.stringify({ error: "Parâmetros obrigatórios ausentes" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let xml = "";
    let funcionario_id: string | null = null;
    const payload: any = {};

    if (evento === "S-2230" && referencia_id) {
      const { data: f } = await sb.from("ponto_ferias_afastamentos")
        .select("*, ponto_funcionarios(cpf, nome, matricula)").eq("id", referencia_id).single();
      if (!f) throw new Error("Afastamento não encontrado");
      funcionario_id = f.funcionario_id;
      const fc: any = f.ponto_funcionarios;
      payload.afastamento = f;
      xml = `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtAfastTemp/v_S_01_03_00">
  <evtAfastTemp Id="ID${Date.now()}">
    <ideEvento><indRetif>1</indRetif><tpAmb>2</tpAmb><procEmi>1</procEmi><verProc>1.0</verProc></ideEvento>
    <ideVinculo>
      <cpfTrab>${xmlEscape((fc?.cpf || "").replace(/\D/g, ""))}</cpfTrab>
      <matricula>${xmlEscape(fc?.matricula || "")}</matricula>
    </ideVinculo>
    <infoAfastamento>
      <iniAfastamento>
        <dtIniAfast>${f.data_inicio}</dtIniAfast>
        <codMotAfast>${f.tipo === "ferias" ? "15" : "01"}</codMotAfast>
        <motivoBase>${xmlEscape(f.motivo || "")}</motivoBase>
      </iniAfastamento>
    </infoAfastamento>
  </evtAfastTemp>
</eSocial>`;
    } else if (evento === "S-2240" && referencia_id) {
      const { data: f } = await sb.from("ponto_funcionarios").select("*").eq("id", referencia_id).single();
      funcionario_id = f?.id;
      payload.funcionario = f;
      xml = `<?xml version="1.0" encoding="UTF-8"?>
<eSocial>
  <evtExpRisco Id="ID${Date.now()}">
    <ideEvento><tpAmb>2</tpAmb><procEmi>1</procEmi><verProc>1.0</verProc></ideEvento>
    <ideVinculo><cpfTrab>${xmlEscape((f?.cpf || "").replace(/\D/g, ""))}</cpfTrab></ideVinculo>
    <infoExpRisco><dtIniCondicao>${f?.data_admissao || new Date().toISOString().slice(0, 10)}</dtIniCondicao></infoExpRisco>
  </evtExpRisco>
</eSocial>`;
    } else {
      xml = `<?xml version="1.0" encoding="UTF-8"?><eSocial><!-- ${evento} stub --></eSocial>`;
    }

    const { data: ev, error } = await sb.from("ponto_esocial_eventos").insert({
      estabelecimento_id, funcionario_id, evento, referencia_id, payload, xml, status: "pendente",
    }).select().single();
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, evento_id: ev.id, xml }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
