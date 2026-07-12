import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  LayoutDashboard, 
  Target,
  FileBarChart,
  Bell,
  Key,
  FileText,
  Zap,
  Clock,
  PanelLeft,
  PanelLeftClose,
  LucideIcon,
  Sparkles,
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
import AdsDashboard from './ads/AdsDashboard';
import AdsCampaigns from './ads/AdsCampaigns';
import AdsReports from './ads/AdsReports';
import AdsAlerts from './ads/AdsAlerts';
import AdsPlatformDashboard from './ads/AdsPlatformDashboard';

import AdsLogs from './ads/AdsLogs';
import AdsAutomation from './ads/AdsAutomation';
import AdsSchedulerConfig from './ads/AdsSchedulerConfig';
import AdsConexoes from './ads/AdsConexoes';
import AdsSetupWizard from './ads/AdsSetupWizard';
import { AdsSetupStatusBanner, useAdsSetupStatus } from '@/components/ads/AdsSetupStatusBanner';

// Platform icons (using simple colored divs for now)
const GoogleIcon = () => (
  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 via-red-500 to-yellow-500" />
);
const MetaIcon = () => (
  <div className="w-4 h-4 rounded-full bg-blue-600" />
);
const TikTokIcon = () => (
  <div className="w-4 h-4 rounded-full bg-black dark:bg-white" />
);
const MercadoLivreIcon = () => (
  <div className="w-4 h-4 rounded-full bg-yellow-400" />
);
const AmazonIcon = () => (
  <div className="w-4 h-4 rounded-full bg-orange-500" />
);

interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon | React.FC;
  description: string;
  platform?: string;
}

// Menu reagrupado — grupos lógicos, itens antigos ainda acessíveis via ids
const tabItems: TabItem[] = [
  { id: 'wizard', label: 'Wizard de Setup', icon: Sparkles, description: 'Assistente guiado para configurar tudo passo a passo' },
  { id: 'campaigns', label: 'Campanhas', icon: Target, description: 'Gerenciar campanhas de anúncios' },
  { id: 'automation', label: 'Automações', icon: Zap, description: 'Regras de automação de anúncios' },
  { id: 'scheduler', label: 'Agendamento', icon: Clock, description: 'Frequência de execução das automações' },
  { id: 'connections', label: 'Conexões', icon: Key, description: 'Contas de anúncio + Apps do Desenvolvedor' },
  { id: 'reports', label: 'Relatórios', icon: FileBarChart, description: 'Relatórios personalizados' },
  { id: 'alerts', label: 'Alertas', icon: Bell, description: 'Alertas de performance' },
  { id: 'logs', label: 'Logs de Coleta', icon: FileText, description: 'Histórico de coleta de dados' },
  { id: 'google', label: 'Google Ads', icon: GoogleIcon, description: 'Dashboard Google Ads', platform: 'google' },
  { id: 'meta', label: 'Meta Ads', icon: MetaIcon, description: 'Dashboard Meta Ads (Facebook/Instagram)', platform: 'meta' },
  { id: 'tiktok', label: 'TikTok Ads', icon: TikTokIcon, description: 'Dashboard TikTok Ads', platform: 'tiktok' },
  { id: 'mercadolivre', label: 'Mercado Livre Ads', icon: MercadoLivreIcon, description: 'Dashboard Mercado Livre Ads', platform: 'mercado_livre' },
  { id: 'amazon', label: 'Amazon Ads', icon: AmazonIcon, description: 'Dashboard Amazon Ads', platform: 'amazon' },
];

const AdsHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' is the default for AdsDashboard
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEstabelecimento();
  }, []);

  const { done, total, complete } = useAdsSetupStatus(estabelecimentoId);

  // Auto-redirect to wizard on first visit when nothing is configured
  useEffect(() => {
    if (!loading && estabelecimentoId && total > 0 && done === 0 && activeTab === 'dashboard') {
      const seen = localStorage.getItem('ads_wizard_auto_opened');
      if (!seen) {
        localStorage.setItem('ads_wizard_auto_opened', '1');
        setActiveTab('wizard');
      }
    }
  }, [loading, estabelecimentoId, done, total, activeTab]);

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
  const CurrentIcon = currentTabItem?.icon || LayoutDashboard;

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

    const currentTab = tabItems.find(t => t.id === activeTab);

    switch (activeTab) {
      case 'dashboard':
        return <AdsDashboard />;
      case 'campaigns':
        return <AdsCampaigns />;
      case 'reports':
        return <AdsReports />;
      case 'alerts':
        return <AdsAlerts />;
      case 'google':
      case 'meta':
      case 'tiktok':
      case 'mercadolivre':
      case 'amazon':
        return <AdsPlatformDashboard platform={currentTab?.platform} />;
      case 'credentials':
      case 'platform-apps':
      case 'connections':
        return <AdsConexoes />;
      case 'logs':
        return <AdsLogs />;
      case 'automation':
        return <AdsAutomation />;
      case 'scheduler':
        return <AdsSchedulerConfig />;
      case 'wizard':
        return <AdsSetupWizard />;
      default:
        return <AdsDashboard />;
    }
  };

  // For dashboard tab, render the AdsDashboard directly without card wrapper
  if (activeTab === 'dashboard') {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b bg-card px-3 sm:px-6 py-3 sm:py-4">
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2 flex-wrap">
            <Megaphone className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            <span>Painel de Anúncios</span>
            <span className="text-muted-foreground font-normal text-sm sm:text-base">/ Dashboard Geral</span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Gestão unificada de campanhas e anúncios em múltiplas plataformas
          </p>
        </div>

        {estabelecimentoId && (
          <AdsSetupStatusBanner estabelecimentoId={estabelecimentoId} onGoToWizard={() => setActiveTab('wizard')} />
        )}



        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col lg:flex-row">
            {/* Mobile: Select dropdown */}
            <div className="lg:hidden border-b bg-muted/30 p-3">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      <span>Dashboard Geral</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="dashboard">
                    <div className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      <span>Dashboard Geral</span>
                    </div>
                  </SelectItem>
                  {tabItems.map((tab) => {
                    const Icon = tab.icon;
                    const isLucideIcon = typeof Icon === 'function' && 'displayName' in Icon;
                    return (
                      <SelectItem key={tab.id} value={tab.id}>
                        <div className="flex items-center gap-2">
                          {isLucideIcon ? <Icon className="h-4 w-4" /> : <Icon />}
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
              isMenuCollapsed ? "lg:w-16" : "lg:w-72"
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
                {/* Dashboard item (default) */}
                {(() => {
                  const isActive = activeTab === 'dashboard';
                  const menuButton = (
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className={cn(
                        "hub-menu-item flex items-center gap-3 px-3 py-2.5 text-left w-full text-muted-foreground",
                        isActive && "is-active",
                        isMenuCollapsed && "justify-center"
                      )}
                    >
                      <span className={cn("shrink-0", !isActive && "opacity-70")}>
                        <LayoutDashboard className="h-4 w-4" />
                      </span>
                      {!isMenuCollapsed && <span className="leading-tight break-words">Dashboard Geral</span>}
                    </button>
                  );
                  if (isMenuCollapsed) {
                    return (
                      <Tooltip key="dashboard">
                        <TooltipTrigger asChild>{menuButton}</TooltipTrigger>
                        <TooltipContent side="right">Dashboard Geral</TooltipContent>
                      </Tooltip>
                    );
                  }
                  return menuButton;
                })()}
                
                {tabItems.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const isLucideIcon = typeof Icon === 'function' && 'displayName' in Icon;
                  
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
                      <span className={cn("shrink-0", !isActive && "opacity-70")}>
                        {isLucideIcon ? <Icon className="h-4 w-4" /> : <Icon />}
                      </span>
                      {!isMenuCollapsed && <span className="leading-tight break-words">{tab.label}</span>}
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

            {/* Content area - Dashboard content directly */}
            <div className="flex-1 overflow-auto p-3 sm:p-6">
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
        <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2 flex-wrap">
          <Megaphone className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          <span>Painel de Anúncios</span>
          {currentTabItem && (
            <span className="text-muted-foreground font-normal text-sm sm:text-base">/ {currentTabItem.label}</span>
          )}
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          {currentTabItem?.description || 'Gestão unificada de campanhas e anúncios em múltiplas plataformas'}
        </p>
      </div>

      {estabelecimentoId && activeTab !== 'wizard' && (
        <AdsSetupStatusBanner estabelecimentoId={estabelecimentoId} onGoToWizard={() => setActiveTab('wizard')} />
      )}



      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col lg:flex-row">
          {/* Mobile: Select dropdown */}
          <div className="lg:hidden border-b bg-muted/30 p-3">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {typeof CurrentIcon === 'function' && 'displayName' in CurrentIcon ? (
                      <CurrentIcon className="h-4 w-4" />
                    ) : (
                      <CurrentIcon />
                    )}
                    <span>{currentTabItem?.label || 'Dashboard Geral'}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="dashboard">
                  <div className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard Geral</span>
                  </div>
                </SelectItem>
                {tabItems.map((tab) => {
                  const Icon = tab.icon;
                  const isLucideIcon = typeof Icon === 'function' && 'displayName' in Icon;
                  return (
                    <SelectItem key={tab.id} value={tab.id}>
                      <div className="flex items-center gap-2">
                        {isLucideIcon ? <Icon className="h-4 w-4" /> : <Icon />}
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
            isMenuCollapsed ? "lg:w-16" : "lg:w-72"
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
              {/* Dashboard item (default) */}
              {(() => {
                const isActive = activeTab === 'dashboard';
                const menuButton = (
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={cn(
                      "hub-menu-item flex items-center gap-3 px-3 py-2.5 text-left w-full text-muted-foreground",
                      isActive && "is-active",
                      isMenuCollapsed && "justify-center"
                    )}
                  >
                    <span className={cn("shrink-0", !isActive && "opacity-70")}>
                      <LayoutDashboard className="h-4 w-4" />
                    </span>
                    {!isMenuCollapsed && <span className="leading-tight break-words">Dashboard Geral</span>}
                  </button>
                );
                if (isMenuCollapsed) {
                  return (
                    <Tooltip key="dashboard">
                      <TooltipTrigger asChild>{menuButton}</TooltipTrigger>
                      <TooltipContent side="right">Dashboard Geral</TooltipContent>
                    </Tooltip>
                  );
                }
                return menuButton;
              })()}
              
              {tabItems.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const isLucideIcon = typeof Icon === 'function' && 'displayName' in Icon;
                
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
                    <span className={cn("shrink-0", !isActive && "opacity-70")}>
                      {isLucideIcon ? <Icon className="h-4 w-4" /> : <Icon />}
                    </span>
                    {!isMenuCollapsed && <span className="leading-tight break-words">{tab.label}</span>}
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
              const isLucideIcon = typeof Icon === 'function' && 'displayName' in Icon;
              
              return (
                <TabsContent 
                  key={tab.id} 
                  value={tab.id} 
                  className="mt-0"
                >
                  <Card className="h-full">
                    <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        {isLucideIcon ? <Icon className="h-4 w-4 sm:h-5 sm:w-5" /> : <Icon />}
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

export default AdsHub;
