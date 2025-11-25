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
  Activity,
  Star,
  KeyRound,
  Building,
  Clock,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast-config";
import logo from "@/assets/logo_branco_sidebar.png";
import { EstabelecimentoSelector } from "@/components/EstabelecimentoSelector";
import { UsuarioSelector } from "@/components/UsuarioSelector";
import { IncomingCallNotification } from "@/components/softphone/IncomingCallNotification";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { MENUS_DISPONIVEIS } from "@/lib/menus";
import { LayoutContext } from "@/contexts/LayoutContext";
import { useAtalhos } from "@/hooks/useAtalhos";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import * as LucideIcons from "lucide-react";

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
  { 
    id: "Dashboards",
    title: "Dashboards", 
    icon: LayoutDashboard,
    subItems: [
      { id: "Dashboard Atendente", title: "Dashboard Atendente", url: "/dashboard-atendente", icon: Users },
      { id: "Dashboard Supervisor", title: "Dashboard Supervisor", url: "/dashboard-supervisor", icon: LayoutDashboard },
      { id: "SLA Dashboard", title: "Dashboard SLA", url: "/sla-dashboard", icon: Activity },
      { id: "Analytics Dashboard", title: "Analytics Avançado", url: "/advanced-analytics", icon: FileBarChart },
    ]
  },
  { id: "Clientes", title: "Funil", url: "/funil", icon: Users },
  { 
    id: "Atendimento",
    title: "Chats", 
    icon: MessageSquare,
    subItems: [
      { id: "Painel Chats", title: "Painel", url: "/atendimento", icon: MessageSquare },
      { id: "Monitor de Filas", title: "Monitor de Filas", url: "/monitor-filas", icon: Activity },
      { id: "CSAT/NPS", title: "Pesquisas de Satisfação", url: "/pesquisas-satisfacao", icon: Star },
      { id: "Teste Roteamento", title: "Teste de Roteamento", url: "/test-roteamento", icon: TestTube2 },
    ]
  },
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
  { 
    id: "Telefonia",
    title: "Telefonia", 
    icon: Phone,
    subItems: [
      { id: "Softphone", title: "Softphone", url: "/softphone", icon: Phone },
      { id: "Videochamada", title: "Videochamada", url: "/videocall", icon: Video },
    ]
  },
  { id: "Trocar Usuário", title: "Trocar Usuário", url: "/perfil", icon: UserIcon },
  { 
    id: "Configurações",
    title: "Configurações",
    icon: Settings,
    subItems: [
      { id: "Config Filas", title: "Filas de Atendimento", url: "/config/filas", icon: Users },
      { id: "Config Skills", title: "Skills de Atendimento", url: "/config/skills", icon: Users },
      { id: "Omnichannel Builder", title: "Workflow Builder Omnichannel", url: "/omnichannel-builder", icon: Workflow },
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
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [openNestedSubmenu, setOpenNestedSubmenu] = useState<string | null>(null);
  const submenuPanelRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { atalhos } = useAtalhos();
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
    let isMounted = true;
    
    const fetchUserPermissions = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      // Evita múltiplas chamadas para o mesmo usuário
      const cachedUserId = sessionStorage.getItem("cached_user_id");
      if (cachedUserId === user.id && Object.keys(allowedMenus).length > 0) {
        setIsLoading(false);
        return;
      }

      try {
        // Verifica se é administrador (tabela administradores)
        const storedUserType = localStorage.getItem("userType");
        const storedAdminId = localStorage.getItem("userId");

        const { data: adminData } = await supabase
          .from("administradores")
          .select("id")
          .eq("id", storedAdminId || user.id)
          .maybeSingle();

        if (!isMounted) return;

        // Se for administrador da tabela, dá acesso total a todos os menus
        if (adminData && storedUserType === "admin") {
          setIsAdmin(true);
          const allMenus: Record<string, MenuPermissions> = {};
          MENUS_DISPONIVEIS.forEach(menuId => {
            allMenus[menuId] = { view: true, create: true, edit: true, delete: true };
          });
          setAllowedMenus(allMenus);
          sessionStorage.setItem("cached_user_id", user.id);
          setIsLoading(false);
          return;
        }

        // Busca o usuário na tabela usuarios primeiro por auth_user_id, depois por email
        let usuario = null;
        
        // Tenta buscar por auth_user_id primeiro (mais confiável)
        const { data: usuarioByAuthId } = await supabase
          .from("usuarios")
          .select("id, grupo_acesso_id")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (!isMounted) return;

        if (usuarioByAuthId) {
          usuario = usuarioByAuthId;
        } else {
          // Se não encontrou, tenta por email
          const { data: usuarioByEmail } = await supabase
            .from("usuarios")
            .select("id, grupo_acesso_id")
            .eq("email", user.email || "")
            .maybeSingle();
          
          if (!isMounted) return;
          usuario = usuarioByEmail;
        }

        // Se não encontrou usuário, bloqueia tudo
        if (!usuario) {
          setAllowedMenus({});
          sessionStorage.setItem("cached_user_id", user.id);
          setIsLoading(false);
          return;
        }

        // Verifica se o usuário tem role admin na tabela user_roles
        const { data: userRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (!isMounted) return;

        // Se usuário tem role admin, dá acesso total sem precisar de grupo
        if (userRole) {
          const allMenus: Record<string, MenuPermissions> = {};
          MENUS_DISPONIVEIS.forEach(menuId => {
            allMenus[menuId] = { view: true, create: true, edit: true, delete: true };
          });
          setAllowedMenus(allMenus);
          sessionStorage.setItem("cached_user_id", user.id);
          setIsLoading(false);
          return;
        }

        // Se não tem grupo de acesso, permite todos os menus
        if (!usuario.grupo_acesso_id) {
          const allMenus: Record<string, MenuPermissions> = {};
          MENUS_DISPONIVEIS.forEach(menuId => {
            allMenus[menuId] = { view: true, create: true, edit: true, delete: true };
          });
          setAllowedMenus(allMenus);
          sessionStorage.setItem("cached_user_id", user.id);
          setIsLoading(false);
          return;
        }

        // Busca as permissões do grupo
        const { data: grupo, error: groupError } = await supabase
          .from("grupos_acesso")
          .select("menus_permitidos")
          .eq("id", usuario.grupo_acesso_id)
          .single();

        if (!isMounted) return;

        if (groupError) {
          console.error("Erro ao buscar grupo:", groupError);
          throw groupError;
        }

        const menusPermitidos = (grupo?.menus_permitidos as unknown as Record<string, MenuPermissions>) || {};
        setAllowedMenus(menusPermitidos);
        sessionStorage.setItem("cached_user_id", user.id);
      } catch (error) {
        if (!isMounted) return;
        console.error("Erro ao buscar permissões:", error);
        toast.error("Erro ao carregar permissões do usuário");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchUserPermissions();
    
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    const fetchUserAndEstabelecimento = async () => {
      if (!user) return;

      try {
        // Buscar nome do usuário
        if (isAdmin) {
          const storedAdminId = localStorage.getItem("userId");
          const { data: adminData } = await supabase
            .from("administradores")
            .select("nome")
            .eq("id", storedAdminId || user.id)
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
              onClick={() => setShowEstabelecimentoSelector(true)}
              className="w-10 h-10 md:w-12 md:h-12 lg:w-10 lg:h-10 rounded-lg bg-sidebar-accent/80 flex items-center justify-center hover:bg-sidebar-accent transition-colors cursor-pointer"
              title={estabelecimentoName || "Logo"}
            >
              <Building2 className="w-5 h-5 md:w-6 md:h-6 lg:w-5 lg:h-5 text-sidebar-foreground/90" />
            </button>
          </div>

          <ScrollArea className="flex-1 bg-sidebar">
            <div className={`py-2 flex flex-col gap-1 ${menuLocked ? 'items-center' : 'px-4'}`}>
              {/* Menu Atalhos com submenu */}
              <>
                {menuLocked ? (
                  <div className="relative w-full flex justify-center">
                    <button
                      type="button"
                      onClick={() => setOpenSubmenuId(openSubmenuId === "Atalhos" ? null : "Atalhos")}
                      className={`w-12 h-12 flex items-center justify-center rounded-lg transition-all ${
                        openSubmenuId === "Atalhos" || location.pathname === "/gerenciar-atalhos" || atalhos.some(a => a.path === location.pathname)
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                      }`}
                      title="Atalhos"
                    >
                      <Star className="w-6 h-6" />
                    </button>
                    
                    {openSubmenuId === "Atalhos" && (
                      <div ref={submenuPanelRef} onClick={(e) => e.stopPropagation()} className="fixed left-16 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border shadow-lg z-50 overflow-y-auto">
                        <div className="px-4 py-6">
                          <h3 className="text-sm font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-4 px-2">
                            Atalhos
                          </h3>
                          
                          <div className="space-y-1">
                            <NavLink
                              to="/gerenciar-atalhos"
                              onClick={() => setOpenSubmenuId(null)}
                              className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                                  isActive
                                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                                }`
                              }
                            >
                              <LucideIcons.Settings className="w-4 h-4 flex-shrink-0" />
                              <span className="text-sm">Gerenciar Atalhos</span>
                            </NavLink>
                            
                            {atalhos.length > 0 && (
                              <>
                                <div className="h-px bg-sidebar-border/50 my-2" />
                                {atalhos.map((atalho) => {
                                  const IconComponent = (LucideIcons as any)[atalho.icone] || Star;
                                  return (
                                    <NavLink
                                      key={atalho.id}
                                      to={atalho.path}
                                      onClick={() => setOpenSubmenuId(null)}
                                      className={({ isActive }) =>
                                        `flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                                          isActive
                                            ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                                            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                                        }`
                                      }
                                    >
                                      <IconComponent className="w-4 h-4 flex-shrink-0" />
                                      <span className="text-sm">{atalho.titulo}</span>
                                    </NavLink>
                                  );
                                })}
                              </>
                            )}
                            
                            {atalhos.length === 0 && (
                              <p className="text-xs text-sidebar-foreground/50 px-3 py-2">
                                Nenhum atalho adicionado ainda.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative w-full">
                    <button
                      type="button"
                      onClick={() => setOpenSubmenuId(openSubmenuId === "Atalhos" ? null : "Atalhos")}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                        openSubmenuId === "Atalhos" || location.pathname === "/gerenciar-atalhos" || atalhos.some(a => a.path === location.pathname)
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                      }`}
                      title="Atalhos"
                    >
                      <Star className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm font-medium flex-1 text-left">Atalhos</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${openSubmenuId === "Atalhos" ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {openSubmenuId === "Atalhos" && (
                      <div className="mt-1 ml-8 space-y-1">
                        <NavLink
                          to="/gerenciar-atalhos"
                          onClick={() => setOpenSubmenuId(null)}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                              isActive
                                ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                            }`
                          }
                        >
                          <LucideIcons.Settings className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm">Gerenciar Atalhos</span>
                        </NavLink>
                        
                        {atalhos.length > 0 && (
                          <>
                            <div className="h-px bg-sidebar-border/50 my-2" />
                            {atalhos.map((atalho) => {
                              const IconComponent = (LucideIcons as any)[atalho.icone] || Star;
                              return (
                                <NavLink
                                  key={atalho.id}
                                  to={atalho.path}
                                  onClick={() => setOpenSubmenuId(null)}
                                  className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                                      isActive
                                        ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                                        : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                                    }`
                                  }
                                >
                                  <IconComponent className="w-4 h-4 flex-shrink-0" />
                                  <span className="text-sm">{atalho.titulo}</span>
                                </NavLink>
                              );
                            })}
                          </>
                        )}
                        
                        {atalhos.length === 0 && (
                          <p className="text-xs text-sidebar-foreground/50 px-3 py-2">
                            Nenhum atalho adicionado ainda.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
               
              {visibleMenus.map((item) => {
                if (item.subItems && item.subItems.length > 0) {
                  const isSubItemActive = item.subItems.some(sub => location.pathname === sub.url);
                  const isMenuOpen = openSubmenuId === item.id;
                  // Verifica se algum atalho está ativo para o mesmo path
                  const isPathInAtalhos = atalhos.some(a => item.subItems?.some(sub => sub.url === a.path && location.pathname === a.path));
                  const shouldHighlight = isSubItemActive && !isPathInAtalhos;
                  
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
                                  {item.id === "Configurações" && (
                                    <>
                                      <button
                                        onClick={() => setOpenNestedSubmenu(openNestedSubmenu === "Estabelecimentos Cadastrados" ? null : "Estabelecimentos Cadastrados")}
                                        className="flex items-center justify-between w-full px-3 py-2.5 rounded-md transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                                      >
                                        <div className="flex items-center gap-3">
                                          <Building className="w-4 h-4 flex-shrink-0" />
                                          <span className="text-sm">Estabelecimentos Cadastrados</span>
                                        </div>
                                        <ChevronDown className={`w-3 h-3 transition-transform ${openNestedSubmenu === "Estabelecimentos Cadastrados" ? 'rotate-180' : ''}`} />
                                      </button>
                                      {openNestedSubmenu === "Estabelecimentos Cadastrados" && (
                                        <div className="ml-6 space-y-1">
                                          <NavLink
                                            to="/config"
                                            onClick={() => {
                                              setOpenSubmenuId(null);
                                              setOpenNestedSubmenu(null);
                                            }}
                                            className={({ isActive }) =>
                                              `flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                                                isActive
                                                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                                                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                                              }`
                                            }
                                          >
                                            <Settings className="w-4 h-4 flex-shrink-0" />
                                            <span className="text-sm">Configurações Gerais</span>
                                          </NavLink>
                                          <NavLink
                                            to="/config/sla"
                                            onClick={() => {
                                              setOpenSubmenuId(null);
                                              setOpenNestedSubmenu(null);
                                            }}
                                            className={({ isActive }) =>
                                              `flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                                                isActive
                                                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                                                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                                              }`
                                            }
                                          >
                                            <Clock className="w-4 h-4 flex-shrink-0" />
                                            <span className="text-sm">SLA</span>
                                          </NavLink>
                                        </div>
                                      )}
                                    </>
                                  )}
                                  {item.subItems.map((subItem) => {
                                    const isInAtalhos = atalhos.some(a => a.path === subItem.url);
                                    
                                    // Tratamento especial para Alterar Senha
                                    if (subItem.url === "#alterar-senha") {
                                      return (
                                        <button
                                          key={subItem.id}
                                          onClick={() => {
                                            setOpenSubmenuId(null);
                                            setShowChangePasswordDialog(true);
                                          }}
                                          className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full text-left"
                                        >
                                          <subItem.icon className="w-4 h-4 flex-shrink-0" />
                                          <span className="text-sm">{subItem.title}</span>
                                        </button>
                                      );
                                    }
                                    
                                    return (
                                      <NavLink
                                        key={subItem.id}
                                        to={subItem.url}
                                        onClick={() => setOpenSubmenuId(null)}
                                        className={({ isActive }) =>
                                          `flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                                            isActive && !isInAtalhos
                                              ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                                              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                                          }`
                                        }
                                      >
                                        <subItem.icon className="w-4 h-4 flex-shrink-0" />
                                        <span className="text-sm">{subItem.title}</span>
                                      </NavLink>
                                    );
                                  })}
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
                            {item.id === "Configurações" && (
                              <>
                                <button
                                  onClick={() => setOpenNestedSubmenu(openNestedSubmenu === "Estabelecimentos Cadastrados" ? null : "Estabelecimentos Cadastrados")}
                                  className="flex items-center justify-between w-full px-3 py-2 rounded-md transition-colors text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                                >
                                  <div className="flex items-center gap-3">
                                    <Building className="w-4 h-4 flex-shrink-0" />
                                    <span className="text-sm">Estabelecimentos Cadastrados</span>
                                  </div>
                                  <ChevronDown className={`w-3 h-3 transition-transform ${openNestedSubmenu === "Estabelecimentos Cadastrados" ? 'rotate-180' : ''}`} />
                                </button>
                                {openNestedSubmenu === "Estabelecimentos Cadastrados" && (
                                  <div className="ml-6 space-y-1">
                                    <NavLink
                                      to="/config"
                                      onClick={() => {
                                        setOpenSubmenuId(null);
                                        setOpenNestedSubmenu(null);
                                      }}
                                      className={({ isActive }) =>
                                        `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                                          isActive
                                            ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                                            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                                        }`
                                      }
                                    >
                                      <Settings className="w-4 h-4 flex-shrink-0" />
                                      <span className="text-sm">Configurações Gerais</span>
                                    </NavLink>
                                    <NavLink
                                      to="/config/sla"
                                      onClick={() => {
                                        setOpenSubmenuId(null);
                                        setOpenNestedSubmenu(null);
                                      }}
                                      className={({ isActive }) =>
                                        `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                                          isActive
                                            ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                                            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                                        }`
                                      }
                                    >
                                      <Clock className="w-4 h-4 flex-shrink-0" />
                                      <span className="text-sm">SLA</span>
                                    </NavLink>
                                  </div>
                                )}
                              </>
                            )}
                            {item.subItems.map((subItem) => {
                              const isInAtalhos = atalhos.some(a => a.path === subItem.url);
                              
                              // Tratamento especial para Alterar Senha
                              if (subItem.url === "#alterar-senha") {
                                return (
                                  <button
                                    key={subItem.id}
                                    onClick={() => {
                                      setOpenSubmenuId(null);
                                      setShowChangePasswordDialog(true);
                                    }}
                                    className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 w-full text-left"
                                  >
                                    <subItem.icon className="w-4 h-4 flex-shrink-0" />
                                    <span className="text-sm">{subItem.title}</span>
                                  </button>
                                );
                              }
                              
                              return (
                                <NavLink
                                  key={subItem.id}
                                  to={subItem.url}
                                  onClick={() => setOpenSubmenuId(null)}
                                  className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                                      isActive && !isInAtalhos
                                        ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                                        : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                                    }`
                                  }
                                >
                                  <subItem.icon className="w-4 h-4 flex-shrink-0" />
                                  <span className="text-sm">{subItem.title}</span>
                                </NavLink>
                              );
                            })}
                          </div>
                        )}
                    </div>
                  );
                }
                
                // Menu normal sem submenu
                const isInAtalhos = item.url && atalhos.some(a => a.path === item.url);
                
                if (menuLocked) {
                  return (
                    <NavLink
                      key={item.title}
                      to={item.url!}
                      className={({ isActive }) =>
                        `w-12 h-12 flex items-center justify-center rounded-lg transition-all ${
                          isActive && !isInAtalhos
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
                        isActive && !isInAtalhos
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

            {/* Menu de usuário como submenu */}
            {menuLocked ? (
              <div className="relative w-full flex justify-center">
                <button
                  type="button"
                  onClick={() => setOpenSubmenuId(openSubmenuId === "UserMenu" ? null : "UserMenu")}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors"
                  title={userName || "Minha Conta"}
                >
                  <UserIcon className="w-5 h-5 text-sidebar-foreground/70" />
                </button>
                
                {openSubmenuId === "UserMenu" && (
                  <div ref={submenuPanelRef} onClick={(e) => e.stopPropagation()} className="fixed left-16 bottom-0 w-64 bg-sidebar border-r border-sidebar-border shadow-lg z-50">
                    <div className="px-4 py-6">
                      <h3 className="text-sm font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-4 px-2">
                        {userName || "Minha Conta"}
                      </h3>
                      
                      <div className="space-y-1">
                        <button
                          onClick={() => {
                            setOpenSubmenuId(null);
                            setShowUsuarioSelector(true);
                          }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full text-left"
                        >
                          <UserIcon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm">Trocar Usuário</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            setOpenSubmenuId(null);
                            setShowChangePasswordDialog(true);
                          }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full text-left"
                        >
                          <KeyRound className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm">Alterar Senha</span>
                        </button>
                        
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative w-full">
                <button
                  type="button"
                  onClick={() => setOpenSubmenuId(openSubmenuId === "UserMenu" ? null : "UserMenu")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors"
                  title={userName || "Minha Conta"}
                >
                  <UserIcon className="w-5 h-5 text-sidebar-foreground/70 flex-shrink-0" />
                  <span className="text-sm font-medium text-sidebar-foreground/70 flex-1 text-left truncate">{userName || "Minha Conta"}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openSubmenuId === "UserMenu" ? 'rotate-180' : ''}`} />
                </button>
                
                {openSubmenuId === "UserMenu" && (
                  <div className="mt-1 ml-8 space-y-1">
                    <button
                      onClick={() => {
                        setOpenSubmenuId(null);
                        setShowUsuarioSelector(true);
                      }}
                      className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 w-full text-left"
                    >
                      <UserIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">Trocar Usuário</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setOpenSubmenuId(null);
                        setShowChangePasswordDialog(true);
                      }}
                      className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 w-full text-left"
                    >
                      <KeyRound className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">Alterar Senha</span>
                    </button>
                    
                  </div>
                )}
              </div>
            )}

            {/* Botão Sair - sempre abaixo do menu do usuário */}
            {menuLocked ? (
              <button
                type="button"
                onClick={handleLogout}
                className="w-12 h-12 flex items-center justify-center rounded-lg transition-all text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                title="Sair"
              >
                <LogOut className="w-6 h-6" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                title="Sair"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">Sair</span>
              </button>
            )}
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
      
      <ChangePasswordDialog
        open={showChangePasswordDialog}
        onOpenChange={setShowChangePasswordDialog}
      />
    </LayoutContext.Provider>
  );
}
