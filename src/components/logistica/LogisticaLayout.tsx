import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate, useLocation } from 'react-router-dom';
import { Truck, Map, Route, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogisticaLayoutProps {
  children: React.ReactNode;
  activeTab: 'veiculos' | 'mapa' | 'rotas';
}

const tabs = [
  { id: 'veiculos', label: 'Veículos Online', icon: Radio, path: '/logistica' },
  { id: 'mapa', label: 'Mapa Tempo Real', icon: Map, path: '/logistica/mapa' },
  { id: 'rotas', label: 'Rotas do Dia', icon: Route, path: '/logistica/rotas' },
];

export const LogisticaLayout: React.FC<LogisticaLayoutProps> = ({ children, activeTab }) => {
  const navigate = useNavigate();

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Tab Navigation */}
      <div className="border-b bg-background px-2 sm:px-4">
        <div className="flex gap-1 sm:gap-2 py-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};
