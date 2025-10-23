import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

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

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
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
              setNome("");
              setEditingId(null);
            }}
            className="ml-2"
          >
            Cancelar
          </Button>
        )}
      </form>

      <div className="space-y-2">
        {segmentos.map((segmento) => (
          <div
            key={segmento.id}
            className="flex items-center justify-between p-3 border rounded-md"
          >
            <span>{segmento.nome}</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(segmento)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteClick(segmento)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

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
