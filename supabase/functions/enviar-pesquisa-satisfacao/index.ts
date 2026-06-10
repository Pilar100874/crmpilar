import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendSurveyRequest {
  conversation_id: string;
  customer_id: string;
  atendente_id?: string;
  fila_id?: string;
  canal: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { conversation_id, customer_id, atendente_id, fila_id, canal }: SendSurveyRequest = await req.json();

    console.log('Iniciando envio de pesquisa de satisfação:', { conversation_id, customer_id, canal });

    // Buscar a conversação para obter o estabelecimento_id
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('estabelecimento_id')
      .eq('id', conversation_id)
      .single();

    if (convError || !conversation) {
      throw new Error(`Erro ao buscar conversação: ${convError?.message}`);
    }

    // Buscar pesquisas ativas aplicáveis
    const { data: pesquisas, error: pesquisasError } = await supabase
      .from('pesquisas_satisfacao')
      .select('*')
      .eq('estabelecimento_id', conversation.estabelecimento_id)
      .eq('ativa', true)
      .contains('canais', [canal]);

    if (pesquisasError) {
      throw new Error(`Erro ao buscar pesquisas: ${pesquisasError.message}`);
    }

    if (!pesquisas || pesquisas.length === 0) {
      console.log('Nenhuma pesquisa ativa encontrada para este canal e estabelecimento');
      return new Response(
        JSON.stringify({ message: 'Nenhuma pesquisa ativa configurada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Filtrar pesquisas aplicáveis (por fila ou atendente, se especificado)
    const pesquisasAplicaveis = pesquisas.filter(p => {
      // Se a pesquisa tem filtros de fila e a fila não está incluída, pular
      if (p.aplica_filas && p.aplica_filas.length > 0 && fila_id) {
        if (!p.aplica_filas.includes(fila_id)) {
          return false;
        }
      }
      
      // Se a pesquisa tem filtros de atendente e o atendente não está incluído, pular
      if (p.aplica_atendentes && p.aplica_atendentes.length > 0 && atendente_id) {
        if (!p.aplica_atendentes.includes(atendente_id)) {
          return false;
        }
      }
      
      return true;
    });

    if (pesquisasAplicaveis.length === 0) {
      console.log('Nenhuma pesquisa aplicável após filtros');
      return new Response(
        JSON.stringify({ message: 'Nenhuma pesquisa aplicável aos filtros' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Selecionar a primeira pesquisa aplicável (pode ser melhorado com priorização)
    const pesquisaSelecionada = pesquisasAplicaveis[0];

    console.log('Pesquisa selecionada:', pesquisaSelecionada.nome);

    // Verificar se já existe uma resposta pendente para esta conversação
    const { data: respostaExistente, error: respostaExistenteError } = await supabase
      .from('pesquisas_respostas')
      .select('id')
      .eq('conversation_id', conversation_id)
      .is('respondida_em', null)
      .single();

    if (respostaExistente) {
      console.log('Já existe uma pesquisa pendente para esta conversação');
      return new Response(
        JSON.stringify({ message: 'Pesquisa já enviada e pendente de resposta' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Criar registro de resposta pendente (nota inicial -1 para indicar não respondido)
    const { data: novaResposta, error: respostaError } = await supabase
      .from('pesquisas_respostas')
      .insert({
        pesquisa_id: pesquisaSelecionada.id,
        conversation_id,
        customer_id,
        atendente_id: atendente_id || null,
        fila_id: fila_id || null,
        nota: -1, // Marcador temporário até o cliente responder
        canal,
        enviada_em: new Date().toISOString(),
      })
      .select()
      .single();

    if (respostaError) {
      throw new Error(`Erro ao criar registro de resposta: ${respostaError.message}`);
    }

    console.log('Registro de pesquisa criado:', novaResposta.id);

    // Montar mensagem da pesquisa
    let mensagem = `${pesquisaSelecionada.pergunta_principal}\n\n`;
    mensagem += `Por favor, responda com um número de ${pesquisaSelecionada.escala_minima} a ${pesquisaSelecionada.escala_maxima}:\n`;
    
    if (pesquisaSelecionada.label_minima) {
      mensagem += `${pesquisaSelecionada.escala_minima} = ${pesquisaSelecionada.label_minima}\n`;
    }
    if (pesquisaSelecionada.label_maxima) {
      mensagem += `${pesquisaSelecionada.escala_maxima} = ${pesquisaSelecionada.label_maxima}\n`;
    }

    if (pesquisaSelecionada.permite_comentario && pesquisaSelecionada.pergunta_comentario) {
      mensagem += `\n${pesquisaSelecionada.pergunta_comentario}`;
    }


    // Enviar a pesquisa de fato via canal apropriado
    if (canal === 'whatsapp') {
      try {
        // Buscar dados do cliente
        const { data: customer } = await supabase
          .from('customers')
          .select('telefone')
          .eq('id', customer_id)
          .single();

        if (!customer?.telefone) {
          throw new Error('Cliente sem telefone cadastrado');
        }

        // Buscar configuração WAHA do estabelecimento
        const { data: wahaConfig } = await supabase
          .from('whatsapp_config')
          .select('waha_url, waha_api_key')
          .eq('estabelecimento_id', conversation.estabelecimento_id)
          .single();

        if (!wahaConfig?.waha_url || !wahaConfig?.waha_api_key) {
          throw new Error('Configuração WAHA não encontrada');
        }

        // Buscar sessão ativa para o estabelecimento
        const { data: session } = await supabase
          .from('whatsapp_sessions')
          .select('session_name')
          .eq('estabelecimento_id', conversation.estabelecimento_id)
          .eq('status', 'active')
          .single();

        if (!session?.session_name) {
          throw new Error('Nenhuma sessão WhatsApp ativa encontrada');
        }

        // Enviar mensagem via Evolution API
        const evoUrl = String(wahaConfig.waha_url).replace(/\/+$/, "");
        const instance = session.session_name;
        const wahaResponse = await fetch(`${evoUrl}/message/sendText/${encodeURIComponent(instance)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': wahaConfig.waha_api_key,
          },
          body: JSON.stringify({
            number: String(customer.telefone).replace(/\D/g, ''),
            text: mensagem,
          }),
        });

        if (!wahaResponse.ok) {
          const errorText = await wahaResponse.text();
          throw new Error(`Erro ao enviar mensagem Evolution: ${errorText}`);
        }

        console.log('✓ Pesquisa enviada via WhatsApp para:', customer.telefone);
      } catch (error) {
        console.error('Erro ao enviar pesquisa via WhatsApp:', error);
        throw error;
      }
    } else {
      console.log(`Canal ${canal} ainda não implementado para envio de pesquisas`);
    }


    return new Response(
      JSON.stringify({
        success: true,
        message: 'Pesquisa enviada com sucesso',
        resposta_id: novaResposta.id,
        pesquisa: {
          id: pesquisaSelecionada.id,
          nome: pesquisaSelecionada.nome,
          tipo: pesquisaSelecionada.tipo,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Erro ao enviar pesquisa de satisfação:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
