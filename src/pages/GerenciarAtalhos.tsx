import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAtalhos } from "@/hooks/useAtalhos";
import { SubMenuHeader } from "@/components/SubMenuHeader";
import { LayoutContext } from "@/contexts/LayoutContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Star, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { menuStructure, MenuCategory } from "@/lib/menuStructure";

export default function GerenciarAtalhos() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { openSubmenu } = useContext(LayoutContext);
  const { atalhos, adicionarAtalho, removerAtalho, isAtalho, loading: atalhosLoading } = useAtalhos();
  const [menusPermitidos, setMenusPermitidos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadMenusPermitidos();
  }, []);

  useEffect(() => {
    // Expandir automaticamente TODAS as categorias com subitens
    const todasCategorias = new Set<string>();
    menuStructure.forEach(category => {
      if (category.subItems && category.subItems.length > 0) {
        todasCategorias.add(category.id);
      }
    });
    setExpandedCategories(todasCategorias);
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

      // Extrair IDs dos menus permitidos
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

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
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
    return menusPermitidos.has(menuId);
  };

  const hasPermittedSubItems = (category: MenuCategory) => {
    if (!category.subItems) return false;
    return category.subItems.some(subItem => isMenuPermitted(subItem.id));
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
          <div className="space-y-2">
            {menuStructure.map((category) => {
              // Menu sem subitens
              if (!category.subItems) {
                const isAdicionado = category.url && isAtalho(category.url);
                const IconComponent = category.icon;
                
                return (
                  <Card 
                    key={category.id}
                    className={`transition-all ${
                      isAdicionado ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {renderIcon(IconComponent)}
                          <p className="font-medium">{category.title}</p>
                        </div>
                        <Button
                          variant={isAdicionado ? "default" : "outline"}
                          size="icon"
                          onClick={() => handleToggleAtalho(category.title, IconComponent.name || "Star", category.url!)}
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
              }
              
              // Menu com subitens (categoria)
              const isExpanded = expandedCategories.has(category.id);
              const IconComponent = category.icon;
              
              return (
                <Collapsible
                  key={category.id}
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(category.id)}
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {renderIcon(IconComponent)}
                            <p className="font-medium">{category.title}</p>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-2">
                        {category.subItems?.map((subItem) => {
                          const isAdicionado = isAtalho(subItem.url);
                          const SubIconComponent = subItem.icon;
                          
                          return (
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
                                onClick={() => handleToggleAtalho(subItem.title, SubIconComponent.name || "Star", subItem.url)}
                              >
                                <Star
                                  className={`h-4 w-4 ${
                                    isAdicionado ? "fill-current" : ""
                                  }`}
                                />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removerAtalho(atalho.path)}
                  >
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
