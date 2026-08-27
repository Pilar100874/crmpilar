import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Camera, CheckCircle2 } from "lucide-react";
import type { PhotoAngle } from "@/components/cv/CVPhotoCapture";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  angles: PhotoAngle[];
  capturedKeys: string[];
  /** Chamado antes de rolar até o uploader (ex.: voltar para a etapa de fotos) */
  onIrParaFotos?: (angleKey: string) => void;
}

export function FotosPendentesDialog({ open, onOpenChange, angles, capturedKeys, onIrParaFotos }: Props) {
  const requiredAngles = angles.filter((a) => a.required);
  const pendentes = requiredAngles.filter((a) => !capturedKeys.includes(a.key));

  const irPara = (key: string) => {
    onOpenChange(false);
    onIrParaFotos?.(key);
    setTimeout(() => {
      const el = document.getElementById(`angle-${key}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-destructive");
        setTimeout(() => el.classList.remove("ring-2", "ring-destructive"), 2500);
      }
    }, 150);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Fotos obrigatórias pendentes
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Não é possível finalizar enquanto houver fotos obrigatórias sem captura.
        </p>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {requiredAngles.map((a) => {
            const ok = capturedKeys.includes(a.key);
            return (
              <div
                key={a.key}
                className={`flex items-center justify-between gap-2 rounded-md border p-2.5 ${
                  ok ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {ok ? (
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  ) : (
                    <Camera className="h-4 w-4 text-destructive shrink-0" />
                  )}
                  <span className="text-sm truncate">{a.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={ok ? "outline" : "destructive"} className="text-[10px]">
                    {ok ? "Capturada" : "Pendente"}
                  </Badge>
                  {!ok && (
                    <Button size="sm" variant="outline" onClick={() => irPara(a.key)}>
                      Tirar foto
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          {pendentes.length > 0 && (
            <Button onClick={() => irPara(pendentes[0].key)}>
              <Camera className="h-4 w-4 mr-2" /> Ir para a primeira pendente
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
