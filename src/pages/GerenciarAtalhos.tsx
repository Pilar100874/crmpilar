import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAtalhos } from "@/hooks/useAtalhos";
import { SubMenuHeader } from "@/components/SubMenuHeader";
import { LayoutContext } from "@/contexts/LayoutContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Loader2 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MENU_CONFIG } from "@/lib/menus";

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

export default function GerenciarAtalhos() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { openSubmenu } = useContext(LayoutContext);
  const { atalhos, adicionarAtalho, removerAtalho, isAtalho, loading: atalhosLoading } = useAtalhos();
  const [menusPermitidos, setMenusPermitidos] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMenusPermitidos();
  }, []);

  const loadMenusPermitidos = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar grupos de acesso do usuário pelo email
      const { data: userData } = await supabase
        .from("usuarios")
        .select("grupo_acesso_id, estabelecimento_id")
        .ilike("email", user.email || "")
        .maybeSingle();

      if (!userData?.grupo_acesso_id) {
        toast({
          title: "Aviso",
          description: "Usuário sem grupo de acesso definido",
          variant: "destructive",
        });
        return;
      }

      // Buscar menus permitidos do grupo
      const { data: grupoData } = await supabase
        .from("grupos_acesso")
        .select("menus_permitidos")
        .eq("id", userData.grupo_acesso_id)
        .single();

      if (!grupoData?.menus_permitidos) {
        setMenusPermitidos([]);
        return;
      }

      // Mapear menus permitidos com seus dados do MENU_CONFIG
      const menusPermitidosIds = Object.keys(grupoData.menus_permitidos);
      const menusDisponiveis: MenuItem[] = [];

      menusPermitidosIds.forEach((menuId) => {
        const menuConfig = MENU_CONFIG.find(m => m.id === menuId);
        if (menuConfig) {
          menusDisponiveis.push({
            id: menuId,
            label: menuConfig.label,
            icon: getIconForMenu(menuId),
            path: getPathForMenu(menuId),
          });
        }
      });

      setMenusPermitidos(menusDisponiveis);
    } catch (error) {
      console.error("Erro ao carregar menus permitidos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os menus disponíveis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getIconForMenu = (menuId: string): string => {
    const iconMap: Record<string, string> = {
      dashboard: "LayoutDashboard",
      contatos: "Users",
      empresas: "Building2",
      campanhas: "Megaphone",
      conteudos: "FileText",
      calendario: "Calendar",
      funil: "TrendingUp",
      orcamentos: "FileSpreadsheet",
      bot_builder: "Bot",
      bot_test: "TestTube",
      marketing_canvas: "Palette",
      marketing_automacoes: "Workflow",
      relatorios: "BarChart3",
      email: "Mail",
      telefonia_softphone: "Phone",
      telefonia_videochamada: "Video",
      atendimento: "MessageSquare",
      atendimento_dashboard: "BarChart",
      atendimento_supervisor: "Shield",
      atendimento_filas: "Users",
      omnichannel_builder: "Network",
      global_variables: "Settings",
    };
    return iconMap[menuId] || "Circle";
  };

  const getPathForMenu = (menuId: string): string => {
    const pathMap: Record<string, string> = {
      dashboard: "/",
      contatos: "/contatos",
      empresas: "/empresas",
      campanhas: "/campanhas",
      conteudos: "/conteudos",
      calendario: "/calendario",
      funil: "/funil",
      orcamentos: "/orcamentos",
      bot_builder: "/bot-builder",
      bot_test: "/bot-test",
      marketing_canvas: "/marketing/canvas",
      marketing_automacoes: "/marketing/automacoes",
      relatorios: "/relatorios",
      email: "/email",
      telefonia_softphone: "/softphone",
      telefonia_videochamada: "/videocall",
      atendimento: "/atendimento",
      atendimento_dashboard: "/dashboard-atendente",
      atendimento_supervisor: "/dashboard-supervisor",
      atendimento_filas: "/monitorar-filas",
      omnichannel_builder: "/omnichannel-builder",
      global_variables: "/global-variables",
    };
    return pathMap[menuId] || "/";
  };

  const handleToggleAtalho = async (menu: MenuItem) => {
    if (isAtalho(menu.path)) {
      await removerAtalho(menu.path);
    } else {
      await adicionarAtalho(menu.label, menu.icon, menu.path);
    }
  };

  const renderIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="h-5 w-5" /> : <LucideIcons.Circle className="h-5 w-5" />;
  };

  if (loading || atalhosLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <SubMenuHeader 
        title="Gerenciar Atalhos" 
        onOpenSubmenu={() => openSubmenu?.("atalhos")}
      />

      <Card>
        <CardHeader>
          <CardTitle>Meus Atalhos</CardTitle>
          <CardDescription>
            Adicione ou remova atalhos para acessar rapidamente suas telas favoritas.
            Apenas os menus que você tem permissão são exibidos aqui.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {menusPermitidos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum menu disponível para adicionar aos atalhos.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menusPermitidos.map((menu) => {
                const isAdicionado = isAtalho(menu.path);
                return (
                  <Card 
                    key={menu.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isAdicionado ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {renderIcon(menu.icon)}
                          <div>
                            <p className="font-medium">{menu.label}</p>
                            <p className="text-xs text-muted-foreground">{menu.path}</p>
                          </div>
                        </div>
                        <Button
                          variant={isAdicionado ? "default" : "outline"}
                          size="icon"
                          onClick={() => handleToggleAtalho(menu)}
                        >
                          <Star
                            className={`h-4 w-4 ${
                              isAdicionado ? "fill-current" : ""
                            }`}
                          />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {atalhos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Atalhos Ativos</CardTitle>
            <CardDescription>
              {atalhos.length} {atalhos.length === 1 ? "atalho" : "atalhos"} adicionado{atalhos.length === 1 ? "" : "s"} ao menu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {atalhos.map((atalho) => (
                <div
                  key={atalho.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    {renderIcon(atalho.icone)}
                    <div>
                      <p className="font-medium">{atalho.titulo}</p>
                      <p className="text-xs text-muted-foreground">{atalho.path}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removerAtalho(atalho.path)}
                  >
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
