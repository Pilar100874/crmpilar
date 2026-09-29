import { useEffect, useState } from "react";
import { addDays, format } from "date-fns";
import { CalendarCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast-config";
import {
  buscarProximoContatoFuturo,
  finalizarAtendimento,
  type CanalAtendimento,
  type TarefaFutura,
} from "@/lib/atendimento/finalizarAtendimento";
import { ConflitoDataDialog } from "./FinalizarAtendimentoDialog";

export const ALTURA_BARRA_PROXIMO = 56;

interface Props {
  contato: { id: string; nome: string };
  canal: CanalAtendimento;
  usuarioId: string;
  estabelecimentoId: string;
  onFinalizado?: () => void;
}

/** Barra fixa na parte de baixo do quadro central: define o próximo contato e finaliza. */
export function BarraProximoContato({ contato, canal, usuarioId, estabelecimentoId, onFinalizado }: Props) {
  const [data, setData] = useState(format(addDays(new Date(), 3), "yyyy-MM-dd"));
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [conflito, setConflito] = useState<TarefaFutura | null>(null);

  useEffect(() => { setObs(""); setData(format(addDays(new Date(), 3), "yyyy-MM-dd")); }, [contato.id]);

  const dataObj = data ? new Date(`${data}T00:00:00`) : null;

  const executar = async (escolha?: "nova" | "antiga" | "ambas") => {
    if (!dataObj) return;
    setSalvando(true);
    try {
      await finalizarAtendimento({
        contactId: contato.id,
        contactName: contato.nome,
        canal,
        observacao: obs,
        proximaData: dataObj,
        usuarioId,
        estabelecimentoId,
        escolha,
      });
      toast.success("Atendimento finalizado e próximo contato agendado");
      onFinalizado?.();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível finalizar o atendimento");
    } finally {
      setSalvando(false);
    }
  };

  const finalizar = async () => {
    if (!dataObj || isNaN(dataObj.getTime())) return toast.error("Informe a data do próximo contato");
    setSalvando(true);
    const futura = await buscarProximoContatoFuturo(contato.id, usuarioId).catch(() => null);
    setSalvando(false);
    if (futura) { setConflito(futura); return; }
    void executar();
  };

  return (
    <div
      style={{ height: ALTURA_BARRA_PROXIMO }}
      className="absolute inset-x-0 bottom-0 z-[1100] flex items-center gap-2 border-t border-destructive/30 bg-card px-3 shadow-[0_-4px_12px_hsl(var(--foreground)/0.06)]"
    >
      <CalendarCheck className="h-5 w-5 shrink-0 text-destructive" />
      <div className="min-w-0 shrink">
        <p className="truncate text-xs font-semibold text-foreground">Próximo contato</p>
        <p className="truncate text-[10px] text-muted-foreground">{contato.nome}</p>
      </div>
      <Input type="date" value={data} min={format(new Date(), "yyyy-MM-dd")} onChange={(e) => setData(e.target.value)} className="h-8 w-[140px] shrink-0 text-xs" />
      <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observação (opcional)" className="h-8 min-w-0 flex-1 text-xs" />
      <Button size="sm" onClick={finalizar} disabled={salvando} className="h-8 shrink-0 gap-1.5">
        {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
        Finalizar
      </Button>
      {dataObj && (
        <ConflitoDataDialog
          futura={conflito}
          nova={dataObj}
          onCancelar={() => setConflito(null)}
          onEscolher={(e) => { setConflito(null); void executar(e); }}
        />
      )}
    </div>
  );
}
