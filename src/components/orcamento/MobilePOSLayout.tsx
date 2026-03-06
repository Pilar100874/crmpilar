import React, { useState, useEffect } from "react";
import { Produto } from "@/types/orcamento";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { UnifiedDetailsPanel } from "@/components/atendimento/UnifiedDetailsPanel";
import { GlobalFilter } from "@/components/atendimento/GlobalClientFilter";
import { EmpresaDetailsView } from "./EmpresaDetailsView";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Package,
  Filter,
  Grid,
  List,
  Eye,
  ChevronLeft,
  X,
  Camera,
  Truck,
  Tag,
  Check,
  ChevronsUpDown,
  Share2,
  Lightbulb,
  History,
  Building2,
  LogOut,
  Receipt
} from "lucide-react";
import { Label } from "@/components/ui/label";
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

interface CampoCustomizado {
  id: string;
  campo_key: string;
  nome: string;
  tipo: string;
  unidade?: string;
  opcoes?: any;
  pesquisa_faixa?: boolean;
}

interface CustomFieldFilters {
  range: Record<string, { min: string; max: string }>;
  text: Record<string, string>;
  select: Record<string, string>;
  checkbox: Record<string, boolean | null>;
  number: Record<string, string>;
}

interface ConjuntoItem {
  id: string;
  produto_id: string;
  quantidade_padrao: number;
  preco_padrao?: number;
  quantidade: number;
  preco: number;
  produto?: { id: string; nome: string };
}

interface MobilePOSLayoutProps {
  produtos: Produto[];
  grupos: any[];
  empresas: any[];
  cartItems: Map<string, { produto: Produto; quantity: number; preco: number }>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedEmpresa: string;
  setSelectedEmpresa: (id: string) => void;
  clientes: any[];
  selectedCliente: string;
  setSelectedCliente: (id: string) => void;
  selectedGrupo: string;
  setSelectedGrupo: (id: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  addToCart: (produto: Produto) => void;
  removeFromCart: (produtoId: string) => void;
  updateQuantity: (produtoId: string, delta: number) => void;
  setCartItems: React.Dispatch<React.SetStateAction<Map<string, { produto: Produto; quantity: number; preco: number }>>>;
  getTotal: () => number;
  valorComRegras: number;
  regrasAplicadas: Array<{ nome: string; detalhes: string; desconto?: number; percentual?: number }>;
  selectedProduto: Produto | null;
  setSelectedProduto: (produto: Produto | null) => void;
  handleSaveOrcamento: () => void;
  loading: boolean;
  onClose?: () => void;
  showPhotoModal: boolean;
  setShowPhotoModal: (show: boolean) => void;
  handleItemsExtracted: (items: any[]) => void;
  autoRouteInfo: { distance: number; duration: number } | null;
  routeLoading: boolean;
  freteIdaEVolta: boolean;
  pedagioResult: any;
  freteResult: any;
  setShowConjuntoDialog: (show: boolean) => void;
  gruposQuantities: Map<string, number>;
  setGruposQuantities: React.Dispatch<React.SetStateAction<Map<string, number>>>;
  shareLink?: string;
  onCopyLink?: () => void;
  conjuntoSelecionado: string | null;
  conjuntoItens: ConjuntoItem[];
  setConjuntoSelecionado: (id: string | null) => void;
  setConjuntoItens: React.Dispatch<React.SetStateAction<ConjuntoItem[]>>;
}

type MobileView = 'produtos' | 'carrinho' | 'detalhes' | 'empresa';

export default function MobilePOSLayout({
  produtos,
  grupos,
  empresas,
  cartItems,
  searchQuery,
  setSearchQuery,
  selectedEmpresa,
  setSelectedEmpresa,
  clientes,
  selectedCliente,
  setSelectedCliente,
  selectedGrupo,
  setSelectedGrupo,
  viewMode,
  setViewMode,
  showFilters,
  setShowFilters,
  addToCart,
  removeFromCart,
  updateQuantity,
  setCartItems,
  getTotal,
  valorComRegras,
  regrasAplicadas,
  selectedProduto,
  setSelectedProduto,
  handleSaveOrcamento,
  loading,
  onClose,
  showPhotoModal,
  setShowPhotoModal,
  handleItemsExtracted,
  autoRouteInfo,
  routeLoading,
  freteIdaEVolta,
  pedagioResult,
  freteResult,
  setShowConjuntoDialog,
  gruposQuantities,
  setGruposQuantities,
  shareLink,
  onCopyLink,
  conjuntoSelecionado,
  conjuntoItens,
  setConjuntoSelecionado,
  setConjuntoItens
}: MobilePOSLayoutProps) {
  const [activeView, setActiveView] = useState<MobileView>('produtos');
  const [openEmpresaCombobox, setOpenEmpresaCombobox] = useState(false);
  const [openClienteCombobox, setOpenClienteCombobox] = useState(false);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showExitConfirmDialog, setShowExitConfirmDialog] = useState(false);
  const [globalFilter, setGlobalFilter] = useState<GlobalFilter | null>(null);
  
  // Custom field filters state
  const [camposCustomizados, setCamposCustomizados] = useState<CampoCustomizado[]>([]);
  const [customFieldFilters, setCustomFieldFilters] = useState<CustomFieldFilters>({
    range: {},
    text: {},
    select: {},
    checkbox: {},
    number: {}
  });

  // Load custom fields when group changes
  useEffect(() => {
    if (selectedGrupo && selectedGrupo !== "") {
      loadCamposCustomizados(selectedGrupo);
    } else {
      setCamposCustomizados([]);
      setCustomFieldFilters({ range: {}, text: {}, select: {}, checkbox: {}, number: {} });
    }
  }, [selectedGrupo]);

  const loadCamposCustomizados = async (grupoId: string) => {
    try {
      const { data, error } = await supabase
        .from('produto_campos_customizados')
        .select('*')
        .eq('grupo_id', grupoId)
        .eq('ativo', true)
        .order('ordem');

      if (error) throw error;
      setCamposCustomizados(data || []);
      
      const newFilters: CustomFieldFilters = { range: {}, text: {}, select: {}, checkbox: {}, number: {} };
      (data || []).forEach(campo => {
        if (campo.tipo === 'numero' && campo.pesquisa_faixa) {
          newFilters.range[campo.campo_key] = { min: "", max: "" };
        } else if (campo.tipo === 'numero') {
          newFilters.number[campo.campo_key] = "";
        } else if (campo.tipo === 'texto') {
          newFilters.text[campo.campo_key] = "";
        } else if (campo.tipo === 'selecao') {
          newFilters.select[campo.campo_key] = "";
        } else if (campo.tipo === 'checkbox') {
          newFilters.checkbox[campo.campo_key] = null;
        }
      });
      setCustomFieldFilters(newFilters);
    } catch (error) {
      console.error('Erro ao carregar campos customizados:', error);
      setCamposCustomizados([]);
    }
  };

  const updateCustomFilter = (type: keyof CustomFieldFilters, campoKey: string, value: any) => {
    setCustomFieldFilters(prev => ({
      ...prev,
      [type]: { ...prev[type], [campoKey]: value }
    }));
  };

  const updateRangeFilter = (campoKey: string, field: "min" | "max", value: string) => {
    setCustomFieldFilters(prev => ({
      ...prev,
      range: {
        ...prev.range,
        [campoKey]: { ...prev.range[campoKey], [field]: value }
      }
    }));
  };

  const clearAllFilters = () => {
    setSelectedGrupo("");
    setCamposCustomizados([]);
    setCustomFieldFilters({ range: {}, text: {}, select: {}, checkbox: {}, number: {} });
  };

  const hasActiveFilters = selectedGrupo || 
    Object.values(customFieldFilters.range).some(rf => rf?.min || rf?.max) ||
    Object.values(customFieldFilters.text).some(v => v) ||
    Object.values(customFieldFilters.select).some(v => v) ||
    Object.values(customFieldFilters.checkbox).some(v => v !== null) ||
    Object.values(customFieldFilters.number).some(v => v);

  // Quando um conjunto é selecionado, mudar para aba de produtos automaticamente
  useEffect(() => {
    if (conjuntoSelecionado && conjuntoItens.length > 0) {
      setActiveView('produtos');
    }
  }, [conjuntoSelecionado, conjuntoItens]);
  
  const cartArray = Array.from(cartItems.entries()).map(([_, item]) => item);
  const cartCount = cartArray.reduce((sum, item) => sum + item.quantity, 0);
  
  const filteredProdutos = produtos.filter(produto => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      produto.nome?.toLowerCase().includes(term) ||
      produto.ean_13?.toLowerCase().includes(term) ||
      produto.codigo?.toLowerCase().includes(term);
    const matchesGrupo = !selectedGrupo || produto.grupo_id === selectedGrupo;
    
    // Filtros de campos customizados
    let matchesCustomFields = true;
    const produtoCustomFields = (produto as any).campos_customizados || {};
    
    // Range filters
    for (const [key, range] of Object.entries(customFieldFilters.range)) {
      if (range?.min || range?.max) {
        const value = produtoCustomFields[key];
        if (value !== undefined && value !== null) {
          if (range.min && Number(value) < Number(range.min)) matchesCustomFields = false;
          if (range.max && Number(value) > Number(range.max)) matchesCustomFields = false;
        }
      }
    }
    
    // Number filters
    for (const [key, filterValue] of Object.entries(customFieldFilters.number)) {
      if (filterValue) {
        const value = produtoCustomFields[key];
        if (value !== undefined && value !== null && Number(value) !== Number(filterValue)) {
          matchesCustomFields = false;
        }
      }
    }
    
    // Text filters
    for (const [key, filterValue] of Object.entries(customFieldFilters.text)) {
      if (filterValue) {
        const value = produtoCustomFields[key];
        if (!value || !String(value).toLowerCase().includes(filterValue.toLowerCase())) {
          matchesCustomFields = false;
        }
      }
    }
    
    // Select filters
    for (const [key, filterValue] of Object.entries(customFieldFilters.select)) {
      if (filterValue) {
        const value = produtoCustomFields[key];
        if (value !== filterValue) matchesCustomFields = false;
      }
    }
    
    // Checkbox filters
    for (const [key, filterValue] of Object.entries(customFieldFilters.checkbox)) {
      if (filterValue !== null) {
        const value = produtoCustomFields[key];
        if (Boolean(value) !== filterValue) matchesCustomFields = false;
      }
    }
    
    return matchesSearch && matchesGrupo && matchesCustomFields;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="bg-card border-b border-border p-3 flex-shrink-0">
        {/* Empresa Selector + Detalhes na mesma linha */}
        <div className="flex items-center gap-2">
          <Popover open={openEmpresaCombobox} onOpenChange={setOpenEmpresaCombobox}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openEmpresaCombobox}
                className="flex-1 justify-between bg-background h-10"
              >
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  {selectedEmpresa
                    ? empresas.find((empresa) => empresa.id === selectedEmpresa)?.nome_fantasia
                    : "Selecionar cliente/empresa..."}
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[calc(100vw-24px)] p-0 bg-card border-border z-[100]" sideOffset={5}>
              <Command className="bg-card">
                <CommandInput 
                  placeholder="Buscar empresa..." 
                  className="bg-card border-border"
                />
                <CommandList className="max-h-[300px]">
                  <CommandEmpty className="text-muted-foreground py-4 text-center text-sm">
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

          {/* Seletor de Contato */}
          {selectedEmpresa && clientes.length > 0 && (
            <Popover open={openClienteCombobox} onOpenChange={setOpenClienteCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openClienteCombobox}
                  className="flex-1 justify-between bg-background h-10 min-w-[120px]"
                >
                  <span className="truncate">
                    {selectedCliente
                      ? clientes.find((cliente) => cliente.id === selectedCliente)?.nome
                      : "Contato..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-24px)] p-0 bg-card border-border z-[100]" sideOffset={5}>
                <Command className="bg-card">
                  <CommandInput 
                    placeholder="Buscar contato..." 
                    className="bg-card border-border"
                  />
                  <CommandList className="max-h-[300px]">
                    <CommandEmpty className="text-muted-foreground py-4 text-center text-sm">
                      Nenhum contato encontrado.
                    </CommandEmpty>
                    <CommandGroup>
                      {clientes.map((cliente) => (
                        <CommandItem
                          key={cliente.id}
                          value={`${cliente.nome} ${cliente.email || ''}`}
                          onSelect={() => {
                            setSelectedCliente(cliente.id);
                            setOpenClienteCombobox(false);
                          }}
                          className="hover:bg-muted cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedCliente === cliente.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{cliente.nome}</span>
                            {cliente.telefone && (
                              <span className="text-xs text-muted-foreground">{cliente.telefone}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
          
          {/* Botão Dados da Empresa - só ícone */}
          <Button
            variant={activeView === 'empresa' ? 'secondary' : 'outline'}
            size="icon"
            className={cn(
              "h-10 w-10 flex-shrink-0",
              activeView === 'empresa' && "bg-primary/10 text-primary border-primary/30"
            )}
            onClick={() => setActiveView('empresa')}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>

        {/* Barra de Ações Compacta */}
        <div className="flex items-center justify-between mt-3 gap-2">
          {/* Ícones de ação */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
              onClick={() => setShowConjuntoDialog(true)}
              title="Conjunto de Itens"
            >
              <Package className="h-4.5 w-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
              onClick={() => setShowPhotoModal(true)}
              title="Extrair de Foto"
            >
              <Camera className="h-4.5 w-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
              onClick={() => setShowSuggestionsModal(true)}
              title="Sugestões"
            >
              <Lightbulb className="h-4.5 w-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
              onClick={() => setShowShareModal(true)}
              disabled={!shareLink}
              title="Compartilhar"
            >
              <Share2 className="h-4.5 w-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
              onClick={() => setShowHistoryModal(true)}
              title="Histórico"
            >
              <History className="h-4.5 w-4.5" />
            </Button>
          </div>

          {/* Toggle Grid/List */}
          <div className="flex bg-muted/50 rounded-lg p-0.5">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-md"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-md"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search & Filters (only on produtos view) */}
        {activeView === 'produtos' && (
          <div className="mt-3 space-y-2">
            {/* Header com botão de filtros */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, EAN ou código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 h-10 bg-background"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button
                variant={showFilters ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={cn("h-10 px-3", hasActiveFilters && !showFilters && "border-primary text-primary")}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtros
                {hasActiveFilters && <span className="ml-1 text-xs">•</span>}
              </Button>
            </div>

            {/* Painel de Filtros - Igual ao cadastro de produtos */}
            {showFilters && (
              <div className="border rounded-lg p-3 bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Filtros</span>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 text-[10px] px-2">
                      <X className="w-3 h-3 mr-1" />
                      Limpar filtros
                    </Button>
                  )}
                </div>
                
                {/* Grupo Selector */}
                <div className="space-y-1">
                  <Label className="text-xs">Grupo</Label>
                  <Select value={selectedGrupo || "all"} onValueChange={(value) => {
                    const newGrupo = value === "all" ? "" : value;
                    setSelectedGrupo(newGrupo);
                  }}>
                    <SelectTrigger className="h-9 bg-background text-sm">
                      <SelectValue placeholder="Todos os grupos" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border z-[100] max-h-[250px]">
                      <SelectItem value="all">Todos os grupos</SelectItem>
                      {grupos.map((grupo) => (
                        <SelectItem key={grupo.id} value={grupo.id}>
                          {grupo.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Campos Customizados Dinâmicos - Aparecem quando grupo é selecionado */}
                {camposCustomizados.length > 0 && (
                  <div className="border-t pt-3 mt-3 space-y-3">
                    <span className="text-xs font-medium text-muted-foreground block">
                      Filtros de campos customizados
                    </span>
                    <div className="grid grid-cols-1 gap-3">
                      {camposCustomizados.map(campo => {
                        const opcoes = Array.isArray(campo.opcoes) ? campo.opcoes : [];
                        
                        // Range filter for numeric fields with pesquisa_faixa
                        if (campo.tipo === 'numero' && campo.pesquisa_faixa) {
                          return (
                            <div key={campo.id} className="bg-background rounded-md p-2 border">
                              <Label className="text-xs font-medium mb-1.5 block">
                                {campo.nome} {campo.unidade && <span className="text-muted-foreground">({campo.unidade})</span>}
                              </Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  placeholder="De"
                                  value={customFieldFilters.range[campo.campo_key]?.min || ""}
                                  onChange={(e) => updateRangeFilter(campo.campo_key, "min", e.target.value)}
                                  className="h-8 text-xs"
                                />
                                <span className="text-xs text-muted-foreground">até</span>
                                <Input
                                  type="number"
                                  placeholder="Até"
                                  value={customFieldFilters.range[campo.campo_key]?.max || ""}
                                  onChange={(e) => updateRangeFilter(campo.campo_key, "max", e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>
                          );
                        }
                        
                        // Simple number filter
                        if (campo.tipo === 'numero') {
                          return (
                            <div key={campo.id} className="bg-background rounded-md p-2 border">
                              <Label className="text-xs font-medium mb-1.5 block">
                                {campo.nome} {campo.unidade && <span className="text-muted-foreground">({campo.unidade})</span>}
                              </Label>
                              <Input
                                type="number"
                                placeholder={`Filtrar ${campo.nome.toLowerCase()}...`}
                                value={customFieldFilters.number[campo.campo_key] || ""}
                                onChange={(e) => updateCustomFilter('number', campo.campo_key, e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                          );
                        }
                        
                        // Text filter
                        if (campo.tipo === 'texto') {
                          return (
                            <div key={campo.id} className="bg-background rounded-md p-2 border">
                              <Label className="text-xs font-medium mb-1.5 block">{campo.nome}</Label>
                              <Input
                                type="text"
                                placeholder={`Filtrar ${campo.nome.toLowerCase()}...`}
                                value={customFieldFilters.text[campo.campo_key] || ""}
                                onChange={(e) => updateCustomFilter('text', campo.campo_key, e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                          );
                        }
                        
                        // Selection filter
                        if (campo.tipo === 'selecao' && opcoes.length > 0) {
                          return (
                            <div key={campo.id} className="bg-background rounded-md p-2 border">
                              <Label className="text-xs font-medium mb-1.5 block">{campo.nome}</Label>
                              <Select 
                                value={customFieldFilters.select[campo.campo_key] || "all"} 
                                onValueChange={(val) => updateCustomFilter('select', campo.campo_key, val === "all" ? "" : val)}
                              >
                                <SelectTrigger className="h-8 bg-background text-xs">
                                  <SelectValue placeholder={`Selecione ${campo.nome.toLowerCase()}`} />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border z-50">
                                  <SelectItem value="all">Todos</SelectItem>
                                  {opcoes.map((opcao: string, idx: number) => (
                                    <SelectItem key={idx} value={opcao}>{opcao}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        }
                        
                        // Checkbox filter
                        if (campo.tipo === 'checkbox') {
                          return (
                            <div key={campo.id} className="bg-background rounded-md p-2 border">
                              <Label className="text-xs font-medium mb-1.5 block">{campo.nome}</Label>
                              <Select 
                                value={customFieldFilters.checkbox[campo.campo_key] === null ? "all" : customFieldFilters.checkbox[campo.campo_key] ? "true" : "false"} 
                                onValueChange={(val) => updateCustomFilter('checkbox', campo.campo_key, val === "all" ? null : val === "true")}
                              >
                                <SelectTrigger className="h-8 bg-background text-xs">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border z-50">
                                  <SelectItem value="all">Todos</SelectItem>
                                  <SelectItem value="true">Sim</SelectItem>
                                  <SelectItem value="false">Não</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        }
                        
                        return null;
                      })}
                    </div>
                  </div>
                )}
                
                {/* Botão OK para fechar filtros */}
                <div className="flex justify-end pt-3 border-t mt-3">
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => setShowFilters(false)}
                    className="h-8"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    OK
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Produtos View */}
        {activeView === 'produtos' && (
          <ScrollArea className="h-full">
            <div className="p-3">
              {/* Itens do Conjunto Selecionado */}
              {conjuntoSelecionado && conjuntoItens.length > 0 ? (
                <Card className="bg-card border-border">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-foreground text-sm">Itens do Conjunto</h3>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            const itensComQuantidade = conjuntoItens.filter(item => item.quantidade > 0 && item.preco > 0);
                            if (itensComQuantidade.length === 0) {
                              return;
                            }
                            
                            itensComQuantidade.forEach(item => {
                              const produto = produtos.find(p => p.id === item.produto_id);
                              if (produto) {
                                setCartItems(prev => {
                                  const newCart = new Map(prev);
                                  const existing = newCart.get(produto.id);
                                  if (existing) {
                                    newCart.set(produto.id, {
                                      ...existing,
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
                              }
                            });
                            
                            setConjuntoSelecionado(null);
                            setConjuntoItens([]);
                          }}
                        >
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Adicionar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            setConjuntoSelecionado(null);
                            setConjuntoItens([]);
                          }}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Fechar
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {conjuntoItens.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded border border-border/50">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{item.produto?.nome}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground">Qtd</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.quantidade}
                                onChange={(e) => {
                                  const newValue = parseFloat(e.target.value) || 0;
                                  setConjuntoItens(prev => prev.map(i =>
                                    i.id === item.id ? { ...i, quantidade: newValue } : i
                                  ));
                                }}
                                className="w-16 h-7 text-center text-xs"
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground">Preço</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.preco}
                                onChange={(e) => {
                                  const newValue = parseFloat(e.target.value) || 0;
                                  setConjuntoItens(prev => prev.map(i =>
                                    i.id === item.id ? { ...i, preco: newValue } : i
                                  ));
                                }}
                                className="w-20 h-7 text-center text-xs"
                                placeholder="0,00"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ) : (
                <>
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {filteredProdutos.map((produto) => {
                        const inCart = cartItems.get(produto.id);
                        const quantity = gruposQuantities.get(produto.id) || 1;
                        return (
                      <div
                        key={produto.id}
                        className={cn(
                          "group relative bg-card rounded-2xl border border-border/50 overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer",
                          inCart && "ring-2 ring-primary/70 ring-offset-1 ring-offset-background"
                        )}
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
                        <div className="relative aspect-[4/3] bg-muted/30 overflow-hidden">
                          {produto.foto_url ? (
                            <img
                              src={produto.foto_url}
                              alt={produto.nome}
                              className="w-full h-full object-contain p-2.5"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                              <Package className="h-8 w-8 text-muted-foreground/25" />
                              <span className="text-[9px] text-muted-foreground/40 font-medium">Sem imagem</span>
                            </div>
                          )}
                          {inCart && (
                            <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-lg">
                              {inCart.quantity}
                            </div>
                          )}
                          <Button
                            size="icon"
                            className="absolute top-1.5 left-1.5 h-6 w-6 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-all bg-background/90 hover:bg-background text-foreground shadow-md rounded-full border border-border/50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProduto(produto);
                              setActiveView('detalhes');
                            }}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          {/* Price overlay bottom-left */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/60 via-foreground/25 to-transparent pt-6 pb-1.5 px-2">
                            <span className="text-sm font-bold text-white drop-shadow-md">
                              R$ 10,00
                            </span>
                          </div>
                        </div>
                        <div className="p-2 border-t border-border/30">
                          <p className="text-xs font-medium line-clamp-2 min-h-[2rem] text-foreground leading-snug">
                            {produto.nome}
                          </p>
                          {/* Quantity stepper - centered */}
                          <div className="flex items-center justify-center mt-1.5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center h-7 bg-muted/40 rounded-full border border-border/40 overflow-hidden">
                              <button
                                className="h-full w-7 flex items-center justify-center text-muted-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newQty = Math.max(1, quantity - 1);
                                  setGruposQuantities(prev => {
                                    const next = new Map(prev);
                                    next.set(produto.id, newQty);
                                    return next;
                                  });
                                }}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-[11px] font-bold w-6 text-center text-foreground select-none">{quantity}</span>
                              <button
                                className="h-full w-7 flex items-center justify-center text-muted-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setGruposQuantities(prev => {
                                    const next = new Map(prev);
                                    next.set(produto.id, quantity + 1);
                                    return next;
                                  });
                                }}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProdutos.map((produto) => {
                    const inCart = cartItems.get(produto.id);
                    const quantity = gruposQuantities.get(produto.id) || 1;
                    return (
                      <div
                        key={produto.id}
                        className={cn(
                          "flex items-center gap-3 p-2.5 bg-card rounded-2xl border transition-all duration-200 hover:shadow-md",
                          inCart 
                            ? "border-primary/40 bg-primary/[0.02] shadow-[0_0_0_1px_hsl(var(--primary)/0.1)]" 
                            : "border-border/50 hover:border-border"
                        )}
                      >
                        {/* Thumbnail */}
                        <div 
                          className="relative w-14 h-14 rounded-xl bg-muted/30 border border-border/30 flex-shrink-0 overflow-hidden cursor-pointer flex items-center justify-center"
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
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <Package className="h-6 w-6 text-muted-foreground/25" />
                          )}
                          {inCart && (
                            <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center shadow-sm border border-background">
                              {inCart.quantity}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold truncate text-foreground">{produto.nome}</p>
                          {produto.codigo && (
                            <p className="text-[10px] text-muted-foreground/70 mt-0.5">{produto.codigo}</p>
                          )}
                          <p className="text-sm font-bold text-primary mt-0.5">
                            {formatCurrency(produto.preco_tabela || 0)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* Detail button */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProduto(produto);
                              setActiveView('detalhes');
                            }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          {/* Quantity stepper */}
                          <div className="flex items-center h-7 bg-muted/40 rounded-full border border-border/40 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="h-full w-7 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                const newQty = Math.max(1, quantity - 1);
                                setGruposQuantities(prev => {
                                  const next = new Map(prev);
                                  next.set(produto.id, newQty);
                                  return next;
                                });
                              }}
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="text-[11px] font-bold w-5 text-center text-foreground select-none">{quantity}</span>
                            <button
                              className="h-full w-7 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setGruposQuantities(prev => {
                                  const next = new Map(prev);
                                  next.set(produto.id, quantity + 1);
                                  return next;
                                });
                              }}
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>

                          {/* Add button */}
                          <Button
                            size="icon"
                            className="bg-primary hover:bg-primary/90 h-8 w-8 rounded-xl shadow-sm shadow-primary/20"
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
                            <ShoppingCart className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {filteredProdutos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Search className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm">Nenhum produto encontrado</p>
                </div>
              )}
                </>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Carrinho View */}
        {activeView === 'carrinho' && (
          <ScrollArea className="h-full">
            <div className="p-3">
              {cartArray.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm">Carrinho vazio</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setActiveView('produtos')}
                  >
                    Adicionar produtos
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cartArray.map(({ produto, quantity, preco }) => (
                    <Card key={produto.id} className="p-3">
                      <div className="flex gap-3">
                        <div className="w-16 h-16 bg-muted rounded flex-shrink-0 overflow-hidden">
                          {produto.foto_url ? (
                            <img src={produto.foto_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-8 w-8 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <p className="text-sm font-medium truncate flex-1">{produto.nome}</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 -mt-1 -mr-1 text-destructive"
                              onClick={() => removeFromCart(produto.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">{formatCurrency(preco)} cada</p>
                          
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-1 border rounded-md">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(produto.id, -1)}
                              >
                                <Minus className="h-4 w-4" />
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
                                className="w-14 h-8 text-center text-sm border-0 bg-transparent"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(produto.id, 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-base font-bold">
                              {formatCurrency(quantity * preco)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {/* Resumo */}
                  <Card className="p-4 bg-muted/50">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal ({cartCount} itens)</span>
                        <span>{formatCurrency(getTotal())}</span>
                      </div>
                      
                      {autoRouteInfo && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Truck className="h-3.5 w-3.5" />
                            Rota ({freteIdaEVolta ? 'ida+volta' : 'só ida'})
                          </span>
                          <span>{(autoRouteInfo.distance / 1000).toFixed(0)} km</span>
                        </div>
                      )}
                      
                      {freteResult && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Frete</span>
                          <span>{formatCurrency(freteResult.totalCustoViagem)}</span>
                        </div>
                      )}

                      {regrasAplicadas.length > 0 && (
                        <div className="flex justify-between text-sm text-orange-600 dark:text-orange-400">
                          <span className="flex items-center gap-1">
                            <Tag className="h-3.5 w-3.5" />
                            Desconto ({regrasAplicadas.length} regras)
                          </span>
                          <span>-{formatCurrency(getTotal() - valorComRegras)}</span>
                        </div>
                      )}

                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total</span>
                          <span className="text-primary">{formatCurrency(valorComRegras || getTotal())}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Empresa View - Dados da Empresa */}
        {activeView === 'empresa' && (
          <EmpresaDetailsView
            empresas={empresas}
            selectedEmpresa={selectedEmpresa}
            setSelectedEmpresa={setSelectedEmpresa}
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
          />
        )}

        {/* Detalhes View - Detalhes do Pedido */}
        {activeView === 'detalhes' && (
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {/* Header */}
              <div className="mb-2">
                <h3 className="text-sm font-semibold">Detalhes do Pedido</h3>
              </div>
              
              {/* Rota Info */}
              {autoRouteInfo && (
                <Card className="p-4">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Informações da Rota
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Distância</p>
                      <p className="text-lg font-bold">{(autoRouteInfo.distance / 1000).toFixed(0)} km</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tempo estimado</p>
                      <p className="text-lg font-bold">
                        {Math.floor(autoRouteInfo.duration / 60)}h {Math.round(autoRouteInfo.duration % 60)}min
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Frete */}
              {freteResult && (
                <Card className="p-4">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Custo do Frete
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Combustível</span>
                      <span>{formatCurrency(freteResult.custosCombustivel)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Custos Fixos</span>
                      <span>{formatCurrency(freteResult.custosFixos)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mão de Obra</span>
                      <span>{formatCurrency(freteResult.custosHorasNormais + freteResult.custosHorasExtras)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold">
                      <span>Total Frete</span>
                      <span>{formatCurrency(freteResult.totalCustoViagem)}</span>
                    </div>
                  </div>
                </Card>
              )}

              {/* Regras Aplicadas */}
              {regrasAplicadas.length > 0 && (
                <Card className="p-4 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/30">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium flex items-center gap-2 text-orange-700 dark:text-orange-300">
                      <Tag className="h-4 w-4" />
                      Regras Aplicadas ({regrasAplicadas.length})
                    </h3>
                    {getTotal() > valorComRegras && (
                      <Badge className="bg-orange-500 text-white">
                        -{formatCurrency(getTotal() - valorComRegras)}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    {regrasAplicadas.map((regra, index) => (
                      <div key={index} className="bg-background/80 rounded p-2 border border-border/50">
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{regra.nome}</p>
                            <p className="text-xs text-muted-foreground">{regra.detalhes}</p>
                            {regra.desconto !== undefined && regra.desconto > 0 && (
                              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                Desconto: {formatCurrency(regra.desconto)}
                                {regra.percentual ? ` (${regra.percentual}%)` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Produto Selecionado - Dados Técnicos Completos */}
              {selectedProduto && (
                <Card className="p-4 space-y-4">
                  {/* Header com imagem e nome */}
                  <div className="flex gap-4">
                    <div className="w-24 h-24 bg-muted rounded overflow-hidden flex-shrink-0">
                      {selectedProduto.foto_url ? (
                        <img
                          src={selectedProduto.foto_url}
                          alt={selectedProduto.nome}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{selectedProduto.nome}</h3>
                      {selectedProduto.codigo && (
                        <p className="text-sm text-muted-foreground">Cód: {selectedProduto.codigo}</p>
                      )}
                      <Badge variant={selectedProduto.ativo ? "default" : "secondary"} className="mt-2">
                        {selectedProduto.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>

                  {/* Classificação */}
                  {(selectedProduto.categoria || selectedProduto.grupo) && (
                    <div className="bg-muted/50 rounded p-3 border border-border/50">
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">Classificação</h4>
                      <div className="space-y-1.5 text-sm">
                        {selectedProduto.categoria && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Categoria:</span>
                            <span className="font-medium">{selectedProduto.categoria.nome}</span>
                          </div>
                        )}
                        {selectedProduto.grupo && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Grupo:</span>
                            <span className="font-medium">{selectedProduto.grupo.nome}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Especificações Técnicas */}
                  {(selectedProduto.largura || selectedProduto.comprimento || selectedProduto.gramatura || selectedProduto.peso_unitario) && (
                    <div className="bg-muted/50 rounded p-3 border border-border/50">
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">Especificações Técnicas</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {selectedProduto.largura && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Largura:</span>
                            <span className="font-medium">{selectedProduto.largura} cm</span>
                          </div>
                        )}
                        {selectedProduto.comprimento && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Comprimento:</span>
                            <span className="font-medium">{selectedProduto.comprimento} cm</span>
                          </div>
                        )}
                        {selectedProduto.gramatura && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Gramatura:</span>
                            <span className="font-medium">{selectedProduto.gramatura} g/m²</span>
                          </div>
                        )}
                        {selectedProduto.peso_unitario && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Peso:</span>
                            <span className="font-medium">{selectedProduto.peso_unitario} kg</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Botão de adicionar */}
                  <Button
                    className="w-full"
                    onClick={() => {
                      addToCart(selectedProduto);
                      setActiveView('carrinho');
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar ao Carrinho
                  </Button>
                </Card>
              )}

              {!autoRouteInfo && !freteResult && regrasAplicadas.length === 0 && !selectedProduto && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Eye className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm">Selecione uma empresa para ver detalhes</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Bottom Action Bar */}
      {activeView === 'carrinho' && cartArray.length > 0 && (
        <div className="border-t bg-card p-3">
          <Button
            className="w-full h-12 text-base"
            onClick={handleSaveOrcamento}
            disabled={loading || !selectedEmpresa}
          >
            {loading ? "Salvando..." : `Salvar Orçamento - ${formatCurrency(valorComRegras || getTotal())}`}
          </Button>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="border-t border-border/50 bg-card/95 backdrop-blur-sm flex-shrink-0 safe-area-bottom">
        <div className="flex">
          {[
            { id: 'produtos', label: 'Produtos', icon: Package, badge: null, action: 'view' },
            { id: 'carrinho', label: 'Carrinho', icon: ShoppingCart, badge: cartCount > 0 ? cartCount : null, action: 'view' },
            { id: 'detalhes', label: 'Detalhes', icon: Receipt, badge: regrasAplicadas.length > 0 ? regrasAplicadas.length : null, action: 'view' },
            { id: 'sair', label: 'Sair', icon: LogOut, badge: null, action: 'close' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.action === 'view' && activeView === tab.id;
            return (
              <button
                key={tab.id}
                className={cn(
                  "flex-1 h-14 flex flex-col items-center justify-center gap-0.5 transition-all relative",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => {
                  if (tab.action === 'close') {
                    if (cartArray.length > 0) {
                      setShowExitConfirmDialog(true);
                    } else if (onClose) {
                      onClose();
                    }
                  } else if (tab.action === 'view') {
                    setActiveView(tab.id as MobileView);
                  }
                }}
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full" />
                )}
                <div className="relative">
                  <div className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    isActive && "bg-primary/10"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {tab.badge && (
                    <Badge className="absolute -top-1 -right-1 h-4 min-w-4 text-[10px] px-1 flex items-center justify-center border-2 border-card bg-primary text-primary-foreground">
                      {tab.badge > 99 ? "99+" : tab.badge}
                    </Badge>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] font-medium",
                  isActive && "text-primary"
                )}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Photo Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 bg-background/95 flex flex-col">
          <div className="flex items-center justify-between p-3 border-b">
            <h2 className="text-lg font-semibold">Extrair itens de foto</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowPhotoModal(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <ImageItemExtractor onItemsExtracted={handleItemsExtracted} />
          </div>
        </div>
      )}

      {/* Suggestions Modal */}
      {showSuggestionsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg p-6 w-full max-w-md border border-border">
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

      {/* Share Modal */}
      {showShareModal && shareLink && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg p-6 w-full max-w-md border border-border">
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
                      onCopyLink?.();
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

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg p-6 w-full max-w-md border border-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-foreground">Status do Orçamento</h3>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowHistoryModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm text-center">Histórico e status</p>
              <p className="text-xs text-center mt-1">do orçamento atual</p>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Dialog */}
      {showExitConfirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg p-6 w-full max-w-sm border border-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-foreground">Sair do Orçamento</h3>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowExitConfirmDialog(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Você tem itens no carrinho. Deseja salvar o orçamento antes de sair?
            </p>
            <div className="flex flex-col gap-2">
              <Button
                className="w-full"
                onClick={() => {
                  handleSaveOrcamento();
                  setShowExitConfirmDialog(false);
                  // Pequeno delay para garantir que o salvamento iniciou
                  setTimeout(() => {
                    onClose?.();
                  }, 500);
                }}
                disabled={loading || !selectedEmpresa}
              >
                Salvar e Sair
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setShowExitConfirmDialog(false);
                  onClose?.();
                }}
              >
                Sair sem Salvar
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowExitConfirmDialog(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
