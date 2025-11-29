import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Store, ShoppingBag, Package, Box, Search, Plus, RefreshCw, 
  Link2, RotateCcw, ShoppingCart, Settings, History, Eye,
  CheckCircle2, XCircle, AlertCircle, Clock, Loader2, Key
} from "lucide-react";
import { getMarketplaceService } from "@/services/marketplaces";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MercadoLivreConfigDialog } from "@/components/marketplaces/MercadoLivreConfigDialog";

const marketplaceIcons: Record<string, any> = {
  'shopping-bag': ShoppingBag,
  'package': Package,
  'box': Box,
  'store': Store,
  'search': Search,
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  'conectado': { label: 'Conectado', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle2 },
  'nao_conectado': { label: 'Não Conectado', color: 'bg-muted text-muted-foreground border-border', icon: Link2 },
  'erro_token': { label: 'Token Expirado', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
  'sincronizando': { label: 'Sincronizando', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: RefreshCw },
};

export default function MarketplaceHub() {
  const queryClient = useQueryClient();
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [selectedConta, setSelectedConta] = useState<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newConta, setNewConta] = useState({ marketplace_id: '', nome_loja: '', seller_id: '', ambiente: 'sandbox' });
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [mlConfigConta, setMlConfigConta] = useState<any>(null);

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

  const { data: marketplaces, isLoading: loadingMarketplaces } = useQuery({
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

  const { data: contas, isLoading: loadingContas } = useQuery({
    queryKey: ['contas_marketplace', estabelecimentoId],
    queryFn: async () => {
      if (!estabelecimentoId) return [];
      const { data, error } = await supabase
        .from('contas_marketplace')
        .select('*, marketplace:marketplaces(*)')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!estabelecimentoId,
  });

  const { data: logs } = useQuery({
    queryKey: ['marketplace_logs', selectedConta?.id],
    queryFn: async () => {
      if (!selectedConta?.id) return [];
      const { data, error } = await supabase
        .from('marketplace_logs')
        .select('*')
        .eq('conta_marketplace_id', selectedConta.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedConta?.id,
  });

  const addContaMutation = useMutation({
    mutationFn: async (data: typeof newConta) => {
      if (!estabelecimentoId) throw new Error('Estabelecimento não encontrado');
      const { error } = await supabase.from('contas_marketplace').insert({
        estabelecimento_id: estabelecimentoId,
        marketplace_id: data.marketplace_id,
        nome_loja: data.nome_loja,
        seller_id: data.seller_id,
        ambiente: data.ambiente,
        status: 'nao_conectado',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas_marketplace'] });
      setShowAddDialog(false);
      setNewConta({ marketplace_id: '', nome_loja: '', seller_id: '', ambiente: 'sandbox' });
      toast.success('Conta adicionada com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao adicionar conta: ' + error.message);
    },
  });

  const executeAction = async (contaId: string, marketplaceNome: string, action: 'conectar' | 'sync_produtos' | 'sync_estoque' | 'sync_pedidos') => {
    setLoadingAction(`${contaId}-${action}`);
    try {
      const service = getMarketplaceService(marketplaceNome);
      if (!service) throw new Error('Serviço não encontrado');

      switch (action) {
        case 'conectar':
          await service.conectarConta(contaId);
          toast.success('Conta conectada com sucesso');
          break;
        case 'sync_produtos':
          await service.sincronizarProdutos(contaId);
          toast.success('Produtos sincronizados');
          break;
        case 'sync_estoque':
          await service.sincronizarEstoquePrecos(contaId);
          toast.success('Estoque/preços sincronizados');
          break;
        case 'sync_pedidos':
          await service.sincronizarPedidos(contaId);
          toast.success('Pedidos sincronizados');
          break;
      }
      queryClient.invalidateQueries({ queryKey: ['contas_marketplace'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace_logs'] });
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const isLoading = loadingMarketplaces || loadingContas;

  const getContasByMarketplace = (marketplaceId: string) => {
    return contas?.filter(c => c.marketplace_id === marketplaceId) || [];
  };

  const getIcon = (iconName: string | null) => {
    const Icon = marketplaceIcons[iconName || 'store'] || Store;
    return Icon;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Hub de Marketplaces
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie suas integrações com marketplaces de forma centralizada
            </p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Nova Conta</DialogTitle>
                <DialogDescription>Vincule uma nova conta de marketplace</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Marketplace</Label>
                  <Select value={newConta.marketplace_id} onValueChange={(v) => setNewConta(p => ({ ...p, marketplace_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um marketplace" />
                    </SelectTrigger>
                    <SelectContent>
                      {marketplaces?.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.nome_display}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nome da Loja</Label>
                  <Input 
                    value={newConta.nome_loja} 
                    onChange={(e) => setNewConta(p => ({ ...p, nome_loja: e.target.value }))}
                    placeholder="Ex: Minha Loja Online"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Seller ID / Account ID</Label>
                  <Input 
                    value={newConta.seller_id} 
                    onChange={(e) => setNewConta(p => ({ ...p, seller_id: e.target.value }))}
                    placeholder="Identificador da conta no marketplace"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ambiente</Label>
                  <Select value={newConta.ambiente} onValueChange={(v) => setNewConta(p => ({ ...p, ambiente: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Testes)</SelectItem>
                      <SelectItem value="producao">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
                <Button 
                  onClick={() => addContaMutation.mutate(newConta)}
                  disabled={!newConta.marketplace_id || !newConta.nome_loja || addContaMutation.isPending}
                >
                  {addContaMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {marketplaces?.map(marketplace => {
              const Icon = getIcon(marketplace.icone);
              const contasMarketplace = getContasByMarketplace(marketplace.id);

              return (
                <Card key={marketplace.id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/20">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{marketplace.nome_display}</CardTitle>
                        <CardDescription className="text-xs">{marketplace.descricao}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {contasMarketplace.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <Store className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhuma conta conectada</p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="mt-3"
                          onClick={() => {
                            setNewConta(p => ({ ...p, marketplace_id: marketplace.id }));
                            setShowAddDialog(true);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Adicionar Conta
                        </Button>
                      </div>
                    ) : (
                      contasMarketplace.map(conta => {
                        const status = statusConfig[conta.status] || statusConfig.nao_conectado;
                        const StatusIcon = status.icon;
                        const isActionLoading = loadingAction?.startsWith(conta.id);

                        return (
                          <div key={conta.id} className="border rounded-lg p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{conta.nome_loja}</p>
                                {conta.seller_id && (
                                  <p className="text-xs text-muted-foreground">ID: {conta.seller_id}</p>
                                )}
                              </div>
                              <Badge variant="outline" className={status.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {status.label}
                              </Badge>
                            </div>
                            
                            <div className="flex flex-wrap gap-1">
                              {/* Botão Config para Mercado Livre */}
                              {marketplace.nome === 'mercado_livre' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-xs h-7"
                                  onClick={() => setMlConfigConta(conta)}
                                >
                                  <Key className="h-3 w-3 mr-1" />
                                  Config
                                </Button>
                              )}
                              {conta.status !== 'conectado' ? (
                                <Button 
                                  size="sm" 
                                  variant="default"
                                  className="text-xs h-7"
                                  disabled={isActionLoading}
                                  onClick={() => executeAction(conta.id, marketplace.nome, 'conectar')}
                                >
                                  {loadingAction === `${conta.id}-conectar` ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <Link2 className="h-3 w-3 mr-1" />
                                  )}
                                  Conectar
                                </Button>
                              ) : (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="text-xs h-7"
                                    disabled={isActionLoading}
                                    onClick={() => executeAction(conta.id, marketplace.nome, 'sync_produtos')}
                                  >
                                    {loadingAction === `${conta.id}-sync_produtos` ? (
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                      <Package className="h-3 w-3 mr-1" />
                                    )}
                                    Produtos
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="text-xs h-7"
                                    disabled={isActionLoading}
                                    onClick={() => executeAction(conta.id, marketplace.nome, 'sync_estoque')}
                                  >
                                    {loadingAction === `${conta.id}-sync_estoque` ? (
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                      <RefreshCw className="h-3 w-3 mr-1" />
                                    )}
                                    Estoque
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="text-xs h-7"
                                    disabled={isActionLoading}
                                    onClick={() => executeAction(conta.id, marketplace.nome, 'sync_pedidos')}
                                  >
                                    {loadingAction === `${conta.id}-sync_pedidos` ? (
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                      <ShoppingCart className="h-3 w-3 mr-1" />
                                    )}
                                    Pedidos
                                  </Button>
                                </>
                              )}
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="text-xs h-7"
                                onClick={() => setSelectedConta(conta)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Detalhes
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Sheet de Detalhes */}
        <Sheet open={!!selectedConta} onOpenChange={(open) => !open && setSelectedConta(null)}>
          <SheetContent className="w-full sm:max-w-lg">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {selectedConta?.nome_loja}
              </SheetTitle>
              <SheetDescription>Detalhes e histórico da conta</SheetDescription>
            </SheetHeader>
            
            {selectedConta && (
              <div className="mt-6 space-y-6">
                {/* Info da Conta */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    Informações
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Seller ID</p>
                      <p className="font-mono">{selectedConta.seller_id || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Ambiente</p>
                      <Badge variant="outline" className="text-xs">
                        {selectedConta.ambiente === 'producao' ? 'Produção' : 'Sandbox'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Status</p>
                      <Badge variant="outline" className={statusConfig[selectedConta.status]?.color}>
                        {statusConfig[selectedConta.status]?.label}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Token</p>
                      <p className="font-mono text-xs truncate">
                        {selectedConta.access_token ? '••••••••' + selectedConta.access_token.slice(-8) : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Ações Rápidas */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Ações Rápidas
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      disabled={!!loadingAction}
                      onClick={() => executeAction(selectedConta.id, selectedConta.marketplace?.nome, 'sync_produtos')}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Sync Produtos
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      disabled={!!loadingAction}
                      onClick={() => executeAction(selectedConta.id, selectedConta.marketplace?.nome, 'sync_pedidos')}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Sync Pedidos
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Logs */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Últimos Logs
                  </h4>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {logs?.map(log => (
                        <div key={log.id} className="border rounded p-2 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline" className={log.sucesso ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}>
                              {log.tipo}
                            </Badge>
                            <span className="text-muted-foreground">
                              {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-muted-foreground">{log.mensagem}</p>
                        </div>
                      ))}
                      {(!logs || logs.length === 0) && (
                        <p className="text-center text-muted-foreground py-4">Nenhum log encontrado</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Dialog de Configuração do Mercado Livre */}
        <MercadoLivreConfigDialog
          open={!!mlConfigConta}
          onOpenChange={(open) => !open && setMlConfigConta(null)}
          contaId={mlConfigConta?.id || ''}
          contaNome={mlConfigConta?.nome_loja || ''}
          currentConfig={mlConfigConta?.configuracoes ? {
            client_id: (mlConfigConta.configuracoes as any)?.ml_client_id,
            client_secret: (mlConfigConta.configuracoes as any)?.ml_client_secret,
            redirect_uri: (mlConfigConta.configuracoes as any)?.ml_redirect_uri,
          } : undefined}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['contas_marketplace'] });
          }}
        />
      </div>
    </div>
  );
}
