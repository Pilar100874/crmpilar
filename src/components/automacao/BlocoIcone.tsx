// Elemento gráfico (lâmpada, tomada, ventilador...) que acende e anima ao ser acionado.
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Bloco, comandoAutomacao } from "@/lib/automacao/api";
import { AnimacaoIcone, classeAnimacao, iconePorNome } from "@/lib/automacao/icones";

interface Props {
  bloco: Bloco;
  ligado: boolean | null;
  onEstado: (v: boolean | null) => void;
}

export default function BlocoIcone({ bloco, ligado, onEstado }: Props) {
  const [ocupado, setOcupado] = useState(false);
  const cfg = (bloco.config ?? {}) as {
    icone?: string;
    animacao?: AnimacaoIcone;
    acao?: "ligar" | "desligar" | "pulso" | "alternar";
    cor?: string;
    fundo?: "circulo" | "quadrado" | "nenhum";
    mostrar_nome?: boolean;
  };
  const Icon = iconePorNome(cfg.icone ?? bloco.icone);
  const aceso = ligado === true;
  const modo = cfg.acao ?? "alternar";
  const fundo = cfg.fundo ?? "circulo";

  const acionar = async () => {
    if (!bloco.device_id) {
      toast.error("Este elemento ainda não tem um dispositivo escolhido.");
      return;
    }
    const acao = modo === "alternar" ? (aceso ? "desligar" : "ligar") : modo;
    setOcupado(true);
    const r = await comandoAutomacao(bloco.device_id, acao, bloco.canal);
    setOcupado(false);
    if (!r.ok) return toast.error(r.mensagem);
    onEstado(r.ligado ?? (acao === "ligar" ? true : acao === "desligar" ? false : ligado));
  };

  return (
    <button
      onClick={acionar}
      disabled={ocupado}
      title={bloco.nome}
      className="group h-full w-full flex flex-col items-center justify-center gap-1 transition-transform active:scale-95"
    >
      <span
        className={cn(
          "flex items-center justify-center transition-all duration-300",
          fundo === "circulo" && "h-12 w-12 rounded-full",
          fundo === "quadrado" && "h-12 w-12 rounded-xl",
          fundo !== "nenhum" && (aceso
            ? "bg-primary/25 ring-2 ring-primary/50"
            : "bg-muted/60 ring-1 ring-border group-hover:ring-primary/40"),
        )}
        style={aceso && cfg.cor ? { color: cfg.cor } : undefined}
      >
        {ocupado ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <Icon
            className={cn(
              "h-6 w-6 transition-colors",
              aceso ? "text-primary" : "text-muted-foreground",
              classeAnimacao(cfg.animacao, aceso),
            )}
          />
        )}
      </span>
      {cfg.mostrar_nome !== false && (
        <span className="text-[11px] text-center leading-tight truncate w-full px-1">{bloco.nome}</span>
      )}
    </button>
  );
}
