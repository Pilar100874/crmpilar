import { useState } from "react";
import { Lightbulb, Plug, DoorOpen, Activity, Loader2, GripVertical, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Bloco, comandoAutomacao } from "@/lib/automacao/api";
import BlocoCamera from "./BlocoCamera";
import BlocoMapa from "./BlocoMapa";
import BlocoGrafico from "./BlocoGrafico";
import BlocoCena from "./BlocoCena";
import BlocoIcone from "./BlocoIcone";
import BlocoImagem from "./BlocoImagem";
import BlocoRealista from "./BlocoRealista";
import BlocoRastreamento from "./BlocoRastreamento";
import BlocoPortaria from "./BlocoPortaria";
import BlocoInterfone from "./BlocoInterfone";
import BlocoPilarFone from "./BlocoPilarFone";
import BlocoAmbiente from "./BlocoAmbiente";


const TIPOS_LIVRES = ["camera", "mapa", "grafico", "cena", "icone", "imagem", "rastreamento", "portaria", "interfone", "pilarfone", "ambiente"];

const ICONES = { luz: Lightbulb, tomada: Plug, portao: DoorOpen, sensor: Activity } as const;

interface Props {
  bloco: Bloco;
  ligado: boolean | null;
  onEstado: (ligado: boolean | null) => void;
  edicao?: boolean;
  onEditar?: () => void;
}

export default function BlocoCard({ bloco, ligado, onEstado, edicao, onEditar }: Props) {
  const [ocupado, setOcupado] = useState(false);
  const Icon = ICONES[bloco.tipo] ?? Activity;
  const aceso = ligado === true;
  const cfg = (bloco.config ?? {}) as Record<string, any>;
  const raio = typeof cfg.raio === "number" ? cfg.raio : 16;
  const transparente = cfg.transparente === true;
  const comLegenda = cfg.legenda !== false;

  const enviar = async (acao: "ligar" | "desligar" | "pulso" | "status") => {
    if (!bloco.device_id) {
      toast.error("Este bloco ainda não tem um dispositivo escolhido.");
      return;
    }
    setOcupado(true);
    const r = await comandoAutomacao(bloco.device_id, acao, bloco.canal);
    setOcupado(false);
    if (!r.ok) {
      toast.error(r.mensagem);
      return;
    }
    if (acao === "pulso") toast.success(`${bloco.nome} acionado.`);
    onEstado(r.ligado ?? (acao === "ligar" ? true : acao === "desligar" ? false : ligado));
  };

  if (TIPOS_LIVRES.includes(bloco.tipo)) {
    const conteudo =
      bloco.tipo === "ambiente" ? <BlocoAmbiente bloco={bloco} ligado={ligado} onEstado={onEstado} edicao={edicao} /> :
      bloco.tipo === "camera" ? <BlocoCamera bloco={bloco} /> :
      bloco.tipo === "mapa" ? <BlocoMapa bloco={bloco} /> :
      bloco.tipo === "rastreamento" ? <BlocoRastreamento bloco={bloco} /> :
      bloco.tipo === "portaria" ? <BlocoPortaria bloco={bloco} /> :
      bloco.tipo === "interfone" ? <BlocoInterfone bloco={bloco} /> :
      bloco.tipo === "pilarfone" ? <BlocoPilarFone bloco={bloco} /> :
      bloco.tipo === "grafico" ? <BlocoGrafico bloco={bloco} /> :
      bloco.tipo === "imagem" ? <BlocoImagem bloco={bloco} /> :
      bloco.tipo === "icone" ? <BlocoIcone bloco={bloco} ligado={ligado} onEstado={onEstado} /> :
      <BlocoCena bloco={bloco} ligado={ligado} onEstado={onEstado} />;

    return (
      <div
        className="relative h-full select-none overflow-hidden"
        style={{ borderRadius: raio, background: transparente ? "transparent" : undefined }}
      >
        {conteudo}
        {comLegenda && bloco.tipo !== "icone" && bloco.tipo !== "cena" && !["rastreamento", "portaria", "interfone", "pilarfone", "ambiente"].includes(bloco.tipo) && (
          <span className="pointer-events-none absolute bottom-1 left-2 right-2 truncate rounded bg-background/70 px-1.5 py-0.5 text-[11px] font-medium">
            {bloco.nome}
          </span>
        )}
        {edicao && (
          <div
            className="absolute inset-0 z-[1200] bg-background/60 backdrop-blur-[1px] flex items-center justify-center gap-2"
            style={{ borderRadius: raio }}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
            <Button variant="secondary" size="icon" className="h-8 w-8" onClick={onEditar}>
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  if ((bloco.config as Record<string, unknown> | null)?.estilo === "realista") {
    return (
      <BlocoRealista bloco={bloco} ligado={ligado} onEstado={onEstado} edicao={edicao} onEditar={onEditar} />
    );
  }

  return (
    <div
      className={cn(
        "h-full border p-3 flex flex-col gap-2 transition-colors select-none",
        transparente
          ? "bg-transparent border-transparent"
          : aceso ? "bg-primary/15 border-primary/40" : "bg-card border-border",
      )}
      style={{ borderRadius: raio }}
    >

      <div className="flex items-start gap-2">
        {edicao && <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
        <div
          className={cn(
            "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
            aceso ? "bg-primary/25 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        </div>
        {comLegenda && (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{bloco.nome}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {bloco.tipo === "portao"
                ? "Toque para acionar"
                : bloco.tipo === "sensor"
                  ? ligado === null ? "Sem leitura" : aceso ? "Acionado" : "Normal"
                  : aceso ? "Ligado" : "Desligado"}
            </p>
          </div>
        )}

        {edicao && (
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onEditar}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {!edicao && (
        <div className="mt-auto flex items-center justify-between gap-2">
          {bloco.tipo === "portao" ? (
            <Button size="sm" className="w-full" disabled={ocupado} onClick={() => enviar("pulso")}>
              Acionar
            </Button>
          ) : bloco.tipo === "sensor" ? (
            <Button size="sm" variant="outline" className="w-full" disabled={ocupado} onClick={() => enviar("status")}>
              Atualizar
            </Button>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">{aceso ? "Ligado" : "Desligado"}</span>
              <Switch
                checked={aceso}
                disabled={ocupado}
                onCheckedChange={(v) => enviar(v ? "ligar" : "desligar")}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
