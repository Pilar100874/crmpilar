import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Bot, 
  Database, 
  FileSpreadsheet, 
  BarChart3, 
  Settings, 
  Link2, 
  Search,
  LucideIcon,
  PanelLeftClose,
  PanelLeft
} from "lucide-react";
import { FontesPesquisaCRUD } from "@/components/robo-precos/FontesPesquisaCRUD";
import { MapeamentoProdutoFonte } from "@/components/robo-precos/MapeamentoProdutoFonte";
import { ImportarArquivoPrecos } from "@/components/robo-precos/ImportarArquivoPrecos";
import { DashboardPrecos } from "@/components/robo-precos/DashboardPrecos";
import { LogsMonitorPreco } from "@/components/robo-precos/LogsMonitorPreco";
import { BuscaManualPrecos } from "@/components/robo-precos/BuscaManualPrecos";

interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

const tabItems: TabItem[] = [
  { id: "busca", label: "Buscar Preços", icon: Search, description: "Busque preços de produtos manualmente" },
  { id: "dashboard", label: "Dashboard", icon: BarChart3, description: "Visualize análises e comparativos de preços" },
  { id: "fontes", label: "Fontes de Pesquisa", icon: Database, description: "Gerencie as fontes de pesquisa de preços" },
  { id: "mapeamento", label: "Mapeamento", icon: Link2, description: "Vincule produtos às fontes de pesquisa" },
  { id: "importar", label: "Importar Arquivo", icon: FileSpreadsheet, description: "Importe preços de arquivos Excel" },
  { id: "logs", label: "Logs e Monitoramento", icon: Settings, description: "Acompanhe os logs de execução" },
];

export default function RoboPrecos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const currentTab = searchParams.get('tab') || 'busca';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const currentTabItem = tabItems.find(t => t.id === currentTab) || tabItems[0];
  const CurrentIcon = currentTabItem.icon;

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-card px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/60">
            <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold">Robô de Preços</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Monitore preços de concorrentes automaticamente
            </p>
          </div>
        </div>
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

          <div className="flex-1 overflow-auto p-3 sm:p-6">
            <TabsContent value="busca" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                    Buscar Preços
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Busque preços de produtos manualmente
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <BuscaManualPrecos />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dashboard" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                    Dashboard de Preços
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Visualize análises e comparativos de preços
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <DashboardPrecos />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fontes" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Database className="h-4 w-4 sm:h-5 sm:w-5" />
                    Fontes de Pesquisa
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Gerencie as fontes de pesquisa de preços
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <FontesPesquisaCRUD />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mapeamento" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Link2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    Mapeamento de Produtos
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Vincule produtos às fontes de pesquisa
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <MapeamentoProdutoFonte />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="importar" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <FileSpreadsheet className="h-4 w-4 sm:h-5 sm:w-5" />
                    Importar Arquivo de Preços
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Importe preços de arquivos Excel
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <ImportarArquivoPrecos />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                    Logs e Monitoramento
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Acompanhe os logs de execução do robô
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <LogsMonitorPreco />
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
