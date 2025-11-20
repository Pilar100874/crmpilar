import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReabrirChatRequest {
  customerId: string;
  estabelecimentoId: string;
  canal: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { customerId, estabelecimentoId, canal }: ReabrirChatRequest = await req.json();

    console.log(`[Reabertura] Verificando reabertura para cliente ${customerId}`);

    // 1. Buscar último chat encerrado do cliente nas últimas 24 horas
    const dataLimite = new Date();
    dataLimite.setHours(dataLimite.getHours() - 24);

    const { data: ultimoChat } = await supabase
      .from('conversations')
      .select('*')
      .eq('customer_id', customerId)
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('canal', canal)
      .eq('chat_status', 'encerrado')
      .gte('tempo_encerramento', dataLimite.toISOString())
      .order('tempo_encerramento', { ascending: false })
      .limit(1)
      .single();

    if (!ultimoChat) {
      console.log(`[Reabertura] Nenhum chat recente para reabrir`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Nenhum chat recente encontrado',
          shouldCreateNew: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Verificar se já passou muito tempo desde o encerramento (mais de 24h)
    const tempoEncerramento = new Date(ultimoChat.tempo_encerramento);
    const horasDesdeEncerramento = (Date.now() - tempoEncerramento.getTime()) / (1000 * 60 * 60);

    if (horasDesdeEncerramento > 24) {
      console.log(`[Reabertura] Chat muito antigo (${horasDesdeEncerramento.toFixed(1)}h)`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Chat muito antigo',
          shouldCreateNew: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Reabrir chat
    const numeroReaberturas = (ultimoChat.numero_reaberturas || 0) + 1;

    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        chat_status: 'aguardando_atendente',
        tempo_encerramento: null,
        motivo_encerramento: null,
        numero_reaberturas: numeroReaberturas,
        reaberto_automaticamente: true,
        tempo_espera_inicio: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', ultimoChat.id);

    if (updateError) {
      throw updateError;
    }

    console.log(`[Reabertura] Chat ${ultimoChat.id} reaberto (reabertura #${numeroReaberturas})`);

    // 4. Registrar evento de reabertura como mensagem do sistema
    await supabase
      .from('messages')
      .insert({
        conversation_id: ultimoChat.id,
        sender: 'system',
        text: `Chat reaberto automaticamente (reabertura #${numeroReaberturas})`,
        payload: {
          type: 'system_event',
          event: 'chat_reaberto',
          numero_reabertura: numeroReaberturas,
          automatico: true
        }
      });

    // 5. Tentar rotear automaticamente
    try {
      const rotearResponse = await fetch(`${supabaseUrl}/functions/v1/rotear-chat-automatico`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          conversationId: ultimoChat.id,
          customerId: customerId,
          estabelecimentoId: estabelecimentoId,
          canal: canal
        })
      });

      const rotearData = await rotearResponse.json();
      console.log(`[Reabertura] Resultado do roteamento:`, rotearData);

    } catch (rotearError) {
      console.error('[Reabertura] Erro ao rotear:', rotearError);
      // Não falhar a reabertura se o roteamento falhar
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        conversationId: ultimoChat.id,
        numeroReaberturas: numeroReaberturas,
        message: 'Chat reaberto com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Reabertura] Erro:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        shouldCreateNew: true 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
