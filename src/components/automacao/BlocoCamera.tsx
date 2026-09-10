import { useState } from "react";
import { createPortal } from "react-dom";
import { CameraLiveTile } from "@/components/cameras/CameraLiveTile";
import { Camera as CameraIcon, Maximize2, X } from "lucide-react";
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
  const cfg = (bloco.config ?? {}) as {
    camera_id?: string;
    filial_id?: string | null;
    permitir_ampliar?: boolean;
    permitir_interacao?: boolean;
    mostrar_barra?: boolean;
    transparente?: boolean;
  };
  const podeAmpliar = cfg.permitir_ampliar !== false;
  const interativo = cfg.permitir_interacao !== false;
  const mostrarBarra = cfg.mostrar_barra !== false;

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
    if (edicao || !podeAmpliar || !interativo) return;
    setAmpliado((v) => !v);
    onAcionar?.();
  };

  const tile = (
    <CameraLiveTile
      cameraId={cfg.camera_id}
      cameraNome={bloco.nome}
      filialId={cfg.filial_id ?? null}
      className={cn("h-full w-full", ampliado && "h-screen w-screen rounded-none", !interativo && "pointer-events-none")}
    />
  );

  const fechar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAmpliado(false);
  };

  return (
    <>
      {!ampliado && (
        <div
          className={cn(
            "relative h-full rounded-2xl overflow-hidden",
            cfg.transparente ? "border border-transparent bg-transparent" : "border border-border bg-card"
          )}
        >
          {tile}
          {mostrarBarra && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent px-3 py-2 text-sm font-semibold text-white select-none">
              <span className="truncate">{bloco.nome}</span>
              {podeAmpliar && !edicao && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="pointer-events-auto h-6 w-6 shrink-0 text-white hover:bg-white/20"
                  onClick={(e) => { e.stopPropagation(); setAmpliado(true); onAcionar?.(); }}
                  title="Ampliar"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
          {!edicao && podeAmpliar && interativo && (
            <div
              className="absolute inset-0 z-10 cursor-pointer"
              onClick={alternar}
              title="Toque para ampliar"
            />
          )}
        </div>
      )}

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
