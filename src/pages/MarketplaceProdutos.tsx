import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Package, Search, ShoppingBag, Store, Box, RefreshCw, 
  CheckCircle2, XCircle, Pause, AlertTriangle, Loader2, Eye
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

export default function MarketplaceProdutos() {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduto, setSelectedProduto] = useState<any>(null);

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

  const { data: produtos, isLoading } = useQuery({
    queryKey: ['produtos_marketplace', estabelecimentoId],
    queryFn: async () => {
      if (!estabelecimentoId) return [];
      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, ativo')
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
        .select('*, marketplace:marketplaces(nome, nome_display), conta:contas_marketplace(nome_loja)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Agrupar por produto_id
      const map: Record<string, any[]> = {};
      data?.forEach(item => {
        if (!map[item.produto_id]) map[item.produto_id] = [];
        map[item.produto_id].push(item);
      });
      return map;
    },
    enabled: !!estabelecimentoId,
  });

  const filteredProdutos = produtos?.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusForMarketplace = (produtoId: string, marketplaceNome: string) => {
    const vinculos = vinculosMap?.[produtoId] || [];
    const vinculo = vinculos.find(v => v.marketplace?.nome === marketplaceNome);
    return vinculo?.status || null;
  };

  const getProdutoVinculos = (produtoId: string) => {
    return vinculosMap?.[produtoId] || [];
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Produtos x Marketplaces
            </h1>
            <p className="text-muted-foreground mt-1">
              Visualize o status dos seus produtos em cada canal de venda
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Catálogo de Produtos
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
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
                      <TableHead className="w-[300px]">Produto</TableHead>
                      <TableHead className="text-right">Status</TableHead>
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
                    {filteredProdutos?.map(produto => (
                      <TableRow key={produto.id}>
                        <TableCell>
                          <p className="font-medium">{produto.nome}</p>
                        </TableCell>
                        <TableCell className="text-right">
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
                    {(!filteredProdutos || filteredProdutos.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={(marketplaces?.length || 0) + 4} className="text-center py-10 text-muted-foreground">
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
      </div>
    </div>
  );
}
