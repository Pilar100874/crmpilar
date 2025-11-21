import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface BlockNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentNote?: string;
  onSave: (note: string) => void;
}

export const BlockNoteDialog = ({ open, onOpenChange, currentNote, onSave }: BlockNoteDialogProps) => {
  const [note, setNote] = useState(currentNote || "");

  useEffect(() => {
    setNote(currentNote || "");
  }, [currentNote, open]);

  const handleSave = () => {
    onSave(note);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nota do Bloco</DialogTitle>
          <DialogDescription>
            Adicione contexto e explicações para este bloco
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Digite a nota aqui..."
          rows={6}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Nota
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
