import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/lib/toast-config";
import { Pencil, Trash2, ChevronRight, Plus, Building2, Users, X, ArrowLeft } from "lucide-react";
import { EstabelecimentoDetalhes } from "./EstabelecimentoDetalhes";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Estabelecimento {
  id: string;
  cnpj: string;
  nome: string;
  numero_usuarios_permitidos: number;
  created_at: string;
}

export function EstabelecimentosCRUD() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEstabelecimento, setSelectedEstabelecimento] = useState<Estabelecimento | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [estabelecimentoToDelete, setEstabelecimentoToDelete] = useState<Estabelecimento | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    cnpj: "",
    nome: "",
    numero_usuarios_permitidos: 5,
  });

  useEffect(() => {
    checkUserType();
    fetchEstabelecimentos();
  }, []);

  // Auto-selecionar primeiro estabelecimento se houver parâmetros na URL
  useEffect(() => {
    const subsecao = searchParams.get('subsecao');
    const subsubsecao = searchParams.get('subsubsecao');
    
    if ((subsecao || subsubsecao) && estabelecimentos.length > 0 && !selectedEstabelecimento) {
      setSelectedEstabelecimento(estabelecimentos[0]);
    }
  }, [searchParams, estabelecimentos, selectedEstabelecimento]);

  const checkUserType = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!usuario) return;

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", usuario.id)
        .eq("role", "admin")
        .maybeSingle();

      if (userRole) {
        setIsSystemAdmin(true);
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

    if (isUserAdmin && !editingId) {
      toast.error("Apenas administradores do sistema podem criar estabelecimentos");
      return;
    }

    const cleanCNPJ = formData.cnpj.replace(/\D/g, "");

    if (editingId) {
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
    setShowForm(false);
  };

  const handleEdit = (estabelecimento: Estabelecimento) => {
    setFormData({
      cnpj: formatCNPJ(estabelecimento.cnpj),
      nome: estabelecimento.nome,
      numero_usuarios_permitidos: estabelecimento.numero_usuarios_permitidos,
    });
    setEditingId(estabelecimento.id);
    setShowForm(true);
  };

  const handleDeleteClick = (estabelecimento: Estabelecimento, e: React.MouseEvent) => {
    e.stopPropagation();
    setEstabelecimentoToDelete(estabelecimento);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!estabelecimentoToDelete) return;

    setIsDeleting(true);

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

  const handleSelectEstabelecimento = (estabelecimento: Estabelecimento) => {
    setSelectedEstabelecimento(estabelecimento);
  };

  const handleBackToList = () => {
    setSelectedEstabelecimento(null);
    setSearchParams({});
  };

  // Se um estabelecimento está selecionado, mostra os detalhes
  if (selectedEstabelecimento) {
    return (
      <div className="space-y-4">
        {/* Header com botão voltar */}
        <div className="flex items-center gap-3 pb-3 border-b">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBackToList}
            className="shrink-0 -ml-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-green-500" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-base truncate">{selectedEstabelecimento.nome}</h2>
              <p className="text-xs text-muted-foreground">
                CNPJ: {formatCNPJ(selectedEstabelecimento.cnpj)}
              </p>
            </div>
          </div>
        </div>

        {/* Detalhes do estabelecimento */}
        <EstabelecimentoDetalhes 
          estabelecimentoId={selectedEstabelecimento.id}
          estabelecimentoNome={selectedEstabelecimento.nome}
        />
      </div>
    );
  }

  // Lista de estabelecimentos
  return (
    <div className="space-y-4">
      {/* Botão adicionar (apenas para admin do sistema) */}
      {isSystemAdmin && (
        <Button 
          className="w-full" 
          size="lg"
          onClick={() => setShowForm(true)}
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Estabelecimento
        </Button>
      )}

      {/* Lista de estabelecimentos em cards */}
      <div className="space-y-3">
        {estabelecimentos.length === 0 ? (
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="p-6 text-center text-muted-foreground">
              Nenhum estabelecimento cadastrado
            </CardContent>
          </Card>
        ) : (
          estabelecimentos.map((estabelecimento) => (
            <Card 
              key={estabelecimento.id}
              className="overflow-hidden cursor-pointer hover:shadow-md active:scale-[0.99] transition-all"
              onClick={() => handleSelectEstabelecimento(estabelecimento)}
            >
              <CardContent className="p-0">
                <div className="flex items-center gap-4 p-4">
                  {/* Ícone */}
                  <div className="w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-7 h-7 text-green-500" />
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base mb-0.5 truncate">
                      {estabelecimento.nome}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-1">
                      CNPJ: {formatCNPJ(estabelecimento.cnpj)}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {estabelecimento.numero_usuarios_permitidos} usuários
                      </Badge>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1">
                    {isSystemAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(estabelecimento);
                          }}
                          className="h-9 w-9"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDeleteClick(estabelecimento, e)}
                          className="h-9 w-9 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <ChevronRight className="w-5 h-5 text-muted-foreground ml-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog para formulário */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Estabelecimento" : "Novo Estabelecimento"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1">
                {editingId ? "Atualizar" : "Criar"}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
