import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Produto, Orcamento, OrcamentoItem } from "@/types/orcamento";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  User,
  DollarSign,
  X
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface POSViewProps {
  estabelecimentoId: string;
  onClose?: () => void;
}

export default function POSView({ estabelecimentoId, onClose }: POSViewProps) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<string>("");
  const [cartItems, setCartItems] = useState<Map<string, { produto: Produto; quantity: number }>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProdutos();
    loadClientes();
  }, []);

  const loadProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setProdutos(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos');
    }
  };

  const loadClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, nome, email, telefone')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      if (error) throw error;
      setClientes(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const filteredProdutos = produtos.filter(p => 
    p.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (produto: Produto) => {
    setCartItems(prev => {
      const newCart = new Map(prev);
      const existing = newCart.get(produto.id);
      
      if (existing) {
        newCart.set(produto.id, {
          produto,
          quantity: existing.quantity + 1
        });
      } else {
        newCart.set(produto.id, { produto, quantity: 1 });
      }
      
      return newCart;
    });
  };

  const updateQuantity = (produtoId: string, delta: number) => {
    setCartItems(prev => {
      const newCart = new Map(prev);
      const item = newCart.get(produtoId);
      
      if (item) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) {
          newCart.delete(produtoId);
        } else {
          newCart.set(produtoId, { ...item, quantity: newQty });
        }
      }
      
      return newCart;
    });
  };

  const removeFromCart = (produtoId: string) => {
    setCartItems(prev => {
      const newCart = new Map(prev);
      newCart.delete(produtoId);
      return newCart;
    });
  };

  const getTotal = () => {
    return Array.from(cartItems.values()).reduce((sum, item) => {
      return sum + (item.quantity * 10); // Preço fixo de exemplo
    }, 0);
  };

  const handleFinalize = async () => {
    if (!selectedCliente) {
      toast.error('Selecione um cliente');
      return;
    }

    if (cartItems.size === 0) {
      toast.error('Adicione itens ao carrinho');
      return;
    }

    setLoading(true);
    try {
      // Criar orçamento
      const { data: orcamento, error: orcamentoError } = await supabase
        .from('orcamentos')
        .insert({
          estabelecimento_id: estabelecimentoId,
          cliente_id: selectedCliente,
          etapa: 'orcamento',
          status: 'em_aberto',
          valor_total: getTotal(),
        })
        .select()
        .single();

      if (orcamentoError) throw orcamentoError;

      // Adicionar itens
      const items = Array.from(cartItems.values()).map(item => ({
        orcamento_id: orcamento.id,
        produto_id: item.produto.id,
        quantidade: item.quantity,
        preco_unitario: 10, // Preço fixo de exemplo
        preco_original: 10,
        desconto: 0,
        subtotal: item.quantity * 10,
      }));

      const { error: itensError } = await supabase
        .from('orcamento_itens')
        .insert(items);

      if (itensError) throw itensError;

      toast.success('Orçamento criado com sucesso!');
      
      // Limpar carrinho
      setCartItems(new Map());
      setSelectedCliente("");
      
      if (onClose) onClose();
    } catch (error: any) {
      console.error('Erro ao finalizar orçamento:', error);
      toast.error('Erro ao criar orçamento');
    } finally {
      setLoading(false);
    }
  };

  const cartArray = Array.from(cartItems.values());

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Grade de Produtos - Lado Esquerdo */}
      <div className="flex-1 flex flex-col bg-slate-900">
        {/* Header de Busca e Filtros */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Buscar produtos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 h-12 text-base"
              />
            </div>
            {onClose && (
              <Button 
                variant="outline" 
                className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                onClick={onClose}
              >
                Voltar
              </Button>
            )}
          </div>
        </div>

        {/* Grade de Produtos */}
        <ScrollArea className="flex-1 p-4">
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
            {filteredProdutos.map((produto) => (
              <Card
                key={produto.id}
                className="bg-slate-800 border-slate-700 hover:border-blue-500 cursor-pointer transition-all overflow-hidden group"
                onClick={() => addToCart(produto)}
              >
                <div className="aspect-square bg-slate-700 relative overflow-hidden">
                  {produto.foto_url ? (
                    <img 
                      src={produto.foto_url} 
                      alt={produto.nome}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl text-slate-500">{produto.nome[0]}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  
                  {cartItems.has(produto.id) && (
                    <Badge className="absolute top-2 right-2 bg-blue-600 text-white">
                      {cartItems.get(produto.id)?.quantity}
                    </Badge>
                  )}
                </div>
                
                <div className="p-3">
                  <h3 className="font-medium text-white text-sm line-clamp-2 min-h-[2.5rem]">
                    {produto.nome}
                  </h3>
                  
                  <div className="mt-2">
                    <span className="text-base font-bold text-blue-400">
                      R$ 10,00
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {filteredProdutos.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Search className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-sm">Nenhum produto encontrado</p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Painel do Carrinho - Lado Direito */}
      <div className="w-[380px] bg-slate-800 border-l border-slate-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Carrinho
            {cartArray.length > 0 && (
              <Badge className="bg-blue-600 text-white ml-auto">
                {cartArray.length}
              </Badge>
            )}
          </h2>
        </div>

        {/* Cliente */}
        <div className="p-4 border-b border-slate-700">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-2">
            <User className="w-4 h-4" />
            Cliente
          </label>
          <Select value={selectedCliente} onValueChange={setSelectedCliente}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {clientes.map((cliente) => (
                <SelectItem key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Itens */}
        <ScrollArea className="flex-1 p-4">
          {cartArray.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">Carrinho vazio</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cartArray.map(({ produto, quantity }) => (
                <div key={produto.id} className="bg-slate-700 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-slate-600 rounded flex items-center justify-center flex-shrink-0">
                      {produto.foto_url ? (
                        <img src={produto.foto_url} alt="" className="w-full h-full object-cover rounded" />
                      ) : (
                        <span className="text-slate-400 text-sm">{produto.nome[0]}</span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{produto.nome}</p>
                      <p className="text-slate-400 text-xs">R$ 10,00</p>
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-red-400 hover:text-red-300"
                      onClick={() => removeFromCart(produto.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-6 w-6 bg-slate-600 border-slate-500"
                        onClick={() => updateQuantity(produto.id, -1)}
                      >
                        <Minus className="w-3 h-3 text-white" />
                      </Button>
                      <span className="text-white font-medium w-10 text-center text-sm">{quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-6 w-6 bg-slate-600 border-slate-500"
                        onClick={() => updateQuantity(produto.id, 1)}
                      >
                        <Plus className="w-3 h-3 text-white" />
                      </Button>
                    </div>
                    <span className="text-white font-bold text-sm">
                      R$ {(quantity * 10).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-sm">Itens:</span>
              <span className="text-sm">{cartArray.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Total:</span>
              <span className="font-bold text-white text-2xl">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(getTotal())}
              </span>
            </div>
          </div>

          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12"
            onClick={handleFinalize}
            disabled={loading || cartArray.length === 0 || !selectedCliente}
          >
            <DollarSign className="w-5 h-5 mr-2" />
            {loading ? 'Processando...' : 'Finalizar Orçamento'}
          </Button>
        </div>
      </div>
    </div>
  );
}
