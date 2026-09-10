// Bloco de página web: embute um site inteiro dentro do painel.
import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Globe, Lock, LockOpen, RefreshCw } from "lucide-react";
import { Bloco } from "@/lib/automacao/api";
import { fonteCss } from "./BlocoTexto";

interface ConfigWeb {
  url?: string;
  titulo?: string;
  mostrar_barra?: boolean;
  permitir_interacao?: boolean;
  /** Zoom da página dentro do quadro (100 = tamanho normal). */
  zoom?: number;
  /** Recarrega sozinho a cada X segundos (0 = nunca). */
  recarregar?: number;
  cor?: string;
  fundo?: string;
  transparente?: boolean;
  cantos?: number;
  fonte?: string;
}

function normalizarUrl(url?: string) {
  const u = (url || "").trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}

export default function BlocoWeb({ bloco, edicao }: { bloco: Bloco; edicao?: boolean }) {
  const cfg = (bloco.config ?? {}) as ConfigWeb;
  const url = useMemo(() => normalizarUrl(cfg.url), [cfg.url]);
  const [chave, setChave] = useState(0);
  const quadro = useRef<HTMLDivElement>(null);

  const recarregarSeg = Math.max(0, Number(cfg.recarregar ?? 0));
  useEffect(() => {
    if (!recarregarSeg) return;
    const t = setInterval(() => setChave((k) => k + 1), recarregarSeg * 1000);
    return () => clearInterval(t);
  }, [recarregarSeg]);

  const zoom = Math.min(300, Math.max(25, Number(cfg.zoom ?? 100))) / 100;
  // Cadeado na barra permite ligar/desligar a navegação em tempo real;
  // o valor inicial vem da configuração do bloco.
  const [livre, setLivre] = useState(cfg.permitir_interacao !== false);
  useEffect(() => setLivre(cfg.permitir_interacao !== false), [cfg.permitir_interacao]);
  const interativo = livre && !edicao;
  const cor = cfg.cor || "hsl(var(--foreground))";

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden"
      style={{
        background: cfg.transparente ? "transparent" : cfg.fundo || "hsl(var(--card))",
        color: cor,
        borderRadius: typeof cfg.cantos === "number" ? cfg.cantos : undefined,
        fontFamily: fonteCss(cfg.fonte),
      }}
    >
      {cfg.mostrar_barra !== false && (
        <div className="flex shrink-0 items-center gap-2 border-b border-border/40 px-2 py-1">
          <Globe className="h-3.5 w-3.5 shrink-0 opacity-70" />
          <span className="min-w-0 flex-1 truncate text-xs opacity-80">
            {cfg.titulo || url || "Página web"}
          </span>
          <button
            type="button"
            title={interativo ? "Bloquear cliques na página" : "Permitir clicar e navegar"}
            className={`opacity-70 hover:opacity-100 ${interativo ? "" : "text-amber-500 opacity-100"}`}
            onClick={(e) => {
              e.stopPropagation();
              setLivre((v) => !v);
            }}
          >
            {interativo ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            title="Recarregar"
            className="opacity-70 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              setChave((k) => k + 1);
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              title="Abrir em nova aba"
              className="opacity-70 hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}

      <div ref={quadro} className="relative min-h-0 flex-1 overflow-hidden">
        {!url ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-3 text-center">
            <Globe className="h-6 w-6 opacity-40" />
            <span className="text-xs opacity-70">Informe o endereço do site nas configurações.</span>
          </div>
        ) : (
          <iframe
            key={chave}
            src={url}
            title={cfg.titulo || "Página web"}
            className="absolute left-0 top-0 border-0"
            style={{
              width: `${100 / zoom}%`,
              height: `${100 / zoom}%`,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              pointerEvents: interativo ? "auto" : "none",
              background: "transparent",
            }}
            loading="lazy"
            referrerPolicy="no-referrer"
            allow="camera; microphone; autoplay; fullscreen; clipboard-read; clipboard-write; geolocation; encrypted-media; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals allow-presentation"
          />
        )}
      </div>
    </div>
  );
}
