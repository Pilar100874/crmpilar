import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

/** Formata segundos em mm:ss (ou h:mm:ss). */
function formatarTempo(segundos?: number | null): string {
  if (segundos == null || !isFinite(segundos) || segundos < 0) return "--:--";
  const s = Math.floor(segundos % 60);
  const m = Math.floor((segundos / 60) % 60);
  const h = Math.floor(segundos / 3600);
  const dois = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${dois(m)}:${dois(s)}` : `${dois(m)}:${dois(s)}`;
}

interface Props {
  url: string;
  tipo: "video" | "audio";
  duracao: number | null;
  atual: number;
  /** Chamado quando o usuário clica/arrasta na timeline. */
  onSeek: (segundos: number) => void;
}

const AMOSTRAS = 400;
const LIMITE_BYTES = 60 * 1024 * 1024; // não tenta gerar waveform de arquivos enormes

/** Baixa a mídia e reduz o áudio a picos (0..1) para desenhar a waveform. */
async function extrairPicos(url: string): Promise<number[]> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const tamanho = Number(resp.headers.get("content-length") ?? 0);
  if (tamanho > LIMITE_BYTES) throw new Error("arquivo grande");
  const buffer = await resp.arrayBuffer();
  const Ctx: typeof AudioContext =
    window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const audio = await ctx.decodeAudioData(buffer);
    const dados = audio.getChannelData(0);
    const bloco = Math.max(1, Math.floor(dados.length / AMOSTRAS));
    const picos: number[] = [];
    for (let i = 0; i < AMOSTRAS; i++) {
      let max = 0;
      const inicio = i * bloco;
      for (let j = 0; j < bloco; j += 4) {
        const v = Math.abs(dados[inicio + j] ?? 0);
        if (v > max) max = v;
      }
      picos.push(max);
    }
    const maior = Math.max(...picos, 0.01);
    return picos.map((p) => p / maior);
  } finally {
    ctx.close().catch(() => undefined);
  }
}

/**
 * Timeline com waveform do áudio e prévia ao passar o mouse (scrub):
 * mostra o tempo e, em vídeos, um quadro em miniatura da posição.
 */
export function WaveformTimeline({ url, tipo, duracao, atual, onSeek }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previaRef = useRef<HTMLCanvasElement | null>(null);
  const videoPreviaRef = useRef<HTMLVideoElement | null>(null);
  const areaRef = useRef<HTMLDivElement | null>(null);

  const [picos, setPicos] = useState<number[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [semWaveform, setSemWaveform] = useState(false);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [hoverTempo, setHoverTempo] = useState(0);
  const [arrastando, setArrastando] = useState(false);

  // Gera os picos uma vez por mídia.
  useEffect(() => {
    let cancelado = false;
    setPicos(null);
    setSemWaveform(false);
    setCarregando(true);
    extrairPicos(url)
      .then((p) => !cancelado && setPicos(p))
      .catch(() => !cancelado && setSemWaveform(true))
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, [url]);

  const progresso = useMemo(
    () => (duracao && duracao > 0 ? Math.min(1, Math.max(0, atual / duracao)) : 0),
    [atual, duracao],
  );

  // Desenha a waveform + progresso.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const largura = canvas.clientWidth || 300;
    const altura = canvas.clientHeight || 48;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = largura * dpr;
    canvas.height = altura * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, largura, altura);

    const estilo = getComputedStyle(canvas);
    const corBase = estilo.getPropertyValue("--wf-base") || "hsl(var(--muted-foreground))";
    const corAtiva = estilo.getPropertyValue("--wf-ativa") || "hsl(var(--primary))";
    const lista = picos ?? new Array(AMOSTRAS).fill(0.18);
    const larguraBarra = largura / lista.length;
    const meio = altura / 2;

    lista.forEach((p, i) => {
      const x = i * larguraBarra;
      const h = Math.max(1.5, p * (altura - 4));
      ctx.fillStyle = x / largura <= progresso ? corAtiva : corBase;
      ctx.globalAlpha = x / largura <= progresso ? 0.95 : 0.35;
      ctx.fillRect(x, meio - h / 2, Math.max(1, larguraBarra - 0.6), h);
    });
    ctx.globalAlpha = 1;

    // Cursor de reprodução
    ctx.fillStyle = corAtiva;
    ctx.fillRect(progresso * largura - 1, 0, 2, altura);
  }, [picos, progresso]);

  const tempoDoEvento = useCallback(
    (clientX: number) => {
      const area = areaRef.current;
      if (!area || !duracao) return 0;
      const r = area.getBoundingClientRect();
      const razao = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      return razao * duracao;
    },
    [duracao],
  );

  const aoMover = (e: React.MouseEvent) => {
    const area = areaRef.current;
    if (!area || !duracao) return;
    const r = area.getBoundingClientRect();
    setHoverX(Math.min(r.width, Math.max(0, e.clientX - r.left)));
    const t = tempoDoEvento(e.clientX);
    setHoverTempo(t);
    if (arrastando) onSeek(t);
  };

  // Prévia em miniatura do vídeo na posição do mouse.
  useEffect(() => {
    if (tipo !== "video" || hoverX === null) return;
    const v = videoPreviaRef.current;
    if (!v) return;
    const id = window.setTimeout(() => {
      try {
        v.currentTime = hoverTempo;
      } catch {
        /* ignora seeks inválidos */
      }
    }, 60);
    return () => window.clearTimeout(id);
  }, [hoverTempo, hoverX, tipo]);

  const desenharPrevia = () => {
    const v = videoPreviaRef.current;
    const c = previaRef.current;
    if (!v || !c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, c.width, c.height);
  };

  return (
    <div className="relative select-none px-2 pb-1 pt-2">
      <div
        ref={areaRef}
        className="relative h-12 w-full cursor-pointer"
        onMouseMove={aoMover}
        onMouseLeave={() => {
          setHoverX(null);
          setArrastando(false);
        }}
        onMouseDown={(e) => {
          setArrastando(true);
          onSeek(tempoDoEvento(e.clientX));
        }}
        onMouseUp={() => setArrastando(false)}
        role="slider"
        aria-label="Linha do tempo"
        aria-valuemin={0}
        aria-valuemax={duracao ?? 0}
        aria-valuenow={atual}
        tabIndex={0}
        onKeyDown={(e) => {
          if (!duracao) return;
          if (e.key === "ArrowRight") onSeek(Math.min(duracao, atual + 5));
          if (e.key === "ArrowLeft") onSeek(Math.max(0, atual - 5));
        }}
      >
        <canvas
          ref={canvasRef}
          className="h-12 w-full [--wf-ativa:hsl(var(--primary))] [--wf-base:hsl(var(--muted-foreground))]"
        />

        {hoverX !== null && (
          <div className="pointer-events-none absolute inset-y-0" style={{ left: hoverX }}>
            <div className="h-full w-px bg-foreground/50" />
          </div>
        )}

        {hoverX !== null && (
          <div
            className="pointer-events-none absolute bottom-full z-10 mb-1 -translate-x-1/2 rounded-md border bg-popover p-1 text-[10px] shadow-md"
            style={{ left: hoverX }}
          >
            {tipo === "video" && (
              <canvas ref={previaRef} width={160} height={90} className="block rounded bg-black" />
            )}
            <div className="mt-0.5 text-center font-mono text-popover-foreground">
              {formatarTempo(hoverTempo)}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        {carregando && (
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Gerando forma de onda…
          </span>
        )}
        {semWaveform && !carregando && <span>Forma de onda indisponível — timeline simples</span>}
      </div>

      {tipo === "video" && (
        <video
          ref={videoPreviaRef}
          src={url}
          muted
          playsInline
          preload="metadata"
          crossOrigin="anonymous"
          className="hidden"
          onSeeked={desenharPrevia}
        />
      )}
    </div>
  );
}
