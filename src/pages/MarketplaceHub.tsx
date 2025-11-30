import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Store, ShoppingBag, Package, Box, Search, Plus, RefreshCw, 
  Link2, RotateCcw, ShoppingCart, Settings, History, Eye, EyeOff,
  CheckCircle2, XCircle, AlertCircle, Clock, Loader2, Key, HelpCircle,
  MessageCircle, ExternalLink, ListChecks
} from "lucide-react";
import { getMarketplaceService } from "@/services/marketplaces";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MercadoLivreConfigDialog } from "@/components/marketplaces/MercadoLivreConfigDialog";
import { AmazonConfigDialog } from "@/components/marketplaces/AmazonConfigDialog";
import { ShopeeConfigDialog } from "@/components/marketplaces/ShopeeConfigDialog";
import { MagaluConfigDialog } from "@/components/marketplaces/MagaluConfigDialog";
import { GoogleShoppingConfigDialog } from "@/components/marketplaces/GoogleShoppingConfigDialog";
import { AmericanasConfigDialog } from "@/components/marketplaces/AmericanasConfigDialog";
import { CarrefourConfigDialog } from "@/components/marketplaces/CarrefourConfigDialog";
import { CasasBahiaConfigDialog } from "@/components/marketplaces/CasasBahiaConfigDialog";
import { OlxConfigDialog } from "@/components/marketplaces/OlxConfigDialog";
import { WhatsAppCommerceConfigDialog } from "@/components/marketplaces/WhatsAppCommerceConfigDialog";

const marketplaceIcons: Record<string, any> = {
  'shopping-bag': ShoppingBag,
  'ShoppingBag': ShoppingBag,
  'package': Package,
  'Package': Package,
  'box': Box,
  'store': Store,
  'Store': Store,
  'search': Search,
  'ShoppingCart': ShoppingCart,
  'MessageCircle': MessageCircle,
};

const statusConfig: Record<string, { label: string; color: string; icon: any; ledColor: string; ledShadow: string }> = {
  'conectado': { label: 'Conectado', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle2, ledColor: 'bg-green-500', ledShadow: 'shadow-[0_0_8px_2px_rgba(34,197,94,0.6)]' },
  'nao_conectado': { label: 'Não Conectado', color: 'bg-muted text-muted-foreground border-border', icon: Link2, ledColor: 'bg-gray-400', ledShadow: 'shadow-[0_0_6px_1px_rgba(156,163,175,0.5)]' },
  'erro_token': { label: 'Token Expirado', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle, ledColor: 'bg-red-500', ledShadow: 'shadow-[0_0_8px_2px_rgba(239,68,68,0.6)]' },
  'sincronizando': { label: 'Sincronizando', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: RefreshCw, ledColor: 'bg-yellow-500 animate-pulse', ledShadow: 'shadow-[0_0_8px_2px_rgba(234,179,8,0.6)]' },
};

// Redirect URIs fixos para cada marketplace (não editáveis)
const MARKETPLACE_REDIRECT_URIS: Record<string, string> = {
  mercado_livre: 'https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/mercadolivre-auth-callback',
  amazon: 'https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/amazon-auth-callback',
  shopee: 'https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/shopee-auth-callback',
  magalu: 'https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/magalu-auth-callback',
  google_merchant: 'https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/google-shopping-auth-callback',
  americanas: 'https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/americanas-auth-callback',
  carrefour: 'https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/carrefour-auth-callback',
  casas_bahia: 'https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/casasbahia-auth-callback',
  olx: 'https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/olx-auth-callback',
  whatsapp_commerce: 'https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/whatsapp-commerce-auth-callback',
};

export default function MarketplaceHub() {
  const queryClient = useQueryClient();
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [selectedConta, setSelectedConta] = useState<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newConta, setNewConta] = useState({ 
    marketplace_id: '', 
    nome_loja: '', 
    seller_id: '', 
    ambiente: 'sandbox',
    // Mercado Livre
    ml_client_id: '',
    ml_client_secret: '',
    // Amazon
    amazon_client_id: '',
    amazon_client_secret: '',
    amazon_refresh_token: '',
    // Shopee
    shopee_partner_id: '',
    shopee_partner_key: '',
    shopee_shop_id: '',
    // Magazine Luiza
    magalu_client_id: '',
    magalu_client_secret: '',
    // Google Shopping
    google_client_id: '',
    google_client_secret: '',
    google_merchant_id: '',
    // Americanas
    americanas_client_id: '',
    americanas_client_secret: '',
    // Carrefour
    carrefour_client_id: '',
    carrefour_client_secret: '',
    // Casas Bahia (Via)
    via_client_id: '',
    via_client_secret: '',
    // OLX
    olx_client_id: '',
    olx_client_secret: '',
    // WhatsApp Commerce
    whatsapp_app_id: '',
    whatsapp_app_secret: '',
  });
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [mlConfigConta, setMlConfigConta] = useState<any>(null);
  const [amazonConfigConta, setAmazonConfigConta] = useState<any>(null);
  const [shopeeConfigConta, setShopeeConfigConta] = useState<any>(null);
  const [magaluConfigConta, setMagaluConfigConta] = useState<any>(null);
  const [googleConfigConta, setGoogleConfigConta] = useState<any>(null);
  const [americanasConfigConta, setAmericanasConfigConta] = useState<any>(null);
  const [carrefourConfigConta, setCarrefourConfigConta] = useState<any>(null);
  const [casasBahiaConfigConta, setCasasBahiaConfigConta] = useState<any>(null);
  const [olxConfigConta, setOlxConfigConta] = useState<any>(null);
  const [whatsappConfigConta, setWhatsappConfigConta] = useState<any>(null);
  const [showMlSecret, setShowMlSecret] = useState(false);
  const [showMlHelp, setShowMlHelp] = useState(false);
  const [showAmazonHelp, setShowAmazonHelp] = useState(false);
  const [showShopeeHelp, setShowShopeeHelp] = useState(false);
  const [showMagaluHelp, setShowMagaluHelp] = useState(false);
  const [showGoogleHelp, setShowGoogleHelp] = useState(false);

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

  // Verifica qual marketplace está selecionado
  const selectedMarketplace = marketplaces?.find(m => m.id === newConta.marketplace_id);
  const isMercadoLivre = selectedMarketplace?.nome === 'mercado_livre';
  const isAmazon = selectedMarketplace?.nome === 'amazon';
  const isShopee = selectedMarketplace?.nome === 'shopee';
  const isMagalu = selectedMarketplace?.nome === 'magalu';
  const isGoogleMerchant = selectedMarketplace?.nome === 'google_merchant';
  const isAmericanas = selectedMarketplace?.nome === 'americanas';
  const isCarrefour = selectedMarketplace?.nome === 'carrefour';
  const isCasasBahia = selectedMarketplace?.nome === 'casas_bahia';
  const isOlx = selectedMarketplace?.nome === 'olx';
  const isWhatsappCommerce = selectedMarketplace?.nome === 'whatsapp_commerce';

  const addContaMutation = useMutation({
    mutationFn: async (data: typeof newConta) => {
      if (!estabelecimentoId) throw new Error('Estabelecimento não encontrado');
      
      // Monta configuracoes baseado no marketplace (redirect_uri é fixo)
      let configuracoes: Record<string, any> | null = null;
      
      if (isMercadoLivre) {
        configuracoes = {
          ml_client_id: data.ml_client_id,
          ml_client_secret: data.ml_client_secret,
          ml_redirect_uri: MARKETPLACE_REDIRECT_URIS.mercado_livre,
        };
      } else if (isAmazon) {
        configuracoes = {
          amazon_client_id: data.amazon_client_id,
          amazon_client_secret: data.amazon_client_secret,
          amazon_refresh_token: data.amazon_refresh_token,
          amazon_redirect_uri: MARKETPLACE_REDIRECT_URIS.amazon,
        };
      } else if (isShopee) {
        configuracoes = {
          shopee_partner_id: data.shopee_partner_id,
          shopee_partner_key: data.shopee_partner_key,
          shopee_shop_id: data.shopee_shop_id,
          shopee_redirect_uri: MARKETPLACE_REDIRECT_URIS.shopee,
        };
      } else if (isMagalu) {
        configuracoes = {
          magalu_client_id: data.magalu_client_id,
          magalu_client_secret: data.magalu_client_secret,
          magalu_redirect_uri: MARKETPLACE_REDIRECT_URIS.magalu,
        };
      } else if (isGoogleMerchant) {
        configuracoes = {
          google_client_id: data.google_client_id,
          google_client_secret: data.google_client_secret,
          google_merchant_id: data.google_merchant_id,
          google_redirect_uri: MARKETPLACE_REDIRECT_URIS.google_merchant,
        };
      } else if (isAmericanas) {
        configuracoes = {
          americanas_client_id: data.americanas_client_id,
          americanas_client_secret: data.americanas_client_secret,
          americanas_redirect_uri: MARKETPLACE_REDIRECT_URIS.americanas,
        };
      } else if (isCarrefour) {
        configuracoes = {
          carrefour_client_id: data.carrefour_client_id,
          carrefour_client_secret: data.carrefour_client_secret,
          carrefour_redirect_uri: MARKETPLACE_REDIRECT_URIS.carrefour,
        };
      } else if (isCasasBahia) {
        configuracoes = {
          via_client_id: data.via_client_id,
          via_client_secret: data.via_client_secret,
          via_redirect_uri: MARKETPLACE_REDIRECT_URIS.casas_bahia,
        };
      } else if (isOlx) {
        configuracoes = {
          olx_client_id: data.olx_client_id,
          olx_client_secret: data.olx_client_secret,
          olx_redirect_uri: MARKETPLACE_REDIRECT_URIS.olx,
        };
      } else if (isWhatsappCommerce) {
        configuracoes = {
          whatsapp_app_id: data.whatsapp_app_id,
          whatsapp_app_secret: data.whatsapp_app_secret,
          whatsapp_redirect_uri: MARKETPLACE_REDIRECT_URIS.whatsapp_commerce,
        };
      }

      const { error } = await supabase.from('contas_marketplace').insert({
        estabelecimento_id: estabelecimentoId,
        marketplace_id: data.marketplace_id,
        nome_loja: data.nome_loja,
        seller_id: data.seller_id,
        ambiente: data.ambiente,
        status: 'nao_conectado',
        configuracoes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas_marketplace'] });
      setShowAddDialog(false);
      setNewConta({ 
        marketplace_id: '', 
        nome_loja: '', 
        seller_id: '', 
        ambiente: 'sandbox',
        ml_client_id: '',
        ml_client_secret: '',
        amazon_client_id: '',
        amazon_client_secret: '',
        amazon_refresh_token: '',
        shopee_partner_id: '',
        shopee_partner_key: '',
        shopee_shop_id: '',
        magalu_client_id: '',
        magalu_client_secret: '',
        google_client_id: '',
        google_client_secret: '',
        google_merchant_id: '',
        americanas_client_id: '',
        americanas_client_secret: '',
        carrefour_client_id: '',
        carrefour_client_secret: '',
        via_client_id: '',
        via_client_secret: '',
        olx_client_id: '',
        olx_client_secret: '',
        whatsapp_app_id: '',
        whatsapp_app_secret: '',
      });
      setShowMlSecret(false);
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
            <DialogContent className="max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Adicionar Nova Conta</DialogTitle>
                <DialogDescription>Vincule uma nova conta de marketplace</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Marketplace</Label>
                  <Select value={newConta.marketplace_id} onValueChange={(v) => setNewConta(p => ({ ...p, marketplace_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um marketplace" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
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
                    <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                      <SelectItem value="sandbox">Sandbox (Testes)</SelectItem>
                      <SelectItem value="producao">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Campos específicos do Mercado Livre */}
                {isMercadoLivre && (
                  <>
                    <Separator />
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Obtenha essas credenciais no{" "}
                        <a
                          href="https://developers.mercadolivre.com.br/devcenter"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          DevCenter do Mercado Livre
                        </a>
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                      <Label>Client ID (App ID) *</Label>
                      <Input 
                        value={newConta.ml_client_id} 
                        onChange={(e) => setNewConta(p => ({ ...p, ml_client_id: e.target.value }))}
                        placeholder="Ex: 1234567890123456"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client Secret *</Label>
                      <div className="relative">
                        <Input 
                          type={showMlSecret ? "text" : "password"}
                          value={newConta.ml_client_secret} 
                          onChange={(e) => setNewConta(p => ({ ...p, ml_client_secret: e.target.value }))}
                          placeholder="••••••••••••••••"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowMlSecret(!showMlSecret)}
                        >
                          {showMlSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Redirect URI (automático)</Label>
                      <Input 
                        value={MARKETPLACE_REDIRECT_URIS.mercado_livre}
                        readOnly
                        className="bg-muted text-foreground cursor-text select-all"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <p className="text-xs text-muted-foreground">
                        Cadastre esta URL no app do Mercado Livre
                      </p>
                    </div>
                  </>
                )}

                {/* Campos específicos da Amazon */}
                {isAmazon && (
                  <>
                    <Separator />
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Obtenha essas credenciais no{" "}
                        <a
                          href="https://sellercentral.amazon.com.br/apps/authorize/consent"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          Amazon Seller Central
                        </a>
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                      <Label>Client ID *</Label>
                      <Input 
                        value={newConta.amazon_client_id} 
                        onChange={(e) => setNewConta(p => ({ ...p, amazon_client_id: e.target.value }))}
                        placeholder="amzn1.application-oa2-client.xxx"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client Secret *</Label>
                      <Input 
                        type="password"
                        value={newConta.amazon_client_secret} 
                        onChange={(e) => setNewConta(p => ({ ...p, amazon_client_secret: e.target.value }))}
                        placeholder="••••••••••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Redirect URI (automático)</Label>
                      <Input 
                        value={MARKETPLACE_REDIRECT_URIS.amazon}
                        readOnly
                        className="bg-muted text-foreground cursor-text select-all"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <p className="text-xs text-muted-foreground">
                        Cadastre esta URL no app da Amazon
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Refresh Token (opcional)</Label>
                      <Input 
                        value={newConta.amazon_refresh_token} 
                        onChange={(e) => setNewConta(p => ({ ...p, amazon_refresh_token: e.target.value }))}
                        placeholder="Token de atualização (se já possuir)"
                      />
                    </div>
                  </>
                )}

                {/* Campos específicos da Shopee */}
                {isShopee && (
                  <>
                    <Separator />
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Obtenha essas credenciais no{" "}
                        <a
                          href="https://open.shopee.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          Shopee Open Platform
                        </a>
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                      <Label>Partner ID *</Label>
                      <Input 
                        value={newConta.shopee_partner_id} 
                        onChange={(e) => setNewConta(p => ({ ...p, shopee_partner_id: e.target.value }))}
                        placeholder="Ex: 123456"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Partner Key *</Label>
                      <Input 
                        type="password"
                        value={newConta.shopee_partner_key} 
                        onChange={(e) => setNewConta(p => ({ ...p, shopee_partner_key: e.target.value }))}
                        placeholder="••••••••••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Redirect URI (automático)</Label>
                      <Input 
                        value={MARKETPLACE_REDIRECT_URIS.shopee}
                        readOnly
                        className="bg-muted text-foreground cursor-text select-all"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <p className="text-xs text-muted-foreground">
                        Cadastre esta URL no app da Shopee
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Shop ID (opcional)</Label>
                      <Input 
                        value={newConta.shopee_shop_id} 
                        onChange={(e) => setNewConta(p => ({ ...p, shopee_shop_id: e.target.value }))}
                        placeholder="ID da sua loja na Shopee"
                      />
                    </div>
                  </>
                )}

                {/* Campos específicos do Magazine Luiza */}
                {isMagalu && (
                  <>
                    <Separator />
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Obtenha essas credenciais no{" "}
                        <a
                          href="https://api-marketplace.magazineluiza.com.br/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          Portal Magalu Marketplace
                        </a>
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                      <Label>Client ID *</Label>
                      <Input 
                        value={newConta.magalu_client_id} 
                        onChange={(e) => setNewConta(p => ({ ...p, magalu_client_id: e.target.value }))}
                        placeholder="ID do cliente"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client Secret *</Label>
                      <Input 
                        type="password"
                        value={newConta.magalu_client_secret} 
                        onChange={(e) => setNewConta(p => ({ ...p, magalu_client_secret: e.target.value }))}
                        placeholder="••••••••••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Redirect URI (automático)</Label>
                      <Input 
                        value={MARKETPLACE_REDIRECT_URIS.magalu}
                        readOnly
                        className="bg-muted text-foreground cursor-text select-all"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <p className="text-xs text-muted-foreground">
                        Cadastre esta URL no portal Magalu
                      </p>
                    </div>
                  </>
                )}

                {/* Campos específicos do Google Shopping */}
                {isGoogleMerchant && (
                  <>
                    <Separator />
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Obtenha essas credenciais no{" "}
                        <a
                          href="https://console.cloud.google.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          Google Cloud Console
                        </a>
                        . Ative a Content API for Shopping.
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                      <Label>Client ID *</Label>
                      <Input 
                        value={newConta.google_client_id} 
                        onChange={(e) => setNewConta(p => ({ ...p, google_client_id: e.target.value }))}
                        placeholder="xxx.apps.googleusercontent.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client Secret *</Label>
                      <Input 
                        type="password"
                        value={newConta.google_client_secret} 
                        onChange={(e) => setNewConta(p => ({ ...p, google_client_secret: e.target.value }))}
                        placeholder="••••••••••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Redirect URI (automático)</Label>
                      <Input 
                        value={MARKETPLACE_REDIRECT_URIS.google_merchant}
                        readOnly
                        className="bg-muted text-foreground cursor-text select-all"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <p className="text-xs text-muted-foreground">
                        Cadastre esta URL no Google Cloud Console
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Merchant Center ID (opcional)</Label>
                      <Input 
                        value={newConta.google_merchant_id} 
                        onChange={(e) => setNewConta(p => ({ ...p, google_merchant_id: e.target.value }))}
                        placeholder="ID da conta no Merchant Center"
                      />
                    </div>
                  </>
                )}

                {/* Campos específicos da Americanas */}
                {isAmericanas && (
                  <>
                    <Separator />
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Obtenha essas credenciais no{" "}
                        <a
                          href="https://developer.americanas.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          Portal de Desenvolvedores Americanas
                        </a>
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                      <Label>Client ID *</Label>
                      <Input 
                        value={newConta.americanas_client_id} 
                        onChange={(e) => setNewConta(p => ({ ...p, americanas_client_id: e.target.value }))}
                        placeholder="Seu Client ID"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client Secret *</Label>
                      <Input 
                        type="password"
                        value={newConta.americanas_client_secret} 
                        onChange={(e) => setNewConta(p => ({ ...p, americanas_client_secret: e.target.value }))}
                        placeholder="••••••••••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Redirect URI (automático)</Label>
                      <Input 
                        value={MARKETPLACE_REDIRECT_URIS.americanas}
                        readOnly
                        className="bg-muted text-foreground cursor-text select-all"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <p className="text-xs text-muted-foreground">
                        Cadastre esta URL no portal Americanas
                      </p>
                    </div>
                  </>
                )}

                {/* Campos específicos do Carrefour */}
                {isCarrefour && (
                  <>
                    <Separator />
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Obtenha essas credenciais no{" "}
                        <a
                          href="https://marketplace.carrefour.com.br"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          Portal Carrefour Marketplace
                        </a>
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                      <Label>Client ID *</Label>
                      <Input 
                        value={newConta.carrefour_client_id} 
                        onChange={(e) => setNewConta(p => ({ ...p, carrefour_client_id: e.target.value }))}
                        placeholder="Seu Client ID"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client Secret *</Label>
                      <Input 
                        type="password"
                        value={newConta.carrefour_client_secret} 
                        onChange={(e) => setNewConta(p => ({ ...p, carrefour_client_secret: e.target.value }))}
                        placeholder="••••••••••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Redirect URI (automático)</Label>
                      <Input 
                        value={MARKETPLACE_REDIRECT_URIS.carrefour}
                        readOnly
                        className="bg-muted text-foreground cursor-text select-all"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <p className="text-xs text-muted-foreground">
                        Cadastre esta URL no portal Carrefour
                      </p>
                    </div>
                  </>
                )}

                {/* Campos específicos do Casas Bahia (Via) */}
                {isCasasBahia && (
                  <>
                    <Separator />
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Obtenha essas credenciais no{" "}
                        <a
                          href="https://developer.via.com.br"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          Portal de Desenvolvedores Via
                        </a>
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                      <Label>Client ID *</Label>
                      <Input 
                        value={newConta.via_client_id} 
                        onChange={(e) => setNewConta(p => ({ ...p, via_client_id: e.target.value }))}
                        placeholder="Seu Client ID"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client Secret *</Label>
                      <Input 
                        type="password"
                        value={newConta.via_client_secret} 
                        onChange={(e) => setNewConta(p => ({ ...p, via_client_secret: e.target.value }))}
                        placeholder="••••••••••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Redirect URI (automático)</Label>
                      <Input 
                        value={MARKETPLACE_REDIRECT_URIS.casas_bahia}
                        readOnly
                        className="bg-muted text-foreground cursor-text select-all"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <p className="text-xs text-muted-foreground">
                        Cadastre esta URL no portal Via
                      </p>
                    </div>
                  </>
                )}

                {/* Campos específicos da OLX */}
                {isOlx && (
                  <>
                    <Separator />
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Obtenha essas credenciais no{" "}
                        <a
                          href="https://developers.olx.com.br"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          Portal de Desenvolvedores OLX
                        </a>
                        . Ideal para B2B, lotes e máquinas.
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                      <Label>Client ID *</Label>
                      <Input 
                        value={newConta.olx_client_id} 
                        onChange={(e) => setNewConta(p => ({ ...p, olx_client_id: e.target.value }))}
                        placeholder="Seu Client ID"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client Secret *</Label>
                      <Input 
                        type="password"
                        value={newConta.olx_client_secret} 
                        onChange={(e) => setNewConta(p => ({ ...p, olx_client_secret: e.target.value }))}
                        placeholder="••••••••••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Redirect URI (automático)</Label>
                      <Input 
                        value={MARKETPLACE_REDIRECT_URIS.olx}
                        readOnly
                        className="bg-muted text-foreground cursor-text select-all"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <p className="text-xs text-muted-foreground">
                        Cadastre esta URL no portal OLX
                      </p>
                    </div>
                  </>
                )}

                {/* Campos específicos do WhatsApp Commerce */}
                {isWhatsappCommerce && (
                  <>
                    <Separator />
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Obtenha essas credenciais no{" "}
                        <a
                          href="https://developers.facebook.com/apps"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          Meta for Developers
                        </a>
                        . Configure um app com WhatsApp Business e Catalog Management.
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                      <Label>App ID *</Label>
                      <Input 
                        value={newConta.whatsapp_app_id} 
                        onChange={(e) => setNewConta(p => ({ ...p, whatsapp_app_id: e.target.value }))}
                        placeholder="Seu App ID do Meta"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>App Secret *</Label>
                      <Input 
                        type="password"
                        value={newConta.whatsapp_app_secret} 
                        onChange={(e) => setNewConta(p => ({ ...p, whatsapp_app_secret: e.target.value }))}
                        placeholder="••••••••••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Redirect URI (automático)</Label>
                      <Input 
                        value={MARKETPLACE_REDIRECT_URIS.whatsapp_commerce}
                        readOnly
                        className="bg-muted text-foreground cursor-text select-all"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <p className="text-xs text-muted-foreground">
                        Cadastre esta URL no Meta for Developers
                      </p>
                    </div>
                  </>
                )}
              </div>
              </ScrollArea>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
                <Button 
                  onClick={() => addContaMutation.mutate(newConta)}
                  disabled={
                    !newConta.marketplace_id || 
                    !newConta.nome_loja || 
                    addContaMutation.isPending ||
                    (isMercadoLivre && (!newConta.ml_client_id || !newConta.ml_client_secret)) ||
                    (isAmazon && (!newConta.amazon_client_id || !newConta.amazon_client_secret)) ||
                    (isShopee && (!newConta.shopee_partner_id || !newConta.shopee_partner_key)) ||
                    (isMagalu && (!newConta.magalu_client_id || !newConta.magalu_client_secret)) ||
                    (isGoogleMerchant && (!newConta.google_client_id || !newConta.google_client_secret)) ||
                    (isAmericanas && (!newConta.americanas_client_id || !newConta.americanas_client_secret)) ||
                    (isCarrefour && (!newConta.carrefour_client_id || !newConta.carrefour_client_secret)) ||
                    (isCasasBahia && (!newConta.via_client_id || !newConta.via_client_secret)) ||
                    (isOlx && (!newConta.olx_client_id || !newConta.olx_client_secret)) ||
                    (isWhatsappCommerce && (!newConta.whatsapp_app_id || !newConta.whatsapp_app_secret))
                  }
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
          <>
            {/* Card especial WhatsApp Commerce - Catálogo de Produtos */}
            <Card className="overflow-hidden border-2 border-green-500/30 bg-gradient-to-br from-green-500/5 to-green-600/10">
              <CardHeader className="bg-gradient-to-r from-green-500/20 to-green-600/10 border-b border-green-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-green-500/20 border border-green-500/30">
                      <MessageCircle className="h-8 w-8 text-green-500" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-green-600 dark:text-green-400">
                        WhatsApp Commerce
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Catálogo de Produtos para WhatsApp Business
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
                    <ListChecks className="h-3 w-3 mr-1" />
                    Catálogo
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground">O que é?</h4>
                    <p className="text-sm text-muted-foreground">
                      Gerencie seu catálogo de produtos no WhatsApp Business. Envie produtos diretamente 
                      para seus clientes através do WhatsApp, facilitando a visualização e compra.
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Sincronize produtos do seu catálogo
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Envie listas de produtos via WhatsApp
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Gerencie múltiplas contas
                      </li>
                    </ul>
                  </div>
                  <div className="flex flex-col justify-center gap-3">
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-sm font-medium mb-2">Como começar:</p>
                      <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>Adicione uma conta WhatsApp Commerce abaixo</li>
                        <li>Configure suas credenciais do Meta</li>
                        <li>Acesse o Catálogo para enviar produtos</li>
                      </ol>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        className="flex-1 border-green-500/30 hover:bg-green-500/10"
                        onClick={() => {
                          const whatsappMarketplace = marketplaces?.find(m => m.nome === 'whatsapp_commerce');
                          if (whatsappMarketplace) {
                            setNewConta(p => ({ ...p, marketplace_id: whatsappMarketplace.id }));
                            setShowAddDialog(true);
                          }
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Conta
                      </Button>
                      <Link to="/whatsapp-catalogo" className="flex-1">
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Abrir Catálogo
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
                
                {/* Mostrar contas WhatsApp Commerce existentes */}
                {(() => {
                  const whatsappMarketplace = marketplaces?.find(m => m.nome === 'whatsapp_commerce');
                  const whatsappContas = whatsappMarketplace ? getContasByMarketplace(whatsappMarketplace.id) : [];
                  
                  if (whatsappContas.length > 0) {
                    return (
                      <div className="mt-4 pt-4 border-t border-green-500/20">
                        <p className="text-sm font-medium mb-3">Contas conectadas:</p>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {whatsappContas.map(conta => {
                            const status = statusConfig[conta.status] || statusConfig.nao_conectado;
                            const StatusIcon = status.icon;
                            const isActionLoading = loadingAction?.startsWith(conta.id);
                            
                            return (
                              <div key={conta.id} className="border rounded-lg p-3 bg-background/50 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2.5 h-2.5 rounded-full ${status.ledColor} ${status.ledShadow}`} />
                                    <span className="font-medium text-sm">{conta.nome_loja}</span>
                                  </div>
                                  <Badge variant="outline" className={`text-xs ${status.color}`}>
                                    {status.label}
                                  </Badge>
                                </div>
                                <div className="flex gap-1 flex-wrap">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="text-xs h-7"
                                    onClick={() => setWhatsappConfigConta(conta)}
                                  >
                                    <Key className="h-3 w-3 mr-1" />
                                    Config
                                  </Button>
                                  {conta.status !== 'conectado' && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="text-xs h-7"
                                      onClick={() => executeAction(conta.id, 'whatsapp_commerce', 'conectar')}
                                      disabled={isActionLoading}
                                    >
                                      {loadingAction === `${conta.id}-conectar` ? (
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      ) : (
                                        <Link2 className="h-3 w-3 mr-1" />
                                      )}
                                      Conectar
                                    </Button>
                                  )}
                                  {conta.status === 'conectado' && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="text-xs h-7"
                                      onClick={() => executeAction(conta.id, 'whatsapp_commerce', 'sync_produtos')}
                                      disabled={isActionLoading}
                                    >
                                      {loadingAction === `${conta.id}-sync_produtos` ? (
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      ) : (
                                        <RefreshCw className="h-3 w-3 mr-1" />
                                      )}
                                      Sincronizar
                                    </Button>
                                  )}
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    className="text-xs h-7"
                                    onClick={() => setSelectedConta(conta)}
                                  >
                                    <History className="h-3 w-3 mr-1" />
                                    Logs
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </CardContent>
            </Card>

            {/* Separador */}
            <div className="flex items-center gap-4 my-2">
              <Separator className="flex-1" />
              <span className="text-sm text-muted-foreground font-medium">Outros Marketplaces</span>
              <Separator className="flex-1" />
            </div>

            {/* Grid de marketplaces (excluindo WhatsApp Commerce) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {marketplaces?.filter(m => m.nome !== 'whatsapp_commerce').map(marketplace => {
              const Icon = getIcon(marketplace.icone);
              const contasMarketplace = getContasByMarketplace(marketplace.id);

              return (
                <Card key={marketplace.id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/20">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{marketplace.nome_display}</CardTitle>
                          <CardDescription className="text-xs">{marketplace.descricao}</CardDescription>
                        </div>
                      </div>
                      {(marketplace.nome === 'mercado_livre' || marketplace.nome === 'amazon' || marketplace.nome === 'shopee' || marketplace.nome === 'magalu' || marketplace.nome === 'google_merchant') && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            if (marketplace.nome === 'mercado_livre') setShowMlHelp(true);
                            else if (marketplace.nome === 'amazon') setShowAmazonHelp(true);
                            else if (marketplace.nome === 'shopee') setShowShopeeHelp(true);
                            else if (marketplace.nome === 'magalu') setShowMagaluHelp(true);
                            else if (marketplace.nome === 'google_merchant') setShowGoogleHelp(true);
                          }}
                        >
                          <HelpCircle className="h-4 w-4" />
                        </Button>
                      )}
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
                              <div className="flex items-center gap-3">
                                {/* LED Status Indicator */}
                                <div className="relative flex items-center justify-center">
                                  <div className={`w-3 h-3 rounded-full ${status.ledColor} ${status.ledShadow}`} />
                                  {conta.status === 'conectado' && (
                                    <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-75" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{conta.nome_loja}</p>
                                  {conta.seller_id && (
                                    <p className="text-xs text-muted-foreground">ID: {conta.seller_id}</p>
                                  )}
                                </div>
                              </div>
                              <Badge variant="outline" className={status.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {status.label}
                              </Badge>
                            </div>
                            
                            <div className="flex flex-wrap gap-1">
                              {/* Botão Config para cada marketplace */}
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
                              {marketplace.nome === 'amazon' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-xs h-7"
                                  onClick={() => setAmazonConfigConta(conta)}
                                >
                                  <Key className="h-3 w-3 mr-1" />
                                  Config
                                </Button>
                              )}
                              {marketplace.nome === 'shopee' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-xs h-7"
                                  onClick={() => setShopeeConfigConta(conta)}
                                >
                                  <Key className="h-3 w-3 mr-1" />
                                  Config
                                </Button>
                              )}
                              {marketplace.nome === 'magalu' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-xs h-7"
                                  onClick={() => setMagaluConfigConta(conta)}
                                >
                                  <Key className="h-3 w-3 mr-1" />
                                  Config
                                </Button>
                              )}
                              {marketplace.nome === 'google_merchant' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-xs h-7"
                                  onClick={() => setGoogleConfigConta(conta)}
                                >
                                  <Key className="h-3 w-3 mr-1" />
                                  Config
                                </Button>
                              )}
                              {marketplace.nome === 'americanas' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-xs h-7"
                                  onClick={() => setAmericanasConfigConta(conta)}
                                >
                                  <Key className="h-3 w-3 mr-1" />
                                  Config
                                </Button>
                              )}
                              {marketplace.nome === 'carrefour' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-xs h-7"
                                  onClick={() => setCarrefourConfigConta(conta)}
                                >
                                  <Key className="h-3 w-3 mr-1" />
                                  Config
                                </Button>
                              )}
                              {marketplace.nome === 'casas_bahia' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-xs h-7"
                                  onClick={() => setCasasBahiaConfigConta(conta)}
                                >
                                  <Key className="h-3 w-3 mr-1" />
                                  Config
                                </Button>
                              )}
                              {marketplace.nome === 'olx' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-xs h-7"
                                  onClick={() => setOlxConfigConta(conta)}
                                >
                                  <Key className="h-3 w-3 mr-1" />
                                  Config
                                </Button>
                              )}
                              {marketplace.nome === 'whatsapp_commerce' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-xs h-7"
                                  onClick={() => setWhatsappConfigConta(conta)}
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
          </>
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
                      <p className="text-muted-foreground text-xs mb-1">Ambiente</p>
                      <Select
                        value={selectedConta.ambiente || 'sandbox'}
                        onValueChange={async (value) => {
                          try {
                            const { error } = await supabase
                              .from('contas_marketplace')
                              .update({ ambiente: value })
                              .eq('id', selectedConta.id);
                            if (error) throw error;
                            setSelectedConta({ ...selectedConta, ambiente: value });
                            queryClient.invalidateQueries({ queryKey: ['contas_marketplace'] });
                            toast.success('Ambiente atualizado');
                          } catch (err: any) {
                            toast.error('Erro ao atualizar: ' + err.message);
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 w-[130px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sandbox">Sandbox</SelectItem>
                          <SelectItem value="producao">Produção</SelectItem>
                        </SelectContent>
                      </Select>
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

        {/* Dialog de Configuração da Amazon */}
        <AmazonConfigDialog
          open={!!amazonConfigConta}
          onOpenChange={(open) => !open && setAmazonConfigConta(null)}
          contaId={amazonConfigConta?.id || ''}
          contaNome={amazonConfigConta?.nome_loja || ''}
          currentConfig={amazonConfigConta?.configuracoes ? {
            client_id: (amazonConfigConta.configuracoes as any)?.amz_client_id,
            client_secret: (amazonConfigConta.configuracoes as any)?.amz_client_secret,
            redirect_uri: (amazonConfigConta.configuracoes as any)?.amz_redirect_uri,
          } : undefined}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['contas_marketplace'] });
          }}
        />

        {/* Dialog de Configuração da Shopee */}
        <ShopeeConfigDialog
          open={!!shopeeConfigConta}
          onOpenChange={(open) => !open && setShopeeConfigConta(null)}
          contaId={shopeeConfigConta?.id || ''}
          contaNome={shopeeConfigConta?.nome_loja || ''}
          currentConfig={shopeeConfigConta?.configuracoes ? {
            partner_id: (shopeeConfigConta.configuracoes as any)?.shopee_partner_id,
            partner_key: (shopeeConfigConta.configuracoes as any)?.shopee_partner_key,
          } : undefined}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['contas_marketplace'] });
          }}
        />

        {/* Dialog de Configuração do Magazine Luiza */}
        <MagaluConfigDialog
          open={!!magaluConfigConta}
          onOpenChange={(open) => !open && setMagaluConfigConta(null)}
          contaId={magaluConfigConta?.id || ''}
          contaNome={magaluConfigConta?.nome_loja || ''}
          currentConfig={magaluConfigConta?.configuracoes ? {
            client_id: (magaluConfigConta.configuracoes as any)?.magalu_client_id,
            client_secret: (magaluConfigConta.configuracoes as any)?.magalu_client_secret,
            redirect_uri: (magaluConfigConta.configuracoes as any)?.magalu_redirect_uri,
          } : undefined}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['contas_marketplace'] });
          }}
        />

        {/* Dialog de Configuração do Google Shopping */}
        <GoogleShoppingConfigDialog
          open={!!googleConfigConta}
          onOpenChange={(open) => !open && setGoogleConfigConta(null)}
          contaId={googleConfigConta?.id || ''}
          contaNome={googleConfigConta?.nome_loja || ''}
          currentConfig={googleConfigConta?.configuracoes ? {
            client_id: (googleConfigConta.configuracoes as any)?.google_client_id,
            client_secret: (googleConfigConta.configuracoes as any)?.google_client_secret,
            redirect_uri: (googleConfigConta.configuracoes as any)?.google_redirect_uri,
            merchant_id: (googleConfigConta.configuracoes as any)?.google_merchant_id,
          } : undefined}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['contas_marketplace'] });
          }}
        />

        {/* Dialog de Configuração Americanas */}
        <AmericanasConfigDialog
          open={!!americanasConfigConta}
          onOpenChange={(open) => !open && setAmericanasConfigConta(null)}
          contaId={americanasConfigConta?.id || ''}
          contaNome={americanasConfigConta?.nome_loja || ''}
          redirectUri={MARKETPLACE_REDIRECT_URIS.americanas}
          currentConfig={americanasConfigConta?.configuracoes as any}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['contas_marketplace'] });
          }}
        />

        {/* Dialog de Configuração Carrefour */}
        <CarrefourConfigDialog
          open={!!carrefourConfigConta}
          onOpenChange={(open) => !open && setCarrefourConfigConta(null)}
          contaId={carrefourConfigConta?.id || ''}
          contaNome={carrefourConfigConta?.nome_loja || ''}
          redirectUri={MARKETPLACE_REDIRECT_URIS.carrefour}
          currentConfig={carrefourConfigConta?.configuracoes as any}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['contas_marketplace'] });
          }}
        />

        {/* Dialog de Configuração Casas Bahia */}
        <CasasBahiaConfigDialog
          open={!!casasBahiaConfigConta}
          onOpenChange={(open) => !open && setCasasBahiaConfigConta(null)}
          contaId={casasBahiaConfigConta?.id || ''}
          contaNome={casasBahiaConfigConta?.nome_loja || ''}
          redirectUri={MARKETPLACE_REDIRECT_URIS.casas_bahia}
          currentConfig={casasBahiaConfigConta?.configuracoes as any}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['contas_marketplace'] });
          }}
        />

        {/* Dialog de Configuração OLX */}
        <OlxConfigDialog
          open={!!olxConfigConta}
          onOpenChange={(open) => !open && setOlxConfigConta(null)}
          contaId={olxConfigConta?.id || ''}
          contaNome={olxConfigConta?.nome_loja || ''}
          redirectUri={MARKETPLACE_REDIRECT_URIS.olx}
          currentConfig={olxConfigConta?.configuracoes as any}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['contas_marketplace'] });
          }}
        />

        {/* Dialog de Configuração WhatsApp Commerce */}
        <WhatsAppCommerceConfigDialog
          open={!!whatsappConfigConta}
          onOpenChange={(open) => !open && setWhatsappConfigConta(null)}
          contaId={whatsappConfigConta?.id || ''}
          contaNome={whatsappConfigConta?.nome_loja || ''}
          redirectUri={MARKETPLACE_REDIRECT_URIS.whatsapp_commerce}
          currentConfig={whatsappConfigConta?.configuracoes as any}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['contas_marketplace'] });
          }}
        />

        {/* Dialog de Ajuda do Mercado Livre */}
        <Dialog open={showMlHelp} onOpenChange={setShowMlHelp}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                Como configurar o Mercado Livre
              </DialogTitle>
              <DialogDescription>
                Siga o passo a passo para integrar sua conta
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</div>
                  <div>
                    <p className="font-medium text-sm">Acesse o DevCenter do Mercado Livre</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Vá para{" "}
                      <a href="https://developers.mercadolivre.com.br/devcenter" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        developers.mercadolivre.com.br/devcenter
                      </a>
                      {" "}e faça login com sua conta.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</div>
                  <div>
                    <p className="font-medium text-sm">Crie uma nova aplicação</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clique em &quot;Criar nova aplicação&quot; e preencha os dados solicitados (nome, descrição, etc).
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</div>
                  <div>
                    <p className="font-medium text-sm">Configure a Redirect URI</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Na configuração da aplicação, adicione a seguinte URL como Redirect URI:
                    </p>
                    <code className="text-xs bg-muted px-2 py-1 rounded block mt-2 break-all select-all">
                      https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/mercadolivre-auth-callback
                    </code>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">4</div>
                  <div>
                    <p className="font-medium text-sm">Copie as credenciais</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Após criar a aplicação, copie o <strong>Client ID</strong> e <strong>Client Secret</strong> gerados.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">5</div>
                  <div>
                    <p className="font-medium text-sm">Adicione uma conta aqui</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clique em &quot;Adicionar Conta&quot;, preencha os campos com as credenciais copiadas e salve.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">6</div>
                  <div>
                    <p className="font-medium text-sm">Conecte a conta</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Após adicionar, clique no botão &quot;Conectar&quot;. Uma janela abrirá para você autorizar o acesso. Após autorizar, a conta ficará conectada.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Pronto!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Agora você pode sincronizar produtos, pedidos e estoque usando os botões disponíveis.
                    </p>
                  </div>
                </div>

                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Dica:</strong> Use o ambiente &quot;Sandbox&quot; para testes antes de conectar em produção.
                  </AlertDescription>
                </Alert>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Dialog de Ajuda da Amazon Brasil */}
        <Dialog open={showAmazonHelp} onOpenChange={setShowAmazonHelp}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                Como configurar a Amazon Brasil
              </DialogTitle>
              <DialogDescription>
                Siga o passo a passo para integrar sua conta
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</div>
                  <div>
                    <p className="font-medium text-sm">Acesse o Seller Central da Amazon</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Vá para{" "}
                      <a href="https://sellercentral.amazon.com.br" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        sellercentral.amazon.com.br
                      </a>
                      {" "}e faça login com sua conta de vendedor.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</div>
                  <div>
                    <p className="font-medium text-sm">Acesse o Developer Central</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Vá para{" "}
                      <a href="https://developer.amazonservices.com.br" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        developer.amazonservices.com.br
                      </a>
                      {" "}e crie uma nova aplicação SP-API.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</div>
                  <div>
                    <p className="font-medium text-sm">Configure a aplicação</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Preencha os dados e adicione a seguinte OAuth Redirect URI:
                    </p>
                    <code className="text-xs bg-muted px-2 py-1 rounded block mt-2 break-all select-all">
                      https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/amazon-auth-callback
                    </code>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">4</div>
                  <div>
                    <p className="font-medium text-sm">Copie as credenciais</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Copie o <strong>Client ID</strong> e <strong>Client Secret</strong> (LWA credentials) gerados na aplicação.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">5</div>
                  <div>
                    <p className="font-medium text-sm">Adicione e conecte a conta</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clique em &quot;Adicionar Conta&quot;, preencha os campos e depois clique em &quot;Conectar&quot; para autorizar.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Pronto!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Agora você pode sincronizar produtos, pedidos e estoque da Amazon.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Dialog de Ajuda da Shopee */}
        <Dialog open={showShopeeHelp} onOpenChange={setShowShopeeHelp}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                Como configurar a Shopee
              </DialogTitle>
              <DialogDescription>
                Siga o passo a passo para integrar sua conta
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</div>
                  <div>
                    <p className="font-medium text-sm">Acesse o Shopee Open Platform</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Vá para{" "}
                      <a href="https://open.shopee.com.br" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        open.shopee.com.br
                      </a>
                      {" "}e faça login como desenvolvedor.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</div>
                  <div>
                    <p className="font-medium text-sm">Crie um novo App</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      No painel de desenvolvedor, crie um novo App e preencha as informações necessárias.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</div>
                  <div>
                    <p className="font-medium text-sm">Configure o Redirect URI</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Adicione a seguinte URL de callback:
                    </p>
                    <code className="text-xs bg-muted px-2 py-1 rounded block mt-2 break-all select-all">
                      https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/shopee-auth-callback
                    </code>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">4</div>
                  <div>
                    <p className="font-medium text-sm">Copie Partner ID e Partner Key</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Após aprovação do App, copie o <strong>Partner ID</strong> e <strong>Partner Key</strong> gerados.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">5</div>
                  <div>
                    <p className="font-medium text-sm">Adicione e conecte a conta</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clique em &quot;Adicionar Conta&quot;, preencha os campos e depois clique em &quot;Conectar&quot; para autorizar a loja.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Pronto!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Agora você pode sincronizar produtos, pedidos e estoque da Shopee.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Dialog de Ajuda do Magazine Luiza */}
        <Dialog open={showMagaluHelp} onOpenChange={setShowMagaluHelp}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                Como configurar o Magazine Luiza
              </DialogTitle>
              <DialogDescription>
                Siga o passo a passo para integrar sua conta
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</div>
                  <div>
                    <p className="font-medium text-sm">Acesse o Portal de Parceiros Magalu</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Vá para{" "}
                      <a href="https://dev.magalu.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        dev.magalu.com
                      </a>
                      {" "}e faça login com sua conta de seller.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</div>
                  <div>
                    <p className="font-medium text-sm">Crie uma nova aplicação</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      No portal de desenvolvedores, crie uma nova aplicação para integração.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</div>
                  <div>
                    <p className="font-medium text-sm">Configure o Redirect URI</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Adicione a seguinte URL de callback:
                    </p>
                    <code className="text-xs bg-muted px-2 py-1 rounded block mt-2 break-all select-all">
                      https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/magalu-auth-callback
                    </code>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">4</div>
                  <div>
                    <p className="font-medium text-sm">Copie as credenciais</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Copie o <strong>Client ID</strong> e <strong>Client Secret</strong> gerados na aplicação.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">5</div>
                  <div>
                    <p className="font-medium text-sm">Adicione e conecte a conta</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clique em &quot;Adicionar Conta&quot;, preencha os campos e depois clique em &quot;Conectar&quot; para autorizar.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Pronto!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Agora você pode sincronizar produtos, pedidos e estoque do Magazine Luiza.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Dialog de Ajuda do Google Shopping */}
        <Dialog open={showGoogleHelp} onOpenChange={setShowGoogleHelp}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                Como configurar o Google Shopping
              </DialogTitle>
              <DialogDescription>
                Siga o passo a passo para integrar sua conta
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</div>
                  <div>
                    <p className="font-medium text-sm">Acesse o Google Cloud Console</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Vá para{" "}
                      <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        console.cloud.google.com
                      </a>
                      {" "}e crie ou selecione um projeto.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</div>
                  <div>
                    <p className="font-medium text-sm">Ative a Content API for Shopping</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      No menu APIs & Services, ative a &quot;Content API for Shopping&quot;.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</div>
                  <div>
                    <p className="font-medium text-sm">Crie credenciais OAuth 2.0</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Em Credentials, crie um &quot;OAuth 2.0 Client ID&quot; do tipo Web Application e adicione a URI:
                    </p>
                    <code className="text-xs bg-muted px-2 py-1 rounded block mt-2 break-all select-all">
                      https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/google-shopping-auth-callback
                    </code>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">4</div>
                  <div>
                    <p className="font-medium text-sm">Copie as credenciais</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Copie o <strong>Client ID</strong> e <strong>Client Secret</strong> gerados.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">5</div>
                  <div>
                    <p className="font-medium text-sm">Vincule ao Merchant Center</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Certifique-se de que sua conta do{" "}
                      <a href="https://merchants.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        Google Merchant Center
                      </a>
                      {" "}está configurada.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">6</div>
                  <div>
                    <p className="font-medium text-sm">Adicione e conecte a conta</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clique em &quot;Adicionar Conta&quot;, preencha os campos e depois clique em &quot;Conectar&quot; para autorizar.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Pronto!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Agora você pode sincronizar produtos com o Google Shopping.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
