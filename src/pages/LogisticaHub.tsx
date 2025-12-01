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
  PanelLeftClose
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

const tabItems = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    icon: MapPin,
    description: 'Visão geral da frota'
  },
  { 
    id: 'monitoramento', 
    label: 'Monitoramento', 
    icon: Eye,
    description: 'Rastreamento em tempo real'
  },
  { 
    id: 'veiculos', 
    label: 'Veículos', 
    icon: Car,
    description: 'Cadastro de veículos'
  },
  { 
    id: 'historico', 
    label: 'Histórico', 
    icon: Clock,
    description: 'Histórico de trajetos'
  },
  { 
    id: 'roteirizacao', 
    label: 'Roteirização', 
    icon: Route,
    description: 'Planejamento de rotas'
  },
  { 
    id: 'rotas', 
    label: 'Rotas Salvas', 
    icon: Navigation,
    description: 'Rotas salvas'
  },
  { 
    id: 'automacoes', 
    label: 'Automações', 
    icon: Zap,
    description: 'Regras automáticas'
  },
  { 
    id: 'config', 
    label: 'Configuração', 
    icon: Settings,
    description: 'Configurações do sistema'
  },
];

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
      case 'config':
        return <LogisticaConfig embedded />;
      default:
        return null;
    }
  };

  const currentTab = tabItems.find(item => item.id === activeTab);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Truck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Logística</h1>
          <p className="text-sm text-muted-foreground">
            Gestão completa de frota e entregas
          </p>
        </div>
      </div>

      {/* Mobile: Select dropdown */}
      <div className="md:hidden">
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione uma opção" />
          </SelectTrigger>
          <SelectContent>
            {tabItems.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop: Sidebar + Content */}
      <div className="hidden md:flex gap-4">
        {/* Sidebar Menu */}
        <div className={cn(
          "flex flex-col transition-all duration-300",
          isMenuCollapsed ? "w-14" : "w-64"
        )}>
          <Card className="flex-1">
            <CardContent className="p-2">
              <div className="flex justify-end mb-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMenuCollapsed(!isMenuCollapsed)}
                  className="h-8 w-8"
                >
                  {isMenuCollapsed ? (
                    <PanelLeft className="h-4 w-4" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <TooltipProvider delayDuration={0}>
                <nav className="space-y-1">
                  {tabItems.map((item) => (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setActiveTab(item.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                            activeTab === item.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!isMenuCollapsed && (
                            <span className="truncate">{item.label}</span>
                          )}
                        </button>
                      </TooltipTrigger>
                      {isMenuCollapsed && (
                        <TooltipContent side="right">
                          <p>{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ))}
                </nav>
              </TooltipProvider>
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                {currentTab && <currentTab.icon className="h-5 w-5 text-primary" />}
                <CardTitle>{currentTab?.label}</CardTitle>
              </div>
              <CardDescription>{currentTab?.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {renderContent()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile: Content */}
      <div className="md:hidden">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              {currentTab && <currentTab.icon className="h-5 w-5 text-primary" />}
              <CardTitle>{currentTab?.label}</CardTitle>
            </div>
            <CardDescription>{currentTab?.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LogisticaHub;
