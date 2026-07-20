import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Produto } from "@/types/orcamento";

interface ConjuntoItem {
  id: string;
  produto_id: string;
  quantidade_padrao: number;
  preco_padrao?: number;
  ordem: number;
  produto?: Produto;
}

interface ConjuntoItensEditorProps {
  conjuntoId: string;
  onClose: () => void;
}

export function ConjuntoItensEditor({ conjuntoId, onClose }: ConjuntoItensEditorProps) {
  const [items, setItems] = useState<ConjuntoItem[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [conjuntoNome, setConjuntoNome] = useState("");
  
  const [newItem, setNewItem] = useState({
    produto_id: "",
    quantidade_padrao: 1,
    preco_padrao: 0
  });

  useEffect(() => {
    loadData();
  }, [conjuntoId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar nome do conjunto
      const { data: conjuntoData } = await supabase
        .from("orcamento_conjuntos_usuario")
        .select("nome")
        .eq("id", conjuntoId)
        .single();

      if (conjuntoData) {
        setConjuntoNome(conjuntoData.nome);
      }

      // Carregar itens do conjunto
      const { data: itemsData, error: itemsError } = await supabase
        .from("orcamento_conjuntos_itens")
        .select(`
          *,
          produto:produtos(*)
        `)
        .eq("conjunto_id", conjuntoId)
        .order("ordem", { ascending: true });

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      // Carregar produtos disponíveis
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: userData } = await supabase
        .from("usuarios")
        .select("estabelecimento_id")
        .eq("auth_user_id", user.id)
        .single();

      const { data: produtosData, error: produtosError } = await supabase
        .from("produtos")
        .select("*")
        .eq("estabelecimento_id", userData?.estabelecimento_id)
        .eq("ativo", true)
        .order("nome");

      if (produtosError) throw produtosError;
      setProdutos(produtosData || []);
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.produto_id) {
      toast.error("Selecione um produto");
      return;
    }

    // Verificar se o produto já existe no conjunto
    const produtoJaExiste = items.some(item => item.produto_id === newItem.produto_id);
    if (produtoJaExiste) {
      toast.error("Este produto já está no conjunto");
      return;
    }

    try {
      const maxOrdem = items.length > 0 ? Math.max(...items.map(i => i.ordem)) : 0;

      const { error } = await supabase
        .from("orcamento_conjuntos_itens")
        .insert({
          conjunto_id: conjuntoId,
          produto_id: newItem.produto_id,
          quantidade_padrao: newItem.quantidade_padrao,
          preco_padrao: newItem.preco_padrao || null,
          ordem: maxOrdem + 1
        });

      if (error) throw error;
      
      toast.success("Item adicionado com sucesso!");
      setNewItem({ produto_id: "", quantidade_padrao: 1, preco_padrao: 0 });
      loadData();
    } catch (error: any) {
      console.error("Erro ao adicionar item:", error);
      toast.error("Erro ao adicionar item");
    }
  };

  const handleRemoveItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from("orcamento_conjuntos_itens")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Item removido com sucesso!");
      loadData();
    } catch (error: any) {
      console.error("Erro ao remover item:", error);
      toast.error("Erro ao remover item");
    }
  };

  const handleUpdateItem = async (id: string, field: string, value: number) => {
    try {
      const { error } = await supabase
        .from("orcamento_conjuntos_itens")
        .update({ [field]: value } as any)
        .eq("id", id);

      if (error) throw error;
      
      // Atualizar localmente
      setItems(items.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      ));
    } catch (error: any) {
      console.error("Erro ao atualizar item:", error);
      toast.error("Erro ao atualizar item");
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Itens - {conjuntoNome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Adicionar novo item */}
          <div className="border rounded-lg p-4 space-y-4">
            <h4 className="font-medium">Adicionar Novo Item</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Produto *</Label>
                <Select
                  value={newItem.produto_id}
                  onValueChange={(value) => setNewItem({ ...newItem, produto_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.map((produto) => (
                      <SelectItem key={produto.id} value={produto.id}>
                        {produto.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantidade Padrão</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItem.quantidade_padrao}
                  onChange={(e) => setNewItem({ ...newItem, quantidade_padrao: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Preço Padrão (opcional)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItem.preco_padrao}
                  onChange={(e) => setNewItem({ ...newItem, preco_padrao: parseFloat(e.target.value) || 0 })}
                  placeholder="0,00"
                />
              </div>
            </div>
            <Button onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Item
            </Button>
          </div>

          {/* Lista de itens */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando itens...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum item adicionado ainda.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="w-32">Qtd. Padrão</TableHead>
                  <TableHead className="w-32">Preço Padrão</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.produto?.nome}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantidade_padrao}
                        onChange={(e) => handleUpdateItem(item.id, "quantidade_padrao", parseFloat(e.target.value) || 0)}
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.preco_padrao || 0}
                        onChange={(e) => handleUpdateItem(item.id, "preco_padrao", parseFloat(e.target.value) || 0)}
                        className="w-full"
                        placeholder="0,00"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex justify-end">
            <Button onClick={onClose}>Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
