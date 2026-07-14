import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Package, 
  FolderOpen, 
  Layers, 
  DollarSign, 
  CreditCard, 
  Wallet,
  FileCode,
  Truck,
  Calculator,
  Zap,
  Settings,
  Box,
  LucideIcon,
  PanelLeftClose,
  PanelLeft,
  Globe,
  MessageCircle,
  FileUp,
  FileText,
  Bot,
  ImagePlus,
  Tag
} from 'lucide-react';
import { EtiquetasZebra } from '@/components/config/EtiquetasZebra';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ProdutosCRUD } from '@/components/config/ProdutosCRUD';
import { ProdutoCategoriasCRUD } from '@/components/config/ProdutoCategoriasCRUD';
import { ProdutoGruposCRUD } from '@/components/config/ProdutoGruposCRUD';
import { ProdutoCamposCustomizadosCRUD } from '@/components/config/ProdutoCamposCustomizadosCRUD';
import { TabelasPrecoCRUD } from '@/components/config/TabelasPrecoCRUD';
import { UnidadesCRUD } from '@/components/config/UnidadesCRUD';
import { NcmCRUD } from '@/components/config/NcmCRUD';
import { CondicoesPagamentoCRUD } from '@/components/config/CondicoesPagamentoCRUD';
import { TiposPagamentoCRUD } from '@/components/config/TiposPagamentoCRUD';
import { AutomacaoVendasCRUD } from '@/components/config/AutomacaoVendasCRUD';
import { CustosVeiculosCRUD } from '@/components/config/CustosVeiculosCRUD';
import PedagioAPIConfigCRUD from '@/components/config/PedagioAPIConfigCRUD';
import { ImportacaoApiTab } from '@/components/config/ImportacaoApiTab';
import FreteTerceirosConfig from '@/components/config/FreteTerceirosConfig';
import { ImportacaoTerceirosTab } from '@/components/config/ImportacaoTerceirosTab';
import { AjusteImagemLote } from '@/components/config/AjusteImagemLote';
import { OrcamentoReportConfigContent } from '@/components/config/OrcamentoReportConfigContent';
import LicitacoesBot from '@/components/vendas/LicitacoesBot';
import { useQuery } from '@tanstack/react-query';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';

interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const tabItems: TabItem[] = [
  { id: 'produtos', label: 'Produtos', icon: Package },
  { id: 'categorias', label: 'Categorias', icon: Layers },
  { id: 'grupos', label: 'Grupos', icon: FolderOpen },
  { id: 'campos', label: 'Campos Customizados', icon: Settings },
  { id: 'unidades', label: 'Unidades', icon: Box },
  { id: 'ncm', label: 'NCM', icon: FileCode },
  { id: 'tabelas-preco', label: 'Preço por Categoria', icon: DollarSign },
  { id: 'tipos-pagamento', label: 'Tipos de Pagamento', icon: CreditCard },
  { id: 'condicoes', label: 'Condições de Pagamento', icon: Wallet },
  { id: 'custos-veiculo', label: 'Custos de Veículos', icon: Truck },
  { id: 'pedagio', label: 'API de Pedágio', icon: Calculator },
  { id: 'frete-terceiros', label: 'Frete de Terceiros', icon: Truck },
  { id: 'automacao', label: 'Regras de Automação', icon: Zap },
  { id: 'relatorio-orcamento', label: 'Configuração do Relatório', icon: FileText },
  { id: 'importacao-terceiros', label: 'Importação de Terceiros', icon: FileUp },
  { id: 'whatsapp-catalogo', label: 'Lista de Produtos no WhatsApp', icon: MessageCircle },
  { id: 'licitacoes-bot', label: 'Bot Caça Licitações', icon: Bot },
  { id: 'etiquetas-zebra', label: 'Impressão de Etiquetas Zebra', icon: Tag },
];

export default function VendasConfig() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const currentTab = searchParams.get('tab') || 'produtos';

  // Get user's estabelecimento_id
  const { data: estabelecimentoId } = useQuery({
    queryKey: ['user-estabelecimento-vendas'],
    queryFn: async () => {
      return await getEstabelecimentoId();
    }
  });

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const currentTabItem = tabItems.find(t => t.id === currentTab) || tabItems[0];
  const CurrentIcon = currentTabItem.icon;

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-card px-3 sm:px-6 py-3 sm:py-4">
        <h1 className="text-lg sm:text-2xl font-bold">Configurações de Vendas</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Gerencie produtos, preços, pagamentos e configurações de frete
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs value={currentTab} onValueChange={handleTabChange} className="h-full flex flex-col lg:flex-row">
          {/* Mobile: Select dropdown */}
          <div className="lg:hidden border-b bg-muted/30 p-3">
            <Select value={currentTab} onValueChange={handleTabChange}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <CurrentIcon className="h-4 w-4" />
                    <span>{currentTabItem.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {tabItems.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <SelectItem key={tab.id} value={tab.id}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: Sidebar menu */}
          <div className={`hub-menu hidden lg:flex lg:flex-col lg:p-3 lg:gap-1 lg:overflow-y-auto lg:shrink-0 transition-all duration-300 ${isMenuCollapsed ? 'lg:w-16' : 'lg:w-64'}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuCollapsed(!isMenuCollapsed)}
              className="mb-2 self-end"
            >
              {isMenuCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
            <TooltipProvider delayDuration={0}>
              {tabItems.map((tab) => {
                const Icon = tab.icon;
                const isActive = currentTab === tab.id;
                
                const menuButton = (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`hub-menu-item flex items-center gap-3 px-3 py-2.5 text-left w-full text-muted-foreground ${
                      isActive ? 'is-active' : ''
                    } ${isMenuCollapsed ? 'justify-center' : ''}`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? '' : 'opacity-70'}`} />
                    {!isMenuCollapsed && <span className="truncate">{tab.label}</span>}
                  </button>
                );

                if (isMenuCollapsed) {
                  return (
                    <Tooltip key={tab.id}>
                      <TooltipTrigger asChild>
                        {menuButton}
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {tab.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return menuButton;
              })}
            </TooltipProvider>
          </div>

          <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-6">
            <TabsContent value="produtos" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                    Produtos
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Gerencie seu catálogo de produtos e importações
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 min-w-0">
                  <Tabs defaultValue="cadastro" className="w-full">
                    <TabsList className="mb-4 grid w-full grid-cols-3 h-auto gap-1 p-1">
                      <TabsTrigger value="cadastro" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-1 sm:px-3 py-1.5 text-[10px] sm:text-sm">
                        <Package className="h-4 w-4 shrink-0" />
                        <span className="leading-tight text-center">Cadastro</span>
                      </TabsTrigger>
                      <TabsTrigger value="importacao" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-1 sm:px-3 py-1.5 text-[10px] sm:text-sm">
                        <Globe className="h-4 w-4 shrink-0" />
                        <span className="leading-tight text-center">Importação</span>
                      </TabsTrigger>
                      <TabsTrigger value="ajuste-imagens" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-1 sm:px-3 py-1.5 text-[10px] sm:text-sm">
                        <ImagePlus className="h-4 w-4 shrink-0" />
                        <span className="leading-tight text-center">Ajuste de Imagem<span className="hidden md:inline"> em Lote</span></span>
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="cadastro" className="min-w-0">
                      {estabelecimentoId && <ProdutosCRUD estabelecimentoId={estabelecimentoId} />}
                    </TabsContent>
                    <TabsContent value="importacao" className="min-w-0">
                      {estabelecimentoId && <ImportacaoApiTab estabelecimentoId={estabelecimentoId} />}
                    </TabsContent>
                    <TabsContent value="ajuste-imagens" className="min-w-0">
                      {estabelecimentoId && <AjusteImagemLote estabelecimentoId={estabelecimentoId} />}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>


            <TabsContent value="categorias" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Layers className="h-4 w-4 sm:h-5 sm:w-5" />
                    Categorias de Produtos
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Organize seus produtos em categorias
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  {estabelecimentoId && <ProdutoCategoriasCRUD estabelecimentoId={estabelecimentoId} />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="grupos" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                    Grupos de Produtos
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Agrupe produtos relacionados
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  {estabelecimentoId && <ProdutoGruposCRUD estabelecimentoId={estabelecimentoId} />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="campos" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                    Campos Customizados
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Configure campos adicionais para produtos
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  {estabelecimentoId && <ProdutoCamposCustomizadosCRUD estabelecimentoId={estabelecimentoId} />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="unidades" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Box className="h-4 w-4 sm:h-5 sm:w-5" />
                    Unidades de Medida
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Defina as unidades de medida utilizadas
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  {estabelecimentoId && <UnidadesCRUD estabelecimentoId={estabelecimentoId} />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ncm" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <FileCode className="h-4 w-4 sm:h-5 sm:w-5" />
                    Códigos NCM
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Gerencie os códigos NCM para classificação fiscal
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <NcmCRUD />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tabelas-preco" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                    Tabela de Preço por Categoria
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Configure preços por categoria de produto
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  {estabelecimentoId && <TabelasPrecoCRUD estabelecimentoId={estabelecimentoId} />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tipos-pagamento" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                    Tipos de Pagamento
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Configure os tipos de pagamento aceitos
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  {estabelecimentoId && <TiposPagamentoCRUD estabelecimentoId={estabelecimentoId} />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="condicoes" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
                    Condições de Pagamento
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Configure as condições de pagamento
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  {estabelecimentoId && <CondicoesPagamentoCRUD estabelecimentoId={estabelecimentoId} />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="custos-veiculo" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Truck className="h-4 w-4 sm:h-5 sm:w-5" />
                    Custos de Veículos
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Configure os custos operacionais por tipo de veículo
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  {estabelecimentoId && <CustosVeiculosCRUD estabelecimentoId={estabelecimentoId} />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pedagio" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Calculator className="h-4 w-4 sm:h-5 sm:w-5" />
                    API de Cálculo de Pedágio
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Configure a integração com API de pedágio
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  {estabelecimentoId && <PedagioAPIConfigCRUD estabelecimentoId={estabelecimentoId} />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="frete-terceiros" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Truck className="h-4 w-4 sm:h-5 sm:w-5" />
                    Frete de Terceiros
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Configure APIs de transportadoras e gateways de frete externo
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  {estabelecimentoId && <FreteTerceirosConfig estabelecimentoId={estabelecimentoId} />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="automacao" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
                    Regras de Automação de Vendas
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Configure regras automáticas para orçamentos
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  {estabelecimentoId && <AutomacaoVendasCRUD estabelecimentoId={estabelecimentoId} />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="relatorio-orcamento" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                    Configuração do Relatório de Orçamento
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Personalize o modelo do seu orçamento em PDF
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  {estabelecimentoId && <OrcamentoReportConfigContent key={estabelecimentoId} estabelecimentoId={estabelecimentoId} />}
                </CardContent>
              </Card>
            </TabsContent>




            <TabsContent value="importacao-terceiros" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <FileUp className="h-4 w-4 sm:h-5 sm:w-5" />
                    Importação de Produtos de Terceiros
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Importe produtos de arquivos Excel e crie APIs para uso em relatórios
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  {estabelecimentoId && <ImportacaoTerceirosTab estabelecimentoId={estabelecimentoId} />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="whatsapp-catalogo" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                    Lista de Produtos no WhatsApp
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Gerencie produtos para a lista de produtos do WhatsApp Business
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <div className="text-center py-8">
                    <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Acesse a página completa para gerenciar seus produtos no WhatsApp
                    </p>
                    <Link 
                      to="/whatsapp-catalogo" 
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                    >
                      Abrir Lista de Produtos
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="licitacoes-bot" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
                    Bot Caça Licitações
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Monitore automaticamente licitações públicas com base nas suas palavras-chave
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  {estabelecimentoId && <LicitacoesBot estabelecimentoId={estabelecimentoId} />}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
