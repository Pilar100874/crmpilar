import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { GripVertical, Trash2 } from "lucide-react";

interface CustomField {
  id: string;
  label: string;
  type: string;
  options?: string[];
  required?: boolean;
  locked?: boolean;
  searchable?: boolean;
}

interface SortableFieldItemProps {
  field: CustomField;
  onRemove: (fieldId: string) => void;
  onToggleSearchable: (fieldId: string) => void;
}

export const SortableFieldItem = ({ field, onRemove, onToggleSearchable }: SortableFieldItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 border border-border rounded-lg bg-background"
    >
      <div
        {...(field.locked ? {} : attributes)}
        {...(field.locked ? {} : listeners)}
        className={field.locked ? "cursor-not-allowed opacity-40" : "cursor-grab active:cursor-grabbing"}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium">{field.label}</span>
          <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
            {field.type}
          </span>
          {field.required && (
            <Badge variant="secondary" className="text-xs">Obrigatório</Badge>
          )}
          {field.locked && (
            <Badge variant="outline" className="text-xs">Não removível</Badge>
          )}
        </div>
        {field.options && (
          <div className="text-xs text-muted-foreground mb-2">
            Opções: {field.options.join(", ")}
          </div>
        )}
        {!field.locked && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`searchable-${field.id}`}
              checked={field.searchable || false}
              onCheckedChange={() => onToggleSearchable(field.id)}
            />
            <Label
              htmlFor={`searchable-${field.id}`}
              className="text-sm font-normal cursor-pointer"
            >
              Usar na pesquisa
            </Label>
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(field.id)}
        className="text-destructive hover:text-destructive"
        disabled={field.locked}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};
