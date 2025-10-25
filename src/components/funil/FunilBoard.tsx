import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { FunilColumn } from './FunilColumn';
import { FunilCard } from './FunilCard';
import { Deal, FunilStage, FunilColumn as FunilColumnType } from '@/types/funil';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface FunilBoardProps {
  columns: FunilColumnType[];
  onDealMove: (dealId: string, newStage: FunilStage) => void;
}

export function FunilBoard({ columns, onDealMove }: FunilBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const dealId = active.id as string;
    const newStage = over.id as FunilStage;

    // Verifica se é uma coluna válida
    const validStages: FunilStage[] = ['lead', 'qualificacao', 'proposta', 'negociacao', 'fechamento'];
    if (validStages.includes(newStage)) {
      onDealMove(dealId, newStage);
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  // Encontra o deal ativo para o DragOverlay
  const activeDeal = activeId
    ? columns.flatMap(col => col.deals).find(deal => deal.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {columns.map((column) => (
            <FunilColumn
              key={column.id}
              id={column.id}
              title={column.title}
              deals={column.deals}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay>
        {activeDeal ? <FunilCard deal={activeDeal} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
