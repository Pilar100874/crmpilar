import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MENUS_DISPONIVEIS } from "@/lib/menus";

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

export const GruposAcessoCRUD = () => {
  const [grupos, setGrupos] = useState<GrupoAcesso[]>([]);
  const [nome, setNome] = useState("");
  const [menusPermitidos, setMenusPermitidos] = useState<Record<string, MenuPermissions>>({});
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
    setEditingId(null);
  };

  const handleEdit = (grupo: GrupoAcesso) => {
    setNome(grupo.nome);
    setMenusPermitidos(grupo.menus_permitidos || {});
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

  const togglePermission = (menu: string, permission: keyof MenuPermissions) => {
    setMenusPermitidos((prev) => {
      const current = prev[menu] || { view: false, create: false, edit: false, delete: false };
      
      // If unchecking view, uncheck all permissions
      if (permission === 'view' && current.view) {
        const newPerms = { ...prev };
        delete newPerms[menu];
        return newPerms;
      }
      
      // If checking any permission, ensure view is also checked
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

  const getPermissionLabel = (key: keyof MenuPermissions) => {
    const labels = {
      view: 'Visualizar',
      create: 'Criar',
      edit: 'Modificar',
      delete: 'Excluir',
    };
    return labels[key];
  };

  const formatPermissions = (permissions: Record<string, MenuPermissions>) => {
    return Object.entries(permissions)
      .map(([menu, perms]) => {
        const actions = Object.entries(perms)
          .filter(([, value]) => value)
          .map(([key]) => getPermissionLabel(key as keyof MenuPermissions))
          .join(', ');
        return `${menu} (${actions})`;
      })
      .join(' | ');
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
          <Label className="text-base mb-3 block">Permissões por Menu</Label>
          <div className="space-y-3">
            {MENUS_DISPONIVEIS.map((menu) => {
              const permissions = menusPermitidos[menu] || { view: false, create: false, edit: false, delete: false };
              
              return (
                <Card key={menu} className="p-4">
                  <div className="font-medium mb-3">{menu}</div>
                  <div className="grid grid-cols-4 gap-4">
                    {(['view', 'create', 'edit', 'delete'] as const).map((perm) => (
                      <div key={perm} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${menu}-${perm}`}
                          checked={permissions[perm]}
                          onCheckedChange={() => togglePermission(menu, perm)}
                        />
                        <label
                          htmlFor={`${menu}-${perm}`}
                          className="text-sm cursor-pointer"
                        >
                          {getPermissionLabel(perm)}
                        </label>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit">
            {editingId ? "Atualizar" : <><Plus className="w-4 h-4 mr-2" /> Adicionar</>}
          </Button>
          {editingId && (
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
            >
              Cancelar
            </Button>
          )}
        </div>
      </form>

      <div className="space-y-2">
        {grupos.map((grupo) => (
          <div
            key={grupo.id}
            className="flex items-start justify-between p-4 border rounded-md"
          >
            <div className="flex-1">
              <div className="font-semibold mb-2">{grupo.nome}</div>
              <div className="text-sm text-muted-foreground">
                {Object.keys(grupo.menus_permitidos || {}).length > 0 
                  ? formatPermissions(grupo.menus_permitidos)
                  : "Nenhuma permissão definida"}
              </div>
            </div>
            <div className="flex gap-2">
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