import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus, Search, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CadastroCardList } from "@/components/cadastros/CadastroCardList";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArvorePermissoes } from "@/components/config/ArvorePermissoes";

interface MenuPermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

interface GrupoAcesso {
  id: string;
  nome: string;
  perfil?: string;
  menus_permitidos: Record<string, MenuPermissions>;
}

export const PERFIS_GRUPO = [
  { value: 'padrao', label: 'Padrão' },
  { value: 'admin', label: 'Administrador' },
  { value: 'atendente', label: 'Atendente' },
  { value: 'porteiro', label: 'Porteiro' },
  { value: 'gerente', label: 'Gerente' },
] as const;

const PERFIL_LABEL: Record<string, string> = Object.fromEntries(
  PERFIS_GRUPO.map((p) => [p.value, p.label])
);


interface GruposAcessoCRUDProps {
  estabelecimentoId?: string;
}

export const GruposAcessoCRUD = ({ estabelecimentoId }: GruposAcessoCRUDProps) => {
  const [grupos, setGrupos] = useState<GrupoAcesso[]>([]);
  const [nome, setNome] = useState("");
  const [perfil, setPerfil] = useState<string>("padrao");
  const [menusPermitidos, setMenusPermitidos] = useState<Record<string, MenuPermissions>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [grupoToDelete, setGrupoToDelete] = useState<GrupoAcesso | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formOpen, setFormOpen] = useState(false);
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
        perfil: ((grupo as any).perfil as string) || 'padrao',
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
      perfil,
      menus_permitidos: menusPermitidos as any,
    } as any;


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
    setPerfil("padrao");
    setMenusPermitidos({});
    setEditingId(null);
    setFormOpen(false);
  };

  const handleEdit = (grupo: GrupoAcesso) => {
    setNome(grupo.nome);
    setPerfil(grupo.perfil || "padrao");
    setMenusPermitidos(grupo.menus_permitidos || {});
    setEditingId(grupo.id);
    setFormOpen(true);
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

 = (menu: string) => {
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

 = (menuId: string) => {
    const menuConfig = MENU_CONFIG.find(m => m.id === menuId);
    return menuConfig ? menuConfig.label : menuId;
  };

 = () => {
    setMenusPermitidos({});
  };

 = (category: string) => {
    const menus = menusByCategory[category] || [];
    return menus.filter(m => menusPermitidos[m.id]?.view).length;
  };

 = (menu: MenuConfigItem) => {
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

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("pt-BR");
  const filteredGrupos = grupos.filter((grupo) => grupo.nome.toLocaleLowerCase("pt-BR").includes(normalizedSearch));
  const actionButtons = (grupo: GrupoAcesso) => (
    <>
      <Button variant="ghost" size="icon" onClick={() => handleEdit(grupo)} className="h-8 w-8" aria-label={`Editar ${grupo.nome}`}>
        <Edit className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(grupo)} className="h-8 w-8" aria-label={`Excluir ${grupo.nome}`}>
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{grupos.length} {grupos.length === 1 ? "grupo cadastrado" : "grupos cadastrados"}</p>
        <Button onClick={() => { resetForm(); setFormOpen(true); }} className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Novo grupo</Button>
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Pesquisar grupo de acesso" className="pl-9" /></div>

      {filteredGrupos.length === 0 ? <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">{searchTerm ? "Nenhum grupo encontrado para esta pesquisa." : "Nenhum grupo cadastrado ainda."}</div> : <>
        <div className="md:hidden"><CadastroCardList items={filteredGrupos.map((grupo) => ({ id: grupo.id, title: grupo.nome, subtitle: PERFIL_LABEL[grupo.perfil || 'padrao'], fields: [{ label: "Permissões", value: formatPermissionsCompact(grupo.menus_permitidos), full: true }], actions: actionButtons(grupo) }))} /></div>
        <div className="hidden overflow-hidden rounded-lg border md:block"><Table><TableHeader><TableRow><TableHead>Grupo</TableHead><TableHead>Perfil</TableHead><TableHead>Permissões</TableHead><TableHead className="w-24 text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{filteredGrupos.map((grupo) => <TableRow key={grupo.id}><TableCell className="font-medium">{grupo.nome}</TableCell><TableCell><Badge variant="secondary">{PERFIL_LABEL[grupo.perfil || 'padrao']}</Badge></TableCell><TableCell>{formatPermissionsCompact(grupo.menus_permitidos)}</TableCell><TableCell><div className="flex justify-end gap-1">{actionButtons(grupo)}</div></TableCell></TableRow>)}</TableBody></Table></div>
      </>}

      {/* Formulário */}
      {formOpen && <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-3"><ShieldCheck className="h-5 w-5 text-primary" /><h4 className="font-semibold">{editingId ? "Editar grupo de acesso" : "Novo grupo de acesso"}</h4></div>
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
            <div className="sm:w-56">
              <Label htmlFor="grupo-perfil" className="text-sm font-medium">Perfil *</Label>
              <Select value={perfil} onValueChange={setPerfil}>
                <SelectTrigger id="grupo-perfil" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERFIS_GRUPO.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Define as permissões especiais do usuário (admin, atendente, porteiro, gerente).
              </p>
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

        {/* Permissões por menu, submenu e módulo interno */}
        <Card className="p-4">
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Permissões por menu, submenu e módulo</Label>
              <p className="text-xs text-muted-foreground">
                Marque o que este grupo pode ver, criar, editar e excluir em cada menu, submenu e módulo interno das telas.
              </p>
            </div>
            <ArvorePermissoes valor={menusPermitidos} onChange={setMenusPermitidos} />
          </div>
        </Card>
      </form>}

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
