// Cartão de ambiente com foto: imagem em formato de arco (topo redondo),
// clara quando ligado e escura quando desligado. Sem ícones laterais.
import { useEffect, useState } from "react";
import { Loader2, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Bloco, comandoAutomacao } from "@/lib/automacao/api";

/** Converte #rrggbb + opacidade (0-100) em rgba(). */
function hexParaRgba(hex: string, opacidade: number) {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(v, 16);
  if (Number.isNaN(n)) return hex;
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(100, opacidade)) / 100})`;
}

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
    /** Cor do fundo do cartão. */
    fundoCor?: string;
    /** Transparência do fundo, de 0 (invisível) a 100 (cheio). */
    fundoOpacidade?: number;
    /** Remove totalmente o fundo do cartão. */
    semFundo?: boolean;
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
      onEstado(!aceso);
      return;
    }
    setOcupado(true);
    const r = await comandoAutomacao(bloco.device_id, aceso ? "desligar" : "ligar", bloco.canal);
    setOcupado(false);
    if (!r.ok) return toast.error(r.mensagem);
    onEstado(r.ligado ?? !aceso);
  };

  const raioCartao = typeof cfg.raio === "number" ? cfg.raio : 20;
  const fundoOpac = typeof cfg.fundoOpacidade === "number" ? cfg.fundoOpacidade : 100;
  const fundo = cfg.semFundo ? "transparent" : hexParaRgba(cfg.fundoCor || "#1c1c1e", fundoOpac);

  return (
    <div
      className="relative flex h-full w-full select-none flex-col overflow-hidden text-left"
      style={{
        borderRadius: raioCartao,
        background: fundo,
        boxShadow: cfg.semFundo ? "none" : undefined,
      }}
      onClick={alternar}
      role="button"
    >
      {/* Título e estado no topo */}
      {cfg.legenda !== false && (
        <div className="flex items-center gap-2 px-4 pb-3 pt-4">
          {ocupado && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white/70" />}
          <div className="min-w-0">
            <p className={cn("truncate text-lg font-bold leading-tight", aceso ? "text-white" : "text-white/55")}>
              {bloco.nome}
            </p>
            <p className={cn("truncate text-sm font-medium", aceso ? "text-white/70" : "text-white/40")}>
              {aceso ? "Ligado" : "Desligado"}
            </p>
          </div>
        </div>
      )}

      {/* Foto em formato de arco: topo totalmente redondo, base reta */}
      <div
        className="relative mx-2 mb-2 min-h-0 flex-1 overflow-hidden"
        style={{ borderRadius: "999px 999px 14px 14px" }}
      >
        {src ? (
          <img
            src={src}
            alt={bloco.nome}
            loading="lazy"
            className={cn(
              "h-full w-full object-cover transition-all duration-500",
              aceso ? "grayscale-0 brightness-105" : "grayscale brightness-[0.35]",
            )}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-white/5 text-white/40">
            <ImageIcon className="h-8 w-8" />
            <span className="px-4 text-center text-xs">Escolha uma foto</span>
          </div>
        )}
      </div>
    </div>
  );
}
