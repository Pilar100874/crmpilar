import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessSurveyResponse {
  resposta_id: string;
  nota: number;
  comentario?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { resposta_id, nota, comentario }: ProcessSurveyResponse = await req.json();

    console.log('Processando resposta de pesquisa:', { resposta_id, nota });

    // Buscar a resposta existente
    const { data: resposta, error: respostaError } = await supabase
      .from('pesquisas_respostas')
      .select('*, pesquisas_satisfacao(*)')
      .eq('id', resposta_id)
      .single();

    if (respostaError || !resposta) {
      throw new Error(`Erro ao buscar resposta: ${respostaError?.message}`);
    }

    // Validar nota
    const pesquisa = resposta.pesquisas_satisfacao as any;
    if (nota < pesquisa.escala_minima || nota > pesquisa.escala_maxima) {
      throw new Error(`Nota inválida. Deve estar entre ${pesquisa.escala_minima} e ${pesquisa.escala_maxima}`);
    }

    // Atualizar a resposta
    const { data: respostaAtualizada, error: updateError } = await supabase
      .from('pesquisas_respostas')
      .update({
        nota,
        comentario: comentario || null,
        respondida_em: new Date().toISOString(),
      })
      .eq('id', resposta_id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Erro ao atualizar resposta: ${updateError.message}`);
    }

    console.log('Resposta processada com sucesso:', respostaAtualizada);

    // Atualizar a avaliação na conversação
    const { error: convUpdateError } = await supabase
      .from('conversations')
      .update({
        avaliacao: nota,
        comentario_avaliacao: comentario || null,
      })
      .eq('id', resposta.conversation_id);

    if (convUpdateError) {
      console.error('Erro ao atualizar conversação:', convUpdateError);
    }

    // Mensagem de agradecimento
    let mensagemAgradecimento = 'Obrigado pelo seu feedback! ';
    
    if (pesquisa.tipo === 'nps') {
      if (respostaAtualizada.classificacao === 'promotor') {
        mensagemAgradecimento += 'Ficamos felizes que você nos recomendaria! 🎉';
      } else if (respostaAtualizada.classificacao === 'neutro') {
        mensagemAgradecimento += 'Vamos nos esforçar para melhorar ainda mais! 💪';
      } else {
        mensagemAgradecimento += 'Sentimos muito. Sua opinião é muito importante para melhorarmos.';
      }
    } else if (pesquisa.tipo === 'csat') {
      if (nota >= pesquisa.escala_maxima * 0.8) {
        mensagemAgradecimento += 'Ficamos felizes que você está satisfeito! 😊';
      } else if (nota >= pesquisa.escala_maxima * 0.5) {
        mensagemAgradecimento += 'Vamos trabalhar para melhorar sua experiência! 💪';
      } else {
        mensagemAgradecimento += 'Sentimos muito. Sua opinião nos ajudará a melhorar.';
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Resposta processada com sucesso',
        resposta: respostaAtualizada,
        mensagem_agradecimento: mensagemAgradecimento,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Erro ao processar resposta de pesquisa:', error);
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
