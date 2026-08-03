import { supabase } from '@/integrations/supabase/client';
import { VeiculoComStatus } from '@/types/logistica';
import { CondicaoTempoParado } from '@/types/automacaoLogistica';
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
  mostrar_tempo?: boolean;
  data_inicio?: string;
}

// Distância em metros entre dois pontos (Haversine)
function distanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Estado do bloco "Repetir Enquanto Parado" (por automação/nó/veículo).
 * Guardado em localStorage para sobreviver a recarregamentos e coordenar mapas.
 */
const REPETIR_PREFIX = 'logistica:repetir-parado:';

interface RepetirEstado {
  last: number;      // timestamp do último disparo (0 = ainda não disparou)
  count: number;     // quantidade de disparos já feitos
  lat: number;       // posição onde o veículo parou
  lng: number;
  desde: number;     // timestamp em que a parada foi detectada
  encerrado?: boolean; // limite de disparos atingido nesta parada
}

// Deslocamento (m) acima do qual consideramos que o veículo voltou a se mover
const REPETIR_RAIO_MOVIMENTO_M = 80;

function lerEstadoRepeticao(key: string): RepetirEstado | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as RepetirEstado) : null;
  } catch {
    return null;
  }
}

function salvarRepeticao(key: string, estado: RepetirEstado) {
  try { localStorage.setItem(key, JSON.stringify(estado)); } catch { /* noop */ }
}

function limparRepeticao(key: string) {
  try { localStorage.removeItem(key); } catch { /* noop */ }
}

function repeticaoDevida(
  chaveNode: string,
  veiculo: VeiculoComStatus,
  cfg: Record<string, unknown>
): boolean {
  const key = `${REPETIR_PREFIX}${chaveNode}:${veiculo.id}`;
  const agora = Date.now();
  const pos = veiculo.ultima_posicao;

  // Veículo em movimento / offline / sem posição → cancela a repetição imediatamente
  const emMovimento =
    veiculo.status !== 'parado' ||
    !pos ||
    (Number(pos.velocidade) || 0) > 5;
  if (emMovimento) {
    limparRepeticao(key);
    return false;
  }

  const inicioMin = 0;
  const intervaloMin = Math.max(1, Number(cfg.repetir_intervalo_minutos) || 15);
  // sempre ilimitado (repete enquanto estiver parado)
  const maxRep = 0;

  let estado = lerEstadoRepeticao(key);

  // Saiu do ponto onde havia parado → voltou a se mover: cancela e reinicia
  if (estado && distanciaMetros(estado.lat, estado.lng, pos.lat, pos.lng) > REPETIR_RAIO_MOVIMENTO_M) {
    limparRepeticao(key);
    estado = null;
  }

  // Primeira detecção da parada: inicia a contagem
  if (!estado) {
    estado = { last: 0, count: 0, lat: pos.lat, lng: pos.lng, desde: agora };
    salvarRepeticao(key, estado);
  }

  // Já encerrado nesta parada (limite atingido): só volta a rodar após o veículo se mover
  if (estado.encerrado) return false;

  // Tempo parado: usa o maior entre a última posição reportada e o início detectado
  const minutosParado = Math.max(
    differenceInMinutes(new Date(), new Date(pos.data_hora)),
    Math.floor((agora - estado.desde) / 60000)
  );
  if (minutosParado < inicioMin) return false;

  if (maxRep > 0 && estado.count >= maxRep) {
    salvarRepeticao(key, { ...estado, encerrado: true });
    return false;
  }
  if (estado.last && agora - estado.last < intervaloMin * 60000) return false;

  const novoCount = estado.count + 1;
  const atingiuLimite = maxRep > 0 && novoCount >= maxRep;
  salvarRepeticao(key, { ...estado, last: agora, count: novoCount, encerrado: atingiuLimite });
  if (atingiuLimite) {
    console.info(
      `[logistica] Repetição encerrada para o veículo ${veiculo.placa || veiculo.id}: limite de ${maxRep} disparo(s) atingido.`
    );
  }
  return true;
}

/**
 * Disparo único por parada (quando NÃO existe bloco "Repetir a cada X min").
 * Garante que as ações (WhatsApp, e-mail, push...) sejam executadas uma única vez
 * enquanto o veículo continuar parado no mesmo local, e voltem a valer quando ele
 * se mover e parar novamente.
 */
const UNICO_PREFIX = 'logistica:disparo-unico:';

function disparoUnicoDevido(chaveAutomacao: string, veiculo: VeiculoComStatus): boolean {
  const key = `${UNICO_PREFIX}${chaveAutomacao}:${veiculo.id}`;
  const pos = veiculo.ultima_posicao;
  const emMovimento = veiculo.status !== 'parado' || !pos || (Number(pos.velocidade) || 0) > 5;
  if (emMovimento) {
    try { localStorage.removeItem(key); } catch { /* noop */ }
    return false;
  }

  let estado: { lat: number; lng: number; ts: number } | null = null;
  try {
    const raw = localStorage.getItem(key);
    estado = raw ? JSON.parse(raw) : null;
  } catch { estado = null; }

  // Saiu do ponto onde havia parado → nova parada
  if (estado && distanciaMetros(estado.lat, estado.lng, pos.lat, pos.lng) > REPETIR_RAIO_MOVIMENTO_M) {
    estado = null;
  }
  if (estado) return false; // já disparou nesta parada

  try {
    localStorage.setItem(key, JSON.stringify({ lat: pos.lat, lng: pos.lng, ts: Date.now() }));
  } catch { /* noop */ }
  return true;
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

      // Zonas isentas (raio de endereço onde não se marca parada)
      const zonas = flowObj.nodes
        .filter(n => n.data?.type === 'condicao_zona_isenta')
        .map(n => (n.data?.config || {}) as Record<string, unknown>)
        .filter(c => Number.isFinite(Number(c.zona_lat)) && Number.isFinite(Number(c.zona_lng)))
        .map(c => ({
          lat: Number(c.zona_lat),
          lng: Number(c.zona_lng),
          raio: Number(c.zona_raio_metros) || 200,
        }));
      const dentroZonaIsenta = (lat: number, lng: number) =>
        zonas.some(z => distanciaMetros(lat, lng, z.lat, z.lng) <= z.raio);

      // Bloco "Tempo Parado no Mapa"
      const tempoNode = flowObj.nodes.find(n => n.data?.type === 'acao_tempo_parado_mapa');
      const tempoCfg = (tempoNode?.data?.config || null) as Record<string, unknown> | null;

      // Bloco "Gerar Relatório PDF" (velocidades excedidas no período)
      const relatorioNode = flowObj.nodes.find(n => n.data?.type === 'acao_relatorio_pdf');
      let relatorioPdfUrl: string | null = null;
      let relatorioGerado = false;
      const obterRelatorioPdf = async (): Promise<string | null> => {
        if (relatorioGerado) return relatorioPdfUrl;
        relatorioGerado = true;
        if (!relatorioNode) return null;
        try {
          const rc = (relatorioNode.data?.config || {}) as Record<string, unknown>;
          const { gerarRelatorioVelocidadePDF } = await import('@/lib/logistica/relatorioVelocidade');
          const res = await gerarRelatorioVelocidadePDF({
            estabelecimentoId,
            periodo: (rc.relatorio_periodo as 'semanal' | 'mensal' | 'semestral') || 'semanal',
            limiteKmh: Number(rc.relatorio_limite_kmh) || 80,
            titulo: (rc.relatorio_titulo as string) || undefined,
            incluirGrafico: rc.relatorio_grafico !== false,
          });
          relatorioPdfUrl = res.url;
        } catch (e) {
          console.error('[logistica] falha ao gerar relatório PDF', e);
        }
        return relatorioPdfUrl;
      };

      // Veículos que realmente satisfazem a condição "Veículo Parado" (se existir no fluxo)
      const paradoNode = flowObj.nodes.find(n => n.data?.type === 'condicao_parado');
      let veiculosElegiveis = veiculos;
      if (paradoNode) {
        const pc = (paradoNode.data?.config || {}) as Record<string, unknown>;
        const cond = Array.isArray(pc.condicoes_tempo) && (pc.condicoes_tempo as CondicaoTempoParado[]).length
          ? (pc.condicoes_tempo as CondicaoTempoParado[])
          : [{ tempo_minutos: Number(pc.tempo_minutos) || 30 }];
        const limiteMin = Math.min(...cond.map(c => Number(c.tempo_minutos) || 30));
        veiculosElegiveis = veiculos.filter(v => {
          const pos = v.ultima_posicao;
          if (v.status !== 'parado' || !pos) return false;
          if (dentroZonaIsenta(pos.lat, pos.lng)) return false;
          return differenceInMinutes(new Date(), new Date(pos.data_hora)) >= limiteMin;
        });
      }

      // Bloco "Repetir a cada X min": repete o disparo enquanto o veículo continuar parado.
      // Sem esse bloco, as ações disparam UMA única vez por parada.
      const repetirNode = flowObj.nodes.find(n => n.data?.type === 'condicao_repetir_parado');
      const agendaNode = flowObj.nodes.find(n => n.data?.type === 'gatilho_agendamento');
      let veiculosAcao = veiculosElegiveis;
      let pularAcoes = false;
      if (agendaNode) {
        // Gatilho por agendamento: as ações só disparam no horário programado,
        // valendo para todos os veículos elegíveis do fluxo.
        const { agendamentoDevido } = await import('@/lib/logistica/agendamento');
        const devido = agendamentoDevido(
          `${automacao.id}:${agendaNode.id}`,
          (agendaNode.data?.config || {}) as Record<string, unknown>
        );
        veiculosAcao = devido ? veiculosElegiveis : [];
      } else if (repetirNode) {
        const rc = (repetirNode.data?.config || {}) as Record<string, unknown>;
        const chaveNode = `${automacao.id}:${repetirNode.id}`;

        // Limpa estados de veículos que saíram do filtro/lista (evita repetição órfã)
        try {
          const prefixoNode = `${REPETIR_PREFIX}${chaveNode}:`;
          const idsAtuais = new Set(veiculos.map(v => v.id));
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (k && k.startsWith(prefixoNode) && !idsAtuais.has(k.slice(prefixoNode.length))) {
              localStorage.removeItem(k);
            }
          }
        } catch { /* noop */ }

        veiculosAcao = veiculosElegiveis.filter(v => repeticaoDevida(chaveNode, v, rc));
      } else {
        veiculosAcao = veiculosElegiveis.filter(v => disparoUnicoDevido(String(automacao.id), v));
      }
      pularAcoes = veiculosAcao.length === 0;



      // Find condition nodes
      for (const node of flowObj.nodes) {
        const nodeType = node.data?.type;
        const config = node.data?.config || {};



        // Handle "condicao_parado" - Vehicle stopped condition
        if (nodeType === 'condicao_parado' && (config.marcar_no_mapa || tempoCfg)) {
          const condicoesTempo: CondicaoTempoParado[] = Array.isArray(config.condicoes_tempo) && config.condicoes_tempo.length
            ? (config.condicoes_tempo as CondicaoTempoParado[])
            : config.tempo_minutos
              ? [{ tempo_minutos: Number(config.tempo_minutos) }]
              : [{ tempo_minutos: 30 }];
          const tempoMinutos = Math.min(...condicoesTempo.map(c => Number(c.tempo_minutos) || 30));
          
          
          for (const veiculo of veiculos) {
            if (veiculo.status === 'parado' && veiculo.ultima_posicao) {
              if (dentroZonaIsenta(veiculo.ultima_posicao.lat, veiculo.ultima_posicao.lng)) continue;
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
                  cor_icone_parada: (tempoCfg?.cor_tempo as string) || config.cor_icone_parada || '#EAB308',
                  legenda_parada: config.legenda_parada || `Parado há ${minutosParado} min`,
                  automacao_id: automacao.id,
                  automacao_nome: automacao.nome,
                  mostrar_tempo: !!tempoCfg,
                  data_inicio: veiculo.ultima_posicao.data_hora,
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

        // Se há bloco "Repetir Enquanto Parado" e nenhum veículo está no momento
        // do disparo, as ações não são executadas neste ciclo.
        if (pularAcoes) continue;

        // Contexto comum para ações
        const wfCtx = {
          variaveis: { veiculos: veiculosAcao, automacao: { id: automacao.id, nome: automacao.nome } },
          estabelecimento_id: estabelecimentoId,
          workflow_tipo: 'logistica' as const,
          origem: 'logistica_automacao',
        };

        // --- Helpers de localização (Google Maps) ---
        const enviarLocalizacao = !!(config as any).enviar_localizacao;
        const posMap: Record<string, { lat: number; lng: number } | null> = {};
        if (enviarLocalizacao && veiculosAcao.length) {
          for (const v of veiculosAcao) {
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

        const LOC_TAG = '📍 Localização atual';
        const linkFor = (vid: string) => {
          const p = posMap[vid];
          return p ? `https://www.google.com/maps?q=${p.lat},${p.lng}` : null;
        };
        const appendLocOne = (msg: string, vid: string) => {
          if (!enviarLocalizacao) return msg;
          if (msg.includes(LOC_TAG)) return msg; // já anexada, não repetir
          const l = linkFor(vid);
          return l ? `${msg}\n\n${LOC_TAG}: ${l}` : msg;
        };
        const appendLocAll = (msg: string) => {
          if (!enviarLocalizacao) return msg;
          if (msg.includes(LOC_TAG)) return msg; // já anexada, não repetir
          // Envia SOMENTE uma URL (do primeiro veículo com posição conhecida)
          for (const v of veiculosAcao) {
            const l = linkFor((v as any).id);
            if (l) return `${msg}\n\n${LOC_TAG}: ${l}`;
          }
          return msg;
        };

        // --- Substituição de variáveis nas mensagens ---
        const valorVeic = (v: any, campos: string[]) => {
          for (const c of campos) {
            const val = v?.[c];
            if (val !== undefined && val !== null && String(val) !== '') return String(val);
          }
          return '';
        };
        const aplicarVars = (msg: string, veic?: any, motorista?: string) => {
          if (!msg) return msg;
          const alvo = veic || veiculosAcao[0];
          const placa = veic
            ? valorVeic(veic, ['placa', 'nome'])
            : Array.from(new Set(veiculosAcao.map((v: any) => valorVeic(v, ['placa', 'nome'])).filter(Boolean))).join(', ');
          return msg
            .replace(/\{placa\}/gi, placa)
            .replace(/\{motorista\}/gi, motorista || valorVeic(alvo, ['motorista', 'motorista_nome']) || '')
            .replace(/\{endereco\}/gi, valorVeic(alvo, ['endereco', 'endereco_atual', 'ultimo_endereco', 'localizacao']))
            .replace(/\{velocidade\}/gi, valorVeic(alvo, ['velocidade', 'velocidade_atual', 'speed']))
            .replace(/\{data\}/gi, new Date().toLocaleDateString('pt-BR'))
            .replace(/\{hora\}/gi, new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        };




        // Dispara um bot do Bot Builder (opcional no bloco de WhatsApp)
        const dispararBot = async (telefone: string | null, extras: Record<string, unknown>) => {
          const cfgAny = config as any;
          if (!cfgAny.disparar_bot || !cfgAny.bot_flow_id) return;
          try {
            await supabase.functions.invoke('executar-bot-flow', {
              body: {
                flowId: cfgAny.bot_flow_id,
                estabelecimentoId,
                origem: 'logistica_automacao',
                variaveis: { telefone, automacao_nome: automacao.nome, ...extras },
              },
            });
          } catch (e) {
            console.error('[logistica] falha ao disparar bot', e);
          }
        };

        // Handle "acao_relatorio_pdf" - gera o PDF (fica disponível para o bloco de WhatsApp)
        if ((nodeType as string) === 'acao_relatorio_pdf') {
          await obterRelatorioPdf();
        }

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
            const textoAntes = String((config as any).texto_antes || '').trim();
            const mediaUrl = String((config as any).media_url || '').trim() || undefined;
            // O PDF do relatório é sempre enviado por último, depois dos textos.
            let pdfUrl: string | undefined;
            if ((config as any).anexar_relatorio) {
              const url = await obterRelatorioPdf();
              if (url) pdfUrl = url;
            }
            const comPrefixo = (m: string) => (textoAntes ? `${textoAntes}\n\n${m}` : m);

            const commonWpp = { whatsappSessionId, whatsappSessionName, whatsappNumeroId, mediaUrl };

            const enviarPdf = async (tel: string) => {
              if (!pdfUrl) return;
              await executarBlocoWhatsapp(
                {
                  telefone: tel,
                  mensagem: '',
                  whatsappSessionId,
                  whatsappSessionName,
                  whatsappNumeroId,
                  mediaUrl: pdfUrl,
                },
                wfCtx
              );
            };

            if (destino === 'motorista_atual') {
              const { fetchMotoristasAtuais, formatWhatsappNumber } = await import('@/lib/logistica/cvDriverLookup');
              const ids = veiculosAcao.map(v => v.id);
              const map = await fetchMotoristasAtuais(ids);
              for (const veic of veiculosAcao) {
                const mot = map[veic.id];
                const tel = formatWhatsappNumber(mot?.telefone || null);
                if (!mot || !tel) continue;
                let mensagem = aplicarVars(mensagemTpl, veic, mot.nome || '');
                mensagem = comPrefixo(appendLocOne(mensagem, (veic as any).id));
                await executarBlocoWhatsapp(
                  { telefone: tel, mensagem, ...commonWpp },
                  wfCtx
                );
                await enviarPdf(tel);
                await dispararBot(tel, { placa: (veic as any).placa || '', motorista: mot.nome || '' });
              }
            } else {
              // Resolve o motorista atual quando a mensagem usa {motorista}
              let motoristaNome = '';
              if (/\{motorista\}/i.test(mensagemTpl) && veiculosAcao.length) {
                try {
                  const { fetchMotoristasAtuais } = await import('@/lib/logistica/cvDriverLookup');
                  const map = await fetchMotoristasAtuais(veiculosAcao.map(v => v.id));
                  motoristaNome = Array.from(new Set(
                    veiculosAcao.map(v => map[(v as any).id]?.nome).filter(Boolean) as string[]
                  )).join(', ');
                } catch { /* noop */ }
              }
              const mensagem = comPrefixo(appendLocAll(aplicarVars(mensagemTpl, undefined, motoristaNome)));
              const listaRaw: string[] = Array.isArray((config as any).telefones) && (config as any).telefones.length
                ? (config as any).telefones
                : [(config as any).telefone || ''];
              const lista = Array.from(new Set(listaRaw.map((t) => String(t || '').trim()).filter(Boolean)));
              if (!lista.length) lista.push('');
              for (const tel of lista) {
                await executarBlocoWhatsapp(
                  { telefone: tel, mensagem, ...commonWpp },
                  wfCtx
                );
                await enviarPdf(tel);
                await dispararBot(tel || null, {});
              }
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

    // Remove marcações de veículos que voltaram a se mover
    const idsMarcados = new Set(resultados.map(r => r.veiculo_id));
    const idsEmMovimento = veiculos
      .filter(v => v.status === 'movendo' && !idsMarcados.has(v.id))
      .map(v => v.id);
    if (idsEmMovimento.length > 0) {
      await supabase
        .from('logistica_paradas_marcadas')
        .delete()
        .eq('estabelecimento_id', estabelecimentoId)
        .in('veiculo_id', idsEmMovimento);
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
        .select('id, lat, lng, data_inicio')
        .eq('veiculo_id', parada.veiculo_id)
        .eq('estabelecimento_id', estabelecimentoId)
        .maybeSingle();

      const now = new Date().toISOString();
      const inicioReal = parada.data_inicio || now;

      if (existing) {
        // O contador só reinicia se o veículo realmente mudou de ponto de parada.
        // Caso contrário, mantém o data_inicio salvo no banco → ao recarregar a
        // página o tempo parado continua exatamente de onde estava.
        const mudouDeLocal =
          distanciaMetros(Number(existing.lat), Number(existing.lng), parada.lat, parada.lng) >
          REPETIR_RAIO_MOVIMENTO_M;

        const dataInicioPersistida =
          !mudouDeLocal && existing.data_inicio
            ? new Date(existing.data_inicio) <= new Date(inicioReal)
              ? existing.data_inicio
              : inicioReal
            : inicioReal;

        const minutosPersistidos = Math.max(
          0,
          Math.floor((Date.now() - new Date(dataInicioPersistida).getTime()) / 60000)
        );

        // Update existing marker
        await supabase
          .from('logistica_paradas_marcadas')
          .update({
            lat: parada.lat,
            lng: parada.lng,
            tempo_parado_minutos: minutosPersistidos,
            categoria_tempo: parada.categoria_tempo,
            icone_parada: parada.icone_parada,
            cor_icone_parada: parada.cor_icone_parada,
            legenda_parada: `${parada.legenda_parada} (${parada.automacao_nome})`,
            data_inicio: dataInicioPersistida,
            mostrar_tempo: !!parada.mostrar_tempo

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
            data_inicio: parada.data_inicio || now,
            automacao_id: parada.automacao_id,
            mostrar_tempo: !!parada.mostrar_tempo
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
