import React from 'react';
import { Car, ChevronLeft, ChevronRight } from 'lucide-react';
import { VeiculoComStatus } from '@/types/logistica';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VehicleLegendProps {
  veiculos: VeiculoComStatus[];
  selectedId?: string | null;
  onVeiculoClick: (id: string) => void;
}

const statusDot = {
  movendo: 'bg-green-500',
  parado: 'bg-amber-500',
  offline: 'bg-gray-400',
};

export const VehicleLegend: React.FC<VehicleLegendProps> = ({ veiculos, selectedId, onVeiculoClick }) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const list = veiculos.filter(v => v.ultima_posicao);
  if (list.length === 0) return null;

  return (
    <div className="absolute top-2 right-2 z-[500] pointer-events-auto">
      <div className="bg-background/95 backdrop-blur border border-border shadow-lg rounded-lg overflow-hidden">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-xs font-semibold border-b hover:bg-accent"
        >
          <div className="flex items-center gap-1.5">
            <Car className="h-3.5 w-3.5" />
            Veículos ({list.length})
          </div>
          {collapsed ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        {!collapsed && (
          <ScrollArea className="max-h-[50vh] w-52">
            <div className="p-1">
              {list.map(v => {
                const motorista = v.motorista_atual?.nome || v.motorista;
                const isSel = selectedId === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => onVeiculoClick(v.id)}
                    className={cn(
                      'w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-accent transition-colors',
                      isSel && 'bg-primary/10 ring-1 ring-primary'
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full flex-shrink-0', statusDot[v.status])} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{v.placa}</div>
                      {motorista && (
                        <div className="text-[10px] text-muted-foreground truncate">{motorista}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default VehicleLegend;
