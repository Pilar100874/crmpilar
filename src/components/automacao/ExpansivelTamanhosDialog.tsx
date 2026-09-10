// Ajuste visual do tamanho de cada item do grupo expansível: arraste o canto para redimensionar.
import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BlocoCard from "@/components/automacao/BlocoCard";
import { Bloco } from "@/lib/automacao/api";

export type Tamanhos = Record<string, { w?: number; h?: number }>;

interface Props {
  aberto: boolean;
  onFechar: () => void;
  itens: Bloco[];
  colunas: number;
  larguraPadrao: number;
  alturaPadrao: number;
  tamanhos: Tamanhos;
  onChange: (t: Tamanhos) => void;
}

export default function ExpansivelTamanhosDialog({
  aberto, onFechar, itens, colunas, larguraPadrao, alturaPadrao, tamanhos, onChange,
}: Props) {
  const [arrastando, setArrastando] = useState<string | null>(null);
  const inicio = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const tamanhoDe = (id: string) => ({
    w: tamanhos[id]?.w ?? larguraPadrao,
    h: tamanhos[id]?.h ?? alturaPadrao,
  });

  const definir = (id: string, w: number, h: number) => {
    onChange({
      ...tamanhos,
      [id]: {
        w: Math.max(60, Math.min(800, Math.round(w))),
        h: Math.max(36, Math.min(600, Math.round(h))),
      },
    });
  };

  const iniciar = (e: React.PointerEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const atual = tamanhoDe(id);
    inicio.current = { x: e.clientX, y: e.clientY, w: atual.w, h: atual.h };
    setArrastando(id);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const mover = (e: React.PointerEvent, id: string) => {
    if (arrastando !== id || !inicio.current) return;
    definir(id, inicio.current.w + (e.clientX - inicio.current.x), inicio.current.h + (e.clientY - inicio.current.y));
  };

  const soltar = () => { setArrastando(null); inicio.current = null; };

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>Ajustar tamanho dos itens</DialogTitle></DialogHeader>

        <p className="text-xs text-muted-foreground">
          Arraste o canto inferior direito de cada item para mudar largura e altura. O desenho abaixo é igual ao que aparece na tela.
        </p>

        <div className="rounded-xl border bg-muted/20 p-3">
          <div
            className="inline-grid items-start gap-2 rounded-2xl border border-border bg-card/95 p-2 shadow-sm"
            style={{ gridTemplateColumns: `repeat(${Math.max(1, colunas)}, max-content)` }}
          >
            {!itens.length && (
              <p className="px-2 py-3 text-xs text-muted-foreground">Nenhum elemento vinculado ainda.</p>
            )}
            {itens.map((b) => {
              const t = tamanhoDe(b.id);
              return (
                <div
                  key={b.id}
                  className="relative rounded-lg ring-1 ring-primary/30"
                  style={{ width: t.w, height: t.h }}
                >
                  <div className="pointer-events-none h-full w-full overflow-hidden">
                    <BlocoCard bloco={b} ligado={null} onEstado={() => {}} onAcionar={() => {}} />
                  </div>
                  <span className="pointer-events-none absolute -top-2 left-2 rounded bg-background px-1 text-[10px] text-muted-foreground">
                    {t.w}×{t.h}
                  </span>
                  <div
                    role="presentation"
                    onPointerDown={(e) => iniciar(e, b.id)}
                    onPointerMove={(e) => mover(e, b.id)}
                    onPointerUp={soltar}
                    onPointerCancel={soltar}
                    className="absolute -bottom-1 -right-1 h-4 w-4 cursor-se-resize rounded-sm border border-background bg-primary shadow"
                    title="Arraste para redimensionar"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {itens.length > 0 && (
          <div className="space-y-1 rounded-md border p-2">
            <Label className="text-xs">Valores exatos</Label>
            {itens.map((b) => {
              const t = tamanhoDe(b.id);
              return (
                <div key={b.id} className="flex items-center gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate">{b.nome}</span>
                  <Input
                    type="number" min={60} max={800} value={t.w}
                    onChange={(e) => definir(b.id, Number(e.target.value) || larguraPadrao, t.h)}
                    className="h-7 w-20 px-2 text-xs"
                  />
                  <span className="text-muted-foreground">×</span>
                  <Input
                    type="number" min={36} max={600} value={t.h}
                    onChange={(e) => definir(b.id, t.w, Number(e.target.value) || alturaPadrao)}
                    className="h-7 w-20 px-2 text-xs"
                  />
                  <Button
                    variant="ghost" size="sm" className="h-7 text-[11px]"
                    onClick={() => {
                      const proximo = { ...tamanhos };
                      delete proximo[b.id];
                      onChange(proximo);
                    }}
                  >
                    Padrão
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button onClick={onFechar}>Concluir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
