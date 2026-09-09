import { useState } from "react";
import { Power, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Bloco, comandoAutomacao } from "@/lib/automacao/api";

interface Props {
  bloco: Bloco;
  ligado: boolean | null;
  onEstado: (v: boolean | null) => void;
}

export default function BlocoCena({ bloco, ligado, onEstado }: Props) {
  const [ocupado, setOcupado] = useState(false);
  const [pulsando, setPulsando] = useState(false);
  const cfg = (bloco.config ?? {}) as { acao?: "ligar" | "desligar" | "pulso" | "alternar" };
  const modo = cfg.acao ?? "alternar";
  const aceso = ligado === true;

  const acionar = async () => {
    if (!bloco.device_id) {
      toast.error("Este bloco ainda não tem um dispositivo escolhido.");
      return;
    }
    const acao = modo === "alternar" ? (aceso ? "desligar" : "ligar") : modo;
    setOcupado(true);
    setPulsando(true);
    const r = await comandoAutomacao(bloco.device_id, acao, bloco.canal);
    setOcupado(false);
    setTimeout(() => setPulsando(false), 600);
    if (!r.ok) {
      toast.error(r.mensagem);
      return;
    }
    onEstado(r.ligado ?? (acao === "ligar" ? true : acao === "desligar" ? false : ligado));
  };

  return (
    <button
      onClick={acionar}
      disabled={ocupado}
      className={cn(
        "group relative h-full w-full overflow-hidden rounded-2xl border p-3 text-left transition-all duration-300 active:scale-[0.97]",
        aceso
          ? "border-primary/50 bg-gradient-to-br from-primary/30 to-primary/5 shadow-[0_0_30px_-10px_hsl(var(--primary))]"
          : "border-border bg-card hover:border-primary/40",
      )}
    >
      {pulsando && (
        <span className="pointer-events-none absolute inset-0 rounded-2xl bg-primary/25 animate-ping" />
      )}
      <div className="relative flex h-full flex-col items-center justify-center gap-2">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300",
            aceso ? "bg-primary text-primary-foreground scale-110" : "bg-muted text-muted-foreground group-hover:scale-105",
          )}
        >
          {ocupado ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : modo === "pulso" ? (
            <Sparkles className="h-5 w-5" />
          ) : (
            <Power className="h-5 w-5" />
          )}
        </div>
        <p className="text-sm font-semibold text-center truncate w-full">{bloco.nome}</p>
        <p className="text-[11px] text-muted-foreground">
          {modo === "pulso" ? "Toque para acionar" : aceso ? "Ligado" : "Desligado"}
        </p>
      </div>
    </button>
  );
}
