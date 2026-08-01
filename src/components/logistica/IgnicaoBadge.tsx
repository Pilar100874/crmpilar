import React from 'react';
import { KeyRound, Power } from 'lucide-react';

interface IgnicaoBadgeProps {
  ignicao?: boolean | null;
  /** compact = apenas o ícone */
  compact?: boolean;
  className?: string;
}

/**
 * Símbolo padrão de ignição (carro ligado/desligado) usado em todas as telas de logística.
 */
export const IgnicaoBadge: React.FC<IgnicaoBadgeProps> = ({ ignicao, compact, className = '' }) => {
  if (typeof ignicao !== 'boolean') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground ${className}`}
        title="Sem informação de ignição"
      >
        <Power className="h-3 w-3" />
        {!compact && 'Sem sinal'}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
        ignicao
          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
          : 'bg-muted text-muted-foreground'
      } ${className}`}
      title={ignicao ? 'Ignição ligada' : 'Ignição desligada'}
    >
      {ignicao ? <KeyRound className="h-3 w-3" /> : <Power className="h-3 w-3" />}
      {!compact && (ignicao ? 'Ligado' : 'Desligado')}
    </span>
  );
};

export default IgnicaoBadge;
