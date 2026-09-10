import { useState } from "react";
import { Lightbulb, Plug, DoorOpen, Activity, Loader2, GripVertical, Pencil, Copy } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Bloco, comandoAutomacao } from "@/lib/automacao/api";
import { useModoDispositivo } from "@/lib/automacao/modoDispositivo";
import ReloginhoPulso from "./ReloginhoPulso";
import { useConfirmacaoBloco } from "./ConfirmacaoAcao";

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
import BlocoImagemLuz from "./BlocoImagemLuz";
import BlocoTexto, { fonteCss } from "./BlocoTexto";
import BlocoClima from "./BlocoClima";
import BlocoMoeda from "./BlocoMoeda";
import BlocoWeb from "./BlocoWeb";
import BlocoForma from "./BlocoForma";
import BlocoAbas from "./BlocoAbas";
import BlocoBubble from "./BlocoBubble";
import BlocoExpansivel from "./BlocoExpansivel";


const TIPOS_LIVRES = ["camera", "mapa", "grafico", "cena", "icone", "imagem", "rastreamento", "portaria", "interfone", "pilarfone", "ambiente", "imagemluz", "texto", "forma", "clima", "moeda", "web", "abas", "bubble", "expansivel"];

const ICONES = { luz: Lightbulb, tomada: Plug, portao: DoorOpen, sensor: Activity } as const;

/**
 * Fonte, cor e tamanho das letras válidos para QUALQUER elemento do painel.
 * As classes forçam os textos internos a herdarem o que foi escolhido.
 */
function estiloLetras(bloco: Bloco) {
  const cfg = (bloco.config ?? {}) as Record<string, any>;
  const style: React.CSSProperties = {};
  const classes: string[] = [];

  if (cfg.fonteGeral) style.fontFamily = fonteCss(cfg.fonteGeral);
  if (cfg.corTextoGeral) {
    style.color = cfg.corTextoGeral as string;
    classes.push("[&_*:not(svg):not(svg_*)]:!text-[color:inherit]");
  }
  if (typeof cfg.tamanhoTextoGeral === "number") {
    style.fontSize = cfg.tamanhoTextoGeral;
    classes.push("[&_*]:!text-[length:inherit] [&_*]:!leading-tight");
  }
  if (cfg.negritoGeral) {
    style.fontWeight = 700;
    classes.push("[&_*]:!font-bold");
  }
  return { style, className: classes.join(" ") };
}

interface Props {
  bloco: Bloco;
  ligado: boolean | null;
  onEstado: (ligado: boolean | null) => void;
  edicao?: boolean;
  onEditar?: () => void;
  /** Duplica o elemento sem sair do painel. */
  onDuplicar?: () => void;
  /** Avisa o painel que o elemento foi tocado (usado pelas automações). */
  onAcionar?: () => void;
}

/** Envolve o elemento para que um toque também dispare as automações. */
export default function BlocoCard(props: Props) {
  const { bloco, ligado, onEstado, edicao, onAcionar } = props;
  const semDispositivo = !bloco.device_id;
  const letras = estiloLetras(bloco);
  const { pedir, dialogo } = useConfirmacaoBloco(bloco);

  // Elementos que tratam o próprio clique (botões internos, tela cheia, etc.).
  const proprioClick = ["camera", "rastreamento", "portaria", "pilarfone", "interfone", "clima", "moeda", "web", "texto", "grafico", "mapa", "abas", "expansivel"].includes(bloco.tipo);

  if (!semDispositivo || !onAcionar || edicao || proprioClick) {
    return (
      <div
        className={cn("h-full", letras.className)}
        style={letras.style}
        onClick={() => !edicao && !proprioClick && onAcionar?.()}
      >
        <BlocoCardInterno {...props} />
      </div>
    );
  }

  // Elemento sem equipamento: o toque só serve para disparar as automações.
  return (
    <div
      className={cn("h-full cursor-pointer", letras.className)}
      style={letras.style}
      onClickCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
        pedir(() => {
          onEstado(!(ligado === true));
          onAcionar();
        });
      }}
    >
      <BlocoCardInterno {...props} />
      {dialogo}
    </div>
  );
}

function BlocoCardInterno({ bloco, ligado, onEstado, edicao, onEditar, onDuplicar, onAcionar }: Props) {
  const [ocupado, setOcupado] = useState(false);
  // Quando o dispositivo trabalha em modo pulso, mostra a barra de
  // acompanhamento enquanto o pulso está ativo.
  const [pulsando, setPulsando] = useState(false);
  // Contagem do auto-desligar (aparelho liga e desliga sozinho após o tempo).
  const [contagemAuto, setContagemAuto] = useState(false);
  const Icon = ICONES[bloco.tipo] ?? Activity;
  const aceso = ligado === true;
  const cfg = (bloco.config ?? {}) as Record<string, any>;
  const raio = typeof cfg.raio === "number" ? cfg.raio : 16;
  const transparente = cfg.transparente === true;
  const comLegenda = cfg.legenda !== false;
  const mostrarNome = comLegenda && cfg.mostrarNome !== false;
  const mostrarSituacao = comLegenda && cfg.mostrarSituacao !== false;

  // O comportamento do botão vem do que foi configurado no dispositivo.
  const modoDispositivo = useModoDispositivo(bloco.device_id);
  // Enquanto a configuração carrega, usa alternância, que também é o padrão
  // do backend. Assim um portão configurado como liga/desliga nunca dispara
  // um pulso só por ter sido tocado logo após abrir a tela.
  const porPulso = modoDispositivo?.modo === "momentary";




  const { pedir, dialogo } = useConfirmacaoBloco(bloco);

  const enviar = (acao: "ligar" | "desligar" | "pulso" | "status") =>
    acao === "status" ? executar(acao) : pedir(() => executar(acao));

  const executar = async (acao: "ligar" | "desligar" | "pulso" | "status") => {
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
    if (acao === "pulso") {
      toast.success(`${bloco.nome} acionado.`);
      setPulsando(true);
    }
    if (acao === "ligar" && modoDispositivo?.autoDesligarMs) {
      // O aparelho desliga sozinho: acompanha com a mesma barra.
      setContagemAuto(true);
    }
    if (acao === "desligar") setContagemAuto(false);
    onEstado(r.ligado ?? (acao === "ligar" ? true : acao === "desligar" ? false : ligado));
  };

  const fimDoPulso = () => {
    setPulsando(false);
    // Depois do pulso o equipamento volta para desligado.
    onEstado(false);
  };

  const fimDoAutoDesligar = () => {
    setContagemAuto(false);
    onEstado(false);
  };

  if (TIPOS_LIVRES.includes(bloco.tipo)) {
    const conteudo =
      bloco.tipo === "expansivel" ? <BlocoExpansivel bloco={bloco} edicao={edicao} /> :
      bloco.tipo === "abas" ? <BlocoAbas bloco={bloco} edicao={edicao} /> :
      bloco.tipo === "bubble" ? <BlocoBubble bloco={bloco} ligado={ligado} onEstado={onEstado} /> :
      bloco.tipo === "texto" ? <BlocoTexto bloco={bloco} /> :
      bloco.tipo === "forma" ? <BlocoForma bloco={bloco} /> :
      bloco.tipo === "clima" ? <BlocoClima bloco={bloco} /> :
      bloco.tipo === "moeda" ? <BlocoMoeda bloco={bloco} /> :
      bloco.tipo === "web" ? <BlocoWeb bloco={bloco} edicao={edicao} /> :
      bloco.tipo === "ambiente" ? <BlocoAmbiente bloco={bloco} ligado={ligado} onEstado={onEstado} edicao={edicao} /> :
      bloco.tipo === "imagemluz" ? <BlocoImagemLuz bloco={bloco} ligado={ligado} onEstado={onEstado} edicao={edicao} /> :
      bloco.tipo === "camera" ? <BlocoCamera bloco={bloco} edicao={edicao} onAcionar={onAcionar} /> :
      bloco.tipo === "mapa" ? <BlocoMapa bloco={bloco} edicao={edicao} onAcionar={onAcionar} /> :
      bloco.tipo === "rastreamento" ? <BlocoRastreamento bloco={bloco} edicao={edicao} onAcionar={onAcionar} /> :
      bloco.tipo === "portaria" ? <BlocoPortaria bloco={bloco} edicao={edicao} onAcionar={onAcionar} /> :
      bloco.tipo === "interfone" ? <BlocoInterfone bloco={bloco} /> :
      bloco.tipo === "pilarfone" ? <BlocoPilarFone bloco={bloco} /> :
      bloco.tipo === "grafico" ? <BlocoGrafico bloco={bloco} /> :
      bloco.tipo === "imagem" ? <BlocoImagem bloco={bloco} /> :
      bloco.tipo === "icone" ? <BlocoIcone bloco={bloco} ligado={ligado} onEstado={onEstado} /> :
      <BlocoCena bloco={bloco} ligado={ligado} onEstado={onEstado} />;

    const semCorte = bloco.tipo === "expansivel";
    return (
      <div
        className={cn(
          "relative h-full select-none",
          semCorte ? "overflow-visible z-[1300]" : "overflow-hidden",
          transparente && "[&>*:not([data-cheio])]:!bg-transparent [&>*:not([data-cheio])]:!border-transparent",
        )}
        style={{ borderRadius: raio, background: transparente ? "transparent" : undefined }}
      >

        {conteudo}
        {(mostrarNome || mostrarSituacao) && bloco.tipo !== "icone" && bloco.tipo !== "cena" && !["rastreamento", "portaria", "interfone", "pilarfone", "ambiente", "texto", "forma", "clima", "moeda", "web", "expansivel"].includes(bloco.tipo) && (
          <div className="pointer-events-none absolute bottom-1 left-2 right-2 flex items-center justify-between gap-1">
            {mostrarNome && (
              <span className="min-w-0 flex-1 truncate rounded bg-background/70 px-1.5 py-0.5 text-[11px] font-medium">
                {bloco.nome}
              </span>
            )}
            {mostrarSituacao && bloco.device_id && (
              <span className={cn(
                "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                aceso ? "bg-primary/85 text-primary-foreground" : "bg-background/70 text-muted-foreground",
              )}>
                {aceso ? "Ligado" : "Desligado"}
              </span>
            )}
          </div>
        )}
        {edicao && (
          <div
            className="absolute inset-0 z-[1200] bg-background/60 backdrop-blur-[1px] flex items-center justify-center gap-2"
            style={{ borderRadius: raio }}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
            <Button variant="secondary" size="icon" className="h-8 w-8" title="Editar elemento" onClick={onEditar}>
              <Pencil className="h-4 w-4" />
            </Button>
            {onDuplicar && (
              <Button
                variant="secondary" size="icon" className="h-8 w-8" title="Duplicar elemento"
                onClick={(e) => { e.stopPropagation(); onDuplicar(); }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  if ((bloco.config as Record<string, unknown> | null)?.estilo === "realista") {
    return (
      <div className="relative h-full">
        <BlocoRealista bloco={bloco} ligado={ligado} onEstado={onEstado} edicao={edicao} onEditar={onEditar} />
        {edicao && onDuplicar && (
          <Button
            variant="secondary" size="icon" className="absolute top-1 right-1 z-[1200] h-8 w-8 shadow"
            title="Duplicar elemento"
            onClick={(e) => { e.stopPropagation(); onDuplicar(); }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Copy className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative h-full border p-3 flex flex-col gap-2 transition-colors select-none",
        transparente
          ? "bg-transparent border-transparent"
          : aceso ? "bg-primary/15 border-primary/40" : "bg-card border-border",
      )}
        style={{ borderRadius: raio }}
      >

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
        {(mostrarNome || mostrarSituacao) && (
          <div className="min-w-0 flex-1">
            {mostrarNome && <p className="text-sm font-semibold truncate">{bloco.nome}</p>}
            {mostrarSituacao && (
              <p className="text-[11px] text-muted-foreground truncate">
                {bloco.tipo === "sensor"
                  ? ligado === null ? "Sem leitura" : aceso ? "Acionado" : "Normal"
                  : porPulso
                    ? "Toque para acionar"
                    : aceso ? "Ligado" : "Desligado"}
              </p>
            )}

          </div>
        )}

        {edicao && (
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar elemento" onClick={onEditar}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {onDuplicar && (
              <Button
                variant="ghost" size="icon" className="h-7 w-7" title="Duplicar elemento"
                onClick={(e) => { e.stopPropagation(); onDuplicar(); }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {!edicao && (
        <div className="mt-auto flex items-center justify-between gap-2">
          {bloco.tipo === "sensor" ? (
            <Button size="sm" variant="outline" className="w-full" disabled={ocupado} onClick={() => enviar("status")}>
              Atualizar
            </Button>
          ) : porPulso ? (
            <Button size="sm" className="w-full" disabled={ocupado || pulsando} onClick={() => enviar("pulso")}>
              {pulsando ? "Acionando…" : "Acionar"}
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
