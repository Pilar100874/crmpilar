import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Maximize2, Minus, Plus, RotateCcw, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  titulo: string;
  imagem: string | null;
  carregando: boolean;
  erro: string | null;
  destaque?: boolean;
  onExpandir?: () => void;
  /** Botões sobrepostos (abrir portão / porta). */
  children?: React.ReactNode;
}

const MIN = 1;
const MAX = 6;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Tile de vídeo com zoom (roda do mouse / pinça) e arrasto. */
export default function InterfoneTile({ titulo, imagem, carregando, erro, destaque, onExpandir, children }: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const estado = useRef({ zoom: 1, pos: { x: 0, y: 0 } });
  estado.current = { zoom, pos };
  const arrasto = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const aplicarZoom = useCallback((proximo: number, px: number, py: number) => {
    const { zoom: z, pos: p } = estado.current;
    const alvo = clamp(proximo, MIN, MAX);
    const k = alvo / z;
    setZoom(alvo);
    setPos(alvo === 1 ? { x: 0, y: 0 } : { x: px - (px - p.x) * k, y: py - (py - p.y) * k });
  }, []);

  const zoomRef = useRef(aplicarZoom);
  zoomRef.current = aplicarZoom;

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const rect = el.getBoundingClientRect();
      zoomRef.current(estado.current.zoom * Math.exp(-dy * 0.0018), e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const centro = () => {
    const r = boxRef.current?.getBoundingClientRect();
    return { x: (r?.width ?? 0) / 2, y: (r?.height ?? 0) / 2 };
  };

  return (
    <div className={`relative overflow-hidden rounded-xl border bg-card ${destaque ? "ring-2 ring-primary/40" : ""}`}>
      <div
        ref={boxRef}
        className="relative aspect-video select-none bg-muted touch-none"
        style={{ cursor: zoom > 1 ? "grab" : "default" }}
        onPointerDown={(e) => {
          if (zoom <= 1) return;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          arrasto.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
        }}
        onPointerMove={(e) => {
          const a = arrasto.current;
          if (!a) return;
          setPos({ x: a.ox + (e.clientX - a.x), y: a.oy + (e.clientY - a.y) });
        }}
        onPointerUp={() => {
          arrasto.current = null;
        }}
        onDoubleClick={(e) => {
          const rect = boxRef.current!.getBoundingClientRect();
          zoomRef.current(zoom > 1 ? 1 : 2.5, e.clientX - rect.left, e.clientY - rect.top);
        }}
      >
        {imagem ? (
          <img
            src={imagem}
            alt={titulo}
            draggable={false}
            className="h-full w-full object-contain"
            style={{
              transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
              transition: arrasto.current ? "none" : "transform 80ms linear",
            }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
            {carregando ? <Loader2 className="h-9 w-9 animate-spin" /> : <Video className="h-9 w-9" />}
            <p className="text-sm">{erro || (carregando ? "Conectando..." : "Sem imagem")}</p>
          </div>
        )}

        {/* Título */}
        <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-background/80 px-2 py-1 text-xs font-semibold">
          {titulo}
        </span>
        {imagem && carregando && (
          <span className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          </span>
        )}

        {/* Controles de zoom */}
        <div className="absolute right-2 bottom-2 flex gap-1">
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 bg-background/85"
            onClick={() => {
              const c = centro();
              zoomRef.current(zoom - 0.5, c.x, c.y);
            }}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 bg-background/85"
            onClick={() => {
              const c = centro();
              zoomRef.current(zoom + 0.5, c.x, c.y);
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 bg-background/85"
            onClick={() => {
              setZoom(1);
              setPos({ x: 0, y: 0 });
            }}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          {onExpandir && (
            <Button size="icon" variant="secondary" className="h-8 w-8 bg-background/85" onClick={onExpandir}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Botões sobrepostos (acionamentos) */}
        {children && (
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-2 bg-gradient-to-t from-background/85 to-transparent p-2 pr-32">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
