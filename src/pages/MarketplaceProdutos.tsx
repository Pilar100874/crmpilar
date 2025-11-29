import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Package, Search, ShoppingBag, Store, Box, RefreshCw, 
  CheckCircle2, XCircle, Pause, AlertTriangle, Loader2, Eye,
  Filter, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp,
  X, ArrowRight, ArrowLeft, Send, Check
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  'listado': { label: 'Listado', color: 'bg-green-500/20 text-green-400', icon: CheckCircle2 },
  'nao_listado': { label: 'Não Listado', color: 'bg-muted text-muted-foreground', icon: XCircle },
  'pausado': { label: 'Pausado', color: 'bg-yellow-500/20 text-yellow-400', icon: Pause },
  'erro': { label: 'Erro', color: 'bg-red-500/20 text-red-400', icon: AlertTriangle },
};

const marketplaceIcons: Record<string, any> = {
  'mercado_livre': ShoppingBag,
  'shopee': Package,
  'amazon': Box,
  'magalu': Store,
  'google_merchant': Search,
};

type SortField = 'nome' | 'codigo' | 'categoria' | 'grupo' | 'ativo';
type SortDirection = 'asc' | 'desc';
type WizardStep = 1 | 2 | 3;

interface ProcessResult {
  productId: string;
  productName: string;
  contaId: string;
  contaName: string;
  success: boolean;
  error?: string;
}

interface CampoCustomizado {
  id: string;
  nome: string;
  campo_key: string;
  tipo: string;
  opcoes: any;
  obrigatorio: boolean;
  placeholder: string | null;
  unidade: string | null;
  ativo: boolean;
  pesquisa_faixa?: boolean;
}

interface RangeFilter {
  min: string;
  max: string;
}

interface CustomFieldFilters {
  range: Record<string, RangeFilter>;
  text: Record<string, string>;
  select: Record<string, string>;
  checkbox: Record<string, boolean | null>;
  number: Record<string, string>;
}

export default function MarketplaceProdutos() {
  const queryClient = useQueryClient();
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [selectedProduto, setSelectedProduto] = useState<any>(null);
  
  // Wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processResults, setProcessResults] = useState<ProcessResult[]>([]);
  const [processProgress, setProcessProgress] = useState(0);
  
  // Filtros
  const [showFilters, setShowFilters] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSku, setFilterSku] = useState("");
  const [filterNcm, setFilterNcm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategoria, setFilterCategoria] = useState<string>("all");
  const [filterGrupo, setFilterGrupo] = useState<string>("all");
  const [filterMarketplace, setFilterMarketplace] = useState<string>("all");
  const [filterMarketplaceStatus, setFilterMarketplaceStatus] = useState<string>("all");
  
  // Ordenação
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Seleção de produtos e marketplaces
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectedContas, setSelectedContas] = useState<Set<string>>(new Set());

  // Filtros de campos customizados
  const [filterCamposCustomizados, setFilterCamposCustomizados] = useState<CampoCustomizado[]>([]);
  const [customFieldFilters, setCustomFieldFilters] = useState<CustomFieldFilters>({
    range: {},
    text: {},
    select: {},
    checkbox: {},
    number: {}
  });

  useEffect(() => {
    const cached = localStorage.getItem('estabelecimentoId');
    if (cached) {
      setEstabelecimentoId(cached);
    } else {
      supabase.from('estabelecimentos').select('id').limit(1).single().then(({ data }) => {
        if (data?.id) {
          setEstabelecimentoId(data.id);
          localStorage.setItem('estabelecimentoId', data.id);
        }
      });
    }
  }, []);

  const { data: marketplaces } = useQuery({
    queryKey: ['marketplaces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplaces')
        .select('*')
        .eq('ativo', true)
        .order('nome_display');
      if (error) throw error;
      return data;
    },
  });

  const { data: contasMarketplace } = useQuery({
    queryKey: ['contas_marketplace', estabelecimentoId],
    queryFn: async () => {
      if (!estabelecimentoId) return [];
      const { data, error } = await supabase
        .from('contas_marketplace')
        .select('*, marketplace:marketplaces(id, nome, nome_display)')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('status', 'conectado');
      if (error) throw error;
      return data;
    },
    enabled: !!estabelecimentoId,
  });

  const { data: categorias } = useQuery({
    queryKey: ['produto_categorias', estabelecimentoId],
    queryFn: async () => {
      if (!estabelecimentoId) return [];
      const { data, error } = await supabase
        .from('produto_categorias')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');
      if (error) throw error;
      return data;
    },
    enabled: !!estabelecimentoId,
  });

  const { data: grupos } = useQuery({
    queryKey: ['produto_grupos', estabelecimentoId],
    queryFn: async () => {
      if (!estabelecimentoId) return [];
      const { data, error } = await supabase
        .from('produto_grupos')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');
      if (error) throw error;
      return data;
    },
    enabled: !!estabelecimentoId,
  });

  const { data: produtos, isLoading } = useQuery({
    queryKey: ['produtos_marketplace', estabelecimentoId],
    queryFn: async () => {
      if (!estabelecimentoId) return [];
      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, ativo, codigo, ncm, categoria_id, grupo_id, campos_customizados, categoria:produto_categorias(id, nome), grupo:produto_grupos(id, nome)')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');
      if (error) throw error;
      return data;
    },
    enabled: !!estabelecimentoId,
  });

  // Load custom fields when filterGrupo changes
  useEffect(() => {
    if (filterGrupo && filterGrupo !== "all") {
      loadFilterCamposCustomizados(filterGrupo);
    } else {
      setFilterCamposCustomizados([]);
      setCustomFieldFilters({ range: {}, text: {}, select: {}, checkbox: {}, number: {} });
    }
  }, [filterGrupo]);

  const loadFilterCamposCustomizados = async (grupoId: string) => {
    try {
      const { data, error } = await supabase
        .from('produto_campos_customizados')
        .select('*')
        .eq('grupo_id', grupoId)
        .eq('ativo', true)
        .order('ordem');

      if (error) throw error;
      setFilterCamposCustomizados(data || []);
      
      // Initialize filters for each campo based on type
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
      console.error('Erro ao carregar campos para filtro:', error);
      setFilterCamposCustomizados([]);
    }
  };

  const updateCustomFilter = (type: keyof CustomFieldFilters, campoKey: string, value: any) => {
    setCustomFieldFilters(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [campoKey]: value
      }
    }));
  };

  const updateRangeFilter = (campoKey: string, field: "min" | "max", value: string) => {
    setCustomFieldFilters(prev => ({
      ...prev,
      range: {
        ...prev.range,
        [campoKey]: {
          ...prev.range[campoKey],
          [field]: value
        }
      }
    }));
  };

  const hasCustomFilters = 
    Object.values(customFieldFilters.range).some(rf => rf?.min || rf?.max) ||
    Object.values(customFieldFilters.text).some(v => v) ||
    Object.values(customFieldFilters.select).some(v => v) ||
    Object.values(customFieldFilters.checkbox).some(v => v !== null) ||
    Object.values(customFieldFilters.number).some(v => v);

  const { data: vinculosMap } = useQuery({
    queryKey: ['marketplace_produtos_map', estabelecimentoId],
    queryFn: async () => {
      if (!estabelecimentoId) return {};
      const { data, error } = await supabase
        .from('marketplace_produtos')
        .select('*, marketplace:marketplaces(id, nome, nome_display), conta:contas_marketplace(nome_loja)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      const map: Record<string, any[]> = {};
      data?.forEach(item => {
        if (!map[item.produto_id]) map[item.produto_id] = [];
        map[item.produto_id].push(item);
      });
      return map;
    },
    enabled: !!estabelecimentoId,
  });

  const getStatusForMarketplace = (produtoId: string, marketplaceNome: string) => {
    const vinculos = vinculosMap?.[produtoId] || [];
    const vinculo = vinculos.find(v => v.marketplace?.nome === marketplaceNome);
    return vinculo?.status || null;
  };

  const getProdutoVinculos = (produtoId: string) => {
    return vinculosMap?.[produtoId] || [];
  };

  const hasAnyMarketplaceStatus = (produtoId: string, status: string) => {
    const vinculos = vinculosMap?.[produtoId] || [];
    return vinculos.some(v => v.status === status);
  };

  const isInMarketplace = (produtoId: string, marketplaceId: string) => {
    const vinculos = vinculosMap?.[produtoId] || [];
    return vinculos.some(v => v.marketplace?.id === marketplaceId);
  };

  // Filtros e ordenação
  const filteredAndSortedProdutos = useMemo(() => {
    if (!produtos) return [];
    
    let result = [...produtos];
    
    // Filtro de busca por nome
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => p.nome.toLowerCase().includes(term));
    }
    
    // Filtro por SKU
    if (filterSku) {
      const term = filterSku.toLowerCase();
      result = result.filter(p => p.codigo?.toLowerCase().includes(term));
    }
    
    // Filtro por NCM
    if (filterNcm) {
      const term = filterNcm.toLowerCase();
      result = result.filter(p => p.ncm?.toLowerCase().includes(term));
    }
    
    // Filtro de status do produto
    if (filterStatus !== "all") {
      result = result.filter(p => filterStatus === "ativo" ? p.ativo : !p.ativo);
    }
    
    // Filtro por categoria
    if (filterCategoria !== "all") {
      result = result.filter(p => p.categoria_id === filterCategoria);
    }
    
    // Filtro por grupo
    if (filterGrupo !== "all") {
      result = result.filter(p => p.grupo_id === filterGrupo);
    }
    
    // Filtro de marketplace
    if (filterMarketplace !== "all") {
      result = result.filter(p => isInMarketplace(p.id, filterMarketplace));
    }
    
    // Filtro de status no marketplace
    if (filterMarketplaceStatus !== "all") {
      result = result.filter(p => hasAnyMarketplaceStatus(p.id, filterMarketplaceStatus));
    }

    // Apply custom field filters
    filterCamposCustomizados.forEach(campo => {
      const getCamposCustom = (p: any) => (p as any).campos_customizados || {};
      
      // Range filter (numeric with pesquisa_faixa)
      if (campo.tipo === 'numero' && campo.pesquisa_faixa) {
        const range = customFieldFilters.range[campo.campo_key];
        if (range && (range.min || range.max)) {
          const minVal = range.min ? parseFloat(range.min) : 0;
          const maxVal = range.max ? parseFloat(range.max) : 99999999;
          result = result.filter(p => {
            const fieldValue = parseFloat(getCamposCustom(p)[campo.campo_key]) || 0;
            return fieldValue >= minVal && fieldValue <= maxVal;
          });
        }
      }
      
      // Simple number filter
      else if (campo.tipo === 'numero') {
        const filterVal = customFieldFilters.number[campo.campo_key];
        if (filterVal) {
          result = result.filter(p => {
            const fieldValue = String(getCamposCustom(p)[campo.campo_key] || "");
            return fieldValue.includes(filterVal);
          });
        }
      }
      
      // Text filter
      else if (campo.tipo === 'texto') {
        const filterVal = customFieldFilters.text[campo.campo_key];
        if (filterVal) {
          const term = filterVal.toLowerCase();
          result = result.filter(p => {
            const fieldValue = String(getCamposCustom(p)[campo.campo_key] || "").toLowerCase();
            return fieldValue.includes(term);
          });
        }
      }
      
      // Selection filter
      else if (campo.tipo === 'selecao') {
        const filterVal = customFieldFilters.select[campo.campo_key];
        if (filterVal) {
          result = result.filter(p => {
            const fieldValue = getCamposCustom(p)[campo.campo_key];
            return fieldValue === filterVal;
          });
        }
      }
      
      // Checkbox filter
      else if (campo.tipo === 'checkbox') {
        const filterVal = customFieldFilters.checkbox[campo.campo_key];
        if (filterVal !== null) {
          result = result.filter(p => {
            const fieldValue = Boolean(getCamposCustom(p)[campo.campo_key]);
            return fieldValue === filterVal;
          });
        }
      }
    });
    
    // Ordenação
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'nome':
          comparison = a.nome.localeCompare(b.nome);
          break;
        case 'codigo':
          comparison = (a.codigo || '').localeCompare(b.codigo || '');
          break;
        case 'categoria':
          comparison = ((a as any).categoria?.nome || '').localeCompare((b as any).categoria?.nome || '');
          break;
        case 'grupo':
          comparison = ((a as any).grupo?.nome || '').localeCompare((b as any).grupo?.nome || '');
          break;
        case 'ativo':
          comparison = (a.ativo === b.ativo) ? 0 : a.ativo ? -1 : 1;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [produtos, searchTerm, filterSku, filterNcm, filterStatus, filterCategoria, filterGrupo, filterMarketplace, filterMarketplaceStatus, sortField, sortDirection, vinculosMap, customFieldFilters, filterCamposCustomizados]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredAndSortedProdutos?.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredAndSortedProdutos?.map(p => p.id)));
    }
  };

  const toggleContaSelection = (contaId: string) => {
    setSelectedContas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contaId)) {
        newSet.delete(contaId);
      } else {
        newSet.add(contaId);
      }
      return newSet;
    });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterSku("");
    setFilterNcm("");
    setFilterStatus("all");
    setFilterCategoria("all");
    setFilterGrupo("all");
    setFilterMarketplace("all");
    setFilterMarketplaceStatus("all");
    setCustomFieldFilters({ range: {}, text: {}, select: {}, checkbox: {}, number: {} });
  };

  const hasActiveFilters = searchTerm || filterSku || filterNcm || filterStatus !== "all" || filterCategoria !== "all" || filterGrupo !== "all" || filterMarketplace !== "all" || filterMarketplaceStatus !== "all" || hasCustomFilters;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  // Wizard navigation
  const canProceedToStep2 = selectedProducts.size > 0;
  const canProceedToStep3 = selectedContas.size > 0;

  const handleNextStep = () => {
    if (wizardStep === 1 && canProceedToStep2) {
      setWizardStep(2);
    } else if (wizardStep === 2 && canProceedToStep3) {
      processProducts();
    }
  };

  const handlePrevStep = () => {
    if (wizardStep === 2) {
      setWizardStep(1);
    } else if (wizardStep === 3) {
      setWizardStep(2);
      setProcessResults([]);
      setProcessProgress(0);
    }
  };

  const resetWizard = () => {
    setWizardStep(1);
    setSelectedProducts(new Set());
    setSelectedContas(new Set());
    setProcessResults([]);
    setProcessProgress(0);
  };

  // Process products - Step 3
  const processProducts = async () => {
    setWizardStep(3);
    setIsProcessing(true);
    setProcessResults([]);
    setProcessProgress(0);

    const productIds = Array.from(selectedProducts);
    const contaIds = Array.from(selectedContas);
    const totalOperations = productIds.length * contaIds.length;
    let completed = 0;
    const results: ProcessResult[] = [];

    for (const productId of productIds) {
      const product = produtos?.find(p => p.id === productId);
      
      for (const contaId of contaIds) {
        const conta = contasMarketplace?.find(c => c.id === contaId);
        
        try {
          // Validate product has required fields
          const errors: string[] = [];
          
          if (!product?.codigo) {
            errors.push("SKU não informado");
          }
          if (!product?.nome) {
            errors.push("Nome não informado");
          }
          
          // Check if already linked
          const existingVinculo = vinculosMap?.[productId]?.find(
            v => v.conta_marketplace_id === contaId
          );
          
          if (existingVinculo) {
            errors.push("Produto já vinculado a esta conta");
          }
          
          if (errors.length > 0) {
            results.push({
              productId,
              productName: product?.nome || 'Produto desconhecido',
              contaId,
              contaName: conta?.nome_loja || 'Conta desconhecida',
              success: false,
              error: errors.join("; ")
            });
          } else {
            // Insert into marketplace_produtos
            const { error } = await supabase
              .from('marketplace_produtos')
              .insert({
                produto_id: productId,
                marketplace_id: conta?.marketplace_id,
                conta_marketplace_id: contaId,
                status: 'nao_listado',
                dados_extras: {},
              });

            if (error) throw error;

            results.push({
              productId,
              productName: product?.nome || 'Produto desconhecido',
              contaId,
              contaName: conta?.nome_loja || 'Conta desconhecida',
              success: true
            });
          }
        } catch (error: any) {
          results.push({
            productId,
            productName: product?.nome || 'Produto desconhecido',
            contaId,
            contaName: conta?.nome_loja || 'Conta desconhecida',
            success: false,
            error: error.message || "Erro desconhecido"
          });
        }

        completed++;
        setProcessProgress((completed / totalOperations) * 100);
        setProcessResults([...results]);
      }
    }

    setIsProcessing(false);
    queryClient.invalidateQueries({ queryKey: ['marketplace_produtos_map'] });
    
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    
    if (errorCount === 0) {
      toast.success(`${successCount} produto(s) vinculado(s) com sucesso!`);
    } else if (successCount === 0) {
      toast.error(`Falha ao vincular ${errorCount} produto(s)`);
    } else {
      toast.warning(`${successCount} sucesso(s), ${errorCount} erro(s)`);
    }
  };

  // Step indicators
  const steps = [
    { number: 1, title: "Filtrar Produtos", description: "Filtre e selecione os produtos" },
    { number: 2, title: "Selecionar Marketplaces", description: "Escolha para quais marketplaces enviar" },
    { number: 3, title: "Processar", description: "Validar e enviar produtos" },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Catálogo de Produtos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus produtos e vincule-os aos marketplaces
          </p>
        </div>

        {/* Step Indicator */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                      wizardStep >= step.number 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {wizardStep > step.number ? <Check className="h-5 w-5" /> : step.number}
                    </div>
                    <div className="ml-3 hidden sm:block">
                      <p className={`text-sm font-medium ${wizardStep >= step.number ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${wizardStep > step.number ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Filter and Select Products */}
        {wizardStep === 1 && (
          <>
            {/* Filtros */}
            <Card>
              <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                <CardHeader className="pb-3">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Filtros
                        {hasActiveFilters && (
                          <Badge variant="secondary" className="ml-2">
                            Ativos
                          </Badge>
                        )}
                      </CardTitle>
                      {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {/* Primeira linha de filtros */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Buscar por Nome</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Nome do produto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>SKU</Label>
                        <Input
                          placeholder="Código SKU..."
                          value={filterSku}
                          onChange={(e) => setFilterSku(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>NCM</Label>
                        <Input
                          placeholder="Código NCM..."
                          value={filterNcm}
                          onChange={(e) => setFilterNcm(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Status do Produto</Label>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="inativo">Inativo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Segunda linha de filtros */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todas" />
                          </SelectTrigger>
                          <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                            <SelectItem value="all">Todas</SelectItem>
                            {categorias?.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Grupo</Label>
                        <Select value={filterGrupo} onValueChange={setFilterGrupo}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                            <SelectItem value="all">Todos</SelectItem>
                            {grupos?.map(g => (
                              <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Marketplace</Label>
                        <Select value={filterMarketplace} onValueChange={setFilterMarketplace}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                            <SelectItem value="all">Todos</SelectItem>
                            {marketplaces?.map(m => (
                              <SelectItem key={m.id} value={m.id}>{m.nome_display}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Status no Marketplace</Label>
                        <Select value={filterMarketplaceStatus} onValueChange={setFilterMarketplaceStatus}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="listado">Listado</SelectItem>
                            <SelectItem value="nao_listado">Não Listado</SelectItem>
                            <SelectItem value="pausado">Pausado</SelectItem>
                            <SelectItem value="erro">Com Erro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Custom field filters */}
                    {filterCamposCustomizados.length > 0 && (
                      <div className="border-t pt-4 mt-4">
                        <span className="text-xs font-medium text-muted-foreground mb-3 block">
                          Filtros de campos customizados
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {filterCamposCustomizados.map(campo => {
                            // Range filter for numeric fields with pesquisa_faixa
                            if (campo.tipo === 'numero' && campo.pesquisa_faixa) {
                              return (
                                <div key={campo.id} className="bg-background rounded-md p-3 border">
                                  <Label className="text-xs font-medium mb-2 block">
                                    {campo.nome} {campo.unidade && <span className="text-muted-foreground">({campo.unidade})</span>}
                                  </Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      placeholder="De"
                                      value={customFieldFilters.range[campo.campo_key]?.min || ""}
                                      onChange={(e) => updateRangeFilter(campo.campo_key, "min", e.target.value)}
                                      className="text-sm h-8"
                                    />
                                    <span className="text-xs text-muted-foreground">até</span>
                                    <Input
                                      type="number"
                                      placeholder="Até"
                                      value={customFieldFilters.range[campo.campo_key]?.max || ""}
                                      onChange={(e) => updateRangeFilter(campo.campo_key, "max", e.target.value)}
                                      className="text-sm h-8"
                                    />
                                  </div>
                                </div>
                              );
                            }
                            
                            // Simple number filter
                            if (campo.tipo === 'numero') {
                              return (
                                <div key={campo.id} className="bg-background rounded-md p-3 border">
                                  <Label className="text-xs font-medium mb-2 block">
                                    {campo.nome} {campo.unidade && <span className="text-muted-foreground">({campo.unidade})</span>}
                                  </Label>
                                  <Input
                                    type="number"
                                    placeholder={`Filtrar ${campo.nome.toLowerCase()}...`}
                                    value={customFieldFilters.number[campo.campo_key] || ""}
                                    onChange={(e) => updateCustomFilter('number', campo.campo_key, e.target.value)}
                                    className="text-sm h-8"
                                  />
                                </div>
                              );
                            }
                            
                            // Text filter
                            if (campo.tipo === 'texto') {
                              return (
                                <div key={campo.id} className="bg-background rounded-md p-3 border">
                                  <Label className="text-xs font-medium mb-2 block">{campo.nome}</Label>
                                  <Input
                                    type="text"
                                    placeholder={`Filtrar ${campo.nome.toLowerCase()}...`}
                                    value={customFieldFilters.text[campo.campo_key] || ""}
                                    onChange={(e) => updateCustomFilter('text', campo.campo_key, e.target.value)}
                                    className="text-sm h-8"
                                  />
                                </div>
                              );
                            }
                            
                            // Selection filter
                            if (campo.tipo === 'selecao') {
                              const opcoes = Array.isArray(campo.opcoes) ? campo.opcoes : [];
                              return (
                                <div key={campo.id} className="bg-background rounded-md p-3 border">
                                  <Label className="text-xs font-medium mb-2 block">{campo.nome}</Label>
                                  <Select 
                                    value={customFieldFilters.select[campo.campo_key] || ""} 
                                    onValueChange={(val) => updateCustomFilter('select', campo.campo_key, val === "all" ? "" : val)}
                                  >
                                    <SelectTrigger className="text-sm h-8">
                                      <SelectValue placeholder={`Selecione ${campo.nome.toLowerCase()}`} />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
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
                                <div key={campo.id} className="bg-background rounded-md p-3 border">
                                  <Label className="text-xs font-medium mb-2 block">{campo.nome}</Label>
                                  <Select 
                                    value={customFieldFilters.checkbox[campo.campo_key] === null ? "all" : customFieldFilters.checkbox[campo.campo_key] ? "true" : "false"} 
                                    onValueChange={(val) => updateCustomFilter('checkbox', campo.campo_key, val === "all" ? null : val === "true")}
                                  >
                                    <SelectTrigger className="text-sm h-8">
                                      <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
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

                    {/* Botão limpar filtros */}
                    {hasActiveFilters && (
                      <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={clearFilters}>
                          <X className="h-4 w-4 mr-2" />
                          Limpar Filtros
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Tabela de Produtos */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Produtos ({filteredAndSortedProdutos?.length || 0})
                  </CardTitle>
                  <CardDescription>
                    {selectedProducts.size > 0 && `${selectedProducts.size} produto(s) selecionado(s)`}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">
                            <Checkbox
                              checked={filteredAndSortedProdutos?.length > 0 && selectedProducts.size === filteredAndSortedProdutos?.length}
                              onCheckedChange={toggleSelectAll}
                            />
                          </TableHead>
                          <TableHead>
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => toggleSort('codigo')}>
                              SKU
                              <SortIcon field="codigo" />
                            </Button>
                          </TableHead>
                          <TableHead className="w-[250px]">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => toggleSort('nome')}>
                              Produto
                              <SortIcon field="nome" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => toggleSort('categoria')}>
                              Categoria
                              <SortIcon field="categoria" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => toggleSort('grupo')}>
                              Grupo
                              <SortIcon field="grupo" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => toggleSort('ativo')}>
                              Status
                              <SortIcon field="ativo" />
                            </Button>
                          </TableHead>
                          {marketplaces?.map(m => {
                            const Icon = marketplaceIcons[m.nome] || Store;
                            return (
                              <TableHead key={m.id} className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Icon className="h-4 w-4" />
                                  <span className="text-xs">{m.nome_display}</span>
                                </div>
                              </TableHead>
                            );
                          })}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAndSortedProdutos?.map(produto => (
                          <TableRow 
                            key={produto.id} 
                            className={`cursor-pointer ${selectedProducts.has(produto.id) ? 'bg-primary/5' : ''}`}
                            onClick={() => toggleProductSelection(produto.id)}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedProducts.has(produto.id)}
                                onCheckedChange={() => toggleProductSelection(produto.id)}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {produto.codigo || '-'}
                            </TableCell>
                            <TableCell>
                              <p className="font-medium truncate max-w-[200px]">{produto.nome}</p>
                              {produto.ncm && (
                                <p className="text-xs text-muted-foreground">NCM: {produto.ncm}</p>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {(produto as any).categoria?.nome || '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {(produto as any).grupo?.nome || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={produto.ativo ? 'bg-green-500/10 text-green-500' : 'bg-muted'}>
                                {produto.ativo ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                            {marketplaces?.map(m => {
                              const status = getStatusForMarketplace(produto.id, m.nome);
                              const config = status ? statusConfig[status] : null;
                              const StatusIcon = config?.icon || XCircle;
                              
                              return (
                                <TableCell key={m.id} className="text-center">
                                  {config ? (
                                    <Badge variant="outline" className={config.color}>
                                      <StatusIcon className="h-3 w-3 mr-1" />
                                      {config.label}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                        {(!filteredAndSortedProdutos || filteredAndSortedProdutos.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={(marketplaces?.length || 0) + 6} className="text-center py-10 text-muted-foreground">
                              Nenhum produto encontrado
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Step 2: Select Marketplaces */}
        {wizardStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Selecionar Marketplaces
              </CardTitle>
              <CardDescription>
                {selectedProducts.size} produto(s) selecionado(s). Escolha para quais contas de marketplace deseja vincular.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {contasMarketplace?.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Store className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma conta de marketplace conectada</p>
                  <p className="text-sm">Configure suas contas no Hub de Marketplaces</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {contasMarketplace?.map(conta => {
                    const Icon = marketplaceIcons[conta.marketplace?.nome || ''] || Store;
                    const isSelected = selectedContas.has(conta.id);
                    
                    return (
                      <div
                        key={conta.id}
                        onClick={() => toggleContaSelection(conta.id)}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                            : 'hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            checked={isSelected} 
                            onCheckedChange={() => toggleContaSelection(conta.id)}
                          />
                          <Icon className="h-6 w-6 text-primary" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{conta.nome_loja}</p>
                            <p className="text-sm text-muted-foreground">
                              {conta.marketplace?.nome_display}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {selectedContas.size > 0 && (
                <div className="bg-muted/50 rounded-lg p-4 mt-4">
                  <p className="text-sm">
                    <strong>{selectedProducts.size}</strong> produto(s) serão vinculados a <strong>{selectedContas.size}</strong> conta(s) de marketplace.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Process Results */}
        {wizardStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
                {isProcessing ? 'Processando...' : 'Resultado do Processamento'}
              </CardTitle>
              <CardDescription>
                {isProcessing 
                  ? `Vinculando produtos aos marketplaces...`
                  : `${processResults.filter(r => r.success).length} sucesso(s), ${processResults.filter(r => !r.success).length} erro(s)`
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isProcessing && (
                <div className="space-y-2">
                  <Progress value={processProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    {Math.round(processProgress)}% concluído
                  </p>
                </div>
              )}
              
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {processResults.map((result, index) => (
                    <div 
                      key={index} 
                      className={`p-3 rounded-lg border ${
                        result.success 
                          ? 'bg-green-500/5 border-green-500/20' 
                          : 'bg-red-500/5 border-red-500/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {result.success ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{result.productName}</p>
                          <p className="text-sm text-muted-foreground">
                            → {result.contaName}
                          </p>
                          {result.error && (
                            <p className="text-sm text-red-500 mt-1">{result.error}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <div>
            {wizardStep > 1 && (
              <Button variant="outline" onClick={handlePrevStep}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {wizardStep === 3 && !isProcessing && (
              <Button variant="outline" onClick={resetWizard}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Novo Envio
              </Button>
            )}
            {wizardStep < 3 && (
              <Button 
                onClick={handleNextStep}
                disabled={
                  (wizardStep === 1 && !canProceedToStep2) ||
                  (wizardStep === 2 && !canProceedToStep3)
                }
              >
                {wizardStep === 2 ? (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Processar
                  </>
                ) : (
                  <>
                    Próximo
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Sheet de Detalhes do Produto */}
        <Sheet open={!!selectedProduto} onOpenChange={(open) => !open && setSelectedProduto(null)}>
          <SheetContent className="w-full sm:max-w-lg">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {selectedProduto?.nome}
              </SheetTitle>
              <SheetDescription>Detalhes do produto em cada marketplace</SheetDescription>
            </SheetHeader>
            
            {selectedProduto && (
              <div className="mt-6 space-y-4">
                <div className="p-4 border rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="outline" className={selectedProduto.ativo ? 'bg-green-500/10 text-green-500' : 'bg-muted'}>
                    {selectedProduto.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Vínculos com Marketplaces</h4>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {getProdutoVinculos(selectedProduto.id).map(vinculo => {
                        const config = statusConfig[vinculo.status] || statusConfig.nao_listado;
                        const StatusIcon = config.icon;
                        const MarketIcon = marketplaceIcons[vinculo.marketplace?.nome] || Store;

                        return (
                          <div key={vinculo.id} className="border rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <MarketIcon className="h-5 w-5 text-primary" />
                                <span className="font-medium">{vinculo.marketplace?.nome_display}</span>
                              </div>
                              <Badge variant="outline" className={config.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {config.label}
                              </Badge>
                            </div>
                            <div className="text-sm space-y-1">
                              <p><span className="text-muted-foreground">Loja:</span> {vinculo.conta?.nome_loja}</p>
                              <p><span className="text-muted-foreground">SKU:</span> {vinculo.sku_marketplace || '-'}</p>
                              <p><span className="text-muted-foreground">Título:</span> {vinculo.titulo_marketplace || '-'}</p>
                              {vinculo.ultimo_sync && (
                                <p className="text-xs text-muted-foreground">
                                  Última sync: {format(new Date(vinculo.ultimo_sync), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </p>
                              )}
                              {vinculo.mensagem_erro && (
                                <p className="text-xs text-red-400 mt-2">{vinculo.mensagem_erro}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {getProdutoVinculos(selectedProduto.id).length === 0 && (
                        <div className="text-center py-10 text-muted-foreground">
                          <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                          <p>Este produto não está vinculado a nenhum marketplace</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                <Button className="w-full" disabled>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Publicar em Todos os Marketplaces
                </Button>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
