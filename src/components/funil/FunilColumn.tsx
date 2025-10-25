import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { FunilCard } from './FunilCard';
import { Deal, FunilStage } from '@/types/funil';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FunilColumnProps {
  id: FunilStage;
  title: string;
  deals: Deal[];
}

export function FunilColumn({ id, title, deals }: FunilColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  const totalValue = deals.reduce((sum, deal) => sum + deal.valor, 0);
  const dealCount = deals.length;

  return (
    <div className="flex flex-col min-w-[280px] w-[280px] flex-shrink-0">
      {/* Header da coluna */}
      <div className="mb-3 space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm uppercase text-muted-foreground">
            {title}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {dealCount}
          </Badge>
        </div>
        <div className="text-lg font-bold text-primary">
          R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
      </div>

      {/* Lista de cards */}
      <Card
        ref={setNodeRef}
        className={cn(
          'flex-1 p-3 bg-muted/30 min-h-[calc(100vh-280px)] transition-colors',
          isOver && 'bg-primary/5 border-primary'
        )}
      >
        <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
          {deals.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              Nenhum negócio nesta etapa
            </div>
          ) : (
            deals.map((deal) => (
              <FunilCard key={deal.id} deal={deal} />
            ))
          )}
        </SortableContext>
      </Card>
    </div>
  );
}
