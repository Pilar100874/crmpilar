import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { estabelecimentoId } = await req.json();

    if (!estabelecimentoId) {
      throw new Error('estabelecimentoId é obrigatório');
    }

    console.log('[Workflow Padrão] Criando workflow para estabelecimento:', estabelecimentoId);

    // Verificar se já existe um workflow para este estabelecimento
    const { data: existingFlows } = await supabaseClient
      .from('omnichannel_flows')
      .select('id')
      .eq('estabelecimento_id', estabelecimentoId);

    if (existingFlows && existingFlows.length > 0) {
      console.log('[Workflow Padrão] Estabelecimento já possui workflow');
      return new Response(
        JSON.stringify({ success: true, message: 'Workflow já existe' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar a primeira fila do estabelecimento (ou criar uma fila padrão se não existir)
    let { data: filas } = await supabaseClient
      .from('filas_atendimento')
      .select('id, nome')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('ativa', true)
      .limit(1);

    let filaId = filas?.[0]?.id;
    let filaNome = filas?.[0]?.nome || 'Fila Padrão';

    // Se não existe fila, criar uma fila padrão
    if (!filaId) {
      console.log('[Workflow Padrão] Criando fila padrão');
      const { data: novaFila, error: filaError } = await supabaseClient
        .from('filas_atendimento')
        .insert({
          estabelecimento_id: estabelecimentoId,
          nome: 'Fila Padrão',
          descricao: 'Fila criada automaticamente',
          ativa: true,
          tipo_roteamento: 'disponibilidade',
          max_chats_por_atendente: 5,
          prioridade: 1
        })
        .select()
        .single();

      if (filaError) throw filaError;
      filaId = novaFila.id;
      filaNome = novaFila.nome;
    }

    // Criar o workflow padrão
    const defaultFlowData = {
      nodes: [
        {
          id: 'inicio-1',
          type: 'custom',
          position: { x: 250, y: 100 },
          data: {
            type: 'inicio',
            label: 'Início do Fluxo',
            config: {}
          }
        },
        {
          id: 'fila-1',
          type: 'custom',
          position: { x: 250, y: 250 },
          data: {
            type: 'fila',
            label: filaNome,
            config: {
              filaId: filaId,
              tipoRoteamento: 'disponibilidade',
              maxChatsSimultaneos: 5
            }
          }
        }
      ],
      edges: [
        {
          id: 'e-inicio-fila',
          source: 'inicio-1',
          target: 'fila-1',
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#10b981', strokeWidth: 2 },
          markerEnd: { type: 'arrowclosed', color: '#10b981' }
        }
      ],
      viewport: { x: 0, y: 0, zoom: 1 }
    };

    // Inserir o workflow
    const { data: workflow, error: workflowError } = await supabaseClient
      .from('omnichannel_flows')
      .insert({
        estabelecimento_id: estabelecimentoId,
        nome: 'Fluxo Padrão',
        descricao: 'Workflow criado automaticamente com configuração básica de roteamento',
        flow_data: defaultFlowData,
        ativo: true
      })
      .select()
      .single();

    if (workflowError) throw workflowError;

    console.log('[Workflow Padrão] Workflow criado com sucesso:', workflow.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        workflowId: workflow.id,
        message: 'Workflow padrão criado com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Workflow Padrão] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
