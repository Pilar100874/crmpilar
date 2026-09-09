// Cartão de ambiente com foto: a imagem fica clara quando está ligado
// e escura (sem cor) quando está desligado.
import { useEffect, useState } from "react";
import { Lightbulb, Home, PersonStanding, Loader2, ImageIcon, LampCeiling } from "lucide-react";
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
      className="relative h-full w-full select-none overflow-hidden bg-[#1c1c1e] p-3 text-left"
      style={{ borderRadius: typeof cfg.raio === "number" ? cfg.raio : 24 }}
      onClick={alternar}
      role="button"
    >
      <div className="flex h-full gap-2">
        <div className="flex min-w-0 flex-1 flex-col">
          {cfg.legenda !== false && (
            <div className="min-w-0 pl-1">
              <p className={cn("truncate text-base font-bold leading-tight", aceso ? "text-white" : "text-white/50")}>
                {bloco.nome}
              </p>
              <p className={cn("truncate text-xs", aceso ? "text-white/70" : "text-white/35")}>
                {aceso ? "Ligado" : "Desligado"}
              </p>
            </div>
          )}

          <div className="relative mt-2 min-h-0 flex-1 overflow-hidden rounded-t-[999px]">
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
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-white/5 text-white/40">
                <ImageIcon className="h-6 w-6" />
                <span className="text-[11px]">Escolha uma foto</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center justify-start gap-2 py-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              alternar();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300"
            style={
              aceso
                ? { background: cor, color: "#1c1c1e", boxShadow: `0 0 18px ${cor}80` }
                : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }
            }
          >
            {ocupado ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lightbulb className="h-5 w-5" />}
          </button>

          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-300",
              aceso ? "bg-blue-500 text-white" : "bg-white/[0.06] text-white/40",
            )}
          >
            <Home className="h-5 w-5" />
          </span>

          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-300",
              aceso ? "bg-white/15 text-white" : "bg-white/[0.06] text-white/40",
            )}
          >
            <PersonStanding className="h-5 w-5" />
          </span>

          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-300",
              aceso ? "bg-emerald-600 text-white" : "bg-white/[0.06] text-white/40",
            )}
          >
            <LampCeiling className="h-5 w-5" />
          </span>
        </div>
      </div>
    </div>
  );
}
