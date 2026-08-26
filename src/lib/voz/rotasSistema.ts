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
  // ============ Pilar Ferramentas ============
  { path: "/transportadoras", titulo: "Transportadoras", aliases: ["transportadoras", "entrada de transportadora", "portaria de transportadoras"] },
  { path: "/transportadoras/saida", titulo: "Saída de Transportadoras", aliases: ["saida de transportadora", "registrar saida transportadora"] },
  { path: "/transportadoras/movimentos", titulo: "Movimentos de Transportadoras", aliases: ["movimentos de transportadoras", "historico de transportadoras"] },
  { path: "/transportadoras/veiculos", titulo: "Veículos de Transportadoras", aliases: ["veiculos de transportadoras", "caminhoes de terceiros"] },
  { path: "/transportadoras/motoristas", titulo: "Motoristas de Transportadoras", aliases: ["motoristas de transportadoras", "motoristas de terceiros"] },
  { path: "/ferramentas", titulo: "Pilar Ferramentas", aliases: ["ferramentas", "controle de ferramentas", "almoxarifado de ferramentas"] },
  { path: "/ferramentas/tools", titulo: "Cadastro de Ferramentas", aliases: ["cadastro de ferramentas", "lista de ferramentas"] },
  { path: "/ferramentas/loans", titulo: "Registros de Empréstimos", aliases: ["registros de ferramentas", "registros de emprestimos", "historico de emprestimos"] },
  { path: "/ferramentas/loan/return", titulo: "Devolução de Ferramentas", aliases: ["devolucao de ferramentas", "devolver ferramenta"] },
  { path: "/ferramentas/loan/relend", titulo: "Novo Empréstimo de Ferramentas", aliases: ["emprestar ferramenta", "novo emprestimo de ferramenta"] },
  { path: "/ferramentas/loan/renewals", titulo: "Renovações de Empréstimo", aliases: ["renovacoes de emprestimo", "renovar emprestimo de ferramenta"] },
  { path: "/ferramentas/request-tools", titulo: "Solicitar Ferramentas", aliases: ["solicitar ferramentas", "pedido de ferramentas"] },
  { path: "/ferramentas/process-requests", titulo: "Processar Solicitações de Ferramentas", aliases: ["processar solicitacoes de ferramentas"] },
  { path: "/ferramentas/kits", titulo: "Kits de Ferramentas", aliases: ["kits de ferramentas"] },
  { path: "/ferramentas/supplies", titulo: "Insumos de Ferramentas", aliases: ["insumos", "consumiveis do almoxarifado"] },
  { path: "/ferramentas/warehouses", titulo: "Almoxarifados", aliases: ["almoxarifados", "depositos de ferramentas"] },
  { path: "/ferramentas/tracking", titulo: "Rastreamento de Ferramentas", aliases: ["rastreamento de ferramentas"] },
  { path: "/ferramentas/return-issues", titulo: "Ocorrências de Devolução", aliases: ["ocorrencias de devolucao", "avarias de ferramentas"] },
  { path: "/ferramentas/reports", titulo: "Relatórios de Ferramentas", aliases: ["relatorios de ferramentas"] },
  { path: "/ferramentas/users", titulo: "Usuários do Pilar Ferramentas", aliases: ["usuarios de ferramentas"] },
  { path: "/ferramentas/permissions", titulo: "Permissões do Pilar Ferramentas", aliases: ["permissoes de ferramentas"] },
  { path: "/ferramentas/settings", titulo: "Configurações do Pilar Ferramentas", aliases: ["configuracoes de ferramentas"] },
  { path: "/ferramentas/tool-assistant", titulo: "Assistente de Ferramentas", aliases: ["assistente de ferramentas"] },
  { path: "/ia-platform/credenciais", titulo: "Credenciais e Segredos da IA", aliases: ["credenciais da ia", "cofre de segredos", "segredos da plataforma de ia", "chaves do claude code"] },
  { path: "/ia-platform/criar", titulo: "Criar com Assistente (Agentes IA)", aliases: ["criar com assistente", "assistente de criacao", "criar agente passo a passo", "criar rotina passo a passo"] },
  { path: "/ia-platform/wizard-inicial", titulo: "Wizard Inicial dos Agentes IA", aliases: ["wizard inicial", "configuracao inicial da ia", "assistente de configuracao da ia"] },
  { path: "/ia-platform/manual", titulo: "Manual de Uso dos Agentes IA", aliases: ["manual da ia", "manual de uso da ia", "exemplos de rotinas"] },
  { path: "/ia-platform/config-servidor", titulo: "Configurações do Servidor de IA", aliases: ["configuracao do servidor de ia", "chaves do servidor", "config do servidor de agentes"] },
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
  { path: "/ponto/funcionarios", titulo: "Funcionários do Ponto", aliases: ["funcionarios do ponto", "ponto - funcionarios"] },
  { path: "/ponto/registro", titulo: "Registro via App", aliases: ["registro de ponto", "registro via app", "ponto - registro via app"] },
  { path: "/ponto/tratamento", titulo: "Tratamento de Ponto", aliases: ["tratamento de ponto", "ponto - tratamento"] },
  { path: "/ponto/ajustes", titulo: "Ajustes de Ponto", aliases: ["ajustes de ponto", "ponto - ajustes"] },
  { path: "/ponto/espelho", titulo: "Espelho de Ponto", aliases: ["espelho de ponto", "espelho do ponto", "ponto - espelho de ponto"] },
  { path: "/ponto/exportacao", titulo: "Exportação Domínio", aliases: ["exportacao dominio", "exportacao do ponto", "ponto - exportacao dominio"] },
  { path: "/ponto/alertas", titulo: "Antifraude do Ponto", aliases: ["antifraude do ponto", "alertas do ponto", "ponto - antifraude"] },
  { path: "/ponto/auditoria", titulo: "Auditoria do Ponto", aliases: ["auditoria do ponto", "ponto - auditoria"] },
  { path: "/ponto/config", titulo: "Configurações do Ponto", aliases: ["configuracoes do ponto", "config do ponto", "ponto - configuracoes"] },
  { path: "/ponto/aprovacoes", titulo: "Aprovações do Ponto", aliases: ["aprovacoes do ponto", "ponto - aprovacoes"] },


  // ============ Menu Principal - Controle de Veículos ============
  { path: "/controle-veiculos", titulo: "Controle de Veículos", aliases: ["cv", "controle dos veiculos", "dashboard controle de veiculos", "painel controle de veiculos"] },

  // ============ Menu Principal - Controle de Visitantes ============
  { path: "/controle-visitantes", titulo: "Controle de Visitantes", aliases: ["visitantes"] },

  // ============ Menu Principal - Livro de Ocorrência ============
  { path: "/livro-ocorrencia", titulo: "Livro de Ocorrência", aliases: ["livro portaria", "encomendas portaria"] },

  // ============ Menu Principal - Portaria (controle de acesso) ============
  { path: "/portaria", titulo: "Portaria", aliases: ["portaria", "controle de acesso", "abrir portao", "abrir porta"] },
  { path: "/portaria/acessos", titulo: "Portaria - Acessos", aliases: ["acessos portaria", "abrir portao remoto"] },
  { path: "/portaria/pessoas", titulo: "Portaria - Pessoas", aliases: ["moradores portaria", "pessoas portaria"] },
  { path: "/portaria/visitantes", titulo: "Portaria - Visitantes", aliases: ["visitantes portaria"] },
  { path: "/portaria/historico", titulo: "Portaria - Histórico", aliases: ["historico de acessos", "logs portaria"] },
  { path: "/portaria/dispositivos", titulo: "Portaria - Dispositivos", aliases: ["shelly", "idface", "dispositivos portaria"] },
  { path: "/portaria/interfone", titulo: "Portaria - Interfone", aliases: ["interfone"] },
  { path: "/portaria/permissoes", titulo: "Portaria - Permissões", aliases: ["permissoes portaria", "gestor portaria", "papeis portaria"] },
  { path: "/portaria/configuracoes", titulo: "Portaria - Configurações", aliases: ["configuracoes portaria", "pontos de acesso"] },



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
  { path: "/admin/relatorios-voz/snapshots", titulo: "Snapshots de Relatórios", aliases: ["snapshots", "snapshots de relatorios", "relatorios salvos"] },
  { path: "/admin/menu-customizacao", titulo: "Personalizar Menu", aliases: ["customizar menu", "personalizacao de menu", "menu customizacao"] },

  // ============ Outras rotas úteis (fora do menu principal, mas acessíveis por voz) ============
  { path: "/empresas", titulo: "Empresas", aliases: ["cadastro de empresas", "clientes"] },
  { path: "/notas", titulo: "Notas", aliases: ["notas", "minhas notas", "bloco de notas", "notas interligadas"] },
  { path: "/base-conhecimento", titulo: "Base de Conhecimento", aliases: ["base de conhecimento", "artigos", "conhecimento"] },
  { path: "/contatos", titulo: "Contatos", aliases: ["cadastro de contatos"] },
  { path: "/vinculos-empresas", titulo: "Vínculos de Empresas", aliases: ["vinculo empresas", "vinculo de empresas", "vinculos empresa gerente", "vinculo empresa gerente"] },
  { path: "/vinculos-contatos", titulo: "Vínculos de Contatos", aliases: ["vinculo contatos", "vinculo de contatos", "vinculo contato gerente"] },

  // ============ Sub-telas: Listas (Hub com tabs) ============
  { path: "/listas?tab=contatos", titulo: "Contatos", aliases: ["contatos listas", "contatos (listas)"] },
  { path: "/listas?tab=empresas", titulo: "Empresas", aliases: ["empresas listas", "empresas (listas)"] },
  { path: "/listas?tab=vendedores", titulo: "Vendedores", aliases: ["cadastro de vendedores", "lista de vendedores", "abrir vendedores"] },
  { path: "/listas?tab=transportadoras", titulo: "Transportadoras", aliases: ["cadastro de transportadoras", "lista de transportadoras", "abrir transportadoras", "transportadora"] },
  { path: "/listas?tab=gerentes", titulo: "Gerentes", aliases: ["cadastro de gerentes", "lista de gerentes", "abrir gerentes"] },
  { path: "/listas?tab=todos", titulo: "Todos os Cadastros", aliases: ["todos cadastros"] },
  { path: "/listas?tab=vinculos-empresas", titulo: "Vínculo Empresas x Gerente", aliases: ["vinculo empresa gerente listas"] },
  { path: "/listas?tab=vinculos-contatos", titulo: "Vínculo Contatos x Gerente", aliases: ["vinculo contato gerente listas"] },
  { path: "/listas?tab=vinculos-empresa-vendedor", titulo: "Vínculo Empresa x Vendedor", aliases: ["vinculo empresa vendedor", "vinculo empresas vendedor", "empresa x vendedor"] },
  { path: "/listas?tab=vinculos-vendedor-usuario", titulo: "Vínculo Vendedor x Gerente", aliases: ["vinculo vendedor gerente", "vendedor x gerente"] },
  { path: "/listas?tab=vinculos-segmento-prospect-usuario", titulo: "Vínculo Segmento Prospect x Gerente", aliases: ["vinculo segmento prospect", "segmento prospect gerente"] },
  { path: "/listas?tab=mapa-clientes", titulo: "Mapa de Clientes", aliases: ["mapa dos clientes", "mapa de empresas"] },
  { path: "/listas?tab=prospeccao-b2b", titulo: "Prospecção B2B", aliases: ["prospectar b2b"] },
  { path: "/listas?tab=prospeccao-empresas", titulo: "Prospecção de Empresas", aliases: ["prospeccao", "prospeccao empresas", "prospeccao empresas ia", "wizard prospeccao"] },
  { path: "/listas?tab=prospeccao-vendedores", titulo: "Prospecção Representantes IA", aliases: ["prospeccao representantes", "prospectar representantes", "prospeccao vendedores"] },
  { path: "/listas?tab=config-ia-prospec", titulo: "Configurar IAs de Prospecção", aliases: ["configurar ias prospeccao", "config ia prospeccao"] },
  { path: "/listas?tab=prospeccao-claude-code", titulo: "Dados para IA (MCP)", aliases: ["dados para ia", "mcp dados", "disponibilizar dados ia"] },
  { path: "/importacao-produtos", titulo: "Importação de Produtos" },
  { path: "/perfil", titulo: "Meu Perfil", aliases: ["perfil", "meu cadastro"] },
  { path: "/avisos", titulo: "Avisos", aliases: ["avisos do sistema"] },
  { path: "/chat-interno", titulo: "Chat Interno", aliases: ["chat da equipe"] },
  { path: "/macros", titulo: "Macros" },
  { path: "/softphone", titulo: "Softphone", aliases: ["telefone", "ramal"] },
  { path: "/politicas-internas", titulo: "Políticas Internas" },
  { path: "/quality-assurance", titulo: "Quality Assurance", aliases: ["qa", "controle de qualidade"] },
  { path: "/bot-builder", titulo: "Bot Builder", aliases: ["construtor de bots"] },

  // ============ Sub-telas: Controle de Veículos ============
  { path: "/controle-veiculos/veiculos", titulo: "Veículos", aliases: ["cadastro de veiculos", "veiculos controle", "controle de veiculos - veiculos"] },
  { path: "/controle-veiculos/motoristas", titulo: "Motoristas", aliases: ["cadastro de motoristas", "controle de veiculos - motoristas"] },
  { path: "/controle-veiculos/saida", titulo: "Saída", aliases: ["saida de veiculo", "registrar saida de veiculo", "controle de veiculos - saida"] },
  { path: "/controle-veiculos/entrada", titulo: "Entrada", aliases: ["entrada de veiculo", "registrar entrada de veiculo", "controle de veiculos - entrada"] },
  { path: "/controle-veiculos/movimentacoes", titulo: "Movimentações", aliases: ["movimentacoes de veiculos", "controle de veiculos - movimentacoes"] },
  { path: "/manutencao", titulo: "Manutenções & Defeitos", aliases: ["defeitos de veiculos", "manutencoes e defeitos", "paradas de manutencao"] },
  { path: "/manutencao/tipos-defeito", titulo: "Tipos de Defeito", aliases: ["tipos de defeito de veiculo"] },
  { path: "/manutencao/analise", titulo: "Análise de Manutenção", aliases: ["manutencao de veiculos", "controle de veiculos - manutencao"] },
  { path: "/controle-veiculos/vistoria-config", titulo: "Configuração de Vistoria", aliases: ["config vistoria", "configuracao de vistoria"] },
  { path: "/controle-veiculos/ajudantes", titulo: "Ajudantes", aliases: ["ajudantes de veiculos", "controle de veiculos - ajudantes"] },
  { path: "/controle-veiculos/cameras", titulo: "Câmeras dos Veículos", aliases: ["cameras dos veiculos", "cameras controle veiculos"] },
  { path: "/controle-veiculos/historico-imagens", titulo: "Histórico de Imagens", aliases: ["historico de imagens veiculos", "controle de veiculos - historico de imagens"] },

  // ============ Sub-telas: Controle de Visitantes ============
  { path: "/controle-visitantes/entrada", titulo: "Entrada de Visitantes", aliases: ["entrada de visitantes", "registrar visitante", "visitantes - entrada"] },
  { path: "/controle-visitantes/presentes", titulo: "Visitantes Presentes", aliases: ["visitantes presentes", "visitantes - presentes"] },
  { path: "/controle-visitantes/autorizacoes", titulo: "Autorizações de Visita", aliases: ["autorizacoes de visita", "visitantes - autorizacoes"] },
  { path: "/controle-visitantes/relatorios", titulo: "Relatórios de Visitantes", aliases: ["relatorios de visitantes", "visitantes - relatorios"] },
  { path: "/controle-visitantes/visitantes", titulo: "Cadastro de Visitantes", aliases: ["cadastro de visitantes"] },
  { path: "/controle-visitantes/contatos", titulo: "Contatos de Visitantes", aliases: ["contatos de visitantes"] },

  // ============ Sub-telas: Livro de Ocorrência ============
  { path: "/livro-ocorrencia/ocorrencias", titulo: "Ocorrências", aliases: ["ocorrencias da portaria", "livro - ocorrencias"] },
  { path: "/livro-ocorrencia/encomendas", titulo: "Encomendas", aliases: ["encomendas da portaria", "livro - encomendas"] },

  // ============ Sub-telas: Câmeras ============
  { path: "/cameras/ao-vivo", titulo: "Câmeras Ao Vivo", aliases: ["cameras ao vivo"] },
  { path: "/cameras/grupos", titulo: "Grupos de Câmeras", aliases: ["grupos de cameras", "cameras - grupos"] },
  { path: "/cameras/cameras", titulo: "Cadastro de Câmeras", aliases: ["cadastro de cameras", "cameras - cadastro"] },

  // ============ Sub-telas: Gerenciador de Telas Remotas (TV Signage) ============
  { path: "/tv-signage/dispositivos", titulo: "Dispositivos", aliases: ["dispositivos das telas remotas", "dispositivos tv signage", "telas remotas - dispositivos"] },
  { path: "/tv-signage/dashboards", titulo: "Dashboards de Telas Remotas", aliases: ["dashboards das telas remotas", "telas remotas - dashboards"] },
  { path: "/tv-signage/playlists", titulo: "Playlists", aliases: ["playlists de telas remotas", "telas remotas - playlists"] },
  { path: "/tv-signage/grupos", titulo: "Grupos de Telas Remotas", aliases: ["grupos de telas remotas", "telas remotas - grupos"] },
  { path: "/tv-signage/comandos", titulo: "Comandos de Telas Remotas", aliases: ["comandos das telas remotas", "telas remotas - comandos"] },
  { path: "/tv-signage/eventos", titulo: "Eventos de Telas Remotas", aliases: ["eventos das telas remotas", "telas remotas - eventos"] },
  { path: "/tv-signage/workflows", titulo: "Workflows de Telas Remotas", aliases: ["workflows das telas remotas", "telas remotas - workflows"] },
  { path: "/tv-signage/api", titulo: "API de Telas Remotas", aliases: ["api das telas remotas", "telas remotas - api"] },

  // ============ Sub-telas: Ads ============
  { path: "/ads/campaigns", titulo: "Campanhas de Ads", aliases: ["campanhas de anuncios", "campanhas ads", "ads - campanhas"] },
  { path: "/ads/reports", titulo: "Relatórios de Ads", aliases: ["relatorios de ads", "relatorios de anuncios", "ads - relatorios"] },
  { path: "/ads/alerts", titulo: "Alertas de Ads", aliases: ["alertas de ads", "ads - alertas"] },
  { path: "/ads/credentials", titulo: "Conexões de Ads", aliases: ["conexoes de ads", "credenciais de ads", "ads - conexoes"] },
  { path: "/ads/logs", titulo: "Logs de Ads", aliases: ["logs de ads", "ads - logs"] },
  { path: "/ads/automation", titulo: "Automação de Ads", aliases: ["automacao de ads", "automacoes de ads", "ads - automacao"] },
  { path: "/ads/scheduler", titulo: "Agendador de Ads", aliases: ["agendador de ads", "ads - agendador"] },
  { path: "/ads/platform-apps", titulo: "Aplicativos de Plataforma de Ads", aliases: ["aplicativos de ads", "ads - aplicativos de plataforma"] },
  { path: "/ads/wizard", titulo: "Assistente de Configuração de Ads", aliases: ["wizard de ads", "assistente ads", "ads - assistente de configuracao"] },

  // ============ Sub-telas: E-commerce (loja) ============
  { path: "/ecommerce/catalogo", titulo: "Catálogo da Loja", aliases: ["catalogo da loja", "catalogo ecommerce", "catalogo do ecommerce", "e-commerce - catalogo"] },
  { path: "/ecommerce/carrinho", titulo: "Carrinho", aliases: ["carrinho da loja", "e-commerce - carrinho"] },
  { path: "/ecommerce/orcamento", titulo: "Solicitar Orçamento na Loja", aliases: ["solicitar orcamento na loja", "e-commerce - solicitar orcamento"] },
  { path: "/ecommerce/wishlist", titulo: "Lista de Desejos", aliases: ["wishlist", "lista de desejos", "e-commerce - lista de desejos"] },
  { path: "/ecommerce/checkout", titulo: "Checkout", aliases: ["checkout", "e-commerce - checkout"] },
  { path: "/ecommerce/b2b", titulo: "B2B da Loja", aliases: ["b2b da loja", "e-commerce - b2b"] },
  { path: "/ecommerce/conta", titulo: "Minha Conta na Loja", aliases: ["minha conta na loja", "e-commerce - minha conta"] },

  // ============ Sub-telas: E-commerce (configurações) ============
  { path: "/ecommerce-config/branding", titulo: "Branding da Loja", aliases: ["branding da loja", "e-commerce config - branding"] },
  { path: "/ecommerce-config/conteudos", titulo: "Conteúdos da Loja", aliases: ["conteudos da loja", "e-commerce config - conteudos"] },
  { path: "/ecommerce-config/anuncios", titulo: "Anúncios da Loja", aliases: ["anuncios da loja", "e-commerce config - anuncios"] },
  { path: "/ecommerce-config/rodape", titulo: "Rodapé da Loja", aliases: ["rodape da loja", "e-commerce config - rodape"] },
  { path: "/ecommerce-config/homepage", titulo: "Homepage da Loja", aliases: ["homepage da loja", "e-commerce config - homepage"] },
  { path: "/ecommerce-config/funcionalidades", titulo: "Funcionalidades da Loja", aliases: ["funcionalidades da loja", "e-commerce config - funcionalidades"] },
  { path: "/ecommerce-config/volume-pricing", titulo: "Preço por Volume", aliases: ["preco por volume", "e-commerce config - preco por volume"] },
  { path: "/ecommerce-config/cupons", titulo: "Cupons da Loja", aliases: ["cupons da loja", "e-commerce config - cupons"] },
  { path: "/ecommerce-config/b2b", titulo: "Config B2B da Loja", aliases: ["config b2b da loja", "e-commerce config - b2b"] },
  { path: "/ecommerce-config/newsletter", titulo: "Newsletter da Loja", aliases: ["newsletter da loja", "e-commerce config - newsletter"] },
  { path: "/ecommerce-config/mapa-calor", titulo: "Mapa de Calor da Loja", aliases: ["mapa de calor da loja", "e-commerce config - mapa de calor"] },
  { path: "/ecommerce-config/denuncias", titulo: "Denúncias da Loja", aliases: ["denuncias da loja", "e-commerce config - denuncias"] },
  { path: "/ecommerce-config/lgpd", titulo: "LGPD da Loja", aliases: ["lgpd da loja", "e-commerce config - lgpd"] },
  { path: "/ecommerce-rules", titulo: "Regras do E-commerce", aliases: ["regras do ecommerce", "regras da loja", "e-commerce - regras"] },


  // ============ Sub-telas: Marketing (abas do hub) ============
  { path: "/marketing?tab=strategy-engine", titulo: "Motor de Estratégia", aliases: ["marketing motor de estrategia", "estrategia de marketing", "agentes de marketing"] },
  { path: "/marketing?tab=ai-studio", titulo: "AI Creative Studio", aliases: ["ai studio", "creative studio", "estudio criativo", "estudio de ia", "marketing ai studio"] },
  { path: "/marketing?tab=auto-video-wizard", titulo: "Assistente de Vídeo", aliases: ["wizard de video", "auto video", "marketing assistente de video"] },
  { path: "/marketing?tab=video-editor", titulo: "Editor de Vídeo", aliases: ["timeline de video", "marketing editor de video"] },
  { path: "/marketing?tab=config-apis", titulo: "Config APIs", aliases: ["chaves de api marketing", "config apis marketing"] },
  { path: "/marketing?tab=envio-massa", titulo: "Envio em Massa", aliases: ["disparo em massa", "disparos em massa", "marketing envio em massa"] },
  { path: "/marketing?tab=mensagens-grupo", titulo: "Mensagens pré definidas", aliases: ["mensagens pre definidas", "mensagem pre definida", "mensagens por grupo de produtos"] },
  { path: "/marketing?tab=apresentacoes", titulo: "Apresentação", aliases: ["apresentacoes de marketing", "apresentacao tv", "marketing apresentacao"] },
  { path: "/marketing?tab=galeria", titulo: "Galeria", aliases: ["galeria de marketing", "galeria de midias"] },
  { path: "/marketing?tab=catalogo", titulo: "Catálogo", aliases: ["catalogo de marketing", "catalogo pdf de produtos"] },
  { path: "/marketing?tab=automacoes", titulo: "Automações", aliases: ["automacoes de marketing"] },
  { path: "/marketing?tab=campanhas", titulo: "Campanhas", aliases: ["campanhas de marketing"] },
  { path: "/marketing?tab=page-builder", titulo: "Page Builder", aliases: ["construtor de paginas", "construtor de sites", "criar site", "criar pagina", "marketing page builder"] },
  { path: "/marketing?tab=canvas", titulo: "Canvas", aliases: ["canvas de marketing", "canvas editor"] },
  { path: "/marketing?tab=integrations", titulo: "Integrações", aliases: ["integracoes de marketing", "integracoes google ms sql"] },
  { path: "/marketing?tab=conectores-sociais", titulo: "Conectores de Redes Sociais", aliases: ["conectar instagram", "conectar facebook", "conectar tiktok", "conectar linkedin"] },
  { path: "/marketing?tab=links-sociais", titulo: "Links das Redes Sociais", aliases: ["links sociais marketing"] },



  // ============ Sub-telas: Ponto (extras) ============
  { path: "/ponto/portal", titulo: "Ponto - Portal do Funcionário", aliases: ["portal do funcionario"] },
  { path: "/ponto/mapa", titulo: "Ponto - Mapa de Equipes", aliases: ["mapa das equipes de ponto"] },
  { path: "/ponto/fora-geofence", titulo: "Ponto - Fora da Geofence", aliases: ["fora da geofence"] },
  { path: "/ponto/qrcode", titulo: "Ponto - QR Code Totem", aliases: ["qr code totem do ponto"] },
  { path: "/ponto/fechamento", titulo: "Ponto - Fechamento", aliases: ["fechamento do ponto"] },
  { path: "/ponto/pre-fechamento", titulo: "Ponto - Pré Fechamento", aliases: ["pre fechamento do ponto"] },
  { path: "/ponto/banco-horas", titulo: "Ponto - Banco de Horas", aliases: ["banco de horas"] },
  { path: "/ponto/ferias", titulo: "Ponto - Férias", aliases: ["ferias do ponto"] },
  { path: "/ponto/afd", titulo: "Ponto - AFD", aliases: ["arquivo afd"] },
  { path: "/ponto/esocial", titulo: "Ponto - eSocial", aliases: ["esocial do ponto"] },
  { path: "/ponto/importacao", titulo: "Ponto - Importação", aliases: ["importacao de ponto"] },
  { path: "/ponto/dashboard-executivo", titulo: "Ponto - Dashboard Executivo", aliases: ["dashboard executivo do ponto"] },
  { path: "/ponto/anomalias", titulo: "Ponto - Anomalias", aliases: ["anomalias do ponto"] },
  { path: "/ponto/compliance", titulo: "Ponto - Compliance", aliases: ["compliance do ponto"] },
  { path: "/ponto/sobreaviso", titulo: "Ponto - Sobreaviso", aliases: ["sobreaviso"] },
  { path: "/ponto/dsr", titulo: "Ponto - DSR", aliases: ["dsr do ponto"] },
  { path: "/ponto/lgpd", titulo: "Ponto - LGPD", aliases: ["lgpd do ponto"] },
  { path: "/ponto/acordos-coletivos", titulo: "Ponto - Acordos Coletivos", aliases: ["acordos coletivos"] },
  { path: "/ponto/compensacao", titulo: "Ponto - Compensação", aliases: ["compensacao do ponto"] },
  { path: "/ponto/notificacoes", titulo: "Ponto - Notificações", aliases: ["notificacoes do ponto"] },
  { path: "/ponto/simulador", titulo: "Ponto - Simulador", aliases: ["simulador do ponto"] },
  { path: "/ponto/predicoes", titulo: "Ponto - Predições", aliases: ["predicoes do ponto"] },
  { path: "/ponto/manual", titulo: "Ponto - Manual", aliases: ["manual do ponto"] },
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
  return matchRotaComCandidatosEm(ROTAS_SISTEMA, fala);
}

/** Igual ao anterior, mas usa a lista de rotas passada (permite injetar aliases customizados). */
export function matchRotaComCandidatosEm(
  rotas: RotaSistema[],
  fala: string,
): {
  escolhida: RotaSistema | null;
  topN: Array<{ rota: RotaSistema; score: number }>;
} {
  const falaTokens = tokens(fala);
  if (falaTokens.length === 0) return { escolhida: null, topN: [] };
  const falaNorm = normalizar(fala);

  const candidatos: Candidato[] = [];

  for (const rota of rotas) {
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

      if (compartilhados > 0 && candTokens.length > 0) {
        const cobertura = compartilhados / candTokens.length;
        score += Math.round(cobertura * 30);
        if (candTokens.length >= 2 && cobertura < 0.5) score -= 25;
      }

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

  const MIN_SCORE = 45;
  const MIN_MARGEM = 8;

  if (primeiro.score < MIN_SCORE) return { escolhida: null, topN };
  if (segundo && primeiro.score - segundo.score < MIN_MARGEM) {
    return { escolhida: null, topN };
  }

  return { escolhida: primeiro.rota, topN };
}
