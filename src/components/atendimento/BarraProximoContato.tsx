import { useEffect, useRef, useState } from "react";
import { addDays, format } from "date-fns";
import { CalendarCheck, Loader2, Undo2, Users, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { cn } from "@/lib/utils";
import {
  buscarProximoContatoFuturo,
  finalizarAtendimento,
  inativarClienteDoFluxo,
  lerResultadoPendente,
  limparPendencia,
  type CanalAtendimento,
  type TarefaFutura,
} from "@/lib/atendimento/finalizarAtendimento";
import { ConflitoDataDialog } from "./FinalizarAtendimentoDialog";

export const ALTURA_BARRA_PROXIMO = 56;

interface Props {
  contato: { id: string; nome: string };
  pendentes?: { id: string; nome: string }[];
  onTrocarContato?: (id: string) => void;
  focoToken?: number;
  simultaneo?: boolean;
  onSimultaneo?: (v: boolean) => void;
  canal: CanalAtendimento;
  usuarioId: string;
  estabelecimentoId: string;
  onFinalizado?: () => void;
  /** No celular: renderiza no fluxo (acima da navegação), sem sobrepor a barra do chat. */
  emFluxo?: boolean;
}

/** Barra fixa na parte de baixo do quadro central: define o próximo contato e finaliza. */
export function BarraProximoContato({ contato, pendentes = [], onTrocarContato, focoToken, simultaneo, onSimultaneo, canal, usuarioId, estabelecimentoId, onFinalizado, emFluxo }: Props) {
  const [data, setData] = useState(format(addDays(new Date(), 3), "yyyy-MM-dd"));
  const [obs, setObs] = useState("");
  const [motivo, setMotivo] = useState("");
  const [modoInativar, setModoInativar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [conflito, setConflito] = useState<TarefaFutura | null>(null);
  const dataRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setObs(""); setMotivo(""); setModoInativar(false);
    const tipo = canal === "orcamento" ? "telefone" : canal;
    void supabase.from("atendimento_config_proxima_data").select("dias_padrao")
      .eq("estabelecimento_id", estabelecimentoId).eq("tipo_contato", tipo).maybeSingle()
      .then(({ data: cfg }) => setData(format(addDays(new Date(), cfg?.dias_padrao ?? 3), "yyyy-MM-dd")));
  }, [contato.id, canal, estabelecimentoId]);

  // Botão "Finalizar atendimento" do cartão: leva o foco para a data
  useEffect(() => {
    if (!focoToken) return;
    setModoInativar(false);
    const t = setTimeout(() => {
      const el = dataRef.current;
      if (!el) return;
      el.focus();
      try { (el as any).showPicker?.(); } catch { /* navegador sem suporte */ }
      el.classList.add("ring-2", "ring-destructive");
      setTimeout(() => el.classList.remove("ring-2", "ring-destructive"), 1500);
    }, 60);
    return () => clearTimeout(t);
  }, [focoToken]);

  const dataObj = data ? new Date(`${data}T00:00:00`) : null;

  const executar = async (escolha?: "nova" | "antiga" | "ambas") => {
    if (!dataObj) return;
    setSalvando(true);
    try {
      const resultado = lerResultadoPendente(contato.id);
      const res: any = await finalizarAtendimento({
        contactId: contato.id,
        contactName: contato.nome,
        canal,
        flagId: resultado?.flagId,
        observacao: [resultado?.nome, obs.trim()].filter(Boolean).join(" - "),
        proximaData: dataObj, usuarioId, estabelecimentoId, escolha,
      });
      limparPendencia(contato.id);
      toast.success(res?.ajustada
        ? `Atendimento finalizado — próximo contato ajustado para ${res.dataAjustada.toLocaleDateString("pt-BR")}`
        : "Atendimento finalizado e próximo contato agendado");
      onFinalizado?.();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível finalizar o atendimento");
    } finally {
      setSalvando(false);
    }
  };

  const finalizar = async () => {
    if (modoInativar) {
      if (!motivo.trim()) return toast.error("Informe o motivo da inativação");
      setSalvando(true);
      try {
        await inativarClienteDoFluxo({ contactId: contato.id, motivo, canal, usuarioId, estabelecimentoId });
        limparPendencia(contato.id);
        toast.success("Cliente retirado do fluxo da agenda");
        onFinalizado?.();
      } catch { toast.error("Não foi possível inativar o cliente"); } finally { setSalvando(false); }
      return;
    }
    if (!dataObj || isNaN(dataObj.getTime())) { dataRef.current?.focus(); return toast.error("Informe a data do próximo contato"); }
    setSalvando(true);
    const futura = await buscarProximoContatoFuturo(contato.id, usuarioId).catch(() => null);
    setSalvando(false);
    if (futura && futura.date !== data) { setConflito(futura); return; }
    void executar(futura ? "antiga" : undefined);
  };

  const ignorar = () => {
    limparPendencia(contato.id);
    toast.success("Movimentação ignorada — cartão voltou ao estado anterior");
  };

  return (
    <div
      style={{ minHeight: ALTURA_BARRA_PROXIMO }}
      className={cn(
"flex flex-col justify-center gap-1 border-t border-destructive/30 bg-card py-1.5 pl-3 shadow-[0_-4px_12px_hsl(var(--foreground)/0.06)]",
        emFluxo ? "relative w-full flex-shrink-0 pr-3" : "absolute inset-x-0 bottom-0 z-[130] pr-16"
      )}
    >
      {pendentes.length > 1 && (
        <div className="flex items-center gap-1 overflow-x-auto">
          <span className="shrink-0 text-[10px] font-semibold text-destructive">{pendentes.length} atendimentos a finalizar:</span>
          {pendentes.map((p) => (
            <button key={p.id} type="button" onClick={() => onTrocarContato?.(p.id)}
              className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                p.id === contato.id ? "border-destructive bg-destructive/10 text-destructive" : "border-border text-muted-foreground hover:bg-muted")}>
              {p.nome}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <CalendarCheck className="order-1 h-5 w-5 shrink-0 text-destructive" />
        <div className="order-2 min-w-[96px] max-w-full flex-1 sm:min-w-0 sm:max-w-[140px] sm:flex-none">
          <p className="truncate text-xs font-semibold text-foreground">{modoInativar ? "Inativar cliente" : "Próximo contato"}</p>
          <p className="truncate text-[10px] text-muted-foreground">{contato.nome}</p>
        </div>
        {modoInativar ? (
          <Input autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo da inativação (obrigatório)" className="order-4 h-8 min-w-0 flex-1 text-xs max-sm:w-full" />
        ) : (
          <>
            <Input ref={dataRef} type="date" value={data} min={format(new Date(), "yyyy-MM-dd")} onChange={(e) => setData(e.target.value)} className="order-4 h-8 w-[140px] shrink-0 text-xs transition-shadow max-sm:w-[120px]" />
            <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observação (opcional)" className="order-5 hidden h-8 min-w-0 flex-1 text-xs sm:block" />
          </>
        )}
        <label className="order-6 flex shrink-0 cursor-pointer items-center gap-1 text-[10px] text-muted-foreground sm:order-5" title="Permite abrir outro cliente sem finalizar este. Todos continuam obrigatórios.">
          <Users className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Atender simultâneo</span>
          <Switch checked={!!simultaneo} onCheckedChange={(v) => onSimultaneo?.(v)} className="scale-75" />
        </label>
        {!modoInativar && (
          <Button size="icon" variant="ghost" className="order-7 h-8 w-8 shrink-0 sm:order-6" title="Ignorar movimentação (ação feita por engano)" onClick={ignorar}>
            <Undo2 className="h-4 w-4" />
          </Button>
        )}
        <Button size="icon" variant="ghost" className="order-8 h-8 w-8 shrink-0 text-destructive sm:order-7" title={modoInativar ? "Voltar" : "Inativar cliente"} onClick={() => setModoInativar((v) => !v)}>
          {modoInativar ? <CalendarCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
        </Button>
        <Button size="sm" onClick={finalizar} disabled={salvando} variant={modoInativar ? "destructive" : "default"} className="order-3 ml-auto h-8 shrink-0 gap-1.5 sm:order-8 sm:ml-0">
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
          {modoInativar ? "Inativar" : "Finalizar"}
        </Button>
      </div>
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
