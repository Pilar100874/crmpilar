import { useState } from "react";
import { createPortal } from "react-dom";
import { CameraLiveTile } from "@/components/cameras/CameraLiveTile";
import { Camera as CameraIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Bloco } from "@/lib/automacao/api";

interface Props {
  bloco: Bloco;
  edicao?: boolean;
  onAcionar?: () => void;
}

export default function BlocoCamera({ bloco, edicao, onAcionar }: Props) {
  const [ampliado, setAmpliado] = useState(false);
  const cfg = (bloco.config ?? {}) as { camera_id?: string; filial_id?: string | null };

  if (!cfg.camera_id) {
    return (
      <div className="h-full rounded-2xl border border-border bg-card flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <CameraIcon className="h-6 w-6 opacity-50" />
        <p className="text-xs">Escolha uma câmera na configuração</p>
      </div>
    );
  }

  const alternar = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (edicao) return;
    setAmpliado((v) => !v);
    onAcionar?.();
  };

  const tile = (
    <CameraLiveTile
      cameraId={cfg.camera_id}
      cameraNome={bloco.nome}
      filialId={cfg.filial_id ?? null}
      className={cn("h-full w-full", ampliado && "h-screen w-screen rounded-none")}
    />
  );

  const fechar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAmpliado(false);
  };

  return (
    <>
      <div
        className={cn(
          "relative h-full rounded-2xl border border-border bg-card overflow-hidden",
          ampliado && "invisible"
        )}
      >
        {tile}
        {!edicao && (
          <div
            className="absolute inset-0 z-10 cursor-pointer"
            onClick={alternar}
            title="Toque para ampliar"
          />
        )}
      </div>

      {ampliado &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
            onClick={alternar}
          >
            <div className="relative h-screen w-screen">
              {tile}
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-4 right-4 z-20 h-10 w-10 rounded-full bg-black/70 text-white hover:bg-black/90"
                onClick={fechar}
                title="Voltar ao painel"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
