import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface CutLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onConfirm?: (position: number) => void;
  onApply?: (position: number) => Promise<void>;
}

export const CutLineDialog = ({ open, onOpenChange, imageUrl, onConfirm, onApply }: CutLineDialogProps) => {
  const [position, setPosition] = React.useState(50);

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(position);
    }
    if (onApply) {
      onApply(position);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar Linha de Corte</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Posição da linha de corte (%)</Label>
            <Slider
              value={[position]}
              onValueChange={([val]) => setPosition(val)}
              min={0}
              max={100}
              step={1}
            />
            <p className="text-sm text-muted-foreground mt-1">{position}%</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm}>
              Aplicar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
