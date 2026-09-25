import { useState } from "react";
import { addDays, format } from "date-fns";
import { CalendarDays, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/toast-config";
import {
  buscarProximoContatoFuturo,
  finalizarAtendimento,
  limparPendencia,
  ROTULO_CANAL,
  type CanalAtendimento,
  type TarefaFutura,
} from "@/lib/atendimento/finalizarAtendimento";
import { ConflitoDataDialog } from "./FinalizarAtendimentoDialog";

const RESULTADOS = ["Solicitou retorno", "Não atendeu", "Ocupado", "Agendou visita", "Sem interesse", "Fechou negócio", "Caixa postal"];
const CANAIS: CanalAtendimento[] = ["telefone", "whatsapp", "email", "presencial"];

interface Props {
  contato: { id: string; nome: string };
  canalInicial: CanalAtendimento;
  usuarioId: string;
  estabelecimentoId: string;
  tarefaAtualId?: string | null;
  onFinalizado?: () => void;
}

/** Quadro fixo abaixo do atendimento: finaliza e já agenda o próximo contato. */
export function FinalizarProximoContatoInline({ contato, canalInicial, usuarioId, estabelecimentoId, tarefaAtualId, onFinalizado }: Props) {
  const [resultado, setResultado] = useState(RESULTADOS[0]);
  const [quando, setQuando] = useState(format(addDays(new Date(), 3), "yyyy-MM-dd'T'10:00"));
  const [canal, setCanal] = useState<CanalAtendimento>(canalInicial === "orcamento" ? "telefone" : canalInicial);
  const [resumo, setResumo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [conflito, setConflito] = useState<TarefaFutura | null>(null);

  const data = quando ? new Date(quando) : null;

  const executar = async (escolha?: "nova" | "antiga") => {
    if (!data) return;
    setSalvando(true);
    try {
      await finalizarAtendimento({
        contactId: contato.id,
        contactName: contato.nome,
        canal,
        observacao: `${resultado} — ${resumo.trim()}`,
        proximaData: data,
        usuarioId,
        estabelecimentoId,
        tarefaAtualId,
        escolha,
      });
      limparPendencia(contato.id);
      toast.success("Atendimento finalizado e próximo contato agendado");
      setResumo("");
      onFinalizado?.();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível finalizar o atendimento");
    } finally {
      setSalvando(false);
    }
  };

  const finalizar = async () => {
    if (!data || isNaN(data.getTime())) return toast.error("Informe a data do próximo contato");
    if (!resumo.trim()) return toast.error("Preencha o resumo do atendimento");
    setSalvando(true);
    const futura = await buscarProximoContatoFuturo(contato.id, usuarioId).catch(() => null);
    setSalvando(false);
    if (futura) { setConflito(futura); return; }
    void executar();
  };

  return (
    <div className="flex-shrink-0 border-t border-primary/20 bg-primary/5 px-5 py-4">
      <div className="mb-3 flex items-start gap-3">
        <CalendarDays className="mt-0.5 h-6 w-6 text-primary" />
        <div>
          <p className="text-sm font-semibold text-foreground">Finalizar e definir próximo contato</p>
          <p className="text-xs text-muted-foreground">O relacionamento continua com uma nova data.</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Resultado</span>
          <Select value={resultado} onValueChange={setResultado}>
            <SelectTrigger className="h-9 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>{RESULTADOS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Próximo contato</span>
          <Input type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} className="h-9 bg-background" />
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Canal</span>
          <Select value={canal} onValueChange={(v) => setCanal(v as CanalAtendimento)}>
            <SelectTrigger className="h-9 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>{CANAIS.map((c) => <SelectItem key={c} value={c}>{ROTULO_CANAL[c]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <Textarea value={resumo} onChange={(e) => setResumo(e.target.value)} placeholder="Resumo do atendimento..." className="mt-3 min-h-[52px] bg-background text-sm" />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" /> O próximo contato será incluído na agenda.
        </p>
        <Button onClick={finalizar} disabled={salvando} className="gap-2">
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
          Finalizar e reagendar
        </Button>
      </div>
      {data && (
        <ConflitoDataDialog
          futura={conflito}
          nova={data}
          onCancelar={() => setConflito(null)}
          onEscolher={(escolha) => { setConflito(null); void executar(escolha); }}
        />
      )}
    </div>
  );
}
