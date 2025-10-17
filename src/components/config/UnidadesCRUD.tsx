import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus } from "lucide-react";

interface Unidade {
  id: string;
  nome: string;
}

export const UnidadesCRUD = () => {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [nome, setNome] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUnidades();
  }, []);

  const fetchUnidades = async () => {
    const { data, error } = await supabase
      .from("unidades")
      .select("*")
      .order("nome");

    if (error) {
      toast({
        title: "Erro ao carregar unidades",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setUnidades(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, preencha o nome da unidade",
        variant: "destructive",
      });
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from("unidades")
        .update({ nome })
        .eq("id", editingId);

      if (error) {
        toast({
          title: "Erro ao atualizar",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Unidade atualizada com sucesso!" });
        setNome("");
        setEditingId(null);
        fetchUnidades();
      }
    } else {
      const { error } = await supabase
        .from("unidades")
        .insert([{ nome }]);

      if (error) {
        toast({
          title: "Erro ao criar",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Unidade criada com sucesso!" });
        setNome("");
        fetchUnidades();
      }
    }
  };

  const handleEdit = (unidade: Unidade) => {
    setNome(unidade.nome);
    setEditingId(unidade.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta unidade?")) return;

    const { error } = await supabase
      .from("unidades")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Unidade excluída com sucesso!" });
      fetchUnidades();
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="unidade-nome">Nome da Filial</Label>
          <Input
            id="unidade-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Digite o nome da filial"
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
        {unidades.map((unidade) => (
          <div
            key={unidade.id}
            className="flex items-center justify-between p-3 border rounded-md"
          >
            <span>{unidade.nome}</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(unidade)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(unidade.id)}
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
