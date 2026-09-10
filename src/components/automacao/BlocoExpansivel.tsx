// Grupo expansível: um toque abre os elementos vinculados ao lado do botão.
import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Bloco } from "@/lib/automacao/api";
import { usePainelBlocos } from "@/lib/automacao/painelBlocos";
import { iconePorNome } from "@/lib/automacao/icones";

// Carregamento tardio evita a dependência circular com o cartão genérico.
const BlocoCardLazy = lazy(() => import("./BlocoCard"));

type Direcao = "baixo" | "cima" | "direita" | "esquerda";

interface Props {
  bloco: Bloco;
  edicao?: boolean;
}

export default function BlocoExpansivel({ bloco, edicao }: Props) {
  const cfg = (bloco.config ?? {}) as {
    icone?: string;
    vinculados?: string[];
    direcao?: Direcao;
    colunas?: number;
    larguraItem?: number;
    alturaItem?: number;
    corFundo?: string;
    corTexto?: string;
    transparente?: boolean;
    raio?: number;
    subtitulo?: string;
    layout?: "livre" | "grade";
    posicoes?: Record<string, { x: number; y: number; w: number; h: number }>;
    tamanhos?: Record<string, { w: number; h: number }>;
  };
  const { blocos, estados, aplicarEstado, acionar } = usePainelBlocos();
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  const ids = cfg.vinculados ?? [];
  const filhos = ids.map((id) => blocos.find((b) => b.id === id)).filter(Boolean) as Bloco[];
  const direcao = cfg.direcao ?? "baixo";
  const colunas = Math.max(1, cfg.colunas ?? 1);
  const largura = cfg.larguraItem ?? 170;
  const altura = cfg.alturaItem ?? 68;
  const raio = typeof cfg.raio === "number" ? cfg.raio : 16;
  const livre = (cfg.layout ?? "livre") === "livre";
  const Icon = iconePorNome(cfg.icone ?? bloco.icone);

  // Posição real do botão na tela e escala aplicada pelo painel.
  const [ancora, setAncora] = useState({ left: 0, top: 0, height: 0, escala: 1 });
  const medir = useCallback(() => {
    const r = raiz.current?.getBoundingClientRect();
    if (!r) return;
    setAncora({ left: r.left, top: r.top, height: r.height, escala: bloco.w ? r.width / bloco.w : 1 });
  }, [bloco.w]);

  useLayoutEffect(() => { if (aberto) medir(); }, [aberto, medir]);
  useEffect(() => {
    if (!aberto) return;
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, true);
    return () => {
      window.removeEventListener("resize", medir);
      window.removeEventListener("scroll", medir, true);
    };
  }, [aberto, medir]);

  // Fecha ao tocar fora do grupo (apenas no modo em grade, que abre junto ao botão).
  useEffect(() => {
    if (!aberto || (cfg.layout ?? "livre") === "livre") return;
    const fora = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto, cfg.layout]);

  useEffect(() => { if (edicao) setAberto(false); }, [edicao]);

  const posicao =
    direcao === "cima" ? { bottom: "calc(100% + 8px)", left: 0 } :
    direcao === "direita" ? { left: "calc(100% + 8px)", top: 0 } :
    direcao === "esquerda" ? { right: "calc(100% + 8px)", top: 0 } :
    { top: "calc(100% + 8px)", left: 0 };

  return (
    <div ref={raiz} className="relative h-full w-full">
      <button
        onClick={(e) => { e.stopPropagation(); if (!edicao) setAberto((v) => !v); }}
        onPointerDown={(e) => !edicao && e.stopPropagation()}
        className={cn(
          "flex h-full w-full items-center gap-3 px-3 text-left transition-all active:scale-[0.98]",
          !cfg.transparente && !cfg.corFundo && "border border-border bg-card shadow-sm",
        )}
        style={{
          borderRadius: raio,
          background: cfg.transparente ? "transparent" : cfg.corFundo || undefined,
          color: cfg.corTexto || undefined,
        }}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{bloco.nome}</span>
          <span className="block truncate text-xs opacity-70">
            {cfg.subtitulo || `${filhos.length} ${filhos.length === 1 ? "item" : "itens"}`}
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-70 transition-transform", aberto && "rotate-180")} />
      </button>

      {aberto && !edicao && livre && createPortal(
        (() => {
          // Posições definidas no popup (relativas ao botão) ou as do próprio painel.
          const itens = filhos.map((f) => ({
            f,
            p: cfg.posicoes?.[f.id] ?? { x: f.x - bloco.x, y: f.y - bloco.y, w: f.w, h: f.h },
          }));
          const minX = Math.min(0, ...itens.map((i) => i.p.x));
          const minY = Math.min(0, ...itens.map((i) => i.p.y));
          const maxX = Math.max(0, ...itens.map((i) => i.p.x + i.p.w));
          const maxY = Math.max(0, ...itens.map((i) => i.p.y + i.p.h));
          const margem = 24;
          const dispW = Math.max(120, window.innerWidth - margem * 2);
          const dispH = Math.max(120, window.innerHeight - margem * 2);
          // Nunca deixa o conjunto maior que a janela.
          const esc = Math.min(
            ancora.escala || 1,
            dispW / Math.max(1, maxX - minX),
            dispH / Math.max(1, maxY - minY),
          );
          const larg = (maxX - minX) * esc;
          const alt = (maxY - minY) * esc;
          const baseLeft = Math.min(
            Math.max(margem, ancora.left + minX * esc),
            Math.max(margem, window.innerWidth - larg - margem),
          );
          const baseTop = Math.min(
            Math.max(margem, ancora.top + minY * esc),
            Math.max(margem, window.innerHeight - alt - margem),
          );
          return (
            <div
              data-cheio
              className="fixed inset-0 z-[1400] bg-background/40 backdrop-blur-[2px]"
              onClick={() => setAberto(false)}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {!filhos.length && (
                <p className="absolute w-56 rounded-lg border border-border bg-card px-2 py-3 text-xs text-muted-foreground shadow"
                   style={{ left: baseLeft, top: baseTop }}>
                  Nenhum elemento vinculado ainda.
                </p>
              )}
              <Suspense fallback={null}>
                {itens.map(({ f, p }) => (
                  <div
                    key={f.id}
                    className="absolute origin-top-left"
                    style={{
                      left: baseLeft + (p.x - minX) * esc,
                      top: baseTop + (p.y - minY) * esc,
                      width: p.w,
                      height: p.h,
                      transform: `scale(${esc})`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <BlocoCardLazy
                      bloco={f}
                      ligado={estados[f.id] ?? null}
                      onEstado={(v) => aplicarEstado(f, v)}
                      onAcionar={() => acionar?.(f)}
                    />
                  </div>
                ))}
              </Suspense>
            </div>
          );
        })(),
        document.body,
      )}

      {aberto && !edicao && !livre && (
        <div
          data-cheio
          className="absolute z-[1400] rounded-2xl border border-border bg-card/95 p-2 shadow-xl backdrop-blur"
          style={{
            ...posicao,
            display: "grid",
            gridTemplateColumns: `repeat(${colunas}, ${Math.max(
              largura,
              ...filhos.map((f) => cfg.tamanhos?.[f.id]?.w ?? 0),
            )}px)`,
            gap: 8,
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {!filhos.length && (
            <p className="px-2 py-3 text-xs text-muted-foreground">Nenhum elemento vinculado ainda.</p>
          )}
          <Suspense fallback={null}>
            {filhos.map((f) => {
              const t = cfg.tamanhos?.[f.id];
              return (
                <div key={f.id} style={{ width: t?.w ?? largura, height: t?.h ?? altura }}>
                  <BlocoCardLazy
                    bloco={f}
                    ligado={estados[f.id] ?? null}
                    onEstado={(v) => aplicarEstado(f, v)}
                    onAcionar={() => acionar?.(f)}
                  />
                </div>
              );
            })}
          </Suspense>
        </div>
      )}
    </div>
  );
}
