// Grupo expansível: um toque abre os elementos vinculados ao lado do botão.
import { Suspense, lazy, useEffect, useRef, useState } from "react";
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

  // Fecha ao tocar fora do grupo.
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

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

      {aberto && !edicao && livre && (
        <div
          data-cheio
          className="absolute z-[1400]"
          style={{ left: -bloco.x, top: -bloco.y, width: 0, height: 0 }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {!filhos.length && (
            <p className="absolute w-56 rounded-lg border border-border bg-card px-2 py-3 text-xs text-muted-foreground shadow"
               style={{ left: bloco.x, top: bloco.y + bloco.h + 8 }}>
              Nenhum elemento vinculado ainda.
            </p>
          )}
          <Suspense fallback={null}>
            {filhos.map((f) => (
              <div key={f.id} className="absolute" style={{ left: f.x, top: f.y, width: f.w, height: f.h }}>
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
      )}

      {aberto && !edicao && !livre && (
        <div
          data-cheio
          className="absolute z-[1400] rounded-2xl border border-border bg-card/95 p-2 shadow-xl backdrop-blur"
          style={{ ...posicao, display: "grid", gridTemplateColumns: `repeat(${colunas}, ${largura}px)`, gap: 8 }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {!filhos.length && (
            <p className="px-2 py-3 text-xs text-muted-foreground">Nenhum elemento vinculado ainda.</p>
          )}
          <Suspense fallback={null}>
            {filhos.map((f) => (
              <div key={f.id} style={{ width: largura, height: altura }}>
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
      )}
    </div>
  );
}
