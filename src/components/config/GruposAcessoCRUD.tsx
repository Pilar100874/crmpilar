import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus, Search, ShieldCheck, UsersRound, UserRoundCog } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { ArvorePermissoes } from "@/components/config/ArvorePermissoes";
import { limparCachePermissoes } from "@/hooks/usePermissoesUsuario";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GerenciadorPermissoesGrupos } from "@/components/config/GerenciadorPermissoesGrupos";

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
  const [aba, setAba] = useState("grupos");
  const [permissoesEmEdicao, setPermissoesEmEdicao] = useState<Record<string, Record<string, MenuPermissions>>>({});
  const [gruposAlterados, setGruposAlterados] = useState<Set<string>>(new Set());
  const [salvandoPermissoes, setSalvandoPermissoes] = useState(false);
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
      const gruposCarregados = (data || []).map(grupo => ({
        id: grupo.id,
        nome: grupo.nome,
        perfil: ((grupo as any).perfil as string) || 'padrao',
        menus_permitidos: typeof grupo.menus_permitidos === 'object' && 
          grupo.menus_permitidos !== null && 
          !Array.isArray(grupo.menus_permitidos)
          ? (grupo.menus_permitidos as unknown as Record<string, MenuPermissions>)
          : {}
      }));
      setGrupos(gruposCarregados);
      setPermissoesEmEdicao(Object.fromEntries(gruposCarregados.map((grupo) => [grupo.id, structuredClone(grupo.menus_permitidos)])));
      setGruposAlterados(new Set());
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
        limparCachePermissoes();
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
        limparCachePermissoes();
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
    setAba("grupos");
  };

  const atualizarPermissoesGrupo = (grupoId: string, valor: Record<string, MenuPermissions>) => {
    setPermissoesEmEdicao((atual) => ({ ...atual, [grupoId]: valor }));
    setGruposAlterados((atuais) => new Set(atuais).add(grupoId));
  };

  const descartarPermissoes = () => {
    setPermissoesEmEdicao(Object.fromEntries(grupos.map((grupo) => [grupo.id, structuredClone(grupo.menus_permitidos)])));
    setGruposAlterados(new Set());
  };

  const salvarPermissoesEmLote = async () => {
    if (gruposAlterados.size === 0) return;
    setSalvandoPermissoes(true);
    const falhas: string[] = [];
    const salvos: string[] = [];
    for (const grupoId of gruposAlterados) {
      const grupo = grupos.find((item) => item.id === grupoId);
      const { error } = await supabase
        .from("grupos_acesso")
        .update({ menus_permitidos: (permissoesEmEdicao[grupoId] || {}) as any })
        .eq("id", grupoId);
      if (error) falhas.push(grupo?.nome || grupoId);
      else salvos.push(grupoId);
    }
    if (salvos.length > 0) {
      setGrupos((atuais) => atuais.map((grupo) => salvos.includes(grupo.id)
        ? { ...grupo, menus_permitidos: structuredClone(permissoesEmEdicao[grupo.id] || {}) }
        : grupo));
      limparCachePermissoes();
    }
    setGruposAlterados(new Set(falhas.length > 0
      ? [...gruposAlterados].filter((id) => !salvos.includes(id))
      : []));
    setSalvandoPermissoes(false);
    if (falhas.length > 0) {
      toast({ title: "Alguns grupos não foram salvos", description: falhas.join(", "), variant: "destructive" });
    } else {
      toast({ title: "Permissões atualizadas", description: `${salvos.length} ${salvos.length === 1 ? "grupo salvo" : "grupos salvos"} com sucesso.` });
    }
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

  const formatPermissionsCompact = (permissions: Record<string, MenuPermissions>) => {
    const itens = Object.keys(permissions).filter((k) => permissions[k]?.view);
    if (itens.length === 0) return "Sem itens liberados";
    const acoes: string[] = [];
    if (itens.some((k) => permissions[k]?.create)) acoes.push("criar");
    if (itens.some((k) => permissions[k]?.edit)) acoes.push("editar");
    if (itens.some((k) => permissions[k]?.delete)) acoes.push("excluir");
    const sufixo = acoes.length > 0 ? ` · ${acoes.join(", ")}` : " · somente ver";
    return `${itens.length} ${itens.length === 1 ? "item liberado" : "itens liberados"}${sufixo}`;
  };

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("pt-BR");
  const filteredGrupos = grupos.filter((grupo) => grupo.nome.toLocaleLowerCase("pt-BR").includes(normalizedSearch));

  return (
    <div className="space-y-5">
      <Tabs value={aba} onValueChange={setAba}>
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-lg border bg-muted/40 p-1 sm:w-[480px]">
          <TabsTrigger value="grupos" className="min-h-10 gap-2"><UsersRound className="h-4 w-4" /><span>Grupos</span></TabsTrigger>
          <TabsTrigger value="permissoes" className="min-h-10 gap-2"><ShieldCheck className="h-4 w-4" /><span className="sm:hidden">Permissões</span><span className="hidden sm:inline">Gerenciar permissões</span></TabsTrigger>
        </TabsList>

        <TabsContent value="grupos" className="space-y-4">
          <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><UsersRound className="h-5 w-5" /></div><div><h3 className="text-base font-semibold sm:text-lg">Grupos cadastrados</h3><p className="text-xs text-muted-foreground sm:text-sm">{grupos.length} {grupos.length === 1 ? "grupo disponível" : "grupos disponíveis"} neste estabelecimento.</p></div></div>
            <Button onClick={() => { resetForm(); setFormOpen(true); }} className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Novo grupo</Button>
          </div>
          <div className="border-b bg-muted/20 p-3 sm:p-4"><div className="relative sm:max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Pesquisar grupo de acesso" className="bg-background pl-9" /></div></div>

          {filteredGrupos.length === 0 ? <div className="m-4 rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">{searchTerm ? "Nenhum grupo encontrado para esta pesquisa." : "Nenhum grupo cadastrado ainda."}</div> : (
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 sm:p-4">{filteredGrupos.map((grupo) => (
          <div
            key={grupo.id}
            onClick={() => handleEdit(grupo)}
            className="group relative rounded-xl border bg-background p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30 hover:bg-muted/20 cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <UserRoundCog className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{grupo.nome}</p>
                  <Badge variant="secondary" className="mt-1">{PERFIL_LABEL[grupo.perfil || 'padrao']}</Badge>
                </div>
              </div>
              <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" onClick={() => handleEdit(grupo)} className="h-8 w-8" aria-label={`Editar ${grupo.nome}`}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(grupo)} className="h-8 w-8" aria-label={`Excluir ${grupo.nome}`}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
            <div className="mt-4 border-t pt-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Permissões</p>
              <p className="mt-1 text-sm">{formatPermissionsCompact(grupo.menus_permitidos)}</p>
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-primary/0 transition-all group-hover:ring-primary/10" />
          </div>
        ))}</div>
          )}
          </div>

      {/* Formulário em painel lateral */}
      <Sheet open={formOpen} onOpenChange={(open) => { if (!open) resetForm(); setFormOpen(open); }}>
        <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-4xl overflow-y-auto p-0">
          <SheetHeader className="border-b p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="text-left">
                <SheetTitle className="text-base sm:text-lg">{editingId ? "Editar grupo de acesso" : "Novo grupo de acesso"}</SheetTitle>
                <p className="text-xs text-muted-foreground">Defina o perfil e as permissões deste grupo.</p>
              </div>
            </div>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
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
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/20 p-3 sm:p-4">
              <div>
                <Label className="text-sm font-medium">Permissões por menu, submenu e módulo</Label>
                <p className="text-xs text-muted-foreground">
                  Marque o que este grupo pode ver, criar, editar e excluir em cada menu, submenu e módulo interno das telas.
                </p>
              </div>
              <ArvorePermissoes valor={menusPermitidos} onChange={setMenusPermitidos} />
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingId ? "Salvar" : <><Plus className="w-4 h-4 mr-1" /> Criar</>}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
        </TabsContent>

        <TabsContent value="permissoes" className="mt-4">
          <GerenciadorPermissoesGrupos
            grupos={grupos}
            valores={permissoesEmEdicao}
            alterados={gruposAlterados}
            salvando={salvandoPermissoes}
            onChange={atualizarPermissoesGrupo}
            onSalvar={salvarPermissoesEmLote}
            onDescartar={descartarPermissoes}
          />
        </TabsContent>
      </Tabs>

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
