import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapLayer } from './MapLayerTypes';
import { 
  Building2, 
  DollarSign, 
  Users, 
  Wallet, 
  Store, 
  Truck,
  Layers,
  Info
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MapLayerControlProps {
  layers: MapLayer[];
  onLayerToggle: (layerId: string) => void;
  compact?: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  Building2: <Building2 className="h-4 w-4" />,
  DollarSign: <DollarSign className="h-4 w-4" />,
  Users: <Users className="h-4 w-4" />,
  Wallet: <Wallet className="h-4 w-4" />,
  Store: <Store className="h-4 w-4" />,
  Truck: <Truck className="h-4 w-4" />
};

const MapLayerControl: React.FC<MapLayerControlProps> = ({ layers, onLayerToggle, compact = false }) => {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {layers.map((layer) => (
          <TooltipProvider key={layer.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onLayerToggle(layer.id)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                    layer.visible
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                  style={{
                    borderLeft: `3px solid ${layer.color}`
                  }}
                >
                  <span style={{ color: layer.visible ? 'inherit' : layer.color }}>
                    {iconMap[layer.icon]}
                  </span>
                  {layer.name}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{layer.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg p-3 shadow-lg">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b">
        <Layers className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm">Camadas do Mapa</span>
      </div>
      <ScrollArea className="h-auto max-h-[300px]">
        <div className="space-y-3">
          {layers.map((layer) => (
            <div 
              key={layer.id} 
              className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
            >
              <Switch
                id={`layer-${layer.id}`}
                checked={layer.visible}
                onCheckedChange={() => onLayerToggle(layer.id)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: layer.color }}
                  />
                  <Label 
                    htmlFor={`layer-${layer.id}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {layer.name}
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-[200px] text-xs">{layer.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {layer.description}
                </p>
              </div>
              <span style={{ color: layer.color }}>
                {iconMap[layer.icon]}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default MapLayerControl;
