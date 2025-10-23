import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

interface Estabelecimento {
  id: string;
  cnpj: string;
  nome: string;
  numero_usuarios_permitidos: number;
  created_at: string;
}

export function EstabelecimentosCRUD() {
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    cnpj: "",
    nome: "",
    numero_usuarios_permitidos: 5,
  });

  useEffect(() => {
    fetchEstabelecimentos();
  }, []);

  const fetchEstabelecimentos = async () => {
    const { data, error } = await supabase
      .from("estabelecimentos")
      .select("*")
      .order("nome");

    if (error) {
      toast.error("Erro ao carregar estabelecimentos");
      console.error(error);
      return;
    }

    setEstabelecimentos(data || []);
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 14) {
      return numbers
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return value;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cnpj || !formData.nome) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const cleanCNPJ = formData.cnpj.replace(/\D/g, "");

    if (editingId) {
      const { error } = await supabase
        .from("estabelecimentos")
        .update({
          cnpj: cleanCNPJ,
          nome: formData.nome,
          numero_usuarios_permitidos: formData.numero_usuarios_permitidos,
        })
        .eq("id", editingId);

      if (error) {
        toast.error("Erro ao atualizar estabelecimento");
        console.error(error);
        return;
      }

      toast.success("Estabelecimento atualizado com sucesso!");
    } else {
      const { error } = await supabase.from("estabelecimentos").insert({
        cnpj: cleanCNPJ,
        nome: formData.nome,
        numero_usuarios_permitidos: formData.numero_usuarios_permitidos,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("CNPJ já cadastrado");
        } else {
          toast.error("Erro ao criar estabelecimento");
        }
        console.error(error);
        return;
      }

      toast.success("Estabelecimento criado com sucesso!");
    }

    resetForm();
    fetchEstabelecimentos();
  };

  const resetForm = () => {
    setFormData({
      cnpj: "",
      nome: "",
      numero_usuarios_permitidos: 5,
    });
    setEditingId(null);
  };

  const handleEdit = (estabelecimento: Estabelecimento) => {
    setFormData({
      cnpj: formatCNPJ(estabelecimento.cnpj),
      nome: estabelecimento.nome,
      numero_usuarios_permitidos: estabelecimento.numero_usuarios_permitidos,
    });
    setEditingId(estabelecimento.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este estabelecimento?")) {
      return;
    }

    const { error } = await supabase
      .from("estabelecimentos")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir estabelecimento");
      console.error(error);
      return;
    }

    toast.success("Estabelecimento excluído com sucesso!");
    fetchEstabelecimentos();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded-lg">
        <h3 className="font-semibold text-lg">
          {editingId ? "Editar Estabelecimento" : "Novo Estabelecimento"}
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ *</Label>
            <Input
              id="cnpj"
              value={formData.cnpj}
              onChange={(e) =>
                setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })
              }
              placeholder="00.000.000/0000-00"
              maxLength={18}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) =>
                setFormData({ ...formData, nome: e.target.value })
              }
              placeholder="Nome do Estabelecimento"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="numero_usuarios">Número de Usuários Permitidos *</Label>
            <Input
              id="numero_usuarios"
              type="number"
              min="1"
              value={formData.numero_usuarios_permitidos}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  numero_usuarios_permitidos: parseInt(e.target.value) || 1,
                })
              }
              required
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit">{editingId ? "Atualizar" : "Criar"}</Button>
          {editingId && (
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
          )}
        </div>
      </form>

      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Estabelecimentos Cadastrados</h3>
        <div className="space-y-2">
          {estabelecimentos.map((estabelecimento) => (
            <div
              key={estabelecimento.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div>
                <p className="font-medium">{estabelecimento.nome}</p>
                <p className="text-sm text-muted-foreground">
                  CNPJ: {formatCNPJ(estabelecimento.cnpj)} | Usuários permitidos:{" "}
                  {estabelecimento.numero_usuarios_permitidos}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(estabelecimento)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(estabelecimento.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
