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
      { id: "Config Atendimento", title: "Configurações", url: "/atendimento-config", icon: LucideIcons.Settings },
    ]
  },
  { id: "Campanhas", title: "Calendário", url: "/calendario", icon: LucideIcons.Megaphone },
  { 
    id: "Vendas",
    title: "Vendas", 
    icon: LucideIcons.ShoppingCart,
    subItems: [
      { id: "Orçamento", title: "Orçamento", url: "/orcamentos", icon: LucideIcons.FileBarChart },
      { id: "Config Vendas", title: "Configuração de Vendas", url: "/vendas-config", icon: LucideIcons.Settings },
      { id: "Regras Ecommerce", title: "Regras do E-commerce", url: "/ecommerce-rules", icon: LucideIcons.Workflow },
    ]
  },
  { id: "Conteúdos", title: "Listas", url: "/listas", icon: LucideIcons.FileText },
  {
    id: "Email",
    title: "E-mail", 
    url: "/email",
    icon: LucideIcons.Mail
  },
  { 
    id: "Desenho", 
    title: "Marketing", 
    url: "/marketing",
    icon: LucideIcons.Target
  },
{ id: "Relatórios", title: "Relatórios", url: "/relatorios", icon: LucideIcons.FileText },
  { id: "Logística", title: "Logística", url: "/logistica", icon: LucideIcons.Truck },
  { id: "Robô de Preços", title: "Robô de Preços", url: "/robo-precos", icon: LucideIcons.Bot },
  { id: "Ads", title: "Ads", url: "/ads", icon: LucideIcons.Megaphone },
  { id: "Marketplaces", title: "Marketplaces", url: "/marketplaces", icon: LucideIcons.Store },
  { 
    id: "Configurações",
    title: "Configurações", 
    icon: LucideIcons.Settings,
    subItems: [
      { id: "Config Geral", title: "Configurações Gerais", url: "/config", icon: LucideIcons.Settings },
      { id: "Config Notificacoes Sistema", title: "Notificações do Sistema", url: "/config?secao=notificacoes-sistema", icon: LucideIcons.Bell },
      { id: "Config Estabelecimento", title: "Estabelecimento Cadastrado", url: "/config?secao=cadastro-estabelecimentos", icon: LucideIcons.Store },
      { id: "Config Estab Resend", title: "Estabelecimento → Configuração Resend (Email)", url: "/config?secao=cadastro-estabelecimentos&subsecao=resend-config", icon: LucideIcons.Mail },
      { id: "Config Estab Unidades", title: "Estabelecimento → Cadastro de Unidades", url: "/config?secao=cadastro-estabelecimentos&subsecao=cadastro-unidades", icon: LucideIcons.Building2 },
      { id: "Config Estab SLA", title: "Estabelecimento → SLA de Atendimento", url: "/config?secao=cadastro-estabelecimentos&subsecao=cadastro-sla", icon: LucideIcons.Clock },
      { id: "Config Estab Usuarios", title: "Estabelecimento → Usuários e Acessos", url: "/config?secao=cadastro-estabelecimentos&subsecao=usuarios-acessos", icon: LucideIcons.UserCog },
      { id: "Config Estab Grupos", title: "Estabelecimento → Grupos de Acesso", url: "/config?secao=cadastro-estabelecimentos&subsecao=usuarios-acessos&subsubsecao=grupos-acesso", icon: LucideIcons.FolderTree },
      { id: "Config Estab Cadastro Usuarios", title: "Estabelecimento → Cadastro de Usuários", url: "/config?secao=cadastro-estabelecimentos&subsecao=usuarios-acessos&subsubsecao=cadastro-usuarios", icon: LucideIcons.Users },
      { id: "Config Estab Segmentos", title: "Estabelecimento → Segmentos", url: "/config?secao=cadastro-estabelecimentos&subsecao=usuarios-acessos&subsubsecao=cadastro-segmentos", icon: LucideIcons.Tag },
      { id: "Config Estab Redes Sociais", title: "Estabelecimento → Redes Sociais", url: "/config?secao=cadastro-estabelecimentos&subsecao=redes-sociais", icon: LucideIcons.Share2 },
      { id: "Config Estab Calendario", title: "Estabelecimento → Regras do Calendário", url: "/config?secao=cadastro-estabelecimentos&subsecao=regras-calendario", icon: LucideIcons.Calendar },
      { id: "Config Estab UCM", title: "Estabelecimento → Configuração UCM/PABX", url: "/config?secao=cadastro-estabelecimentos&subsecao=configuracao-ucm", icon: LucideIcons.Phone },
      { id: "Config Estab Integracao", title: "Estabelecimento → Integração e APIs", url: "/config?secao=cadastro-estabelecimentos&subsecao=integracao-apis", icon: LucideIcons.Link },
      { id: "Config Estab Gerador API", title: "Estabelecimento → Gerador de API", url: "/config?secao=cadastro-estabelecimentos&subsecao=integracao-apis&subsubsecao=gerador-api", icon: LucideIcons.Zap },
      { id: "Config Estab Webhooks", title: "Estabelecimento → Webhooks", url: "/config?secao=cadastro-estabelecimentos&subsecao=integracao-apis&subsubsecao=webhooks", icon: LucideIcons.Webhook },
      { id: "Config Estab Webhooks Entrada", title: "Estabelecimento → Webhooks de Entrada", url: "/config?secao=cadastro-estabelecimentos&subsecao=integracao-apis&subsubsecao=webhooks-entrada", icon: LucideIcons.Globe },
      { id: "Config Estab Seguranca", title: "Estabelecimento → Segurança", url: "/config?secao=cadastro-estabelecimentos&subsecao=integracao-apis&subsubsecao=seguranca", icon: LucideIcons.Shield },
      { id: "Config Estab Vendas", title: "Estabelecimento → Vendas", url: "/config?secao=cadastro-estabelecimentos&subsecao=vendas", icon: LucideIcons.DollarSign },
      { id: "Config Estab Tipo Pagamento", title: "Estabelecimento → Tipo de Pagamento", url: "/config?secao=cadastro-estabelecimentos&subsecao=vendas&subsubsecao=tipo-pagamento", icon: LucideIcons.CreditCard },
      { id: "Config Estab Tabelas Preco", title: "Estabelecimento → Tabelas de Preço", url: "/config?secao=cadastro-estabelecimentos&subsecao=vendas&subsubsecao=tabelas-preco", icon: LucideIcons.DollarSign },
      { id: "Config Estab Condicoes Pagamento", title: "Estabelecimento → Condição de Pagamento", url: "/config?secao=cadastro-estabelecimentos&subsecao=vendas&subsubsecao=condicoes-pagamento", icon: LucideIcons.Wallet },
      { id: "Config Estab Produtos", title: "Estabelecimento → Cadastro de Produtos", url: "/config?secao=cadastro-estabelecimentos&subsecao=vendas&subsubsecao=cadastro-produtos", icon: LucideIcons.Package },
      { id: "Config Estab Grupos Produtos", title: "Estabelecimento → Grupos de Produtos", url: "/config?secao=cadastro-estabelecimentos&subsecao=vendas&subsubsecao=grupos-produtos", icon: LucideIcons.FolderOpen },
      { id: "Config Estab Categorias Produtos", title: "Estabelecimento → Categorias de Produtos", url: "/config?secao=cadastro-estabelecimentos&subsecao=vendas&subsubsecao=categorias-produtos", icon: LucideIcons.Layers },
      { id: "Config Estab Regras Orcamento", title: "Estabelecimento → Regras para o Orçamento", url: "/config?secao=cadastro-estabelecimentos&subsecao=automacao-vendas", icon: LucideIcons.Zap },
      { id: "Config Administradores", title: "Cadastro de Administradores", url: "/config?secao=cadastro-administradores", icon: LucideIcons.ShieldCheck },
      { id: "Config Recuperar Senha", title: "Recuperar Senha", url: "/config?secao=recuperar-senha", icon: LucideIcons.ShieldCheck },
      { id: "Config Campanhas", title: "Campanhas", url: "/config?secao=campanhas", icon: LucideIcons.Megaphone },
      { id: "Config Conteudos", title: "Conteúdos", url: "/config?secao=conteudos", icon: LucideIcons.FileText },
      { id: "Config Variaveis Globais Menu", title: "Variáveis Globais", url: "/config/variaveis", icon: LucideIcons.FileText },
      { id: "Config Skills", title: "Skills de Atendimento", url: "/config/skills", icon: LucideIcons.Users },
      { id: "Config Filas", title: "Filas de Atendimento", url: "/config/filas", icon: LucideIcons.ListOrdered },
      { id: "SLA Config", title: "SLA", url: "/config/sla", icon: LucideIcons.Clock },
      { id: "Omnichannel Builder", title: "Workflow Builder Omnichannel", url: "/omnichannel-builder", icon: LucideIcons.Workflow },
      { id: "Teste de Webhooks", title: "Teste de Webhooks", url: "/config/webhooks", icon: LucideIcons.Globe },
      { id: "Teste Campanhas Menu", title: "Teste Campanhas", url: "/config/campanhas", icon: LucideIcons.Megaphone },
      { id: "Gerenciar Atalhos", title: "Gerenciar Atalhos", url: "/gerenciar-atalhos", icon: LucideIcons.Star },
      { id: "Config Pagamentos", title: "Gateways de Pagamento", url: "/config/pagamentos", icon: LucideIcons.CreditCard },
    ]
  },
];
