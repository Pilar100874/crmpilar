import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface TemplateSelectionDialogProps {
  open: boolean;
  onSelect: (templateUrl: string) => void;
  onCancel: () => void;
  gabaritoCanvasUrl: string | null;
  gabaritoCanvasRetangularUrl: string | null;
}

export const TemplateSelectionDialog = ({
  open,
  onSelect,
  onCancel,
  gabaritoCanvasUrl,
  gabaritoCanvasRetangularUrl,
}: TemplateSelectionDialogProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-[600px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Selecione o Gabarito</DialogTitle>
          <DialogDescription>
            Escolha o gabarito que deseja usar para o seu design. É obrigatório selecionar um gabarito para continuar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {gabaritoCanvasUrl && (
            <Card
              className={`cursor-pointer overflow-hidden transition-all hover:scale-105 ${
                selectedTemplate === gabaritoCanvasUrl ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelectedTemplate(gabaritoCanvasUrl)}
            >
              <div className="aspect-square bg-muted/20 relative">
                <img
                  src={gabaritoCanvasUrl}
                  alt="Gabarito Canvas Personalizado"
                  className="w-full h-full object-contain p-4"
                />
                {selectedTemplate === gabaritoCanvasUrl && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center">
                    ✓
                  </div>
                )}
              </div>
              <div className="p-3 text-center">
                <p className="font-medium text-sm">Gabarito Canvas Personalizado</p>
              </div>
            </Card>
          )}

          {gabaritoCanvasRetangularUrl && (
            <Card
              className={`cursor-pointer overflow-hidden transition-all hover:scale-105 ${
                selectedTemplate === gabaritoCanvasRetangularUrl ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelectedTemplate(gabaritoCanvasRetangularUrl)}
            >
              <div className="aspect-square bg-muted/20 relative">
                <img
                  src={gabaritoCanvasRetangularUrl}
                  alt="Gabarito Canvas Retangular"
                  className="w-full h-full object-contain p-4"
                />
                {selectedTemplate === gabaritoCanvasRetangularUrl && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center">
                    ✓
                  </div>
                )}
              </div>
              <div className="p-3 text-center">
                <p className="font-medium text-sm">Gabarito Canvas Retangular</p>
              </div>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedTemplate}>
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
