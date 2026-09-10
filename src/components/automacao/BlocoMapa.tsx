import { useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2 } from "lucide-react";
import { LazyLogisticaMap } from "@/components/logistica/LazyLogisticaMap";
import { Bloco } from "@/lib/automacao/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  bloco: Bloco;
  edicao?: boolean;
  onAcionar?: () => void;
}

export default function BlocoMapa({ bloco, edicao, onAcionar }: Props) {
  const cfg = (bloco.config ?? {}) as { lat?: number; lng?: number; zoom?: number; permitir_ampliar?: boolean };
  const lat = Number(cfg.lat ?? -23.5505);
  const lng = Number(cfg.lng ?? -46.6333);
  const podeAmpliar = cfg.permitir_ampliar !== false;
  const [ampliado, setAmpliado] = useState(false);

  const alternar = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (edicao || !podeAmpliar) return;
    setAmpliado((v) => !v);
    onAcionar?.();
  };

  const mapa = (
    <LazyLogisticaMap
      center={[lat, lng]}
      zoom={Number(cfg.zoom ?? 15)}
      currentMarker={{ lat, lng, color: "#3b82f6", label: bloco.nome }}
      disableInteraction={false}
      compactIcons
      className="h-full w-full"
    />
  );

  const conteudo = (
    <div className="h-full rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
      <div
        className={cn(
          "flex items-center justify-between gap-2 px-3 py-2 text-sm font-semibold select-none",
          !edicao && podeAmpliar && "cursor-pointer hover:bg-muted/40 transition-colors"
        )}
        onClick={alternar}
        title={podeAmpliar ? "Toque para ampliar" : undefined}
      >
        <span className="truncate">{bloco.nome}</span>
        {!ampliado && podeAmpliar && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={(e) => { e.stopPropagation(); setAmpliado(true); onAcionar?.(); }}
            title="Ampliar"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <div className="flex-1 min-h-0">{mapa}</div>
    </div>
  );

  if (!ampliado) return conteudo;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black p-4 flex flex-col"
      onClick={(e) => { if (e.target === e.currentTarget) { e.stopPropagation(); setAmpliado(false); onAcionar?.(); } }}
    >
      <div className="relative flex-1 min-h-0 overflow-hidden rounded-2xl border border-border bg-card">
        {conteudo}
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-4 right-4 z-20 h-10 w-10 rounded-full bg-black/70 text-white hover:bg-black/90"
          onClick={(e) => { e.stopPropagation(); setAmpliado(false); onAcionar?.(); }}
          title="Voltar ao painel"
        >
          <Minimize2 className="h-5 w-5" />
        </Button>
      </div>
    </div>,
    document.body
  );
}
