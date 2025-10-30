import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings2, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface TableColumn {
  id: string;
  label: string;
  visible: boolean;
  width: number;
  locked?: boolean;
}

interface SortableColumnItemProps {
  column: TableColumn;
  onToggle: (id: string) => void;
}

function SortableColumnItem({ column, onToggle }: SortableColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id, disabled: column.locked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors"
    >
      {!column.locked && (
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      
      <Checkbox
        id={column.id}
        checked={column.visible}
        onCheckedChange={() => onToggle(column.id)}
        disabled={column.locked}
      />
      
      <label
        htmlFor={column.id}
        className="flex-1 text-sm font-medium cursor-pointer"
      >
        {column.label}
      </label>
      
      {column.locked && (
        <span className="text-xs text-muted-foreground">(fixo)</span>
      )}
    </div>
  );
}

interface TableColumnsConfigProps {
  columns: TableColumn[];
  onColumnsChange: (columns: TableColumn[]) => void;
  fieldsConfigComponent?: React.ReactNode;
}

export function TableColumnsConfig({ columns, onColumnsChange, fieldsConfigComponent }: TableColumnsConfigProps) {
  const [open, setOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex((col) => col.id === active.id);
      const newIndex = columns.findIndex((col) => col.id === over.id);
      onColumnsChange(arrayMove(columns, oldIndex, newIndex));
    }
  };

  const handleToggleColumn = (id: string) => {
    const updatedColumns = columns.map(col =>
      col.id === id ? { ...col, visible: !col.visible } : col
    );
    onColumnsChange(updatedColumns);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="w-4 h-4" />
          Configurações
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[900px] overflow-auto">
        <SheetHeader>
          <SheetTitle>Configurações</SheetTitle>
        </SheetHeader>
        
        <Tabs defaultValue="columns" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="columns">Colunas da Tabela</TabsTrigger>
            <TabsTrigger value="fields">Campos de Contato</TabsTrigger>
          </TabsList>
          
          <TabsContent value="columns" className="space-y-4 mt-6">
            <p className="text-sm text-muted-foreground">
              Selecione quais colunas exibir e arraste para reordenar
            </p>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={columns.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {columns.map((column) => (
                    <SortableColumnItem
                      key={column.id}
                      column={column}
                      onToggle={handleToggleColumn}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </TabsContent>
          
          <TabsContent value="fields" className="mt-6">
            {fieldsConfigComponent}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
