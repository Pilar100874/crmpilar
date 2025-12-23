import React, { useState } from 'react';
import { 
  User, 
  Building2, 
  X,
  LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

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
  const [activeTab, setActiveTab] = useState<TabId | null>(null);

  const currentTabItem = tabItems.find(t => t.id === activeTab);

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

  // Tela inicial com botões de seleção
  if (!activeTab) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <div className="border-b bg-card px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm sm:text-base font-semibold">
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

        {/* Seleção inicial */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant="outline"
                  className="h-32 flex-col gap-3 hover:bg-primary/10 hover:border-primary transition-all"
                  onClick={() => setActiveTab(tab.id as TabId)}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="font-medium">{tab.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Tela com conteúdo selecionado
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setActiveTab(null)}
            className="h-8 px-2"
          >
            ← Voltar
          </Button>
          <div>
            <h2 className="text-sm sm:text-base font-semibold flex items-center gap-2">
              {currentTabItem && <currentTabItem.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />}
              {currentTabItem?.label}
            </h2>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto min-h-0">
        <ScrollArea className="h-full">
          <div className="p-2 sm:p-4">
            {renderContent()}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
