import React from 'react';
import { Button } from '@/components/ui/button';
import { Route, Eraser } from 'lucide-react';
import { cn } from '@/lib/utils';

export const OPCOES_TRILHA = [
  { valor: 0, rotulo: 'Sem trilha' },
  { valor: 5, rotulo: '5 min' },
  { valor: 15, rotulo: '15 min' },
  { valor: 30, rotulo: '30 min' },
  { valor: 60, rotulo: '1 hora' },
  { valor: 180, rotulo: '3 horas' },
];

interface TrilhaFocoControlsProps {
  minutos: number;
  onMinutosChange: (minutos: number) => void;
  onLimpar: () => void;
  className?: string;
  compacto?: boolean;
}

/** Controle de trilha (histórico recente) do veículo em foco no mapa */
export const TrilhaFocoControls: React.FC<TrilhaFocoControlsProps> = ({
  minutos,
  onMinutosChange,
  onLimpar,
  className,
  compacto = false,
}) => {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center gap-1 rounded-xl border border-border bg-background/95 px-2 py-1 backdrop-blur-md">
        <Route className="h-4 w-4 text-muted-foreground" />
        <select
          value={minutos}
          onChange={(e) => onMinutosChange(Number(e.target.value))}
          className={cn(
            'bg-transparent text-foreground outline-none',
            compacto ? 'text-xs' : 'text-sm',
          )}
          title="Duração da trilha exibida no modo foco"
          aria-label="Duração da trilha"
        >
          {OPCOES_TRILHA.map((o) => (
            <option key={o.valor} value={o.valor} className="bg-background text-foreground">
              {o.rotulo}
            </option>
          ))}
        </select>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onLimpar}
        title="Limpar trilha do mapa"
        className="h-9 rounded-xl bg-background/95 backdrop-blur-md"
      >
        <Eraser className="h-4 w-4" />
      </Button>
    </div>
  );
};
