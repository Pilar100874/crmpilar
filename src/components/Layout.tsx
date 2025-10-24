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
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import logo from "@/assets/logo_branco_sidebar.png";
import { EstabelecimentoSelector } from "@/components/EstabelecimentoSelector";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

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
  { id: "Clientes", title: "Leads", url: "/clientes", icon: Users },
  { id: "Atendimento", title: "Chats", url: "/atendimento", icon: MessageSquare },
  { id: "WhatsApp Config", title: "WhatsApp", url: "/whatsapp-config", icon: Smartphone },
  { id: "Campanhas", title: "Calendário", url: "/campanhas", icon: Megaphone },
  { id: "Conteúdos", title: "Listas", url: "/conteudos", icon: FileText },
  { id: "Bot Builder", title: "E-mail", url: "/bot-builder", icon: Workflow },
  { 
    id: "Bot Test", 
    title: "Teste Bot", 
    icon: Workflow,
    subItems: [
      { id: "Criar Bot", title: "Criar Bot", url: "/bot-create", icon: Plus },
      { id: "Testar", title: "Testar", url: "/bot-test", icon: TestTube2 },
    ]
  },
  { id: "Desenho", title: "Estatísticas", url: "/desenho", icon: Pencil },
  { id: "Variáveis Globais", title: "Ajuda", url: "/global-variables", icon: Globe },
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [estabelecimentoName, setEstabelecimentoName] = useState<string>("");
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
    // Filtra os subitems também por permissão
    if (item.subItems) {
      return {
        ...item,
        subItems: item.subItems.filter(subItem => {
          const subPermission = allowedMenus[subItem.id];
          return subPermission?.view === true;
        })
      };
    }
    return item;
  });

  return (
    <SidebarProvider defaultOpen={true} open={true}>
      <div className="min-h-screen flex w-full bg-background">
        <div className="w-20 border-r border-sidebar-border bg-sidebar flex-shrink-0 flex flex-col">
          {/* Logo no topo */}
          <div className="flex items-center justify-center py-6 border-b border-sidebar-border">
            <img 
              src={logo} 
              alt="Pilar Logo" 
              className="h-10 w-18 object-contain"
            />
          </div>

          <ScrollArea className="flex-1 bg-sidebar">
            <div className="py-2">
              {visibleMenus.map((item) => {
                if (item.subItems && item.subItems.length > 0) {
                  // Menu com submenu - usa Popover
                  const isSubItemActive = item.subItems.some(sub => location.pathname === sub.url);
                  
                  return (
                    <Popover key={item.id} open={openSubmenuId === item.id} onOpenChange={(open) => setOpenSubmenuId(open ? item.id : null)}>
                      <PopoverTrigger asChild>
                        <button
                          className={`w-full flex flex-col items-center justify-center gap-1 py-3 px-2 transition-all duration-200 group relative ${
                            isSubItemActive
                              ? "bg-sidebar-accent text-primary"
                              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                          }`}
                        >
                          {isSubItemActive && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                          )}
                          <item.icon className={`w-6 h-6 transition-colors ${
                            isSubItemActive ? "text-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                          }`} />
                          <span className={`text-[10px] font-medium text-center leading-tight transition-colors ${
                            isSubItemActive ? "text-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                          }`}>
                            {item.title}
                          </span>
                          <ChevronDown className={`w-3 h-3 transition-transform ${openSubmenuId === item.id ? "rotate-180" : ""} ${
                            isSubItemActive ? "text-primary" : "text-sidebar-foreground/70"
                          }`} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="right" align="start" className="w-48 p-2 bg-card border-border">
                        <div className="space-y-1">
                          {item.subItems.map((subItem) => (
                            <NavLink
                              key={subItem.id}
                              to={subItem.url}
                              onClick={() => setOpenSubmenuId(null)}
                              className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                                  isActive
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted text-foreground"
                                }`
                              }
                            >
                              <subItem.icon className="w-4 h-4" />
                              <span className="text-sm font-medium">{subItem.title}</span>
                            </NavLink>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  );
                }
                
                // Menu normal sem submenu
                return (
                  <NavLink
                    key={item.title}
                    to={item.url!}
                    className={({ isActive }) =>
                      `flex flex-col items-center justify-center gap-1 py-3 px-2 transition-all duration-200 group relative ${
                        isActive
                          ? "bg-sidebar-accent text-primary"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                        )}
                        <item.icon className={`w-6 h-6 transition-colors ${
                          isActive ? "text-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                        }`} />
                        <span className={`text-[10px] font-medium text-center leading-tight transition-colors ${
                          isActive ? "text-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                        }`}>
                          {item.title}
                        </span>
                      </>
                    )}
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
          <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card shadow-sm">
            <div className="flex items-center gap-6 text-sm">
              {estabelecimentoName && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold text-foreground">{estabelecimentoName}</span>
                </div>
              )}
              {userName && (
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{userName}</span>
                </div>
              )}
            </div>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEstabelecimentoSelector(true)}
                className="gap-2"
              >
                <Building2 className="w-4 h-4" />
                Trocar Estabelecimento
              </Button>
            )}
          </header>
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
      />
    </SidebarProvider>
  );
}
