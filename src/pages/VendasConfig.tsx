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
      <div className="border-b bg-card px-6 py-4">
        <h1 className="text-2xl font-bold">Configurações de Vendas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie produtos, preços, pagamentos e configurações de frete
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs value={currentTab} onValueChange={handleTabChange} className="h-full flex flex-col">
          <div className="border-b bg-muted/30 px-4">
            <ScrollArea className="w-full">
              <TabsList className="h-12 bg-transparent gap-1 p-1">
                {tabItems.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2 px-4"
                  >
                    <tab.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>
          </div>

          <div className="flex-1 overflow-auto p-6">
            <TabsContent value="produtos" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Cadastro de Produtos
                  </CardTitle>
                  <CardDescription>
                    Gerencie seu catálogo de produtos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {estabelecimentoId && <ProdutosCRUD estabelecimentoId={estabelecimentoId} />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categorias" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Categorias de Produtos
                  </CardTitle>
                  <CardDescription>
                    Organize seus produtos em categorias
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {estabelecimentoId && <ProdutoCategoriasCRUD estabelecimentoId={estabelecimentoId} />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="grupos" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5" />
                    Grupos de Produtos
                  </CardTitle>
                  <CardDescription>
                    Agrupe produtos relacionados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {estabelecimentoId && <ProdutoGruposCRUD estabelecimentoId={estabelecimentoId} />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="campos" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Campos Customizados
                  </CardTitle>
                  <CardDescription>
                    Configure campos adicionais para produtos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {estabelecimentoId && <ProdutoCamposCustomizadosCRUD estabelecimentoId={estabelecimentoId} />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="unidades" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Box className="h-5 w-5" />
                    Unidades de Medida
                  </CardTitle>
                  <CardDescription>
                    Defina as unidades de medida utilizadas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {estabelecimentoId && <UnidadesCRUD estabelecimentoId={estabelecimentoId} />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ncm" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <FileCode className="h-5 w-5" />
                    Códigos NCM
                  </CardTitle>
                  <CardDescription>
                    Gerencie os códigos NCM para classificação fiscal
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <NcmCRUD />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tabelas-preco" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Tabelas de Preço
                  </CardTitle>
                  <CardDescription>
                    Configure diferentes tabelas de preço
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {estabelecimentoId && <TabelasPrecoCRUD estabelecimentoId={estabelecimentoId} />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tipos-pagamento" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Tipos de Pagamento
                  </CardTitle>
                  <CardDescription>
                    Configure os tipos de pagamento aceitos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {estabelecimentoId && <TiposPagamentoCRUD estabelecimentoId={estabelecimentoId} />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="condicoes" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Condições de Pagamento
                  </CardTitle>
                  <CardDescription>
                    Configure as condições de pagamento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {estabelecimentoId && <CondicoesPagamentoCRUD estabelecimentoId={estabelecimentoId} />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="custos-veiculo" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Custos de Veículos
                  </CardTitle>
                  <CardDescription>
                    Configure os custos operacionais por tipo de veículo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {estabelecimentoId && <CustosVeiculosCRUD estabelecimentoId={estabelecimentoId} />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pedagio" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    API de Cálculo de Pedágio
                  </CardTitle>
                  <CardDescription>
                    Configure a integração com API de pedágio
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {estabelecimentoId && <PedagioAPIConfigCRUD estabelecimentoId={estabelecimentoId} />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="automacao" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Regras de Automação de Vendas
                  </CardTitle>
                  <CardDescription>
                    Configure regras automáticas para orçamentos
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
