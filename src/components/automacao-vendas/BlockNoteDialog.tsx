import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface BlockNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentNote: string;
  onSave: (note: string) => void;
}

export function BlockNoteDialog({
  open,
  onOpenChange,
  currentNote,
  onSave,
}: BlockNoteDialogProps) {
  const [note, setNote] = useState(currentNote);

  useEffect(() => {
    if (open) {
      setNote(currentNote);
    }
  }, [open, currentNote]);

  const handleSave = () => {
    onSave(note);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nota do Bloco</DialogTitle>
          <DialogDescription>
            Adicione uma nota para documentar este bloco.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="note">Nota</Label>
            <Textarea
              id="note"
              placeholder="Digite sua nota aqui..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
