import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  MapPin, 
  Eye, 
  Car, 
  Clock, 
  Route, 
  Navigation, 
  Zap, 
  Settings,
  PanelLeft,
  PanelLeftClose,
  Smartphone,
  BookOpen,
  LucideIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';
import { toast } from 'sonner';

// Import existing components
import LogisticaDashboard from './LogisticaDashboard';
import LogisticaMonitoramento from './LogisticaMonitoramento';
import { VeiculosCRUD } from '@/components/logistica/VeiculosCRUD';
import LogisticaHistorico from './LogisticaHistorico';
import LogisticaRoteirizacao from './LogisticaRoteirizacao';
import LogisticaRotas from './LogisticaRotas';
import LogisticaAutomacoes from './LogisticaAutomacoes';
import LogisticaConfig from './LogisticaConfig';
import PilarRastreadorApps from '@/components/logistica/PilarRastreadorApps';
import ManualRastreadores from '@/components/logistica/ManualRastreadores';

interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

const tabItems: TabItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: MapPin, description: 'Visão geral da frota' },
  { id: 'monitoramento', label: 'Monitoramento', icon: Eye, description: 'Rastreamento em tempo real' },
  { id: 'veiculos', label: 'Veículos', icon: Car, description: 'Cadastro de veículos' },
  { id: 'historico', label: 'Histórico', icon: Clock, description: 'Histórico de trajetos' },
  { id: 'roteirizacao', label: 'Roteirização', icon: Route, description: 'Planejamento de rotas' },
  { id: 'rotas', label: 'Rotas Salvas', icon: Navigation, description: 'Rotas salvas' },
  { id: 'automacoes', label: 'Automações', icon: Zap, description: 'Regras automáticas' },
  { id: 'pilar-rastreador', label: 'Pilar Rastreador', icon: Smartphone, description: 'Apps de rastreamento GPS' },
  { id: 'config', label: 'Configuração', icon: Settings, description: 'Configurações do sistema' },
];

// Tabs that should render fullscreen (no Card wrapper)
const fullscreenTabs = ['monitoramento', 'historico'];

const LogisticaHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEstabelecimento();
  }, []);

  const fetchEstabelecimento = async () => {
    try {
      const estabId = await getEstabelecimentoId();
      if (estabId) {
        setEstabelecimentoId(estabId);
      }
    } catch (error) {
      console.error('Error fetching estabelecimento:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const isFullscreenTab = fullscreenTabs.includes(activeTab);
  const currentTabItem = tabItems.find(t => t.id === activeTab) || tabItems[0];
  const CurrentIcon = currentTabItem.icon;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      );
    }

    if (!estabelecimentoId && activeTab !== 'config') {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Estabelecimento não encontrado</div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <LogisticaDashboard />;
      case 'monitoramento':
        return <LogisticaMonitoramento embedded />;
      case 'veiculos':
        return estabelecimentoId ? <VeiculosCRUD estabelecimentoId={estabelecimentoId} /> : null;
      case 'historico':
        return <LogisticaHistorico embedded />;
      case 'roteirizacao':
        return <LogisticaRoteirizacao embedded />;
      case 'rotas':
        return <LogisticaRotas embedded />;
      case 'automacoes':
        return <LogisticaAutomacoes />;
      case 'pilar-rastreador':
        return <PilarRastreadorApps />;
      case 'config':
        return <LogisticaConfig embedded />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-card px-3 sm:px-6 py-3 sm:py-4">
        <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
          <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Logística
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Gestão completa de frota e entregas
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col lg:flex-row">
          {/* Mobile: Select dropdown */}
          <div className="lg:hidden border-b bg-muted/30 p-3">
            <Select value={activeTab} onValueChange={setActiveTab}>
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
          <div className={cn(
            "hub-menu hidden lg:flex lg:flex-col lg:p-3 lg:gap-1 lg:overflow-y-auto lg:shrink-0 transition-all duration-300",
            isMenuCollapsed ? "lg:w-16" : "lg:w-64"
          )}>
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
                const isActive = activeTab === tab.id;
                const menuButton = (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "hub-menu-item flex items-center gap-3 px-3 py-2.5 text-left w-full text-muted-foreground",
                      isActive && "is-active",
                      isMenuCollapsed && "justify-center"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", !isActive && "opacity-70")} />
                    {!isMenuCollapsed && <span className="truncate">{tab.label}</span>}
                  </button>
                );
                if (isMenuCollapsed) {
                  return (
                    <Tooltip key={tab.id}>
                      <TooltipTrigger asChild>{menuButton}</TooltipTrigger>
                      <TooltipContent side="right">{tab.label}</TooltipContent>
                    </Tooltip>
                  );
                }
                return menuButton;
              })}
            </TooltipProvider>
          </div>

          {/* Content area */}
          <div className={cn(
            "flex-1 overflow-auto",
            !isFullscreenTab && "p-3 sm:p-6"
          )}>
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              const isFullscreen = fullscreenTabs.includes(tab.id);
              
              return (
                <TabsContent 
                  key={tab.id} 
                  value={tab.id} 
                  className={cn("mt-0", isFullscreen ? "h-full" : "")}
                >
                  {isFullscreen ? (
                    // Fullscreen tabs - no Card wrapper
                    <div className="h-full">
                      {activeTab === tab.id && renderContent()}
                    </div>
                  ) : (
                    // Normal tabs - with Card wrapper
                    <Card className="h-full">
                      <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                          {tab.label}
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                          {tab.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="px-3 sm:px-6">
                        {activeTab === tab.id && renderContent()}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              );
            })}
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default LogisticaHub;
