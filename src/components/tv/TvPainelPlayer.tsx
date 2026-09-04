import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
}

/**
 * Player de um painel: roda um dashboard fixo (1 item) ou uma playlist (vários),
 * com pré-carregamento do próximo item e cross-fade. É usado tanto em tela cheia
 * quanto em cada metade da tela dividida (horizontal/vertical).
 */
export default function TvPainelPlayer({ items, paused = false, reloadKey = 0, rotulo }: Props) {
  const [idx, setIdx] = useState(0);
  const iframesRef = useRef<Record<number, HTMLIFrameElement | null>>({});
  const painelRef = useRef<HTMLDivElement | null>(null);
  const [enquadramento, setEnquadramento] = useState(() => ({
    largura: typeof window === "undefined" ? 1920 : window.innerWidth,
    altura: typeof window === "undefined" ? 1080 : window.innerHeight,
    escala: 1,
  }));

  useEffect(() => { setIdx(0); }, [items]);

  useEffect(() => {
    if (paused || items.length <= 1) return;
    const cur = items[idx];
    if (!cur || cur.aoFinal || !cur.duracao) return;
    const t = setTimeout(() => setIdx((i) => (i + 1) % items.length), cur.duracao * 1000);
    return () => clearTimeout(t);
  }, [idx, items, paused]);

  // Cada painel dividido mantém uma área virtual do tamanho total da TV e é
  // reduzido proporcionalmente para caber no espaço disponível. Assim, o
  // dashboard não recebe uma viewport cortada pela divisão e permanece 100%
  // visível, com barras pretas apenas quando as proporções forem diferentes.
  useLayoutEffect(() => {
    const painel = painelRef.current;
    if (!painel) return;

    const atualizar = () => {
      const largura = Math.max(1, window.innerWidth);
      const altura = Math.max(1, window.innerHeight);
      const rect = painel.getBoundingClientRect();
      const escala = Math.min(rect.width / largura, rect.height / altura);
      setEnquadramento({ largura, altura, escala: Math.max(0.01, escala) });
    };

    atualizar();
    const observer = new ResizeObserver(atualizar);
    observer.observe(painel);
    window.addEventListener("resize", atualizar);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", atualizar);
    };
  }, []);

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

  return (
    <div ref={painelRef} className="relative w-full h-full bg-black overflow-hidden">
      {items.map((item, i) => {
        const preCarregar = i === proxIdx && !item.aoFinal;
        if (i !== idx && !preCarregar) return null;
        const ativo = i === idx;
        return (
          <iframe
            key={`${i}-${reloadKey}`}
            ref={(el) => { iframesRef.current[i] = el; }}
            src={montarUrl(item)}
            title={item.nome}
            className={`absolute left-1/2 top-1/2 border-0 transition-opacity duration-700 ${ativo ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
            style={{
              width: enquadramento.largura,
              height: enquadramento.altura,
              transform: `translate(-50%, -50%) scale(${enquadramento.escala})`,
              transformOrigin: "center",
            }}
            allow="fullscreen; autoplay; camera; microphone; geolocation"
          />
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
