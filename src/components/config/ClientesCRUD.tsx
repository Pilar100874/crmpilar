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
  email: string;
  telefone: string;
}

interface ClientesCRUDProps {
  estabelecimentoId?: string;
}

export const ClientesCRUD = ({ estabelecimentoId }: ClientesCRUDProps = {}) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchClientes();
  }, [estabelecimentoId]);

  const fetchClientes = async () => {
    let query = supabase
      .from("customers")
      .select("id, nome, email, telefone");

    if (estabelecimentoId) {
      query = query.eq('estabelecimento_id', estabelecimentoId);
    }

    const { data, error } = await query.order("nome");

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
    
    if (!nome.trim() || !email.trim() || !telefone.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Todos os campos são obrigatórios: nome, email e telefone",
        variant: "destructive",
      });
      return;
    }

    const clienteData = {
      nome: nome.trim(),
      email: email.trim(),
      telefone: telefone.trim(),
      estabelecimento_id: estabelecimentoId || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("customers")
        .update(clienteData)
        .eq("id", editingId);

      if (error) {
        let errorMessage = error.message;
        
        if (error.code === '23505') {
          if (error.message.includes('customers_nome_unique')) {
            errorMessage = "Já existe um cliente com este nome";
          } else if (error.message.includes('customers_email_unique')) {
            errorMessage = "Já existe um cliente com este email";
          } else if (error.message.includes('customers_telefone_unique')) {
            errorMessage = "Já existe um cliente com este telefone";
          }
        }
        
        toast({
          title: "Erro ao atualizar",
          description: errorMessage,
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
        let errorMessage = error.message;
        
        if (error.code === '23505') {
          if (error.message.includes('customers_nome_unique')) {
            errorMessage = "Já existe um cliente com este nome";
          } else if (error.message.includes('customers_email_unique')) {
            errorMessage = "Já existe um cliente com este email";
          } else if (error.message.includes('customers_telefone_unique')) {
            errorMessage = "Já existe um cliente com este telefone";
          }
        }
        
        toast({
          title: "Erro ao criar",
          description: errorMessage,
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
    setEmail(cliente.email);
    setTelefone(cliente.telefone);
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
          <Label htmlFor="cliente-nome">Nome *</Label>
          <Input
            id="cliente-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Digite o nome do cliente"
            required
          />
        </div>

        <div>
          <Label htmlFor="cliente-email">E-mail *</Label>
          <Input
            id="cliente-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Digite o e-mail"
            required
          />
        </div>

        <div>
          <Label htmlFor="cliente-telefone">Telefone *</Label>
          <Input
            id="cliente-telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="Digite o telefone"
            required
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
                <div>E-mail: {cliente.email}</div>
                <div>Tel: {cliente.telefone}</div>
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
