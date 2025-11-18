import { ReactNode, useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import {
  Sidebar,
  SidebarContent,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  FileText,
  Settings,
  Workflow,
  Megaphone,
  LogOut,
  Globe,
  Building2,
  User as UserIcon,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Plus,
  TestTube2,
  FileBarChart,
  Target,
  Palette,
  Zap,
  Mail,
  Pin,
  PinOff,
  Phone,
  Video,
  Upload,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast-config";
import logo from "@/assets/logo_branco_sidebar.png";
import { EstabelecimentoSelector } from "@/components/EstabelecimentoSelector";
import { UsuarioSelector } from "@/components/UsuarioSelector";
import { IncomingCallNotification } from "@/components/softphone/IncomingCallNotification";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { LayoutContext } from "@/contexts/LayoutContext";

interface MenuPermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

interface SubMenuItem {
  id: string;
  title: string;
  url: string;
  icon: any;
}

interface MenuItem {
  id: string;
  title: string;
  url?: string;
  icon: any;
  subItems?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  { id: "Dashboard", title: "Painel", url: "/dashboard", icon: LayoutDashboard },
  { id: "Clientes", title: "Funil", url: "/funil", icon: Users },
  { id: "Atendimento", title: "Chats", url: "/atendimento", icon: MessageSquare },
  { id: "Campanhas", title: "Calendário", url: "/calendario", icon: Megaphone },
  { id: "Orçamentos", title: "Orçamentos", url: "/orcamentos", icon: FileBarChart },
  { 
    id: "Conteúdos",
    title: "Listas", 
    icon: FileText,
    subItems: [
      { id: "Contatos", title: "Contatos", url: "/contatos", icon: UserIcon },
      { id: "Empresas", title: "Empresas", url: "/empresas", icon: Building2 },
      { id: "Todos", title: "Todos", url: "/todos", icon: Users },
      { id: "Vínculos Empresas", title: "Vínculo Empresas X Usuário / Segmento", url: "/vinculos-empresas", icon: Building2 },
      { id: "Vínculos Contatos", title: "Vínculo Contatos X Usuário / Segmento", url: "/vinculos-contatos", icon: UserIcon },
    ]
  },
  { 
    id: "Email",
    title: "E-mail", 
    icon: Mail,
    subItems: [
      { id: "Caixa de Entrada", title: "Caixa de Entrada", url: "/email/inbox", icon: MessageSquare },
      { id: "Enviados", title: "Enviados", url: "/email/sent", icon: MessageSquare },
      { id: "Arquivados", title: "Arquivados", url: "/email/archive", icon: MessageSquare },
      { id: "Lixeira", title: "Lixeira", url: "/email/trash", icon: MessageSquare },
    ]
  },
  { 
    id: "Bot Test", 
    title: "Bot", 
    icon: Workflow,
    subItems: [
      { id: "Criar Bot", title: "Criar / Editar", url: "/bot-create", icon: Plus },
      { id: "Testar", title: "Testar", url: "/bot-test", icon: TestTube2 },
    ]
  },
  { 
    id: "Desenho", 
    title: "Marketing", 
    icon: Target,
    subItems: [
      { id: "Canvas", title: "Canvas", url: "/marketing/canvas", icon: Palette },
      { id: "Automações", title: "Automações", url: "/marketing/automacoes", icon: Zap },
      { id: "Campanhas Marketing", title: "Campanhas", url: "/marketing/campanhas", icon: Megaphone },
    ]
  },
  { id: "Relatórios", title: "Relatórios", url: "/relatorios", icon: FileText },
  { id: "Importação Produtos", title: "Importação de Produtos de Terceiro", url: "/importacao-produtos", icon: Upload },
  { id: "Softphone", title: "Softphone", url: "/softphone", icon: Phone },
  { id: "Videochamada", title: "Videochamada", url: "/videocall", icon: Video },
  { 
    id: "Configurações",
    title: "Configurações", 
    icon: Settings,
    subItems: [
      { id: "Config Geral", title: "Configurações", url: "/config", icon: Settings },
      { id: "Teste de Webhooks", title: "Teste de Webhooks", url: "/config/webhooks", icon: Globe },
      { id: "Variáveis Globais", title: "Variáveis Globais", url: "/config/variaveis", icon: FileText },
      { id: "Teste Campanhas", title: "Teste Campanhas", url: "/config/campanhas", icon: Megaphone },
    ]
  },
];

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [allowedMenus, setAllowedMenus] = useState<Record<string, MenuPermissions>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showEstabelecimentoSelector, setShowEstabelecimentoSelector] = useState(false);
  const [showUsuarioSelector, setShowUsuarioSelector] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [estabelecimentoName, setEstabelecimentoName] = useState<string>("");
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [openSubmenuId, setOpenSubmenuId] = useState<string | null>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth <= 1024);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuLocked, setMenuLocked] = useState(false);
  const submenuPanelRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session && location.pathname !== "/") {
          navigate("/");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Verifica se é administrador pelo padrão de email (admin_*@sistema.local)
        const adminCheck = user.email?.startsWith("admin_") && user.email?.endsWith("@sistema.local");
        setIsAdmin(adminCheck);

        // Se for administrador, dá acesso total a todos os menus
        if (adminCheck) {
          const allMenus: Record<string, MenuPermissions> = {};
          menuItems.forEach(item => {
            allMenus[item.id] = { view: true, create: true, edit: true, delete: true };
          });
          setAllowedMenus(allMenus);
          setIsLoading(false);
          return;
        }

        // Se não é admin, busca o usuário e seu grupo de acesso
        const { data: usuario, error: userError } = await supabase
          .from("usuarios")
          .select("grupo_acesso_id")
          .ilike("email", user.email || "")
          .maybeSingle();

        // Se não encontrou usuário, bloqueia tudo
        if (!usuario) {
          setAllowedMenus({});
          setIsLoading(false);
          return;
        }

        // Se não tem grupo de acesso, permite todos os menus
        if (!usuario.grupo_acesso_id) {
          const allMenus: Record<string, MenuPermissions> = {};
          menuItems.forEach(item => {
            allMenus[item.id] = { view: true, create: true, edit: true, delete: true };
          });
          setAllowedMenus(allMenus);
          setIsLoading(false);
          return;
        }

        // Busca as permissões do grupo
        const { data: grupo, error: groupError } = await supabase
          .from("grupos_acesso")
          .select("menus_permitidos")
          .eq("id", usuario.grupo_acesso_id)
          .single();

        if (groupError) throw groupError;

        setAllowedMenus((grupo?.menus_permitidos as unknown as Record<string, MenuPermissions>) || {});
      } catch (error) {
        console.error("Erro ao buscar permissões:", error);
        toast.error("Erro ao carregar permissões do usuário");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserPermissions();
  }, [user]);

  useEffect(() => {
    const fetchUserAndEstabelecimento = async () => {
      if (!user) return;

      try {
        // Buscar nome do usuário
        if (isAdmin) {
          const { data: adminData } = await supabase
            .from("administradores")
            .select("nome")
            .eq("id", user.id)
            .maybeSingle();
          
          setUserName(adminData?.nome || "Administrador");
        } else {
          const { data: userData } = await supabase
            .from("usuarios")
            .select("nome")
            .ilike("email", user.email || "")
            .maybeSingle();
          
          setUserName(userData?.nome || user.email?.split("@")[0] || "Usuário");
        }

        // Buscar nome do estabelecimento
        const estabId = await getEstabelecimentoId();
        if (estabId) {
          setEstabelecimentoId(estabId);
          const { data: estabData } = await supabase
            .from("estabelecimentos")
            .select("nome")
            .eq("id", estabId)
            .maybeSingle();
          
          setEstabelecimentoName(estabData?.nome || "");
        }
      } catch (error) {
        console.error("Erro ao buscar dados do usuário/estabelecimento:", error);
      }
    };

    fetchUserAndEstabelecimento();
  }, [user, isAdmin]);

  // Close any open submenu whenever the route changes or on any click outside
  useEffect(() => {
    setOpenSubmenuId(null);
  }, [location.pathname]);

  // Force close submenus on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenSubmenuId(null);
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  // Detecta mudanças no tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      const smallScreen = window.innerWidth <= 1024;
      setIsSmallScreen(smallScreen);
      
      if (smallScreen) {
        // Em telas pequenas, mantém menu visível mas encolhido e destravado
        setMenuLocked(false);
        setMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMenuMouseEnter = () => {
    if (menuLocked) return; // Não abre automaticamente se travado
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
      menuTimeoutRef.current = null;
    }
    setMenuOpen(true);
  };

  const handleMenuMouseLeave = () => {
    if (menuLocked) return; // Não fecha automaticamente se travado
    menuTimeoutRef.current = setTimeout(() => {
      setMenuOpen(false);
      setOpenSubmenuId(null);
    }, 300);
  };

  const handleToggleLock = () => {
    setMenuLocked(!menuLocked);
    if (!menuLocked) {
      setMenuOpen(true); // Abre ao travar
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/");
  };

  if (!user || isLoading) {
    return null;
  }

  // Filtra os menus baseado nas permissões
  const visibleMenus = menuItems.filter(item => {
    const permission = allowedMenus[item.id];
    
    // Se o menu tem subitems, verifica se pelo menos um tem permissão
    if (item.subItems) {
      const hasSubItemPermission = item.subItems.some(subItem => {
        const subPermission = allowedMenus[subItem.id];
        return subPermission?.view === true;
      });
      return permission?.view === true || hasSubItemPermission;
    }
    
    return permission?.view === true;
  }).map(item => {
    // Não filtra subitens por permissão para garantir visibilidade do submenu
    if (item.subItems) {
      return item;
    }
    return item;
  });

  return (
    <LayoutContext.Provider value={{ openSubmenu: setOpenSubmenuId }}>
        <div className="min-h-screen flex w-full bg-background relative">
        {sidebarVisible && (
        <div 
          ref={sidebarRef} 
          className={`${
            menuLocked 
              ? 'fixed left-0 top-0 bottom-0 w-16 md:w-20 lg:w-16 z-30' 
              : `slide-out-menu ${menuOpen ? 'open' : ''}`
          } border-r border-sidebar-border bg-sidebar flex-shrink-0 flex flex-col`}
          onMouseEnter={handleMenuMouseEnter}
          onMouseLeave={handleMenuMouseLeave}
        >
          {/* Aba lateral - só aparece quando não está travado */}
          {!menuLocked && (
            <div className="slide-out-menu-tab">
              <ChevronRight className="w-3 h-3" />
            </div>
          )}

          {/* Logo no topo */}
          <div className="flex items-center justify-center py-3 md:py-4 border-b border-sidebar-border/50">
            <button
              onClick={() => isAdmin && setShowEstabelecimentoSelector(true)}
              className="w-10 h-10 md:w-12 md:h-12 lg:w-10 lg:h-10 rounded-lg bg-sidebar-accent/80 flex items-center justify-center hover:bg-sidebar-accent transition-colors"
              title={estabelecimentoName || "Logo"}
            >
              <Building2 className="w-5 h-5 md:w-6 md:h-6 lg:w-5 lg:h-5 text-sidebar-foreground/90" />
            </button>
          </div>

          <ScrollArea className="flex-1 bg-sidebar">
            <div className={`py-2 flex flex-col gap-1 ${menuLocked ? 'items-center' : 'px-4'}`}>
              {visibleMenus.map((item) => {
                if (item.subItems && item.subItems.length > 0) {
                  const isSubItemActive = item.subItems.some(sub => location.pathname === sub.url);
                  const isMenuOpen = openSubmenuId === item.id;
                  const shouldHighlight = isSubItemActive;
                  
                  // Estilo travado (ícones apenas)
                  if (menuLocked) {
                    return (
                      <div key={item.id} className="relative w-full flex justify-center">
                        <button
                          type="button"
                          onClick={() => setOpenSubmenuId(isMenuOpen ? null : item.id)}
                          className={`w-12 h-12 flex items-center justify-center rounded-lg transition-all ${
                            shouldHighlight
                              ? "bg-sidebar-primary text-sidebar-primary-foreground"
                              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                          }`}
                          title={item.title}
                        >
                          <item.icon className="w-6 h-6" />
                        </button>
                        
                        {isMenuOpen && (
                          <div ref={submenuPanelRef} onClick={(e) => e.stopPropagation()} className="fixed left-16 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border shadow-lg z-50 overflow-y-auto">
                            <div className="px-4 py-6">
                              <h3 className="text-sm font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-4 px-2">
                                {item.title}
                              </h3>
                              
                              <div className="space-y-1">
                                {item.subItems.map((subItem) => (
                                  <NavLink
                                    key={subItem.id}
                                    to={subItem.url}
                                    onClick={() => setOpenSubmenuId(null)}
                                    className={({ isActive }) =>
                                      `flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                                        isActive
                                          ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                                      }`
                                    }
                                  >
                                    <subItem.icon className="w-4 h-4 flex-shrink-0" />
                                    <span className="text-sm">{subItem.title}</span>
                                  </NavLink>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  
                  // Estilo destravado (slide-out com texto)
                  return (
                    <div key={item.id} className="relative w-full">
                      <button
                        type="button"
                        onClick={() => setOpenSubmenuId(isMenuOpen ? null : item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                          shouldHighlight
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        }`}
                        title={item.title}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-medium flex-1 text-left">{item.title}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {isMenuOpen && (
                        <div className="mt-1 ml-8 space-y-1">
                          {item.subItems.map((subItem) => (
                            <NavLink
                              key={subItem.id}
                              to={subItem.url}
                              onClick={() => setOpenSubmenuId(null)}
                              className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                                  isActive
                                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                                }`
                              }
                            >
                              <subItem.icon className="w-4 h-4 flex-shrink-0" />
                              <span className="text-sm">{subItem.title}</span>
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                
                // Menu normal sem submenu
                if (menuLocked) {
                  return (
                    <NavLink
                      key={item.title}
                      to={item.url!}
                      className={({ isActive }) =>
                        `w-12 h-12 flex items-center justify-center rounded-lg transition-all ${
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        }`
                      }
                      title={item.title}
                    >
                      <item.icon className="w-6 h-6" />
                    </NavLink>
                  );
                }
                
                return (
                  <NavLink
                    key={item.title}
                    to={item.url!}
                    className={({ isActive }) =>
                      `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                      }`
                    }
                    title={item.title}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.title}</span>
                  </NavLink>
                );
              })}
            </div>
          </ScrollArea>

          {/* Ícones no rodapé */}
          <div className={`border-t border-sidebar-border/50 bg-sidebar py-3 flex flex-col gap-2 ${menuLocked ? 'items-center' : 'px-4'}`}>
            {/* Botão de travar/destravar - só aparece em telas maiores que 1024px */}
            {!isSmallScreen && (
              <button
                onClick={handleToggleLock}
                className={`${
                  menuLocked 
                    ? 'w-10 h-10 rounded-lg flex items-center justify-center' 
                    : 'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg'
                } text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all`}
                title={menuLocked ? "Destravar menu" : "Travar menu"}
              >
                {menuLocked ? (
                  <Pin className="w-5 h-5" />
                ) : (
                  <>
                    <PinOff className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">Travar Menu</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => setShowUsuarioSelector(true)}
              className={`${
                menuLocked 
                  ? 'w-10 h-10 rounded-full flex items-center justify-center' 
                  : 'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg'
              } bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors`}
              title={userName || "Usuário"}
            >
              <UserIcon className="w-5 h-5 text-sidebar-foreground/70 flex-shrink-0" />
              {!menuLocked && <span className="text-sm font-medium text-sidebar-foreground/70 truncate">{userName || "Usuário"}</span>}
            </button>
            
            <button 
              onClick={handleLogout}
              className={`${
                menuLocked 
                  ? 'w-10 h-10 rounded-lg flex items-center justify-center' 
                  : 'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg'
              } text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all`}
              title="Sair"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {!menuLocked && <span className="text-sm font-medium">Sair</span>}
            </button>
          </div>
        </div>
        )}

        <main className={`flex-1 flex flex-col bg-background min-w-0 ${menuLocked ? 'ml-16 md:ml-20 lg:ml-16' : ''}`}>
          {!sidebarVisible && (
            <div className="fixed left-0 top-0 z-30 p-1 sm:p-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSidebarVisible(true)}
                className="rounded-full bg-sidebar/95 backdrop-blur-sm border-sidebar-border hover:bg-sidebar h-5 w-5 sm:h-6 sm:w-6 p-0"
              >
                <ChevronRight className="w-2 h-2 sm:w-3 sm:h-3" />
              </Button>
            </div>
          )}
          <div className="flex-1 overflow-hidden bg-background">
            {children}
          </div>
        </main>
      </div>

      <EstabelecimentoSelector
        open={showEstabelecimentoSelector}
        onSelectEstabelecimento={(estabelecimentoId) => {
          setShowEstabelecimentoSelector(false);
          window.location.reload(); // Recarrega a página para aplicar o novo estabelecimento
        }}
        onClose={() => setShowEstabelecimentoSelector(false)}
      />

      <UsuarioSelector
        open={showUsuarioSelector}
        onClose={() => setShowUsuarioSelector(false)}
        estabelecimentoId={estabelecimentoId}
      />

      <IncomingCallNotification />
    </LayoutContext.Provider>
  );
}
