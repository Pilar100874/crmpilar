import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAtalhos } from "@/hooks/useAtalhos";
import { SubMenuHeader } from "@/components/SubMenuHeader";
import { useLayout } from "@/contexts/LayoutContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Loader2 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { menuStructure, MenuCategory } from "@/lib/menuStructure";

export default function GerenciarAtalhos() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { openSubmenu } = useLayout();
  const {
    atalhos,
    adicionarAtalho,
    removerAtalho,
    isAtalho,
    loading: atalhosLoading,
  } = useAtalhos();

  const [menusPermitidos, setMenusPermitidos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMenusPermitidos();
  }, []);

  const loadMenusPermitidos = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar grupos de acesso do usuário pelo email
      const { data: userData } = await supabase
        .from("usuarios")
        .select("grupo_acesso_id, estabelecimento_id")
        .ilike("email", user.email || "")
        .maybeSingle();

      if (!userData) {
        toast({
          title: "Aviso",
          description: "Usuário não encontrado no sistema",
          variant: "destructive",
        });
        setMenusPermitidos(new Set());
        return;
      }

      if (!userData.estabelecimento_id) {
        toast({
          title: "Aviso",
          description: "Usuário sem estabelecimento definido",
          variant: "destructive",
        });
        setMenusPermitidos(new Set());
        return;
      }

      if (!userData.grupo_acesso_id) {
        toast({
          title: "Aviso",
          description: "Usuário sem grupo de acesso definido",
          variant: "destructive",
        });
        setMenusPermitidos(new Set());
        return;
      }

      // Buscar menus permitidos do grupo
      const { data: grupoData } = await supabase
        .from("grupos_acesso")
        .select("menus_permitidos")
        .eq("id", userData.grupo_acesso_id)
        .single();

      if (!grupoData?.menus_permitidos) {
        setMenusPermitidos(new Set());
        return;
      }

      const menusPermitidosIds = Object.keys(grupoData.menus_permitidos);
      setMenusPermitidos(new Set(menusPermitidosIds));
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

  const handleToggleAtalho = async (title: string, iconName: string, path: string) => {
    if (isAtalho(path)) {
      await removerAtalho(path);
    } else {
      await adicionarAtalho(title, iconName, path);
    }
  };

  const renderIcon = (IconComponent: any) => {
    return <IconComponent className="h-5 w-5" />;
  };

  const isMenuPermitted = (menuId: string) => {
    // Nesta tela mostramos todos os menus, independentemente do grupo de acesso
    return true;
  };
  const renderCategoriaComSubmenus = (category: MenuCategory) => {
    const IconComponent = category.icon;
    const rows: JSX.Element[] = [];

    // Linha da categoria (nível 0)
    if (!category.subItems || category.subItems.length === 0) {
      if (!category.url || !isMenuPermitted(category.id)) return null;
      const isAdicionado = isAtalho(category.url);

      rows.push(
        <div
          key={category.id}
          className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
            isAdicionado ? "border-primary bg-primary/5" : "bg-card"
          }`}
        >
          <div className="flex items-center gap-3">
            {renderIcon(IconComponent)}
            <p className="font-medium text-sm">{category.title}</p>
          </div>
          <Button
            variant={isAdicionado ? "default" : "outline"}
            size="icon"
            onClick={() => handleToggleAtalho(category.title, IconComponent.name || "Star", category.url!)}
          >
            <Star className={`h-4 w-4 ${isAdicionado ? "fill-current" : ""}`} />
          </Button>
        </div>
      );
    } else {
      // Cabeçalho da categoria (agrupador, sempre visível)
      rows.push(
        <div
          key={category.id}
          className="flex items-center gap-3 py-2 border-b border-border/40 mb-1"
        >
          {renderIcon(IconComponent)}
          <p className="font-semibold text-sm">{category.title}</p>
        </div>
      );

      // Todos os submenus de primeiro nível, SEM esconder nada
      category.subItems.forEach((subItem) => {
        if (!isMenuPermitted(subItem.id)) return;
        const isAdicionado = isAtalho(subItem.url);
        const SubIconComponent = subItem.icon;

        rows.push(
          <div
            key={subItem.id}
            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
              isAdicionado ? "border-primary bg-primary/5" : "bg-card"
            }`}
          >
            <div className="flex items-center gap-3 ml-4">
              {renderIcon(SubIconComponent)}
              <p className="font-medium text-sm">{subItem.title}</p>
            </div>
            <Button
              variant={isAdicionado ? "default" : "outline"}
              size="icon"
              onClick={() =>
                handleToggleAtalho(subItem.title, SubIconComponent.name || "Star", subItem.url)
              }
            >
              <Star className={`h-4 w-4 ${isAdicionado ? "fill-current" : ""}`} />
            </Button>
          </div>
        );
      });
    }

    return <div key={`wrap-${category.id}`} className="space-y-1">{rows}</div>;
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
          <CardTitle>Menus Disponíveis</CardTitle>
          <CardDescription>
            Adicione ou remova atalhos para acessar rapidamente suas telas favoritas.
            Todos os menus do sistema são exibidos aqui automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {menuStructure.map((category) => renderCategoriaComSubmenus(category))}
          </div>
        </CardContent>
      </Card>

      {atalhos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Atalhos Ativos</CardTitle>
            <CardDescription>
              {atalhos.length} {atalhos.length === 1 ? "atalho" : "atalhos"} adicionado
              {atalhos.length === 1 ? "" : "s"} ao menu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {atalhos.map((atalho) => {
                const IconComponent = (LucideIcons as any)[atalho.icone] || LucideIcons.Star;

                return (
                  <div
                    key={atalho.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      {renderIcon(IconComponent)}
                      <p className="font-medium">{atalho.titulo}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removerAtalho(atalho.path)}>
                      Remover
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
