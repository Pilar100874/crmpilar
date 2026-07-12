import { supabase } from '@/integrations/supabase/client';
import { VeiculoComStatus } from '@/types/logistica';
import { differenceInMinutes } from 'date-fns';
import { executarBlocoPush, PushBlockConfig } from '@/lib/pushExecutor';
import { executarBlocoSms } from '@/lib/smsExecutor';
import { executarBlocoWhatsapp, executarBlocoEmail } from '@/lib/workflowActionsExecutor';

interface AutomacaoFlowNode {
  id: string;
  type: string;
  data: {
    type: string;
    label: string;
    config: {
      tempo_minutos?: number;
      marcar_no_mapa?: boolean;
      icone_parada?: string;
      cor_icone_parada?: string;
      legenda_parada?: string;
      velocidade_maxima?: number;
      [key: string]: unknown;
    };
  };
}

interface ParadaMarcadaResult {
  veiculo_id: string;
  lat: number;
  lng: number;
  tempo_parado_minutos: number;
  categoria_tempo: string;
  icone_parada: string;
  cor_icone_parada: string;
  legenda_parada: string;
  automacao_id: string;
  automacao_nome: string;
}

// Evaluate automation rules against vehicle data and create markers
export async function executarAutomacoesLogistica(
  veiculos: VeiculoComStatus[],
  estabelecimentoId: string
): Promise<ParadaMarcadaResult[]> {
  const resultados: ParadaMarcadaResult[] = [];

  try {
    // Fetch active automations
    const { data: automacoes, error } = await supabase
      .from('logistica_automacoes')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('ativo', true);

    if (error) {
      console.error('Erro ao buscar automações:', error);
      return resultados;
    }

    if (!automacoes || automacoes.length === 0) {
      return resultados;
    }

    // Process each automation
    for (const automacao of automacoes) {
      const flowData = automacao.flow_data as unknown;
      if (!flowData || typeof flowData !== 'object') continue;
      
      const flowObj = flowData as { nodes?: AutomacaoFlowNode[] };
      if (!Array.isArray(flowObj.nodes)) continue;

      // Find condition nodes
      for (const node of flowObj.nodes) {
        const nodeType = node.data?.type;
        const config = node.data?.config || {};

        // Handle "condicao_parado" - Vehicle stopped condition
        if (nodeType === 'condicao_parado' && config.marcar_no_mapa) {
          const tempoMinutos = config.tempo_minutos || 30;
          
          for (const veiculo of veiculos) {
            if (veiculo.status === 'parado' && veiculo.ultima_posicao) {
              const minutosParado = differenceInMinutes(
                new Date(),
                new Date(veiculo.ultima_posicao.data_hora)
              );

              if (minutosParado >= tempoMinutos) {
                // Determine category based on time
                let categoriaTempo = 'menos_5';
                if (minutosParado >= 30) categoriaTempo = 'mais_30';
                else if (minutosParado >= 15) categoriaTempo = '15_30';
                else if (minutosParado >= 5) categoriaTempo = '5_15';

                resultados.push({
                  veiculo_id: veiculo.id,
                  lat: veiculo.ultima_posicao.lat,
                  lng: veiculo.ultima_posicao.lng,
                  tempo_parado_minutos: minutosParado,
                  categoria_tempo: categoriaTempo,
                  icone_parada: config.icone_parada || 'MapPin',
                  cor_icone_parada: config.cor_icone_parada || '#EAB308',
                  legenda_parada: config.legenda_parada || `Parado há ${minutosParado} min`,
                  automacao_id: automacao.id,
                  automacao_nome: automacao.nome
                });
              }
            }
          }
        }

        // Handle "condicao_velocidade" - Speed exceeded condition
        if (nodeType === 'condicao_velocidade' && config.marcar_no_mapa) {
          const velocidadeMaxima = config.velocidade_maxima || 80;
          
          for (const veiculo of veiculos) {
            if (veiculo.ultima_posicao && veiculo.ultima_posicao.velocidade > velocidadeMaxima) {
              resultados.push({
                veiculo_id: veiculo.id,
                lat: veiculo.ultima_posicao.lat,
                lng: veiculo.ultima_posicao.lng,
                tempo_parado_minutos: 0,
                categoria_tempo: 'velocidade',
                icone_parada: config.icone_parada || 'Gauge',
                cor_icone_parada: config.cor_icone_parada || '#DC2626',
                legenda_parada: config.legenda_parada || `Velocidade: ${Math.round(veiculo.ultima_posicao.velocidade)} km/h`,
                automacao_id: automacao.id,
                automacao_nome: automacao.nome
              });
            }
        }

        // Handle "disparar_push" - dispara push notification
        if ((nodeType as string) === 'disparar_push') {
          try {
            const pushCfg = config as unknown as PushBlockConfig;
            await executarBlocoPush(pushCfg, {
              variaveis: { veiculos, automacao: { id: automacao.id, nome: automacao.nome } },
              workflow_id: automacao.id,
              workflow_tipo: 'logistica',
              origem: 'logistica_automacao',
            });
          } catch (e) {
            console.error('[logistica] falha ao disparar push', e);
          }

        // Handle "enviar_sms" - envia SMS via gateway
        if ((nodeType as string) === 'enviar_sms') {
          try {
            await executarBlocoSms(config as any, {
              variaveis: { veiculos, automacao: { id: automacao.id, nome: automacao.nome } },
              estabelecimento_id: estabelecimentoId,
              workflow_tipo: 'logistica',
              origem: 'logistica_automacao',
            });
          } catch (e) {
            console.error('[logistica] falha ao enviar SMS', e);
          }
        }
      }
      }
    }
    }

    // Save markers to database (upsert to avoid duplicates)
    if (resultados.length > 0) {
      await salvarParadasMarcadas(resultados, estabelecimentoId);
    }

    return resultados;
  } catch (error) {
    console.error('Erro ao executar automações:', error);
    return resultados;
  }
}

// Save marked stops to database
async function salvarParadasMarcadas(
  paradas: ParadaMarcadaResult[],
  estabelecimentoId: string
): Promise<void> {
  try {
    for (const parada of paradas) {
      // Check if marker already exists for this vehicle (to avoid duplicates)
      const { data: existing } = await supabase
        .from('logistica_paradas_marcadas')
        .select('id')
        .eq('veiculo_id', parada.veiculo_id)
        .eq('estabelecimento_id', estabelecimentoId)
        .single();

      const now = new Date().toISOString();

      if (existing) {
        // Update existing marker
        await supabase
          .from('logistica_paradas_marcadas')
          .update({
            lat: parada.lat,
            lng: parada.lng,
            tempo_parado_minutos: parada.tempo_parado_minutos,
            categoria_tempo: parada.categoria_tempo,
            icone_parada: parada.icone_parada,
            cor_icone_parada: parada.cor_icone_parada,
            legenda_parada: `${parada.legenda_parada} (${parada.automacao_nome})`
          })
          .eq('id', existing.id);
      } else {
        // Insert new marker
        await supabase
          .from('logistica_paradas_marcadas')
          .insert({
            veiculo_id: parada.veiculo_id,
            estabelecimento_id: estabelecimentoId,
            lat: parada.lat,
            lng: parada.lng,
            tempo_parado_minutos: parada.tempo_parado_minutos,
            categoria_tempo: parada.categoria_tempo,
            icone_parada: parada.icone_parada,
            cor_icone_parada: parada.cor_icone_parada,
            legenda_parada: `${parada.legenda_parada} (${parada.automacao_nome})`,
            data_inicio: now,
            automacao_id: parada.automacao_id
          });
      }
    }
  } catch (error) {
    console.error('Erro ao salvar paradas marcadas:', error);
  }
}

// Clean up old markers for vehicles that no longer meet conditions
export async function limparParadasAntigas(
  veiculosIdsAtivos: string[],
  estabelecimentoId: string
): Promise<void> {
  try {
    // Get all markers for this establishment
    const { data: markers } = await supabase
      .from('logistica_paradas_marcadas')
      .select('id, veiculo_id')
      .eq('estabelecimento_id', estabelecimentoId);

    if (!markers) return;

    // Delete markers for vehicles that are no longer in the active list
    for (const marker of markers) {
      if (!veiculosIdsAtivos.includes(marker.veiculo_id)) {
        await supabase
          .from('logistica_paradas_marcadas')
          .delete()
          .eq('id', marker.id);
      }
    }
  } catch (error) {
    console.error('Erro ao limpar paradas antigas:', error);
  }
}
