// Transmissão de eventos eSocial.
// IMPORTANTE: Transmissão real para gov.br exige certificado digital ICP-Brasil A1/A3
// e assinatura XML-DSig. Esta função monta o XML, persiste e marca como transmitido
// em modo "homologação simulada". Para produção, integrar com webservice gov.br/esocial.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

function buildXmlS2230(payload: any, eventoId: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtAfastTemp/v_S_01_02_00">
  <evtAfastTemp Id="ID${eventoId.replace(/-/g, '').substring(0,30)}">
    <ideEvento>
      <indRetif>1</indRetif>
      <tpAmb>2</tpAmb>
      <procEmi>1</procEmi>
      <verProc>1.0</verProc>
    </ideEvento>
    <infoAfastamento>
      <iniAfastamento>
        <dtIniAfast>${payload.data_inicio}</dtIniAfast>
        <codMotAfast>${mapMotivo(payload.tipo)}</codMotAfast>
        ${payload.data_fim ? `<dtTermAfast>${payload.data_fim}</dtTermAfast>` : ''}
        <observacao>${escapeXml(payload.motivo || '')}</observacao>
      </iniAfastamento>
    </infoAfastamento>
  </evtAfastTemp>
</eSocial>`;
}

function buildXmlS2299(payload: any, eventoId: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtDeslig/v_S_01_02_00">
  <evtDeslig Id="ID${eventoId.replace(/-/g, '').substring(0,30)}">
    <ideEvento>
      <indRetif>1</indRetif>
      <tpAmb>2</tpAmb>
      <procEmi>1</procEmi>
      <verProc>1.0</verProc>
    </ideEvento>
    <infoDeslig>
      <mtvDeslig>02</mtvDeslig>
      <dtDeslig>${payload.data_desligamento}</dtDeslig>
    </infoDeslig>
  </evtDeslig>
</eSocial>`;
}

function mapMotivo(tipo: string): string {
  const m: Record<string,string> = { ferias: '15', atestado: '01', licenca_maternidade: '17', acidente: '03' };
  return m[tipo] ?? '99';
}
function escapeXml(s: string) { return s.replace(/[<>&'"]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;' }[c]!)); }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    const { evento_id, modo = 'homologacao' } = await req.json().catch(() => ({}));

    const query = supabase.from('ponto_esocial_eventos').select('*').eq('status', 'pendente').limit(50);
    if (evento_id) query.eq('id', evento_id);
    const { data: eventos, error } = await query;
    if (error) throw error;

    const resultados = [];
    for (const ev of eventos ?? []) {
      let xml = '';
      if (ev.evento === 'S-2230') xml = buildXmlS2230(ev.payload, ev.id);
      else if (ev.evento === 'S-2299') xml = buildXmlS2299(ev.payload, ev.id);
      else continue;

      // TODO: assinar com ICP-Brasil + POST para webservice gov.br
      // Por ora, modo homologação: marca como transmitido com recibo simulado
      const recibo = `${modo.toUpperCase()}-${ev.evento}-${Date.now()}-${ev.id.substring(0,8)}`;

      await supabase.from('ponto_esocial_eventos').update({
        status: modo === 'producao' ? 'pendente_envio_real' : 'transmitido',
        xml_enviado: xml,
        recibo_protocolo: recibo,
        transmitido_em: new Date().toISOString(),
      }).eq('id', ev.id);

      resultados.push({ evento_id: ev.id, evento: ev.evento, recibo, modo });
    }

    return new Response(JSON.stringify({ total: resultados.length, modo, resultados }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
