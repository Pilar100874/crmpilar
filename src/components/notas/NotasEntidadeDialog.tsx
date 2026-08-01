import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NotasWorkspace } from "./NotasWorkspace";

interface NotasEntidadeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entidadeTipo: "empresa" | "contato" | "kb_artigo";
  entidadeId: string;
  entidadeNome?: string;
}

export function NotasEntidadeDialog({
  open,
  onOpenChange,
  entidadeTipo,
  entidadeId,
  entidadeNome,
}: NotasEntidadeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Notas {entidadeNome ? `— ${entidadeNome}` : ""}</DialogTitle>
        </DialogHeader>
        {open && (
          <NotasWorkspace
            entidadeTipo={entidadeTipo}
            entidadeId={entidadeId}
            entidadeNome={entidadeNome}
            className="lg:grid-cols-[240px_1fr_220px]"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
