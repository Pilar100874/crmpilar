import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus } from "lucide-react";

interface Administrador {
  id: string;
  nome: string;
  cpf: string;
  created_at: string;
}

export const AdministradoresCRUD = () => {
  const [administradores, setAdministradores] = useState<Administrador[]>([]);
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchAdministradores();
  }, []);

  const fetchAdministradores = async () => {
    const { data, error } = await supabase
      .from("administradores")
      .select("*")
      .order("nome");

    if (error) {
      toast({
        title: "Erro ao carregar administradores",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setAdministradores(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim() || !cpf.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e CPF são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (!editingId && !senha) {
      toast({
        title: "Senha obrigatória",
        description: "Por favor, defina uma senha para o novo administrador",
        variant: "destructive",
      });
      return;
    }

    const adminData = {
      nome,
      cpf: cpf.replace(/\D/g, ''), // Remove non-numeric characters
      ...(senha && { senha_hash: senha }),
    };

    if (editingId) {
      const { error } = await supabase
        .from("administradores")
        .update(adminData)
        .eq("id", editingId);

      if (error) {
        toast({
          title: "Erro ao atualizar",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Administrador atualizado com sucesso!" });
    } else {
      const { error } = await supabase
        .from("administradores")
        .insert([adminData]);

      if (error) {
        toast({
          title: "Erro ao criar",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Administrador criado com sucesso!" });
    }

    resetForm();
    fetchAdministradores();
  };

  const resetForm = () => {
    setNome("");
    setCpf("");
    setSenha("");
    setEditingId(null);
  };

  const handleEdit = (admin: Administrador) => {
    setNome(admin.nome);
    setCpf(admin.cpf);
    setEditingId(admin.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este administrador?")) return;

    const { error } = await supabase
      .from("administradores")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Administrador excluído com sucesso!" });
      fetchAdministradores();
    }
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return value;
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          {editingId ? "Editar Administrador" : "Novo Administrador"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="admin-nome">Nome *</Label>
              <Input
                id="admin-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            
            <div>
              <Label htmlFor="admin-cpf">CPF *</Label>
              <Input
                id="admin-cpf"
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>

            <div>
              <Label htmlFor="admin-senha">
                Senha {!editingId && "*"}
              </Label>
              <Input
                id="admin-senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder={editingId ? "Deixe vazio para manter" : "Digite a senha"}
              />
            </div>
          </div>

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
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Administradores Cadastrados</h3>
        {administradores.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum administrador cadastrado ainda
          </p>
        ) : (
          <div className="space-y-2">
            {administradores.map((admin) => (
              <Card
                key={admin.id}
                className="p-4 flex items-start justify-between hover:bg-accent/50 transition-colors"
              >
                <div>
                  <div className="font-semibold">{admin.nome}</div>
                  <div className="text-sm text-muted-foreground">
                    CPF: {formatCPF(admin.cpf)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(admin)}
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(admin.id)}
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
