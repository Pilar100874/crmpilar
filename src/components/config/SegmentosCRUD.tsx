import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus } from "lucide-react";

interface Segmento {
  id: string;
  nome: string;
}

export const SegmentosCRUD = () => {
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [nome, setNome] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSegmentos();
  }, []);

  const fetchSegmentos = async () => {
    const { data, error } = await supabase
      .from("segmentos")
      .select("*")
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
    
    if (!nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, preencha o nome do segmento",
        variant: "destructive",
      });
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from("segmentos")
        .update({ nome })
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
      const { error } = await supabase
        .from("segmentos")
        .insert([{ nome }]);

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

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este segmento?")) return;

    const { error } = await supabase
      .from("segmentos")
      .delete()
      .eq("id", id);

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
                onClick={() => handleDelete(segmento.id)}
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
