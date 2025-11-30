import { useState } from 'react';
import { 
  MapPin, MapPinOff, Car, Truck, Clock, Pause, Square, 
  CircleStop, AlertTriangle, AlertCircle, Ban, Timer,
  Navigation, Compass, Flag, Anchor, Target, Crosshair,
  Circle, CircleDot, Hexagon, Octagon, Triangle, Diamond,
  Star, Heart, Bookmark, Tag, Zap, Flame, Snowflake,
  Sun, Moon, Cloud, Umbrella, Wifi, WifiOff, Battery,
  BatteryLow, BatteryWarning, Package, Box, Archive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const AVAILABLE_ICONS = [
  { name: 'MapPin', icon: MapPin },
  { name: 'MapPinOff', icon: MapPinOff },
  { name: 'Car', icon: Car },
  { name: 'Truck', icon: Truck },
  { name: 'Clock', icon: Clock },
  { name: 'Pause', icon: Pause },
  { name: 'Square', icon: Square },
  { name: 'CircleStop', icon: CircleStop },
  { name: 'AlertTriangle', icon: AlertTriangle },
  { name: 'AlertCircle', icon: AlertCircle },
  { name: 'Ban', icon: Ban },
  { name: 'Timer', icon: Timer },
  { name: 'Navigation', icon: Navigation },
  { name: 'Compass', icon: Compass },
  { name: 'Flag', icon: Flag },
  { name: 'Anchor', icon: Anchor },
  { name: 'Target', icon: Target },
  { name: 'Crosshair', icon: Crosshair },
  { name: 'Circle', icon: Circle },
  { name: 'CircleDot', icon: CircleDot },
  { name: 'Hexagon', icon: Hexagon },
  { name: 'Octagon', icon: Octagon },
  { name: 'Triangle', icon: Triangle },
  { name: 'Diamond', icon: Diamond },
  { name: 'Star', icon: Star },
  { name: 'Heart', icon: Heart },
  { name: 'Bookmark', icon: Bookmark },
  { name: 'Tag', icon: Tag },
  { name: 'Zap', icon: Zap },
  { name: 'Flame', icon: Flame },
  { name: 'Snowflake', icon: Snowflake },
  { name: 'Sun', icon: Sun },
  { name: 'Moon', icon: Moon },
  { name: 'Cloud', icon: Cloud },
  { name: 'Umbrella', icon: Umbrella },
  { name: 'Wifi', icon: Wifi },
  { name: 'WifiOff', icon: WifiOff },
  { name: 'Battery', icon: Battery },
  { name: 'BatteryLow', icon: BatteryLow },
  { name: 'BatteryWarning', icon: BatteryWarning },
  { name: 'Package', icon: Package },
  { name: 'Box', icon: Box },
  { name: 'Archive', icon: Archive },
];

const AVAILABLE_COLORS = [
  { name: 'Amarelo', value: '#EAB308', bg: 'bg-yellow-500' },
  { name: 'Laranja', value: '#F97316', bg: 'bg-orange-500' },
  { name: 'Vermelho', value: '#DC2626', bg: 'bg-red-600' },
  { name: 'Verde', value: '#22C55E', bg: 'bg-green-500' },
  { name: 'Azul', value: '#3B82F6', bg: 'bg-blue-500' },
  { name: 'Roxo', value: '#8B5CF6', bg: 'bg-purple-500' },
  { name: 'Rosa', value: '#EC4899', bg: 'bg-pink-500' },
  { name: 'Ciano', value: '#06B6D4', bg: 'bg-cyan-500' },
  { name: 'Cinza', value: '#6B7280', bg: 'bg-gray-500' },
];

interface IconePickerProps {
  selectedIcon?: string;
  selectedColor?: string;
  onIconChange: (iconName: string) => void;
  onColorChange: (color: string) => void;
}

export function IconePicker({ selectedIcon, selectedColor, onIconChange, onColorChange }: IconePickerProps) {
  const [open, setOpen] = useState(false);
  
  const SelectedIconComponent = AVAILABLE_ICONS.find(i => i.name === selectedIcon)?.icon || MapPin;
  const currentColor = selectedColor || '#EAB308';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-14 w-14 p-0 flex items-center justify-center"
              style={{ backgroundColor: currentColor }}
            >
              <SelectedIconComponent className="h-7 w-7 text-white" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3 bg-popover border shadow-lg z-50" align="start">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Selecione um ícone</p>
                <div className="grid grid-cols-7 gap-1 max-h-48 overflow-y-auto">
                  {AVAILABLE_ICONS.map(({ name, icon: Icon }) => (
                    <button
                      key={name}
                      onClick={() => {
                        onIconChange(name);
                      }}
                      className={cn(
                        "p-2 rounded hover:bg-muted transition-colors",
                        selectedIcon === name && "bg-primary/20 ring-2 ring-primary"
                      )}
                      title={name}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Selecione uma cor</p>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_COLORS.map(({ name, value, bg }) => (
                    <button
                      key={value}
                      onClick={() => {
                        onColorChange(value);
                      }}
                      className={cn(
                        "w-8 h-8 rounded-full transition-all",
                        bg,
                        selectedColor === value && "ring-2 ring-offset-2 ring-primary"
                      )}
                      title={name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        <div className="text-sm">
          <p className="font-medium">{selectedIcon || 'MapPin'}</p>
          <p className="text-muted-foreground text-xs">
            {AVAILABLE_COLORS.find(c => c.value === currentColor)?.name || 'Amarelo'}
          </p>
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Clique no ícone para personalizar
      </p>
    </div>
  );
}

export { AVAILABLE_ICONS, AVAILABLE_COLORS };
