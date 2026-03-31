import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Package, 
  PanelLeft,
  PanelLeftClose,
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
import MarketplaceHub from './MarketplaceHub';
import MarketplaceProdutos from './MarketplaceProdutos';
import MarketplacePedidos from './MarketplacePedidos';

interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

const tabItems: TabItem[] = [
  { id: 'produtos', label: 'Produtos x Canais', icon: Package, description: 'Gerenciar produtos vinculados aos marketplaces' },
  { id: 'pedidos', label: 'Pedidos', icon: ShoppingCart, description: 'Acompanhar pedidos dos marketplaces' },
];

const MarketplacesHubPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('hub');
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

  const currentTabItem = tabItems.find(t => t.id === activeTab);
  const CurrentIcon = currentTabItem?.icon || Store;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      );
    }

    if (!estabelecimentoId) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Estabelecimento não encontrado</div>
        </div>
      );
    }

    switch (activeTab) {
      case 'hub':
        return <MarketplaceHub />;
      case 'produtos':
        return <MarketplaceProdutos />;
      case 'pedidos':
        return <MarketplacePedidos />;
      default:
        return <MarketplaceHub />;
    }
  };

  // For hub tab, render the MarketplaceHub directly without card wrapper
  if (activeTab === 'hub') {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b bg-card px-3 sm:px-6 py-3 sm:py-4">
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
            <Store className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Marketplaces
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Gestão de integrações com marketplaces e canais de venda
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
                      <Store className="h-4 w-4" />
                      <span>Hub de Marketplaces</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="hub">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      <span>Hub de Marketplaces</span>
                    </div>
                  </SelectItem>
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
              "hidden lg:flex lg:flex-col lg:border-r lg:bg-muted/20 lg:p-3 lg:gap-1 lg:overflow-y-auto lg:shrink-0 transition-all duration-300",
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
                {/* Hub item (default) */}
                {(() => {
                  const isActive = activeTab === 'hub';
                  const menuButton = (
                    <button
                      onClick={() => setActiveTab('hub')}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left w-full",
                        isActive 
                          ? "bg-primary text-primary-foreground shadow-sm" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        isMenuCollapsed && "justify-center"
                      )}
                    >
                      <span className={cn("shrink-0", !isActive && "opacity-70")}>
                        <Store className="h-4 w-4" />
                      </span>
                      {!isMenuCollapsed && <span className="truncate">Hub de Marketplaces</span>}
                    </button>
                  );
                  if (isMenuCollapsed) {
                    return (
                      <Tooltip key="hub">
                        <TooltipTrigger asChild>{menuButton}</TooltipTrigger>
                        <TooltipContent side="right">Hub de Marketplaces</TooltipContent>
                      </Tooltip>
                    );
                  }
                  return menuButton;
                })()}
                
                {tabItems.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  
                  const menuButton = (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left w-full",
                        isActive 
                          ? "bg-primary text-primary-foreground shadow-sm" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        isMenuCollapsed && "justify-center"
                      )}
                    >
                      <span className={cn("shrink-0", !isActive && "opacity-70")}>
                        <Icon className="h-4 w-4" />
                      </span>
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

            {/* Content area - Hub content directly */}
            <div className="flex-1 overflow-auto">
              {renderContent()}
            </div>
          </Tabs>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-card px-3 sm:px-6 py-3 sm:py-4">
        <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
          <Store className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Marketplaces
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Gestão de integrações com marketplaces e canais de venda
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
                    <span>{currentTabItem?.label || 'Hub de Marketplaces'}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="hub">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    <span>Hub de Marketplaces</span>
                  </div>
                </SelectItem>
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
            "hidden lg:flex lg:flex-col lg:border-r lg:bg-muted/20 lg:p-3 lg:gap-1 lg:overflow-y-auto lg:shrink-0 transition-all duration-300",
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
              {/* Hub item (default) */}
              {(() => {
                const isActive = activeTab === 'hub';
                const menuButton = (
                  <button
                    onClick={() => setActiveTab('hub')}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left w-full",
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      isMenuCollapsed && "justify-center"
                    )}
                  >
                    <span className={cn("shrink-0", !isActive && "opacity-70")}>
                      <Store className="h-4 w-4" />
                    </span>
                    {!isMenuCollapsed && <span className="truncate">Hub de Marketplaces</span>}
                  </button>
                );
                if (isMenuCollapsed) {
                  return (
                    <Tooltip key="hub">
                      <TooltipTrigger asChild>{menuButton}</TooltipTrigger>
                      <TooltipContent side="right">Hub de Marketplaces</TooltipContent>
                    </Tooltip>
                  );
                }
                return menuButton;
              })()}
              
              {tabItems.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                const menuButton = (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left w-full",
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      isMenuCollapsed && "justify-center"
                    )}
                  >
                    <span className={cn("shrink-0", !isActive && "opacity-70")}>
                      <Icon className="h-4 w-4" />
                    </span>
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

export default MarketplacesHubPage;
