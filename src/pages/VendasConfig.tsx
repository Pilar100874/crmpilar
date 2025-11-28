import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Box
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const tabItems = [
  { id: 'produtos', label: 'Produtos', icon: Package },
  { id: 'categorias', label: 'Categorias', icon: Layers },
  { id: 'grupos', label: 'Grupos', icon: FolderOpen },
  { id: 'campos', label: 'Campos Customizados', icon: Settings },
  { id: 'unidades', label: 'Unidades', icon: Box },
  { id: 'ncm', label: 'NCM', icon: FileCode },
  { id: 'tabelas-preco', label: 'Tabelas de Preço', icon: DollarSign },
  { id: 'tipos-pagamento', label: 'Tipos de Pagamento', icon: CreditCard },
  { id: 'condicoes', label: 'Condições de Pagamento', icon: Wallet },
  { id: 'custos-veiculo', label: 'Custos de Veículos', icon: Truck },
  { id: 'pedagio', label: 'API de Pedágio', icon: Calculator },
  { id: 'automacao', label: 'Regras de Automação', icon: Zap },
];

export default function VendasConfig() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'produtos';

  // Get user's estabelecimento_id
  const { data: estabelecimentoId } = useQuery({
    queryKey: ['user-estabelecimento-vendas'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('estabelecimento_id')
        .eq('email', user.email)
        .single();
      
      return usuario?.estabelecimento_id || null;
    }
  });

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-card px-3 sm:px-6 py-3 sm:py-4">
        <h1 className="text-lg sm:text-2xl font-bold">Configurações de Vendas</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Gerencie produtos, preços, pagamentos e configurações de frete
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs value={currentTab} onValueChange={handleTabChange} className="h-full flex flex-col">
          <div className="border-b bg-muted/30 px-2 sm:px-4">
            <ScrollArea className="w-full">
              <TabsList className="h-10 sm:h-12 bg-transparent gap-0.5 sm:gap-1 p-0.5 sm:p-1 inline-flex w-max min-w-full">
                {tabItems.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1 sm:gap-2 px-2 sm:px-4 text-xs sm:text-sm min-w-fit"
                  >
                    <tab.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden md:inline whitespace-nowrap">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>
          </div>

          <div className="flex-1 overflow-auto p-3 sm:p-6">
            <TabsContent value="produtos" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                    Cadastro de Produtos
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Gerencie seu catálogo de produtos
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  {estabelecimentoId && <ProdutosCRUD estabelecimentoId={estabelecimentoId} />}
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
                    Tabelas de Preço
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Configure diferentes tabelas de preço
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
          </div>
        </Tabs>
      </div>
    </div>
  );
}
