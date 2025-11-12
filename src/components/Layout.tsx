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
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast-config";
import logo from "@/assets/logo_branco_sidebar.png";
import { EstabelecimentoSelector } from "@/components/EstabelecimentoSelector";
import { UsuarioSelector } from "@/components/UsuarioSelector";
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
    ]
  },
  { 
    id: "Email",
    title: "E-mail", 
    icon: Workflow,
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
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const submenuPanelRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
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

  // Close submenu when clicking outside the panel
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (!openSubmenuId) return;
      const target = e.target as Node;
      const insideSubmenu = submenuPanelRef.current?.contains(target);
      const insideSidebar = sidebarRef.current?.contains(target);
      if (!insideSubmenu && !insideSidebar) {
        setOpenSubmenuId(null);
      }
    };

    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, [openSubmenuId]);

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
        <div ref={sidebarRef} className={`fixed left-0 top-0 bottom-0 border-r border-sidebar-border bg-sidebar flex-shrink-0 flex flex-col z-30 transition-all duration-300 ${sidebarExpanded ? 'w-64' : 'w-20'}`}>
          {/* Logo e Toggle no topo */}
          <div className="flex flex-col items-center py-4 border-b border-sidebar-border relative">
            <div className="w-full flex items-center justify-center px-2 mb-3 relative">
              <img 
                src={logo} 
                alt="Pilar Logo" 
                className={`object-contain transition-all duration-300 ${sidebarExpanded ? 'h-10' : 'h-8'}`}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSidebarExpanded(!sidebarExpanded)}
                className="absolute right-2 h-7 w-7 p-0 hover:bg-sidebar-accent/50 rounded-full"
                title={sidebarExpanded ? "Encolher menu" : "Expandir menu"}
              >
                {sidebarExpanded ? (
                  <ChevronLeft className="w-4 h-4 text-sidebar-foreground/60" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-sidebar-foreground/60" />
                )}
              </Button>
            </div>
            {/* Informações do usuário e estabelecimento */}
            <div className="w-full px-2 space-y-2">
              {/* Empresa */}
              {isAdmin ? (
                <button
                  onClick={() => setShowEstabelecimentoSelector(true)}
                  className={`flex items-center w-full hover:bg-sidebar-accent/50 rounded-md p-2 transition-colors cursor-pointer ${sidebarExpanded ? 'justify-start gap-3' : 'flex-col justify-center gap-1'}`}
                >
                  <Building2 className={`text-sidebar-foreground/60 flex-shrink-0 ${sidebarExpanded ? 'w-5 h-5' : 'w-4 h-4'}`} />
                  <span className={`text-sidebar-foreground/80 font-medium transition-all ${sidebarExpanded ? 'text-sm text-left' : 'text-[9px] text-center leading-tight line-clamp-2'}`}>
                    {estabelecimentoName || "Selecionar"}
                  </span>
                </button>
              ) : (
                <div className={`flex items-center ${sidebarExpanded ? 'justify-start gap-3 p-2' : 'flex-col justify-center gap-1 p-2'}`}>
                  <Building2 className={`text-sidebar-foreground/60 flex-shrink-0 ${sidebarExpanded ? 'w-5 h-5' : 'w-4 h-4'}`} />
                  <span className={`text-sidebar-foreground/80 font-medium transition-all ${sidebarExpanded ? 'text-sm text-left' : 'text-[9px] text-center leading-tight line-clamp-2'}`}>
                    {estabelecimentoName || "Empresa"}
                  </span>
                </div>
              )}

              {/* Usuário */}
              <button
                onClick={() => setShowUsuarioSelector(true)}
                className={`flex items-center w-full hover:bg-sidebar-accent/50 rounded-md p-2 transition-colors cursor-pointer ${sidebarExpanded ? 'justify-start gap-3' : 'flex-col justify-center gap-1'}`}
              >
                <UserIcon className={`text-sidebar-foreground/60 flex-shrink-0 ${sidebarExpanded ? 'w-5 h-5' : 'w-4 h-4'}`} />
                <span className={`text-sidebar-foreground/70 transition-all ${sidebarExpanded ? 'text-sm text-left' : 'text-[9px] text-center leading-tight line-clamp-1'}`}>
                  {userName || user?.email?.split("@")[0] || "Usuário"}
                </span>
              </button>
            </div>
          </div>

          <ScrollArea className="flex-1 bg-sidebar">
            <div className="py-2 px-2">
              {visibleMenus.map((item) => {
                if (item.subItems && item.subItems.length > 0) {
                  const isSubItemActive = item.subItems.some(sub => location.pathname === sub.url);
                  const isMenuOpen = openSubmenuId === item.id;
                  const shouldHighlight = (isSubItemActive || isMenuOpen) && openSubmenuId === item.id;
                  
                  return (
                    <div key={item.id} className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenSubmenuId(isMenuOpen ? null : item.id)}
                        className={`w-full flex items-center gap-3 py-3 px-3 group relative rounded-md transition-all ${
                          sidebarExpanded ? 'justify-start' : 'flex-col justify-center gap-1'
                        } ${
                          shouldHighlight
                            ? "bg-sidebar-accent text-primary"
                            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        }`}
                      >
                        {shouldHighlight && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                        )}
                        <item.icon className={`flex-shrink-0 ${sidebarExpanded ? 'w-5 h-5' : 'w-6 h-6'} ${
                          shouldHighlight ? "text-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                        }`} />
                        {sidebarExpanded ? (
                          <span className={`text-sm font-medium flex-1 text-left ${
                            shouldHighlight ? "text-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                          }`}>
                            {item.title}
                          </span>
                        ) : (
                          <span className={`text-[10px] font-medium text-center leading-tight ${
                            shouldHighlight ? "text-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                          }`}>
                            {item.title}
                          </span>
                        )}
                      </button>
                      
                      {isMenuOpen && (
                        <>
                          {/* Submenu panel */}
                          <div ref={submenuPanelRef} onClick={(e) => e.stopPropagation()} className={`fixed top-0 bottom-0 w-72 bg-gray-50 border-r border-border/30 shadow-sm z-50 overflow-y-auto transition-all duration-300 ${sidebarExpanded ? 'left-64' : 'left-20'}`}>
                            <div className="px-6 py-8">
                              <h3 className="text-lg font-bold text-foreground mb-4">
                                {item.title}
                              </h3>
                              <div className="border-t border-border/90 mb-6" />
                              
                              <div className="space-y-0">
                                {item.subItems.map((subItem, index) => (
                                  <div key={subItem.id}>
                                    {index > 0 && (
                                      <div className="border-t border-border/60" />
                                    )}
                                    <NavLink
                                      to={subItem.url}
                                      onClick={() => setOpenSubmenuId(null)}
                                      className={({ isActive }) =>
                                        `flex items-center gap-2 py-4 group ${
                                          isActive
                                            ? "text-foreground"
                                            : "text-foreground/70 hover:text-foreground"
                                        }`
                                      }
                                    >
                                      <span className="text-sm font-medium flex-1">{subItem.title}</span>
                                      {location.pathname === subItem.url && (
                                        <ChevronRight className="w-3 h-3 text-muted-foreground opacity-40 flex-shrink-0" />
                                      )}
                                    </NavLink>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                }
                
                // Menu normal sem submenu
                return (
                  <NavLink
                    key={item.title}
                    to={item.url!}
                    className={({ isActive }) => {
                      const shouldHighlight = isActive;
                      return `flex items-center gap-3 py-3 px-3 group relative rounded-md transition-all ${
                        sidebarExpanded ? 'justify-start' : 'flex-col justify-center gap-1'
                      } ${
                        shouldHighlight
                          ? "bg-sidebar-accent text-primary"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                      }`;
                    }}
                  >
                    {({ isActive }) => {
                      const shouldHighlight = isActive;
                      return (
                        <>
                          {shouldHighlight && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                          )}
                          <item.icon className={`flex-shrink-0 ${sidebarExpanded ? 'w-5 h-5' : 'w-6 h-6'} ${
                            shouldHighlight ? "text-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                          }`} />
                          {sidebarExpanded ? (
                            <span className={`text-sm font-medium flex-1 text-left ${
                              shouldHighlight ? "text-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                            }`}>
                              {item.title}
                            </span>
                          ) : (
                            <span className={`text-[10px] font-medium text-center leading-tight ${
                              shouldHighlight ? "text-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                            }`}>
                              {item.title}
                            </span>
                          )}
                        </>
                      );
                    }}
                  </NavLink>
                );
              })}
            </div>
          </ScrollArea>

          {/* Botão de sair no final */}
          <div className="border-t border-sidebar-border bg-sidebar px-2 py-2">
            <button 
              onClick={handleLogout}
              className={`relative flex items-center w-full py-3 px-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all rounded-md ${sidebarExpanded ? 'justify-start gap-3' : 'flex-col justify-center gap-1'}`}
            >
              <LogOut className={`flex-shrink-0 ${sidebarExpanded ? 'w-5 h-5' : 'w-6 h-6'}`} />
              <span className={`font-medium ${sidebarExpanded ? 'text-sm' : 'text-[10px]'}`}>Sair</span>
            </button>
          </div>
        </div>
        )}

        <main className={`flex-1 flex flex-col bg-background min-w-0 transition-all duration-300 ${sidebarVisible ? (sidebarExpanded ? 'ml-64' : 'ml-20') : 'ml-0'}`}>
          {!sidebarVisible && (
            <div className="fixed left-0 top-0 z-30 p-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSidebarVisible(true)}
                className="rounded-full bg-sidebar/95 backdrop-blur-sm border-sidebar-border hover:bg-sidebar"
              >
                <ChevronRight className="w-4 h-4" />
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
    </LayoutContext.Provider>
  );
}
