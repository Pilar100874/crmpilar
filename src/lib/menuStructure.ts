// Estrutura de menus exportada do Layout.tsx
// Este arquivo centraliza a estrutura de menus para ser reutilizada em outras partes do sistema

import * as LucideIcons from "lucide-react";

export interface SubMenuItem {
  id: string;
  title: string;
  url: string;
  icon: any;
  group?: string;
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
      { id: "Rastreamento Pedidos", title: "Rastreamento de Pedidos", url: "/pedido-tracking", icon: LucideIcons.Truck },
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
  {
    id: "Controle de Ponto",
    title: "Controle de Ponto",
    icon: LucideIcons.Clock,
    subItems: [
      { id: "Ponto Dashboard", title: "Dashboard RH", url: "/ponto", icon: LucideIcons.LayoutDashboard, group: "Geral" },
      
      { id: "Ponto Registro", title: "Registro via App", url: "/ponto/registro", icon: LucideIcons.Smartphone, group: "Operacional" },
      { id: "Ponto Portal", title: "Portal do Funcionário", url: "/ponto/portal", icon: LucideIcons.User, group: "Operacional" },
      { id: "Ponto Tratamento", title: "Tratamento", url: "/ponto/tratamento", icon: LucideIcons.Wrench, group: "Operacional" },
      { id: "Ponto Ajustes", title: "Ajustes", url: "/ponto/ajustes", icon: LucideIcons.FileEdit, group: "Operacional" },
      { id: "Ponto Espelho", title: "Espelho de Ponto", url: "/ponto/espelho", icon: LucideIcons.FileSignature, group: "Operacional" },
      { id: "Ponto Mapa", title: "Mapa de Equipes", url: "/ponto/mapa", icon: LucideIcons.MapPin, group: "Operacional" },
      { id: "Ponto QrCode", title: "QR Code Totem", url: "/ponto/qrcode", icon: LucideIcons.QrCode, group: "Operacional" },
      
      { id: "Ponto Pre Fechamento", title: "Pré-Fechamento (Checklist)", url: "/ponto/pre-fechamento", icon: LucideIcons.ClipboardCheck, group: "Fechamento & Banco" },
      { id: "Ponto Fechamento", title: "Fechamento de Folha", url: "/ponto/fechamento", icon: LucideIcons.Lock, group: "Fechamento & Banco" },
      { id: "Ponto Banco Horas", title: "Banco de Horas", url: "/ponto/banco-horas", icon: LucideIcons.PiggyBank, group: "Fechamento & Banco" },
      { id: "Ponto Férias", title: "Férias e Afastamentos", url: "/ponto/ferias", icon: LucideIcons.Palmtree, group: "Fechamento & Banco" },
      { id: "Ponto Atestados Admin", title: "Atestados (RH)", url: "/ponto/atestados-admin", icon: LucideIcons.Stethoscope, group: "Fechamento & Banco" },
      
      { id: "Ponto Alertas", title: "Antifraude (Alertas)", url: "/ponto/alertas", icon: LucideIcons.ShieldAlert, group: "Compliance & Auditoria" },
      { id: "Ponto Fora Geofence", title: "Fora da Área (GPS)", url: "/ponto/fora-geofence", icon: LucideIcons.MapPinOff, group: "Compliance & Auditoria" },
      { id: "Ponto Auditoria", title: "Auditoria", url: "/ponto/auditoria", icon: LucideIcons.ShieldCheck, group: "Compliance & Auditoria" },
      { id: "Ponto AFD", title: "Arquivos Legais (AFD/AEJ)", url: "/ponto/afd", icon: LucideIcons.FileText, group: "Compliance & Auditoria" },
      { id: "Ponto eSocial", title: "eSocial", url: "/ponto/esocial", icon: LucideIcons.Send, group: "Compliance & Auditoria" },
      
      { id: "Ponto Assistente", title: "Assistente RH (IA)", url: "/ponto/assistente", icon: LucideIcons.Sparkles, group: "Inteligência IA" },
      { id: "Ponto Predições", title: "Inteligência Preditiva", url: "/ponto/predicoes", icon: LucideIcons.TrendingUp, group: "Inteligência IA" },
      { id: "Ponto Simulador", title: "Simulador de Cenários", url: "/ponto/simulador", icon: LucideIcons.Calculator, group: "Inteligência IA" },
      
      { id: "Ponto Config", title: "Configurações", url: "/ponto/config", icon: LucideIcons.Settings, group: "Sistema & Ajuda" },
      { id: "Ponto Manual", title: "Manual de Uso", url: "/ponto/manual", icon: LucideIcons.BookOpen, group: "Sistema & Ajuda" },
    ],
  },
  { id: "Suporte Tickets", title: "Suporte / Tickets", url: "/admin/support-tickets", icon: LucideIcons.LifeBuoy },
  { id: "Logística", title: "Logística", url: "/logistica", icon: LucideIcons.Truck },
  { id: "Robô de Preços", title: "Robô de Preços", url: "/robo-precos", icon: LucideIcons.Bot },
  { id: "Ads", title: "Ads", url: "/ads", icon: LucideIcons.Megaphone },
  { id: "Marketplaces", title: "Marketplaces", url: "/marketplaces", icon: LucideIcons.Store },
  { 
    id: "Ecommerce",
    title: "E-commerce", 
    icon: LucideIcons.ShoppingBag,
    subItems: [
      { id: "Ecommerce Site", title: "Abrir Loja Virtual", url: "/ecommerce", icon: LucideIcons.ExternalLink },
      { id: "Ecommerce Regras", title: "Regras do E-commerce", url: "/ecommerce-rules", icon: LucideIcons.Workflow },
      { id: "Ecommerce Pagamentos", title: "Gateways de Pagamento", url: "/config/pagamentos", icon: LucideIcons.CreditCard },
      { id: "Ecommerce Rastreamento", title: "Rastreamento de Pedidos", url: "/pedido-tracking", icon: LucideIcons.Truck },
    ]
  },
  {
    id: "Admin",
    title: "Admin",
    icon: LucideIcons.ShieldCheck,
    subItems: [
      { id: "Admin Macros", title: "Macros", url: "/macros", icon: LucideIcons.Zap },
      { id: "Admin Support Tickets", title: "Tickets de Suporte", url: "/admin/support-tickets", icon: LucideIcons.LifeBuoy },
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
