import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, Zap, LifeBuoy, AppWindow, Shield, Sun, Moon,
  Bell, User as UserIcon, Monitor, Star, Settings, Users, FolderTree,
  ShieldCheck, Store, BellRing, Bot, Workflow, Webhook, CreditCard,
  Paintbrush, Send, FileText, Mail, ListOrdered, Clock, KeyRound,
  ChevronRight,
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
import cinemaBg from "@/assets/menu-real/cinema-bg.jpg";
import logoBranco from "@/assets/logo_branco.png";
import logoPreto from "@/assets/logo_preto.png";

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

import realDashboards from "@/assets/menu-real/dashboards.jpg";
import realClientes from "@/assets/menu-real/clientes.jpg";
import realAtendimento from "@/assets/menu-real/atendimento.jpg";
import realCampanhas from "@/assets/menu-real/campanhas.jpg";
import realVendas from "@/assets/menu-real/vendas.jpg";
import realAssistente from "@/assets/menu-real/assistente.jpg";
import realConteudos from "@/assets/menu-real/conteudos.jpg";
import realEmail from "@/assets/menu-real/email.jpg";
import realDesenho from "@/assets/menu-real/desenho.jpg";
import realRelatorios from "@/assets/menu-real/relatorios.jpg";
import realPonto from "@/assets/menu-real/ponto.jpg";
import realVeiculos from "@/assets/menu-real/veiculos.jpg";
import realVisitantes from "@/assets/menu-real/visitantes.jpg";
import realCameras from "@/assets/menu-real/cameras.jpg";
import realEditores from "@/assets/menu-real/editores.jpg";
import realLogistica from "@/assets/menu-real/logistica.jpg";
import realMarketplaces from "@/assets/menu-real/marketplaces.jpg";
import realEcommerce from "@/assets/menu-real/ecommerce.jpg";
import realAds from "@/assets/menu-real/ads.jpg";
import realRoboPrecos from "@/assets/menu-real/robo-precos.jpg";
import realTV from "@/assets/menu-real/tv.jpg";
import realMapaCalor from "@/assets/menu-real/mapa-calor.jpg";
import realConfiguracoes from "@/assets/menu-real/configuracoes.jpg";
import realAvisos from "@/assets/menu-real/avisos.jpg";
import realPerfil from "@/assets/menu-real/perfil.jpg";
import realCompartilharTela from "@/assets/menu-real/compartilhar-tela.jpg";
import realAtalhos from "@/assets/menu-real/atalhos.jpg";
import realAdmin from "@/assets/menu-real/admin.jpg";

const REAL_IMAGE_MAP: Record<string, string> = {
  Dashboards: realDashboards, Clientes: realClientes, Atendimento: realAtendimento,
  Campanhas: realCampanhas, Vendas: realVendas, Assistente: realAssistente,
  Conteúdos: realConteudos, Email: realEmail, Desenho: realDesenho,
  Relatórios: realRelatorios, "Controle de Ponto": realPonto,
  "Controle de Veículos": realVeiculos, "Controle de Visitantes": realVisitantes,
  Câmeras: realCameras, Editores: realEditores, Logística: realLogistica,
  Marketplaces: realMarketplaces, "E-commerce": realEcommerce, Ads: realAds,
  "Robô de Preços": realRoboPrecos, TV: realTV, "Mapa de Calor": realMapaCalor,
  Configurações: realConfiguracoes, Avisos: realAvisos, Perfil: realPerfil,
  "Compartilhar Tela": realCompartilharTela, "Gerenciar Atalhos": realAtalhos,
  Admin: realAdmin,
};

type MenuStyle = "icons" | "images" | "list" | "cinema";


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

  const [menuStyle, setMenuStyle] = useState<MenuStyle>(() => {
    return (localStorage.getItem("system_main_menu_layout") as MenuStyle)
      || (localStorage.getItem("menu-style") as MenuStyle)
      || "icons";
  });
  useEffect(() => {
    localStorage.setItem("system_main_menu_layout", menuStyle);
    document.documentElement.setAttribute("data-main-menu-layout", menuStyle);
  }, [menuStyle]);
  // Sincroniza quando alterado no Visual do Sistema (outra aba/rota)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "system_main_menu_layout" && e.newValue) {
        setMenuStyle(e.newValue as MenuStyle);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
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
    <div className="relative min-h-screen p-4 sm:p-6 lg:p-10 bg-background">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-center bg-cover"
        style={{ backgroundImage: `url(${cinemaBg})` }}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-background/90 via-background/70 to-background/95" aria-hidden />

      {!openItem && (
        <button
          onClick={toggleTheme}
          className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full bg-card/80 backdrop-blur border border-border flex items-center justify-center hover:bg-accent transition-colors"
          title={isDarkMode ? "Modo Claro" : "Modo Escuro"}
          aria-label="Alternar tema"
        >
          {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      )}

      <div className="max-w-6xl mx-auto pt-12 sm:pt-0">

        <div className="flex items-end justify-between gap-3 mb-8">
          <div className="flex items-end gap-3 min-w-0">
            {openItem ? (
              <button
                onClick={() => setOpenItem(null)}
                className="h-10 w-10 rounded-full bg-card/80 backdrop-blur border border-border flex items-center justify-center hover:bg-accent"
                aria-label="Voltar"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : null}
            {openItem ? (
              <h1 className="font-serif text-4xl sm:text-6xl font-normal leading-[1] tracking-[-0.02em] text-foreground">
                <span className="italic font-light">{title.split(" ")[0]}</span>
                {title.includes(" ") && (
                  <span className="italic font-medium text-primary"> {title.split(" ").slice(1).join(" ")}</span>
                )}
              </h1>
            ) : (
              <img
                src={isDarkMode ? logoBranco : logoPreto}
                alt="Logo"
                style={{ display: "block", height: "64px", width: "auto" }}
                className="object-contain"
              />
            )}

          </div>


          {!openItem && <AppsHealthIndicator small />}
        </div>


        {loadingAdmin && !openItem ? (
          <div className="text-sm text-muted-foreground mb-4">Carregando itens do menu...</div>
        ) : null}

        {menuStyle === "icons" ? (
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
        ) : menuStyle === "images" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const image = IMAGE_MAP[item.id] ?? IMAGE_MAP[item.title];
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleClick(item)}
                  className="group relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm hover:shadow-xl hover:-translate-y-0.5 hover:border-primary/60 transition-all text-left"
                >
                  <div className="relative h-36 w-full overflow-hidden bg-muted">
                    {image ? (
                      <img
                        src={image}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/20">
                        {Icon ? <Icon className="h-14 w-14 text-primary/60" /> : null}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 p-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {Icon ? <Icon className="h-5 w-5" /> : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-tight truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.subItems?.length ? `${item.subItems.length} itens` : "Abrir"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : menuStyle === "list" ? (
          <div className="flex flex-col gap-2">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleClick(item)}
                  className="group flex items-center gap-3 rounded-xl bg-card border border-border px-4 py-3 hover:border-primary/60 hover:bg-accent transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {Icon ? <Icon className="h-5 w-5" /> : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-tight truncate">{item.title}</p>
                    {item.subItems?.length ? (
                      <p className="text-xs text-muted-foreground">{item.subItems.length} itens</p>
                    ) : null}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2 -mx-4 sm:-mx-6 lg:-mx-10">
            {items.map((item) => {
              const image = REAL_IMAGE_MAP[item.id] ?? REAL_IMAGE_MAP[item.title];
              const Icon = item.icon;
              const count = item.subItems?.length;
              return (
                <button
                  key={item.id}
                  onClick={() => handleClick(item)}
                  className="group relative w-full h-28 sm:h-36 overflow-hidden text-left ring-1 ring-black/40 dark:ring-white/10"
                >
                  {image ? (
                    <img
                      src={image}
                      alt={item.title}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-[1200ms] ease-out"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-primary/70" />
                  )}
                  {/* Cinematic vignette + gradient (independent of theme) */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(0,0,0,0.75)_100%)]" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/45 to-black/70" />
                  {/* Letterbox bars */}
                  <div className="absolute inset-x-0 top-0 h-3 bg-black" />
                  <div className="absolute inset-x-0 bottom-0 h-3 bg-black" />

                  <div className="relative z-10 flex items-center justify-between h-full px-6 sm:px-10 py-4">
                    <div className="min-w-0">
                      <span className="block text-[9px] sm:text-[10px] tracking-[0.4em] text-white/70 uppercase mb-1">
                        MENU
                      </span>
                      <span className="font-serif italic text-white text-2xl sm:text-4xl font-normal tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] truncate block">
                        {item.title}
                      </span>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="h-px w-10 bg-primary" />
                        {count ? (
                          <span className="text-white/80 text-[10px] sm:text-xs tracking-[0.2em] uppercase">
                            {String(count).padStart(2, "0")} cenas
                          </span>
                        ) : (
                          <span className="text-white/80 text-[10px] sm:text-xs tracking-[0.2em] uppercase flex items-center gap-1">
                            {Icon ? <Icon className="h-3 w-3" /> : null}
                            Entrar em cena
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-white/80 group-hover:translate-x-1 group-hover:text-white transition-all drop-shadow-lg" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

