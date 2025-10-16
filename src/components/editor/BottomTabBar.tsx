import { Button } from "@/components/ui/button";
import {
  LayoutTemplate,
  Image,
  Type,
  Shapes,
  Sticker,
  Sparkles,
  Layers,
  Home,
  BookText,
  QrCode,
} from "lucide-react";

interface BottomTabBarProps {
  activePanel: string;
  onPanelChange: (panel: string) => void;
}

const BottomTabBar = ({ activePanel, onPanelChange }: BottomTabBarProps) => {
  const tabs = [
    { id: 'design', icon: Home, label: 'Início' },
    { id: 'templates', icon: LayoutTemplate, label: 'Modelos' },
    { id: 'text-templates', icon: BookText, label: 'Texto' },
    { id: 'images', icon: Image, label: 'Imagens' },
    { id: 'text', icon: Type, label: 'Texto' },
    { id: 'shapes', icon: Shapes, label: 'Formas' },
    { id: 'elements', icon: Sticker, label: 'Elementos' },
    { id: 'barcode', icon: QrCode, label: 'Códigos' },
    { id: 'ai', icon: Sparkles, label: 'IA' },
    { id: 'layers', icon: Layers, label: 'Camadas' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-md border-t border-border shadow-lg z-50 lg:hidden">
      <div className="flex items-center justify-center h-full px-1 overflow-x-auto overflow-y-hidden scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activePanel === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onPanelChange(tab.id)}
              className="flex flex-col items-center justify-center gap-1 min-w-[70px] flex-shrink-0 py-2 group px-2"
            >
              <div className={`
                p-2 rounded-xl transition-all duration-300 ease-in-out
                ${isActive 
                  ? 'bg-primary text-primary-foreground shadow-lg scale-110' 
                  : 'text-muted-foreground group-hover:bg-accent group-hover:text-accent-foreground'
                }
              `}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={`
                text-[9px] font-medium truncate max-w-full transition-colors duration-300 whitespace-nowrap
                ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}
              `}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomTabBar;
