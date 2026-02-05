// Definição centralizada de todos os menus disponíveis no sistema
// Este arquivo é usado para sincronizar os menus do Layout.tsx com as permissões do GruposAcessoCRUD

export interface MenuConfigItem {
  id: string;
  label: string;
  category?: string;
}

export const MENU_CONFIG: MenuConfigItem[] = [
  // Dashboards
  { id: "Dashboards", label: "Dashboards (Categoria)", category: "Dashboards" },
  { id: "Dashboard", label: "Painel Principal", category: "Dashboards" },
  { id: "Dashboard Atendente", label: "Dashboard Atendente", category: "Dashboards" },
  { id: "Dashboard Supervisor", label: "Dashboard Supervisor", category: "Dashboards" },
  { id: "SLA Dashboard", label: "Dashboard SLA", category: "Dashboards" },
  { id: "Analytics Dashboard", label: "Analytics Avançado", category: "Dashboards" },
  { id: "Dashboard CSAT/NPS", label: "Pesquisas de Satisfação", category: "Dashboards" },
  { id: "Dashboard Gastos IA", label: "Gastos com IA", category: "Dashboards" },
  
  // Chats / Atendimento
  { id: "Atendimento", label: "Chats (Categoria)", category: "Chats" },
  { id: "Painel Chats", label: "Painel de Chats", category: "Chats" },
  { id: "Monitor de Filas", label: "Monitor de Filas", category: "Chats" },
  { id: "Monitor de Funcionários", label: "Monitor de Funcionários", category: "Chats" },
  { id: "Teste Roteamento", label: "Teste de Roteamento", category: "Chats" },
  { id: "Config Atendimento", label: "Configurações de Atendimento", category: "Chats" },
  
  // Vendas
  { id: "Vendas", label: "Vendas (Categoria)", category: "Vendas" },
  { id: "Orçamento", label: "Orçamento", category: "Vendas" },
  { id: "Config Vendas", label: "Configuração de Vendas", category: "Vendas" },
  
  // Outros menus principais
  { id: "Clientes", label: "Funil de Leads", category: "Principal" },
  { id: "Campanhas", label: "Calendário", category: "Principal" },
  { id: "Conteúdos", label: "Listas", category: "Principal" },
  { id: "Email", label: "E-mail", category: "Principal" },
  { id: "Desenho", label: "Marketing", category: "Principal" },
  { id: "Relatórios", label: "Relatórios", category: "Principal" },
  { id: "Logística", label: "Logística", category: "Principal" },
  { id: "Marketplaces", label: "Marketplaces", category: "Principal" },
  { id: "Ads", label: "Ads", category: "Principal" },
  { id: "Robô de Preços", label: "Robô de Preços", category: "Principal" },
  
  // TV Dashboards
  { id: "TV", label: "TV (Categoria)", category: "TV" },
  { id: "TV Vendas", label: "TV Vendas", category: "TV" },
  { id: "TV Veículos", label: "TV Veículos", category: "TV" },
  
  { id: "Templates Mensagem", label: "Templates de Mensagem", category: "Sistema" },
  { id: "Configurações", label: "Configurações", category: "Sistema" },
  { id: "Macros", label: "Macros", category: "Sistema" },
  { id: "Avisos", label: "Avisos", category: "Sistema" },
];

// Lista apenas dos IDs dos menus (para compatibilidade com código existente)
export const MENUS_DISPONIVEIS = MENU_CONFIG.map(menu => menu.id);

// Agrupar menus por categoria para exibição organizada
export const getMenusByCategory = () => {
  const categories: Record<string, MenuConfigItem[]> = {};
  
  MENU_CONFIG.forEach(menu => {
    const category = menu.category || 'Outros';
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(menu);
  });
  
  return categories;
};

// Ordem das categorias para exibição
export const CATEGORY_ORDER = ['Dashboards', 'Chats', 'Vendas', 'Principal', 'TV', 'Sistema'];
