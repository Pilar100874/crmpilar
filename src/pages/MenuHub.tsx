import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, Zap, LifeBuoy, AppWindow, Shield, Sun, Moon,
  Bell, User as UserIcon, Monitor, Star, Settings, Users, FolderTree,
  ShieldCheck, Store, BellRing, Bot, Workflow, Webhook, CreditCard,
  Paintbrush, Send, FileText, Mail, ListOrdered, Clock, KeyRound,
  LayoutGrid, Image as ImageIcon, List, ChevronRight,
} from "lucide-react";
import { menuItems, type MenuItem } from "@/components/Layout";
import { isEstabelecimentoAdmin } from "@/lib/estabelecimentoUtils";
import { AppsHealthIndicator } from "@/components/AppsHealthIndicator";

import imgDashboards from "@/assets/menu/dashboards.jpg";
import imgFunil from "@/assets/menu/funil.jpg";
import imgChats from "@/assets/menu/chats.jpg";
import imgCalendario from "@/assets/menu/calendario.jpg";
import imgVendas from "@/assets/menu/vendas.jpg";
import imgAssistente from "@/assets/menu/assistente.jpg";
import imgListas from "@/assets/menu/listas.jpg";
import imgEmail from "@/assets/menu/email.jpg";
import imgMarketing from "@/assets/menu/marketing.jpg";
import imgRelatorios from "@/assets/menu/relatorios.jpg";
import imgPonto from "@/assets/menu/ponto.jpg";
import imgVeiculos from "@/assets/menu/veiculos.jpg";
import imgVisitantes from "@/assets/menu/visitantes.jpg";
import imgCameras from "@/assets/menu/cameras.jpg";
import imgEditores from "@/assets/menu/editores.jpg";
import imgLogistica from "@/assets/menu/logistica.jpg";
import imgMarketplaces from "@/assets/menu/marketplaces.jpg";
import imgEcommerce from "@/assets/menu/ecommerce.jpg";
import imgAds from "@/assets/menu/ads.jpg";
import imgRoboPrecos from "@/assets/menu/robo-precos.jpg";
import imgTV from "@/assets/menu/tv.jpg";
import imgMapaCalor from "@/assets/menu/mapa-calor.jpg";
import imgConfiguracoes from "@/assets/menu/configuracoes.jpg";
import imgAvisos from "@/assets/menu/avisos.jpg";
import imgPerfil from "@/assets/menu/perfil.jpg";
import imgCompartilharTela from "@/assets/menu/compartilhar-tela.jpg";
import imgAtalhos from "@/assets/menu/atalhos.jpg";
import imgAdmin from "@/assets/menu/admin.jpg";

const IMAGE_MAP: Record<string, string> = {
  Dashboards: imgDashboards, Clientes: imgFunil, Atendimento: imgChats,
  Campanhas: imgCalendario, Vendas: imgVendas, Assistente: imgAssistente,
  Conteúdos: imgListas, Email: imgEmail, Desenho: imgMarketing,
  Relatórios: imgRelatorios, "Controle de Ponto": imgPonto,
  "Controle de Veículos": imgVeiculos, "Controle de Visitantes": imgVisitantes,
  Câmeras: imgCameras, Editores: imgEditores, Logística: imgLogistica,
  Marketplaces: imgMarketplaces, "E-commerce": imgEcommerce, Ads: imgAds,
  "Robô de Preços": imgRoboPrecos, TV: imgTV, "Mapa de Calor": imgMapaCalor,
  Configurações: imgConfiguracoes, Avisos: imgAvisos, Perfil: imgPerfil,
  "Compartilhar Tela": imgCompartilharTela, "Gerenciar Atalhos": imgAtalhos,
  Admin: imgAdmin,
};

type MenuStyle = "icons" | "images" | "list";

const EXTRA_ITEMS: MenuItem[] = [
  { id: "Avisos", title: "Avisos", url: "/avisos", icon: Bell },
  { id: "Perfil", title: "Perfil", url: "/perfil", icon: UserIcon },
  { id: "Compartilhar Tela", title: "Compartilhar Tela", url: "/compartilhar-tela", icon: Monitor },
  { id: "Gerenciar Atalhos", title: "Gerenciar Atalhos", url: "/gerenciar-atalhos", icon: Star },
];

const ADMIN_ITEM: MenuItem = {
  id: "Admin",
  title: "Admin",
  icon: Shield,
  subItems: [
    { id: "Admin Apps", title: "Apps", url: "/admin/apps", icon: AppWindow },
    { id: "Admin Tickets", title: "Tickets de Suporte", url: "/admin/support-tickets", icon: LifeBuoy },
    { id: "Admin Macros", title: "Macros", url: "/macros", icon: Zap },
    { id: "Admin Config", title: "Configurações", url: "/config", icon: Settings },
    { id: "Admin Estabelecimentos", title: "Estabelecimentos", url: "/config?secao=cadastro-estabelecimentos", icon: Store },
    { id: "Admin Usuarios Acessos", title: "Usuários e Acessos", url: "/config?secao=cadastro-estabelecimentos&subsecao=usuarios-acessos", icon: Users },
    { id: "Admin Grupos Acesso", title: "Grupos de Acesso", url: "/config?secao=cadastro-estabelecimentos&subsecao=usuarios-acessos&subsubsecao=grupos-acesso", icon: FolderTree },
    { id: "Admin Cadastro Usuarios", title: "Cadastro de Usuários", url: "/config?secao=cadastro-estabelecimentos&subsecao=usuarios-acessos&subsubsecao=cadastro-usuarios", icon: UserIcon },
    { id: "Admin Cadastro Administradores", title: "Cadastro de Administradores", url: "/config?secao=cadastro-administradores", icon: ShieldCheck },
    { id: "Admin Notificacoes Sistema", title: "Notificações do Sistema", url: "/config?secao=notificacoes-sistema", icon: BellRing },
    { id: "Admin Recuperar Senha", title: "Recuperação de Senha", url: "/config?secao=recuperar-senha", icon: KeyRound },
    { id: "Admin Email Config", title: "Email Config", url: "/email-config", icon: Mail },
    { id: "Admin Push", title: "Notificações Push", url: "/config/push", icon: Send },
    { id: "Admin Visual Sistema", title: "Visual do Sistema", url: "/config/visual", icon: Paintbrush },
    { id: "Admin Variaveis", title: "Variáveis Globais", url: "/config/variaveis", icon: FileText },
    { id: "Admin Skills", title: "Skills de Atendimento", url: "/config/skills", icon: Bot },
    { id: "Admin SLA", title: "SLA", url: "/config/sla", icon: Clock },
    { id: "Admin Omnichannel", title: "Workflow Omnichannel", url: "/omnichannel-builder", icon: Workflow },
    { id: "Admin Webhooks", title: "Webhooks", url: "/config/webhooks", icon: Webhook },
    { id: "Admin Pagamentos", title: "Gateways de Pagamento", url: "/config/pagamentos", icon: CreditCard },
    { id: "Admin Atalhos", title: "Gerenciar Atalhos", url: "/gerenciar-atalhos", icon: Star },
    { id: "Admin Filas", title: "Filas de Atendimento", url: "/monitor-filas", icon: ListOrdered },
  ],
};

export default function MenuHub() {
  const navigate = useNavigate();
  const [openItem, setOpenItem] = useState<MenuItem | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode((v) => !v);

  useEffect(() => {
    let cancelled = false;
    isEstabelecimentoAdmin()
      .then((r) => { if (!cancelled) setIsAdmin(r); })
      .finally(() => { if (!cancelled) setLoadingAdmin(false); });
    return () => { cancelled = true; };
  }, []);

  const handleClick = (item: MenuItem) => {
    if (item.subItems && item.subItems.length) {
      setOpenItem(item);
      return;
    }
    if (item.url) navigate(item.url);
  };

  const rootItems: MenuItem[] = [
    ...menuItems,
    ...EXTRA_ITEMS,
    ...(isAdmin ? [ADMIN_ITEM] : []),
  ];
  const items = openItem?.subItems ?? rootItems;
  const title = openItem?.title ?? "Menu Principal";

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          {openItem ? (
            <button
              onClick={() => setOpenItem(null)}
              className="h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent"
              aria-label="Voltar"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}
          <h1 className="text-2xl sm:text-3xl font-bold flex-1">{title}</h1>
          <button
            onClick={toggleTheme}
            className="h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors"
            title={isDarkMode ? "Modo Claro" : "Modo Escuro"}
            aria-label="Alternar tema"
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-border bg-card px-3 py-2">
          <AppsHealthIndicator />
        </div>

        {loadingAdmin && !openItem ? (
          <div className="text-sm text-muted-foreground mb-4">Carregando itens do menu...</div>
        ) : null}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleClick(item)}
                className="group aspect-square flex flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-card to-muted border border-border shadow-sm hover:shadow-lg hover:border-primary/60 hover:-translate-y-0.5 transition-all p-4 text-center"
              >
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {Icon ? <Icon className="h-7 w-7 sm:h-8 sm:w-8" /> : null}
                </div>
                <span className="text-xs sm:text-sm font-medium leading-tight line-clamp-2">
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
