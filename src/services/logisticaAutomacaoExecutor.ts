import { supabase } from '@/integrations/supabase/client';
import { VeiculoComStatus } from '@/types/logistica';
import { differenceInMinutes } from 'date-fns';
import { executarBlocoPush, PushBlockConfig } from '@/lib/pushExecutor';
import { executarBlocoSms } from '@/lib/smsExecutor';
import { executarBlocoWhatsapp, executarBlocoEmail, executarBlocoWebhook, executarBlocoMensagemInterna, executarBlocoAvisoSistema } from '@/lib/workflowActionsExecutor';

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
        }

        // Contexto comum para ações
        const wfCtx = {
          variaveis: { veiculos, automacao: { id: automacao.id, nome: automacao.nome } },
          estabelecimento_id: estabelecimentoId,
          workflow_tipo: 'logistica' as const,
          origem: 'logistica_automacao',
        };

        // --- Helpers de localização (Google Maps) ---
        const enviarLocalizacao = !!(config as any).enviar_localizacao;
        const posMap: Record<string, { lat: number; lng: number } | null> = {};
        if (enviarLocalizacao && veiculos.length) {
          for (const v of veiculos) {
            const { data: pos } = await supabase
              .from('veiculo_posicoes')
              .select('lat,lng')
              .eq('veiculo_id', (v as any).id)
              .order('data_hora', { ascending: false })
              .limit(1)
              .maybeSingle();
            posMap[(v as any).id] = pos ? { lat: (pos as any).lat, lng: (pos as any).lng } : null;
          }
        }
        const linkFor = (vid: string) => {
          const p = posMap[vid];
          return p ? `https://www.google.com/maps?q=${p.lat},${p.lng}` : null;
        };
        const appendLocOne = (msg: string, vid: string) => {
          if (!enviarLocalizacao) return msg;
          const l = linkFor(vid);
          return l ? `${msg}\n\n📍 Localização atual: ${l}` : msg;
        };
        const appendLocAll = (msg: string) => {
          if (!enviarLocalizacao) return msg;
          const links = veiculos.map(v => linkFor((v as any).id)).filter(Boolean) as string[];
          return links.length ? `${msg}\n\n📍 Localização atual:\n${links.join('\n')}` : msg;
        };

        // Handle "disparar_push"
        if ((nodeType as string) === 'disparar_push') {
          try {
            const cfgPush = { ...(config as any), corpo: appendLocAll(String((config as any).corpo || '')) };
            await executarBlocoPush(cfgPush as PushBlockConfig, { ...wfCtx, workflow_id: automacao.id });
          } catch (e) { console.error('[logistica] falha ao disparar push', e); }
        }

        // Handle "enviar_sms"
        if ((nodeType as string) === 'enviar_sms') {
          try {
            const msgSms = String((config as any).mensagem || (config as any).message || '');
            const cfgSms = { ...(config as any), message: appendLocAll(msgSms) };
            await executarBlocoSms(cfgSms as any, wfCtx);
          } catch (e) { console.error('[logistica] falha ao enviar SMS', e); }
        }

        // Handle "acao_whatsapp"
        if ((nodeType as string) === 'acao_whatsapp') {
          try {
            const destino = (config as any).destino_tipo
              || ((config as any).usar_telefone_cliente ? 'cliente' : 'numero');
            const whatsappSessionId = (config as any).whatsappSessionId || null;
            const whatsappSessionName = (config as any).whatsappSessionName || null;
            const whatsappNumeroId = (config as any).whatsappNumeroId || null;
            const mensagemTpl = String((config as any).mensagem || '');

            const commonWpp = { whatsappSessionId, whatsappSessionName, whatsappNumeroId };

            if (destino === 'motorista_atual') {
              const { fetchMotoristasAtuais, formatWhatsappNumber } = await import('@/lib/logistica/cvDriverLookup');
              const ids = veiculos.map(v => v.id);
              const map = await fetchMotoristasAtuais(ids);
              for (const veic of veiculos) {
                const mot = map[veic.id];
                const tel = formatWhatsappNumber(mot?.telefone || null);
                if (!mot || !tel) continue;
                let mensagem = mensagemTpl
                  .replace(/\{placa\}/g, (veic as any).placa || '')
                  .replace(/\{motorista\}/g, mot.nome || '');
                mensagem = appendLocOne(mensagem, (veic as any).id);
                await executarBlocoWhatsapp(
                  { telefone: tel, mensagem, ...commonWpp },
                  wfCtx
                );
              }
            } else {
              const mensagem = appendLocAll(mensagemTpl);
              await executarBlocoWhatsapp(
                { telefone: (config as any).telefone || '', mensagem, ...commonWpp },
                wfCtx
              );
            }
          } catch (e) { console.error('[logistica] falha ao enviar WhatsApp', e); }
        }


        // Handle "acao_email"
        if ((nodeType as string) === 'acao_email') {
          try {
            await executarBlocoEmail(
              {
                email_destino: config.email_destino,
                assunto_email: config.assunto_email,
                corpo_email: appendLocAll(String((config as any).corpo_email || '')),
              },
              wfCtx
            );
          } catch (e) { console.error('[logistica] falha ao enviar e-mail', e); }
        }

        // Handle "acao_webhook" / "webhook"
        if ((nodeType as string) === 'acao_webhook' || (nodeType as string) === 'webhook') {
          try { await executarBlocoWebhook(config as any, wfCtx); }
          catch (e) { console.error('[logistica] falha no webhook', e); }
        }

        // Handle "enviar_mensagem_interna" / "acao_mensagem_interna"
        if ((nodeType as string) === 'enviar_mensagem_interna' || (nodeType as string) === 'acao_mensagem_interna') {
          try { await executarBlocoMensagemInterna(config as any, wfCtx); }
          catch (e) { console.error('[logistica] falha na mensagem interna', e); }
        }

        // Handle "acao_notificacao" / "enviar_aviso_sistema" / "acao_aviso_sistema"
        if (
          (nodeType as string) === 'acao_notificacao' ||
          (nodeType as string) === 'enviar_aviso_sistema' ||
          (nodeType as string) === 'acao_aviso_sistema'
        ) {
          try {
            const titulo = (config as any).titulo_notificacao || (config as any).titulo || 'Notificação';
            const mensagemBase = String(
              (config as any).corpo_notificacao || (config as any).mensagem || ''
            );
            await executarBlocoAvisoSistema(
              {
                ...(config as any),
                titulo,
                mensagem: appendLocAll(mensagemBase),
              },
              wfCtx
            );
          } catch (e) { console.error('[logistica] falha no aviso do sistema', e); }
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
