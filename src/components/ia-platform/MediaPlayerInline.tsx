import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Captions, CaptionsOff, Music, Video } from "lucide-react";
import { obterPosicaoMidia, salvarPosicaoMidia } from "@/lib/aip/posicaoMidia";
import { CueLegenda, LegendaFaixa, cueAtivo, parsearLegenda } from "@/lib/aip/legendas";



/** Formata segundos em mm:ss (ou h:mm:ss). */
export function formatarTempo(segundos?: number | null): string {
  if (segundos == null || !isFinite(segundos) || segundos < 0) return "--:--";
  const s = Math.floor(segundos % 60);
  const m = Math.floor((segundos / 60) % 60);
  const h = Math.floor(segundos / 3600);
  const dois = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${dois(m)}:${dois(s)}` : `${dois(m)}:${dois(s)}`;
}

interface Props {
  tipo: "video" | "audio";
  url: string;
  nome: string;
  /** Altura do player de vídeo (classe Tailwind). */
  classeVideo?: string;
  /** Faixas de legenda (WebVTT/SRT) disponíveis para esta mídia. */
  legendas?: LegendaFaixa[];
}


/**
 * Player nativo (controls/seek) com barra de informações: tempo atual,
 * duração e velocidade de reprodução — sem precisar baixar o arquivo.
 */
export function MediaPlayerInline({
  tipo,
  url,
  nome,
  classeVideo = "max-h-80 w-full",
  legendas = [],
}: Props) {
  const ref = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [duracao, setDuracao] = useState<number | null>(null);
  const [atual, setAtual] = useState(() => obterPosicaoMidia(url));
  const [velocidade, setVelocidade] = useState(1);
  const [erro, setErro] = useState(false);
  const [faixa, setFaixa] = useState<string | null>(legendas[0]?.nome ?? null);
  const [legendasAtivas, setLegendasAtivas] = useState(legendas.length > 0);
  const [cues, setCues] = useState<CueLegenda[]>([]);
  const [erroLegenda, setErroLegenda] = useState(false);

  // Carrega e converte a faixa selecionada (WebVTT ou SRT).
  useEffect(() => {
    const sel = legendas.find((l) => l.nome === faixa);
    if (!legendasAtivas || !sel) {
      setCues([]);
      return;
    }
    let cancelado = false;
    setErroLegenda(false);
    fetch(sel.url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((t) => !cancelado && setCues(parsearLegenda(t)))
      .catch(() => !cancelado && (setErroLegenda(true), setCues([])));
    return () => {
      cancelado = true;
    };
  }, [faixa, legendasAtivas, legendas]);

  const textoLegenda = useMemo(
    () => (legendasAtivas && cues.length ? cueAtivo(cues, atual)?.texto ?? "" : ""),
    [cues, atual, legendasAtivas],
  );



  const aoCarregar = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    const el = e.currentTarget;
    setDuracao(el.duration);
    setErro(false);
    // Retoma de onde parou (inline <-> tela cheia).
    const salvo = obterPosicaoMidia(url);
    if (salvo > 0.5 && (!isFinite(el.duration) || salvo < el.duration - 0.5)) {
      try {
        el.currentTime = salvo;
      } catch {
        /* alguns formatos não permitem seek imediato */
      }
    }
  };

  // Guarda a última posição ao desmontar (troca de visualização).
  useEffect(() => {
    return () => {
      const el = ref.current;
      if (el) salvarPosicaoMidia(url, el.currentTime);
    };
  }, [url]);

  const mudarVelocidade = () => {
    const opcoes = [1, 1.25, 1.5, 2, 0.5];
    const prox = opcoes[(opcoes.indexOf(velocidade) + 1) % opcoes.length];
    setVelocidade(prox);
    if (ref.current) ref.current.playbackRate = prox;
  };

  const comum = {
    src: url,
    controls: true,
    preload: "metadata" as const,
    playsInline: true,
    onLoadedMetadata: aoCarregar,
    onTimeUpdate: (e: React.SyntheticEvent<HTMLMediaElement>) => {
      setAtual(e.currentTarget.currentTime);
      salvarPosicaoMidia(url, e.currentTarget.currentTime);
    },
    onPause: (e: React.SyntheticEvent<HTMLMediaElement>) =>
      salvarPosicaoMidia(url, e.currentTarget.currentTime),
    onError: () => setErro(true),
  };



  return (
    <div className="w-full">
      {tipo === "video" ? (
        <video
          {...comum}
          ref={ref as React.RefObject<HTMLVideoElement>}
          className={`${classeVideo} bg-black`}
        />
      ) : (
        <audio {...comum} ref={ref as React.RefObject<HTMLAudioElement>} className="w-full p-2" />
      )}

      <div className="flex flex-wrap items-center gap-2 border-t px-2 py-1 text-[11px] text-muted-foreground">
        {tipo === "video" ? <Video className="h-3 w-3" /> : <Music className="h-3 w-3" />}
        <span className="font-mono">
          {formatarTempo(atual)} / {formatarTempo(duracao)}
        </span>
        <button
          type="button"
          onClick={mudarVelocidade}
          className="rounded border px-1.5 py-0.5 hover:bg-muted"
        >
          {velocidade}x
        </button>
        {erro && (
          <Badge variant="destructive" className="h-4 px-1 text-[10px]">
            Não foi possível reproduzir — link pode ter expirado
          </Badge>
        )}
        <span className="min-w-0 flex-1 truncate text-right font-mono opacity-70">{nome}</span>
      </div>
    </div>
  );
}
