// Estrutura de menus exportada do Layout.tsx
// Este arquivo centraliza a estrutura de menus para ser reutilizada em outras partes do sistema

import * as LucideIcons from "lucide-react";

export interface SubMenuItem {
  id: string;
  title: string;
  url: string;
  icon: any;
}

export interface MenuCategory {
  id: string;
  title: string;
  url?: string;
  icon: any;
  subItems?: SubMenuItem[];
}

export const menuStructure: MenuCategory[] = [
  { 
    id: "Dashboards",
    title: "Dashboards", 
    icon: LucideIcons.LayoutDashboard,
    subItems: [
      { id: "Dashboard", title: "Painel", url: "/dashboard", icon: LucideIcons.LayoutDashboard },
      { id: "Dashboard Atendente", title: "Dashboard Atendente", url: "/dashboard-atendente", icon: LucideIcons.Users },
      { id: "Dashboard Supervisor", title: "Dashboard Supervisor", url: "/dashboard-supervisor", icon: LucideIcons.LayoutDashboard },
      { id: "SLA Dashboard", title: "Dashboard SLA", url: "/sla-dashboard", icon: LucideIcons.Activity },
      { id: "Analytics Dashboard", title: "Analytics Avançado", url: "/advanced-analytics", icon: LucideIcons.FileBarChart },
      { id: "Dashboard CSAT/NPS", title: "Pesquisas de Satisfação", url: "/dashboard-pesquisas-satisfacao", icon: LucideIcons.Star },
      { id: "Dashboard Gastos IA", title: "Gastos com IA", url: "/dashboard-gastos-ia", icon: LucideIcons.Brain },
    ]
  },
  { id: "Clientes", title: "Funil", url: "/funil", icon: LucideIcons.Users },
  { 
    id: "Atendimento",
    title: "Chats", 
    icon: LucideIcons.MessageSquare,
    subItems: [
      { id: "Painel Chats", title: "Painel", url: "/atendimento", icon: LucideIcons.MessageSquare },
      { id: "Monitor de Filas", title: "Monitor de Filas", url: "/monitor-filas", icon: LucideIcons.Activity },
      { id: "Teste Roteamento", title: "Teste de Roteamento", url: "/test-roteamento", icon: LucideIcons.TestTube2 },
    ]
  },
  { id: "Campanhas", title: "Calendário", url: "/calendario", icon: LucideIcons.Megaphone },
  { id: "Orçamentos", title: "Orçamentos", url: "/orcamentos", icon: LucideIcons.FileBarChart },
  { 
    id: "Conteúdos",
    title: "Listas", 
    icon: LucideIcons.FileText,
    subItems: [
      { id: "Contatos", title: "Contatos", url: "/contatos", icon: LucideIcons.User },
      { id: "Empresas", title: "Empresas", url: "/empresas", icon: LucideIcons.Building2 },
      { id: "Todos", title: "Todos", url: "/todos", icon: LucideIcons.Users },
      { id: "Vínculos Empresas", title: "Vínculo Empresas X Usuário / Segmento", url: "/vinculos-empresas", icon: LucideIcons.Building2 },
      { id: "Vínculos Contatos", title: "Vínculo Contatos X Usuário / Segmento", url: "/vinculos-contatos", icon: LucideIcons.User },
    ]
  },
  { 
    id: "Email",
    title: "E-mail", 
    icon: LucideIcons.Mail,
    subItems: [
      { id: "Caixa de Entrada", title: "Caixa de Entrada", url: "/email/inbox", icon: LucideIcons.MessageSquare },
      { id: "Enviados", title: "Enviados", url: "/email/sent", icon: LucideIcons.MessageSquare },
      { id: "Arquivados", title: "Arquivados", url: "/email/archive", icon: LucideIcons.MessageSquare },
      { id: "Lixeira", title: "Lixeira", url: "/email/trash", icon: LucideIcons.MessageSquare },
    ]
  },
  { 
    id: "Bot Test", 
    title: "Bot", 
    icon: LucideIcons.Workflow,
    subItems: [
      { id: "Criar Bot", title: "Criar / Editar", url: "/bot-create", icon: LucideIcons.Plus },
      { id: "Testar", title: "Testar", url: "/bot-test", icon: LucideIcons.TestTube2 },
    ]
  },
  { 
    id: "Desenho", 
    title: "Marketing", 
    icon: LucideIcons.Target,
    subItems: [
      { id: "Canvas", title: "Canvas", url: "/marketing/canvas", icon: LucideIcons.Palette },
      { id: "Automações", title: "Automações", url: "/marketing/automacoes", icon: LucideIcons.Zap },
      { id: "Campanhas Marketing", title: "Campanhas", url: "/marketing/campanhas", icon: LucideIcons.Megaphone },
    ]
  },
  { id: "Relatórios", title: "Relatórios", url: "/relatorios", icon: LucideIcons.FileText },
  { id: "Importação Produtos", title: "Importação de Produtos de Terceiro", url: "/importacao-produtos", icon: LucideIcons.Upload },
  { id: "Meus Conjuntos", title: "Meus Conjuntos de Itens", url: "/meus-conjuntos", icon: LucideIcons.Package },
  { id: "Editor de Regras", title: "Editor de Regras", url: "/editor-regras", icon: LucideIcons.Workflow },
  { 
    id: "Telefonia",
    title: "Telefonia", 
    icon: LucideIcons.Phone,
    subItems: [
      { id: "Softphone", title: "Softphone", url: "/softphone", icon: LucideIcons.Phone },
      { id: "Videochamada", title: "Videochamada", url: "/videocall", icon: LucideIcons.Video },
    ]
  },
  { 
    id: "Configurações",
    title: "Configurações", 
    icon: LucideIcons.Settings,
    subItems: [
      { id: "Config Geral", title: "Configurações", url: "/config", icon: LucideIcons.Settings },
      { id: "Config Skills", title: "Skills de Atendimento", url: "/config/skills", icon: LucideIcons.Users },
      { id: "Config Filas", title: "Filas de Atendimento", url: "/config/filas", icon: LucideIcons.ListOrdered },
      { id: "SLA Config", title: "SLA", url: "/config/sla", icon: LucideIcons.Clock },
      { id: "Omnichannel Builder", title: "Workflow Builder Omnichannel", url: "/omnichannel-builder", icon: LucideIcons.Workflow },
      { id: "Teste de Webhooks", title: "Teste de Webhooks", url: "/config/webhooks", icon: LucideIcons.Globe },
      { id: "Variáveis Globais", title: "Variáveis Globais", url: "/config/variaveis", icon: LucideIcons.FileText },
      { id: "Teste Campanhas", title: "Teste Campanhas", url: "/config/campanhas", icon: LucideIcons.Megaphone },
      { id: "Gerenciar Atalhos", title: "Gerenciar Atalhos", url: "/gerenciar-atalhos", icon: LucideIcons.Star },
    ]
  },
];
