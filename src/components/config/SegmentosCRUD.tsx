import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus, Search, Tags } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { CadastroCardList } from "@/components/cadastros/CadastroCardList";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Segmento {
  id: string;
  nome: string;
}

interface SegmentosCRUDProps {
  estabelecimentoId?: string;
}

export const SegmentosCRUD = ({ estabelecimentoId }: SegmentosCRUDProps) => {
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [nome, setNome] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [segmentoToDelete, setSegmentoToDelete] = useState<Segmento | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSegmentos();
  }, [estabelecimentoId]);

  const fetchSegmentos = async () => {
    let targetEstabelecimentoId = estabelecimentoId;

    if (!targetEstabelecimentoId) {
      // Get current user's estabelecimento_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('usuarios')
        .select('estabelecimento_id')
        .eq('email', user.email)
        .maybeSingle();

      targetEstabelecimentoId = userData?.estabelecimento_id;
    }

    if (!targetEstabelecimentoId) return;

    const { data, error } = await supabase
      .from("segmentos")
      .select("*")
      .eq('estabelecimento_id', targetEstabelecimentoId)
      .order("nome");

    if (error) {
      toast({
        title: "Erro ao carregar segmentos",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSegmentos(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedNome = nome.trim();
    if (!trimmedNome) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, preencha o nome do segmento",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicates (case-insensitive)
    const existingSegmento = segmentos.find(s => 
      s.nome.toLowerCase() === trimmedNome.toLowerCase() && s.id !== editingId
    );
    
    if (existingSegmento) {
      toast({
        title: "Nome duplicado",
        description: "Já existe um segmento com este nome",
        variant: "destructive",
      });
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from("segmentos")
        .update({ nome: trimmedNome })
        .eq("id", editingId);

      if (error) {
        toast({
          title: "Erro ao atualizar",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Segmento atualizado com sucesso!" });
        setNome("");
        setEditingId(null);
        fetchSegmentos();
      }
    } else {
      let targetEstabelecimentoId = estabelecimentoId;

      if (!targetEstabelecimentoId) {
        // Get current user's estabelecimento_id
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
          .from('usuarios')
          .select('estabelecimento_id')
          .eq('email', user.email)
          .maybeSingle();

        targetEstabelecimentoId = userData?.estabelecimento_id;
      }

      if (!targetEstabelecimentoId) {
        toast({
          title: "Erro",
          description: "Estabelecimento não identificado",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("segmentos")
        .insert([{ nome: trimmedNome, estabelecimento_id: targetEstabelecimentoId }]);

      if (error) {
        const errorMsg = error.message.includes('segmentos_nome_unique') 
          ? 'Já existe um segmento com este nome'
          : error.message;
        toast({
          title: "Erro ao criar",
          description: errorMsg,
          variant: "destructive",
        });
      } else {
        toast({ title: "Segmento criado com sucesso!" });
        setNome("");
        fetchSegmentos();
      }
    }
  };

  const handleEdit = (segmento: Segmento) => {
    setNome(segmento.nome);
    setEditingId(segmento.id);
    setFormOpen(true);
  };

  const resetForm = () => {
    setNome("");
    setEditingId(null);
    setFormOpen(false);
  };

  const handleDeleteClick = (segmento: Segmento) => {
    setSegmentoToDelete(segmento);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!segmentoToDelete) return;

    setIsDeleting(true);

    // Verificar vínculos com usuario_segmentos
    const { data: usuarioSegmentos, error: checkError } = await supabase
      .from("usuario_segmentos")
      .select("id")
      .eq("segmento_id", segmentoToDelete.id)
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

    if (usuarioSegmentos && usuarioSegmentos.length > 0) {
      toast({
        title: "Não é possível excluir",
        description: "Este segmento possui usuários vinculados. Remova os vínculos primeiro.",
        variant: "destructive",
      });
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setSegmentoToDelete(null);
      return;
    }

    const { error } = await supabase
      .from("segmentos")
      .delete()
      .eq("id", segmentoToDelete.id);

    setIsDeleting(false);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Segmento excluído com sucesso!" });
      fetchSegmentos();
    }

    setDeleteDialogOpen(false);
    setSegmentoToDelete(null);
  };

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("pt-BR");
  const filteredSegmentos = segmentos.filter((segmento) => segmento.nome.toLocaleLowerCase("pt-BR").includes(normalizedSearch));
  const actionButtons = (segmento: Segmento) => <>
    <Button variant="ghost" size="icon" onClick={() => handleEdit(segmento)} aria-label={`Editar ${segmento.nome}`}><Edit className="w-4 h-4" /></Button>
    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(segmento)} aria-label={`Excluir ${segmento.nome}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
  </>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="text-lg font-semibold">Segmentos</h3><p className="text-sm text-muted-foreground">{segmentos.length} {segmentos.length === 1 ? "segmento cadastrado" : "segmentos cadastrados"}</p></div>
        <Button onClick={() => { resetForm(); setFormOpen(true); }} className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Novo segmento</Button>
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Pesquisar segmento" className="pl-9" /></div>

      {formOpen && <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 border-b pb-3"><Tags className="h-5 w-5 text-primary" /><h4 className="font-semibold">{editingId ? "Editar segmento" : "Novo segmento"}</h4></div>
        <div>
          <Label htmlFor="segmento-nome">Nome do Segmento</Label>
          <Input
            id="segmento-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Digite o nome do segmento"
          />
        </div>
        <Button type="submit">
          {editingId ? "Atualizar" : <><Plus className="w-4 h-4 mr-2" /> Adicionar</>}
        </Button>
        {editingId && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm();
            }}
            className="ml-2"
          >
            Cancelar
          </Button>
        )}
        {!editingId && <Button type="button" variant="outline" onClick={resetForm} className="ml-2">Cancelar</Button>}
      </form>}

      {filteredSegmentos.length === 0 ? <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">{searchTerm ? "Nenhum segmento encontrado para esta pesquisa." : "Nenhum segmento cadastrado ainda."}</div> : <>
        <div className="md:hidden"><CadastroCardList items={filteredSegmentos.map((segmento) => ({ id: segmento.id, title: segmento.nome, actions: actionButtons(segmento) }))} /></div>
        <div className="hidden overflow-hidden rounded-lg border md:block"><Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead className="w-24 text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{filteredSegmentos.map((segmento) => <TableRow key={segmento.id}><TableCell className="font-medium">{segmento.nome}</TableCell><TableCell><div className="flex justify-end gap-1">{actionButtons(segmento)}</div></TableCell></TableRow>)}</TableBody></Table></div>
      </>}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        itemName={segmentoToDelete?.nome}
        isLoading={isDeleting}
      />
    </div>
  );
};
