import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { Produto, Orcamento, OrcamentoItem } from "@/types/orcamento";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  User,
  DollarSign,
  X,
  Share2,
  Camera,
  Lightbulb,
  History,
  Tag,
  Filter,
  Grid,
  List,
  Check,
  ChevronsUpDown
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import ImageItemExtractor from "./ImageItemExtractor";

interface POSViewProps {
  estabelecimentoId: string;
  orcamentoId?: string | null;
  onClose?: () => void;
}

export default function POSView({ 
  estabelecimentoId, 
  orcamentoId, 
  onClose
}: POSViewProps) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("");
  const [openEmpresaCombobox, setOpenEmpresaCombobox] = useState(false);
  const [cartItems, setCartItems] = useState<Map<string, { produto: Produto; quantity: number }>>(new Map());
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("cart");
  const [currentOrcamentoId, setCurrentOrcamentoId] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string>("");
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Filtros avançados
  const [gramaturaMin, setGramaturaMin] = useState<string>("");
  const [gramaturaMax, setGramaturaMax] = useState<string>("");
  const [larguraMin, setLarguraMin] = useState<string>("");
  const [larguraMax, setLarguraMax] = useState<string>("");
  const [comprimentoMin, setComprimentoMin] = useState<string>("");
  const [comprimentoMax, setComprimentoMax] = useState<string>("");
  const [selectedGrupo, setSelectedGrupo] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadProdutos();
    loadGrupos();
    loadEmpresas();
    if (orcamentoId) {
      loadOrcamento(orcamentoId);
    }
  }, [orcamentoId]);

  const loadProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select(`
          *,
          grupo:produto_grupos(id, nome)
        `)
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setProdutos((data as any) || []);
    } catch (error: any) {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos');
    }
  };

  const loadGrupos = async () => {
    try {
      const { data, error } = await supabase
        .from('produto_grupos')
        .select('id, nome')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      if (error) throw error;
      setGrupos(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar grupos:', error);
    }
  };

  const loadEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nome_fantasia, cnpj')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome_fantasia');

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  const loadOrcamento = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orcamentos')
        .select(`
          *,
          itens:orcamento_itens(
            *,
            produto:produtos(*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        // Preencher empresa
        setSelectedEmpresa(data.empresa_id);
        
        // Preencher carrinho com itens
        const newCart = new Map<string, { produto: Produto; quantity: number }>();
        data.itens?.forEach((item: any) => {
          if (item.produto) {
            newCart.set(item.produto.id, {
              produto: item.produto,
              quantity: item.quantidade
            });
          }
        });
        setCartItems(newCart);
        
        // Definir ID e link de compartilhamento se existir
        setCurrentOrcamentoId(data.id);
        if (data.token_compartilhamento) {
          const link = `${window.location.origin}/orcamento/${data.token_compartilhamento}`;
          setShareLink(link);
          setActiveTab("share");
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar orçamento:', error);
      toast.error('Erro ao carregar orçamento');
    } finally {
      setLoading(false);
    }
  };

  const filteredProdutos = produtos.filter(p => {
    // Filtro de nome
    if (searchQuery && !p.nome.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Filtro de grupo
    if (selectedGrupo && selectedGrupo !== 'all' && p.grupo_id !== selectedGrupo) {
      return false;
    }
    
    // Filtro de gramatura
    if (gramaturaMin && p.gramatura && p.gramatura < Number(gramaturaMin)) {
      return false;
    }
    if (gramaturaMax && p.gramatura && p.gramatura > Number(gramaturaMax)) {
      return false;
    }
    
    // Filtro de largura
    if (larguraMin && p.largura && p.largura < Number(larguraMin)) {
      return false;
    }
    if (larguraMax && p.largura && p.largura > Number(larguraMax)) {
      return false;
    }
    
    // Filtro de comprimento
    if (comprimentoMin && p.comprimento && p.comprimento < Number(comprimentoMin)) {
      return false;
    }
    if (comprimentoMax && p.comprimento && p.comprimento > Number(comprimentoMax)) {
      return false;
    }
    
    return true;
  });

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
    if (!selectedEmpresa) {
      toast.error('Selecione uma empresa');
      return;
    }

    if (cartItems.size === 0) {
      toast.error('Adicione itens ao carrinho');
      return;
    }

    setLoading(true);
    try {
      // Gerar token de compartilhamento no cliente para evitar dependência de funções no banco
      const token = crypto.randomUUID().replace(/-/g, '');
      // Criar orçamento já com o token (evita trigger/func no banco)
      const { data: orcamento, error: orcamentoError } = await supabase
        .from('orcamentos')
        .insert({
          estabelecimento_id: estabelecimentoId,
          empresa_id: selectedEmpresa,
          etapa: 'orcamento',
          status: 'em_aberto',
          valor_total: getTotal(),
          token_compartilhamento: token,
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

      // Link de compartilhamento a partir do token gerado
      const link = `${window.location.origin}/orcamento/${token}`;
      setShareLink(link);

      setCurrentOrcamentoId(orcamento.id);
      toast.success('Orçamento criado com sucesso!');
      // Limpar carrinho
      setCartItems(new Map());
      setSelectedEmpresa("");
      setActiveTab("share");
    } catch (error: any) {
      console.error('Erro ao finalizar orçamento:', error);
      toast.error('Erro ao criar orçamento');
    } finally {
      setLoading(false);
    }
  };

  const cartArray = Array.from(cartItems.values());

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      toast.success("Link copiado!");
    }
  };

  const handleItemsExtracted = async (items: any[]) => {
    // Adicionar itens extraídos ao carrinho
    items.forEach(item => {
      // Buscar produto correspondente ou adicionar como genérico
      const produto: Produto = {
        id: crypto.randomUUID(),
        estabelecimento_id: estabelecimentoId,
        nome: item.material,
        ativo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      for (let i = 0; i < item.quantidade; i++) {
        addToCart(produto);
      }
    });
    
    toast.success(`${items.length} item(ns) adicionado(s)!`);
    setActiveTab("cart");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex flex-1 overflow-hidden">
        {/* Grade de Produtos - Lado Esquerdo */}
        <div className="flex-1 flex flex-col bg-gray-100">
        {/* Header de Busca e Filtros */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-border placeholder:text-muted-foreground h-12 text-base"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="bg-background border-border hover:bg-muted"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
              </Button>
              <Button
                variant="outline"
                className="bg-background border-border hover:bg-muted"
                onClick={() => setShowFilters(!showFilters)}
              >
                Filtros {showFilters ? '▲' : '▼'}
              </Button>
            </div>
            <div className="flex gap-2">
              {onClose && (
                <Button 
                  variant="outline" 
                  className="bg-background border-border hover:bg-muted"
                  onClick={onClose}
                >
                  Voltar
                </Button>
              )}
            </div>
          </div>

          {/* Filtros Avançados */}
          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-muted rounded-lg border border-border">
              {/* Grupo */}
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Grupo</label>
                <Select value={selectedGrupo} onValueChange={setSelectedGrupo}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Todos os grupos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os grupos</SelectItem>
                    {grupos.map((grupo) => (
                      <SelectItem key={grupo.id} value={grupo.id}>
                        {grupo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Gramatura */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Gramatura Mín</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={gramaturaMin}
                  onChange={(e) => setGramaturaMin(e.target.value)}
                  className="bg-background border-border h-10"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Gramatura Máx</label>
                <Input
                  type="number"
                  placeholder="999"
                  value={gramaturaMax}
                  onChange={(e) => setGramaturaMax(e.target.value)}
                  className="bg-background border-border h-10"
                />
              </div>

              {/* Largura */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Largura Mín</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={larguraMin}
                  onChange={(e) => setLarguraMin(e.target.value)}
                  className="bg-background border-border h-10"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Largura Máx</label>
                <Input
                  type="number"
                  placeholder="999"
                  value={larguraMax}
                  onChange={(e) => setLarguraMax(e.target.value)}
                  className="bg-background border-border h-10"
                />
              </div>

              {/* Comprimento */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Comprimento Mín</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={comprimentoMin}
                  onChange={(e) => setComprimentoMin(e.target.value)}
                  className="bg-background border-border h-10"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Comprimento Máx</label>
                <Input
                  type="number"
                  placeholder="999"
                  value={comprimentoMax}
                  onChange={(e) => setComprimentoMax(e.target.value)}
                  className="bg-background border-border h-10"
                />
              </div>

              {/* Botão Limpar Filtros */}
              <div className="col-span-2 md:col-span-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-background border-border hover:bg-muted"
                  onClick={() => {
                    setSelectedGrupo("all");
                    setGramaturaMin("");
                    setGramaturaMax("");
                    setLarguraMin("");
                    setLarguraMax("");
                    setComprimentoMin("");
                    setComprimentoMax("");
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Grade/Lista de Produtos */}
        <ScrollArea className="flex-1 p-4">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
              {filteredProdutos.map((produto) => (
                <Card
                  key={produto.id}
                  className="bg-background border-border hover:border-primary cursor-pointer transition-all overflow-hidden group"
                  onClick={() => addToCart(produto)}
                >
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {produto.foto_url ? (
                      <img 
                        src={produto.foto_url} 
                        alt={produto.nome}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl text-muted-foreground">{produto.nome[0]}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                    
                    {cartItems.has(produto.id) && (
                      <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
                        {cartItems.get(produto.id)?.quantity}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="p-3">
                    <h3 className="font-medium text-sm line-clamp-2 min-h-[2.5rem]">
                      {produto.nome}
                    </h3>
                    
                    <div className="mt-2">
                      <span className="text-base font-bold text-primary">
                        R$ 10,00
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProdutos.map((produto) => (
                <Card
                  key={produto.id}
                  className="bg-card border-border hover:border-primary cursor-pointer transition-all overflow-hidden"
                  onClick={() => addToCart(produto)}
                >
                  <div className="flex items-center gap-4 p-3">
                    <div className="w-16 h-16 bg-muted rounded flex-shrink-0 overflow-hidden">
                      {produto.foto_url ? (
                        <img 
                          src={produto.foto_url} 
                          alt={produto.nome}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-2xl text-muted-foreground">{produto.nome[0]}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">
                        {produto.nome}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-base font-bold text-primary">
                          R$ 10,00
                        </span>
                        {cartItems.has(produto.id) && (
                          <Badge className="bg-primary text-primary-foreground text-xs">
                            {cartItems.get(produto.id)?.quantity} no carrinho
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      size="icon"
                      className="bg-primary hover:bg-primary/90 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(produto);
                      }}
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {filteredProdutos.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Search className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-sm">Nenhum produto encontrado</p>
            </div>
          )}
        </ScrollArea>
        </div>

      {/* Painel Lateral - Lado Direito */}
      <div className="w-[420px] bg-card border-l border-border flex flex-col overflow-hidden">

        {/* Header com Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-border">
            <TabsList className="w-full grid grid-cols-2 bg-transparent h-12 rounded-none">
              <TabsTrigger value="cart" className="data-[state=active]:bg-muted">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Carrinho
              </TabsTrigger>
              <TabsTrigger value="details" className="data-[state=active]:bg-muted">
                <Tag className="w-4 h-4 mr-2" />
                Detalhes
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Conteúdo das Tabs */}
          <TabsContent value="cart" className="flex-1 m-0">
            <ScrollArea className="h-[calc(100vh-400px)] p-4">
              {cartArray.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm">Carrinho vazio</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cartArray.map(({ produto, quantity }) => (
                    <div key={produto.id} className="bg-muted rounded-lg p-3 border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-muted/60 rounded flex items-center justify-center flex-shrink-0">
                          {produto.foto_url ? (
                            <img src={produto.foto_url} alt="" className="w-full h-full object-cover rounded" />
                          ) : (
                            <span className="text-muted-foreground">{produto.nome[0]}</span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground font-medium truncate">{produto.nome}</p>
                          <p className="text-muted-foreground text-sm">R$ 10,00</p>
                        </div>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeFromCart(produto.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 bg-background border-border hover:bg-muted"
                            onClick={() => updateQuantity(produto.id, -1)}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="text-foreground font-medium w-12 text-center">{quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 bg-background border-border hover:bg-muted"
                            onClick={() => updateQuantity(produto.id, 1)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <span className="text-foreground font-bold">
                          R$ {(quantity * 10).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="details" className="flex-1 m-0">
            <ScrollArea className="h-[calc(100vh-400px)] p-4">
              <div className="space-y-3">
                <div className="bg-muted rounded-lg p-4 border border-border">
                  <h4 className="text-sm font-medium text-foreground mb-3">Status do Orçamento</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-primary rounded-full"></div>
                      <span className="text-sm text-foreground">Em Orçamento</span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      Aguardando finalização
                    </p>
                  </div>
                </div>

                <div className="bg-muted rounded-lg p-4 border border-border">
                  <h4 className="text-sm font-medium text-foreground mb-3">Informações</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Produtos:</span>
                      <span className="text-foreground">{cartArray.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quantidade Total:</span>
                      <span className="text-foreground">{cartArray.reduce((sum, item) => sum + item.quantity, 0)}</span>
                    </div>
                    {selectedEmpresa && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Empresa:</span>
                        <span className="text-foreground">
                          {empresas.find(e => e.id === selectedEmpresa)?.nome_fantasia}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Empresa e Botões de Ação */}
        <div className="border-t border-border bg-card mt-auto">
          {/* Empresa */}
          <div className="p-4 border-b border-border">
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Empresa
            </label>
            <Popover open={openEmpresaCombobox} onOpenChange={setOpenEmpresaCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openEmpresaCombobox}
                  className="w-full justify-between bg-background border-border hover:bg-muted h-10"
                >
                  {selectedEmpresa
                    ? empresas.find((empresa) => empresa.id === selectedEmpresa)?.nome_fantasia
                    : "Selecione a empresa..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0 bg-card border-border">
                <Command className="bg-card">
                  <CommandInput 
                    placeholder="Buscar empresa por nome ou CNPJ..." 
                    className="bg-card border-border"
                  />
                  <CommandList>
                    <CommandEmpty className="text-muted-foreground py-6 text-center text-sm">
                      Nenhuma empresa encontrada.
                    </CommandEmpty>
                    <CommandGroup>
                      {empresas.map((empresa) => (
                        <CommandItem
                          key={empresa.id}
                          value={`${empresa.nome_fantasia} ${empresa.cnpj || ''}`}
                          onSelect={() => {
                            setSelectedEmpresa(empresa.id);
                            setOpenEmpresaCombobox(false);
                          }}
                          className="hover:bg-muted cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedEmpresa === empresa.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{empresa.nome_fantasia}</span>
                            {empresa.cnpj && (
                              <span className="text-xs text-muted-foreground">{empresa.cnpj}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Botões de Ação */}
          <div className="p-4 grid grid-cols-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-col h-16 bg-muted border-border hover:bg-muted/80"
              onClick={() => setShowPhotoModal(true)}
            >
              <Camera className="w-5 h-5 mb-1" />
              <span className="text-xs">Foto</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-col h-16 bg-muted border-border hover:bg-muted/80"
              onClick={() => setShowSuggestionsModal(true)}
            >
              <Lightbulb className="w-5 h-5 mb-1" />
              <span className="text-xs">Sugestões</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-col h-16 bg-muted border-border hover:bg-muted/80"
              onClick={() => setShowShareModal(true)}
              disabled={!shareLink}
            >
              <Share2 className="w-5 h-5 mb-1" />
              <span className="text-xs">Compartilhar</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-col h-16 bg-muted border-border hover:bg-muted/80"
              onClick={() => setActiveTab("details")}
            >
              <History className="w-5 h-5 mb-1" />
              <span className="text-xs">Status</span>
            </Button>
          </div>
        </div>

        {/* Modal de Foto */}
        {showPhotoModal && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-[90%] max-w-md max-h-[80vh] overflow-auto border border-border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-foreground">Extrair Itens por Foto</h3>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowPhotoModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <ImageItemExtractor onItemsExtracted={(items) => {
                handleItemsExtracted(items);
                setShowPhotoModal(false);
              }} />
            </div>
          </div>
        )}

        {/* Modal de Sugestões */}
        {showSuggestionsModal && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-[90%] max-w-md border border-border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-foreground">Sugestões de Produtos</h3>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowSuggestionsModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Lightbulb className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm text-center">Sugestões de produtos</p>
                <p className="text-xs text-center mt-1">Baseadas no histórico do cliente</p>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Compartilhar */}
        {showShareModal && shareLink && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-[90%] max-w-md border border-border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-foreground">Compartilhar Orçamento</h3>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowShareModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col items-center py-4">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-3">
                    <Share2 className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Link de compartilhamento criado!
                  </p>
                </div>

                <div className="bg-muted rounded-lg p-4 border border-border">
                  <div className="flex gap-2">
                    <Input
                      value={shareLink}
                      readOnly
                      className="bg-background border-border text-sm"
                    />
                    <Button
                      onClick={() => {
                        handleCopyLink();
                        setShowShareModal(false);
                      }}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Barra de Total Inferior */}
      <div className="bg-card border-t border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-5 h-5" />
            <span className="text-sm">
              {selectedEmpresa 
                ? empresas.find(e => e.id === selectedEmpresa)?.nome_fantasia 
                : 'Nenhuma empresa selecionada'}
            </span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <div className="text-muted-foreground text-xs mb-1">Total</div>
            <div className="text-foreground font-bold text-3xl">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(getTotal())}
            </div>
          </div>
        </div>
        
        <Button 
          className="bg-primary hover:bg-primary/90 h-14 px-8 text-base font-semibold"
          onClick={handleFinalize}
          disabled={loading || cartArray.length === 0 || !selectedEmpresa}
        >
          {loading ? 'Processando...' : 'Finalizar Orçamento'}
          <span className="ml-2">→</span>
        </Button>
      </div>
    </div>
  );
}
