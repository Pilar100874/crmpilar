// Popup para posicionar e redimensionar livremente os itens que abrem no grupo expansível.
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bloco } from "@/lib/automacao/api";
import { iconePorNome } from "@/lib/automacao/icones";
import { cn } from "@/lib/utils";

export interface PosicaoItem { x: number; y: number; w: number; h: number }

interface Props {
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
  grupo: Partial<Bloco> | null;
  filhos: Bloco[];
  posicoes: Record<string, PosicaoItem>;
  onSalvar: (p: Record<string, PosicaoItem>) => void;
}

const AREA_W = 900;
const AREA_H = 520;
const ORIGEM_X = 60;
const ORIGEM_Y = 60;

export default function ExpansivelPosicoesDialog({ aberto, onOpenChange, grupo, filhos, posicoes, onSalvar }: Props) {
  const [itens, setItens] = useState<Record<string, PosicaoItem>>({});
  const [ativo, setAtivo] = useState<string | null>(null);
  const arraste = useRef<{ id: string; modo: "mover" | "tamanho"; px: number; py: number; base: PosicaoItem } | null>(null);

  const gw = grupo?.w ?? 170;
  const gh = grupo?.h ?? 68;
  const Icone = iconePorNome(((grupo?.config ?? {}) as any)?.icone ?? grupo?.icone);

  // Monta o estado inicial: usa o que já foi salvo, senão distribui abaixo do botão.
  useEffect(() => {
    if (!aberto) return;
    const base: Record<string, PosicaoItem> = {};
    filhos.forEach((f, i) => {
      const salvo = posicoes[f.id];
      base[f.id] = salvo ?? { x: (i % 3) * (f.w + 12), y: gh + 12 + Math.floor(i / 3) * (f.h + 12), w: f.w, h: f.h };
    });
    setItens(base);
    setAtivo(null);
  }, [aberto, filhos, posicoes, gh]);

  useEffect(() => {
    if (!arraste.current && !ativo) return;
    const mover = (e: PointerEvent) => {
      const a = arraste.current;
      if (!a) return;
      const dx = e.clientX - a.px;
      const dy = e.clientY - a.py;
      setItens((prev) => {
        const at = prev[a.id];
        if (!at) return prev;
        const novo: PosicaoItem =
          a.modo === "mover"
            ? { ...at, x: Math.round(a.base.x + dx), y: Math.round(a.base.y + dy) }
            : { ...at, w: Math.max(40, Math.round(a.base.w + dx)), h: Math.max(32, Math.round(a.base.h + dy)) };
        return { ...prev, [a.id]: novo };
      });
    };
    const soltar = () => { arraste.current = null; };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    return () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
    };
  }, [ativo]);

  const iniciar = (e: React.PointerEvent, id: string, modo: "mover" | "tamanho") => {
    e.preventDefault();
    e.stopPropagation();
    setAtivo(id);
    arraste.current = { id, modo, px: e.clientX, py: e.clientY, base: { ...itens[id] } };
  };

  const alterarCampo = (id: string, campo: keyof PosicaoItem, valor: number) =>
    setItens((p) => ({ ...p, [id]: { ...p[id], [campo]: valor } }));

  const sel = ativo ? itens[ativo] : null;

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Posição dos itens que abrem</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Arraste cada item para onde ele deve aparecer em relação ao botão e use o canto inferior direito para mudar o tamanho.
        </p>

        <div className="flex gap-3">
          <div className="max-h-[60vh] flex-1 overflow-auto rounded-lg border bg-muted/30">
            <div className="relative" style={{ width: AREA_W, height: AREA_H }}>
              {/* Botão do grupo, como referência fixa */}
              <div
                className="absolute flex items-center gap-2 rounded-xl border-2 border-primary bg-card px-3 text-sm font-semibold shadow"
                style={{ left: ORIGEM_X, top: ORIGEM_Y, width: gw, height: gh }}
              >
                <Icone className="h-5 w-5 text-primary" />
                <span className="truncate">{grupo?.nome || "Grupo"}</span>
              </div>

              {filhos.map((f) => {
                const p = itens[f.id];
                if (!p) return null;
                const IconeF = iconePorNome(f.icone);
                return (
                  <div
                    key={f.id}
                    onPointerDown={(e) => iniciar(e, f.id, "mover")}
                    className={cn(
                      "absolute flex cursor-move select-none items-center gap-2 overflow-hidden rounded-lg border bg-card px-2 text-xs shadow-sm",
                      ativo === f.id ? "border-primary ring-2 ring-primary/40" : "border-border",
                    )}
                    style={{ left: ORIGEM_X + p.x, top: ORIGEM_Y + p.y, width: p.w, height: p.h }}
                  >
                    <IconeF className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{f.nome}</span>
                    <span
                      onPointerDown={(e) => iniciar(e, f.id, "tamanho")}
                      className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize rounded-tl bg-primary"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-52 shrink-0 space-y-2">
            {!filhos.length && <p className="text-xs text-muted-foreground">Vincule elementos primeiro.</p>}
            {sel && ativo && (
              <div className="space-y-2 rounded-lg border p-2">
                <p className="truncate text-xs font-semibold">{filhos.find((f) => f.id === ativo)?.nome}</p>
                {(["x", "y", "w", "h"] as const).map((c) => (
                  <label key={c} className="flex items-center gap-2 text-xs">
                    <span className="w-16 text-muted-foreground">
                      {c === "x" ? "Esquerda" : c === "y" ? "Topo" : c === "w" ? "Largura" : "Altura"}
                    </span>
                    <input
                      type="number"
                      value={sel[c]}
                      onChange={(e) => alterarCampo(ativo, c, Number(e.target.value))}
                      className="h-8 w-full rounded-md border bg-background px-2"
                    />
                  </label>
                ))}
              </div>
            )}
            {!sel && !!filhos.length && (
              <p className="text-xs text-muted-foreground">Toque em um item para ajustar os números.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => { onSalvar(itens); onOpenChange(false); }}>Salvar posições</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
