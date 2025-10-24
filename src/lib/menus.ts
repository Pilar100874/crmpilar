// Definição centralizada de todos os menus disponíveis no sistema
// Este arquivo é usado para sincronizar os menus do Config.tsx com as permissões do GruposAcessoCRUD

export const MENU_CONFIG = [
  { id: "Dashboard", label: "Dashboard" },
  { id: "Atendimento", label: "Atendimento" },
  { id: "Clientes", label: "Clientes" },
  { id: "Campanhas", label: "Campanhas" },
  { id: "Conteúdos", label: "Conteúdos" },
  { id: "Desenho", label: "Desenho" },
  { id: "Bot Builder", label: "Bot Builder" },
  { id: "Bot Test", label: "Teste de Bot" },
  { id: "Criar Bot", label: "Criar Bot" },
  { id: "Testar", label: "Testar" },
  { id: "WhatsApp Config", label: "WhatsApp Config" },
  { id: "Variáveis Globais", label: "Variáveis Globais" },
  { id: "Teste de Webhooks", label: "Teste de Webhooks" },
  { id: "Textos Prontos", label: "Meus Textos Prontos" },
  { id: "Anexos", label: "Meus Anexos" },
  { id: "Estabelecimentos", label: "Estabelecimentos" },
  { id: "Administradores", label: "Administradores" },
  { id: "Configurações", label: "Configurações" },
] as const;

// Lista apenas dos IDs dos menus (para compatibilidade com código existente)
export const MENUS_DISPONIVEIS = MENU_CONFIG.map(menu => menu.id);
