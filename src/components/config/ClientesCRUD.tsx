import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus } from "lucide-react";

interface Cliente {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
}

export const ClientesCRUD = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("id, nome, email, telefone")
      .order("nome");

    if (error) {
      toast({
        title: "Erro ao carregar clientes",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setClientes(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, preencha o nome do cliente",
        variant: "destructive",
      });
      return;
    }

    const clienteData = {
      nome,
      email: email.trim() || null,
      telefone: telefone.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("customers")
        .update(clienteData)
        .eq("id", editingId);

      if (error) {
        toast({
          title: "Erro ao atualizar",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Cliente atualizado com sucesso!" });
        resetForm();
        fetchClientes();
      }
    } else {
      const { error } = await supabase
        .from("customers")
        .insert([clienteData]);

      if (error) {
        toast({
          title: "Erro ao criar",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Cliente criado com sucesso!" });
        resetForm();
        fetchClientes();
      }
    }
  };

  const resetForm = () => {
    setNome("");
    setEmail("");
    setTelefone("");
    setEditingId(null);
  };

  const handleEdit = (cliente: Cliente) => {
    setNome(cliente.nome);
    setEmail(cliente.email || "");
    setTelefone(cliente.telefone || "");
    setEditingId(cliente.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Cliente excluído com sucesso!" });
      fetchClientes();
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="cliente-nome">Nome</Label>
          <Input
            id="cliente-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Digite o nome do cliente"
          />
        </div>

        <div>
          <Label htmlFor="cliente-email">E-mail</Label>
          <Input
            id="cliente-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Digite o e-mail"
          />
        </div>

        <div>
          <Label htmlFor="cliente-telefone">Telefone</Label>
          <Input
            id="cliente-telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="Digite o telefone"
          />
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
        {clientes.map((cliente) => (
          <div
            key={cliente.id}
            className="flex items-start justify-between p-3 border rounded-md"
          >
            <div>
              <div className="font-semibold">{cliente.nome}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {cliente.email && <div>E-mail: {cliente.email}</div>}
                {cliente.telefone && <div>Tel: {cliente.telefone}</div>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(cliente)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(cliente.id)}
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
