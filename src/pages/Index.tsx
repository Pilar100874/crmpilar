import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Users, Calendar, FileText, Settings, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import logo from "@/assets/logo.jpg";
import logoFallback from "@/assets/logo_preto.png";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: usuario } = await supabase
          .from("usuarios")
          .select("id")
          .eq("auth_user_id", session.user.id)
          .maybeSingle();
        if (usuario) {
          const { getInitialRouteForUsuario } = await import("@/lib/telaCustomizadaRedirect");
          navigate(await getInitialRouteForUsuario(usuario.id));
        } else {
          navigate("/dashboard");
        }
      }
    };
    checkUser();
  }, [navigate]);

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: MessageSquare, label: "Atendimento", path: "/atendimento" },
    { icon: Users, label: "Contatos", path: "/contatos" },
    { icon: Calendar, label: "Calendário", path: "/campanhas" },
    { icon: FileText, label: "Orçamentos", path: "/orcamentos" },
    { icon: Settings, label: "Configurações", path: "/config" },
  ];

  return (
    <div className="min-h-screen bg-background dark:bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-5xl w-full space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center mb-4">
            <img src={logo} alt="Logo" className="h-24 w-auto" onError={(e) => { (e.currentTarget as HTMLImageElement).src = logoFallback; }} />
          </div>
          <h1 className="text-4xl font-light tracking-tight text-foreground">
            Sistema de Gestão
          </h1>
          <p className="text-lg text-muted-foreground font-light">
            Plataforma integrada para gestão de negócios
          </p>
        </div>

        {/* Quick Access Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuItems.map((item) => (
            <Card 
              key={item.path}
              className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-border/50 hover:border-primary/50 bg-card/50 backdrop-blur"
              onClick={() => navigate(item.path)}
            >
              <div className="p-6 flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {item.label}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Login Button */}
        <div className="text-center pt-8">
          <Button 
            onClick={() => navigate("/login")}
            size="lg"
            className="px-8"
          >
            Fazer Login
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
