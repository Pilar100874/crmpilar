import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ShoppingCart, Search, ShoppingBag, Package, Box, Store, 
  Calendar, DollarSign, User, MapPin, ChevronDown, Eye, Loader2, Code
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<string, { label: string; color: string }> = {
  'novo': { label: 'Novo', color: 'bg-blue-500/20 text-blue-400' },
  'em_processamento': { label: 'Em Processamento', color: 'bg-yellow-500/20 text-yellow-400' },
  'enviado': { label: 'Enviado', color: 'bg-purple-500/20 text-purple-400' },
  'entregue': { label: 'Entregue', color: 'bg-green-500/20 text-green-400' },
  'cancelado': { label: 'Cancelado', color: 'bg-red-500/20 text-red-400' },
};

const marketplaceIcons: Record<string, any> = {
  'mercado_livre': ShoppingBag,
  'shopee': Package,
  'amazon': Box,
  'magalu': Store,
  'google_merchant': Search,
};

export default function MarketplacePedidos() {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMarketplace, setFilterMarketplace] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedPedido, setSelectedPedido] = useState<any>(null);
  const [showJson, setShowJson] = useState(false);

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

  const { data: contas } = useQuery({
    queryKey: ['contas_marketplace', estabelecimentoId],
    queryFn: async () => {
      if (!estabelecimentoId) return [];
      const { data, error } = await supabase
        .from('contas_marketplace')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId);
      if (error) throw error;
      return data;
    },
    enabled: !!estabelecimentoId,
  });

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ['pedidos_marketplace', estabelecimentoId, filterMarketplace, filterStatus],
    queryFn: async () => {
      if (!estabelecimentoId) return [];
      let query = supabase
        .from('pedidos_marketplace')
        .select('*, marketplace:marketplaces(nome, nome_display), conta:contas_marketplace(nome_loja)')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('data_pedido', { ascending: false });

      if (filterMarketplace !== 'all') {
        query = query.eq('marketplace_id', filterMarketplace);
      }
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!estabelecimentoId,
  });

  const { data: pedidoItens } = useQuery({
    queryKey: ['pedido_itens', selectedPedido?.id],
    queryFn: async () => {
      if (!selectedPedido?.id) return [];
      const { data, error } = await supabase
        .from('pedidos_marketplace_itens')
        .select('*')
        .eq('pedido_marketplace_id', selectedPedido.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPedido?.id,
  });

  const filteredPedidos = pedidos?.filter(p =>
    p.id_pedido_marketplace.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.nome_cliente?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMarketplaceIcon = (nome: string) => {
    const Icon = marketplaceIcons[nome] || Store;
    return Icon;
  };

  // Estatísticas
  const totalPedidos = pedidos?.length || 0;
  const totalValor = pedidos?.reduce((sum, p) => sum + (p.valor_total || 0), 0) || 0;
  const pedidosNovos = pedidos?.filter(p => p.status === 'novo').length || 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Pedidos de Marketplaces
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todos os pedidos recebidos dos seus canais de venda
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/20">
                <ShoppingCart className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                <p className="text-2xl font-bold">{totalPedidos}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/20">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">R$ {totalValor.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-500/20">
                <Package className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Novos Pedidos</p>
                <p className="text-2xl font-bold">{pedidosNovos}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterMarketplace} onValueChange={setFilterMarketplace}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Marketplace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {marketplaces?.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nome_display}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(statusConfig).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Marketplace</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>ID do Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPedidos?.map(pedido => {
                    const Icon = getMarketplaceIcon(pedido.marketplace?.nome);
                    const status = statusConfig[pedido.status] || statusConfig.novo;

                    return (
                      <TableRow key={pedido.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(pedido.data_pedido), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            <span className="text-sm">{pedido.marketplace?.nome_display}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {pedido.conta?.nome_loja}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {pedido.id_pedido_marketplace}
                        </TableCell>
                        <TableCell>{pedido.nome_cliente || '-'}</TableCell>
                        <TableCell className="text-right font-mono">
                          {pedido.moeda} {pedido.valor_total?.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={status.color}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => setSelectedPedido(pedido)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!filteredPedidos || filteredPedidos.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        Nenhum pedido encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Sheet de Detalhes */}
        <Sheet open={!!selectedPedido} onOpenChange={(open) => !open && setSelectedPedido(null)}>
          <SheetContent className="w-full sm:max-w-xl">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Pedido {selectedPedido?.id_pedido_marketplace}
              </SheetTitle>
              <SheetDescription>Detalhes completos do pedido</SheetDescription>
            </SheetHeader>
            
            {selectedPedido && (
              <ScrollArea className="h-[calc(100vh-120px)] mt-6">
                <div className="space-y-6 pr-4">
                  {/* Info Geral */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Data
                      </p>
                      <p className="font-medium">
                        {format(new Date(selectedPedido.data_pedido), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge variant="outline" className={statusConfig[selectedPedido.status]?.color}>
                        {statusConfig[selectedPedido.status]?.label}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" /> Cliente
                      </p>
                      <p className="font-medium">{selectedPedido.nome_cliente || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Valor Total
                      </p>
                      <p className="font-bold text-lg">
                        {selectedPedido.moeda} {selectedPedido.valor_total?.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Itens */}
                  <div className="space-y-3">
                    <h4 className="font-semibold">Itens do Pedido</h4>
                    <div className="space-y-2">
                      {pedidoItens?.map(item => (
                        <div key={item.id} className="flex justify-between items-center border rounded p-3">
                          <div>
                            <p className="font-medium">{item.nome}</p>
                            <p className="text-xs text-muted-foreground">SKU: {item.sku || '-'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono">{item.quantidade}x R$ {item.preco_unitario?.toFixed(2)}</p>
                            <p className="font-bold text-sm">
                              R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                      {(!pedidoItens || pedidoItens.length === 0) && (
                        <p className="text-muted-foreground text-sm text-center py-4">
                          Nenhum item encontrado
                        </p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* JSON Bruto */}
                  <Collapsible open={showJson} onOpenChange={setShowJson}>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <span className="flex items-center gap-2">
                          <Code className="h-4 w-4" />
                          Dados Brutos (JSON)
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${showJson ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <pre className="mt-3 p-4 bg-muted rounded-lg text-xs overflow-auto max-h-64">
                        {JSON.stringify(selectedPedido.dados_brutos_json, null, 2)}
                      </pre>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </ScrollArea>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
