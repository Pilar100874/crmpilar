import { useCallback, useEffect, useState, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "atendimento_painel_detalhes_largura";
const DEFAULT_WIDTH = 340;
const MIN_WIDTH = 300;
const MAX_WIDTH = 520;

function initialWidth() {
  if (typeof window === "undefined") return DEFAULT_WIDTH;
  const stored = Number(window.localStorage.getItem(STORAGE_KEY));
  return Number.isFinite(stored) ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, stored)) : DEFAULT_WIDTH;
}

interface AtendimentoDetailsSidebarProps {
  children: ReactNode;
  className?: string;
  fixedWidth?: number;
}

export function AtendimentoDetailsSidebar({ children, className, fixedWidth }: AtendimentoDetailsSidebarProps) {
  const [width, setWidth] = useState(initialWidth);
  const [resizing, setResizing] = useState(false);

  const stopResize = useCallback(() => setResizing(false), []);

  useEffect(() => {
    if (!resizing) return;
    const resize = (event: PointerEvent) => {
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - event.clientX));
      setWidth(next);
      window.localStorage.setItem(STORAGE_KEY, String(next));
    };
    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", stopResize, { once: true });
    return () => {
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", stopResize);
    };
  }, [resizing, stopResize]);

  return (
    <aside
      className={cn("relative flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-l border-border bg-card", className)}
      style={{ width: fixedWidth ?? width }}
      aria-label="Cadastro e vínculos"
    >
      {!fixedWidth && <button
        type="button"
        aria-label="Ajustar largura do painel"
        title="Arraste para ajustar a largura"
        onPointerDown={(event) => {
          event.preventDefault();
          setResizing(true);
        }}
        className="absolute inset-y-0 left-0 z-20 flex w-3 cursor-col-resize touch-none items-center justify-center text-muted-foreground opacity-0 transition-opacity hover:bg-muted/70 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <GripVertical className="h-4 w-4" />
      </button>}
      {children}
    </aside>
  );
}
