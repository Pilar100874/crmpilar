import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Rotas navegáveis do sistema (curadas). Chave = alias falado, valor = path.
const ROTAS: Record<string, { path: string; desc: string }> = {
  dashboard: { path: '/dashboard', desc: 'Painel principal com métricas' },
  atendimento: { path: '/atendimento', desc: 'Central de atendimento / chat' },
  email: { path: '/email', desc: 'Caixa de e-mails' },
  contatos: { path: '/contatos', desc: 'Cadastro de contatos' },
  empresas: { path: '/empresas', desc: 'Cadastro de empresas / clientes / prospects' },
  orcamentos: { path: '/orcamentos', desc: 'Orçamentos e pedidos' },
  funil: { path: '/funil', desc: 'Funil de vendas' },
  calendario: { path: '/calendario', desc: 'Calendário e tarefas' },
  campanhas: { path: '/campanhas', desc: 'Campanhas de marketing' },
  automacoes: { path: '/marketing/automacoes', desc: 'Automações de marketing' },
  'envio em massa': { path: '/marketing/envio-em-massa', desc: 'Envio em massa (marketing)' },
  marketing: { path: '/marketing', desc: 'Hub de marketing' },
  ponto: { path: '/ponto/dashboard', desc: 'Controle de ponto' },
  logistica: { path: '/logistica/monitoramento', desc: 'Monitoramento logística / veículos' },
  veiculos: { path: '/logistica/veiculos', desc: 'Cadastro de veículos' },
  'controle de veiculos': { path: '/controle-veiculos', desc: 'Controle de saída/entrada de veículos' },
  televisao: { path: '/tv-signage/dispositivos', desc: 'Gerenciador de telas (TV Signage)' },
  bots: { path: '/bot-builder', desc: 'Construtor de bots' },
  configuracoes: { path: '/config', desc: 'Configurações do sistema' },
  relatorios: { path: '/relatorios', desc: 'Relatórios' },
  listas: { path: '/listas', desc: 'Hub de cadastros / listas' },
  prospeccao: { path: '/prospeccao-empresas', desc: 'Prospecção de empresas' },
};

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'navegar_para',
      description: 'Abre uma tela do sistema. Use quando o usuário pedir para "ir para", "abrir", "ver a tela de", etc.',
      parameters: {
        type: 'object',
        properties: { rota: { type: 'string', description: 'Chave da rota (ex: dashboard, atendimento, orcamentos, logistica, empresas)' } },
        required: ['rota'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_metrica',
      description: 'Consulta uma métrica do sistema. Use para perguntas como "quantos veículos online?", "quantas empresas cadastradas?", "vendas hoje", etc.',
      parameters: {
        type: 'object',
        properties: {
          metrica: {
            type: 'string',
            enum: ['veiculos_online', 'empresas_total', 'contatos_total', 'orcamentos_hoje', 'orcamentos_mes', 'tv_dispositivos_online', 'alertas_ponto_hoje', 'atendimentos_abertos'],
          },
        },
        required: ['metrica'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'disparar_bot',
      description: 'Executa manualmente uma automação/bot pelo nome. Confirme com o usuário antes de disparar campanhas grandes.',
      parameters: {
        type: 'object',
        properties: { nome_automacao: { type: 'string', description: 'Nome parcial da automação' } },
        required: ['nome_automacao'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'enviar_comando_tv',
      description: 'Envia comando para todos os dispositivos TV do estabelecimento (ex: refresh, reiniciar app).',
      parameters: {
        type: 'object',
        properties: {
          comando: { type: 'string', enum: ['refresh', 'reiniciar_app', 'limpar_cache'] },
        },
        required: ['comando'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'responder_texto',
      description: 'Use quando não precisa executar nenhuma ação — apenas responder ao usuário com texto (saudações, dúvidas gerais, explicações).',
      parameters: {
        type: 'object',
        properties: { resposta: { type: 'string' } },
        required: ['resposta'],
      },
    },
  },
];

async function executarMetrica(sb: any, estabId: string | null, metrica: string) {
  try {
    switch (metrica) {
      case 'veiculos_online': {
        const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { count } = await sb.from('veiculos').select('*', { count: 'exact', head: true })
          .eq('estabelecimento_id', estabId).gte('ultima_posicao_em', cutoff);
        return `${count ?? 0} veículo(s) online agora.`;
      }
      case 'empresas_total': {
        const { count } = await sb.from('empresas').select('*', { count: 'exact', head: true }).eq('estabelecimento_id', estabId);
        return `${count ?? 0} empresa(s) cadastradas.`;
      }
      case 'contatos_total': {
        const { count } = await sb.from('contatos').select('*', { count: 'exact', head: true }).eq('estabelecimento_id', estabId);
        return `${count ?? 0} contato(s) cadastrados.`;
      }
      case 'orcamentos_hoje': {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const { count } = await sb.from('orcamentos').select('*', { count: 'exact', head: true })
          .eq('estabelecimento_id', estabId).gte('created_at', start.toISOString());
        return `${count ?? 0} orçamento(s) criados hoje.`;
      }
      case 'orcamentos_mes': {
        const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
        const { count } = await sb.from('orcamentos').select('*', { count: 'exact', head: true })
          .eq('estabelecimento_id', estabId).gte('created_at', start.toISOString());
        return `${count ?? 0} orçamento(s) no mês.`;
      }
      case 'tv_dispositivos_online': {
        const cutoff = new Date(Date.now() - 90 * 1000).toISOString();
        const { count } = await sb.from('tv_devices').select('*', { count: 'exact', head: true })
          .eq('estabelecimento_id', estabId).gte('ultima_comunicacao', cutoff);
        return `${count ?? 0} dispositivo(s) TV online.`;
      }
      case 'alertas_ponto_hoje': {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const { count } = await sb.from('ponto_alertas').select('*', { count: 'exact', head: true })
          .eq('empresa_id', estabId).gte('created_at', start.toISOString());
        return `${count ?? 0} alerta(s) de ponto hoje.`;
      }
      case 'atendimentos_abertos': {
        const { count } = await sb.from('atendimentos').select('*', { count: 'exact', head: true })
          .eq('estabelecimento_id', estabId).in('status', ['aberto', 'em_andamento']);
        return `${count ?? 0} atendimento(s) em aberto.`;
      }
      default:
        return 'Métrica não reconhecida.';
    }
  } catch (e: any) {
    return `Não consegui consultar (${e.message}).`;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const key = Deno.env.get('LOVABLE_API_KEY');
    if (!key) throw new Error('LOVABLE_API_KEY ausente');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization') || '';
    const sb = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userRes } = await sb.auth.getUser();
    const user = userRes?.user;
    if (!user) return new Response(JSON.stringify({ error: 'Não autenticado' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    const { data: usuario } = await sb.from('usuarios')
      .select('id, estabelecimento_id, nome')
      .eq('auth_user_id', user.id).maybeSingle();
    const estabId = (usuario as any)?.estabelecimento_id ?? null;

    const body = await req.json();
    const messages = body.messages || [];
    const transcricao = body.transcricao || '';

    // Ferramentas desativadas pelo usuário
    const { data: cfg } = await sb.from('assistente_voz_config')
      .select('ferramentas_desativadas').eq('auth_user_id', user.id).maybeSingle();
    const desativadas: string[] = (cfg as any)?.ferramentas_desativadas || [];
    const toolsFiltradas = TOOLS.filter((t: any) => !desativadas.includes(t.function.name));

    // Comandos customizados do estabelecimento — match por frase exata/contains
    const { data: cmds } = await sb.from('assistente_voz_comandos')
      .select('*').eq('estabelecimento_id', estabId).eq('ativo', true);
    const txtLower = transcricao.toLowerCase().trim();
    const cmdMatch = (cmds || []).find((c: any) => {
      const frase = String(c.frase_gatilho || '').toLowerCase().trim();
      return frase && (txtLower === frase || txtLower.includes(frase));
    });
    if (cmdMatch) {
      let acao: any = null;
      let resposta = cmdMatch.resposta_falada || 'Ok.';
      const p = cmdMatch.payload || {};
      if (cmdMatch.tipo_acao === 'navegar' && p.path) {
        acao = { tipo: 'navegar_para', path: p.path };
        resposta = cmdMatch.resposta_falada || `Abrindo ${p.path}.`;
      } else if (cmdMatch.tipo_acao === 'consultar_metrica' && p.metrica) {
        resposta = await executarMetrica(sb, estabId, p.metrica);
        acao = { tipo: 'metrica_consultada', metrica: p.metrica };
      } else if (cmdMatch.tipo_acao === 'disparar_bot' && p.nome_automacao) {
        acao = { tipo: 'confirmar_disparo_bot', nome_automacao: p.nome_automacao };
        resposta = cmdMatch.resposta_falada || `Quer que eu dispare "${p.nome_automacao}"? Diga "confirmar".`;
      } else if (cmdMatch.tipo_acao === 'comando_tv' && p.comando) {
        acao = { tipo: 'confirmar_comando_tv', comando: p.comando };
        resposta = cmdMatch.resposta_falada || `Confirma o comando "${p.comando}" nas TVs?`;
      }
      await sb.from('assistente_voz_log').insert({
        auth_user_id: user.id, estabelecimento_id: estabId,
        transcricao, resposta, acao, sucesso: true,
      });
      return new Response(JSON.stringify({ resposta, acao, comando_customizado: cmdMatch.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rotasStr = Object.entries(ROTAS).map(([k, v]) => `- "${k}" → ${v.desc}`).join('\n');
    const system = `Você é o Pilar, assistente por voz do CRM Pilar. Fale em português BR, seja curto e direto (1-2 frases).
Você pode navegar, consultar métricas e executar ações através de tools.
Rotas conhecidas do sistema:
${rotasStr}

Usuário logado: ${(usuario as any)?.nome ?? user.email}.
Sempre escolha uma tool. Se a intenção for apenas conversa/dúvida, use "responder_texto".
Para ações destrutivas ou em massa (disparar bot que envia msg em massa, comando em TVs), peça confirmação em "responder_texto" primeiro.`;

    const fullMessages = [
      { role: 'system', content: system },
      ...messages,
      { role: 'user', content: transcricao },
    ];

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3.6-flash',
        messages: fullMessages,
        tools: toolsFiltradas,
        tool_choice: 'auto',
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error('AI error', aiResp.status, t);
      return new Response(JSON.stringify({ error: 'Falha IA', status: aiResp.status, details: t }), {
        status: aiResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiJson = await aiResp.json();
    const msg = aiJson.choices?.[0]?.message;
    const toolCall = msg?.tool_calls?.[0];

    let acao: any = null;
    let resposta = msg?.content || '';

    if (toolCall?.function) {
      const nome = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments || '{}');
      acao = { tipo: nome, args };

      if (nome === 'responder_texto') {
        resposta = args.resposta || '';
        acao = null;
      } else if (nome === 'navegar_para') {
        const chave = String(args.rota || '').toLowerCase().trim();
        const match = ROTAS[chave] || Object.entries(ROTAS).find(([k]) => k.includes(chave) || chave.includes(k))?.[1];
        if (match) {
          acao = { tipo: 'navegar_para', path: (match as any).path ?? match.path };
          resposta = `Abrindo ${chave}.`;
        } else {
          acao = null;
          resposta = `Não encontrei a tela "${args.rota}". Tente: dashboard, atendimento, empresas, logística, orçamentos.`;
        }
      } else if (nome === 'consultar_metrica') {
        resposta = await executarMetrica(sb, estabId, args.metrica);
        acao = { tipo: 'metrica_consultada', metrica: args.metrica };
      } else if (nome === 'disparar_bot') {
        // não dispara direto — deixa o front confirmar
        acao = { tipo: 'confirmar_disparo_bot', nome_automacao: args.nome_automacao };
        resposta = `Quer que eu dispare a automação "${args.nome_automacao}"? Diga "confirmar" para prosseguir.`;
      } else if (nome === 'enviar_comando_tv') {
        acao = { tipo: 'confirmar_comando_tv', comando: args.comando };
        resposta = `Confirma o comando "${args.comando}" para todas as TVs?`;
      }
    }

    // log
    await sb.from('assistente_voz_log').insert({
      auth_user_id: user.id,
      estabelecimento_id: estabId,
      transcricao,
      resposta,
      acao,
      sucesso: true,
    });

    return new Response(JSON.stringify({ resposta, acao }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
