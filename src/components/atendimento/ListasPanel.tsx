import React, { useState } from 'react';
import { 
  User, 
  Building2, 
  X,
  LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

// Import existing components
import Contatos from '@/pages/Contatos';
import Empresas from '@/pages/Empresas';

interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

const tabItems: TabItem[] = [
  { id: 'contatos', label: 'Contatos', icon: User, description: 'Gestão de contatos' },
  { id: 'empresas', label: 'Empresas', icon: Building2, description: 'Gestão de empresas' },
];

interface ListasPanelProps {
  onClose: () => void;
  title?: string;
  description?: string;
  defaultTab?: 'contatos' | 'empresas';
}

type TabId = 'contatos' | 'empresas';

export function ListasPanel({
  onClose,
  title = "Puxar ou criar cadastro",
  description = "Gerencie contatos e empresas",
  defaultTab = 'contatos'
}: ListasPanelProps) {
  const handleTabChange = (value: string) => {
    setActiveTab(value as TabId);
  };
  const [activeTab, setActiveTab] = useState(defaultTab);

  const currentTabItem = tabItems.find(t => t.id === activeTab) || tabItems[0];
  const CurrentIcon = currentTabItem.icon;

  const renderContent = () => {
    switch (activeTab) {
      case 'contatos':
        return <Contatos />;
      case 'empresas':
        return <Empresas />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm sm:text-base font-semibold flex items-center gap-2">
            <CurrentIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            {title}
          </h2>
          <p className="text-muted-foreground text-xs mt-0.5">
            {description}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
          {/* Mobile: Select dropdown */}
          <div className="border-b bg-muted/30 p-2 sm:p-3 shrink-0">
            <Select value={activeTab} onValueChange={handleTabChange}>
              <SelectTrigger className="w-full bg-background h-9">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <CurrentIcon className="h-4 w-4" />
                    <span className="text-sm">{currentTabItem.label}</span>
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

          {/* Content area */}
          <div className="flex-1 overflow-auto min-h-0">
            {tabItems.map((tab) => (
              <TabsContent 
                key={tab.id} 
                value={tab.id} 
                className="mt-0 h-full"
              >
                <ScrollArea className="h-full">
                  <div className="p-2 sm:p-4">
                    {activeTab === tab.id && renderContent()}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
