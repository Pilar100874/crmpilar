import { useEffect, useState } from "react";
import TvPainelPlayer, { type TvPainelItem } from "./TvPainelPlayer";

export type TvVisibilidade = {
  /** "sempre" = fixo na tela; "intervalo" = aparece de tempos em tempos. */
  modo: "sempre" | "intervalo";
  /** De quantos em quantos segundos o painel aparece (modo intervalo). */
  intervalo: number;
  /** Quantos segundos o painel fica visível a cada aparição (modo intervalo). */
  duracao: number;
};

export type TvPainelConfig = {
  items: TvPainelItem[];
  /** Fatia da tela em % quando o painel está visível. */
  proporcao: number;
  zoom: number;
  visibilidade?: TvVisibilidade;
  rotulo?: string;
};

interface Props {
  modo: "horizontal" | "vertical";
  paineis: TvPainelConfig[];
  paused?: boolean;
  reloadKey?: number;
}

/**
 * Ciclo de visibilidade de um painel intermitente: fica escondido pelo intervalo
 * configurado e então aparece pela duração escolhida, repetindo indefinidamente.
 */
function useVisivel(vis: TvVisibilidade | undefined, paused: boolean) {
  const modo = vis?.modo || "sempre";
  const intervalo = Math.max(5, vis?.intervalo || 300);
  const duracao = Math.max(3, vis?.duracao || 30);
  const [visivel, setVisivel] = useState(modo === "sempre");

  useEffect(() => {
    if (modo !== "intervalo") {
      setVisivel(true);
      return;
    }
    if (paused) return;
    setVisivel(false);
    let timer: ReturnType<typeof setTimeout>;
    const esconder = () => {
      setVisivel(false);
      timer = setTimeout(mostrar, intervalo * 1000);
    };
    const mostrar = () => {
      setVisivel(true);
      timer = setTimeout(esconder, duracao * 1000);
    };
    timer = setTimeout(mostrar, intervalo * 1000);
    return () => clearTimeout(timer);
  }, [modo, intervalo, duracao, paused]);

  return modo === "sempre" ? true : visivel;
}

function Painel({
  cfg,
  paused,
  reloadKey,
  onVisibilidade,
}: {
  cfg: TvPainelConfig;
  paused: boolean;
  reloadKey: number;
  onVisibilidade: (v: boolean) => void;
}) {
  const visivel = useVisivel(cfg.visibilidade, paused);
  useEffect(() => { onVisibilidade(visivel); }, [visivel, onVisibilidade]);
  if (!visivel) return null;
  return (
    <div className="relative min-w-0 min-h-0 overflow-hidden">
      <TvPainelPlayer items={cfg.items} paused={paused} reloadKey={reloadKey} zoom={cfg.zoom} rotulo={cfg.rotulo} />
    </div>
  );
}

/**
 * Tela dividida em 2 ou 3 painéis. Painéis intermitentes somem do layout quando
 * estão escondidos — os demais crescem e ocupam a tela inteira.
 */
export default function TvSplitLayout({ modo, paineis, paused = false, reloadKey = 0 }: Props) {
  const [visiveis, setVisiveis] = useState<boolean[]>(() => paineis.map(() => true));

  useEffect(() => {
    setVisiveis((v) => paineis.map((_, i) => v[i] ?? true));
  }, [paineis.length]);

  const marcar = (i: number) => (v: boolean) =>
    setVisiveis((atual) => (atual[i] === v ? atual : atual.map((x, j) => (j === i ? v : x))));

  const ativos = paineis.map((p, i) => ({ p, i })).filter(({ i }) => visiveis[i] !== false);
  const total = ativos.reduce((s, { p }) => s + Math.max(1, p.proporcao), 0) || 1;
  const tracks = ativos.map(({ p }) => `${(Math.max(1, p.proporcao) / total) * 100}%`).join(" ");

  return (
    <div
      className="absolute inset-0 z-10 grid gap-[2px] bg-black"
      style={modo === "horizontal" ? { gridTemplateRows: tracks } : { gridTemplateColumns: tracks }}
    >
      {paineis.map((cfg, i) => (
        <Painel key={i} cfg={cfg} paused={paused} reloadKey={reloadKey} onVisibilidade={marcar(i)} />
      ))}
    </div>
  );
}
