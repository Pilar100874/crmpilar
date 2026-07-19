import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  FileText, 
  User, 
  Building2, 
  Users, 
  Link2,
  PanelLeft,
  PanelLeftClose,
  LucideIcon,
  MapPin,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

import { Truck, UserCog } from 'lucide-react';

// Import existing components
import Contatos from './Contatos';
import Empresas from './Empresas';
import Todos from './Todos';
import VinculosEmpresas from './VinculosEmpresas';
import VinculosContatos from './VinculosContatos';
import VinculosEmpresaVendedor from './VinculosEmpresaVendedor';
import VinculosVendedorUsuario from './VinculosVendedorUsuario';
import MapaClientesView from '@/components/listas/MapaClientesView';
import { ProspeccaoB2BView } from '@/components/listas/prospeccao-b2b';

interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

const tabItems: TabItem[] = [
  { id: 'contatos', label: 'Contatos', icon: User, description: 'Gestão de contatos' },
  { id: 'empresas', label: 'Empresas', icon: Building2, description: 'Gestão de empresas' },
  { id: 'vendedores', label: 'Vendedores', icon: UserCog, description: 'Gestão de vendedores' },
  { id: 'transportadoras', label: 'Transportadoras', icon: Truck, description: 'Gestão de transportadoras' },
  { id: 'todos', label: 'Todos', icon: Users, description: 'Visualização de todos os registros' },
  { id: 'vinculos-empresas', label: 'Vínculo Empresas', icon: Link2, description: 'Vínculo Empresas X Usuário / Segmento' },
  { id: 'vinculos-contatos', label: 'Vínculo Contatos', icon: Link2, description: 'Vínculo Contatos X Usuário' },
  { id: 'vinculos-empresa-vendedor', label: 'Vínculo Emp. x Vendedor', icon: Link2, description: 'Vínculo Empresas X Vendedor' },
  { id: 'vinculos-vendedor-usuario', label: 'Vínculo Vend. x Usuário', icon: Link2, description: 'Vínculo Vendedores X Usuário' },
  { id: 'mapa-clientes', label: 'Mapa Clientes', icon: MapPin, description: 'Visualização geográfica das empresas' },
  { id: 'prospeccao-b2b', label: 'Prospecção B2B', icon: Target, description: 'Busca de empresas por região e segmento' },
];

const ListasHub: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const idParam = searchParams.get('id');
  
  const [activeTab, setActiveTab] = useState(() => {
    // Inicializa com a aba passada por URL ou 'contatos'
    const validTabs = tabItems.map(t => t.id);
    return tabParam && validTabs.includes(tabParam) ? tabParam : 'contatos';
  });
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);

  // Atualiza a aba ativa quando o parâmetro de URL muda
  useEffect(() => {
    if (tabParam) {
      const validTabs = tabItems.map(t => t.id);
      if (validTabs.includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, [tabParam]);

  const currentTabItem = tabItems.find(t => t.id === activeTab) || tabItems[0];
  const CurrentIcon = currentTabItem.icon;

  const renderContent = () => {
    switch (activeTab) {
      case 'contatos':
        return <Contatos />;
      case 'empresas':
        return <Empresas />;
      case 'vendedores':
        return <Empresas variant="vendedor" />;
      case 'transportadoras':
        return <Empresas variant="transportadora" />;
      case 'todos':
        return <Todos />;
      case 'vinculos-empresas':
        return <VinculosEmpresas />;
      case 'vinculos-contatos':
        return <VinculosContatos />;
      case 'vinculos-empresa-vendedor':
        return <VinculosEmpresaVendedor />;
      case 'vinculos-vendedor-usuario':
        return <VinculosVendedorUsuario />;
      case 'mapa-clientes':
        return <MapaClientesView />;
      case 'prospeccao-b2b':
        return <ProspeccaoB2BView />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-card px-3 sm:px-6 py-3 sm:py-4">
        <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
          <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Listas
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Gestão de contatos, empresas e vínculos
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
          <div className="flex-1 overflow-auto p-3 sm:p-6">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              
              return (
                <TabsContent 
                  key={tab.id} 
                  value={tab.id} 
                  className="mt-0"
                >
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
                </TabsContent>
              );
            })}
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default ListasHub;
