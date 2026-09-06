import { useEffect, useRef, useState } from "react";
import { TV_FIM_CONTEUDO } from "@/lib/tv/cicloConteudo";

export type TvPainelItem = {
  url: string;
  nome: string;
  duracao: number;
  refresh?: number;
  aoFinal?: boolean;
};

interface Props {
  items: TvPainelItem[];
  paused?: boolean;
  reloadKey?: number;
  /** Rótulo opcional exibido discretamente no canto do painel. */
  rotulo?: string;
  /**
   * Zoom do conteúdo em % (padrão 100). Valores menores que 100 "afastam" o
   * conteúdo para caber mais informação no painel SEM barra de rolagem; maiores
   * ampliam. Útil quando a tela está dividida e o dashboard foi feito para tela cheia.
   */
  zoom?: number;
}

/**
 * Player de um painel: roda um dashboard fixo (1 item) ou uma playlist (vários),
 * com pré-carregamento do próximo item e cross-fade. É usado tanto em tela cheia
 * quanto em cada metade da tela dividida (horizontal/vertical).
 */
export default function TvPainelPlayer({ items, paused = false, reloadKey = 0, rotulo, zoom = 100 }: Props) {
  const [idx, setIdx] = useState(0);
  const iframesRef = useRef<Record<number, HTMLIFrameElement | null>>({});

  useEffect(() => { setIdx(0); }, [items]);

  useEffect(() => {
    if (paused || items.length <= 1) return;
    const cur = items[idx];
    if (!cur || cur.aoFinal || !cur.duracao) return;
    const t = setTimeout(() => setIdx((i) => (i + 1) % items.length), cur.duracao * 1000);
    return () => clearTimeout(t);
  }, [idx, items, paused]);

  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      if ((ev.data as any)?.tipo !== TV_FIM_CONTEUDO) return;
      if (paused || items.length <= 1) return;
      if (!items[idx]?.aoFinal) return;
      const ativo = iframesRef.current[idx];
      if (ativo && ev.source && ev.source !== ativo.contentWindow) return;
      setIdx((i) => (i + 1) % items.length);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [idx, items, paused]);

  const proxIdx = items.length > 1 ? (idx + 1) % items.length : -1;
  const montarUrl = (item: TvPainelItem) => `${item.url}${item.url.includes("?") ? "&" : "?"}_r=${reloadKey}`;

  if (!items.length) {
    return (
      <div className="relative w-full h-full bg-black flex items-center justify-center text-white/50 text-sm">
        Sem conteúdo neste painel
      </div>
    );
  }

  const escala = Math.max(25, Math.min(200, zoom)) / 100;
  // Truque de "zoom sem scroll": o iframe é renderizado num palco maior que o
  // painel (100/escala %) e depois reduzido via transform. O conteúdo inteiro
  // continua visível, apenas menor — nada de barras de rolagem no painel.
  const palcoStyle: React.CSSProperties =
    escala === 1
      ? { position: "absolute", inset: 0 }
      : {
          position: "absolute",
          top: 0,
          left: 0,
          width: `${100 / escala}%`,
          height: `${100 / escala}%`,
          transform: `scale(${escala})`,
          transformOrigin: "0 0",
        };

  return (
    <div className="relative w-full h-full min-w-0 min-h-0 bg-black overflow-hidden">
      {items.map((item, i) => {
        const preCarregar = i === proxIdx && !item.aoFinal;
        if (i !== idx && !preCarregar) return null;
        const ativo = i === idx;
        return (
          <div key={`${i}-${reloadKey}`} style={palcoStyle}>
            <iframe
              ref={(el) => { iframesRef.current[i] = el; }}
              src={montarUrl(item)}
              title={item.nome}
              className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-700 ${ativo ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
              allow="fullscreen; autoplay; camera; microphone; geolocation"
            />
          </div>
        );
      })}
      {rotulo && (
        <span className="absolute bottom-1 left-2 z-20 text-[10px] text-white/40 pointer-events-none">
          {rotulo}
        </span>
      )}
    </div>
  );
}
