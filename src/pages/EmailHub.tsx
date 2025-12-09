import React, { useState } from 'react';
import { 
  Mail, 
  Inbox, 
  Send, 
  Archive, 
  Trash2,
  PanelLeft,
  PanelLeftClose,
  LucideIcon,
  Star,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Import existing Email component
import Email from './Email';

interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  folder: string;
  color: string;
}

const tabItems: TabItem[] = [
  { 
    id: 'inbox', 
    label: 'Caixa de Entrada', 
    icon: Inbox, 
    description: 'Mensagens recebidas', 
    folder: 'inbox',
    color: 'text-blue-500 bg-blue-500/10'
  },
  { 
    id: 'sent', 
    label: 'Enviados', 
    icon: Send, 
    description: 'Mensagens enviadas', 
    folder: 'sent',
    color: 'text-green-500 bg-green-500/10'
  },
  { 
    id: 'archive', 
    label: 'Arquivados', 
    icon: Archive, 
    description: 'Mensagens arquivadas', 
    folder: 'archive',
    color: 'text-amber-500 bg-amber-500/10'
  },
  { 
    id: 'trash', 
    label: 'Lixeira', 
    icon: Trash2, 
    description: 'Mensagens excluídas', 
    folder: 'trash',
    color: 'text-red-500 bg-red-500/10'
  },
];

const quickActions = [
  { id: 'starred', label: 'Com estrela', icon: Star, color: 'text-yellow-500' },
  { id: 'important', label: 'Importantes', icon: AlertCircle, color: 'text-red-500' },
  { id: 'snoozed', label: 'Adiados', icon: Clock, color: 'text-purple-500' },
];

const EmailHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('inbox');
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);

  const currentTabItem = tabItems.find(t => t.id === activeTab) || tabItems[0];
  const CurrentIcon = currentTabItem.icon;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">E-mail</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Gerenciamento de e-mails
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col lg:flex-row">
          {/* Mobile: Select dropdown */}
          <div className="lg:hidden border-b bg-card p-3">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", currentTabItem.color)}>
                      <CurrentIcon className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-medium">{currentTabItem.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {tabItems.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <SelectItem key={tab.id} value={tab.id}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", tab.color)}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
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
            "hidden lg:flex lg:flex-col lg:border-r lg:bg-card/50 lg:p-3 lg:gap-1 lg:overflow-y-auto lg:shrink-0 transition-all duration-300",
            isMenuCollapsed ? "lg:w-[68px]" : "lg:w-64"
          )}>
            {/* Collapse button */}
            <div className="flex items-center justify-end mb-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsMenuCollapsed(!isMenuCollapsed)} 
                className="h-8 w-8 p-0"
              >
                {isMenuCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>
            </div>

            {/* Main folders */}
            <div className="space-y-1">
              {!isMenuCollapsed && (
                <div className="px-3 py-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Pastas
                  </span>
                </div>
              )}
              
              <TooltipProvider delayDuration={0}>
                {tabItems.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const menuButton = (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left w-full group",
                        isActive 
                          ? "bg-primary text-primary-foreground shadow-md" 
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                        isMenuCollapsed && "justify-center px-2"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0",
                        isActive ? "bg-primary-foreground/20" : tab.color
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      {!isMenuCollapsed && (
                        <>
                          <span className="truncate flex-1">{tab.label}</span>
                          {tab.id === 'inbox' && (
                            <Badge variant="secondary" className="ml-auto text-xs">
                              12
                            </Badge>
                          )}
                        </>
                      )}
                    </button>
                  );
                  
                  if (isMenuCollapsed) {
                    return (
                      <Tooltip key={tab.id}>
                        <TooltipTrigger asChild>{menuButton}</TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">
                          {tab.label}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }
                  return menuButton;
                })}
              </TooltipProvider>
            </div>

            {/* Quick filters */}
            {!isMenuCollapsed && (
              <>
                <div className="my-4 px-3">
                  <div className="h-px bg-border" />
                </div>
                
                <div className="space-y-1">
                  <div className="px-3 py-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Filtros rápidos
                    </span>
                  </div>
                  
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-full"
                      >
                        <Icon className={cn("h-4 w-4", action.color)} />
                        <span>{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-hidden">
            {tabItems.map((tab) => (
              <TabsContent 
                key={tab.id} 
                value={tab.id} 
                className="mt-0 h-full"
              >
                {activeTab === tab.id && <Email embeddedFolder={tab.folder} />}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default EmailHub;
