import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { Produto, Orcamento, OrcamentoItem } from "@/types/orcamento";
import { aplicarRegrasAutomacao } from "@/services/automacaoFlowEngine";
import { usePedagioCalculation } from "@/hooks/usePedagioCalculation";
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
  ChevronsUpDown,
  ChevronRight,
  ChevronLeft,
  Package,
  Maximize2,
  Eye,
  Truck,
  Loader2,
  AlertCircle
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
import { ConjuntoSelectorDialog } from "./ConjuntoSelectorDialog";
import { PedagioDetailsDialog } from "./PedagioDetailsDialog";
import { RouteDataDialog } from "./RouteDataDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Info, Map as MapIcon } from "lucide-react";

interface POSViewProps {
  estabelecimentoId: string;
  orcamentoId?: string | null;
  onClose?: () => void;
  showClientDetails?: boolean;
  onToggleClientDetails?: () => void;
}

export default function POSView({ 
  estabelecimentoId, 
  orcamentoId, 
  onClose,
  showClientDetails = false,
  onToggleClientDetails
}: POSViewProps) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("");
  const [openEmpresaCombobox, setOpenEmpresaCombobox] = useState(false);
  const [cartItems, setCartItems] = useState<Map<string, { produto: Produto; quantity: number; preco: number }>>(new Map());
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("cart");
  const [currentOrcamentoId, setCurrentOrcamentoId] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string>("");
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [regrasAplicadas, setRegrasAplicadas] = useState<string[]>([]);
  const [valorComRegras, setValorComRegras] = useState<number>(0);
  const [detalhesRegras, setDetalhesRegras] = useState<string>("");
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showConjuntoDialog, setShowConjuntoDialog] = useState(false);
  const [conjuntoSelecionado, setConjuntoSelecionado] = useState<string | null>(null);
  const [conjuntoItens, setConjuntoItens] = useState<Array<{
    id: string;
    produto_id: string;
    quantidade_padrao: number;
    preco_padrao?: number;
    quantidade: number;
    preco: number;
    produto?: { id: string; nome: string };
  }>>([]);
  
  // Filtros avançados
  const [gramaturaMin, setGramaturaMin] = useState<string>("");
  const [gramaturaMax, setGramaturaMax] = useState<string>("");
  const [larguraMin, setLarguraMin] = useState<string>("");
  const [larguraMax, setLarguraMax] = useState<string>("");
  const [comprimentoMin, setComprimentoMin] = useState<string>("");
  const [comprimentoMax, setComprimentoMax] = useState<string>("");
  const [selectedGrupo, setSelectedGrupo] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const primeiroInputRef = useRef<HTMLInputElement>(null);
  const [showCartDialog, setShowCartDialog] = useState(false);
  const [cartSearchQuery, setCartSearchQuery] = useState("");
  const [cartSortBy, setCartSortBy] = useState<"nome" | "quantidade" | "preco" | "subtotal">("nome");
  const [tempCartItems, setTempCartItems] = useState<Map<string, { produto: Produto; quantity: number; preco: number }>>(new Map());
  const [showRegrasDialog, setShowRegrasDialog] = useState(false);
  const [gruposQuantities, setGruposQuantities] = useState<Map<string, number>>(new Map());
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [showPedagioDetailsDialog, setShowPedagioDetailsDialog] = useState(false);
  const [showRouteDataDialog, setShowRouteDataDialog] = useState(false);

  // Hook para cálculo de pedágio
  const pedagioResult = usePedagioCalculation(estabelecimentoId, selectedEmpresa);

  useEffect(() => {
    loadProdutos();
    loadGrupos();
    loadEmpresas();
    if (orcamentoId) {
      loadOrcamento(orcamentoId);
    }
  }, [orcamentoId]);

  // Aplicar regras em tempo real
  useEffect(() => {
    const aplicarRegrasTempoReal = async () => {
      // Resetar se não houver itens ou empresa
      if (cartItems.size === 0 || !selectedEmpresa) {
        setRegrasAplicadas([]);
        setValorComRegras(getTotal());
        setDetalhesRegras("");
        return;
      }

      try {
        // Buscar empresa selecionada
        const { data: empresaData, error: empresaError } = await supabase
          .from('empresas')
          .select('*')
          .eq('id', selectedEmpresa)
          .single();

        if (empresaError || !empresaData) {
          console.error("Erro ao buscar empresa:", empresaError);
          setRegrasAplicadas([]);
          setValorComRegras(getTotal());
          setDetalhesRegras("");
          return;
        }

        // Buscar regras ativas
        // Buscar regras ativas de automação
        const { data: regras, error: regrasError } = await supabase
          .from('automacoes_vendas')
          .select('*')
          .eq('estabelecimento_id', estabelecimentoId)
          .eq('ativo', true)
          .order('prioridade', { ascending: false });

        // Buscar configuração de automação
        const { data: estabelecimentoConfig } = await supabase
          .from('estabelecimentos')
          .select('automacao_vendas_config')
          .eq('id', estabelecimentoId)
          .single();

        if (regrasError) {
          console.error("Erro ao buscar regras:", regrasError);
          setRegrasAplicadas([]);
          setValorComRegras(getTotal());
          setDetalhesRegras("");
          return;
        }

        if (!regras || regras.length === 0) {
          setRegrasAplicadas([]);
          setValorComRegras(getTotal());
          setDetalhesRegras("");
          return;
        }

        const valorInicial = getTotal();
        const customFields = empresaData?.custom_fields as any;
        const mesAniversario = customFields?.mes_aniversario;

        const resultado = await aplicarRegrasAutomacao(
          {
            valor_total: valorInicial,
            quantidade_produtos: cartItems.size,
            data_compra: new Date(),
            cliente: {
              id: empresaData?.id || '',
              mes_aniversario: mesAniversario
            },
            empresa_id: selectedEmpresa,
            vendedor_id: undefined
          },
          regras as any[],
          (estabelecimentoConfig?.automacao_vendas_config || { nao_acumular_descontos: false }) as { nao_acumular_descontos?: boolean }
        );

        setValorComRegras(resultado.valorFinal);
        setRegrasAplicadas(resultado.regrasAplicadas);
        
        // Criar texto descritivo das regras
        let detalhes = "";
        if (resultado.descontos.length > 0) {
          resultado.descontos.forEach((desconto: any) => {
            const valorDesconto = valorInicial - resultado.valorFinal;
            detalhes += `${desconto.regra}: -${new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            }).format(valorDesconto)}\n`;
          });
        }
        setDetalhesRegras(detalhes);
      } catch (error) {
        console.error("Erro ao aplicar regras:", error);
        // Em caso de erro, manter o valor sem regras
        setRegrasAplicadas([]);
        setValorComRegras(getTotal());
        setDetalhesRegras("");
      }
    };

    aplicarRegrasTempoReal();
  }, [cartItems, selectedEmpresa, estabelecimentoId]);

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
        const newCart = new Map<string, { produto: Produto; quantity: number; preco: number }>();
        data.itens?.forEach((item: any) => {
          if (item.produto) {
            newCart.set(item.produto.id, {
              produto: item.produto,
              quantity: item.quantidade,
              preco: item.preco_unitario || 10
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
          quantity: existing.quantity + 1,
          preco: existing.preco
        });
      } else {
        newCart.set(produto.id, { produto, quantity: 1, preco: 10 });
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

  const updatePrice = (produtoId: string, newPrice: number) => {
    setCartItems(prev => {
      const newCart = new Map(prev);
      const item = newCart.get(produtoId);
      
      if (item) {
        newCart.set(produtoId, { ...item, preco: newPrice });
      }
      
      return newCart;
    });
  };

  const getTotal = () => {
    return Array.from(cartItems.values()).reduce((sum, item) => {
      return sum + (item.quantity * item.preco);
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
      // Buscar empresa selecionada para obter dados do cliente
      const { data: empresaData } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', selectedEmpresa)
        .single();

      // Buscar regras ativas de automação
      const { data: regras } = await supabase
        .from('automacoes_vendas')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativo', true)
        .order('prioridade', { ascending: false });

      // Buscar configuração de automação
      const { data: estabelecimentoConfig } = await supabase
        .from('estabelecimentos')
        .select('automacao_vendas_config')
        .eq('id', estabelecimentoId)
        .single();

      // Calcular valor total inicial
      const valorInicial = getTotal();

      // Aplicar regras de automação
      let valorFinal = valorInicial;
      let descontosAplicados: any[] = [];
      let regrasAplicadas: string[] = [];

      if (regras && regras.length > 0) {
        const customFields = empresaData?.custom_fields as any;
        const mesAniversario = customFields?.mes_aniversario;

        const resultado = await aplicarRegrasAutomacao(
          {
            valor_total: valorInicial,
            quantidade_produtos: cartItems.size,
            data_compra: new Date(),
            cliente: {
              id: empresaData?.id || '',
              mes_aniversario: mesAniversario
            },
            empresa_id: selectedEmpresa,
            vendedor_id: undefined // Pode ser adicionado futuramente
          },
          regras as any[],
          (estabelecimentoConfig?.automacao_vendas_config || { nao_acumular_descontos: false }) as { nao_acumular_descontos?: boolean }
        );

        valorFinal = resultado.valorFinal;
        descontosAplicados = resultado.descontos;
        regrasAplicadas = resultado.regrasAplicadas;

        if (regrasAplicadas.length > 0) {
          toast.success(`${regrasAplicadas.length} regra(s) de automação aplicada(s)!`);
          console.log('Detalhes das regras:', resultado.detalhes);
        }
      }

      // Gerar token de compartilhamento no cliente para evitar dependência de funções no banco
      const token = crypto.randomUUID().replace(/-/g, '');
      // Criar orçamento já com o token e valor final após regras
      const { data: orcamento, error: orcamentoError } = await supabase
        .from('orcamentos')
        .insert({
          estabelecimento_id: estabelecimentoId,
          empresa_id: selectedEmpresa,
          etapa: 'orcamento',
          status: 'em_aberto',
          valor_total: valorFinal,
          valor_desconto: valorInicial - valorFinal,
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

      // Salvar log das regras aplicadas
      if (regrasAplicadas.length > 0 && descontosAplicados.length > 0) {
        const logsToInsert = descontosAplicados.map((desconto, idx) => ({
          automacao_id: regras![idx]?.id,
          orcamento_id: orcamento.id,
          regra_aplicada: desconto.regra,
          valor_desconto: desconto.valor,
          percentual_desconto: desconto.tipo === 'percentual' ? (desconto.valor / valorInicial) * 100 : null
        }));

        await supabase
          .from('automacoes_vendas_log')
          .insert(logsToInsert);
      }

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

  const handleConjuntoConfirm = async (conjuntoId: string) => {
    try {
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

      setConjuntoSelecionado(conjuntoId);
      setConjuntoItens(itemsPreenchidos);
      setShowConjuntoDialog(false);
      toast.success("Conjunto carregado! Preencha as quantidades e preços.");
      
      // Focar no primeiro input após um pequeno delay para garantir que o componente foi renderizado
      setTimeout(() => {
        primeiroInputRef.current?.focus();
      }, 100);
    } catch (error: any) {
      console.error("Erro ao carregar itens do conjunto:", error);
      toast.error("Erro ao carregar itens do conjunto");
    }
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
              <Button
                variant="outline"
                className="bg-background border-border hover:bg-muted"
                onClick={() => setShowConjuntoDialog(true)}
              >
                <Package className="w-4 h-4 mr-2" />
                Usar Conjunto
              </Button>
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

        {/* Itens do Conjunto Selecionado */}
        {conjuntoSelecionado && conjuntoItens.length > 0 && (
          <div className="px-4 pb-4">
            <Card className="bg-card border-border">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Itens do Conjunto</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        const itensComQuantidade = conjuntoItens.filter(item => item.quantidade > 0 && item.preco > 0);
                        if (itensComQuantidade.length === 0) {
                          toast.error("Nenhum item com quantidade e preço preenchidos");
                          return;
                        }
                        
                        itensComQuantidade.forEach(item => {
                          const produto = produtos.find(p => p.id === item.produto_id);
                          if (produto) {
                            for (let i = 0; i < item.quantidade; i++) {
                              addToCart(produto);
                            }
                          }
                        });
                        
                        toast.success(`${itensComQuantidade.length} item(ns) adicionado(s) ao carrinho`);
                        setConjuntoSelecionado(null);
                        setConjuntoItens([]);
                      }}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Adicionar Todos
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setConjuntoSelecionado(null);
                        setConjuntoItens([]);
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Fechar
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-sm font-medium text-foreground">Produto</th>
                        <th className="text-center py-2 px-2 text-sm font-medium text-foreground w-32">Quantidade</th>
                        <th className="text-center py-2 px-2 text-sm font-medium text-foreground w-32">Preço</th>
                        <th className="text-center py-2 px-2 text-sm font-medium text-foreground w-24">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conjuntoItens.map((item, index) => (
                        <tr key={item.id} className="border-b border-border/50">
                          <td className="py-2 px-2 text-sm text-foreground">{item.produto?.nome}</td>
                          <td className="py-2 px-2">
                            <Input
                              ref={index === 0 ? primeiroInputRef : null}
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.quantidade}
                              onChange={(e) => {
                                const newValue = parseFloat(e.target.value) || 0;
                                setConjuntoItens(conjuntoItens.map(i =>
                                  i.id === item.id ? { ...i, quantidade: newValue } : i
                                ));
                              }}
                              className="text-center h-8"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.preco}
                              onChange={(e) => {
                                const newValue = parseFloat(e.target.value) || 0;
                                setConjuntoItens(conjuntoItens.map(i =>
                                  i.id === item.id ? { ...i, preco: newValue } : i
                                ));
                              }}
                              className="text-center h-8"
                              placeholder="0,00"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <Button
                              size="sm"
                              tabIndex={-1}
                              onClick={() => {
                                if (item.quantidade > 0 && item.preco > 0) {
                                  const produto = produtos.find(p => p.id === item.produto_id);
                                  if (produto) {
                                    // Adicionar ao carrinho com preço customizado
                                    setCartItems(prev => {
                                      const newCart = new Map(prev);
                                      const existing = newCart.get(produto.id);
                                      
                                      if (existing) {
                                        newCart.set(produto.id, {
                                          produto,
                                          quantity: existing.quantity + item.quantidade,
                                          preco: item.preco
                                        });
                                      } else {
                                        newCart.set(produto.id, { 
                                          produto, 
                                          quantity: item.quantidade, 
                                          preco: item.preco 
                                        });
                                      }
                                      
                                      return newCart;
                                    });
                                    toast.success(`${item.produto?.nome} adicionado ao carrinho`);
                                  }
                                } else {
                                  toast.error("Preencha quantidade e preço");
                                }
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Grade/Lista de Produtos - Oculto quando conjunto está selecionado */}
        {conjuntoItens.length === 0 && (
        <ScrollArea className="flex-1 p-4">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
              {filteredProdutos.map((produto) => {
                const quantity = gruposQuantities.get(produto.id) || 1;
                return (
                  <Card
                    key={produto.id}
                    className="bg-background border-border hover:border-primary transition-all overflow-hidden group"
                  >
                    <div 
                      className="aspect-square bg-muted relative overflow-hidden cursor-pointer"
                      onClick={() => {
                        for (let i = 0; i < quantity; i++) {
                          addToCart(produto);
                        }
                        setGruposQuantities(prev => {
                          const next = new Map(prev);
                          next.set(produto.id, 1);
                          return next;
                        });
                      }}
                    >
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
                      
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute top-2 left-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduto(produto);
                          setActiveTab("details");
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="p-3">
                      <h3 className="font-medium text-sm line-clamp-2 min-h-[2.5rem]">
                        {produto.nome}
                      </h3>
                      
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-base font-bold text-primary">
                          R$ 10,00
                        </span>
                        <Input
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => {
                            e.stopPropagation();
                            const newQty = parseInt(e.target.value) || 1;
                            setGruposQuantities(prev => {
                              const next = new Map(prev);
                              next.set(produto.id, newQty);
                              return next;
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-16 h-7 text-center text-xs p-1 bg-background border-border"
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProdutos.map((produto) => {
                const quantity = gruposQuantities.get(produto.id) || 1;
                return (
                  <Card
                    key={produto.id}
                    className="bg-card border-border hover:border-primary transition-all overflow-hidden"
                  >
                    <div className="flex items-center gap-4 p-3">
                      <div 
                        className="w-16 h-16 bg-muted rounded flex-shrink-0 overflow-hidden cursor-pointer"
                        onClick={() => {
                          for (let i = 0; i < quantity; i++) {
                            addToCart(produto);
                          }
                          setGruposQuantities(prev => {
                            const next = new Map(prev);
                            next.set(produto.id, 1);
                            return next;
                          });
                        }}
                      >
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
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-9 w-9"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduto(produto);
                            setActiveTab("details");
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => {
                            e.stopPropagation();
                            const newQty = parseInt(e.target.value) || 1;
                            setGruposQuantities(prev => {
                              const next = new Map(prev);
                              next.set(produto.id, newQty);
                              return next;
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-20 h-9 text-center text-sm p-1 bg-background border-border"
                        />
                        <Button
                          size="icon"
                          className="bg-primary hover:bg-primary/90 h-9 w-9"
                          onClick={(e) => {
                            e.stopPropagation();
                            for (let i = 0; i < quantity; i++) {
                              addToCart(produto);
                            }
                            setGruposQuantities(prev => {
                              const next = new Map(prev);
                              next.set(produto.id, 1);
                              return next;
                            });
                          }}
                        >
                          <Plus className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {filteredProdutos.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Search className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-sm">Nenhum produto encontrado</p>
            </div>
          )}
        </ScrollArea>
        )}
        </div>

      {/* Painel Lateral - Lado Direito */}
      <div className="w-[300px] bg-card border-l border-border flex flex-col overflow-hidden">

        {/* Header com Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-border flex items-center justify-between px-2 py-1">
            <TabsList className="bg-transparent h-10 rounded-none flex-1">
              <TabsTrigger value="cart" className="data-[state=active]:bg-muted text-xs flex-1">
                <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                Carrinho
              </TabsTrigger>
              <TabsTrigger value="details" className="data-[state=active]:bg-muted text-xs flex-1">
                <Tag className="w-3.5 h-3.5 mr-1.5" />
                Detalhes
              </TabsTrigger>
            </TabsList>
            {onToggleClientDetails && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onToggleClientDetails}
                className="h-8 w-8 p-0 ml-1"
                title={showClientDetails ? "Ocultar detalhes" : "Mostrar detalhes"}
              >
                {showClientDetails ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            )}
          </div>

          {/* Conteúdo das Tabs */}
          <TabsContent value="cart" className="flex-1 m-0">
            <div className="px-2 py-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full mb-2"
                onClick={() => {
                  setTempCartItems(new Map(cartItems));
                  setShowCartDialog(true);
                }}
                disabled={cartArray.length === 0}
              >
                <Maximize2 className="w-4 h-4 mr-2" />
                Conferir Itens
              </Button>
            </div>
            <ScrollArea className="h-[calc(100vh-460px)] p-2">
              {cartArray.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <ShoppingCart className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-xs">Carrinho vazio</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {cartArray.map(({ produto, quantity, preco }) => (
                    <div key={produto.id} className="bg-muted/50 rounded p-2 border border-border/50">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center flex-shrink-0">
                          {produto.foto_url ? (
                            <img src={produto.foto_url} alt="" className="w-full h-full object-cover rounded" />
                          ) : (
                            <span className="text-muted-foreground text-xs">{produto.nome[0]}</span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground text-xs font-medium truncate">{produto.nome}</p>
                          <p className="text-muted-foreground text-[10px]">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(preco)}
                          </p>
                        </div>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
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
                            className="h-6 w-6 bg-background border-border hover:bg-muted"
                            onClick={() => updateQuantity(produto.id, -1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => {
                              const newQty = parseInt(e.target.value) || 1;
                              setCartItems(prev => {
                                const newCart = new Map(prev);
                                const item = newCart.get(produto.id);
                                if (item) {
                                  newCart.set(produto.id, { ...item, quantity: newQty });
                                }
                                return newCart;
                              });
                            }}
                            className="w-20 h-6 text-center text-xs p-1 bg-background border-border"
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-6 w-6 bg-background border-border hover:bg-muted"
                            onClick={() => updateQuantity(produto.id, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <span className="text-foreground text-xs font-bold">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(quantity * preco)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="details" className="flex-1 m-0">
            <ScrollArea className="h-[calc(100vh-400px)] p-2">
              {selectedProduto ? (
                <div className="space-y-2">
                  {/* Imagem do Produto */}
                  {selectedProduto.foto_url && (
                    <div className="aspect-square bg-muted rounded overflow-hidden border border-border">
                      <img 
                        src={selectedProduto.foto_url} 
                        alt={selectedProduto.nome}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  {/* Nome */}
                  <div className="bg-muted/50 rounded p-2.5 border border-border/50">
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Nome</h4>
                    <p className="text-sm text-foreground font-semibold">{selectedProduto.nome}</p>
                  </div>
                  
                  {/* Categoria e Grupo */}
                  {(selectedProduto.categoria || selectedProduto.grupo) && (
                    <div className="bg-muted/50 rounded p-2.5 border border-border/50">
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">Classificação</h4>
                      <div className="space-y-1.5 text-xs">
                        {selectedProduto.categoria && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Categoria:</span>
                            <span className="text-foreground font-medium">{selectedProduto.categoria.nome}</span>
                          </div>
                        )}
                        {selectedProduto.grupo && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Grupo:</span>
                            <span className="text-foreground font-medium">{selectedProduto.grupo.nome}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Dimensões */}
                  {(selectedProduto.largura || selectedProduto.comprimento || selectedProduto.gramatura || selectedProduto.peso_unitario) && (
                    <div className="bg-muted/50 rounded p-2.5 border border-border/50">
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">Especificações</h4>
                      <div className="space-y-1.5 text-xs">
                        {selectedProduto.largura && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Largura:</span>
                            <span className="text-foreground font-medium">{selectedProduto.largura} cm</span>
                          </div>
                        )}
                        {selectedProduto.comprimento && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Comprimento:</span>
                            <span className="text-foreground font-medium">{selectedProduto.comprimento} cm</span>
                          </div>
                        )}
                        {selectedProduto.gramatura && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Gramatura:</span>
                            <span className="text-foreground font-medium">{selectedProduto.gramatura} g/m²</span>
                          </div>
                        )}
                        {selectedProduto.peso_unitario && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Peso:</span>
                            <span className="text-foreground font-medium">{selectedProduto.peso_unitario} kg</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Status */}
                  <div className="bg-muted/50 rounded p-2.5 border border-border/50">
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Status</h4>
                    <Badge variant={selectedProduto.ativo ? "default" : "secondary"}>
                      {selectedProduto.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  
                  {/* Botão para voltar */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedProduto(null)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Fechar Detalhes
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="bg-muted/50 rounded p-2.5 border border-border/50">
                    <h4 className="text-xs font-medium text-foreground mb-2">Status</h4>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="text-xs text-foreground">Em Orçamento</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground ml-4">
                        Aguardando finalização
                      </p>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded p-2.5 border border-border/50">
                    <h4 className="text-xs font-medium text-foreground mb-2">Informações</h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-[10px]">Produtos:</span>
                        <span className="text-foreground">{cartArray.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-[10px]">Qtd. Total:</span>
                        <span className="text-foreground">{cartArray.reduce((sum, item) => sum + item.quantity, 0)}</span>
                      </div>
                      {selectedEmpresa && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-[10px]">Empresa:</span>
                          <span className="text-foreground text-[10px] truncate max-w-[140px]">
                            {empresas.find(e => e.id === selectedEmpresa)?.nome_fantasia}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Eye className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-xs text-center">Clique no ícone de olho em um produto</p>
                    <p className="text-xs text-center mt-1">para ver seus detalhes aqui</p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Empresa e Botões de Ação */}
        <div className="border-t border-border bg-card mt-auto">
          {/* Empresa */}
          <div className="p-2 border-b border-border">
            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">
              Empresa
            </label>
            <Popover open={openEmpresaCombobox} onOpenChange={setOpenEmpresaCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openEmpresaCombobox}
                  className="w-full justify-between bg-background border-border hover:bg-muted h-8 text-xs"
                >
                  {selectedEmpresa
                    ? empresas.find((empresa) => empresa.id === selectedEmpresa)?.nome_fantasia
                    : "Selecionar..."}
                  <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0 bg-card border-border z-50">
                <Command className="bg-card">
                  <CommandInput 
                    placeholder="Buscar empresa..." 
                    className="bg-card border-border text-xs h-8"
                  />
                  <CommandList>
                    <CommandEmpty className="text-muted-foreground py-4 text-center text-xs">
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
          <div className="p-2 grid grid-cols-4 gap-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-col h-12 bg-muted/50 border-border/50 hover:bg-muted text-[10px] p-1"
              onClick={() => setShowPhotoModal(true)}
            >
              <Camera className="w-3.5 h-3.5 mb-0.5" />
              <span>Foto</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-col h-12 bg-muted/50 border-border/50 hover:bg-muted text-[10px] p-1"
              onClick={() => setShowSuggestionsModal(true)}
            >
              <Lightbulb className="w-3.5 h-3.5 mb-0.5" />
              <span>Sugestões</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-col h-12 bg-muted/50 border-border/50 hover:bg-muted text-[10px] p-1"
              onClick={() => setShowShareModal(true)}
              disabled={!shareLink}
            >
              <Share2 className="w-3.5 h-3.5 mb-0.5" />
              <span>Compartilhar</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-col h-12 bg-muted/50 border-border/50 hover:bg-muted text-[10px] p-1"
              onClick={() => setActiveTab("details")}
            >
              <History className="w-3.5 h-3.5 mb-0.5" />
              <span>Status</span>
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
            <div className="flex items-baseline gap-3">
              {regrasAplicadas.length > 0 ? (
                <>
                  <div className="text-muted-foreground font-semibold text-xl line-through">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(getTotal())}
                  </div>
                  <div className="text-foreground font-bold text-3xl">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(valorComRegras)}
                  </div>
                  <div className="flex flex-col">
                    <Badge 
                      variant="secondary" 
                      className="bg-green-500/10 text-green-600 border-green-500/20 text-xs cursor-pointer hover:bg-green-500/20 transition-colors"
                      onClick={() => setShowRegrasDialog(true)}
                    >
                      {regrasAplicadas.length} regra(s) aplicada(s) 
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Badge>
                    {detalhesRegras && (
                      <span className="text-[10px] text-muted-foreground mt-1 whitespace-pre-line">
                        {detalhesRegras.split('\n')[0]}...
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-foreground font-bold text-3xl">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(getTotal())}
                </div>
              )}
            </div>
          </div>
          
          {/* Valor de Pedágio */}
          {selectedEmpresa && (
            <>
              <div className="h-8 w-px bg-border" />
              <div>
                <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                  <Truck className="w-3 h-3" />
                  <span>Rota & Pedágio</span>
                </div>
                {/* Sempre mostrar CEPs se disponíveis */}
                {(pedagioResult.origemCep || pedagioResult.destinoCep) && (
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <span className="font-medium">Origem:</span>
                    <span className="bg-muted px-1 py-0.5 rounded text-[11px]">
                      {pedagioResult.origemCep ? pedagioResult.origemCep.replace(/(\d{5})(\d{3})/, '$1-$2') : 'N/A'}
                    </span>
                    <span className="mx-1">→</span>
                    <span className="font-medium">Destino:</span>
                    <span className="bg-muted px-1 py-0.5 rounded text-[11px]">
                      {pedagioResult.destinoCep ? pedagioResult.destinoCep.replace(/(\d{5})(\d{3})/, '$1-$2') : 'N/A'}
                    </span>
                  </div>
                )}
                {pedagioResult.loading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Calculando...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Mostrar erro se houver */}
                    {pedagioResult.error && (
                      <div className="flex items-center gap-1 text-yellow-600 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-xs">{pedagioResult.error}</span>
                      </div>
                    )}
                    
                    {/* Distância e Tempo - só mostra se não houver erro */}
                    {!pedagioResult.error && (pedagioResult.distanciaTotalKm > 0 || pedagioResult.tempoTotalMin > 0) && (
                      <div className="flex items-center gap-4 text-xs">
                        {pedagioResult.distanciaTotalKm > 0 && (
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground">Distância (ida+volta)</span>
                            <span className="font-medium text-foreground">
                              {pedagioResult.distanciaTotalKm.toFixed(1)} km
                            </span>
                          </div>
                        )}
                        {pedagioResult.tempoTotalMin > 0 && (
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground">Tempo (ida+volta)</span>
                            <span className="font-medium text-foreground">
                              {Math.floor(pedagioResult.tempoTotalMin / 60)}h {Math.round(pedagioResult.tempoTotalMin % 60)}min
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Pedágio - só mostra se não houver erro */}
                    {!pedagioResult.error && (
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground">Pedágio Ida</span>
                          <span className="font-medium text-foreground">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(pedagioResult.ida)}
                          </span>
                        </div>
                        <div className="text-muted-foreground">+</div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground">Pedágio Volta</span>
                          <span className="font-medium text-foreground">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(pedagioResult.volta)}
                          </span>
                        </div>
                        <div className="text-muted-foreground">=</div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground">Total Pedágio</span>
                          <span className="font-semibold text-primary">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(pedagioResult.total)}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Botões de detalhes - sempre mostra Rota se tem endereços */}
                    <div className="flex gap-2 mt-2">
                      {!pedagioResult.error && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => setShowPedagioDetailsDialog(true)}
                        >
                          <Info className="w-3 h-3" />
                          Detalhes
                        </Button>
                      )}
                      {(pedagioResult.origemEndereco || pedagioResult.destinoEndereco) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => setShowRouteDataDialog(true)}
                        >
                          <MapIcon className="w-3 h-3" />
                          Rota
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
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

      {/* Diálogo de Conjuntos de Itens */}
      <ConjuntoSelectorDialog
        open={showConjuntoDialog}
        onClose={() => setShowConjuntoDialog(false)}
        onConfirm={handleConjuntoConfirm}
      />

      {/* Diálogo de Conferência do Carrinho */}
      <Dialog open={showCartDialog} onOpenChange={(open) => {
        if (!open) {
          // Descartar alterações ao fechar sem salvar
          setTempCartItems(new Map());
          setCartSearchQuery("");
        }
        setShowCartDialog(open);
      }}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Conferir Itens do Carrinho</DialogTitle>
          </DialogHeader>
          
          {/* Pesquisa e Ordenação */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar no carrinho..."
                value={cartSearchQuery}
                onChange={(e) => setCartSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={cartSortBy} onValueChange={(value: any) => setCartSortBy(value)}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nome">Nome</SelectItem>
                <SelectItem value="quantidade">Quantidade</SelectItem>
                <SelectItem value="preco">Preço</SelectItem>
                <SelectItem value="subtotal">Subtotal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <ScrollArea className="flex-1 -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Foto</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center w-[120px]">Quantidade</TableHead>
                  <TableHead className="text-right w-[120px]">Preço Unit.</TableHead>
                  <TableHead className="text-right w-[120px]">Subtotal</TableHead>
                  <TableHead className="text-center w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(tempCartItems.values())
                  .filter(({ produto }) => 
                    produto.nome.toLowerCase().includes(cartSearchQuery.toLowerCase())
                  )
                  .sort((a, b) => {
                    switch (cartSortBy) {
                      case "nome":
                        return a.produto.nome.localeCompare(b.produto.nome);
                      case "quantidade":
                        return b.quantity - a.quantity;
                      case "preco":
                        return b.preco - a.preco;
                      case "subtotal":
                        return (b.quantity * b.preco) - (a.quantity * a.preco);
                      default:
                        return 0;
                    }
                  })
                  .map(({ produto, quantity, preco }) => (
                  <TableRow key={produto.id}>
                    <TableCell>
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center overflow-hidden">
                        {produto.foto_url ? (
                          <img src={produto.foto_url} alt={produto.nome} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-muted-foreground text-lg">{produto.nome[0]}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{produto.nome}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => {
                          const newQty = parseInt(e.target.value) || 1;
                          setTempCartItems(prev => {
                            const newCart = new Map(prev);
                            const item = newCart.get(produto.id);
                            if (item) {
                              newCart.set(produto.id, { ...item, quantity: newQty });
                            }
                            return newCart;
                          });
                        }}
                        className="w-20 text-center"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={preco}
                        onChange={(e) => {
                          const newPrice = parseFloat(e.target.value) || 0;
                          setTempCartItems(prev => {
                            const newCart = new Map(prev);
                            const item = newCart.get(produto.id);
                            if (item) {
                              newCart.set(produto.id, { ...item, preco: newPrice });
                            }
                            return newCart;
                          });
                        }}
                        className="w-28 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(quantity * preco)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setTempCartItems(prev => {
                            const newCart = new Map(prev);
                            newCart.delete(produto.id);
                            return newCart;
                          });
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {tempCartItems.size === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Carrinho vazio
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
          
          {/* Rodapé fixo com totais e botão */}
          <div className="border-t pt-4 flex items-center justify-between bg-background">
            <div className="text-sm text-muted-foreground">
              {Array.from(tempCartItems.values()).filter(({ produto }) => 
                produto.nome.toLowerCase().includes(cartSearchQuery.toLowerCase())
              ).length} item(ns) no carrinho
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-muted-foreground mb-1">Total</div>
                <div className="text-2xl font-bold text-foreground">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(Array.from(tempCartItems.values()).reduce((sum, item) => sum + (item.quantity * item.preco), 0))}
                </div>
              </div>
              <Button 
                onClick={() => {
                  setCartItems(new Map(tempCartItems));
                  setShowCartDialog(false);
                  setCartSearchQuery("");
                  toast.success("Alterações salvas no carrinho!");
                }}
                className="bg-primary hover:bg-primary/90"
                size="lg"
              >
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Regras Aplicadas */}
      <Dialog open={showRegrasDialog} onOpenChange={setShowRegrasDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-green-600" />
              Regras de Automação Aplicadas
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Resumo Financeiro */}
            <Card className="p-4 bg-muted/50 border-border">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Valor Original</p>
                  <p className="text-2xl font-bold text-foreground">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(getTotal())}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Valor com Desconto</p>
                  <p className="text-2xl font-bold text-green-600">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(valorComRegras)}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Desconto Total</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-green-600">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(getTotal() - valorComRegras)}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({((1 - valorComRegras / getTotal()) * 100).toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Lista de Regras */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Regras Aplicadas ({regrasAplicadas.length})
              </h3>
              <div className="space-y-2">
                {regrasAplicadas.map((regra, index) => (
                  <Card key={index} className="p-3 border-border hover:border-primary/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground mb-1">{regra}</p>
                        {detalhesRegras.split('\n')[index] && (
                          <p className="text-sm text-muted-foreground">
                            {detalhesRegras.split('\n')[index]}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="bg-green-500/5 text-green-600 border-green-500/20 flex-shrink-0">
                        Ativa
                      </Badge>
                    </div>
                  </Card>
                ))}
                {regrasAplicadas.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Tag className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Nenhuma regra foi aplicada a este orçamento</p>
                  </div>
                )}
              </div>
            </div>

            {/* Informações Adicionais */}
            {detalhesRegras && (
              <Card className="p-4 bg-blue-500/5 border-blue-500/20">
                <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-blue-600" />
                  Detalhes Completos
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {detalhesRegras}
                </p>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Detalhes do Pedágio */}
      <PedagioDetailsDialog
        open={showPedagioDetailsDialog}
        onClose={() => setShowPedagioDetailsDialog(false)}
        pedagioData={{
          ida: pedagioResult.ida,
          volta: pedagioResult.volta,
          total: pedagioResult.total,
          distanciaIdaKm: pedagioResult.distanciaIdaKm,
          distanciaVoltaKm: pedagioResult.distanciaVoltaKm,
          distanciaTotalKm: pedagioResult.distanciaTotalKm,
          tempoIdaMin: pedagioResult.tempoIdaMin,
          tempoVoltaMin: pedagioResult.tempoVoltaMin,
          tempoTotalMin: pedagioResult.tempoTotalMin,
          origemCep: pedagioResult.origemCep,
          destinoCep: pedagioResult.destinoCep,
          origemEndereco: pedagioResult.origemEndereco,
          destinoEndereco: pedagioResult.destinoEndereco,
          origemCoords: pedagioResult.origemCoords,
          destinoCoords: pedagioResult.destinoCoords,
          rawResponse: pedagioResult.rawResponse
        }}
      />

      {/* Diálogo de Dados da Rota */}
      <RouteDataDialog
        open={showRouteDataDialog}
        onClose={() => setShowRouteDataDialog(false)}
        rawResponse={pedagioResult.rawResponse}
        origemCoords={pedagioResult.origemCoords}
        destinoCoords={pedagioResult.destinoCoords}
        origemEndereco={pedagioResult.origemEndereco}
        destinoEndereco={pedagioResult.destinoEndereco}
      />
    </div>
  );
}
