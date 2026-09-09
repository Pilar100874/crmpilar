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
      className="relative flex aspect-square h-full w-auto select-none flex-col overflow-hidden rounded-full bg-[#1c1c1e] text-left shadow-xl"
      onClick={alternar}
      role="button"
    >
      {/* Imagem de fundo preenche todo o círculo */}
      <div className="absolute inset-0 overflow-hidden rounded-full">
        {src ? (
          <img
            src={src}
            alt={bloco.nome}
            loading="lazy"
            className={cn(
              "h-full w-full object-cover transition-all duration-500",
              aceso ? "grayscale-0 brightness-110" : "grayscale brightness-[0.35]",
            )}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#1c1c1e] text-white/40">
            <ImageIcon className="h-8 w-8" />
            <span className="px-4 text-center text-xs">Escolha uma foto</span>
          </div>
        )}
      </div>

      {/* Legenda opcional como overlay no topo */}
      {cfg.legenda !== false && (
        <div className="relative z-10 flex flex-col items-center justify-center gap-1 bg-gradient-to-b from-black/70 via-black/40 to-transparent px-4 pb-6 pt-4 text-center">
          {ocupado && <Loader2 className="h-4 w-4 animate-spin text-white/80" />}
          <p className={cn("truncate text-base font-bold leading-tight", aceso ? "text-white" : "text-white/70")}>
            {bloco.nome}
          </p>
          <p className={cn("truncate text-xs font-medium", aceso ? "text-white/90" : "text-white/55")}>
            {aceso ? "Ligado" : "Desligado"}
          </p>
        </div>
      )}
    </div>
  );
}
