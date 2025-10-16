import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Preview3DDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designDataUrl: string;
}

const Preview3DDialog = ({ open, onOpenChange, designDataUrl }: Preview3DDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Pré-visualização 3D</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-lg">
          {designDataUrl ? (
            <img 
              src={designDataUrl} 
              alt="Design Preview" 
              className="max-w-full max-h-[500px] object-contain"
            />
          ) : (
            <p className="text-muted-foreground">Nenhum design disponível</p>
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Preview3DDialog;
