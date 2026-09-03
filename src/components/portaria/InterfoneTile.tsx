// Tile de imagem do interfone/câmeras com zoom (roda do mouse), arrastar e tela cheia.
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Maximize2, Minus, Plus, RotateCcw, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  titulo: string;
  imagem: string | null;
  carregando?: boolean;
  erro?: string | null;
  destaque?: boolean;
  esticado?: boolean;
  acoes?: ReactNode;
  className?: string;
}

const MIN = 1;
const MAX = 6;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function InterfoneTile({ titulo, imagem, carregando, erro, destaque, esticado, acoes, className }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const estado = useRef({ zoom: 1, pos: { x: 0, y: 0 } });
  estado.current = { zoom, pos };

  const aplicar = useCallback((proximo: number, px: number, py: number) => {
    const { zoom: z, pos: o } = estado.current;
    const next = clamp(proximo, MIN, MAX);
    const k = next / z;
    const nx = px - (px - o.x) * k;
    const ny = py - (py - o.y) * k;
    setZoom(next);
    setPos(next === 1 ? { x: 0, y: 0 } : { x: nx, y: ny });
  }, []);

  const wheelRef = useRef<(e: WheelEvent) => void>(() => undefined);
  wheelRef.current = (e: WheelEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    aplicar(estado.current.zoom * Math.exp(-dy * 0.0015), e.clientX - rect.left, e.clientY - rect.top);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelRef.current(e);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const arrasto = useRef<{ x: number; y: number; ox: number; oy: number; movido?: boolean } | null>(null);

  const zoomBotao = (fator: number) => {
    const el = ref.current;
    const rect = el?.getBoundingClientRect();
    aplicar(estado.current.zoom * fator, (rect?.width ?? 0) / 2, (rect?.height ?? 0) / 2);
  };

  const telaCheia = () => {
    const el = ref.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  return (
    <div className={cn("rounded-xl border bg-card overflow-hidden", esticado && "h-full min-h-0", destaque && "ring-2 ring-primary/40", className)}>
      <div
        ref={ref}
        className={cn("relative bg-muted overflow-hidden select-none touch-none", esticado ? "h-full" : "aspect-video")}
        style={{ cursor: zoom > 1 ? "grab" : "zoom-in" }}
        onDoubleClick={(e) => {
          const rect = ref.current?.getBoundingClientRect();
          aplicar(zoom > 1 ? 1 : 2.5, e.clientX - (rect?.left ?? 0), e.clientY - (rect?.top ?? 0));
        }}
        onPointerDown={(e) => {
          arrasto.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y, movido: false };
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          const a = arrasto.current;
          if (!a) return;
          if (Math.abs(e.clientX - a.x) > 6 || Math.abs(e.clientY - a.y) > 6) {
            arrasto.current = { ...a, movido: true };
            if (zoom > 1) setPos({ x: a.ox + (e.clientX - a.x), y: a.oy + (e.clientY - a.y) });
          }
        }}
        onPointerUp={(e) => {
          const a = arrasto.current;
          arrasto.current = null;
          // Clique (sem arraste): alterna zoom no ponto clicado
          if (a && !a.movido) {
            const rect = ref.current?.getBoundingClientRect();
            aplicar(zoom > 1 ? 1 : 2.5, e.clientX - (rect?.left ?? 0), e.clientY - (rect?.top ?? 0));
          }
        }}
      >
        {imagem ? (
          <img
            src={imagem}
            alt={`Imagem de ${titulo}`}
            draggable={false}
            className="h-full w-full object-cover"
            style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom})`, transformOrigin: "0 0" }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
            {carregando ? <Loader2 className="h-8 w-8 animate-spin" /> : <Video className="h-8 w-8 opacity-50" />}
            <p className="text-xs">{erro || (carregando ? "Capturando imagem..." : "Sem imagem")}</p>
          </div>
        )}

        <div className="absolute bottom-2 left-2 flex items-center gap-2">
          <span className="text-sm font-semibold text-black drop-shadow-[0_1px_2px_rgba(255,255,255,0.6)]">{titulo}</span>
          {imagem && carregando && (
            <span className="rounded-full bg-background/80 p-1">
              <Loader2 className="h-3 w-3 animate-spin" />
            </span>
          )}
        </div>

        <div className="absolute top-2 right-2 flex items-center gap-1">
          <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => zoomBotao(1.4)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => zoomBotao(1 / 1.4)}>
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-7 w-7"
            onClick={() => {
              setZoom(1);
              setPos({ x: 0, y: 0 });
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="secondary" className="h-7 w-7" onClick={telaCheia}>
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {acoes && (
          <div className="absolute bottom-0 inset-x-0 flex flex-wrap gap-2 bg-gradient-to-t from-background/85 to-transparent p-2">
            {acoes}
          </div>
        )}
      </div>
    </div>
  );
}

export default InterfoneTile;
