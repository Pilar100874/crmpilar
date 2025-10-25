import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Deal } from '@/types/funil';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Calendar, DollarSign, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FunilCardProps {
  deal: Deal;
}

export function FunilCard({ deal }: FunilCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const saudeColors = {
    verde: 'bg-green-500',
    amarelo: 'bg-yellow-500',
    vermelho: 'bg-red-500',
  };

  const statusColors = {
    normal: 'border-border',
    vencido: 'border-red-500',
    parado: 'border-gray-400',
    urgente: 'border-orange-500',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50'
      )}
    >
      <Card className={cn(
        'p-3 mb-2 hover:shadow-md transition-shadow border-l-4',
        deal.status ? statusColors[deal.status] : 'border-l-primary'
      )}>
        <div className="space-y-2">
          {/* Header com nome e saúde */}
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm flex-1 line-clamp-1">
              {deal.cliente}
            </h4>
            {deal.saude && (
              <div className={cn(
                'w-2 h-2 rounded-full flex-shrink-0 mt-1',
                saudeColors[deal.saude]
              )} />
            )}
          </div>

          {/* Valor */}
          <div className="flex items-center gap-1 text-primary font-bold text-base">
            <DollarSign className="w-4 h-4" />
            {deal.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>

          {/* Data estimada */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {new Date(deal.dataEstimada).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
            })}
          </div>

          {/* Responsável */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="w-3 h-3" />
            {deal.responsavel}
          </div>

          {/* Alertas e badges */}
          <div className="flex flex-wrap gap-1 pt-1">
            {deal.diasParado && deal.diasParado > 3 && (
              <Badge variant="outline" className="text-xs gap-1 bg-orange-50 text-orange-700 border-orange-200">
                <Clock className="w-3 h-3" />
                {deal.diasParado}d parado
              </Badge>
            )}
            {deal.status === 'urgente' && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertCircle className="w-3 h-3" />
                Urgente
              </Badge>
            )}
            {deal.tags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
