// Cartão de ambiente com foto: a imagem fica clara quando está ligado
// e escura (sem cor) quando está desligado.
import { useEffect, useState } from "react";
import { Loader2, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Bloco, comandoAutomacao } from "@/lib/automacao/api";

interface Props {
  bloco: Bloco;
  ligado: boolean | null;
  onEstado: (ligado: boolean | null) => void;
  edicao?: boolean;
}

export default function BlocoAmbiente({ bloco, ligado, onEstado, edicao }: Props) {
  const cfg = (bloco.config ?? {}) as {
    url?: string;
    caminho?: string;
    cor?: string;
    raio?: number;
    legenda?: boolean;
  };
  const cor = cfg.cor || "#facc15";
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
    if (!bloco.device_id) {
      // Sem equipamento escolhido, o cartão ainda alterna só o visual.
      onEstado(!aceso);
      return;
    }
    setOcupado(true);
    const r = await comandoAutomacao(bloco.device_id, aceso ? "desligar" : "ligar", bloco.canal);
    setOcupado(false);
    if (!r.ok) return toast.error(r.mensagem);
    onEstado(r.ligado ?? !aceso);
  };

  return (
    <div
      className="relative h-full w-full select-none overflow-hidden bg-[#1c1c1e] text-left"
      style={{ borderRadius: typeof cfg.raio === "number" ? cfg.raio : 24 }}
      onClick={alternar}
      role="button"
    >
      {cfg.legenda !== false && (
        <div className="absolute left-0 right-0 top-0 z-10 px-4 pt-3">
          <div
            className="inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1.5 backdrop-blur"
            style={{ background: aceso ? `${cor}30` : "rgba(255,255,255,0.08)" }}
          >
            {ocupado ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-white/80" />
            ) : (
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: aceso ? cor : "rgba(255,255,255,0.35)" }}
              />
            )}
            <div className="min-w-0">
              <p className={cn("truncate text-sm font-semibold leading-tight", aceso ? "text-white" : "text-white/60")}>
                {bloco.nome}
              </p>
              <p className={cn("truncate text-[10px]", aceso ? "text-white/80" : "text-white/40")}>
                {aceso ? "Ligado" : "Desligado"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="relative h-full w-full">
        {src ? (
          <img
            src={src}
            alt={bloco.nome}
            loading="lazy"
            className={cn(
              "h-full w-full object-cover transition-all duration-500",
              aceso ? "grayscale-0 brightness-105" : "grayscale brightness-[0.45]",
            )}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-white/5 text-white/40">
            <ImageIcon className="h-8 w-8" />
            <span className="text-xs">Escolha uma foto</span>
          </div>
        )}
      </div>
    </div>
  );
}
