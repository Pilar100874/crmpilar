// Cartão de controle rápido: ícone, nome/estado e ação em uma linha limpa.
import { useState } from "react";
import { Loader2, Power } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Bloco, comandoAutomacao } from "@/lib/automacao/api";
import { AnimacaoIcone, classeAnimacao, iconePorNome } from "@/lib/automacao/icones";
import { useConfirmacaoBloco } from "./ConfirmacaoAcao";

interface Props {
  bloco: Bloco;
  ligado: boolean | null;
  onEstado: (v: boolean | null) => void;
}

export default function BlocoBubble({ bloco, ligado, onEstado }: Props) {
  const [ocupado, setOcupado] = useState(false);
  const cfg = (bloco.config ?? {}) as {
    icone?: string;
    animacao?: AnimacaoIcone;
    corAtivo?: string;
    corInativo?: string;
    corFundo?: string;
    transparente?: boolean;
    opacidade?: number;
    raio?: number;
    tamanhoIcone?: number;
    subtitulo?: string;
    mostrarBotao?: boolean;
    textoAtivo?: string;
    textoInativo?: string;
  };
  const Icon = iconePorNome(cfg.icone ?? bloco.icone);
  const aceso = ligado === true;
  const corIcone = aceso ? (cfg.corAtivo ?? "#3b82f6") : (cfg.corInativo ?? "#64748b");
  const raio = typeof cfg.raio === "number" ? cfg.raio : 16;
  const opacidade = typeof cfg.opacidade === "number" ? cfg.opacidade : 100;
  const tamIcone = typeof cfg.tamanhoIcone === "number" ? cfg.tamanhoIcone : 20;

  const { pedir, dialogo } = useConfirmacaoBloco(bloco);

  const alternar = () => pedir(executar);

  const executar = async () => {
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

  return (
    <button
      onClick={alternar}
      disabled={ocupado}
      className={cn(
        "group relative h-full w-full flex items-center gap-3 px-3 text-left transition-all active:scale-[0.98]",
        !cfg.transparente && !cfg.corFundo && "bg-card border border-border shadow-sm",
      )}
      style={{
        borderRadius: raio,
        opacity: opacidade / 100,
        background: cfg.transparente ? "transparent" : cfg.corFundo || undefined,
        borderColor: cfg.corFundo ? "transparent" : undefined,
      }}
    >
      {dialogo}
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg transition-colors",
          aceso ? "bg-primary/15" : "bg-muted",
        )}
        style={{
          width: tamIcone * 2.2,
          height: tamIcone * 2.2,
          color: corIcone,
        }}
      >
        {ocupado ? (
          <Loader2 className="animate-spin" style={{ width: tamIcone, height: tamIcone }} />
        ) : (
          <Icon className={classeAnimacao(cfg.animacao, aceso)} style={{ width: tamIcone, height: tamIcone }} />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{bloco.nome}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {cfg.subtitulo || (aceso ? (cfg.textoAtivo ?? "Ligado") : (cfg.textoInativo ?? "Desligado"))}
        </span>
      </span>

      {(cfg.mostrarBotao ?? true) && (
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors",
            aceso ? "border-transparent text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
          style={{
            background: aceso ? corIcone : "transparent",
            borderColor: aceso ? corIcone : undefined,
          }}
        >
          <Power className="h-4 w-4" />
        </span>
      )}
    </button>
  );
}
