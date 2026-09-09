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
      className="relative flex h-full w-full select-none flex-col overflow-hidden bg-[#1c1c1e] p-3 text-left"
      style={{ borderRadius: typeof cfg.raio === "number" ? cfg.raio : 24 }}
      onClick={alternar}
      role="button"
    >
      {cfg.legenda !== false && (
        <div className="flex items-center gap-2 px-1 pb-2">
          {ocupado && <Loader2 className="h-4 w-4 animate-spin text-white/70" />}
          <div className="min-w-0">
            <p className={cn("truncate text-lg font-bold leading-tight", aceso ? "text-white" : "text-white/45")}>
              {bloco.nome}
            </p>
            <p className={cn("truncate text-xs font-medium", aceso ? "text-white/70" : "text-white/35")}>
              {aceso ? "Ligado" : "Desligado"}
            </p>
          </div>
        </div>
      )}

      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{ borderRadius: "14px 50% 50% 14px / 14px 50% 50% 14px" }}
      >
        {src ? (
          <img
            src={src}
            alt={bloco.nome}
            loading="lazy"
            className={cn(
              "h-full w-full object-cover transition-all duration-500",
              aceso ? "grayscale-0 brightness-105" : "grayscale brightness-[0.4]",
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
