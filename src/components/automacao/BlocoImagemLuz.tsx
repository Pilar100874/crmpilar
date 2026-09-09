// Imagem com fundo transparente que "acende" e "apaga".
// Serve para sobrepor imagens (ex.: foto do ambiente apagado no fundo e o
// facho de luz por cima) mostrando o que está aceso.
import { useEffect, useState } from "react";
import { Loader2, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bloco, comandoAutomacao } from "@/lib/automacao/api";

interface Props {
  bloco: Bloco;
  ligado: boolean | null;
  onEstado: (ligado: boolean | null) => void;
  edicao?: boolean;
}

export default function BlocoImagemLuz({ bloco, ligado, onEstado, edicao }: Props) {
  const cfg = (bloco.config ?? {}) as {
    url?: string;
    caminho?: string;
    ajuste?: string;
    brilho?: number;
    corBrilho?: string;
    opacidadeApagado?: number;
    opacidadeAceso?: number;
    legenda?: boolean;
  };
  const aceso = ligado === true;
  const [src, setSrc] = useState<string | null>(cfg.url ?? null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (cfg.url) return setSrc(cfg.url);
      if (!cfg.caminho) return setSrc(null);
      const { data } = await supabase.storage.from("automacao").createSignedUrl(cfg.caminho, 60 * 60 * 8);
      if (vivo) setSrc(data?.signedUrl ?? null);
    })();
    return () => {
      vivo = false;
    };
  }, [cfg.url, cfg.caminho]);

  const alternar = async () => {
    if (edicao) return;
    if (!bloco.device_id) return onEstado(!aceso);
    setOcupado(true);
    const r = await comandoAutomacao(bloco.device_id, aceso ? "desligar" : "ligar", bloco.canal);
    setOcupado(false);
    if (!r.ok) return toast.error(r.mensagem);
    onEstado(r.ligado ?? !aceso);
  };

  const brilho = typeof cfg.brilho === "number" ? cfg.brilho : 24;
  const corBrilho = cfg.corBrilho || "#ffd479";
  const opAceso = (typeof cfg.opacidadeAceso === "number" ? cfg.opacidadeAceso : 100) / 100;
  const opApagado = (typeof cfg.opacidadeApagado === "number" ? cfg.opacidadeApagado : 0) / 100;

  return (
    <div className="relative h-full w-full select-none" onClick={alternar} role="button">
      {src ? (
        <img
          src={src}
          alt={bloco.nome}
          loading="lazy"
          className="h-full w-full transition-all duration-500"
          style={{
            objectFit: cfg.ajuste === "conter" ? "contain" : cfg.ajuste === "esticar" ? "fill" : "cover",
            opacity: aceso ? opAceso : opApagado,
            filter: aceso && brilho > 0 ? `drop-shadow(0 0 ${brilho}px ${corBrilho})` : "none",
          }}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-white/20 text-white/40">
          <ImageIcon className="h-7 w-7" />
          <span className="px-3 text-center text-xs">Escolha uma imagem com fundo transparente</span>
        </div>
      )}

      {cfg.legenda && (
        <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/50 px-2 py-0.5 text-xs text-white">
          {bloco.nome}
        </span>
      )}
      {ocupado && (
        <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-white/80" />
      )}
    </div>
  );
}
