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
  onConfirm: (items: Array<{ produto_id: string; quantidade: number; preco: number }>) => void;
}

export function ConjuntoSelectorDialog({ open, onClose, onConfirm }: ConjuntoSelectorDialogProps) {
  const [conjuntos, setConjuntos] = useState<Array<{ id: string; nome: string; created_at: string }>>([]);
  const [selectedConjunto, setSelectedConjunto] = useState<string | null>(null);
  const [items, setItems] = useState<ConjuntoPreenchido[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [formData, setFormData] = useState({ nome: "", descricao: "" });
  const [showItemsEditor, setShowItemsEditor] = useState<string | null>(null);
  const [editingConjunto, setEditingConjunto] = useState<{ id: string; nome: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"nome" | "created_at">("nome");
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [itemSortBy, setItemSortBy] = useState<"nome" | "quantidade" | "preco">("nome");

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

  const handleSelectConjunto = async (conjuntoId: string) => {
    try {
      setLoading(true);
      setSelectedConjunto(conjuntoId);

      const { data, error } = await supabase
        .from("orcamento_conjuntos_itens")
        .select(`
          *,
          produto:produtos(id, nome)
        `)
        .eq("conjunto_id", conjuntoId)
        .order("ordem");

      if (error) throw error;

      // Inicializar itens com valores padrão
      const itemsPreenchidos = data?.map(item => ({
        ...item,
        quantidade: item.quantidade_padrao || 0,
        preco: item.preco_padrao || 0
      })) || [];

      setItems(itemsPreenchidos);
    } catch (error: any) {
      console.error("Erro ao carregar itens:", error);
      toast.error("Erro ao carregar itens do conjunto");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = (id: string, field: "quantidade" | "preco", value: number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleConfirm = () => {
    // Filtrar apenas itens com quantidade > 0
    const itemsToAdd = items
      .filter(item => item.quantidade > 0)
      .map(item => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco: item.preco
      }));

    if (itemsToAdd.length === 0) {
      toast.error("Adicione quantidade para pelo menos um item");
      return;
    }

    onConfirm(itemsToAdd);
    handleClose();
  };

  const handleClose = () => {
    setSelectedConjunto(null);
    setItems([]);
    setShowNewForm(false);
    setFormData({ nome: "", descricao: "" });
    setItemSearchQuery("");
    setItemSortBy("nome");
    onClose();
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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Selecionar Conjunto de Itens</DialogTitle>
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
        ) : !selectedConjunto ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar conjuntos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={sortBy} onValueChange={(value: "nome" | "created_at") => setSortBy(value)}>
                <SelectTrigger className="w-[180px]">
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
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo
              </Button>
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
                    className="flex gap-2"
                  >
                    <Button
                      variant="outline"
                      className="flex-1 justify-start h-auto py-4"
                      onClick={() => handleSelectConjunto(conjunto.id)}
                    >
                      {conjunto.nome}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-auto"
                      onClick={() => handleEditClick(conjunto)}
                      title="Editar conjunto"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-auto"
                      onClick={() => setShowItemsEditor(conjunto.id)}
                      title="Gerenciar itens"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-auto text-destructive hover:text-destructive"
                      onClick={() => handleDeleteConjunto(conjunto.id)}
                      title="Excluir conjunto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              );
            })()}
          </div>
        ) : loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando itens...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar produtos..."
                  value={itemSearchQuery}
                  onChange={(e) => setItemSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={itemSortBy} onValueChange={(value: "nome" | "quantidade" | "preco") => setItemSortBy(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nome">Nome (A-Z)</SelectItem>
                  <SelectItem value="quantidade">Quantidade</SelectItem>
                  <SelectItem value="preco">Preço</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setSelectedConjunto(null)}>
                Voltar
              </Button>
            </div>

            {(() => {
              let filteredItems = items.filter(item =>
                item.produto?.nome.toLowerCase().includes(itemSearchQuery.toLowerCase())
              );

              // Ordenar itens
              filteredItems = [...filteredItems].sort((a, b) => {
                if (itemSortBy === "nome") {
                  return (a.produto?.nome || "").localeCompare(b.produto?.nome || "");
                } else if (itemSortBy === "quantidade") {
                  return b.quantidade - a.quantidade;
                } else {
                  return b.preco - a.preco;
                }
              });

              return filteredItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {itemSearchQuery ? "Nenhum produto encontrado com esse nome." : "Este conjunto não possui itens cadastrados."}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="w-32">Quantidade</TableHead>
                        <TableHead className="w-32">Preço Unit.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.produto?.nome}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantidade}
                            onChange={(e) => handleUpdateItem(item.id, "quantidade", parseFloat(e.target.value) || 0)}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.preco}
                            onChange={(e) => handleUpdateItem(item.id, "preco", parseFloat(e.target.value) || 0)}
                            className="w-full"
                            placeholder="0,00"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={handleClose}>
                    Cancelar
                  </Button>
                  <Button onClick={handleConfirm}>
                    <Check className="h-4 w-4 mr-2" />
                    Adicionar ao Orçamento
                  </Button>
                </div>
              </>
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
