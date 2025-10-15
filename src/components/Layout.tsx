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
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
        <Sidebar className="border-r border-slate-800 bg-black">
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-white">Pilar BOT</h2>
                <p className="text-xs text-slate-400">Atendimento IA</p>
              </div>
            </div>
          </div>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-slate-400">Menu Principal</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className={({ isActive }) =>
                            isActive
                              ? "bg-cyan-600/20 text-cyan-400 border-l-2 border-cyan-500"
                              : "text-white hover:bg-slate-900/50"
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

          <div className="p-4 border-t border-slate-800 mt-auto">
            <Button
              variant="outline"
              className="w-full justify-start bg-slate-900 border-slate-700 text-white hover:bg-slate-800 hover:text-white"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </Sidebar>

        <main className="flex-1 flex flex-col bg-slate-900">
          <header className="h-14 border-b border-slate-800 flex items-center px-4 bg-slate-950">
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
