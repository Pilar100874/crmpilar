import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface WorkflowCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  nameLabel?: string;
  namePlaceholder?: string;
  descriptionLabel?: string;
  descriptionPlaceholder?: string;
  confirmLabel?: string;
  onConfirm: (data: { name: string; description: string }) => void;
}

export function WorkflowCreateDialog({
  open,
  onOpenChange,
  title = "Novo Workflow",
  description = "Dê um nome e uma descrição antes de começar.",
  nameLabel = "Nome",
  namePlaceholder = "Ex: Meu novo workflow",
  descriptionLabel = "Descrição",
  descriptionPlaceholder = "Descreva o objetivo deste workflow (opcional)",
  confirmLabel = "Criar",
  onConfirm,
}: WorkflowCreateDialogProps) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setDesc("");
    }
  }, [open]);

  const handleConfirm = () => {
    if (!name.trim()) return;
    onConfirm({ name: name.trim(), description: desc.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{nameLabel}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={namePlaceholder}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) handleConfirm();
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>{descriptionLabel}</Label>
            <Textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={descriptionPlaceholder}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!name.trim()} onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
