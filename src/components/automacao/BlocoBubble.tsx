// Cartão estilo Bubble Card do Home Assistant: ícone arredondado, nome,
// estado e slider opcional. Fica colorido quando ligado/ativo.
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
  onAcionar?: () => void;
  edicao?: boolean;
}

export default function BlocoBubble({ bloco, ligado, onEstado, onAcionar, edicao }: Props) {
  const [ocupado, setOcupado] = useState(false);
  const cfg = (bloco.config ?? {}) as {
    icone?: string;
    animacao?: AnimacaoIcone;
    acao?: "ligar" | "desligar" | "pulso" | "alternar";
    corFundoAtivo?: string;
    corFundoInativo?: string;
    corIconeAtivo?: string;
    corIconeInativo?: string;
    corTextoAtivo?: string;
    corTextoInativo?: string;
    mostrar_estado?: boolean;
    mostrar_slider?: boolean;
    mostrar_nome?: boolean;
    tamanho_icone?: number;
    arredondamento?: number;
    opacidade?: number;
  };

  const Icon = iconePorNome(cfg.icone ?? bloco.icone);
  const aceso = ligado === true;
  const modo = cfg.acao ?? "alternar";

  const fundoAtivo = cfg.corFundoAtivo ?? "rgba(59, 130, 246, 0.22)";
  const fundoInativo = cfg.corFundoInativo ?? "rgba(255, 255, 255, 0.05)";
  const iconeAtivo = cfg.corIconeAtivo ?? "#3b82f6";
  const iconeInativo = cfg.corIconeInativo ?? "#94a3b8";
  const textoAtivo = cfg.corTextoAtivo ?? "#ffffff";
  const textoInativo = cfg.corTextoInativo ?? "#e2e8f0";
  const raio = typeof cfg.arredondamento === "number" ? cfg.arredondamento : 20;
  const opacidade = typeof cfg.opacidade === "number" ? cfg.opacidade : 100;
  const tamanhoIcone = typeof cfg.tamanho_icone === "number" ? cfg.tamanho_icone : 28;

  const acionar = async () => {
    if (edicao) return;
    if (!bloco.device_id) {
      onEstado(!aceso);
      onAcionar?.();
      return;
    }
    const acao = modo === "alternar" ? (aceso ? "desligar" : "ligar") : modo;
    setOcupado(true);
    const r = await comandoAutomacao(bloco.device_id, acao, bloco.canal);
    setOcupado(false);
    if (!r.ok) return toast.error(r.mensagem);
    onEstado(r.ligado ?? (acao === "ligar" ? true : acao === "desligar" ? false : ligado));
    onAcionar?.();
  };

  const estadoTexto =
    bloco.tipo === "portao"
      ? aceso
        ? "Aberto"
        : "Fechado"
      : aceso
        ? "Ligado"
        : "Desligado";

  return (
    <button
      type="button"
      disabled={ocupado || edicao}
      onClick={acionar}
      className="group flex h-full w-full select-none flex-col overflow-hidden p-3 transition-all duration-300 active:scale-[0.98]"
      style={{
        borderRadius: raio,
        background: aceso ? fundoAtivo : fundoInativo,
        opacity: opacidade / 100,
      }}
    >
      <div className="flex flex-1 items-center gap-3 overflow-hidden">
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full transition-all duration-300",
            aceso ? "shadow-[0_0_18px_rgba(59,130,246,0.45)]" : "shadow-inner",
          )}
          style={{
            width: tamanhoIcone + 24,
            height: tamanhoIcone + 24,
            background: aceso ? `${iconeAtivo}25` : "rgba(255,255,255,0.08)",
            color: aceso ? iconeAtivo : iconeInativo,
          }}
        >
          {ocupado ? (
            <Loader2 className="animate-spin" style={{ width: tamanhoIcone, height: tamanhoIcone }} />
          ) : (
            <Icon
              className={cn("transition-colors", classeAnimacao(cfg.animacao, aceso))}
              style={{ width: tamanhoIcone, height: tamanhoIcone }}
            />
          )}
        </span>

        <div className="flex min-w-0 flex-1 flex-col text-left">
          {cfg.mostrar_nome !== false && (
            <span
              className="truncate text-sm font-semibold leading-tight"
              style={{ color: aceso ? textoAtivo : textoInativo }}
            >
              {bloco.nome}
            </span>
          )}
          {cfg.mostrar_estado !== false && (
            <span
              className="truncate text-xs opacity-80"
              style={{ color: aceso ? textoAtivo : textoInativo }}
            >
              {estadoTexto}
            </span>
          )}
        </div>
      </div>

      {cfg.mostrar_slider && (
        <div
          className="mt-2 w-full"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <input
            type="range"
            min={0}
            max={100}
            value={aceso ? 100 : 0}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v > 50 && !aceso) acionar();
              if (v <= 50 && aceso) acionar();
            }}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-primary outline-none"
            style={{
              background: aceso
                ? `linear-gradient(to right, ${iconeAtivo} 0%, ${iconeAtivo} 100%)`
                : "rgba(255,255,255,0.15)",
            }}
          />
        </div>
      )}
    </button>
  );
}
