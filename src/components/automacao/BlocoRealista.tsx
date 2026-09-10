import { useState } from "react";
import { Lightbulb, Plug, DoorOpen, Activity, Loader2, GripVertical, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Bloco, comandoAutomacao } from "@/lib/automacao/api";
import { useModoDispositivo } from "@/lib/automacao/modoDispositivo";
import ReloginhoPulso from "./ReloginhoPulso";

const ICONES = { luz: Lightbulb, tomada: Plug, portao: DoorOpen, sensor: Activity } as const;

interface Props {
  bloco: Bloco;
  ligado: boolean | null;
  onEstado: (ligado: boolean | null) => void;
  edicao?: boolean;
  onEditar?: () => void;
}

/**
 * Botão com visual realista inspirado no template "realistic_button"
 * (agpearson72/realistic_button — MIT, Home Assistant):
 * borda 3D, brilho de vidro no topo, glow colorido quando ligado
 * e bolinha de status no canto.
 */
export default function BlocoRealista({ bloco, ligado, onEstado, edicao, onEditar }: Props) {
  const [ocupado, setOcupado] = useState(false);
  const [pressionado, setPressionado] = useState(false);
  // Barra de acompanhamento enquanto o pulso está ativo.
  const [pulsando, setPulsando] = useState(false);
  // Contagem do auto-desligar (aparelho desliga sozinho após o tempo).
  const [contagemAuto, setContagemAuto] = useState(false);
  const Icon = ICONES[bloco.tipo] ?? Activity;
  const aceso = ligado === true;
  const cfg = (bloco.config ?? {}) as Record<string, any>;
  const cor = (cfg.cor as string) || "#facc15";
  const raio = typeof cfg.raio === "number" ? cfg.raio : 22;
  const transparente = cfg.transparente === true;
  const comLegenda = cfg.legenda !== false;
  const modoDispositivo = useModoDispositivo(bloco.device_id);
  // O padrão é alternância; somente trata como pulso após ler essa
  // configuração no cadastro do dispositivo.
  const porPulso = modoDispositivo?.modo === "momentary";


  const { pedir, dialogo } = useConfirmacaoBloco(bloco);

  const acao = () => {
    if (edicao) return;
    pedir(executar);
  };

  const executar = async () => {
    if (!bloco.device_id) {
      toast.error("Este bloco ainda não tem um dispositivo escolhido.");
      return;
    }
    // Segue o que foi configurado no dispositivo: pulso ou liga/desliga.
    const comando: "ligar" | "desligar" | "pulso" | "status" =
      bloco.tipo === "sensor" ? "status" : porPulso ? "pulso" : aceso ? "desligar" : "ligar";
    setOcupado(true);
    const r = await comandoAutomacao(bloco.device_id, comando, bloco.canal);
    setOcupado(false);
    if (!r.ok) {
      toast.error(r.mensagem);
      return;
    }
    if (comando === "pulso") {
      toast.success(`${bloco.nome} acionado.`);
      setPulsando(true);
    }
    if (comando === "ligar" && modoDispositivo?.autoDesligarMs) {
      // O aparelho desliga sozinho: acompanha com a mesma barra.
      setContagemAuto(true);
    }
    if (comando === "desligar") setContagemAuto(false);
    onEstado(r.ligado ?? (comando === "ligar" ? true : comando === "desligar" ? false : ligado));
  };

  const fimDoPulso = () => {
    setPulsando(false);
    onEstado(false);
  };

  const fimDoAutoDesligar = () => {
    setContagemAuto(false);
    onEstado(false);
  };

  return (
    <button
      type="button"
      onClick={acao}
      disabled={ocupado || pulsando}
      onPointerDown={() => setPressionado(true)}
      onPointerUp={() => setPressionado(false)}
      onPointerLeave={() => setPressionado(false)}
      className={cn(
        "relative h-full w-full select-none overflow-hidden border p-3 text-left transition-all duration-150",
        transparente ? "border-transparent bg-transparent" : "border-border bg-gradient-to-b from-muted/40 to-muted",
        pressionado && !edicao && "scale-[0.97]",
      )}
      style={{
        borderRadius: raio,
        boxShadow: transparente
          ? undefined
          : aceso
            ? `0 10px 22px -8px ${cor}80, inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -8px 16px rgba(0,0,0,0.10)`
            : "0 8px 16px -10px rgba(0,0,0,0.45), inset 0 -6px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.4)",
      }}

    >
      {/* brilho de vidro no topo */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[22px]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 55%, transparent 100%)",
        }}
      />
      {/* glow colorido quando ligado, subindo de baixo */}
      {aceso && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(120% 90% at 50% 100%, ${cor}59 0%, ${cor}26 40%, transparent 70%)`,
          }}
        />
      )}
      {/* bolinha de status */}
      <span
        className={cn(
          "absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full",
          ligado === null ? "bg-muted-foreground/40" : aceso ? "bg-green-400" : "bg-red-400/70",
        )}
        style={aceso ? { boxShadow: "0 0 8px rgba(74,222,128,0.9)" } : undefined}
      />

      {/* relóginho de acompanhamento do pulso / auto-desligar */}
      {(pulsando || contagemAuto) && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          {pulsando && porPulso && (
            <ReloginhoPulso duracaoMs={modoDispositivo?.pulsoMs ?? 1000} onFim={fimDoPulso} />
          )}
          {contagemAuto && !porPulso && aceso && modoDispositivo?.autoDesligarMs && (
            <ReloginhoPulso duracaoMs={modoDispositivo.autoDesligarMs} onFim={fimDoAutoDesligar} />
          )}
        </div>
      )}

      <div className="relative flex h-full flex-col">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-2xl transition-colors",
            aceso ? "text-foreground" : "text-muted-foreground",
          )}
          style={
            aceso
              ? { background: `${cor}33`, color: cor, boxShadow: `0 0 14px ${cor}55` }
              : { background: "hsl(var(--background) / 0.6)" }
          }
        >
          {ocupado ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
        </div>

        {comLegenda && (
          <div className="mt-auto min-w-0">
            <p className="truncate text-sm font-semibold">{bloco.nome}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {bloco.tipo === "sensor"
                  ? ligado === null ? "Toque para ler" : aceso ? "Acionado" : "Normal"
                  : porPulso ? (pulsando ? "Acionando…" : "Toque para acionar") : aceso ? "Ligado" : "Desligado"}
            </p>
          </div>
        )}

      </div>

      {edicao && (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-[22px] bg-background/60 backdrop-blur-[1px]">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onEditar?.();
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      )}
    </button>
  );
}
