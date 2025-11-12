import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { Produto, ProdutoGrupo } from "@/types/orcamento";
import ProductSearchFilters, { ProductFilters } from "./ProductSearchFilters";

interface AddItemFormProps {
  orcamentoId: string;
  estabelecimentoId?: string;
  onItemAdded: () => void;
}

export default function AddItemForm({ orcamentoId, estabelecimentoId, onItemAdded }: AddItemFormProps) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [filteredProdutos, setFilteredProdutos] = useState<Produto[]>([]);
  const [grupos, setGrupos] = useState<ProdutoGrupo[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    produto_id: "",
    quantidade: 1,
    preco_unitario: 0,
  });

  const loadProdutos = async () => {
    try {
      let query = supabase
        .from('produtos')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (estabelecimentoId) {
        query = query.eq('estabelecimento_id', estabelecimentoId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProdutos(data || []);
      setFilteredProdutos(data || []);
    } catch (error: any) {
      console.error('Error loading produtos:', error);
      toast.error('Erro ao carregar produtos');
    }
  };

  const loadGrupos = async () => {
    try {
      let query = supabase
        .from('produto_grupos')
        .select('*')
        .order('nome');

      if (estabelecimentoId) {
        query = query.eq('estabelecimento_id', estabelecimentoId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setGrupos(data || []);
    } catch (error: any) {
      console.error('Error loading grupos:', error);
    }
  };

  const applyFilters = (filters: ProductFilters) => {
    let filtered = [...produtos];

    // Filtro por nome
    if (filters.nome) {
      filtered = filtered.filter(p => 
        p.nome.toLowerCase().includes(filters.nome!.toLowerCase())
      );
    }

    // Filtro por grupo
    if (filters.grupoId) {
      filtered = filtered.filter(p => p.grupo_id === filters.grupoId);
    }

    // Filtro por gramatura
    if (filters.gramaturaMin !== undefined) {
      filtered = filtered.filter(p => p.gramatura && p.gramatura >= filters.gramaturaMin!);
    }
    if (filters.gramaturaMax !== undefined) {
      filtered = filtered.filter(p => p.gramatura && p.gramatura <= filters.gramaturaMax!);
    }

    // Filtro por largura
    if (filters.larguraMin !== undefined) {
      filtered = filtered.filter(p => p.largura && p.largura >= filters.larguraMin!);
    }
    if (filters.larguraMax !== undefined) {
      filtered = filtered.filter(p => p.largura && p.largura <= filters.larguraMax!);
    }

    // Filtro por comprimento
    if (filters.comprimentoMin !== undefined) {
      filtered = filtered.filter(p => p.comprimento && p.comprimento >= filters.comprimentoMin!);
    }
    if (filters.comprimentoMax !== undefined) {
      filtered = filtered.filter(p => p.comprimento && p.comprimento <= filters.comprimentoMax!);
    }

    setFilteredProdutos(filtered);
  };

  // Carregar produtos e grupos ao montar
  useEffect(() => {
    loadProdutos();
    loadGrupos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.produto_id) {
      toast.error('Selecione um produto');
      return;
    }

    if (formData.quantidade <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    if (formData.preco_unitario <= 0) {
      toast.error('Preço deve ser maior que zero');
      return;
    }

    setLoading(true);
    try {
      const subtotal = formData.quantidade * formData.preco_unitario;

      const { error } = await supabase
        .from('orcamento_itens')
        .insert({
          orcamento_id: orcamentoId,
          produto_id: formData.produto_id,
          quantidade: formData.quantidade,
          preco_unitario: formData.preco_unitario,
          preco_original: formData.preco_unitario,
          desconto: 0,
          subtotal: subtotal,
        });

      if (error) throw error;

      // Atualizar valor total do orçamento
      const { data: itens, error: itensError } = await supabase
        .from('orcamento_itens')
        .select('subtotal')
        .eq('orcamento_id', orcamentoId);

      if (itensError) throw itensError;

      const valorTotal = itens.reduce((sum, item) => sum + Number(item.subtotal), 0);

      const { error: updateError } = await supabase
        .from('orcamentos')
        .update({ valor_total: valorTotal })
        .eq('id', orcamentoId);

      if (updateError) throw updateError;

      toast.success('Item adicionado com sucesso!');
      setFormData({ produto_id: "", quantidade: 1, preco_unitario: 0 });
      onItemAdded();
    } catch (error: any) {
      console.error('Error adding item:', error);
      toast.error('Erro ao adicionar item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Adicionar Item
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros de Busca */}
        <ProductSearchFilters 
          grupos={grupos}
          onFilterChange={applyFilters}
        />

        {/* Formulário de Adição */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="produto">Produto ({filteredProdutos.length} encontrado{filteredProdutos.length !== 1 ? 's' : ''})</Label>
            <Select
              value={formData.produto_id}
              onValueChange={(value) => {
                setFormData({
                  ...formData,
                  produto_id: value,
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um produto" />
              </SelectTrigger>
              <SelectContent>
                {filteredProdutos.map((produto) => {
                  const dims = [
                    produto.largura ? `L: ${produto.largura}` : null,
                    produto.comprimento ? `C: ${produto.comprimento}` : null,
                    produto.gramatura ? `G: ${produto.gramatura}` : null,
                  ]
                    .filter(Boolean)
                    .join(" ");
                  const label = dims ? `${produto.nome} (${dims})` : produto.nome;
                  return (
                    <SelectItem key={produto.id} value={produto.id}>
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade</Label>
              <Input
                id="quantidade"
                type="number"
                min="1"
                step="1"
                value={formData.quantidade}
                onChange={(e) =>
                  setFormData({ ...formData, quantidade: Number(e.target.value) })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preco">Preço Unitário (R$)</Label>
              <Input
                id="preco"
                type="number"
                min="0"
                step="0.01"
                value={formData.preco_unitario}
                onChange={(e) =>
                  setFormData({ ...formData, preco_unitario: Number(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-muted-foreground">
              Subtotal: {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(formData.quantidade * formData.preco_unitario)}
            </div>
            <Button type="submit" disabled={loading}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
