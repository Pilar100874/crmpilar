import { Bot, CheckCircle2, Loader2, Pause, PhoneOff, Play, Square, X, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  alternarPopupCampanhaIa, cancelarCampanhaIa, fecharCampanhaIa, pausarCampanhaIa, retomarCampanhaIa,
  useCampanhaIa, type StatusItem,
} from "@/lib/voz/campanhaIa";

const ROTULO: Record<StatusItem, string> = {
  aguardando: "Na fila", ligando: "Ligando…", concluido: "Atendida", sem_resposta: "Não atendeu", erro: "Erro", cancelado: "Cancelada",
};

function Icone({ s }: { s: StatusItem }) {
  if (s === "ligando") return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  if (s === "concluido") return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (s === "sem_resposta") return <PhoneOff className="h-4 w-4 text-warning" />;
  if (s === "erro" || s === "cancelado") return <XCircle className="h-4 w-4 text-destructive" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

/** Ícone flutuante + popup com a sequência das ligações feitas pela IA. */
export default function CampanhaIaPopup() {
  const c = useCampanhaIa();
  if (!c) return null;
  const feitos = c.itens.filter((x) => !["aguardando", "ligando"].includes(x.status)).length;
  const ativa = c.estado === "rodando" || c.estado === "pausada";

  return (
    <div className="fixed bottom-24 right-4 z-[60] flex flex-col items-end gap-2">
      {c.aberta && (
        <div className="w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-fade-in">
          <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
            <Bot className="h-4 w-4 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Ligações com IA</p>
              <p className="text-[11px] text-muted-foreground">
                {feitos}/{c.itens.length} · {c.estado === "rodando" ? "em andamento" : c.estado === "pausada" ? "pausada" : c.estado === "cancelada" ? "cancelada" : "finalizada"} · atendente ramal {c.ramalAtendente}
              </p>
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => alternarPopupCampanhaIa(false)} aria-label="Minimizar"><X className="h-4 w-4" /></Button>
          </div>
          <div className="h-1 bg-muted"><div className="h-1 bg-primary transition-all" style={{ width: `${(feitos / c.itens.length) * 100}%` }} /></div>
          <div className="max-h-72 overflow-y-auto">
            {c.itens.map((x, i) => (
              <div key={x.id + i} className={cn("flex items-center gap-2 border-b border-border/20 px-3 py-2", x.status === "ligando" && "bg-primary/5")}>
                <Icone s={x.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{x.nome}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{[x.empresa, x.numero].filter(Boolean).join(" · ")}</p>
                </div>
                <span className="text-[10px] text-muted-foreground">{ROTULO[x.status]}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 p-2">
            {ativa ? (
              <>
                {c.estado === "rodando"
                  ? <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={pausarCampanhaIa}><Pause className="h-3.5 w-3.5" />Pausar</Button>
                  : <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={retomarCampanhaIa}><Play className="h-3.5 w-3.5" />Continuar</Button>}
                <Button size="sm" variant="destructive" className="flex-1 gap-1" onClick={() => void cancelarCampanhaIa()}><Square className="h-3.5 w-3.5" />Cancelar</Button>
              </>
            ) : (
              <Button size="sm" variant="outline" className="flex-1" onClick={fecharCampanhaIa}>Fechar</Button>
            )}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => alternarPopupCampanhaIa()}
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        aria-label="Ligações com IA"
      >
        <Bot className={cn("h-6 w-6", c.estado === "rodando" && "animate-pulse")} />
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-background px-1 text-[10px] font-bold text-foreground shadow">
          {feitos}/{c.itens.length}
        </span>
      </button>
    </div>
  );
}
