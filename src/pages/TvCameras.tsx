// TV: mosaico 4x4 (16 câmeras) sem espaçamento, rotacionando a cada 10s
// entre os grupos de 16 quando houver mais câmeras no sistema.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { CameraLiveTile } from "@/components/cameras/CameraLiveTile";
import {
  Loader2,
  Camera as CameraIcon,
  ArrowLeft,
  X,
  ListOrdered,
  RotateCcw,
  Check,
  GripVertical,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableCameraRow({ id, index, nome }: { id: string; index: number; nome: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 px-3 py-2 bg-background">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing h-7 w-7 flex items-center justify-center rounded hover:bg-muted touch-none"
        title="Arrastar"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <span className="w-8 text-xs text-muted-foreground tabular-nums">{index + 1}.</span>
      <span className="flex-1 text-sm truncate">{nome}</span>
    </div>
  );
}


const PAGE_SIZE = 16;
const ROTATE_MS = 10_000;
const ORDER_KEY = "tv-cameras-order-v1";

export default function TvCameras() {
  const navigate = useNavigate();
  const [cams, setCams] = useState<any[] | null>(null);
  const [pageIdx, setPageIdx] = useState(0);
  const [zoomed, setZoomed] = useState<any | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draftOrder, setDraftOrder] = useState<any[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("cv_cameras")
        .select("id,nome,filial_id,ativo")
        .eq("ativo", true)
        .order("nome");
      const list = data ?? [];
      // Aplica ordem salva do usuário, se houver
      try {
        const raw = localStorage.getItem(ORDER_KEY);
        if (raw) {
          const savedIds: string[] = JSON.parse(raw);
          const map = new Map(list.map((c: any) => [c.id, c]));
          const ordered: any[] = [];
          savedIds.forEach((id) => {
            const c = map.get(id);
            if (c) {
              ordered.push(c);
              map.delete(id);
            }
          });
          map.forEach((c) => ordered.push(c));
          setCams(ordered);
          return;
        }
      } catch {}
      setCams(list);
    })();
  }, []);

  const pages = useMemo(() => {
    const list = cams ?? [];
    const chunks: any[][] = [];
    for (let i = 0; i < list.length; i += PAGE_SIZE) chunks.push(list.slice(i, i + PAGE_SIZE));
    return chunks.length ? chunks : [[]];
  }, [cams]);

  // Avanço manual: sem rotação automática por tempo.
  const nextPage = () => setPageIdx((i) => (pages.length ? (i + 1) % pages.length : 0));
  const prevPage = () => setPageIdx((i) => (pages.length ? (i - 1 + pages.length) % pages.length : 0));

  useEffect(() => {
    if (pageIdx >= pages.length) setPageIdx(0);
  }, [pages.length, pageIdx]);

  const openMenu = () => {
    setDraftOrder([...(cams ?? [])]);
    setMenuOpen(true);
  };

  const moveItem = (idx: number, delta: number) => {
    setDraftOrder((prev) => {
      if (!prev) return prev;
      const target = idx + delta;
      if (target < 0 || target >= prev.length) return prev;
      return arrayMove(prev, idx, target);
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDraftOrder((prev) => {
      if (!prev) return prev;
      const oldIndex = prev.findIndex((c) => c.id === active.id);
      const newIndex = prev.findIndex((c) => c.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };


  const resetOrder = () => {
    const sorted = [...(draftOrder ?? [])].sort((a, b) =>
      String(a.nome).localeCompare(String(b.nome), "pt-BR")
    );
    setDraftOrder(sorted);
  };

  const saveOrder = () => {
    if (draftOrder) {
      setCams(draftOrder);
      setPageIdx(0);
      try {
        localStorage.setItem(ORDER_KEY, JSON.stringify(draftOrder.map((c) => c.id)));
      } catch {}
    }
    setMenuOpen(false);
    setDraftOrder(null);
  };

  const cancelOrder = () => {
    setMenuOpen(false);
    setDraftOrder(null);
  };

  if (cams === null) {
    return (
      <div className="fixed inset-0 bg-black text-white flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando câmeras...
      </div>
    );
  }
  if (cams.length === 0) {
    return (
      <div className="fixed inset-0 bg-black text-white/70 flex flex-col items-center justify-center gap-2">
        <CameraIcon className="h-10 w-10 opacity-40" />
        <p className="text-sm">Nenhuma câmera ativa cadastrada</p>
      </div>
    );
  }

  const current = pages[pageIdx] ?? [];
  const slots = Array.from({ length: PAGE_SIZE }, (_, i) => current[i] ?? null);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <div className="w-full h-full grid gap-0 grid-cols-2 grid-rows-8 landscape:grid-cols-4 landscape:grid-rows-4 sm:grid-cols-3 sm:grid-rows-[repeat(6,minmax(0,1fr))] md:grid-cols-4 md:grid-rows-4">
        {slots.map((c, i) =>
          c ? (
            <div
              key={`${pageIdx}-${c.id}`}
              className="w-full h-full overflow-hidden cursor-zoom-in"
              onClick={() => setZoomed(c)}
            >
              <CameraLiveTile
                cameraId={c.id}
                cameraNome={c.nome}
                filialId={c.filial_id ?? null}
                startDelayMs={Math.min(i, 8) * 400}
                hideOverlays
                className="w-full h-full rounded-none border-0 pointer-events-none"
              />
            </div>
          ) : (
            <div key={`empty-${pageIdx}-${i}`} className="w-full h-full bg-black" />
          )
        )}
      </div>

      {zoomed && (
        <div
          ref={(el) => {
            if (!el) return;
            const tryFullscreen = () => {
              const anyEl = el as any;
              const req =
                el.requestFullscreen ||
                anyEl.webkitRequestFullscreen ||
                anyEl.msRequestFullscreen;
              if (req && !document.fullscreenElement) {
                try {
                  const p = req.call(el);
                  if (p && typeof p.then === "function") {
                    p.then(() => {
                      const so: any = (screen as any).orientation;
                      if (so && typeof so.lock === "function") {
                        so.lock("landscape").catch(() => {});
                      }
                    }).catch(() => {});
                  }
                } catch {}
              }
              // iOS Safari: só permite fullscreen no elemento <video>
              const video = el.querySelector("video") as any;
              if (video && !document.fullscreenElement) {
                if (typeof video.webkitEnterFullscreen === "function") {
                  try { video.webkitEnterFullscreen(); } catch {}
                }
              }
            };
            // aguarda o <video> montar antes de tentar iOS fullscreen
            tryFullscreen();
            setTimeout(tryFullscreen, 400);
          }}
          className="fixed inset-0 z-20 bg-black landscape:[&_video]:!object-cover [&_video]:w-full [&_video]:h-full [&_video]:object-contain"
          style={{ width: "100vw", height: "100dvh" }}
        >
          <CameraLiveTile
            key={`zoom-${zoomed.id}`}
            cameraId={zoomed.id}
            cameraNome={zoomed.nome}
            filialId={zoomed.filial_id ?? null}
            hideOverlays
            className="w-full h-full rounded-none border-0 !aspect-auto"
          />
          <button
            onClick={() => {
              try {
                const so: any = (screen as any).orientation;
                if (so && typeof so.unlock === "function") so.unlock();
              } catch {}
              if (document.fullscreenElement) {
                document.exitFullscreen?.().catch(() => {});
              }
              setZoomed(null);
            }}
            className="absolute top-3 right-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-black/60 hover:bg-black/80 text-white text-xs backdrop-blur-sm border border-white/10"
            title="Fechar zoom"
          >
            <X className="h-4 w-4" /> Fechar
          </button>
        </div>
      )}


      {!zoomed && (
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end max-w-[calc(100%-1rem)]">
          {pages.length > 1 && (
            <>
              <button
                onClick={prevPage}
                className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-md bg-white/90 text-black hover:bg-white text-xs sm:text-sm font-medium shadow-lg"
                title="Lote anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={nextPage}
                className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm font-medium shadow-lg"
                title="Próximo lote"
              >
                <span className="hidden xs:inline sm:inline">Próximas</span> <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
          <button
            onClick={openMenu}
            className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm font-medium shadow-lg"
            title="Sequência de exibição"
          >
            <ListOrdered className="h-4 w-4" /> <span className="hidden xs:inline sm:inline">Ordem</span>
          </button>
          <button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
            className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-md bg-white text-black hover:bg-white/90 text-xs sm:text-sm font-medium shadow-lg"
            title="Voltar"
          >
            <ArrowLeft className="h-4 w-4" /> <span className="hidden xs:inline sm:inline">Voltar</span>
          </button>
        </div>
      )}


      {pages.length > 1 && (
        <div className="absolute bottom-2 right-3 text-[11px] text-white/70 bg-black/50 px-2 py-0.5 rounded">
          Lote {pageIdx + 1}/{pages.length}
        </div>
      )}

      {menuOpen && draftOrder && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md max-h-[85vh] bg-background text-foreground rounded-lg border shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div>
                <h2 className="text-sm font-semibold">Sequência de exibição</h2>
                <p className="text-xs text-muted-foreground">Rotação pausada enquanto edita</p>
              </div>
              <button
                onClick={cancelOrder}
                className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted"
                title="Cancelar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <p className="px-3 pt-2 pb-1 text-[11px] text-muted-foreground">
                Arraste pelo ícone <GripVertical className="inline h-3 w-3 align-text-bottom" /> para reordenar
              </p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={draftOrder.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  <div className="divide-y">
                    {draftOrder.map((c, idx) => (
                      <SortableCameraRow key={c.id} id={c.id} index={idx} nome={c.nome} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t bg-muted/30">
              <button
                onClick={resetOrder}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border hover:bg-muted"
                title="Ordenar por nome (A→Z)"
              >
                <RotateCcw className="h-3.5 w-3.5" /> A→Z
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelOrder}
                  className="px-3 py-1.5 rounded-md text-xs border hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveOrder}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Check className="h-3.5 w-3.5" /> Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
