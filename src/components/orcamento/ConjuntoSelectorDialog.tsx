import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Check, Plus, ArrowLeft, Settings, Edit, Trash2, Search } from "lucide-react";
import { ConjuntoItensEditor } from "./ConjuntoItensEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ConjuntoItem {
  id: string;
  produto_id: string;
  quantidade_padrao: number;
  preco_padrao?: number;
  produto?: {
    id: string;
    nome: string;
  };
}

interface ConjuntoPreenchido extends ConjuntoItem {
  quantidade: number;
  preco: number;
}

interface ConjuntoSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (conjuntoId: string) => void | Promise<void>;
}

export function ConjuntoSelectorDialog({ open, onClose, onConfirm }: ConjuntoSelectorDialogProps) {
  const [conjuntos, setConjuntos] = useState<Array<{ id: string; nome: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [formData, setFormData] = useState({ nome: "", descricao: "" });
  const [showItemsEditor, setShowItemsEditor] = useState<string | null>(null);
  const [editingConjunto, setEditingConjunto] = useState<{ id: string; nome: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"nome" | "created_at">("nome");

  useEffect(() => {
    if (open) {
      loadConjuntos();
    }
  }, [open, sortBy]);

  const loadConjuntos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Você precisa estar autenticado");
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("usuarios")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (userError) throw userError;
      
      if (!userData) {
        toast.error("Usuário não encontrado. Entre em contato com o administrador.");
        return;
      }

      const { data, error } = await supabase
        .from("orcamento_conjuntos_usuario")
        .select("id, nome, created_at")
        .eq("usuario_id", userData.id)
        .order(sortBy === "nome" ? "nome" : "created_at", { ascending: sortBy === "nome" });

      if (error) throw error;
      setConjuntos(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar conjuntos:", error);
      toast.error("Erro ao carregar conjuntos");
    }
  };

  const handleClose = () => {
    setShowNewForm(false);
    setFormData({ nome: "", descricao: "" });
    onClose();
  };

  const handleSelectConjunto = async (conjuntoId: string) => {
    await onConfirm(conjuntoId);
    handleClose();
  };

  const handleCreateConjunto = async () => {
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Você precisa estar autenticado");
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("usuarios")
        .select("id, estabelecimento_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (userError) throw userError;
      
      if (!userData) {
        toast.error("Usuário não encontrado. Entre em contato com o administrador.");
        return;
      }

      const { error } = await supabase
        .from("orcamento_conjuntos_usuario")
        .insert({
          usuario_id: userData.id,
          estabelecimento_id: userData.estabelecimento_id,
          nome: formData.nome,
          descricao: formData.descricao
        });

      if (error) throw error;
      
      toast.success("Conjunto criado com sucesso!");
      setShowNewForm(false);
      setFormData({ nome: "", descricao: "" });
      setEditingConjunto(null);
      loadConjuntos();
    } catch (error: any) {
      console.error("Erro ao criar conjunto:", error);
      toast.error("Erro ao criar conjunto");
    }
  };

  const handleUpdateConjunto = async () => {
    if (!formData.nome.trim() || !editingConjunto) {
      toast.error("Nome é obrigatório");
      return;
    }

    try {
      const { error } = await supabase
        .from("orcamento_conjuntos_usuario")
        .update({
          nome: formData.nome,
          descricao: formData.descricao
        })
        .eq("id", editingConjunto.id);

      if (error) throw error;
      
      toast.success("Conjunto atualizado com sucesso!");
      setShowNewForm(false);
      setFormData({ nome: "", descricao: "" });
      setEditingConjunto(null);
      loadConjuntos();
    } catch (error: any) {
      console.error("Erro ao atualizar conjunto:", error);
      toast.error("Erro ao atualizar conjunto");
    }
  };

  const handleDeleteConjunto = async (conjuntoId: string) => {
    if (!confirm("Deseja realmente excluir este conjunto? Todos os itens associados também serão removidos.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("orcamento_conjuntos_usuario")
        .delete()
        .eq("id", conjuntoId);

      if (error) throw error;
      
      toast.success("Conjunto excluído com sucesso!");
      loadConjuntos();
    } catch (error: any) {
      console.error("Erro ao excluir conjunto:", error);
      toast.error("Erro ao excluir conjunto");
    }
  };

  const handleEditClick = (conjunto: { id: string; nome: string }) => {
    setEditingConjunto(conjunto);
    setFormData({ nome: conjunto.nome, descricao: "" });
    setShowNewForm(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] overflow-y-auto sm:w-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Selecionar Conjunto de Itens</DialogTitle>
        </DialogHeader>

        {showNewForm ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowNewForm(false);
                  setFormData({ nome: "", descricao: "" });
                  setEditingConjunto(null);
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </div>
            <div>
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Conjunto Produtos Alimentícios"
              />
            </div>
            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição opcional"
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setShowNewForm(false);
                setEditingConjunto(null);
              }}>
                Cancelar
              </Button>
              <Button onClick={editingConjunto ? handleUpdateConjunto : handleCreateConjunto}>
                {editingConjunto ? "Atualizar" : "Criar"} Conjunto
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar conjuntos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={(value: "nome" | "created_at") => setSortBy(value)}>
                  <SelectTrigger className="w-full sm:w-[140px] h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nome">Nome (A-Z)</SelectItem>
                    <SelectItem value="created_at">Mais recentes</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={() => setShowNewForm(true)}
                  className="h-10 whitespace-nowrap"
                >
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Novo</span>
                </Button>
              </div>
            </div>
            
            {(() => {
              const filteredConjuntos = conjuntos.filter(conjunto =>
                conjunto.nome.toLowerCase().includes(searchQuery.toLowerCase())
              );
              
              return filteredConjuntos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "Nenhum conjunto encontrado com esse nome." : "Nenhum conjunto disponível. Crie um conjunto primeiro."}
                </div>
              ) : (
                <div className="grid gap-2">
                  {filteredConjuntos.map((conjunto) => (
                    <div
                      key={conjunto.id}
                      className="flex flex-col sm:flex-row gap-2"
                    >
                      <Button
                        variant="outline"
                        className="flex-1 justify-start h-auto py-3 sm:py-4 text-left"
                        onClick={() => handleSelectConjunto(conjunto.id)}
                      >
                        <span className="truncate">{conjunto.nome}</span>
                      </Button>
                      <div className="flex gap-2 justify-end sm:justify-start">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 sm:h-auto sm:w-auto sm:aspect-square"
                          onClick={() => handleEditClick(conjunto)}
                          title="Editar conjunto"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 sm:h-auto sm:w-auto sm:aspect-square"
                          onClick={() => setShowItemsEditor(conjunto.id)}
                          title="Gerenciar itens"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 sm:h-auto sm:w-auto sm:aspect-square text-destructive hover:text-destructive"
                          onClick={() => handleDeleteConjunto(conjunto.id)}
                          title="Excluir conjunto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </DialogContent>

      {showItemsEditor && (
        <ConjuntoItensEditor
          conjuntoId={showItemsEditor}
          onClose={() => {
            setShowItemsEditor(null);
            loadConjuntos();
          }}
        />
      )}
    </Dialog>
  );
}
