// Grupo expansível: um toque abre os elementos vinculados em lista ao lado do botão.
// A lista abre via portal direto no body, sempre acima de qualquer elemento da tela.
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
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
    tamanhos?: Record<string, { w: number; h: number }>;
  };
  const { blocos, estados, aplicarEstado, acionar } = usePainelBlocos();
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const painel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  const ids = cfg.vinculados ?? [];
  const filhos = ids.map((id) => blocos.find((b) => b.id === id)).filter(Boolean) as Bloco[];
  const direcao = cfg.direcao ?? "baixo";
  const colunas = Math.max(1, cfg.colunas ?? 1);
  const largura = cfg.larguraItem ?? 170;
  const altura = cfg.alturaItem ?? 68;
  const raio = typeof cfg.raio === "number" ? cfg.raio : 16;
  const Icon = iconePorNome(cfg.icone ?? bloco.icone);

  // Posição calculada a partir do botão, limitada à janela visível.
  const atualizarPos = useCallback(() => {
    const el = raiz.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const painelW = painel.current?.offsetWidth ?? colunas * largura + 24;
    const painelH = painel.current?.offsetHeight ?? altura + 24;
    const margem = 12;
    let left = r.left;
    let top = r.bottom + 8;
    if (direcao === "cima") top = r.top - painelH - 8;
    if (direcao === "direita") { left = r.right + 8; top = r.top; }
    if (direcao === "esquerda") { left = r.left - painelW - 8; top = r.top; }
    left = Math.min(Math.max(left, margem), Math.max(margem, window.innerWidth - painelW - margem));
    top = Math.min(Math.max(top, margem), Math.max(margem, window.innerHeight - painelH - margem));
    setPos({ left, top });
  }, [direcao, colunas, largura, altura]);

  useEffect(() => {
    if (!aberto) return;
    atualizarPos();
    // Recalcula depois do painel renderizar (medidas reais) e em mudanças de janela.
    const t = setTimeout(atualizarPos, 0);
    window.addEventListener("resize", atualizarPos);
    window.addEventListener("scroll", atualizarPos, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", atualizarPos);
      window.removeEventListener("scroll", atualizarPos, true);
    };
  }, [aberto, atualizarPos, filhos.length]);

  // Fecha ao tocar fora do grupo (botão ou painel).
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (raiz.current?.contains(alvo)) return;
      if (painel.current?.contains(alvo)) return;
      setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  useEffect(() => { if (edicao) setAberto(false); }, [edicao]);

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

      {aberto && !edicao && createPortal(
        <div
          ref={painel}
          data-cheio
          className="fixed z-[99999] rounded-2xl border border-border bg-card/95 p-2 shadow-xl backdrop-blur"
          style={{
            left: pos.left,
            top: pos.top,
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
                  <BlocoCardLazy bloco={f} estado={estados[f.id]} onAcionar={acionar} onEstado={aplicarEstado} />
                </div>
              );
            })}
          </Suspense>
        </div>,
        document.body,
      )}
    </div>
  );
}
