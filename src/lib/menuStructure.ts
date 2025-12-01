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
      { id: "Importação Produtos Sub", title: "Importação de Produtos de Terceiro", url: "/importacao-produtos", icon: LucideIcons.Upload },
    ]
  },
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
  { id: "Robô de Preços", title: "Robô de Preços", url: "/robo-precos", icon: LucideIcons.Bot },
  {
    id: "Marketplaces",
    title: "Marketplaces", 
    icon: LucideIcons.Store,
    subItems: [
      { id: "Marketplace Hub", title: "Hub de Marketplaces", url: "/marketplaces", icon: LucideIcons.Store },
      { id: "Marketplace Produtos", title: "Produtos x Canais", url: "/marketplaces/produtos", icon: LucideIcons.Package },
      { id: "Marketplace Pedidos", title: "Pedidos", url: "/marketplaces/pedidos", icon: LucideIcons.ShoppingCart },
    ]
  },
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
      { id: "Config Estab Atendimento", title: "Estabelecimento → Atendimento", url: "/config?secao=cadastro-estabelecimentos&subsecao=atendimento", icon: LucideIcons.MessageSquare },
      { id: "Config Estab Textos Prontos", title: "Estabelecimento → Textos Prontos", url: "/config?secao=cadastro-estabelecimentos&subsecao=atendimento&subsubsecao=textos-prontos", icon: LucideIcons.MessageSquareQuote },
      { id: "Config Estab Anexos Rapidos", title: "Estabelecimento → Anexos Rápidos", url: "/config?secao=cadastro-estabelecimentos&subsecao=atendimento&subsubsecao=anexos-rapidos", icon: LucideIcons.Paperclip },
      { id: "Config Estab Skills", title: "Estabelecimento → Skills de Atendimento", url: "/config?secao=cadastro-estabelecimentos&subsecao=atendimento&subsubsecao=skills-atendimento", icon: LucideIcons.Award },
      { id: "Config Estab Filas", title: "Estabelecimento → Filas de Atendimento", url: "/config?secao=cadastro-estabelecimentos&subsecao=atendimento&subsubsecao=filas-atendimento", icon: LucideIcons.ListTree },
      { id: "Config Estab Atendentes Fila", title: "Estabelecimento → Atendentes por Fila", url: "/config?secao=cadastro-estabelecimentos&subsecao=atendimento&subsubsecao=atendentes-fila", icon: LucideIcons.Users },
      { id: "Config Estab Skills Fila", title: "Estabelecimento → Skills por Fila", url: "/config?secao=cadastro-estabelecimentos&subsecao=atendimento&subsubsecao=skills-fila", icon: LucideIcons.Star },
      { id: "Config Estab Canais", title: "Estabelecimento → Canais de Atendimento", url: "/config?secao=cadastro-estabelecimentos&subsecao=atendimento&subsubsecao=canais-atendimento", icon: LucideIcons.MessageSquare },
      { id: "Config Estab Notificacoes", title: "Estabelecimento → Notificações", url: "/config?secao=cadastro-estabelecimentos&subsecao=atendimento&subsubsecao=notificacoes", icon: LucideIcons.Bell },
      { id: "Config Estab Workflows", title: "Estabelecimento → Workflows Omnichannel", url: "/config?secao=cadastro-estabelecimentos&subsecao=atendimento&subsubsecao=omnichannel-workflows", icon: LucideIcons.Workflow },
      { id: "Config Estab Pesquisas", title: "Estabelecimento → Pesquisas de Satisfação", url: "/config?secao=cadastro-estabelecimentos&subsecao=atendimento&subsubsecao=pesquisas-satisfacao", icon: LucideIcons.Star },
      { id: "Config Estab QA", title: "Estabelecimento → Quality Assurance", url: "/config?secao=cadastro-estabelecimentos&subsecao=quality-assurance", icon: LucideIcons.ClipboardCheck },
      { id: "Config Estab Sentimento", title: "Estabelecimento → Análise de Sentimento", url: "/config?secao=cadastro-estabelecimentos&subsecao=analise-sentimento", icon: LucideIcons.Brain },
      { id: "Config Estab Base Conhecimento", title: "Estabelecimento → Base de Conhecimento", url: "/config?secao=cadastro-estabelecimentos&subsecao=base-conhecimento", icon: LucideIcons.BookOpen },
      { id: "Config Estab IA", title: "Estabelecimento → Configurações de IA", url: "/config?secao=cadastro-estabelecimentos&subsecao=configuracoes-ia", icon: LucideIcons.Brain },
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
    ]
  },
];
