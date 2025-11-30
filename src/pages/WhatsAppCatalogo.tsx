import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Package, Search, MessageCircle, RefreshCw, 
  CheckCircle2, XCircle, Loader2,
  Filter, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp,
  ArrowRight, ArrowLeft, Send, Check, ShoppingCart, Settings, Save
} from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  'listado': { label: 'No Catálogo', color: 'bg-green-500/20 text-green-400', icon: CheckCircle2 },
  'nao_listado': { label: 'Não Listado', color: 'bg-muted text-muted-foreground', icon: XCircle },
  'pendente': { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-400', icon: Loader2 },
  'erro': { label: 'Erro', color: 'bg-red-500/20 text-red-400', icon: XCircle },
};

type SortField = 'nome' | 'codigo' | 'categoria' | 'grupo' | 'ativo';
type SortDirection = 'asc' | 'desc';
type WizardStep = 1 | 2;

interface ProcessResult {
  productId: string;
  productName: string;
  success: boolean;
  error?: string;
}

interface WhatsAppCatalogoConfig {
  phone_number_id: string;
  business_account_id: string;
  catalog_id: string;
  access_token: string;
  nome_conta: string;
}

export default function WhatsAppCatalogo() {
  const queryClient = useQueryClient();
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("produtos");
  
  // Config state
  const [configSaving, setConfigSaving] = useState(false);
  const [config, setConfig] = useState<WhatsAppCatalogoConfig>({
    phone_number_id: "",
    business_account_id: "",
    catalog_id: "",
    access_token: "",
    nome_conta: ""
  });
  
  // Wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processResults, setProcessResults] = useState<ProcessResult[]>([]);
  const [processProgress, setProcessProgress] = useState(0);
  
  // Filtros
  const [showFilters, setShowFilters] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSku, setFilterSku] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategoria, setFilterCategoria] = useState<string>("all");
  const [filterGrupo, setFilterGrupo] = useState<string>("all");
  const [filterCatalogoStatus, setFilterCatalogoStatus] = useState<string>("all");
  
  // Ordenação
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Seleção de produtos
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

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

  // Buscar configuração salva
  const { data: savedConfig, refetch: refetchConfig } = useQuery({
    queryKey: ['whatsapp_catalogo_config', estabelecimentoId],
    queryFn: async () => {
      if (!estabelecimentoId) return null;
      
      const { data, error } = await supabase
        .from('whatsapp_catalogo_config')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!estabelecimentoId,
  });

  // Atualiza state do config quando carrega do banco
  useEffect(() => {
    if (savedConfig) {
      setConfig({
        phone_number_id: savedConfig.phone_number_id || "",
        business_account_id: savedConfig.business_account_id || "",
        catalog_id: savedConfig.catalog_id || "",
        access_token: savedConfig.access_token || "",
        nome_conta: savedConfig.nome_conta || ""
      });
    }
  }, [savedConfig]);

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
    queryKey: ['produtos_whatsapp', estabelecimentoId],
    queryFn: async () => {
      if (!estabelecimentoId) return [];
      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, ativo, codigo, categoria_id, grupo_id, categoria:produto_categorias(id, nome), grupo:produto_grupos(id, nome)')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');
      if (error) throw error;
      return data;
    },
    enabled: !!estabelecimentoId,
  });

  // Buscar vínculos de produtos com catálogo WhatsApp
  const { data: vinculosMap } = useQuery({
    queryKey: ['whatsapp_catalogo_produtos', estabelecimentoId],
    queryFn: async () => {
      if (!estabelecimentoId) return {};
      const { data, error } = await supabase
        .from('marketplace_produtos')
        .select('*, marketplace:marketplaces(id, nome, nome_display), conta:contas_marketplace(nome_loja)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Filter only whatsapp_commerce
      const whatsappData = data?.filter(d => d.marketplace?.nome === 'whatsapp_commerce') || [];
      
      const map: Record<string, any[]> = {};
      whatsappData.forEach(item => {
        if (!map[item.produto_id]) map[item.produto_id] = [];
        map[item.produto_id].push(item);
      });
      return map;
    },
    enabled: !!estabelecimentoId,
  });

  const getProdutoStatus = (produtoId: string) => {
    const vinculos = vinculosMap?.[produtoId] || [];
    if (vinculos.length === 0) return 'nao_listado';
    return vinculos[0]?.status || 'nao_listado';
  };

  const isInCatalogo = (produtoId: string) => {
    const vinculos = vinculosMap?.[produtoId] || [];
    return vinculos.length > 0;
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
    
    // Filtro de status no catálogo
    if (filterCatalogoStatus !== "all") {
      if (filterCatalogoStatus === "no_catalogo") {
        result = result.filter(p => isInCatalogo(p.id));
      } else if (filterCatalogoStatus === "fora_catalogo") {
        result = result.filter(p => !isInCatalogo(p.id));
      }
    }
    
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
  }, [produtos, searchTerm, filterSku, filterStatus, filterCategoria, filterGrupo, filterCatalogoStatus, sortField, sortDirection, vinculosMap]);

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

  const toggleSelectAllContas = () => {
    if (selectedContas.size === contasWhatsApp?.length) {
      setSelectedContas(new Set());
    } else {
      setSelectedContas(new Set(contasWhatsApp?.map(c => c.id)));
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterSku("");
    setFilterStatus("all");
    setFilterCategoria("all");
    setFilterGrupo("all");
    setFilterCatalogoStatus("all");
  };

  // Processar publicação no catálogo
  const processPublishing = async () => {
    if (selectedProducts.size === 0 || selectedContas.size === 0) {
      toast.error("Selecione produtos e contas para continuar");
      return;
    }

    setIsProcessing(true);
    setProcessResults([]);
    setProcessProgress(0);

    const totalOperations = selectedProducts.size * selectedContas.size;
    let completed = 0;
    const results: ProcessResult[] = [];

    const productsList = filteredAndSortedProdutos?.filter(p => selectedProducts.has(p.id)) || [];
    const contasList = contasWhatsApp?.filter(c => selectedContas.has(c.id)) || [];

    for (const produto of productsList) {
      for (const conta of contasList) {
        try {
          // Validações
          if (!produto.codigo) {
            results.push({
              productId: produto.id,
              productName: produto.nome,
              contaId: conta.id,
              contaName: conta.nome_loja,
              success: false,
              error: "Produto sem SKU"
            });
            completed++;
            setProcessProgress((completed / totalOperations) * 100);
            continue;
          }

          if (!produto.nome) {
            results.push({
              productId: produto.id,
              productName: produto.nome || 'Sem nome',
              contaId: conta.id,
              contaName: conta.nome_loja,
              success: false,
              error: "Produto sem nome"
            });
            completed++;
            setProcessProgress((completed / totalOperations) * 100);
            continue;
          }

          // Verificar se já existe vínculo
          const { data: existingVinculo } = await supabase
            .from('marketplace_produtos')
            .select('id')
            .eq('produto_id', produto.id)
            .eq('conta_marketplace_id', conta.id)
            .maybeSingle();

          if (existingVinculo) {
            results.push({
              productId: produto.id,
              productName: produto.nome,
              contaId: conta.id,
              contaName: conta.nome_loja,
              success: false,
              error: "Produto já vinculado a esta conta"
            });
            completed++;
            setProcessProgress((completed / totalOperations) * 100);
            continue;
          }

          // Criar vínculo
          const { error: insertError } = await supabase
            .from('marketplace_produtos')
            .insert({
              produto_id: produto.id,
              marketplace_id: conta.marketplace_id,
              conta_marketplace_id: conta.id,
              marketplace_product_id: produto.codigo,
              status: 'pendente'
            });

          if (insertError) throw insertError;

          results.push({
            productId: produto.id,
            productName: produto.nome,
            contaId: conta.id,
            contaName: conta.nome_loja,
            success: true
          });
        } catch (error: any) {
          results.push({
            productId: produto.id,
            productName: produto.nome,
            contaId: conta.id,
            contaName: conta.nome_loja,
            success: false,
            error: error.message || "Erro desconhecido"
          });
        }

        completed++;
        setProcessProgress((completed / totalOperations) * 100);
      }
    }

    setProcessResults(results);
    setIsProcessing(false);
    
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    
    if (successCount > 0) {
      toast.success(`${successCount} produto(s) adicionado(s) ao catálogo`);
      queryClient.invalidateQueries({ queryKey: ['whatsapp_catalogo_produtos'] });
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} produto(s) com erro`);
    }
  };

  const resetWizard = () => {
    setWizardStep(1);
    setSelectedProducts(new Set());
    setSelectedContas(new Set());
    setProcessResults([]);
    setProcessProgress(0);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const renderWizardSteps = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
            wizardStep >= step 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground'
          }`}>
            {wizardStep > step ? <Check className="h-4 w-4" /> : step}
          </div>
          {step < 3 && (
            <div className={`w-12 h-1 mx-2 rounded ${wizardStep > step ? 'bg-primary' : 'bg-muted'}`} />
          )}
        </div>
      ))}
    </div>
  );

  // Step 1: Selecionar produtos
  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Selecione os Produtos</h3>
          <p className="text-sm text-muted-foreground">
            Escolha os produtos para adicionar ao catálogo WhatsApp
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
        </Button>
      </div>

      <Collapsible open={showFilters}>
        <CollapsibleContent>
          <Card className="mb-4">
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Buscar por nome</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nome do produto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">SKU</label>
                <Input
                  placeholder="Código SKU..."
                  value={filterSku}
                  onChange={(e) => setFilterSku(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ativo">Ativos</SelectItem>
                    <SelectItem value="inativo">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Categoria</label>
                <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {categorias?.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Grupo</label>
                <Select value={filterGrupo} onValueChange={setFilterGrupo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {grupos?.map(grp => (
                      <SelectItem key={grp.id} value={grp.id}>{grp.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">No Catálogo</label>
                <Select value={filterCatalogoStatus} onValueChange={setFilterCatalogoStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="no_catalogo">No Catálogo</SelectItem>
                    <SelectItem value="fora_catalogo">Fora do Catálogo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} size="sm">
                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
        <span>{filteredAndSortedProdutos?.length || 0} produtos encontrados</span>
        <span>{selectedProducts.size} selecionados</span>
      </div>

      <ScrollArea className="h-[400px] border rounded-lg">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedProducts.size === filteredAndSortedProdutos?.length && filteredAndSortedProdutos?.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('nome')}>
                <div className="flex items-center gap-1">Nome <SortIcon field="nome" /></div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('codigo')}>
                <div className="flex items-center gap-1">SKU <SortIcon field="codigo" /></div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('categoria')}>
                <div className="flex items-center gap-1">Categoria <SortIcon field="categoria" /></div>
              </TableHead>
              <TableHead>Status Catálogo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredAndSortedProdutos?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum produto encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedProdutos?.map(produto => {
                const status = getProdutoStatus(produto.id);
                const statusInfo = statusConfig[status] || statusConfig['nao_listado'];
                const StatusIcon = statusInfo.icon;
                
                return (
                  <TableRow key={produto.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedProducts.has(produto.id)}
                        onCheckedChange={() => toggleProductSelection(produto.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{produto.nome}</TableCell>
                    <TableCell>{produto.codigo || '-'}</TableCell>
                    <TableCell>{(produto as any).categoria?.nome || '-'}</TableCell>
                    <TableCell>
                      <Badge className={statusInfo.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      <div className="flex justify-end gap-2">
        <Button 
          onClick={() => setWizardStep(2)}
          disabled={selectedProducts.size === 0}
        >
          Próximo <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Step 2: Selecionar contas WhatsApp
  const renderStep2 = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Selecione as Contas WhatsApp</h3>
        <p className="text-sm text-muted-foreground">
          Escolha para quais contas WhatsApp Commerce deseja enviar os produtos
        </p>
      </div>

      {!contasWhatsApp || contasWhatsApp.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhuma conta WhatsApp Commerce conectada.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Conecte uma conta no Hub de Marketplaces primeiro.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>{contasWhatsApp.length} conta(s) disponível(is)</span>
            <span>{selectedContas.size} selecionada(s)</span>
          </div>

          <div className="grid gap-3">
            <Card 
              className={`cursor-pointer transition-all ${
                selectedContas.size === contasWhatsApp.length 
                  ? 'border-primary bg-primary/5' 
                  : 'hover:border-primary/50'
              }`}
              onClick={toggleSelectAllContas}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <Checkbox
                  checked={selectedContas.size === contasWhatsApp.length}
                  onCheckedChange={toggleSelectAllContas}
                />
                <div className="flex-1">
                  <p className="font-medium">Selecionar Todas</p>
                  <p className="text-sm text-muted-foreground">
                    Enviar para todas as contas conectadas
                  </p>
                </div>
              </CardContent>
            </Card>

            {contasWhatsApp.map(conta => (
              <Card 
                key={conta.id}
                className={`cursor-pointer transition-all ${
                  selectedContas.has(conta.id) 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => toggleContaSelection(conta.id)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <Checkbox
                    checked={selectedContas.has(conta.id)}
                    onCheckedChange={() => toggleContaSelection(conta.id)}
                  />
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <MessageCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{conta.nome_loja}</p>
                    <p className="text-sm text-muted-foreground">
                      WhatsApp Commerce
                    </p>
                  </div>
                  <Badge variant={conta.status === 'conectado' ? 'default' : 'secondary'}>
                    {conta.status === 'conectado' ? 'Conectado' : conta.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <div className="flex justify-between gap-2">
        <Button variant="outline" onClick={() => setWizardStep(1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <Button 
          onClick={() => setWizardStep(3)}
          disabled={selectedContas.size === 0}
        >
          Próximo <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Step 3: Processamento
  const renderStep3 = () => {
    const selectedProductsList = filteredAndSortedProdutos?.filter(p => selectedProducts.has(p.id)) || [];
    const selectedContasList = contasWhatsApp?.filter(c => selectedContas.has(c.id)) || [];
    const successResults = processResults.filter(r => r.success);
    const errorResults = processResults.filter(r => !r.success);

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">
            {processResults.length > 0 ? 'Resultado do Processamento' : 'Confirmar Envio'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {processResults.length > 0 
              ? 'Confira os resultados abaixo'
              : 'Revise e confirme os dados antes de enviar'
            }
          </p>
        </div>

        {processResults.length === 0 && !isProcessing && (
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Produtos Selecionados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{selectedProducts.size}</p>
                <ScrollArea className="h-32 mt-2">
                  <ul className="text-sm space-y-1">
                    {selectedProductsList.slice(0, 10).map(p => (
                      <li key={p.id} className="truncate text-muted-foreground">
                        • {p.nome}
                      </li>
                    ))}
                    {selectedProductsList.length > 10 && (
                      <li className="text-muted-foreground">
                        ... e mais {selectedProductsList.length - 10}
                      </li>
                    )}
                  </ul>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Contas WhatsApp
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{selectedContas.size}</p>
                <ul className="text-sm space-y-1 mt-2">
                  {selectedContasList.map(c => (
                    <li key={c.id} className="truncate text-muted-foreground">
                      • {c.nome_loja}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {isProcessing && (
          <Card>
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>Processando...</p>
                <Progress value={processProgress} className="w-full max-w-md" />
                <p className="text-sm text-muted-foreground">
                  {Math.round(processProgress)}% concluído
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {processResults.length > 0 && !isProcessing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-green-500/30 bg-green-500/5">
                <CardContent className="py-4 text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
                  <p className="text-2xl font-bold text-green-500">{successResults.length}</p>
                  <p className="text-sm text-muted-foreground">Sucesso</p>
                </CardContent>
              </Card>
              <Card className="border-red-500/30 bg-red-500/5">
                <CardContent className="py-4 text-center">
                  <XCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
                  <p className="text-2xl font-bold text-red-500">{errorResults.length}</p>
                  <p className="text-sm text-muted-foreground">Erros</p>
                </CardContent>
              </Card>
            </div>

            {errorResults.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-red-500">Erros encontrados</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-40">
                    <ul className="text-sm space-y-2">
                      {errorResults.map((r, i) => (
                        <li key={i} className="text-muted-foreground">
                          <span className="font-medium">{r.productName}</span>
                          <span className="text-red-500 ml-2">→ {r.error}</span>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="flex justify-between gap-2">
          {processResults.length === 0 ? (
            <>
              <Button variant="outline" onClick={() => setWizardStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
              </Button>
              <Button 
                onClick={processPublishing}
                disabled={isProcessing}
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar para Catálogo
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={resetWizard}>
                Nova Seleção
              </Button>
              <Button onClick={resetWizard}>
                <Check className="h-4 w-4 mr-2" />
                Concluir
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-4 sm:p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-green-500/10">
            <MessageCircle className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Catálogo WhatsApp</h1>
            <p className="text-muted-foreground">
              Gerencie os produtos do seu catálogo WhatsApp Commerce
            </p>
          </div>
        </div>
      </div>

      <Card className="flex-1">
        <CardContent className="p-6">
          {renderWizardSteps()}
          
          {wizardStep === 1 && renderStep1()}
          {wizardStep === 2 && renderStep2()}
          {wizardStep === 3 && renderStep3()}
        </CardContent>
      </Card>
    </div>
  );
}
