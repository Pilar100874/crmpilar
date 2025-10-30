import { useState } from "react";
import { Orcamento, OrcamentoEtapa } from "@/types/orcamento";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import OrcamentoCard from "./OrcamentoCard";

interface Column {
  id: OrcamentoEtapa;
  title: string;
  color: string;
  orcamentos: Orcamento[];
}

interface OrcamentoBoardProps {
  columns: Column[];
  onOrcamentoMove: (orcamentoId: string, newEtapa: OrcamentoEtapa) => void;
  onOrcamentoClick: (orcamento: Orcamento) => void;
  onOrcamentoDelete?: (orcamentoId: string) => void;
  etapas?: { id: string; title: string; color: string; }[];
}

export default function OrcamentoBoard({ columns, onOrcamentoMove, onOrcamentoClick, onOrcamentoDelete, etapas }: OrcamentoBoardProps) {
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

    const activeOrcamentoId = active.id as string;
    const overColumnId = over.id as OrcamentoEtapa;

    // Find the orcamento in columns
    const activeOrcamento = columns
      .flatMap(col => col.orcamentos)
      .find(o => o.id === activeOrcamentoId);

    if (activeOrcamento && activeOrcamento.etapa !== overColumnId) {
      onOrcamentoMove(activeOrcamentoId, overColumnId);
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeOrcamento = activeId 
    ? columns.flatMap(col => col.orcamentos).find(o => o.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <ScrollArea className="h-full">
        <div className="flex gap-4 p-4 min-w-max">
          {columns.map((column) => (
            <div key={column.id} className="w-80 flex-shrink-0">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <span 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: column.color }}
                      />
                      {column.title}
                    </h3>
                    <Badge variant="secondary">{column.orcamentos.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <SortableContext
                    items={column.orcamentos.map(o => o.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {column.orcamentos.map((orcamento) => (
                        <OrcamentoCard
                          key={orcamento.id}
                          orcamento={orcamento}
                          onClick={() => onOrcamentoClick(orcamento)}
                          onDelete={onOrcamentoDelete}
                          onEtapaChange={onOrcamentoMove}
                          etapas={etapas}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </ScrollArea>

      <DragOverlay>
        {activeOrcamento && (
          <OrcamentoCard orcamento={activeOrcamento} />
        )}
      </DragOverlay>
    </DndContext>
  );
}
