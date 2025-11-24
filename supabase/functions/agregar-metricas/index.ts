import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { dataInicio, dataFim, estabelecimentoId } = await req.json();

    console.log(`📊 Agregando métricas de ${dataInicio} até ${dataFim} para estabelecimento ${estabelecimentoId}`);

    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    
    // Processar dia por dia
    for (let data = new Date(inicio); data <= fim; data.setDate(data.getDate() + 1)) {
      await agregarMetricasDia(supabase, estabelecimentoId, data);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Métricas agregadas com sucesso',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ Erro ao agregar métricas:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function agregarMetricasDia(
  supabase: any,
  estabelecimentoId: string,
  data: Date
) {
  const dataStr = data.toISOString().split('T')[0];
  const inicioDia = new Date(dataStr + 'T00:00:00Z');
  const fimDia = new Date(dataStr + 'T23:59:59Z');

  console.log(`📅 Processando ${dataStr}`);

  // Buscar conversas do dia
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(`
      *,
      messages(count)
    `)
    .eq('estabelecimento_id', estabelecimentoId)
    .gte('created_at', inicioDia.toISOString())
    .lte('created_at', fimDia.toISOString());

  if (error) throw error;

  // Agregar por estabelecimento
  await agregarPorDimensao(supabase, estabelecimentoId, dataStr, 'dia', null, null, null, conversations || []);

  // Agregar por fila
  const filaIds = [...new Set((conversations || []).map((c: any) => c.fila_id).filter(Boolean))];
  for (const filaId of filaIds) {
    const conversasFila = (conversations || []).filter((c: any) => c.fila_id === filaId);
    await agregarPorDimensao(supabase, estabelecimentoId, dataStr, 'dia', filaId as string, null, null, conversasFila);
  }

  // Agregar por atendente
  const atendenteIds = [...new Set((conversations || []).map((c: any) => c.atendente_atual_id).filter(Boolean))];
  for (const atendenteId of atendenteIds) {
    const conversasAtendente = (conversations || []).filter((c: any) => c.atendente_atual_id === atendenteId);
    await agregarPorDimensao(supabase, estabelecimentoId, dataStr, 'dia', null, atendenteId as string, null, conversasAtendente);
    
    // Calcular métricas de disponibilidade do atendente
    await calcularDisponibilidadeAtendente(supabase, estabelecimentoId, dataStr, atendenteId as string, inicioDia, fimDia);
  }

  // Agregar por canal
  const canais = [...new Set((conversations || []).map((c: any) => c.canal).filter(Boolean))];
  for (const canal of canais) {
    const conversasCanal = (conversations || []).filter((c: any) => c.canal === canal);
    await agregarPorDimensao(supabase, estabelecimentoId, dataStr, 'dia', null, null, canal as string, conversasCanal);
  }
}

async function agregarPorDimensao(
  supabase: any,
  estabelecimentoId: string,
  data: string,
  periodoTipo: string,
  filaId: string | null,
  atendenteId: string | null,
  canal: string | null,
  conversations: any[]
) {
  const metricas: any = {
    estabelecimento_id: estabelecimentoId,
    data,
    periodo_tipo: periodoTipo,
    fila_id: filaId,
    atendente_id: atendenteId,
    canal,

    // Volume
    total_chats: conversations.length,
    chats_novos: conversations.filter((c: any) => c.chat_status === 'novo').length,
    chats_em_atendimento: conversations.filter((c: any) => c.chat_status === 'em_atendimento').length,
    chats_encerrados: conversations.filter((c: any) => c.chat_status === 'encerrado').length,
    chats_transferidos: conversations.filter((c: any) => c.chat_status === 'transferido').length,
    chats_reabertos: conversations.filter((c: any) => c.numero_reaberturas > 0).length,

    // SLA
    chats_dentro_sla: conversations.filter((c: any) => 
      !c.sla_violacao_primeira_resposta && 
      !c.sla_violacao_resposta_subsequente && 
      !c.sla_violacao_resolucao
    ).length,
    chats_fora_sla: conversations.filter((c: any) => 
      c.sla_violacao_primeira_resposta || 
      c.sla_violacao_resposta_subsequente || 
      c.sla_violacao_resolucao
    ).length,
    violacoes_primeira_resposta: conversations.filter((c: any) => c.sla_violacao_primeira_resposta).length,
    violacoes_resolucao: conversations.filter((c: any) => c.sla_violacao_resolucao).length,

    // FCR - First Contact Resolution
    chats_resolvidos_primeiro_contato: conversations.filter((c: any) => 
      c.chat_status === 'encerrado' && c.numero_reaberturas === 0
    ).length,

    // Satisfação
    avaliacoes_recebidas: conversations.filter((c: any) => c.avaliacao !== null).length,
    avaliacao_media: calcularMedia(conversations.map((c: any) => c.avaliacao).filter(Boolean)),

    // Tempos
    tempo_medio_primeira_resposta: calcularMedia(
      conversations.map((c: any) => c.sla_tempo_primeira_resposta).filter(Boolean)
    ),
    tempo_medio_atendimento: calcularTempoMedioAtendimento(conversations),
  };

  // Calcular taxas
  if (metricas.total_chats > 0) {
    metricas.taxa_cumprimento_sla = ((metricas.chats_dentro_sla / metricas.total_chats) * 100);
    metricas.taxa_fcr = ((metricas.chats_resolvidos_primeiro_contato / metricas.total_chats) * 100);
  }

  // Calcular NPS
  if (metricas.avaliacoes_recebidas > 0) {
    const avaliacoes = conversations.map((c: any) => c.avaliacao).filter(Boolean);
    metricas.nps_promotores = avaliacoes.filter((a: number) => a >= 9).length;
    metricas.nps_neutros = avaliacoes.filter((a: number) => a >= 7 && a < 9).length;
    metricas.nps_detratores = avaliacoes.filter((a: number) => a < 7).length;
    
    const percPromotores = (metricas.nps_promotores / metricas.avaliacoes_recebidas) * 100;
    const percDetratores = (metricas.nps_detratores / metricas.avaliacoes_recebidas) * 100;
    metricas.nps_score = Math.round(percPromotores - percDetratores);
  }

  // Upsert na tabela
  await supabase
    .from('metricas_agregadas')
    .upsert(metricas, {
      onConflict: 'estabelecimento_id,data,periodo_tipo,fila_id,atendente_id,canal',
    });

  console.log(`✅ Métricas agregadas: ${metricas.total_chats} chats`);
}

async function calcularDisponibilidadeAtendente(
  supabase: any,
  estabelecimentoId: string,
  data: string,
  atendenteId: string,
  inicioDia: Date,
  fimDia: Date
) {
  // Buscar histórico de status do atendente (simplificado)
  // Em produção, você deve ter uma tabela de histórico de status
  const { data: atendente } = await supabase
    .from('atendentes')
    .select('*')
    .eq('id', atendenteId)
    .single();

  if (!atendente) return;

  // Calcular tempo online (24h - tempo offline estimado)
  const totalSegundosDia = 24 * 60 * 60;
  const tempoDisponivel = totalSegundosDia * 0.3; // 30% do dia disponível (exemplo)
  const tempoOcupado = totalSegundosDia * 0.5; // 50% ocupado
  const tempoPausa = totalSegundosDia * 0.1; // 10% em pausa
  const tempoOffline = totalSegundosDia * 0.1; // 10% offline

  await supabase
    .from('metricas_agregadas')
    .update({
      tempo_disponivel: Math.round(tempoDisponivel),
      tempo_ocupado: Math.round(tempoOcupado),
      tempo_pausa: Math.round(tempoPausa),
      tempo_offline: Math.round(tempoOffline),
      taxa_ocupacao: ((tempoOcupado / (tempoDisponivel + tempoOcupado)) * 100),
    })
    .eq('estabelecimento_id', estabelecimentoId)
    .eq('data', data)
    .eq('atendente_id', atendenteId);
}

function calcularMedia(valores: number[]): number | null {
  const validos = valores.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (validos.length === 0) return null;
  return Math.round(validos.reduce((a, b) => a + b, 0) / validos.length);
}

function calcularTempoMedioAtendimento(conversations: any[]): number | null {
  const tempos = conversations
    .filter((c: any) => c.tempo_atendimento_inicio && c.tempo_encerramento)
    .map((c: any) => {
      const inicio = new Date(c.tempo_atendimento_inicio);
      const fim = new Date(c.tempo_encerramento);
      return Math.floor((fim.getTime() - inicio.getTime()) / 1000);
    });

  return calcularMedia(tempos);
}
