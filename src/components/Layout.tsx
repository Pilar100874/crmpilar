import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
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
  Smartphone,
  Globe,
  Pencil,
  Building2,
  User as UserIcon,
  ChevronDown,
  Plus,
  TestTube2,
  FileBarChart,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
  { id: "WhatsApp Config", title: "WhatsApp", url: "/whatsapp-config", icon: Smartphone },
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
  { id: "Desenho", title: "Estatísticas", url: "/desenho", icon: Pencil },
  { id: "Teste de Webhooks", title: "Webhooks", url: "/chat-webhook", icon: Globe },
  { id: "Configurações", title: "Configurações", url: "/config", icon: Settings },
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

  // Close any open submenu whenever the route changes
  useEffect(() => {
    setOpenSubmenuId(null);
  }, [location.pathname]);

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
      <SidebarProvider defaultOpen={true} open={true}>
        <div className="min-h-screen flex w-full bg-background">
        <div className="w-20 border-r border-sidebar-border bg-sidebar flex-shrink-0 flex flex-col">
          {/* Logo no topo */}
          <div className="flex flex-col items-center py-4 border-b border-sidebar-border">
            <img 
              src={logo} 
              alt="Pilar Logo" 
              className="h-10 w-18 object-contain mb-3"
            />
            {/* Informações do usuário e estabelecimento */}
            <div className="w-full px-1 space-y-2">
              {estabelecimentoName && isAdmin && (
                <button
                  onClick={() => setShowEstabelecimentoSelector(true)}
                  className="flex flex-col items-center w-full hover:bg-sidebar-accent/50 rounded-md p-1 transition-colors cursor-pointer"
                >
                  <Building2 className="w-4 h-4 text-sidebar-foreground/60 mb-1" />
                  <span className="text-[9px] text-sidebar-foreground/80 text-center leading-tight line-clamp-2 px-1 font-medium">
                    {estabelecimentoName}
                  </span>
                </button>
              )}
              {estabelecimentoName && !isAdmin && (
                <div className="flex flex-col items-center">
                  <Building2 className="w-4 h-4 text-sidebar-foreground/60 mb-1" />
                  <span className="text-[9px] text-sidebar-foreground/80 text-center leading-tight line-clamp-2 px-1 font-medium">
                    {estabelecimentoName}
                  </span>
                </div>
              )}
              {userName && (
                <button
                  onClick={() => setShowUsuarioSelector(true)}
                  className="flex flex-col items-center w-full hover:bg-sidebar-accent/50 rounded-md p-1 transition-colors cursor-pointer pt-1"
                >
                  <UserIcon className="w-4 h-4 text-sidebar-foreground/60 mb-1" />
                  <span className="text-[9px] text-sidebar-foreground/70 text-center leading-tight line-clamp-1 px-1">
                    {userName}
                  </span>
                </button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1 bg-sidebar">
            <div className="py-2">
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
                        className={`w-full flex flex-col items-center justify-center gap-1 py-3 px-2 group relative ${
                          shouldHighlight
                            ? "bg-sidebar-accent text-primary"
                            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        }`}
                      >
                        {shouldHighlight && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                        )}
                        <item.icon className={`w-6 h-6 ${
                          shouldHighlight ? "text-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                        }`} />
                        <span className={`text-[10px] font-medium text-center leading-tight ${
                          shouldHighlight ? "text-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                        }`}>
                          {item.title}
                        </span>
                      </button>
                      
                      {isMenuOpen && (
                        <>
                          {/* Overlay to close menu when clicking outside (doesn't cover the main sidebar) */}
                          <div 
                            className="fixed left-20 top-0 bottom-0 right-0 z-40" 
                            onClick={() => setOpenSubmenuId(null)}
                          />
                          
                          {/* Submenu panel */}
                          <div className="fixed left-20 top-0 bottom-0 w-72 bg-card border-r border-border/30 shadow-sm z-50 overflow-y-auto">
                            <div className="p-8 pt-10">
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
                                        `flex items-center justify-between py-4 group ${
                                          isActive
                                            ? "text-foreground"
                                            : "text-foreground/70 hover:text-foreground"
                                        }`
                                      }
                                    >
                                      <span className="text-sm font-medium">{subItem.title}</span>
                                      {location.pathname === subItem.url && (
                                        <Pencil className="w-3 h-3 text-muted-foreground opacity-40" />
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
                      return `flex flex-col items-center justify-center gap-1 py-3 px-2 group relative ${
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
                          <item.icon className={`w-6 h-6 ${
                            shouldHighlight ? "text-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                          }`} />
                          <span className={`text-[10px] font-medium text-center leading-tight ${
                            shouldHighlight ? "text-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                          }`}>
                            {item.title}
                          </span>
                        </>
                      );
                    }}
                  </NavLink>
                );
              })}
            </div>
          </ScrollArea>

          {/* Botão de sair no final */}
          <div className="border-t border-sidebar-border bg-sidebar">
            <button 
              onClick={handleLogout}
              className="relative flex flex-col items-center justify-center w-full py-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all"
            >
              <LogOut className="w-6 h-6" />
              <span className="text-[10px] font-medium mt-1">Sair</span>
            </button>
          </div>
        </div>

        <main className="flex-1 flex flex-col bg-background min-w-0">
          <div className="flex-1 overflow-auto bg-background">
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
    </SidebarProvider>
    </LayoutContext.Provider>
  );
}
