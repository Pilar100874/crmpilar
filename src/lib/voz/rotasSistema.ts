// Catálogo COMPLETO de telas do sistema para o Assistente de Voz.
// Cada entrada tem { path, titulo, aliases[] } — usado para casar a fala do usuário
// (ex.: "abrir empresas", "empresas", "monitor de filas") diretamente com uma rota,
// sem depender de IA. Baseado no title real de cada tela.

export interface RotaSistema {
  path: string;
  titulo: string;
  aliases?: string[];
}

export const ROTAS_SISTEMA: RotaSistema[] = [
  // Dashboards
  { path: "/dashboard", titulo: "Painel Principal", aliases: ["dashboard", "painel", "home", "início", "inicio"] },
  { path: "/dashboard-atendente", titulo: "Dashboard Atendente" },
  { path: "/dashboard-supervisor", titulo: "Dashboard Supervisor" },
  { path: "/sla-dashboard", titulo: "Dashboard SLA", aliases: ["sla"] },
  { path: "/advanced-analytics", titulo: "Análises Avançadas", aliases: ["analytics", "analises avancadas"] },
  { path: "/dashboard-pesquisas-satisfacao", titulo: "Dashboard Pesquisas de Satisfação", aliases: ["csat", "nps"] },
  { path: "/pesquisas-satisfacao", titulo: "Pesquisas de Satisfação" },
  { path: "/quality-assurance", titulo: "Quality Assurance", aliases: ["qa", "qualidade"] },
  { path: "/mapa-calor-sistema", titulo: "Mapa de Calor do Sistema" },

  // Menu/Hubs
  { path: "/menu", titulo: "Menu" },
  { path: "/menu-visual", titulo: "Menu Visual" },
  { path: "/listas", titulo: "Listas", aliases: ["cadastros", "hub de cadastros"] },

  // Atendimento / Chats
  { path: "/atendimento", titulo: "Painel de Chats", aliases: ["chats", "atendimento", "painel de atendimento"] },
  { path: "/monitor-filas", titulo: "Monitor de Filas" },
  { path: "/monitor-funcionarios", titulo: "Monitor de Funcionários" },
  { path: "/chat-interno", titulo: "Chat Interno" },
  { path: "/agentes-chat", titulo: "Agentes de Chat" },
  { path: "/test-roteamento", titulo: "Teste de Roteamento" },
  { path: "/atendimento-config", titulo: "Configurações de Atendimento" },
  { path: "/omnichannel-builder", titulo: "Omnichannel Builder" },
  { path: "/softphone", titulo: "Softphone" },
  { path: "/videocall", titulo: "Videochamada", aliases: ["video call", "videocall"] },
  { path: "/macros", titulo: "Macros" },
  { path: "/meus-textos-prontos", titulo: "Meus Textos Prontos" },
  { path: "/meus-anexos", titulo: "Meus Anexos" },
  { path: "/gerenciar-atalhos", titulo: "Gerenciar Atalhos" },

  // E-mail
  { path: "/email", titulo: "E-mail", aliases: ["email", "emails", "correio"] },
  { path: "/email-config", titulo: "Configuração de E-mail" },

  // Vendas
  { path: "/orcamentos", titulo: "Orçamentos", aliases: ["orcamentos", "orcamento", "pedidos"] },
  { path: "/funil", titulo: "Funil de Leads", aliases: ["funil de vendas", "funil"] },
  { path: "/calendario", titulo: "Calendário", aliases: ["agenda"] },
  { path: "/calendario/configuracoes", titulo: "Configurações do Calendário" },
  { path: "/campanhas", titulo: "Campanhas" },
  { path: "/todos", titulo: "Tarefas", aliases: ["tarefas", "to do", "todos"] },
  { path: "/automacoes-vendas", titulo: "Automações de Vendas" },
  { path: "/roteirizador-visitas", titulo: "Roteirizador de Visitas" },
  { path: "/vendas/programacao-visitas", titulo: "Programação de Visitas" },
  { path: "/vendas/acompanhamento-visitas", titulo: "Acompanhamento de Visitas" },
  { path: "/vendas-config", titulo: "Configuração de Vendas" },
  { path: "/orcamento-report-config", titulo: "Configuração de Relatório de Orçamento" },
  { path: "/editor-regras", titulo: "Editor de Regras" },

  // Cadastros
  { path: "/empresas", titulo: "Empresas", aliases: ["clientes", "prospects"] },
  { path: "/contatos", titulo: "Contatos" },
  { path: "/vinculos-empresas", titulo: "Vínculos de Empresas" },
  { path: "/vinculos-contatos", titulo: "Vínculos de Contatos" },
  { path: "/conteudos", titulo: "Conteúdos" },
  { path: "/importacao-produtos", titulo: "Importação de Produtos" },

  // Marketing
  { path: "/marketing", titulo: "Marketing" },
  { path: "/marketing/canvas", titulo: "Canvas de Marketing" },
  { path: "/marketing/automacoes", titulo: "Automações de Marketing" },
  { path: "/marketing/campanhas", titulo: "Campanhas de Marketing" },
  { path: "/marketing/monitor-respostas", titulo: "Monitor de Respostas do Bot" },
  { path: "/marketing/auto-video-wizard", titulo: "Auto Video Wizard" },
  { path: "/desenho", titulo: "Desenho" },

  // Bots
  { path: "/bot-builder", titulo: "Bot Builder", aliases: ["construtor de bots"] },
  { path: "/bot-create", titulo: "Criar Bot" },
  { path: "/bot-test", titulo: "Testar Bot" },

  // Relatórios
  { path: "/relatorios", titulo: "Relatórios" },

  // Logística
  { path: "/logistica", titulo: "Logística" },
  { path: "/logistica/monitoramento", titulo: "Monitoramento Logística", aliases: ["monitoramento", "rastreamento"] },
  { path: "/logistica/veiculos", titulo: "Veículos da Logística", aliases: ["cadastro de veiculos"] },
  { path: "/logistica/historico", titulo: "Histórico Logística" },
  { path: "/logistica/roteirizacao", titulo: "Roteirização" },
  { path: "/logistica/rotas", titulo: "Rotas" },
  { path: "/logistica/automacoes", titulo: "Automações Logística" },
  { path: "/logistica/config", titulo: "Configurações Logística" },

  // Controle de Veículos
  { path: "/controle-veiculos", titulo: "Controle de Veículos" },
  { path: "/controle-veiculos/veiculos", titulo: "Veículos - Controle" },
  { path: "/controle-veiculos/motoristas", titulo: "Motoristas" },
  { path: "/controle-veiculos/saida", titulo: "Saída de Veículos" },
  { path: "/controle-veiculos/entrada", titulo: "Entrada de Veículos" },
  { path: "/controle-veiculos/movimentacoes", titulo: "Movimentações de Veículos" },
  { path: "/controle-veiculos/defeitos", titulo: "Defeitos de Veículos" },
  { path: "/controle-veiculos/manutencao", titulo: "Manutenção de Veículos" },
  { path: "/controle-veiculos/cameras", titulo: "Câmeras (Controle de Veículos)" },
  { path: "/controle-veiculos/ajudantes", titulo: "Ajudantes" },

  // Controle de Visitantes
  { path: "/controle-visitantes", titulo: "Controle de Visitantes" },
  { path: "/controle-visitantes/entrada", titulo: "Entrada de Visitantes" },
  { path: "/controle-visitantes/presentes", titulo: "Visitantes Presentes" },
  { path: "/controle-visitantes/autorizacoes", titulo: "Autorizações de Visitantes" },
  { path: "/controle-visitantes/relatorios", titulo: "Relatórios de Visitantes" },
  { path: "/controle-visitantes/visitantes", titulo: "Visitantes" },
  { path: "/controle-visitantes/contatos", titulo: "Contatos (Visitantes)" },

  // Livro de Ocorrência
  { path: "/livro-ocorrencia", titulo: "Livro de Ocorrência" },
  { path: "/livro-ocorrencia/ocorrencias", titulo: "Ocorrências" },
  { path: "/livro-ocorrencia/encomendas", titulo: "Encomendas" },

  // Câmeras
  { path: "/cameras", titulo: "Câmeras" },
  { path: "/cameras/ao-vivo", titulo: "Câmeras ao Vivo" },
  { path: "/cameras/grupos", titulo: "Grupos de Câmeras" },
  { path: "/cameras/cameras", titulo: "Cadastro de Câmeras" },

  // Editores
  { path: "/editores", titulo: "Editores" },
  { path: "/editores/modelos", titulo: "Modelos de Documento" },
  { path: "/editores/documentos", titulo: "Documentos Gerados" },
  { path: "/editores/gerar", titulo: "Gerar Documento" },

  // Marketplaces / Preços / Ads
  { path: "/marketplaces", titulo: "Marketplaces" },
  { path: "/pedidos-recebidos", titulo: "Pedidos Recebidos" },
  { path: "/robo-precos", titulo: "Robô de Preços" },
  { path: "/whatsapp-catalogo", titulo: "WhatsApp Catálogo" },
  { path: "/ads", titulo: "Ads" },
  { path: "/ads/campaigns", titulo: "Campanhas de Ads" },
  { path: "/ads/reports", titulo: "Relatórios de Ads" },
  { path: "/ads/alerts", titulo: "Alertas de Ads" },
  { path: "/ads/credentials", titulo: "Credenciais de Ads" },
  { path: "/ads/logs", titulo: "Logs de Ads" },
  { path: "/ads/automation", titulo: "Automação de Ads" },
  { path: "/ads/scheduler", titulo: "Agendador de Ads" },
  { path: "/ads/platform-apps", titulo: "Apps de Plataformas de Ads" },
  { path: "/ads/wizard", titulo: "Assistente de Ads" },

  // Prospecção
  { path: "/prospeccao-empresas", titulo: "Prospecção de Empresas" },
  { path: "/prospeccao-claude-code", titulo: "Prospecção Claude Code" },

  // Configurações
  { path: "/config", titulo: "Configurações" },
  { path: "/config/webhooks", titulo: "Webhooks" },
  { path: "/config/variaveis", titulo: "Variáveis Globais" },
  { path: "/config/pagamentos", titulo: "Configuração de Pagamentos" },
  { path: "/config/visual", titulo: "Configuração Visual" },
  { path: "/config/sla", titulo: "Configuração de SLA" },
  { path: "/config/push", titulo: "Configuração de Notificações Push" },
  { path: "/config/skills", titulo: "Configuração de Skills" },
  { path: "/config/formularios-visita", titulo: "Formulários de Visita" },
  { path: "/config/regras-monitoramento-visita", titulo: "Regras de Monitoramento de Visita" },
  { path: "/config/regras-formulario-visita", titulo: "Regras de Formulário de Visita" },
  { path: "/perfil", titulo: "Meu Perfil" },
  { path: "/avisos", titulo: "Avisos" },
  { path: "/meus-conjuntos", titulo: "Meus Conjuntos" },
  { path: "/meus-tickets", titulo: "Meus Tickets" },

  // Admin
  { path: "/admin/apps", titulo: "Admin Apps" },
  { path: "/admin/support-tickets", titulo: "Support Tickets" },
  { path: "/admin/telas-customizadas", titulo: "Telas Customizadas" },
  { path: "/admin/assistente-voz", titulo: "Assistente de Voz" },
  { path: "/admin/menu-customizacao", titulo: "Personalizar Menu" },
  { path: "/politicas-internas", titulo: "Políticas Internas" },
  { path: "/railway-env", titulo: "Railway Env" },

  // E-commerce
  { path: "/ecommerce-config", titulo: "Configuração do E-commerce" },
  { path: "/ecommerce-config/branding", titulo: "Branding do E-commerce" },
  { path: "/ecommerce-config/conteudos", titulo: "Conteúdos do E-commerce" },
  { path: "/ecommerce-config/anuncios", titulo: "Anúncios do E-commerce" },
  { path: "/ecommerce-config/rodape", titulo: "Rodapé do E-commerce" },
  { path: "/ecommerce-config/homepage", titulo: "Homepage do E-commerce" },
  { path: "/ecommerce-config/funcionalidades", titulo: "Funcionalidades do E-commerce" },
  { path: "/ecommerce-config/volume-pricing", titulo: "Volume Pricing" },
  { path: "/ecommerce-config/cupons", titulo: "Cupons do E-commerce" },
  { path: "/ecommerce-config/b2b", titulo: "E-commerce B2B" },
  { path: "/ecommerce-config/newsletter", titulo: "Newsletter" },
  { path: "/ecommerce-config/mapa-calor", titulo: "Mapa de Calor do E-commerce" },
  { path: "/ecommerce-config/denuncias", titulo: "Denúncias do E-commerce" },
  { path: "/ecommerce-config/lgpd", titulo: "LGPD do E-commerce" },
  { path: "/ecommerce-rules", titulo: "Regras do E-commerce" },
  { path: "/ecommerce-rules-editor", titulo: "Editor de Regras do E-commerce" },
  { path: "/pedido-tracking", titulo: "Rastreamento de Pedido" },

  // Ponto
  { path: "/ponto", titulo: "Ponto - Dashboard RH" },
  { path: "/ponto/empresas", titulo: "Ponto - Empresas" },
  { path: "/ponto/filiais", titulo: "Ponto - Filiais" },
  { path: "/ponto/departamentos", titulo: "Ponto - Departamentos" },
  { path: "/ponto/cargos", titulo: "Ponto - Cargos" },
  { path: "/ponto/equipes", titulo: "Ponto - Equipes" },
  { path: "/ponto/escalas", titulo: "Ponto - Escalas" },
  { path: "/ponto/funcionarios", titulo: "Ponto - Funcionários" },
  { path: "/ponto/registro", titulo: "Ponto - Registro via App" },
  { path: "/ponto/tratamento", titulo: "Ponto - Tratamento" },
  { path: "/ponto/ajustes", titulo: "Ponto - Ajustes" },
  { path: "/ponto/espelho", titulo: "Ponto - Espelho de Ponto" },
  { path: "/ponto/equipamentos", titulo: "Ponto - Equipamentos" },
  { path: "/ponto/exportacao", titulo: "Ponto - Exportação" },
  { path: "/ponto/alertas", titulo: "Ponto - Antifraude" },
  { path: "/ponto/auditoria", titulo: "Ponto - Auditoria" },
  { path: "/ponto/config", titulo: "Ponto - Configurações" },
  { path: "/ponto/aprovacoes", titulo: "Ponto - Aprovações" },
  { path: "/ponto/banco-horas", titulo: "Ponto - Banco de Horas" },
  { path: "/ponto/ferias", titulo: "Ponto - Férias" },
  { path: "/ponto/fechamento", titulo: "Ponto - Fechamento" },
  { path: "/ponto/afd", titulo: "Ponto - AFD" },
  { path: "/ponto/esocial", titulo: "Ponto - eSocial" },
  { path: "/ponto/mapa", titulo: "Ponto - Mapa de Equipes" },
  { path: "/ponto/fora-geofence", titulo: "Ponto - Fora do Geofence" },
  { path: "/ponto/notificacoes", titulo: "Ponto - Notificações" },
  { path: "/ponto/portal", titulo: "Ponto - Portal do Funcionário" },
  { path: "/ponto/manual", titulo: "Ponto - Manual" },

  // TV Signage
  { path: "/tv-signage", titulo: "TV Signage" },
  { path: "/tv-signage/dispositivos", titulo: "Dispositivos TV" },
  { path: "/tv-signage/dashboards", titulo: "TV Dashboards" },
  { path: "/tv-signage/playlists", titulo: "TV Playlists" },
  { path: "/tv-signage/grupos", titulo: "TV Grupos" },
  { path: "/tv-signage/comandos", titulo: "TV Comandos" },
  { path: "/tv-signage/eventos", titulo: "TV Eventos" },
  { path: "/tv-signage/workflows", titulo: "TV Workflows" },

  // TVs públicas
  { path: "/tv/vendas", titulo: "TV Vendas" },
  { path: "/tv/veiculos", titulo: "TV Veículos" },
  { path: "/tv/cameras", titulo: "TV Câmeras" },

  // Contagem
  { path: "/contagem", titulo: "Contagem Inteligente" },
  { path: "/contagem/nova", titulo: "Nova Contagem" },
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
  "por", "favor", "programa", "sistema", "e", "com",
]);

function tokens(s: string): string[] {
  return normalizar(s).split(" ").filter((t) => t && !STOP.has(t));
}

/**
 * Tenta casar a fala do usuário com uma rota do sistema pelo título/aliases.
 * Retorna a rota com maior score, ou null se o score for baixo.
 */
export function matchRotaPorFala(fala: string): RotaSistema | null {
  const falaTokens = tokens(fala);
  if (falaTokens.length === 0) return null;
  const falaNorm = normalizar(fala);

  let melhor: { rota: RotaSistema; score: number } | null = null;

  for (const rota of ROTAS_SISTEMA) {
    const candidatos = [rota.titulo, ...(rota.aliases || [])];
    for (const cand of candidatos) {
      const candNorm = normalizar(cand);
      const candTokens = tokens(cand);
      if (candTokens.length === 0) continue;

      let score = 0;
      // match exato do candidato dentro da fala
      if (falaNorm === candNorm) score += 100;
      else if (falaNorm.includes(candNorm)) score += 60;
      else if (candNorm.includes(falaNorm)) score += 40;

      // score por token compartilhado
      const compartilhados = candTokens.filter((t) => falaTokens.includes(t)).length;
      score += compartilhados * 25;

      // penaliza títulos muito longos que casam pouco
      if (compartilhados > 0 && candTokens.length > 0) {
        score += Math.round((compartilhados / candTokens.length) * 20);
      }

      if (!melhor || score > melhor.score) melhor = { rota, score };
    }
  }

  // exige um mínimo para evitar falsos positivos
  if (melhor && melhor.score >= 45) return melhor.rota;
  return null;
}
