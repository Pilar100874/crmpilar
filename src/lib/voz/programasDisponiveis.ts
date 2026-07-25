// Lista curada dos principais programas do sistema que podem ser abertos
// via comando de voz. Usado na tela de configuração do Assistente de Voz.

export interface ProgramaDisponivel {
  path: string;
  label: string;
  categoria: string;
}

export const PROGRAMAS_DISPONIVEIS: ProgramaDisponivel[] = [
  // Dashboards
  { path: "/dashboard", label: "Painel Principal", categoria: "Dashboards" },
  { path: "/dashboard-atendente", label: "Dashboard Atendente", categoria: "Dashboards" },
  { path: "/dashboard-supervisor", label: "Dashboard Supervisor", categoria: "Dashboards" },
  { path: "/sla-dashboard", label: "Dashboard SLA", categoria: "Dashboards" },
  { path: "/advanced-analytics", label: "Análises Avançadas", categoria: "Dashboards" },
  { path: "/dashboard-pesquisas-satisfacao", label: "Pesquisas de Satisfação", categoria: "Dashboards" },

  // Chats / Atendimento
  { path: "/atendimento", label: "Painel de Chats", categoria: "Chats" },
  { path: "/monitor-filas", label: "Monitor de Filas", categoria: "Chats" },
  { path: "/monitor-funcionarios", label: "Monitor de Funcionários", categoria: "Chats" },
  { path: "/chat-interno", label: "Chat Interno", categoria: "Chats" },
  { path: "/agentes-chat", label: "Agentes de Chat", categoria: "Chats" },

  // Vendas
  { path: "/orcamentos", label: "Orçamentos", categoria: "Vendas" },
  { path: "/vendas-config", label: "Configuração de Vendas", categoria: "Vendas" },
  { path: "/roteirizador-visitas", label: "Roteirizador de Visitas", categoria: "Vendas" },
  { path: "/vendas/programacao-visitas", label: "Programação de Visitas", categoria: "Vendas" },
  { path: "/vendas/acompanhamento-visitas", label: "Acompanhamento de Visitas", categoria: "Vendas" },
  { path: "/automacoes-vendas", label: "Automações de Vendas", categoria: "Vendas" },

  // Cadastros / Listas
  { path: "/listas", label: "Listas (Hub)", categoria: "Cadastros" },
  { path: "/empresas", label: "Empresas", categoria: "Cadastros" },
  { path: "/contatos", label: "Contatos", categoria: "Cadastros" },
  { path: "/vinculos-empresas", label: "Vínculos de Empresas", categoria: "Cadastros" },
  { path: "/vinculos-contatos", label: "Vínculos de Contatos", categoria: "Cadastros" },
  { path: "/importacao-produtos", label: "Importação de Produtos", categoria: "Cadastros" },

  // Funil / CRM
  { path: "/funil", label: "Funil de Leads", categoria: "CRM" },
  { path: "/calendario", label: "Calendário", categoria: "CRM" },
  { path: "/campanhas", label: "Campanhas", categoria: "CRM" },
  { path: "/todos", label: "Tarefas", categoria: "CRM" },

  // Marketing
  { path: "/marketing", label: "Marketing (Hub)", categoria: "Marketing" },
  { path: "/marketing/canvas", label: "Canvas de Marketing", categoria: "Marketing" },
  { path: "/marketing/automacoes", label: "Automações de Marketing", categoria: "Marketing" },
  { path: "/marketing/campanhas", label: "Campanhas de Marketing", categoria: "Marketing" },
  { path: "/marketing/monitor-respostas", label: "Monitor de Respostas do Bot", categoria: "Marketing" },
  { path: "/desenho", label: "Desenho", categoria: "Marketing" },

  // Bots
  { path: "/bot-builder", label: "Bot Builder", categoria: "Bots" },
  { path: "/bot-create", label: "Criar Bot", categoria: "Bots" },
  { path: "/bot-test", label: "Testar Bot", categoria: "Bots" },

  // E-mail
  { path: "/email", label: "E-mail", categoria: "E-mail" },
  { path: "/email-config", label: "Configuração de E-mail", categoria: "E-mail" },

  // Relatórios
  { path: "/relatorios", label: "Relatórios", categoria: "Relatórios" },

  // Logística
  { path: "/logistica-monitoramento", label: "Logística - Monitoramento", categoria: "Logística" },
  { path: "/logistica-dashboard", label: "Logística - Dashboard", categoria: "Logística" },
  { path: "/controle-veiculos", label: "Controle de Veículos", categoria: "Logística" },

  // Ponto
  { path: "/ponto/dashboard", label: "Ponto - Dashboard RH", categoria: "Ponto" },
  { path: "/ponto/funcionarios", label: "Ponto - Funcionários", categoria: "Ponto" },
  { path: "/ponto/tratamento", label: "Ponto - Tratamento", categoria: "Ponto" },
  { path: "/ponto/alertas", label: "Ponto - Antifraude", categoria: "Ponto" },
  { path: "/ponto/auditoria", label: "Ponto - Auditoria", categoria: "Ponto" },

  // TV
  { path: "/tv-vendas", label: "TV Vendas", categoria: "TV" },
  { path: "/tv-veiculos", label: "TV Veículos", categoria: "TV" },
  { path: "/tv-cameras", label: "TV Câmeras", categoria: "TV" },
  { path: "/tv-signage", label: "Gerenciador de Telas Remotas", categoria: "TV" },

  // Prospecção
  { path: "/prospeccao-empresas", label: "Prospecção de Empresas", categoria: "Prospecção" },
  { path: "/prospeccao-claude-code", label: "Prospecção Cloud Code", categoria: "Prospecção" },

  // Configurações
  { path: "/config", label: "Configurações", categoria: "Sistema" },
  { path: "/admin/assistente-voz", label: "Assistente de Voz", categoria: "Sistema" },
  { path: "/admin/menu-customizacao", label: "Personalizar Menu", categoria: "Sistema" },
];

export const EXEMPLOS_COMANDOS_VOZ: Array<{ categoria: string; frases: string[] }> = [
  {
    categoria: "Vendas & Faturamento",
    frases: [
      "Quanto faturei hoje?",
      "Quanto faturei este mês?",
      "Qual vendedor vendeu mais hoje?",
      "Qual gerente vendeu mais no mês?",
      "Mostre um gráfico de vendas dos últimos 30 dias.",
      "Qual empresa comprou mais este mês?",
      "Mostre o ranking de vendedores da semana.",
    ],
  },
  {
    categoria: "Empresas & Contatos",
    frases: [
      "Quantas empresas estão vinculadas ao gerente João?",
      "Quantas empresas cadastramos este mês?",
      "Quais empresas não responderam nenhum bot?",
      "Quais contatos estão sem WhatsApp?",
      "Abra a empresa Silva Ltda.",
    ],
  },
  {
    categoria: "Atendimento & Bots",
    frases: [
      "Quantos atendimentos estão abertos?",
      "Quantos chats em fila agora?",
      "Dispare o bot de boas vindas para o segmento premium.",
      "Quantas respostas o bot recebeu hoje?",
    ],
  },
  {
    categoria: "Logística & Veículos",
    frases: [
      "Quantos veículos estão online?",
      "Onde está o veículo ABC-1234?",
      "Quem está dirigindo o caminhão placa XYZ-9876?",
      "Abra o monitoramento logístico.",
    ],
  },
  {
    categoria: "Ponto & RH",
    frases: [
      "Quantas horas extras este mês?",
      "Quais funcionários têm mais alertas?",
      "Rode a auditoria antifraude do ponto.",
      "Quantos funcionários bateram ponto hoje?",
    ],
  },
  {
    categoria: "Ações rápidas (Abrir Programa)",
    frases: [
      "Abra o cadastro de empresas e cadastre o CNPJ 12.345.678/0001-90.",
      "Abra o roteirizador de visitas para amanhã.",
      "Abra o dashboard de vendas.",
      "Abra as automações de marketing.",
    ],
  },
];
