// Catálogo COMPLETO de telas do sistema para o Assistente de Voz.
// Cada entrada tem { path, titulo, aliases[] } — usado para casar a fala do usuário
// (ex.: "abrir empresas", "empresas", "monitor de filas") diretamente com uma rota,
// sem depender de IA. Baseado no title real de cada tela.
//
// REGRA DE OURO: cada titulo/alias deve ser INEQUÍVOCO. Se dois itens compartilham
// nome curto (ex.: "Configurações"), qualifique o alias (ex.: "configurações de chats").

export interface RotaSistema {
  path: string;
  titulo: string;
  aliases?: string[];
}

export const ROTAS_SISTEMA: RotaSistema[] = [
  // ============ Menu Principal - Dashboards ============
  { path: "/dashboard", titulo: "Painel Principal", aliases: ["painel principal", "dashboard principal", "pagina inicial", "home"] },
  { path: "/dashboard-atendente", titulo: "Dashboard Atendente", aliases: ["dashboard do atendente", "painel do atendente"] },
  { path: "/dashboard-supervisor", titulo: "Dashboard Supervisor", aliases: ["dashboard do supervisor", "painel do supervisor"] },
  { path: "/sla-dashboard", titulo: "Dashboard SLA", aliases: ["dashboard de sla", "painel de sla"] },
  { path: "/advanced-analytics", titulo: "Analytics Avançado", aliases: ["analises avancadas", "analytics avancado", "analitico avancado"] },
  { path: "/dashboard-pesquisas-satisfacao", titulo: "Pesquisas de Satisfação", aliases: ["csat", "nps", "pesquisa de satisfacao", "dashboard csat", "dashboard nps"] },

  // ============ Menu Principal - Funil ============
  { path: "/funil", titulo: "Funil", aliases: ["funil de vendas", "funil de leads", "kanban de vendas"] },

  // ============ Menu Principal - Chats ============
  { path: "/atendimento", titulo: "Painel de Chats", aliases: ["chats", "atendimento", "painel de atendimento", "painel dos chats"] },
  { path: "/agentes-chat", titulo: "Agentes IA", aliases: ["agentes de ia", "agentes de inteligencia artificial", "agentes do chat"] },
  { path: "/monitor-filas", titulo: "Monitor de Filas", aliases: ["monitor das filas", "filas de atendimento"] },
  { path: "/monitor-funcionarios", titulo: "Monitor de Funcionários", aliases: ["monitor dos funcionarios", "monitoramento de funcionarios"] },
  { path: "/test-roteamento", titulo: "Teste de Roteamento", aliases: ["testar roteamento"] },
  { path: "/atendimento-config", titulo: "Configurações de Chats", aliases: ["configuracoes de atendimento", "configuracao de chats", "config de chats", "config atendimento"] },

  // ============ Menu Principal - Calendário ============
  { path: "/calendario", titulo: "Calendário", aliases: ["agenda", "calendario de eventos"] },
  { path: "/calendario/configuracoes", titulo: "Configurações do Calendário", aliases: ["configuracao do calendario", "config do calendario", "config calendario"] },

  // ============ Menu Principal - Vendas ============
  { path: "/orcamentos", titulo: "Orçamento", aliases: ["orcamentos", "pedidos de venda", "novo orcamento"] },
  { path: "/pedidos-recebidos", titulo: "Pedidos Recebidos", aliases: ["pedidos"] },
  { path: "/roteirizador-visitas", titulo: "Roteirizador de Visitas", aliases: ["roteirizador", "roteirizacao de visitas"] },
  { path: "/vendas/programacao-visitas", titulo: "Programação de Visitas", aliases: ["programar visitas", "programacao das visitas"] },
  { path: "/vendas/acompanhamento-visitas", titulo: "Acompanhamento de Visitas", aliases: ["acompanhar visitas"] },
  { path: "/config/regras-monitoramento-visita", titulo: "Regras de Monitoramento de Visita", aliases: ["regras de monitoramento"] },
  { path: "/config/formularios-visita", titulo: "Formulários de Visita", aliases: ["formularios das visitas"] },
  { path: "/config/regras-formulario-visita", titulo: "Regras de Formulário de Visita", aliases: ["regras de formulario"] },
  { path: "/vendas-config", titulo: "Configuração de Vendas", aliases: ["configuracoes de vendas", "config de vendas", "config vendas"] },

  // ============ Menu Principal - Assistente ============
  { path: "/contagem", titulo: "Contagem Inteligente", aliases: ["contagem"] },

  // ============ Menu Principal - Listas ============
  { path: "/listas", titulo: "Listas", aliases: ["hub de cadastros", "cadastros"] },

  // ============ Menu Principal - E-mail ============
  { path: "/email", titulo: "E-mail", aliases: ["email", "emails", "correio"] },
  { path: "/email-config", titulo: "Configuração de E-mail", aliases: ["configuracoes de email", "config de email"] },

  // ============ Menu Principal - Marketing ============
  { path: "/marketing", titulo: "Marketing", aliases: ["hub de marketing", "central de marketing"] },
  { path: "/marketing/canvas", titulo: "Canvas de Marketing" },
  { path: "/marketing/automacoes", titulo: "Automações de Marketing", aliases: ["automacoes do marketing"] },
  { path: "/marketing/campanhas", titulo: "Campanhas de Marketing", aliases: ["campanhas do marketing"] },
  { path: "/marketing/monitor-respostas", titulo: "Monitor de Respostas do Bot", aliases: ["respostas do bot", "monitor das respostas"] },
  { path: "/desenho", titulo: "Desenho" },

  // ============ Menu Principal - Relatórios ============
  { path: "/relatorios", titulo: "Relatórios", aliases: ["relatorios do sistema", "central de relatorios"] },

  // ============ Menu Principal - Controle de Ponto ============
  { path: "/ponto", titulo: "Controle de Ponto", aliases: ["ponto", "dashboard rh", "dashboard do rh", "rh"] },
  { path: "/ponto/funcionarios", titulo: "Ponto - Funcionários", aliases: ["funcionarios do ponto"] },
  { path: "/ponto/registro", titulo: "Ponto - Registro via App", aliases: ["registro de ponto", "registro via app"] },
  { path: "/ponto/tratamento", titulo: "Ponto - Tratamento", aliases: ["tratamento de ponto"] },
  { path: "/ponto/ajustes", titulo: "Ponto - Ajustes", aliases: ["ajustes de ponto"] },
  { path: "/ponto/espelho", titulo: "Ponto - Espelho de Ponto", aliases: ["espelho de ponto", "espelho do ponto"] },
  { path: "/ponto/exportacao", titulo: "Ponto - Exportação Domínio", aliases: ["exportacao dominio", "exportacao do ponto"] },
  { path: "/ponto/alertas", titulo: "Ponto - Antifraude", aliases: ["antifraude do ponto", "alertas do ponto"] },
  { path: "/ponto/auditoria", titulo: "Ponto - Auditoria", aliases: ["auditoria do ponto"] },
  { path: "/ponto/config", titulo: "Ponto - Configurações", aliases: ["configuracoes do ponto", "config do ponto"] },
  { path: "/ponto/aprovacoes", titulo: "Ponto - Aprovações", aliases: ["aprovacoes do ponto"] },

  // ============ Menu Principal - Controle de Veículos ============
  { path: "/controle-veiculos", titulo: "Controle de Veículos", aliases: ["cv", "controle dos veiculos"] },

  // ============ Menu Principal - Controle de Visitantes ============
  { path: "/controle-visitantes", titulo: "Controle de Visitantes", aliases: ["visitantes"] },

  // ============ Menu Principal - Livro de Ocorrência ============
  { path: "/livro-ocorrencia", titulo: "Livro de Ocorrência", aliases: ["portaria", "livro portaria", "encomendas portaria"] },

  // ============ Menu Principal - Câmeras ============
  { path: "/cameras", titulo: "Câmeras", aliases: ["cameras do sistema", "central de cameras"] },

  // ============ Menu Principal - Editores ============
  { path: "/editores", titulo: "Editores - Início", aliases: ["hub de editores", "editores hub"] },
  { path: "/editores/modelos", titulo: "Modelos de Documento", aliases: ["modelos de documentos"] },
  { path: "/editores/gerar", titulo: "Gerar Documento", aliases: ["gerar documentos", "novo documento"] },
  { path: "/editores/documentos", titulo: "Documentos Gerados", aliases: ["documentos gerados"] },

  // ============ Menu Principal - Logística ============
  { path: "/logistica", titulo: "Logística", aliases: ["logistica hub"] },
  { path: "/logistica/monitoramento", titulo: "Monitoramento Logística", aliases: ["monitoramento logistico", "rastreamento de veiculos"] },
  { path: "/logistica/veiculos", titulo: "Veículos da Logística", aliases: ["veiculos logistica", "cadastro de veiculos logistica"] },
  { path: "/logistica/historico", titulo: "Histórico Logística", aliases: ["historico logistico"] },
  { path: "/logistica/roteirizacao", titulo: "Roteirização", aliases: ["roteirizacao logistica"] },
  { path: "/logistica/rotas", titulo: "Rotas", aliases: ["rotas logistica"] },
  { path: "/logistica/automacoes", titulo: "Automações Logística", aliases: ["automacoes logisticas"] },
  { path: "/logistica/config", titulo: "Configurações Logística", aliases: ["config logistica", "configuracoes logisticas"] },

  // ============ Menu Principal - Marketplaces ============
  { path: "/marketplaces", titulo: "Marketplaces" },

  // ============ Menu Principal - E-commerce ============
  { path: "/ecommerce", titulo: "Abrir Loja Virtual", aliases: ["loja virtual", "ecommerce", "e commerce", "abrir loja"] },
  { path: "/ecommerce-config", titulo: "Configurações do E-commerce", aliases: ["config ecommerce", "configuracao ecommerce", "config e commerce"] },

  // ============ Menu Principal - Ads ============
  { path: "/ads", titulo: "Ads", aliases: ["ads hub", "central de ads", "gerenciador de anuncios", "anuncios"] },

  // ============ Menu Principal - Robô de Preços ============
  { path: "/robo-precos", titulo: "Robô de Preços", aliases: ["robo de precos", "robo dos precos"] },

  // ============ Menu Principal - TV ============
  { path: "/tv/vendas", titulo: "TV Vendas", aliases: ["tv de vendas", "dashboard tv vendas"] },
  { path: "/tv/veiculos", titulo: "TV Veículos", aliases: ["tv de veiculos", "dashboard tv veiculos"] },
  { path: "/tv/cameras", titulo: "TV Câmeras", aliases: ["tv de cameras", "mosaico de cameras"] },
  { path: "/tv-signage", titulo: "Gerenciador de Telas Remotas", aliases: ["telas remotas", "tv signage", "gerenciador de telas"] },

  // ============ Menu Principal - Mapa de Calor ============
  { path: "/mapa-calor-sistema", titulo: "Mapa de Calor", aliases: ["mapa de calor do sistema", "heatmap"] },

  // ============ Menu Principal - Configurações ============
  { path: "/config", titulo: "Configurações", aliases: ["configuracoes do sistema", "configuracoes gerais", "config geral"] },

  // ============ Menu Principal - Admin ============
  { path: "/admin/assistente-voz", titulo: "Assistente de Voz", aliases: ["config assistente de voz", "configuracao do assistente de voz"] },
  { path: "/admin/relatorios-voz", titulo: "Relatórios por Voz", aliases: ["relatorios por voz", "relatorios de voz"] },
  { path: "/admin/menu-customizacao", titulo: "Personalizar Menu", aliases: ["customizar menu", "personalizacao de menu", "menu customizacao"] },

  // ============ Outras rotas úteis (fora do menu principal, mas acessíveis por voz) ============
  { path: "/empresas", titulo: "Empresas", aliases: ["cadastro de empresas", "clientes"] },
  { path: "/contatos", titulo: "Contatos", aliases: ["cadastro de contatos"] },
  { path: "/vinculos-empresas", titulo: "Vínculos de Empresas" },
  { path: "/vinculos-contatos", titulo: "Vínculos de Contatos" },
  { path: "/importacao-produtos", titulo: "Importação de Produtos" },
  { path: "/perfil", titulo: "Meu Perfil", aliases: ["perfil", "meu cadastro"] },
  { path: "/avisos", titulo: "Avisos", aliases: ["avisos do sistema"] },
  { path: "/chat-interno", titulo: "Chat Interno", aliases: ["chat da equipe"] },
  { path: "/macros", titulo: "Macros" },
  { path: "/softphone", titulo: "Softphone", aliases: ["telefone", "ramal"] },
  { path: "/politicas-internas", titulo: "Políticas Internas" },
  { path: "/quality-assurance", titulo: "Quality Assurance", aliases: ["qa", "controle de qualidade"] },
  { path: "/prospeccao-empresas", titulo: "Prospecção de Empresas", aliases: ["prospeccao"] },
  { path: "/prospeccao-claude-code", titulo: "Prospecção Claude Code" },
  { path: "/bot-builder", titulo: "Bot Builder", aliases: ["construtor de bots"] },
];

// ---------- Fuzzy matching ----------

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP = new Set([
  "abrir", "abre", "abra", "abrindo", "vai", "va", "ir", "para",
  "a", "o", "as", "os", "de", "da", "do", "das", "dos", "na", "no",
  "me", "leve", "mostra", "mostre", "mostrar", "quero", "ver", "tela",
  "pagina", "página", "ei", "hey", "oi", "ola", "olá", "pilar",
  "por", "favor", "programa", "sistema", "e", "com", "acessar", "acesse",
  "entrar", "entra", "chamar", "chama",
]);

function tokens(s: string): string[] {
  return normalizar(s).split(" ").filter((t) => t && !STOP.has(t));
}

interface Candidato {
  rota: RotaSistema;
  score: number;
  fonte: string;
}

/**
 * Tenta casar a fala do usuário com uma rota do sistema pelo título/aliases.
 * Retorna a rota com maior score somente se for VENCEDOR CLARO
 * (score >= 60 E margem >= 15 sobre o 2º colocado).
 * Caso contrário retorna null (para o assistente pedir confirmação/desambiguar).
 */
export function matchRotaPorFala(fala: string): RotaSistema | null {
  const resultado = matchRotaComCandidatos(fala);
  return resultado.escolhida;
}

/**
 * Versão detalhada: devolve top candidatos para desambiguação em UI.
 */
export function matchRotaComCandidatos(fala: string): {
  escolhida: RotaSistema | null;
  topN: Array<{ rota: RotaSistema; score: number }>;
} {
  const falaTokens = tokens(fala);
  if (falaTokens.length === 0) return { escolhida: null, topN: [] };
  const falaNorm = normalizar(fala);

  const candidatos: Candidato[] = [];

  for (const rota of ROTAS_SISTEMA) {
    const variantes = [rota.titulo, ...(rota.aliases || [])];
    let melhorScoreRota = 0;
    let melhorFonte = "";

    for (const cand of variantes) {
      const candNorm = normalizar(cand);
      const candTokens = tokens(cand);
      if (candTokens.length === 0) continue;

      let score = 0;

      if (falaNorm === candNorm) score += 120;
      else if (falaNorm.includes(candNorm)) score += 80;
      else if (candNorm.includes(falaNorm) && falaTokens.length >= 2) score += 50;

      const compartilhados = candTokens.filter((t) => falaTokens.includes(t)).length;
      score += compartilhados * 25;

      // cobertura do candidato pelos tokens da fala (evita match parcial ruim)
      if (compartilhados > 0 && candTokens.length > 0) {
        const cobertura = compartilhados / candTokens.length;
        score += Math.round(cobertura * 30);
        // exige cobertura mínima do título quando são mais de 1 token
        if (candTokens.length >= 2 && cobertura < 0.5) score -= 25;
      }

      // penalidade se a fala tem MUITAS palavras extras não usadas
      const naoCasados = falaTokens.filter((t) => !candTokens.includes(t)).length;
      if (naoCasados > 2) score -= naoCasados * 4;

      if (score > melhorScoreRota) {
        melhorScoreRota = score;
        melhorFonte = cand;
      }
    }

    if (melhorScoreRota > 0) {
      candidatos.push({ rota, score: melhorScoreRota, fonte: melhorFonte });
    }
  }

  candidatos.sort((a, b) => b.score - a.score);
  const topN = candidatos.slice(0, 3).map((c) => ({ rota: c.rota, score: c.score }));

  if (candidatos.length === 0) return { escolhida: null, topN };

  const primeiro = candidatos[0];
  const segundo = candidatos[1];

  // Regras de precisão:
  // - score mínimo alto
  // - margem clara sobre o 2º colocado (evita "similar por engano")
  const MIN_SCORE = 60;
  const MIN_MARGEM = 15;

  if (primeiro.score < MIN_SCORE) return { escolhida: null, topN };
  if (segundo && primeiro.score - segundo.score < MIN_MARGEM) {
    return { escolhida: null, topN };
  }

  return { escolhida: primeiro.rota, topN };
}
