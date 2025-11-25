import { useState, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { Node } from "@xyflow/react";

interface AutomacaoPropertiesPanelProps {
  node: Node;
  onUpdate: (nodeId: string, data: any) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}

export const AutomacaoPropertiesPanel = ({
  node,
  onUpdate,
  onDelete,
  onClose,
}: AutomacaoPropertiesPanelProps) => {
  const [label, setLabel] = useState((node.data as any).label || "");
  const [note, setNote] = useState((node.data as any).note || "");

  useEffect(() => {
    setLabel((node.data as any).label || "");
    setNote((node.data as any).note || "");
  }, [node]);

  const handleLabelChange = (newLabel: string) => {
    setLabel(newLabel);
    onUpdate(node.id, { label: newLabel });
  };

  const handleNoteChange = (newNote: string) => {
    setNote(newNote);
    onUpdate(node.id, { note: newNote });
  };

  return (
    <div className="w-80 border-l border-border flex flex-col bg-card shadow-lg h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/5 to-primary/10">
        <h3 className="font-bold text-sm text-foreground">Propriedades</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Tipo do bloco */}
          <div>
            <Label className="text-xs text-muted-foreground">Tipo de Bloco</Label>
            <div className="mt-1 font-medium text-sm">
              {((node.data as any).type || "").replace(/_/g, " ")}
            </div>
          </div>

          {/* Label */}
          <div>
            <Label htmlFor="label">Rótulo do Bloco</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="Nome do bloco"
              className="mt-1"
            />
          </div>

          {/* Nota */}
          <div>
            <Label htmlFor="note">Nota (Opcional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder="Adicione uma nota sobre este bloco..."
              className="mt-1"
              rows={3}
            />
          </div>

          {/* Botão deletar */}
          <div className="pt-4 border-t border-border">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(node.id)}
              className="w-full"
            >
              Excluir Bloco
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
