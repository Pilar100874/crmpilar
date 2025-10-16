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
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logo from "@/assets/logo_branco.png";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Atendimento", url: "/atendimento", icon: MessageSquare },
  { title: "CRIAR BOT", url: "/bot-builder", icon: Workflow },
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
      <div className="min-h-screen flex w-full bg-slate-900">
        <Sidebar className="border-r border-slate-700/50 bg-slate-900">
          <div className="p-6 border-b border-slate-700/50 bg-slate-900">
            <div className="flex items-center gap-3">
              <img 
                src={logo} 
                alt="Pilar Logo" 
                className="h-11 w-auto"
              />
              <div>
                <h2 className="font-bold text-lg text-white">Bot</h2>
                <p className="text-xs text-slate-400">Atendimento IA</p>
              </div>
            </div>
          </div>

          <SidebarContent className="bg-slate-900">
            <SidebarGroup>
              <SidebarGroupLabel className="text-slate-400 bg-slate-900 uppercase text-xs">Menu Principal</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className={({ isActive }) =>
                            isActive
                              ? "bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-white border-l-2 border-cyan-500 font-medium"
                              : "text-white hover:bg-slate-800/50 hover:text-cyan-400 transition-colors"
                          }
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <div className="p-4 border-t border-slate-700/50 mt-auto bg-slate-900">
            <Button
              variant="outline"
              className="w-full justify-start bg-slate-800 border-slate-700 text-white hover:bg-slate-700 hover:text-white"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </Sidebar>

        <main className="flex-1 flex flex-col bg-slate-900">
          <header className="h-14 border-b border-slate-700/50 flex items-center px-4 bg-slate-800/50 backdrop-blur-sm">
            <SidebarTrigger className="text-white" />
          </header>
          <div className="flex-1 overflow-auto bg-slate-900">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
