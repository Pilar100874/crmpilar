import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast-config";
import { Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { EstabelecimentoDetalhes } from "./EstabelecimentoDetalhes";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

interface Estabelecimento {
  id: string;
  cnpj: string;
  nome: string;
  numero_usuarios_permitidos: number;
  created_at: string;
}

export function EstabelecimentosCRUD() {
  const [searchParams] = useSearchParams();
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [estabelecimentoToDelete, setEstabelecimentoToDelete] = useState<Estabelecimento | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [formData, setFormData] = useState({
    cnpj: "",
    nome: "",
    numero_usuarios_permitidos: 5,
  });

  useEffect(() => {
    checkUserType();
    fetchEstabelecimentos();
  }, []);

  // Auto-expandir primeiro estabelecimento se houver parâmetros de subsecao na URL
  useEffect(() => {
    const subsecao = searchParams.get('subsecao');
    const subsubsecao = searchParams.get('subsubsecao');
    
    if ((subsecao || subsubsecao) && estabelecimentos.length > 0 && !expandedId) {
      setExpandedId(estabelecimentos[0].id);
    }
  }, [searchParams, estabelecimentos, expandedId]);

  const checkUserType = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Verifica se é administrador do sistema (tabela administradores)
      const { data: adminData } = await supabase
        .from("administradores")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (adminData) {
        setIsSystemAdmin(true);
        return;
      }

      // Verifica se o usuário tem role admin na tabela user_roles
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (userRole) {
        setIsUserAdmin(true);
      }
    } catch (error) {
      console.error("Erro ao verificar tipo de usuário:", error);
    }
  };

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

    // Usuários admin não podem criar estabelecimentos
    if (isUserAdmin && !editingId) {
      toast.error("Apenas administradores do sistema podem criar estabelecimentos");
      return;
    }

    const cleanCNPJ = formData.cnpj.replace(/\D/g, "");

    if (editingId) {
      // Usuários admin não podem editar campos restritos
      if (isUserAdmin) {
        toast.error("Usuários admin não podem modificar CNPJ, nome ou número de usuários do estabelecimento");
        return;
      }

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

  const handleDeleteClick = (estabelecimento: Estabelecimento) => {
    setEstabelecimentoToDelete(estabelecimento);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!estabelecimentoToDelete) return;

    setIsDeleting(true);

    // Verificar vínculos com usuarios
    const { data: usuarios, error: checkError } = await supabase
      .from("usuarios")
      .select("id")
      .eq("estabelecimento_id", estabelecimentoToDelete.id)
      .limit(1);

    if (checkError) {
      toast.error("Erro ao verificar vínculos");
      console.error(checkError);
      setIsDeleting(false);
      return;
    }

    if (usuarios && usuarios.length > 0) {
      toast.error("Este estabelecimento possui usuários vinculados. Remova os vínculos primeiro.");
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setEstabelecimentoToDelete(null);
      return;
    }

    const { error } = await supabase
      .from("estabelecimentos")
      .delete()
      .eq("id", estabelecimentoToDelete.id);

    setIsDeleting(false);

    if (error) {
      toast.error("Erro ao excluir estabelecimento");
      console.error(error);
    } else {
      toast.success("Estabelecimento excluído com sucesso!");
      fetchEstabelecimentos();
    }

    setDeleteDialogOpen(false);
    setEstabelecimentoToDelete(null);
  };

  return (
    <div className="space-y-6">
      {isSystemAdmin && (
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
            <Button type="submit">
              {editingId ? "Atualizar" : "Criar"}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      )}

      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Estabelecimentos Cadastrados</h3>
        <div className="space-y-4">
          {estabelecimentos.map((estabelecimento) => (
            <div
              key={estabelecimento.id}
              className="border rounded-lg overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 bg-muted/30">
                <div className="flex-1">
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
                    onClick={() => setExpandedId(expandedId === estabelecimento.id ? null : estabelecimento.id)}
                    title={expandedId === estabelecimento.id ? "Ocultar detalhes" : "Gerenciar dados"}
                  >
                    {expandedId === estabelecimento.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                  {isSystemAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(estabelecimento)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(estabelecimento)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              {expandedId === estabelecimento.id && (
                <div className="p-4 bg-background">
                  <EstabelecimentoDetalhes 
                    estabelecimentoId={estabelecimento.id}
                    estabelecimentoNome={estabelecimento.nome}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        itemName={estabelecimentoToDelete?.nome}
        isLoading={isDeleting}
      />
    </div>
  );
}
