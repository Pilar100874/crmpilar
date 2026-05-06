import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Home,
  LayoutTemplate,
  Image,
  Type,
  Shapes,
  Sticker,
  Sparkles,
  Layers,
  BookText,
  QrCode,
} from "lucide-react";

interface DesktopSidebarProps {
  activePanel: string;
  onPanelChange: (panel: string) => void;
}

const DesktopSidebar = ({ activePanel, onPanelChange }: DesktopSidebarProps) => {
  const tools = [
    { id: 'design', icon: Home, label: 'Início' },
    { id: 'templates', icon: LayoutTemplate, label: 'Modelos' },
    { id: 'text-templates', icon: BookText, label: 'Modelos de Texto' },
    { id: 'images', icon: Image, label: 'Imagens' },
    { id: 'text', icon: Type, label: 'Texto' },
    { id: 'shapes', icon: Shapes, label: 'Formas' },
    { id: 'elements', icon: Sticker, label: 'Elementos' },
    { id: 'barcode', icon: QrCode, label: 'Códigos' },
    { id: 'ai', icon: Sparkles, label: 'IA' },
  ];

  return (
    <div className="fixed md:static right-0 top-1/2 md:top-0 -translate-y-1/2 md:translate-y-0 
                    flex md:hidden lg:flex w-12 md:w-16 lg:w-20 bg-card border-l md:border-r md:border-l-0 
                    border-border flex-col items-center py-6 gap-2 md:gap-3 rounded-l-2xl md:rounded-none 
                    shadow-lg md:shadow-none z-50">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activePanel === tool.id;
        
        return (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`
                  w-12 h-12 lg:w-14 lg:h-14 rounded-xl transition-all duration-300 ease-in-out
                  ${isActive 
                    ? 'bg-primary text-primary-foreground shadow-lg scale-110 hover:bg-primary/90' 
                    : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground hover:scale-105'
                  }
                `}
                onClick={() => onPanelChange(tool.id)}
              >
                <Icon className="h-5 w-5 lg:h-6 lg:w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-popover text-popover-foreground border shadow-md z-[9999]">
              <p>{tool.label}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
      
      {/* Separator */}
      <div className="w-10 h-px bg-border my-2" />
      
      {/* Layers button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`
              w-12 h-12 lg:w-14 lg:h-14 rounded-xl transition-all duration-300 ease-in-out
              ${activePanel === 'layers' 
                ? 'bg-primary text-primary-foreground shadow-lg scale-110 hover:bg-primary/90' 
                : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground hover:scale-105'
              }
            `}
            onClick={() => onPanelChange('layers')}
          >
            <Layers className="h-5 w-5 lg:h-6 lg:w-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-popover text-popover-foreground border shadow-md z-[9999]">
          <p>Camadas</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default DesktopSidebar;
