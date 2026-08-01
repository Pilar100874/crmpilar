import React from 'react';
import { Fuel, Ban } from 'lucide-react';

interface CorteCombustivelBadgeProps {
  corte?: boolean | null;
  /** compact = apenas o ícone */
  compact?: boolean;
  className?: string;
}

/**
 * Símbolo padrão de corte/liberação de combustível usado nas telas de logística.
 */
export const CorteCombustivelBadge: React.FC<CorteCombustivelBadgeProps> = ({
  corte,
  compact,
  className = '',
}) => {
  if (typeof corte !== 'boolean') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground ${className}`}
        title="Sem informação de combustível"
      >
        <Fuel className="h-3 w-3" />
        {!compact && 'Sem sinal'}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
        corte
          ? 'bg-red-500/15 text-red-600 dark:text-red-400'
          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
      } ${className}`}
      title={corte ? 'Corte de combustível ativo' : 'Combustível liberado'}
    >
      <span className="relative inline-flex h-3 w-3 items-center justify-center">
        <Fuel className="h-3 w-3" />
        {corte && (
          <Ban className="absolute -inset-0.5 h-4 w-4 text-current" />
        )}
      </span>
      {!compact && (corte ? 'Corte de combustível' : 'Combustível liberado')}
    </span>
  );
};

export default CorteCombustivelBadge;
