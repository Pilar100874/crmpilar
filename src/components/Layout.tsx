import { ReactNode, useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import {
  Sidebar,
  SidebarContent,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
  Monitor,
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
  Brain,
  Clock,
  Sun,
  Moon,
  LifeBuoy,
  RefreshCw,
  AppWindow,
} from "lucide-react";

import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast-config";
import logo from "@/assets/logo_branco_sidebar.png";
import { EstabelecimentoSelector } from "@/components/EstabelecimentoSelector";
import { UsuarioSelector } from "@/components/UsuarioSelector";
import { FloatingMacroRecorder } from "@/components/macro/FloatingMacroRecorder";
import { FloatingMacroQuickAccess } from "@/components/macro/FloatingMacroQuickAccess";
import { IncomingCallNotification } from "@/components/softphone/IncomingCallNotification";
import { ChatAvisosFloatingButton } from "@/components/chat-interno/ChatAvisosFloatingButton";
import { SupportTicketFloatingButton } from "@/components/support/SupportTicketFloatingButton";
import { ChatInternoProvider } from "@/contexts/ChatInternoContext";
import { getEstabelecimentoId, isEstabelecimentoAdmin } from "@/lib/estabelecimentoUtils";
import { MENUS_DISPONIVEIS } from "@/lib/menus";
import { LayoutContext } from "@/contexts/LayoutContext";
import { useAtalhos } from "@/hooks/useAtalhos";
import { useAvisosSistema } from "@/hooks/useAvisosSistema";
import { AppsHealthIndicator } from "@/components/AppsHealthIndicator";

import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useActivityTracking } from "@/hooks/useActivityTracking";
// OpenInNewTabButton agora é montado globalmente em App.tsx via GlobalOpenInNewTabButton
import { useUsageTracker } from "@/hooks/useUsageTracker";
import { useInteractionTracker } from "@/hooks/useInteractionTracker";

// useAutoScreenShare removido - agora usamos extensão do Chrome
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
  group?: string;
}

export interface MenuItem {
  id: string;
  title: string;
  url?: string;
  icon: any;
  subItems?: SubMenuItem[];
}

export const menuItems: MenuItem[] = [
  { 
    id: "Dashboards",
    title: "Dashboards", 
    icon: LayoutDashboard,
    subItems: [
      { id: "Dashboard", title: "Painel", url: "/dashboard", icon: LayoutDashboard },
      { id: "Dashboard Atendente", title: "Dashboard Atendente", url: "/dashboard-atendente", icon: Users },
      { id: "Dashboard Supervisor", title: "Dashboard Supervisor", url: "/dashboard-supervisor", icon: LayoutDashboard },
      { id: "SLA Dashboard", title: "Dashboard SLA", url: "/sla-dashboard", icon: Activity },
      { id: "Analytics Dashboard", title: "Analytics Avançado", url: "/advanced-analytics", icon: FileBarChart },
      { id: "Dashboard CSAT/NPS", title: "Pesquisas de Satisfação", url: "/dashboard-pesquisas-satisfacao", icon: Star },
      
    ]
  },
  // Avisos foi movido para badge ao lado do usuário
  { id: "Clientes", title: "Funil", url: "/funil", icon: Users },
  { 
    id: "Atendimento",
    title: "Chats", 
    icon: MessageSquare,
    subItems: [
      { id: "Painel Chats", title: "Painel", url: "/atendimento", icon: MessageSquare },
      { id: "Agentes IA", title: "Agentes IA", url: "/agentes-chat", icon: LucideIcons.Bot },
      { id: "Monitor de Filas", title: "Monitor de Filas", url: "/monitor-filas", icon: Activity },
      { id: "Monitor de Funcionários", title: "Monitor de Funcionários", url: "/monitor-funcionarios", icon: Monitor },
      { id: "Teste Roteamento", title: "Teste de Roteamento", url: "/test-roteamento", icon: TestTube2 },
      { id: "Config Atendimento", title: "Configurações", url: "/atendimento-config", icon: Settings },
    ]
  },
  {
    id: "Campanhas",
    title: "Calendário",
    icon: Megaphone,
    subItems: [
      { id: "Calendario Painel", title: "Calendário", url: "/calendario", icon: Megaphone },
      { id: "Config Calendario", title: "Configurações", url: "/calendario/configuracoes", icon: Settings },
    ]
  },
  { 
    id: "Vendas",
    title: "Vendas", 
    icon: FileBarChart,
    subItems: [
      { id: "Orçamento", title: "Orçamento", url: "/orcamentos", icon: FileBarChart },
      { id: "Pedidos Recebidos", title: "Pedidos Recebidos", url: "/pedidos-recebidos", icon: LucideIcons.Package },
      { id: "Roteirizador Visitas", title: "Roteirizador de Visitas", url: "/roteirizador-visitas", icon: LucideIcons.MapPin },
      { id: "Programação Visitas", title: "Programação de Visitas", url: "/vendas/programacao-visitas", icon: LucideIcons.CalendarClock },
      { id: "Acompanhamento Visitas", title: "Acompanhamento de Visitas", url: "/vendas/acompanhamento-visitas", icon: LucideIcons.CalendarCheck },
      { id: "Regras Monitoramento Visita", title: "Regras de Monitoramento", url: "/config/regras-monitoramento-visita", icon: Settings },
      { id: "Formulários de Visita", title: "Formulários de Visita", url: "/config/formularios-visita", icon: LucideIcons.ClipboardList },
      { id: "Regras de Formulário", title: "Regras de Formulário", url: "/config/regras-formulario-visita", icon: LucideIcons.ListChecks },
      { id: "Config Vendas", title: "Configuração de Vendas", url: "/vendas-config", icon: Settings },
    ]
  },
  {
    id: "Assistente",
    title: "Assistente",
    icon: LucideIcons.ScanEye,
    subItems: [
      { id: "Contagem Inteligente", title: "Contagem Inteligente", url: "/contagem", icon: LucideIcons.Camera },
    ]
  },
  { id: "Conteúdos", title: "Listas", url: "/listas", icon: FileText },
  { id: "Email", title: "E-mail", url: "/email", icon: Mail },
  { id: "Desenho", title: "Marketing", url: "/marketing", icon: Target },
  { id: "Relatórios", title: "Relatórios", url: "/relatorios", icon: FileText },
  { id: "Controle de Ponto", title: "Controle de Ponto", url: "/ponto", icon: Clock },

  { id: "Controle de Veículos", title: "Controle de Veículos", url: "/controle-veiculos", icon: LucideIcons.Car },
  { id: "Controle de Visitantes", title: "Controle de Visitantes", url: "/controle-visitantes", icon: LucideIcons.Users },
  { id: "Livro de Ocorrência", title: "Livro de Ocorrência", url: "/livro-ocorrencia", icon: LucideIcons.BookOpen },
  { id: "Câmeras", title: "Câmeras", url: "/cameras", icon: LucideIcons.Camera },
  {
    id: "Editores",
    title: "Editores",
    icon: LucideIcons.FileText,
    subItems: [
      { id: "Editores Hub", title: "Início", url: "/editores", icon: LucideIcons.LayoutGrid },
      { id: "Editores Modelos", title: "Modelos de Documento", url: "/editores/modelos", icon: LucideIcons.FileText },
      { id: "Editores Gerar", title: "Gerar Documento", url: "/editores/gerar", icon: LucideIcons.FilePlus },
      { id: "Editores Documentos", title: "Documentos Gerados", url: "/editores/documentos", icon: LucideIcons.Files },
    ],
  },



  {
    id: "Logística",
    title: "Logística",
    icon: LucideIcons.Truck,
    url: "/logistica"
  },
  { id: "Marketplaces", title: "Marketplaces", url: "/marketplaces", icon: LucideIcons.Store },
  { 
    id: "E-commerce",
    title: "E-commerce", 
    icon: LucideIcons.ShoppingBag,
    subItems: [
      { id: "Ecommerce Site", title: "Abrir Loja Virtual", url: "/ecommerce", icon: LucideIcons.ExternalLink },
      { id: "Ecommerce Config", title: "Configurações", url: "/ecommerce-config", icon: LucideIcons.Settings },
    ]
  },
  { id: "Ads", title: "Ads", url: "/ads", icon: LucideIcons.Megaphone },
  { id: "Robô de Preços", title: "Robô de Preços", url: "/robo-precos", icon: LucideIcons.Bot },
  {
    id: "TV",
    title: "TV",
    icon: LucideIcons.Tv,
    subItems: [
      { id: "TV Vendas", title: "Dashboard Vendas", url: "/tv/vendas", icon: FileBarChart },
      { id: "TV Veículos", title: "Dashboard Veículos", url: "/tv/veiculos", icon: LucideIcons.Truck },
      { id: "TV Câmeras", title: "Mosaico de Câmeras", url: "/tv/cameras", icon: LucideIcons.Camera },
      { id: "TV Signage", title: "TV Signage (Android TV)", url: "/tv-signage", icon: LucideIcons.MonitorPlay },
    ]
  },
  { id: "Mapa de Calor", title: "Mapa de Calor", url: "/mapa-calor-sistema", icon: LucideIcons.Flame },
  
  { id: "Configurações", title: "Configurações", url: "/config", icon: Settings },
];

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const soloMode =
    typeof window !== "undefined" &&
    (new URLSearchParams(window.location.search).get("solo") === "1" ||
      !!new URLSearchParams(window.location.search).get("fromtela"));
  const hideMainMenu = location.pathname.startsWith("/tv-signage");
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
  const [showPwaUpdateDialog, setShowPwaUpdateDialog] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return document.documentElement.classList.contains("dark");
  });
  const [openNestedSubmenu, setOpenNestedSubmenu] = useState<string | null>(null);
  const submenuPanelRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { atalhos } = useAtalhos();
  const { avisosPendentes } = useAvisosSistema();
  
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  // Verifica se usuário é admin
  useEffect(() => {
    let cancelled = false;
    isEstabelecimentoAdmin().then((result) => {
      if (!cancelled) setIsAdmin(result);
    });
    return () => { cancelled = true; };
  }, [user]);
  // Tracking de atividade do usuário em tempo real
  useActivityTracking();
  // Tracking de uso para Mapa de Calor do Sistema
  useUsageTracker();
  useInteractionTracker("sistema");

  // Toggle sidebar via evento customizado (ex: botão hamburger em sub-layouts)
  useEffect(() => {
    const handleToggle = () => setMenuOpen((prev) => !prev);
    window.addEventListener("toggle-sidebar", handleToggle);
    return () => window.removeEventListener("toggle-sidebar", handleToggle);
  }, []);

  
  // Auto screen share removido - agora usamos extensão do Chrome

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Only redirect on explicit sign-out, not on transient token refresh failures
        if (event === 'SIGNED_OUT' && location.pathname !== "/") {
          navigate("/");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session && location.pathname !== "/") {
        navigate("/");
      }
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
        // IMPORTANTE: user_roles.user_id referencia usuarios.id, não auth.users.id
        const { data: userRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", usuario.id) // CORRIGIDO: usar usuario.id ao invés de user.id
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
        const { data: userData } = await supabase
          .from("usuarios")
          .select("nome")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        
        setUserName(userData?.nome || user.email?.split("@")[0] || "Usuário");

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

  // Close any open submenu whenever the route changes. On mobile/tablet, also collapse menu.
  useEffect(() => {
    setOpenSubmenuId(null);
    if (window.innerWidth <= 1024) {
      setMenuOpen(false);
    }
  }, [location.pathname]);

  // Force close submenus on escape key and click outside
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenSubmenuId(null);
      }
    };
    
    const handleClickOutside = (e: MouseEvent) => {
      // Se clicou fora do sidebar e do painel de submenu, fecha o submenu
      if (
        openSubmenuId &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node) &&
        submenuPanelRef.current &&
        !submenuPanelRef.current.contains(e.target as Node)
      ) {
        setOpenSubmenuId(null);
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openSubmenuId]);

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

  // Swipe da borda esquerda para abrir o menu (mobile/tablet)
  useEffect(() => {
    if (window.innerWidth > 1024) return;
    let startX = 0;
    let startY = 0;
    let tracking = false;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      // Só ativa se começou bem na borda esquerda
      if (t.clientX <= 24 && !menuOpen) {
        startX = t.clientX;
        startY = t.clientY;
        tracking = true;
      }
    };
    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (dx > 50 && dy < 40) {
        setMenuOpen(true);
        tracking = false;
      }
    };
    const onEnd = () => { tracking = false; };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [menuOpen]);

  const handleMenuMouseEnter = () => {
    if (menuLocked) return;
    // Não abre automaticamente - só mantém aberto se já estiver
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
      menuTimeoutRef.current = null;
    }
  };

  const handleMenuMouseLeave = () => {
    if (menuLocked) return;
    // Fecha com delay quando sai do menu
    menuTimeoutRef.current = setTimeout(() => {
      setMenuOpen(false);
      setOpenSubmenuId(null);
    }, 300);
  };

  const handleTabClick = () => {
    if (menuLocked) return;
    setMenuOpen(!menuOpen);
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
  const visibleMenus = menuItems
    .filter((item) => {
      // Menus que sempre devem aparecer para usuários autenticados
      const alwaysVisibleMenus = ["Configurações", "Avisos", "TV", "E-commerce", "Suporte Tickets", "Mapa de Calor", "Controle de Ponto", "Controle de Veículos", "Controle de Visitantes", "Livro de Ocorrência", "Câmeras", "Editores"];
      if (alwaysVisibleMenus.includes(item.id)) {
        return true;
      }

      const permission = allowedMenus[item.id];

      // Se o menu tem subitems, verifica se pelo menos um tem permissão
      if (item.subItems) {
        const hasSubItemPermission = item.subItems.some((subItem) => {
          const subPermission = allowedMenus[subItem.id];
          return subPermission?.view === true;
        });
        return permission?.view === true || hasSubItemPermission;
      }

      return permission?.view === true;
    })
    .map((item) => {
      // Não filtra subitens por permissão para garantir visibilidade do submenu
      if (item.subItems) {
        return item;
      }
      return item;
    });

  if (soloMode || hideMainMenu) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="min-h-screen">{children}</main>
      </div>
    );
  }

  return (
    <LayoutContext.Provider value={{ openSubmenu: setOpenSubmenuId }}>
      <div className="min-h-screen flex w-full bg-background relative">
        {sidebarVisible && (
          <div 
            ref={sidebarRef}
            data-main-sidebar
            className={`${
              menuLocked 
                ? 'fixed left-0 top-0 bottom-0 w-16 md:w-20 lg:w-16 z-[500]' 
                : `slide-out-menu ${menuOpen ? 'open' : ''}`
            } border-r-[0.5px] border-sidebar-border bg-sidebar flex-shrink-0 flex flex-col`}
            onMouseEnter={handleMenuMouseEnter}
            onMouseLeave={handleMenuMouseLeave}
          >
            {/* Aba lateral - só aparece quando não está travado */}
            {!menuLocked && (
              <div 
                className={`slide-out-menu-tab ${menuOpen ? 'menu-open' : ''}`}
                onClick={handleTabClick}
              >
                {menuOpen ? (
                  <ChevronLeft className="w-5 h-5 lg:w-5 lg:h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5 lg:w-5 lg:h-5" />
                )}
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

            <ScrollArea className="flex-1 bg-sidebar sidebar-scrollarea">
              <div className={`py-2 flex flex-col gap-1 ${menuLocked ? 'items-center' : 'px-4'}`}>
                {/* Menu Atalhos com submenu */}
                <>
                  {menuLocked ? (
                    <div className="relative w-full flex justify-center">
                      {(() => {
                        const isAtalhosOpen = openSubmenuId === "Atalhos";
                        return (
                          <button
                          type="button"
                          onClick={() => setOpenSubmenuId(isAtalhosOpen ? null : "Atalhos")}
                          className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors duration-100 ${
                            isAtalhosOpen
                              ? "bg-sidebar-primary text-sidebar-primary-foreground"
                              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                          }`}
                          title="Atalhos"
                        >
                          <Star className="w-6 h-6" />
                        </button>
                      );
                    })()}
                    
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
                                      to={`${atalho.path}${atalho.path.includes("?") ? "&" : "?"}solo=1&fromatalho=1`}
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
                    {(() => {
                      const isAtalhosOpen = openSubmenuId === "Atalhos";
                      return (
                        <button
                          type="button"
                          onClick={() => setOpenSubmenuId(isAtalhosOpen ? null : "Atalhos")}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-100 ${
                            isAtalhosOpen
                              ? "bg-sidebar-primary text-sidebar-primary-foreground"
                              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                          }`}
                          title="Atalhos"
                        >
                          <Star className="w-5 h-5 flex-shrink-0" />
                          <span className="text-sm font-medium flex-1 text-left">Atalhos</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${isAtalhosOpen ? 'rotate-180' : ''}`} />
                        </button>
                      );
                    })()}
                    
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
                                  to={`${atalho.path}${atalho.path.includes("?") ? "&" : "?"}solo=1&fromatalho=1`}
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
                  const isMenuOpen = openSubmenuId === item.id;
                  // Destaca apenas se o submenu está aberto
                  const shouldHighlight = isMenuOpen;
                  
                  // Estilo travado (ícones apenas)
                  if (menuLocked) {
                    return (
                      <div key={item.id} className="relative w-full flex justify-center">
                        <button
                          type="button"
                          onClick={() => setOpenSubmenuId(isMenuOpen ? null : item.id)}
                          className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors duration-100 relative ${
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
                              
                              <div className="space-y-2">
                                {(() => {
                                  const hasGroups = item.subItems?.some(s => s.group);
                                  if (!hasGroups) {
                                    return item.subItems.map((subItem) => {
                                      const isInAtalhos = atalhos.some(a => a.path === subItem.url);
                                      return subItem.url === "#alterar-senha" ? (
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
                                      ) : (
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
                                    });
                                  }

                                  const grouped: Record<string, typeof item.subItems> = {};
                                  const groupOrder: string[] = [];
                                  item.subItems.forEach(subItem => {
                                    const groupName = subItem.group || "Geral";
                                    if (!grouped[groupName]) {
                                      grouped[groupName] = [];
                                      groupOrder.push(groupName);
                                    }
                                    grouped[groupName].push(subItem);
                                  });

                                  return groupOrder.map(groupName => {
                                    const subItemsInGroup = grouped[groupName];
                                    const key = `${item.id}-${groupName}`;
                                    const isActiveGroup = subItemsInGroup.some(sub => location.pathname === sub.url);
                                    const isExpanded = openNestedSubmenu === key || (openNestedSubmenu === null && isActiveGroup);

                                    return (
                                      <div key={groupName} className="space-y-1">
                                        <button
                                          type="button"
                                          onClick={() => setOpenNestedSubmenu(isExpanded ? "" : key)}
                                          className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                                            isActiveGroup 
                                              ? "text-sidebar-foreground font-medium bg-sidebar-accent/30" 
                                              : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                                          }`}
                                        >
                                          <span className="text-xs font-semibold uppercase tracking-wider">{groupName}</span>
                                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isExpanded && (
                                          <div className="pl-2 space-y-1 border-l border-sidebar-border/30 ml-2 mt-1">
                                            {subItemsInGroup.map(subItem => {
                                              const isInAtalhos = atalhos.some(a => a.path === subItem.url);
                                              return subItem.url === "#alterar-senha" ? (
                                                <button
                                                  key={subItem.id}
                                                  onClick={() => {
                                                    setOpenSubmenuId(null);
                                                    setShowChangePasswordDialog(true);
                                                  }}
                                                  className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full text-left"
                                                >
                                                  <subItem.icon className="w-4 h-4 flex-shrink-0" />
                                                  <span className="text-sm">{subItem.title}</span>
                                                </button>
                                              ) : (
                                                <NavLink
                                                  key={subItem.id}
                                                  to={subItem.url}
                                                  onClick={() => setOpenSubmenuId(null)}
                                                  className={({ isActive }) =>
                                                    `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
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
                                        )}
                                      </div>
                                    );
                                  });
                                })()}
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
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-100 ${
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
                        <div className="mt-1 ml-8 space-y-2">
                          {(() => {
                            const hasGroups = item.subItems?.some(s => s.group);
                            if (!hasGroups) {
                              return item.subItems.map((subItem) => {
                                const isInAtalhos = atalhos.some(a => a.path === subItem.url);
                                return subItem.url === "#alterar-senha" ? (
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
                                ) : (
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
                              });
                            }

                            const grouped: Record<string, typeof item.subItems> = {};
                            const groupOrder: string[] = [];
                            item.subItems.forEach(subItem => {
                               const groupName = subItem.group || "Geral";
                               if (!grouped[groupName]) {
                                 grouped[groupName] = [];
                                 groupOrder.push(groupName);
                               }
                               grouped[groupName].push(subItem);
                            });

                            return groupOrder.map(groupName => {
                              const subItemsInGroup = grouped[groupName];
                              const key = `${item.id}-${groupName}`;
                              const isActiveGroup = subItemsInGroup.some(sub => location.pathname === sub.url);
                              const isExpanded = openNestedSubmenu === key || (openNestedSubmenu === null && isActiveGroup);

                              return (
                                <div key={groupName} className="space-y-1">
                                  <button
                                    type="button"
                                    onClick={() => setOpenNestedSubmenu(isExpanded ? "" : key)}
                                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md transition-colors ${
                                      isActiveGroup 
                                        ? "text-sidebar-foreground font-medium bg-sidebar-accent/20" 
                                        : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/20"
                                    }`}
                                  >
                                    <span className="text-xs font-semibold uppercase tracking-wider">{groupName}</span>
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  </button>
                                  {isExpanded && (
                                    <div className="pl-2 space-y-1 border-l border-sidebar-border/30 ml-2 mt-1">
                                      {subItemsInGroup.map(subItem => {
                                        const isInAtalhos = atalhos.some(a => a.path === subItem.url);
                                        return subItem.url === "#alterar-senha" ? (
                                          <button
                                            key={subItem.id}
                                            onClick={() => {
                                              setOpenSubmenuId(null);
                                              setShowChangePasswordDialog(true);
                                            }}
                                            className="flex items-center gap-3 px-3 py-1.5 rounded-md transition-colors text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 w-full text-left"
                                          >
                                            <subItem.icon className="w-4 h-4 flex-shrink-0" />
                                            <span className="text-sm">{subItem.title}</span>
                                          </button>
                                        ) : (
                                          <NavLink
                                            key={subItem.id}
                                            to={subItem.url}
                                            onClick={() => setOpenSubmenuId(null)}
                                            className={({ isActive }) =>
                                              `flex items-center gap-3 px-3 py-1.5 rounded-md transition-colors ${
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
                            });
                          })()}
                        </div>
                      )}
                    </div>
                  );
                }
                
                // Menu normal sem submenu
                const isInAtalhos = item.url && atalhos.some(a => a.path === item.url);
                const isAvisos = item.id === "Avisos";
                
                if (menuLocked) {
                  return (
                    <NavLink
                      key={item.title}
                      to={item.url!}
                      className={({ isActive }) =>
                        `w-12 h-12 flex items-center justify-center rounded-lg transition-colors duration-100 relative ${
                          isActive && !isInAtalhos
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        }`
                      }
                      title={item.title}
                    >
                      <item.icon className="w-6 h-6" />
                      {isAvisos && avisosPendentes > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                        >
                          {avisosPendentes > 9 ? '9+' : avisosPendentes}
                        </Badge>
                      )}
                    </NavLink>
                  );
                }
                
                return (
                  <NavLink
                    key={item.title}
                    to={item.url!}
                    className={({ isActive }) =>
                      `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-100 ${
                        isActive && !isInAtalhos
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                      }`
                    }
                    title={item.title}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.title}</span>
                    {isAvisos && avisosPendentes > 0 && (
                      <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1">
                        {avisosPendentes}
                      </Badge>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </ScrollArea>

          {/* Indicador discreto do status dos apps (Windows/Android) */}
          <div className={`border-t border-sidebar-border/40 ${menuLocked ? 'px-1 py-1.5 flex justify-center' : 'px-3 py-1.5'}`}>
            <AppsHealthIndicator compact={menuLocked} />
          </div>

          {/* Ícones no rodapé */}
          <div className={`border-t border-sidebar-border/50 bg-sidebar py-3 flex flex-col gap-2 ${menuLocked ? 'items-center' : 'px-4'}`}>

            {/* Botão de travar/destravar - só aparece em telas maiores que 1024px */}
            {(!isSmallScreen || menuOpen || menuLocked) && (
              <button
                onClick={handleToggleLock}
                className={`${
                  menuLocked 
                    ? 'w-10 h-10 rounded-lg flex items-center justify-center' 
                    : 'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg'
                } text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors duration-100`}
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
              <div className="relative w-full flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => setOpenSubmenuId(openSubmenuId === "UserMenu" ? null : "UserMenu")}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors"
                  title={userName || "Minha Conta"}
                >
                  <UserIcon className="w-5 h-5 text-sidebar-foreground/70" />
                </button>
                <NavLink
                  to="/avisos"
                  className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors ${
                    avisosPendentes > 0 
                      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/80' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                  title={`${avisosPendentes} avisos pendentes`}
                >
                  {avisosPendentes}
                </NavLink>
                
                {openSubmenuId === "UserMenu" && (
                  <div ref={submenuPanelRef} onClick={(e) => e.stopPropagation()} className="fixed left-16 bottom-0 w-64 bg-sidebar border-r border-sidebar-border shadow-lg z-50">
                    <div className="px-4 py-6">
                      <h3 className="text-sm font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-4 px-2">
                        {userName || "Minha Conta"}
                      </h3>
                      
                      <div className="space-y-1">
                        <NavLink
                          to="/perfil"
                          onClick={() => setOpenSubmenuId(null)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full text-left"
                        >
                          <UserIcon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm">Perfil</span>
                        </NavLink>
                        
                        <NavLink
                          to="/compartilhar-tela"
                          onClick={() => setOpenSubmenuId(null)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full text-left"
                        >
                          <Monitor className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm">Compartilhar ou Ver Tela</span>
                        </NavLink>

                        <button
                          onClick={() => {
                            setOpenSubmenuId(null);
                            window.dispatchEvent(new CustomEvent("open-support-ticket"));
                          }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full text-left"
                        >
                          <LifeBuoy className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm">Abrir Ticket de Suporte</span>
                        </button>

                        <button
                          onClick={() => {
                            setOpenSubmenuId(null);
                            setShowPwaUpdateDialog(true);
                          }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full text-left"
                        >
                          <RefreshCw className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm">Atualizar Sistema (PWA)</span>
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

                        {isAdmin && (
                          <>
                            <NavLink
                              to="/macros"
                              onClick={() => setOpenSubmenuId(null)}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full text-left"
                            >
                              <Zap className="w-4 h-4 flex-shrink-0" />
                              <span className="text-sm">Macros</span>
                            </NavLink>
                            <NavLink
                              to="/admin/support-tickets"
                              onClick={() => setOpenSubmenuId(null)}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full text-left"
                            >
                              <LifeBuoy className="w-4 h-4 flex-shrink-0" />
                              <span className="text-sm">Tickets de Suporte</span>
                            </NavLink>
                            <NavLink
                              to="/admin/apps"
                              onClick={() => setOpenSubmenuId(null)}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full text-left"
                            >
                              <AppWindow className="w-4 h-4 flex-shrink-0" />
                              <span className="text-sm">Apps</span>
                            </NavLink>
                            <NavLink
                              to="/admin/telas-customizadas"
                              onClick={() => setOpenSubmenuId(null)}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full text-left"
                            >
                              <LucideIcons.LayoutGrid className="w-4 h-4 flex-shrink-0" />
                              <span className="text-sm">Tela Customizada</span>
                            </NavLink>
                          </>
                        )}

                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative w-full">
                <div className="flex items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => setOpenSubmenuId(openSubmenuId === "UserMenu" ? null : "UserMenu")}
                    className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors"
                    title={userName || "Minha Conta"}
                  >
                    <UserIcon className="w-5 h-5 text-sidebar-foreground/70 flex-shrink-0" />
                    <span className="text-sm font-medium text-sidebar-foreground/70 flex-1 text-left truncate">{userName || "Minha Conta"}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${openSubmenuId === "UserMenu" ? 'rotate-180' : ''}`} />
                  </button>
                  <NavLink
                    to="/avisos"
                    className={`flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full text-xs font-bold transition-colors ${
                      avisosPendentes > 0 
                        ? 'bg-destructive text-destructive-foreground hover:bg-destructive/80' 
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                    title={`${avisosPendentes} avisos pendentes`}
                  >
                    {avisosPendentes}
                  </NavLink>
                </div>
                
                {openSubmenuId === "UserMenu" && (
                  <div className="mt-1 ml-8 space-y-1">
                    <NavLink
                      to="/perfil"
                      onClick={() => setOpenSubmenuId(null)}
                      className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 w-full text-left"
                    >
                      <UserIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">Perfil</span>
                    </NavLink>
                    
                    <NavLink
                      to="/compartilhar-tela"
                      onClick={() => setOpenSubmenuId(null)}
                      className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 w-full text-left"
                    >
                      <Monitor className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">Compartilhar ou Ver Tela</span>
                    </NavLink>

                    <button
                      onClick={() => {
                        setOpenSubmenuId(null);
                        window.dispatchEvent(new CustomEvent("open-support-ticket"));
                      }}
                      className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 w-full text-left"
                    >
                      <LifeBuoy className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">Abrir Ticket de Suporte</span>
                    </button>

                    <button
                      onClick={() => {
                        setOpenSubmenuId(null);
                        setShowPwaUpdateDialog(true);
                      }}
                      className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 w-full text-left"
                    >
                      <RefreshCw className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">Atualizar Sistema (PWA)</span>
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

                    {isAdmin && (
                      <>
                        <NavLink
                          to="/macros"
                          onClick={() => setOpenSubmenuId(null)}
                          className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 w-full text-left"
                        >
                          <Zap className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm">Macros</span>
                        </NavLink>
                        <NavLink
                          to="/admin/support-tickets"
                          onClick={() => setOpenSubmenuId(null)}
                          className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 w-full text-left"
                        >
                          <LifeBuoy className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm">Tickets de Suporte</span>
                        </NavLink>
                        <NavLink
                          to="/admin/apps"
                          onClick={() => setOpenSubmenuId(null)}
                          className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 w-full text-left"
                        >
                          <AppWindow className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm">Apps</span>
                        </NavLink>
                        <NavLink
                          to="/admin/telas-customizadas"
                          onClick={() => setOpenSubmenuId(null)}
                          className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 w-full text-left"
                        >
                          <LucideIcons.LayoutGrid className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm">Tela Customizada</span>
                        </NavLink>
                      </>
                    )}
                    
                  </div>
                )}
              </div>
            )}

            {/* Toggle Dia/Noite */}
            {menuLocked ? (
              <button
                type="button"
                onClick={toggleTheme}
                className="w-12 h-12 flex items-center justify-center rounded-lg transition-colors duration-100 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                title={isDarkMode ? "Modo Claro" : "Modo Escuro"}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            ) : (
              <button
                type="button"
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-100 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                title={isDarkMode ? "Modo Claro" : "Modo Escuro"}
              >
                {isDarkMode ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
                <span className="text-sm font-medium">{isDarkMode ? "Modo Claro" : "Modo Escuro"}</span>
              </button>
            )}

            {/* Botão Sair - sempre abaixo do menu do usuário */}
            {menuLocked ? (
              <button
                type="button"
                onClick={handleLogout}
                className="w-12 h-12 flex items-center justify-center rounded-lg transition-colors duration-100 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                title="Sair"
              >
                <LogOut className="w-6 h-6" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-100 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
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
                className="rounded-full bg-sidebar/95 dark:bg-orange-500 backdrop-blur-sm border-sidebar-border dark:border-orange-600 hover:bg-sidebar dark:hover:bg-orange-400 h-5 w-5 sm:h-6 sm:w-6 p-0 dark:text-white"
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
      <ChatInternoProvider>
        <ChatAvisosFloatingButton />
      </ChatInternoProvider>
      
      <FloatingMacroRecorder />
      <FloatingMacroQuickAccess />
      <SupportTicketFloatingButton />

      {/* FAB Menu (aparece somente no estilo "buttons") */}
      <button
        type="button"
        onClick={() => navigate("/menu")}
        aria-label="Abrir menu"
        className="menu-buttons-fab fixed bottom-6 left-1/2 -translate-x-1/2 z-[600] h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
      >
        <LucideIcons.LayoutGrid className="h-6 w-6" />
      </button>

      <ChangePasswordDialog
        open={showChangePasswordDialog}
        onOpenChange={setShowChangePasswordDialog}
      />
      <AlertDialog open={showPwaUpdateDialog} onOpenChange={setShowPwaUpdateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              Atualizar Sistema (PWA)
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deseja atualizar o sistema para a versão mais recente? O aplicativo será recarregado e todos os caches serão limpos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowPwaUpdateDialog(false);
                window.dispatchEvent(new CustomEvent("pwa-force-update"));
              }}
            >
              Atualizar agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </LayoutContext.Provider>
  );
}
