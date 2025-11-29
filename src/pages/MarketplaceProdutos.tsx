import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Package, Search, ShoppingBag, Store, Box, RefreshCw, 
  CheckCircle2, XCircle, Pause, AlertTriangle, Loader2, Eye,
  Filter, ArrowUpDown, ArrowUp, ArrowDown, Plus, Link2
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

type SortField = 'nome' | 'ativo';
type SortDirection = 'asc' | 'desc';

export default function MarketplaceProdutos() {
  const queryClient = useQueryClient();
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduto, setSelectedProduto] = useState<any>(null);
  
  // Filtros
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterMarketplace, setFilterMarketplace] = useState<string>("all");
  const [filterMarketplaceStatus, setFilterMarketplaceStatus] = useState<string>("all");
  
  // Ordenação
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Seleção de produtos
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [selectedContaId, setSelectedContaId] = useState<string>("");

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

  const { data: produtos, isLoading } = useQuery({
    queryKey: ['produtos_marketplace', estabelecimentoId],
    queryFn: async () => {
      if (!estabelecimentoId) return [];
      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, ativo, codigo')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');
      if (error) throw error;
      return data;
    },
    enabled: !!estabelecimentoId,
  });

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

  const linkProductsMutation = useMutation({
    mutationFn: async ({ productIds, contaId }: { productIds: string[], contaId: string }) => {
      const conta = contasMarketplace?.find(c => c.id === contaId);
      if (!conta) throw new Error("Conta não encontrada");

      const inserts = productIds.map(produtoId => ({
        produto_id: produtoId,
        marketplace_id: conta.marketplace_id,
        conta_marketplace_id: contaId,
        status: 'nao_listado',
        dados_extras: {},
      }));

      const { error } = await supabase
        .from('marketplace_produtos')
        .upsert(inserts, { onConflict: 'produto_id,conta_marketplace_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produtos vinculados com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['marketplace_produtos_map'] });
      setSelectedProducts(new Set());
      setIsLinkDialogOpen(false);
      setSelectedContaId("");
    },
    onError: (error: any) => {
      toast.error("Erro ao vincular produtos: " + error.message);
    },
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

  // Aplicar filtros e ordenação
  const filteredAndSortedProdutos = produtos
    ?.filter(p => {
      // Filtro de busca
      if (searchTerm && !p.nome.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      // Filtro de status do produto
      if (filterStatus !== "all") {
        if (filterStatus === "ativo" && !p.ativo) return false;
        if (filterStatus === "inativo" && p.ativo) return false;
      }
      // Filtro de marketplace
      if (filterMarketplace !== "all") {
        if (!isInMarketplace(p.id, filterMarketplace)) return false;
      }
      // Filtro de status no marketplace
      if (filterMarketplaceStatus !== "all") {
        if (!hasAnyMarketplaceStatus(p.id, filterMarketplaceStatus)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'nome') {
        comparison = a.nome.localeCompare(b.nome);
      } else if (sortField === 'ativo') {
        comparison = (a.ativo === b.ativo) ? 0 : a.ativo ? -1 : 1;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

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

  const handleLinkProducts = () => {
    if (selectedProducts.size === 0) {
      toast.error("Selecione pelo menos um produto");
      return;
    }
    setIsLinkDialogOpen(true);
  };

  const confirmLinkProducts = () => {
    if (!selectedContaId) {
      toast.error("Selecione uma conta de marketplace");
      return;
    }
    linkProductsMutation.mutate({
      productIds: Array.from(selectedProducts),
      contaId: selectedContaId,
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Catálogo de Produtos
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie seus produtos e vincule-os aos marketplaces
            </p>
          </div>
          {selectedProducts.size > 0 && (
            <Button onClick={handleLinkProducts}>
              <Link2 className="h-4 w-4 mr-2" />
              Vincular {selectedProducts.size} produto(s) a Marketplace
            </Button>
          )}
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Buscar</Label>
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
          </CardContent>
        </Card>

        {/* Tabela de Produtos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Produtos ({filteredAndSortedProdutos?.length || 0})
            </CardTitle>
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
                      <TableHead className="w-[300px]">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => toggleSort('nome')}>
                          Produto
                          <SortIcon field="nome" />
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
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedProdutos?.map(produto => (
                      <TableRow key={produto.id} className={selectedProducts.has(produto.id) ? 'bg-primary/5' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={selectedProducts.has(produto.id)}
                            onCheckedChange={() => toggleProductSelection(produto.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{produto.nome}</p>
                            {produto.codigo && (
                              <p className="text-xs text-muted-foreground">SKU: {produto.codigo}</p>
                            )}
                          </div>
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
                        <TableCell className="text-center">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => setSelectedProduto(produto)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!filteredAndSortedProdutos || filteredAndSortedProdutos.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={(marketplaces?.length || 0) + 5} className="text-center py-10 text-muted-foreground">
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

        {/* Dialog de Vincular a Marketplace */}
        <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Vincular Produtos a Marketplace
              </DialogTitle>
              <DialogDescription>
                Selecione a conta do marketplace para vincular {selectedProducts.size} produto(s)
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Conta do Marketplace</Label>
                <Select value={selectedContaId} onValueChange={setSelectedContaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                    {contasMarketplace?.map(conta => (
                      <SelectItem key={conta.id} value={conta.id}>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const Icon = marketplaceIcons[conta.marketplace?.nome || ''] || Store;
                            return <Icon className="h-4 w-4" />;
                          })()}
                          <span>{conta.nome_loja}</span>
                          <span className="text-muted-foreground">({conta.marketplace?.nome_display})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">
                  <strong>{selectedProducts.size}</strong> produto(s) selecionado(s) serão vinculados à conta escolhida com status "Não Listado". 
                  Você poderá publicá-los posteriormente.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={confirmLinkProducts} disabled={linkProductsMutation.isPending}>
                {linkProductsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Vincular Produtos
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
