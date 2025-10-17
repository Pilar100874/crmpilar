import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

const MENUS_DISPONIVEIS = [
  "Dashboard",
  "Atendimento",
  "Clientes",
  "Campanhas",
  "Conteúdos",
  "Desenho",
  "Bot Builder",
  "Variáveis Globais",
  "Configurações",
];

const PERMISSIONS_LABELS = {
  view: "Visualizar",
  create: "Criar",
  edit: "Modificar",
  delete: "Excluir",
};

export const GruposAcessoCRUD = () => {
  const [grupos, setGrupos] = useState<GrupoAcesso[]>([]);
  const [nome, setNome] = useState("");
  const [menusPermitidos, setMenusPermitidos] = useState<Record<string, MenuPermissions>>({});
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchGrupos();
  }, []);

  const fetchGrupos = async () => {
    const { data, error } = await supabase
      .from("grupos_acesso")
      .select("*")
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
        menus_permitidos: typeof grupo.menus_permitidos === 'object' && grupo.menus_permitidos !== null && !Array.isArray(grupo.menus_permitidos)
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
        toast({
          title: "Erro ao atualizar",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Grupo atualizado com sucesso!" });
        resetForm();
        fetchGrupos();
      }
    } else {
      const { error } = await supabase
        .from("grupos_acesso")
        .insert([grupoData]);

      if (error) {
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
        fetchGrupos();
      }
    }
  };

  const resetForm = () => {
    setNome("");
    setMenusPermitidos({});
    setOpenMenus({});
    setEditingId(null);
  };

  const handleEdit = (grupo: GrupoAcesso) => {
    setNome(grupo.nome);
    setMenusPermitidos(grupo.menus_permitidos || {});
    // Open all menus that have at least one permission
    const openedMenus: Record<string, boolean> = {};
    Object.keys(grupo.menus_permitidos || {}).forEach(menu => {
      openedMenus[menu] = true;
    });
    setOpenMenus(openedMenus);
    setEditingId(grupo.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este grupo?")) return;

    const { error } = await supabase
      .from("grupos_acesso")
      .delete()
      .eq("id", id);

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
  };

  const toggleMenuOpen = (menu: string) => {
    setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const togglePermission = (menu: string, permission: keyof MenuPermissions) => {
    setMenusPermitidos(prev => {
      const menuPerms = prev[menu] || { view: false, create: false, edit: false, delete: false };
      const newPerms = { ...menuPerms, [permission]: !menuPerms[permission] };
      
      // If view is being disabled, disable all other permissions
      if (permission === 'view' && !newPerms.view) {
        newPerms.create = false;
        newPerms.edit = false;
        newPerms.delete = false;
      }
      
      // If any other permission is enabled, enable view
      if (permission !== 'view' && newPerms[permission]) {
        newPerms.view = true;
      }
      
      // If all permissions are false, remove the menu
      if (!newPerms.view && !newPerms.create && !newPerms.edit && !newPerms.delete) {
        const { [menu]: _, ...rest } = prev;
        return rest;
      }
      
      return { ...prev, [menu]: newPerms };
    });
  };

  const getPermissionsSummary = (permissions: Record<string, MenuPermissions>) => {
    const menus = Object.keys(permissions);
    if (menus.length === 0) return "Nenhum menu";
    
    return menus.map(menu => {
      const perms = permissions[menu];
      const activePerms = Object.entries(perms)
        .filter(([_, value]) => value)
        .map(([key]) => PERMISSIONS_LABELS[key as keyof MenuPermissions])
        .join(", ");
      return `${menu} (${activePerms})`;
    }).join(" • ");
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="grupo-nome">Nome do Grupo *</Label>
          <Input
            id="grupo-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Digite o nome do grupo"
            required
          />
        </div>

        <div>
          <Label>Menus e Permissões</Label>
          <div className="space-y-2 mt-2 border rounded-md p-3">
            {MENUS_DISPONIVEIS.map((menu) => {
              const menuPerms = menusPermitidos[menu] || { view: false, create: false, edit: false, delete: false };
              const isOpen = openMenus[menu];
              
              return (
                <Collapsible key={menu} open={isOpen} onOpenChange={() => toggleMenuOpen(menu)}>
                  <div className="flex items-center justify-between py-2 px-3 hover:bg-accent rounded-md">
                    <div className="flex items-center space-x-2 flex-1">
                      <Checkbox
                        id={`menu-${menu}-view`}
                        checked={menuPerms.view}
                        onCheckedChange={() => togglePermission(menu, 'view')}
                      />
                      <label
                        htmlFor={`menu-${menu}-view`}
                        className="text-sm font-medium cursor-pointer flex-1"
                      >
                        {menu}
                      </label>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-1 h-auto">
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  
                  <CollapsibleContent className="pl-8 pr-3 pb-2">
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`menu-${menu}-create`}
                          checked={menuPerms.create}
                          onCheckedChange={() => togglePermission(menu, 'create')}
                          disabled={!menuPerms.view}
                        />
                        <label
                          htmlFor={`menu-${menu}-create`}
                          className="text-sm cursor-pointer text-muted-foreground"
                        >
                          Criar
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`menu-${menu}-edit`}
                          checked={menuPerms.edit}
                          onCheckedChange={() => togglePermission(menu, 'edit')}
                          disabled={!menuPerms.view}
                        />
                        <label
                          htmlFor={`menu-${menu}-edit`}
                          className="text-sm cursor-pointer text-muted-foreground"
                        >
                          Modificar
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`menu-${menu}-delete`}
                          checked={menuPerms.delete}
                          onCheckedChange={() => togglePermission(menu, 'delete')}
                          disabled={!menuPerms.view}
                        />
                        <label
                          htmlFor={`menu-${menu}-delete`}
                          className="text-sm cursor-pointer text-muted-foreground"
                        >
                          Excluir
                        </label>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </div>

        <Button type="submit">
          {editingId ? "Atualizar" : <><Plus className="w-4 h-4 mr-2" /> Adicionar</>}
        </Button>
        {editingId && (
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            className="ml-2"
          >
            Cancelar
          </Button>
        )}
      </form>

      <div className="space-y-2">
        {grupos.map((grupo) => (
          <div
            key={grupo.id}
            className="flex items-start justify-between p-3 border rounded-md"
          >
            <div className="flex-1 pr-4">
              <div className="font-semibold">{grupo.nome}</div>
              <div className="text-sm text-muted-foreground mt-1 break-words">
                {getPermissionsSummary(grupo.menus_permitidos)}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(grupo)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(grupo.id)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};