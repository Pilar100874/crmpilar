// Definição centralizada de todos os menus disponíveis no sistema
// Este arquivo é usado para sincronizar os menus do Layout.tsx com as permissões do GruposAcessoCRUD

export const MENU_CONFIG = [
  { id: "Dashboard", label: "Painel" },
  { id: "Clientes", label: "Leads" },
  { id: "Atendimento", label: "Chats" },
  { id: "WhatsApp Config", label: "WhatsApp" },
  { id: "Campanhas", label: "Calendário" },
  { id: "Orçamentos", label: "Orçamentos" },
  { id: "Conteúdos", label: "Listas" },
  { id: "Contatos", label: "Contatos" },
  { id: "Empresas", label: "Empresas" },
  { id: "Todos", label: "Todos" },
  { id: "Email", label: "E-mail" },
  { id: "Caixa de Entrada", label: "Caixa de Entrada" },
  { id: "Enviados", label: "Enviados" },
  { id: "Arquivados", label: "Arquivados" },
  { id: "Lixeira", label: "Lixeira" },
  { id: "Bot Test", label: "Bot" },
  { id: "Criar Bot", label: "Criar / Editar Bot" },
  { id: "Testar", label: "Testar Bot" },
  { id: "Desenho", label: "Estatísticas" },
  { id: "Teste de Webhooks", label: "Webhooks" },
  { id: "Configurações", label: "Configurações" },
] as const;

// Lista apenas dos IDs dos menus (para compatibilidade com código existente)
export const MENUS_DISPONIVEIS = MENU_CONFIG.map(menu => menu.id);
