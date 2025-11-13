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
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

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

export const GruposAcessoCRUD = ({ estabelecimentoId }: GruposAcessoCRUDProps) => {
  const [grupos, setGrupos] = useState<GrupoAcesso[]>([]);
  const [nome, setNome] = useState("");
  const [menusPermitidos, setMenusPermitidos] = useState<Record<string, MenuPermissions>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [grupoToDelete, setGrupoToDelete] = useState<GrupoAcesso | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchGrupos();
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
      console.log("Estabelecimento ID:", targetEstabelecimentoId);

      if (!targetEstabelecimentoId) {
        toast({
          title: "Erro",
          description: "Selecione um estabelecimento primeiro",
          variant: "destructive",
        });
        return;
      }

      const dataToInsert = { ...grupoData, estabelecimento_id: targetEstabelecimentoId };
      console.log("Dados a inserir:", dataToInsert);

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

    // Verificar vínculos com usuarios
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

  const selectAll = () => {
    const allPermissions: Record<string, MenuPermissions> = {};
    MENUS_DISPONIVEIS.forEach(menu => {
      allPermissions[menu] = { view: true, create: true, edit: true, delete: true };
    });
    setMenusPermitidos(allPermissions);
  };

  const clearAll = () => {
    setMenusPermitidos({});
  };

  const hasAnyPermission = Object.keys(menusPermitidos).length > 0;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="grupo-nome" className="text-base">Nome do Grupo *</Label>
              <Input
                id="grupo-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Digite o nome do grupo"
                className="mt-2"
                required
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Permissões por Menu</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                >
                  Selecionar Todos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearAll}
                  disabled={!hasAnyPermission}
                >
                  Limpar Todos
                </Button>
              </div>
            </div>
            
            <div className="grid gap-3">
              {MENUS_DISPONIVEIS.map((menu) => {
                const permissions = menusPermitidos[menu] || { view: false, create: false, edit: false, delete: false };
                const hasAnyMenuPermission = Object.values(permissions).some(p => p);
                
                return (
                  <Card key={menu} className={`p-4 transition-all ${hasAnyMenuPermission ? 'border-primary/50 bg-primary/5' : ''}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="font-medium text-sm min-w-[180px]">{menu}</div>
                      <div className="flex gap-6 flex-wrap">
                        {(['view', 'create', 'edit', 'delete'] as const).map((perm) => (
                          <div key={perm} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${menu}-${perm}`}
                              checked={permissions[perm]}
                              onCheckedChange={() => togglePermission(menu, perm)}
                            />
                            <label
                              htmlFor={`${menu}-${perm}`}
                              className="text-sm cursor-pointer select-none"
                            >
                              {getPermissionLabel(perm)}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </Card>

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

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Grupos Cadastrados</h3>
        <div className="space-y-3">
          {grupos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum grupo cadastrado ainda
            </div>
          ) : (
            grupos.map((grupo) => (
              <Card
                key={grupo.id}
                className="p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-base mb-2">{grupo.nome}</div>
                    <div className="text-sm text-muted-foreground break-words">
                      {Object.keys(grupo.menus_permitidos || {}).length > 0 
                        ? formatPermissions(grupo.menus_permitidos)
                        : "Nenhuma permissão definida"}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(grupo)}
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(grupo)}
                      title="Excluir"
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