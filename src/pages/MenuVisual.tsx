import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Sun, Moon, Heart, Shield } from "lucide-react";
import { menuItems, type MenuItem } from "@/components/Layout";
import { isEstabelecimentoAdmin } from "@/lib/estabelecimentoUtils";
import { AppsHealthIndicator } from "@/components/AppsHealthIndicator";

// Import all generated images
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
  Dashboards: imgDashboards,
  Clientes: imgFunil,
  Atendimento: imgChats,
  Campanhas: imgCalendario,
  Vendas: imgVendas,
  Assistente: imgAssistente,
  Conteúdos: imgListas,
  Email: imgEmail,
  Desenho: imgMarketing,
  Relatórios: imgRelatorios,
  "Controle de Ponto": imgPonto,
  "Controle de Veículos": imgVeiculos,
  "Controle de Visitantes": imgVisitantes,
  Câmeras: imgCameras,
  Editores: imgEditores,
  Logística: imgLogistica,
  Marketplaces: imgMarketplaces,
  "E-commerce": imgEcommerce,
  Ads: imgAds,
  "Robô de Preços": imgRoboPrecos,
  TV: imgTV,
  "Mapa de Calor": imgMapaCalor,
  Configurações: imgConfiguracoes,
  Avisos: imgAvisos,
  Perfil: imgPerfil,
  "Compartilhar Tela": imgCompartilharTela,
  "Gerenciar Atalhos": imgAtalhos,
  Admin: imgAdmin,
};

const EXTRA_ITEMS: MenuItem[] = [
  { id: "Avisos", title: "Avisos", url: "/avisos", icon: Heart },
  { id: "Perfil", title: "Perfil", url: "/perfil", icon: Heart },
  { id: "Compartilhar Tela", title: "Compartilhar Tela", url: "/compartilhar-tela", icon: Heart },
  { id: "Gerenciar Atalhos", title: "Gerenciar Atalhos", url: "/gerenciar-atalhos", icon: Heart },
];

export default function MenuVisual() {
  const navigate = useNavigate();
  const [openItem, setOpenItem] = useState<MenuItem | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
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

  useEffect(() => {
    let cancelled = false;
    isEstabelecimentoAdmin().then((r) => {
      if (!cancelled) setIsAdmin(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const ADMIN_ITEM: MenuItem = {
    id: "Admin",
    title: "Admin",
    icon: Shield,
    subItems: [
      { id: "Admin Config", title: "Configurações", url: "/config", icon: Shield },
      { id: "Admin Apps", title: "Apps", url: "/admin/apps", icon: Shield },
      { id: "Admin Tickets", title: "Tickets de Suporte", url: "/admin/support-tickets", icon: Shield },
      { id: "Admin Macros", title: "Macros", url: "/macros", icon: Shield },
      { id: "Admin Email Config", title: "Email Config", url: "/email-config", icon: Shield },
      { id: "Admin Push", title: "Notificações Push", url: "/config/push", icon: Shield },
      { id: "Admin Visual", title: "Visual do Sistema", url: "/config/visual", icon: Shield },
      { id: "Admin Variaveis", title: "Variáveis Globais", url: "/config/variaveis", icon: Shield },
      { id: "Admin Skills", title: "Skills", url: "/config/skills", icon: Shield },
      { id: "Admin SLA", title: "SLA", url: "/config/sla", icon: Shield },
      { id: "Admin Omnichannel", title: "Omnichannel", url: "/omnichannel-builder", icon: Shield },
      { id: "Admin Webhooks", title: "Webhooks", url: "/config/webhooks", icon: Shield },
      { id: "Admin Pagamentos", title: "Pagamentos", url: "/config/pagamentos", icon: Shield },
      { id: "Admin Filas", title: "Filas", url: "/monitor-filas", icon: Shield },
    ],
  };

  const handleClick = (item: MenuItem) => {
    if (item.subItems?.length) {
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          {openItem ? (
            <button
              onClick={() => setOpenItem(null)}
              className="h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent"
              aria-label="Voltar"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">Selecione um módulo para começar</p>
          </div>
          <button
            onClick={() => setIsDarkMode((v) => !v)}
            className="h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors"
            aria-label="Alternar tema"
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-border bg-card px-3 py-2">
          <AppsHealthIndicator />
        </div>

        {/* Cards list – image + text style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => {
            const image = IMAGE_MAP[item.id] ?? IMAGE_MAP[item.title];
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleClick(item)}
                className="group relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm hover:shadow-xl hover:-translate-y-0.5 hover:border-primary/60 transition-all text-left"
              >
                {/* Image area */}
                <div className="relative h-40 sm:h-44 w-full overflow-hidden bg-muted">
                  {image ? (
                    <img
                      src={image}
                      alt={item.title}
                      loading="lazy"
                      width={1024}
                      height={1024}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/20">
                      {Icon ? <Icon className="h-16 w-16 text-primary/60" /> : null}
                    </div>
                  )}
                </div>

                {/* Text row */}
                <div className="flex items-center gap-3 p-4">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {Icon ? <Icon className="h-6 w-6" /> : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base leading-tight truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.subItems?.length
                        ? `${item.subItems.length} itens`
                        : item.url ?? "Abrir"}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
