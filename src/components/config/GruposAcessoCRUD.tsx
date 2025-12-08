import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus, ChevronDown, ChevronRight, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MENU_CONFIG, getMenusByCategory, CATEGORY_ORDER, MenuConfigItem } from "@/lib/menus";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MenuPermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

interface GrupoAcesso {
  id: string;
  nome: string;
  menus_permitidos: Record<string, MenuPermissions>;
}

interface GruposAcessoCRUDProps {
  estabelecimentoId?: string;
}

const PERMISSION_KEYS = ['view', 'create', 'edit', 'delete'] as const;
const PERMISSION_LABELS: Record<string, string> = {
  view: 'Ver',
  create: 'Criar',
  edit: 'Editar',
  delete: 'Excluir',
};

const PERMISSION_LABELS_SHORT: Record<string, string> = {
  view: 'V',
  create: 'C',
  edit: 'E',
  delete: 'X',
};

export const GruposAcessoCRUD = ({ estabelecimentoId }: GruposAcessoCRUDProps) => {
  const [grupos, setGrupos] = useState<GrupoAcesso[]>([]);
  const [nome, setNome] = useState("");
  const [menusPermitidos, setMenusPermitidos] = useState<Record<string, MenuPermissions>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [grupoToDelete, setGrupoToDelete] = useState<GrupoAcesso | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const menusByCategory = getMenusByCategory();

  useEffect(() => {
    fetchGrupos();
    // Expandir todas as categorias por padrão
    const initialExpanded: Record<string, boolean> = {};
    CATEGORY_ORDER.forEach(cat => {
      initialExpanded[cat] = true;
    });
    setExpandedCategories(initialExpanded);
  }, [estabelecimentoId]);

  const fetchGrupos = async () => {
    const targetEstabelecimentoId = await getEstabelecimentoId(estabelecimentoId);
    if (!targetEstabelecimentoId) return;

    const { data, error } = await supabase
      .from("grupos_acesso")
      .select("*")
      .eq('estabelecimento_id', targetEstabelecimentoId)
      .order("nome");

    if (error) {
      toast({
        title: "Erro ao carregar grupos",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setGrupos((data || []).map(grupo => ({
        id: grupo.id,
        nome: grupo.nome,
        menus_permitidos: typeof grupo.menus_permitidos === 'object' && 
          grupo.menus_permitidos !== null && 
          !Array.isArray(grupo.menus_permitidos)
          ? (grupo.menus_permitidos as unknown as Record<string, MenuPermissions>)
          : {}
      })));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, preencha o nome do grupo",
        variant: "destructive",
      });
      return;
    }

    const grupoData = {
      nome,
      menus_permitidos: menusPermitidos as any,
    };

    if (editingId) {
      const { error } = await supabase
        .from("grupos_acesso")
        .update(grupoData)
        .eq("id", editingId);

      if (error) {
        console.error("Erro ao atualizar grupo:", error);
        toast({
          title: "Erro ao atualizar",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Grupo atualizado com sucesso!" });
        resetForm();
        await fetchGrupos();
      }
    } else {
      const targetEstabelecimentoId = await getEstabelecimentoId(estabelecimentoId);
      
      if (!targetEstabelecimentoId) {
        toast({
          title: "Erro",
          description: "Selecione um estabelecimento primeiro",
          variant: "destructive",
        });
        return;
      }

      const dataToInsert = { ...grupoData, estabelecimento_id: targetEstabelecimentoId };

      const { error } = await supabase
        .from("grupos_acesso")
        .insert([dataToInsert]);

      if (error) {
        console.error("Erro ao criar grupo:", error);
        const errorMsg = error.message.includes('grupos_acesso_nome_unique') 
          ? 'Já existe um grupo de acesso com este nome'
          : error.message;
        toast({
          title: "Erro ao criar",
          description: errorMsg,
          variant: "destructive",
        });
      } else {
        toast({ title: "Grupo criado com sucesso!" });
        resetForm();
        await fetchGrupos();
      }
    }
  };

  const resetForm = () => {
    setNome("");
    setMenusPermitidos({});
    setEditingId(null);
  };

  const handleEdit = (grupo: GrupoAcesso) => {
    setNome(grupo.nome);
    setMenusPermitidos(grupo.menus_permitidos || {});
    setEditingId(grupo.id);
  };

  const handleDeleteClick = (grupo: GrupoAcesso) => {
    setGrupoToDelete(grupo);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!grupoToDelete) return;

    setIsDeleting(true);

    const { data: usuarios, error: checkError } = await supabase
      .from("usuarios")
      .select("id")
      .eq("grupo_acesso_id", grupoToDelete.id)
      .limit(1);

    if (checkError) {
      toast({
        title: "Erro ao verificar vínculos",
        description: checkError.message,
        variant: "destructive",
      });
      setIsDeleting(false);
      return;
    }

    if (usuarios && usuarios.length > 0) {
      toast({
        title: "Não é possível excluir",
        description: "Este grupo possui usuários vinculados. Remova os vínculos primeiro.",
        variant: "destructive",
      });
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setGrupoToDelete(null);
      return;
    }

    const { error } = await supabase
      .from("grupos_acesso")
      .delete()
      .eq("id", grupoToDelete.id);

    setIsDeleting(false);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Grupo excluído com sucesso!" });
      fetchGrupos();
    }

    setDeleteDialogOpen(false);
    setGrupoToDelete(null);
  };

  const togglePermission = (menu: string, permission: keyof MenuPermissions) => {
    setMenusPermitidos((prev) => {
      const current = prev[menu] || { view: false, create: false, edit: false, delete: false };
      
      if (permission === 'view' && current.view) {
        const newPerms = { ...prev };
        delete newPerms[menu];
        return newPerms;
      }
      
      const newPermissions = {
        ...current,
        [permission]: !current[permission],
      };
      
      if (permission !== 'view' && !current[permission]) {
        newPermissions.view = true;
      }
      
      return {
        ...prev,
        [menu]: newPermissions,
      };
    });
  };

  const toggleAllPermissionsForMenu = (menu: string) => {
    setMenusPermitidos((prev) => {
      const current = prev[menu] || { view: false, create: false, edit: false, delete: false };
      const allChecked = PERMISSION_KEYS.every(k => current[k]);
      
      if (allChecked) {
        const newPerms = { ...prev };
        delete newPerms[menu];
        return newPerms;
      } else {
        return {
          ...prev,
          [menu]: { view: true, create: true, edit: true, delete: true },
        };
      }
    });
  };

  const toggleCategoryPermissions = (category: string, permission: keyof MenuPermissions) => {
    const menus = menusByCategory[category] || [];
    setMenusPermitidos((prev) => {
      const newPerms = { ...prev };
      const allHavePermission = menus.every(m => prev[m.id]?.[permission]);
      
      menus.forEach(menu => {
        const current = newPerms[menu.id] || { view: false, create: false, edit: false, delete: false };
        
        if (allHavePermission) {
          if (permission === 'view') {
            delete newPerms[menu.id];
          } else {
            newPerms[menu.id] = { ...current, [permission]: false };
          }
        } else {
          newPerms[menu.id] = { 
            ...current, 
            [permission]: true,
            view: permission === 'view' ? true : current.view || true
          };
        }
      });
      
      return newPerms;
    });
  };

  const getMenuLabel = (menuId: string) => {
    const menuConfig = MENU_CONFIG.find(m => m.id === menuId);
    return menuConfig ? menuConfig.label : menuId;
  };

  const selectAll = () => {
    const allPermissions: Record<string, MenuPermissions> = {};
    MENU_CONFIG.forEach(menu => {
      allPermissions[menu.id] = { view: true, create: true, edit: true, delete: true };
    });
    setMenusPermitidos(allPermissions);
  };

  const clearAll = () => {
    setMenusPermitidos({});
  };

  const hasAnyPermission = Object.keys(menusPermitidos).length > 0;

  const countPermissionsInCategory = (category: string) => {
    const menus = menusByCategory[category] || [];
    return menus.filter(m => menusPermitidos[m.id]?.view).length;
  };

  const getPermissionIcon = (checked: boolean) => {
    return checked ? (
      <Check className="w-3 h-3 text-primary" />
    ) : (
      <X className="w-3 h-3 text-muted-foreground/50" />
    );
  };

  const renderMenuRow = (menu: MenuConfigItem) => {
    const permissions = menusPermitidos[menu.id] || { view: false, create: false, edit: false, delete: false };
    const hasAnyMenuPermission = Object.values(permissions).some(p => p);
    const allChecked = PERMISSION_KEYS.every(k => permissions[k]);

    return (
      <div 
        key={menu.id} 
        className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg border transition-all ${
          hasAnyMenuPermission ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-background'
        }`}
      >
        {/* Menu Name */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => toggleAllPermissionsForMenu(menu.id)}
            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
              allChecked ? 'bg-primary border-primary' : 'border-muted-foreground/30 hover:border-primary/50'
            }`}
          >
            {allChecked && <Check className="w-3 h-3 text-primary-foreground" />}
          </button>
          <span className="text-sm font-medium truncate">{menu.label}</span>
        </div>

        {/* Permissions - Desktop */}
        <div className="hidden sm:flex items-center gap-3">
          {PERMISSION_KEYS.map((perm) => (
            <label
              key={perm}
              className="flex items-center gap-1.5 cursor-pointer select-none"
            >
              <Checkbox
                id={`${menu.id}-${perm}`}
                checked={permissions[perm]}
                onCheckedChange={() => togglePermission(menu.id, perm)}
                className="w-4 h-4"
              />
              <span className="text-xs text-muted-foreground">{PERMISSION_LABELS[perm]}</span>
            </label>
          ))}
        </div>

        {/* Permissions - Mobile */}
        <div className="flex sm:hidden items-center gap-1 flex-wrap">
          {PERMISSION_KEYS.map((perm) => (
            <button
              key={perm}
              type="button"
              onClick={() => togglePermission(menu.id, perm)}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                permissions[perm] 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              {PERMISSION_LABELS_SHORT[perm]}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const formatPermissionsCompact = (permissions: Record<string, MenuPermissions>) => {
    const count = Object.keys(permissions).filter(k => permissions[k]?.view).length;
    return `${count} menu${count !== 1 ? 's' : ''} com acesso`;
  };

  return (
    <div className="space-y-6">
      {/* Lista de Grupos Cadastrados - Primeiro */}
      <Card className="p-4">
        <h3 className="text-base font-semibold mb-4">Grupos Cadastrados</h3>
        <div className="space-y-2">
          {grupos.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Nenhum grupo cadastrado ainda
            </div>
          ) : (
            grupos.map((grupo) => (
              <Card
                key={grupo.id}
                className={`p-3 hover:shadow-md transition-shadow cursor-pointer ${
                  editingId === grupo.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleEdit(grupo)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{grupo.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {Object.keys(grupo.menus_permitidos || {}).length > 0 
                        ? formatPermissionsCompact(grupo.menus_permitidos)
                        : "Nenhuma permissão definida"}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(grupo)}
                      className="h-8 w-8"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(grupo)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome do Grupo */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <Label htmlFor="grupo-nome" className="text-sm font-medium">
                {editingId ? 'Editando Grupo' : 'Novo Grupo'} *
              </Label>
              <Input
                id="grupo-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Digite o nome do grupo"
                className="mt-1"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                {editingId ? "Salvar" : <><Plus className="w-4 h-4 mr-1" /> Criar</>}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Permissões por Menu */}
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <Label className="text-sm font-medium">Permissões por Menu</Label>
                <p className="text-xs text-muted-foreground">
                  Selecione as permissões para cada menu
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={selectAll} className="text-xs h-7">
                  Marcar Todos
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={clearAll} disabled={!hasAnyPermission} className="text-xs h-7">
                  Limpar
                </Button>
              </div>
            </div>

            {/* Legenda */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground border-b pb-2 flex-wrap">
              <span className="font-medium">Legenda:</span>
              <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 bg-muted rounded text-[10px]">V</span> Ver</span>
              <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 bg-muted rounded text-[10px]">C</span> Criar</span>
              <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 bg-muted rounded text-[10px]">E</span> Editar</span>
              <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 bg-muted rounded text-[10px]">X</span> Excluir</span>
            </div>
            
            {/* Categorias e Menus */}
            <div className="space-y-3">
              {CATEGORY_ORDER.map((category) => {
                const menus = menusByCategory[category];
                if (!menus || menus.length === 0) return null;

                const isExpanded = expandedCategories[category] !== false;
                const permissionCount = countPermissionsInCategory(category);

                return (
                  <Collapsible
                    key={category}
                    open={isExpanded}
                    onOpenChange={(open) => 
                      setExpandedCategories(prev => ({ ...prev, [category]: open }))
                    }
                  >
                    <div className="border rounded-lg overflow-hidden">
                      {/* Category Header */}
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="w-full flex items-center justify-between p-2.5 bg-muted/50 hover:bg-muted/70 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            <span className="font-semibold text-sm">{category}</span>
                            {permissionCount > 0 && (
                              <Badge variant="secondary" className="text-xs h-5">
                                {permissionCount}/{menus.length}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Quick Category Toggle */}
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            {PERMISSION_KEYS.map((perm) => {
                              const allHave = menus.every(m => menusPermitidos[m.id]?.[perm]);
                              return (
                                <button
                                  key={perm}
                                  type="button"
                                  onClick={() => toggleCategoryPermissions(category, perm)}
                                  className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                                    allHave 
                                      ? 'bg-primary text-primary-foreground' 
                                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                  }`}
                                >
                                  {PERMISSION_LABELS_SHORT[perm]}
                                </button>
                              );
                            })}
                          </div>
                        </button>
                      </CollapsibleTrigger>

                      {/* Category Content */}
                      <CollapsibleContent>
                        <div className="p-2 space-y-1.5 bg-background">
                          {menus.map((menu) => {
                            const permissions = menusPermitidos[menu.id] || { view: false, create: false, edit: false, delete: false };
                            const hasAnyMenuPermission = Object.values(permissions).some(p => p);
                            const allChecked = PERMISSION_KEYS.every(k => permissions[k]);

                            return (
                              <div 
                                key={menu.id} 
                                className={`flex items-center justify-between gap-2 p-2 rounded-md border transition-all ${
                                  hasAnyMenuPermission ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-background'
                                }`}
                              >
                                {/* Menu Name with toggle all */}
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => toggleAllPermissionsForMenu(menu.id)}
                                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                      allChecked ? 'bg-primary border-primary' : 'border-muted-foreground/30 hover:border-primary/50'
                                    }`}
                                  >
                                    {allChecked && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                                  </button>
                                  <span className="text-xs font-medium truncate">{menu.label}</span>
                                </div>

                                {/* Permissions Buttons */}
                                <div className="flex items-center gap-1 shrink-0">
                                  {PERMISSION_KEYS.map((perm) => (
                                    <button
                                      key={perm}
                                      type="button"
                                      onClick={() => togglePermission(menu.id, perm)}
                                      className={`w-6 h-6 text-[10px] rounded border transition-colors ${
                                        permissions[perm] 
                                          ? 'bg-primary text-primary-foreground border-primary' 
                                          : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/50'
                                      }`}
                                    >
                                      {PERMISSION_LABELS_SHORT[perm]}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        </Card>
      </form>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        itemName={grupoToDelete?.nome}
        isLoading={isDeleting}
      />
    </div>
  );
};
