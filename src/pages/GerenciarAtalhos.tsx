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

interface SubMenuItem {
  id: string;
  title: string;
  url: string;
  icon: any;
}

interface MenuCategory {
  id: string;
  title: string;
  icon: any;
  url?: string;
  subItems?: SubMenuItem[];
}

// Estrutura de menus igual ao Layout.tsx
const menuStructure: MenuCategory[] = [
  { id: "Dashboard", title: "Painel", url: "/dashboard", icon: LucideIcons.LayoutDashboard },
  { id: "Clientes", title: "Funil", url: "/funil", icon: LucideIcons.Users },
  { 
    id: "Atendimento",
    title: "Chats", 
    icon: LucideIcons.MessageSquare,
    subItems: [
      { id: "Painel Chats", title: "Painel", url: "/atendimento", icon: LucideIcons.MessageSquare },
      { id: "Dashboard Atendente", title: "Dashboard Atendente", url: "/dashboard-atendente", icon: LucideIcons.Users },
      { id: "Dashboard Supervisor", title: "Dashboard Supervisor", url: "/dashboard-supervisor", icon: LucideIcons.LayoutDashboard },
      { id: "Monitor de Filas", title: "Monitor de Filas", url: "/monitor-filas", icon: LucideIcons.Activity },
    ]
  },
  { id: "Campanhas", title: "Calendário", url: "/calendario", icon: LucideIcons.Megaphone },
  { id: "Orçamentos", title: "Orçamentos", url: "/orcamentos", icon: LucideIcons.FileBarChart },
  { 
    id: "Conteúdos",
    title: "Listas", 
    icon: LucideIcons.FileText,
    subItems: [
      { id: "Contatos", title: "Contatos", url: "/contatos", icon: LucideIcons.User },
      { id: "Empresas", title: "Empresas", url: "/empresas", icon: LucideIcons.Building2 },
      { id: "Todos", title: "Todos", url: "/todos", icon: LucideIcons.Users },
      { id: "Vínculos Empresas", title: "Vínculo Empresas X Usuário / Segmento", url: "/vinculos-empresas", icon: LucideIcons.Building2 },
      { id: "Vínculos Contatos", title: "Vínculo Contatos X Usuário / Segmento", url: "/vinculos-contatos", icon: LucideIcons.User },
    ]
  },
  { 
    id: "Email",
    title: "E-mail", 
    icon: LucideIcons.Mail,
    subItems: [
      { id: "Caixa de Entrada", title: "Caixa de Entrada", url: "/email/inbox", icon: LucideIcons.MessageSquare },
      { id: "Enviados", title: "Enviados", url: "/email/sent", icon: LucideIcons.MessageSquare },
      { id: "Arquivados", title: "Arquivados", url: "/email/archive", icon: LucideIcons.MessageSquare },
      { id: "Lixeira", title: "Lixeira", url: "/email/trash", icon: LucideIcons.MessageSquare },
    ]
  },
  { 
    id: "Bot Test", 
    title: "Bot", 
    icon: LucideIcons.Workflow,
    subItems: [
      { id: "Criar Bot", title: "Criar / Editar", url: "/bot-create", icon: LucideIcons.Plus },
      { id: "Testar", title: "Testar", url: "/bot-test", icon: LucideIcons.TestTube2 },
    ]
  },
  { 
    id: "Desenho", 
    title: "Marketing", 
    icon: LucideIcons.Target,
    subItems: [
      { id: "Canvas", title: "Canvas", url: "/marketing/canvas", icon: LucideIcons.Palette },
      { id: "Automações", title: "Automações", url: "/marketing/automacoes", icon: LucideIcons.Zap },
      { id: "Campanhas Marketing", title: "Campanhas", url: "/marketing/campanhas", icon: LucideIcons.Megaphone },
    ]
  },
  { id: "Relatórios", title: "Relatórios", url: "/relatorios", icon: LucideIcons.FileText },
  { id: "Importação Produtos", title: "Importação de Produtos de Terceiro", url: "/importacao-produtos", icon: LucideIcons.Upload },
  { 
    id: "Telefonia",
    title: "Telefonia", 
    icon: LucideIcons.Phone,
    subItems: [
      { id: "Softphone", title: "Softphone", url: "/softphone", icon: LucideIcons.Phone },
      { id: "Videochamada", title: "Videochamada", url: "/videocall", icon: LucideIcons.Video },
    ]
  },
  { 
    id: "Configurações",
    title: "Configurações", 
    icon: LucideIcons.Settings,
    subItems: [
      { id: "Config Geral", title: "Configurações", url: "/config", icon: LucideIcons.Settings },
      { id: "Config Skills", title: "Skills de Atendimento", url: "/config/skills", icon: LucideIcons.Users },
      { id: "Omnichannel Builder", title: "Workflow Builder Omnichannel", url: "/omnichannel-builder", icon: LucideIcons.Workflow },
      { id: "Teste de Webhooks", title: "Teste de Webhooks", url: "/config/webhooks", icon: LucideIcons.Globe },
      { id: "Variáveis Globais", title: "Variáveis Globais", url: "/config/variaveis", icon: LucideIcons.FileText },
      { id: "Teste Campanhas", title: "Teste Campanhas", url: "/config/campanhas", icon: LucideIcons.Megaphone },
    ]
  },
];

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
    // Expandir automaticamente categorias com subitens permitidos
    if (menusPermitidos.size > 0) {
      const categoriasComPermissao = new Set<string>();
      menuStructure.forEach(category => {
        if (category.subItems && hasPermittedSubItems(category)) {
          categoriasComPermissao.add(category.id);
        }
      });
      setExpandedCategories(categoriasComPermissao);
    }
  }, [menusPermitidos]);

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
            Apenas os menus que você tem permissão são exibidos aqui.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {menusPermitidos.size === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum menu disponível para adicionar aos atalhos.
            </p>
          ) : (
            <div className="space-y-2">
              {menuStructure.map((category) => {
                // Menu sem subitens
                if (!category.subItems) {
                  if (!isMenuPermitted(category.id)) return null;
                  
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
                if (!hasPermittedSubItems(category)) return null;
                
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
                            if (!isMenuPermitted(subItem.id)) return null;
                            
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
