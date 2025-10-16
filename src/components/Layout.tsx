import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
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
  TestTube,
  Smartphone,
  Globe,
  Pencil,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logo from "@/assets/logo_preto.png";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Atendimento", url: "/atendimento", icon: MessageSquare },
  { title: "CRIAR BOT", url: "/bot-builder", icon: Workflow },
  { title: "Desenho", url: "/desenho", icon: Pencil },
  { title: "Teste do Bot", url: "/bot-test", icon: TestTube },
  { title: "Config WhatsApp", url: "/whatsapp-config", icon: Smartphone },
  { title: "Campanhas", url: "/campanhas", icon: Megaphone },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Conteúdos", url: "/conteudos", icon: FileText },
  { title: "Configurações", url: "/config", icon: Settings },
  { title: "Variáveis Globais", url: "/global-variables", icon: Globe },
];

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/");
  };

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="border-r border-border bg-card">
          <div className="p-3 border-b border-border bg-muted">
            <div className="flex items-center gap-2 mb-2">
              <img 
                src={logo} 
                alt="Pilar Logo" 
                className="h-[73px] w-auto -ml-[1.5cm]"
              />
              <div className="-ml-[1.5cm]">
                <h2 className="font-bold text-lg text-foreground">Bot</h2>
                <p className="text-xs text-muted-foreground">Atendimento IA</p>
              </div>
            </div>
          </div>

          <SidebarContent className="bg-card">
            <SidebarGroup>
              <SidebarGroupLabel className="text-muted-foreground uppercase text-xs px-4 py-2">Menu Principal</SidebarGroupLabel>
              <SidebarGroupContent>
                <ScrollArea className="flex-1">
                  <SidebarMenu className="space-y-1 p-2">
                    {menuItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            className={({ isActive }) =>
                              `flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-150 group border ${
                                isActive
                                  ? "bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border-cyan-500/40 text-foreground font-semibold"
                                  : "border-transparent hover:bg-muted hover:border-cyan-500/20 text-foreground"
                              }`
                            }
                          >
                            {({ isActive }) => (
                              <>
                                <div className={`p-1 rounded-md bg-gradient-to-br transition-all ${
                                  isActive 
                                    ? "from-cyan-500/20 to-blue-500/20 border border-cyan-500/40" 
                                    : "from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 group-hover:border-cyan-500/40"
                                }`}>
                                  <item.icon className={`w-3.5 h-3.5 transition-colors ${
                                    isActive ? "text-cyan-600" : "text-cyan-600 group-hover:text-cyan-700"
                                  }`} />
                                </div>
                                <span className={`text-sm transition-colors ${
                                  isActive ? "text-foreground" : "group-hover:text-cyan-700"
                                }`}>{item.title}</span>
                              </>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </ScrollArea>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <div className="p-3 border-t border-border mt-auto bg-card">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 hover:bg-muted hover:border-cyan-500/20 transition-all group"
              onClick={handleLogout}
            >
              <div className="p-1 rounded-md bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/20 group-hover:border-red-500/40 transition-all">
                <LogOut className="w-3.5 h-3.5 text-red-600" />
              </div>
              <span className="text-sm">Sair</span>
            </Button>
          </div>
        </Sidebar>

        <main className="flex-1 flex flex-col bg-background">
          <header className="h-14 border-b border-border flex items-center px-4 bg-card/50 backdrop-blur-sm">
            <SidebarTrigger />
          </header>
          <div className="flex-1 overflow-auto bg-background">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
