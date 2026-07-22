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
  Target,
  Bot,
  Wand2,
  Sparkles,
  UserSearch,
  Truck,
  UserCog,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectLabel, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

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
import ProspeccaoClaudeCode from './ProspeccaoClaudeCode';
import ProspeccaoEmpresas from './ProspeccaoEmpresas';
import VinculosSegmentoProspectUsuario from './VinculosSegmentoProspectUsuario';
import ConfigIAProspec from './ConfigIAProspec';
import ProspeccaoVendedores from './ProspeccaoVendedores';
import Gerentes from './Gerentes';

interface TabItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  description: string;
}

interface TabSection {
  id: string;
  title: string;
  items: TabItem[];
}

const sections: TabSection[] = [
  {
    id: 'cadastros',
    title: 'Cadastros',
    items: [
      { id: 'contatos', label: 'Contatos', icon: User, description: 'Gestão de contatos' },
      { id: 'empresas', label: 'Empresas', icon: Building2, description: 'Gestão de empresas' },
      { id: 'vendedores', label: 'Vendedores', icon: UserCog, description: 'Gestão de vendedores' },
      { id: 'transportadoras', label: 'Transportadoras', icon: Truck, description: 'Gestão de transportadoras' },
      { id: 'gerentes', label: 'Gerentes', icon: UserCog, description: 'Usuários gerentes e seus vendedores/empresas' },
      { id: 'todos', label: 'Todos', icon: Users, description: 'Visualização de todos os registros' },
    ],
  },
  {
    id: 'vinculos',
    title: 'Vínculos',
    items: [
      { id: 'vinculos-empresas', label: 'Vínculo Empresas', shortLabel: 'Emp. x Gerente', icon: Link2, description: 'Vínculo Empresas X Gerente / Segmento' },
      { id: 'vinculos-contatos', label: 'Vínculo Contatos', shortLabel: 'Contatos x Gerente', icon: Link2, description: 'Vínculo Contatos X Gerente' },
      { id: 'vinculos-empresa-vendedor', label: 'Vínculo Emp. x Vendedor', shortLabel: 'Emp. x Vendedor', icon: Link2, description: 'Vínculo Empresas X Vendedor' },
      { id: 'vinculos-vendedor-usuario', label: 'Vínculo Vend. x Gerente', shortLabel: 'Vend. x Gerente', icon: Link2, description: 'Vínculo Vendedores X Gerente' },
      { id: 'vinculos-segmento-prospect-usuario', label: 'Segmento Prospect x Gerente', shortLabel: 'Segm. Prospect x Gerente', icon: Link2, description: 'Direcione o atendimento de prospects por segmento a gerentes' },
    ],
  },
  {
    id: 'geo',
    title: 'Geolocalização',
    items: [
      { id: 'mapa-clientes', label: 'Mapa Clientes', icon: MapPin, description: 'Visualização geográfica das empresas' },
    ],
  },
  {
    id: 'prospeccao',
    title: 'Prospecção',
    items: [
      { id: 'prospeccao-b2b', label: 'Prospecção B2B', icon: Target, description: 'Busca de empresas por região e segmento' },
      { id: 'prospeccao-empresas', label: 'Prospecção Empresas (IA)', shortLabel: 'Prospecção Empresas', icon: Wand2, description: 'Wizard + empresas trazidas via Claude Code / Cursor / ChatGPT' },
      { id: 'prospeccao-vendedores', label: 'Prospecção Representantes (IA)', shortLabel: 'Representantes (IA)', icon: UserSearch, description: 'Prompt guiado para prospectar representantes comerciais' },
      { id: 'config-ia-prospec', label: 'Configurar IAs', icon: Sparkles, description: 'Insira as chaves das IAs (OpenAI, Anthropic) usadas no Wizard' },
      { id: 'prospeccao-claude-code', label: 'Disponibilizar dados p/ IA', shortLabel: 'Dados p/ IA (MCP)', icon: Bot, description: 'Configure quais tabelas ficam disponíveis via MCP' },
    ],
  },
];

const tabItems: TabItem[] = sections.flatMap(s => s.items);

const ListasHub: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const resolveTab = (t: string | null) => (t === 'wizard-prospeccao' ? 'prospeccao-empresas' : t);
  const [activeTab, setActiveTab] = useState(() => {
    const validTabs = tabItems.map(t => t.id);
    const resolved = resolveTab(tabParam);
    return resolved && validTabs.includes(resolved) ? resolved : 'contatos';
  });
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);

  useEffect(() => {
    if (tabParam) {
      const validTabs = tabItems.map(t => t.id);
      const resolved = resolveTab(tabParam);
      if (resolved && validTabs.includes(resolved)) {
        setActiveTab(resolved);
      }
    }
  }, [tabParam]);

  const currentTabItem = tabItems.find(t => t.id === activeTab) || tabItems[0];
  const CurrentIcon = currentTabItem.icon;
  const currentSection = sections.find(s => s.items.some(i => i.id === activeTab));

  const renderContent = () => {
    switch (activeTab) {
      case 'contatos': return <Contatos />;
      case 'empresas': return <Empresas />;
      case 'vendedores': return <Empresas variant="vendedor" />;
      case 'transportadoras': return <Empresas variant="transportadora" />;
      case 'gerentes': return <Gerentes />;
      case 'todos': return <Todos />;
      case 'vinculos-empresas': return <VinculosEmpresas />;
      case 'vinculos-contatos': return <VinculosContatos />;
      case 'vinculos-empresa-vendedor': return <VinculosEmpresaVendedor />;
      case 'vinculos-vendedor-usuario': return <VinculosVendedorUsuario />;
      case 'vinculos-segmento-prospect-usuario': return <VinculosSegmentoProspectUsuario />;
      case 'mapa-clientes': return <MapaClientesView />;
      case 'prospeccao-b2b': return <ProspeccaoB2BView />;
      case 'prospeccao-claude-code': return <ProspeccaoClaudeCode />;
      case 'prospeccao-empresas':
      case 'wizard-prospeccao':
        return <ProspeccaoEmpresas />;
      case 'prospeccao-vendedores': return <ProspeccaoVendedores />;
      case 'config-ia-prospec': return <ConfigIAProspec />;
      default: return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-muted/20">
      {/* Header com gradiente */}
      <div className="border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight truncate">Listas</h1>
            <p className="text-muted-foreground text-xs sm:text-sm truncate">
              Gestão de contatos, empresas, vínculos e prospecção
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col lg:flex-row">
          {/* Mobile & Tablet: Select agrupado */}
          <div className="lg:hidden border-b bg-card/60 backdrop-blur p-3 sticky top-0 z-10">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full bg-background h-11">
                <SelectValue>
                  <div className="flex items-center gap-2 min-w-0">
                    <CurrentIcon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{currentTabItem.label}</span>
                    {currentSection && (
                      <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground shrink-0 hidden sm:inline">
                        {currentSection.title}
                      </span>
                    )}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover max-h-[70vh]">
                {sections.map((section) => (
                  <SelectGroup key={section.id}>
                    <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {section.title}
                    </SelectLabel>
                    {section.items.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <SelectItem key={tab.id} value={tab.id}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span>{tab.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: Sidebar com seções */}
          <aside className={cn(
            "hub-menu hidden lg:flex lg:flex-col lg:overflow-y-auto lg:shrink-0 border-r bg-card transition-all duration-300",
            isMenuCollapsed ? "lg:w-14" : "lg:w-64"
          )}>
            <div className="flex items-center justify-end p-2 border-b">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMenuCollapsed(!isMenuCollapsed)}
                className="h-8 w-8"
                title={isMenuCollapsed ? 'Expandir menu' : 'Recolher menu'}
              >
                {isMenuCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>
            </div>

            <TooltipProvider delayDuration={0}>
              <nav className="flex-1 p-2 space-y-4">
                {sections.map((section) => (
                  <div key={section.id} className="space-y-1">
                    {!isMenuCollapsed && (
                      <div className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        {section.title}
                      </div>
                    )}
                    {isMenuCollapsed && (
                      <div className="mx-2 my-1 border-t border-border/60" aria-hidden />
                    )}
                    {section.items.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      const btn = (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={cn(
                            "group relative flex items-center gap-3 w-full rounded-md px-2.5 py-2 text-sm text-left transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            isMenuCollapsed && "justify-center px-0"
                          )}
                        >
                          {isActive && !isMenuCollapsed && (
                            <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary" />
                          )}
                          <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "opacity-70")} />
                          {!isMenuCollapsed && <span className="truncate">{tab.label}</span>}
                        </button>
                      );
                      if (isMenuCollapsed) {
                        return (
                          <Tooltip key={tab.id}>
                            <TooltipTrigger asChild>{btn}</TooltipTrigger>
                            <TooltipContent side="right" className="font-medium">
                              {tab.label}
                            </TooltipContent>
                          </Tooltip>
                        );
                      }
                      return btn;
                    })}
                  </div>
                ))}
              </nav>
            </TooltipProvider>
          </aside>

          {/* Content area */}
          <div className="flex-1 overflow-auto p-2 sm:p-4 lg:p-6">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsContent key={tab.id} value={tab.id} className="mt-0">
                  <Card className="shadow-sm border-border/60">
                    <CardHeader className="px-3 sm:px-6 py-3 sm:py-4 border-b bg-muted/30">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base sm:text-lg leading-tight truncate">
                            {tab.label}
                          </CardTitle>
                          <CardDescription className="text-xs sm:text-sm mt-0.5 line-clamp-2">
                            {tab.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-4 lg:p-6">
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
