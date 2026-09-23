import { useEffect, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2, UserX } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { cn } from "@/lib/utils";
import {
  buscarProximoContatoFuturo,
  CANAIS_RESUMO_OBRIGATORIO,
  finalizarAtendimento,
  inativarClienteDoFluxo,
  ROTULO_CANAL,
  type CanalAtendimento,
  type TarefaFutura,
} from "@/lib/atendimento/finalizarAtendimento";

/** Pergunta qual data manter quando já existe um próximo contato agendado. */
export function ConflitoDataDialog({
  futura,
  nova,
  onEscolher,
  onCancelar,
}: {
  futura: TarefaFutura | null;
  nova: Date;
  onEscolher: (escolha: "nova" | "antiga") => void;
  onCancelar: () => void;
}) {
  return (
    <Dialog open={!!futura} onOpenChange={(o) => !o && onCancelar()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Já existe um próximo contato</DialogTitle>
          <DialogDescription>
            Só pode haver uma data futura por cliente. Qual data deseja usar?
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Button variant="outline" onClick={() => onEscolher("antiga")}>
            Manter a atual ({futura ? format(parseISO(futura.date), "dd/MM/yyyy") : ""})
          </Button>
          <Button onClick={() => onEscolher("nova")}>Usar a nova ({format(nova, "dd/MM/yyyy")})</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contato: { id: string; nome: string } | null;
  canal: CanalAtendimento;
  usuarioId: string;
  estabelecimentoId: string;
  tarefaAtualId?: string | null;
  obrigatorio?: boolean;
  onFinalizado?: () => void;
}

export function FinalizarAtendimentoDialog({
  open,
  onOpenChange,
  contato,
  canal,
  usuarioId,
  estabelecimentoId,
  tarefaAtualId,
  obrigatorio,
  onFinalizado,
}: Props) {
  const [data, setData] = useState<Date>(addDays(new Date(), 3));
  const [resumo, setResumo] = useState("");
  const [modoInativar, setModoInativar] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [futura, setFutura] = useState<TarefaFutura | null>(null);

  const resumoObrigatorio = CANAIS_RESUMO_OBRIGATORIO.includes(canal);

  useEffect(() => {
    if (!open) return;
    setResumo("");
    setMotivo("");
    setModoInativar(false);
    setFutura(null);
    const tipoConfig = canal === "orcamento" ? "telefone" : canal;
    void supabase
      .from("atendimento_config_proxima_data")
      .select("dias_padrao")
      .eq("estabelecimento_id", estabelecimentoId)
      .eq("tipo_contato", tipoConfig)
      .maybeSingle()
      .then(({ data: cfg }) => setData(addDays(new Date(), cfg?.dias_padrao ?? 3)));
  }, [open, canal, estabelecimentoId]);

  const concluir = async (escolha?: "nova" | "antiga") => {
    if (!contato) return;
    setSalvando(true);
    try {
      await finalizarAtendimento({
        contactId: contato.id,
        contactName: contato.nome,
        canal,
        observacao: resumo,
        proximaData: data,
        usuarioId,
        estabelecimentoId,
        tarefaAtualId,
        escolha,
      });
      toast.success("Atendimento finalizado");
      setFutura(null);
      onOpenChange(false);
      onFinalizado?.();
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível finalizar o atendimento");
    } finally {
      setSalvando(false);
    }
  };

  const confirmar = async () => {
    if (!contato) return;
    if (modoInativar) {
      if (!motivo.trim()) return toast.error("Informe o motivo da inativação");
      setSalvando(true);
      try {
        await inativarClienteDoFluxo({ contactId: contato.id, motivo, canal, usuarioId, estabelecimentoId });
        toast.success("Cliente retirado do fluxo da agenda");
        onOpenChange(false);
        onFinalizado?.();
      } catch (e) {
        console.error(e);
        toast.error("Não foi possível inativar o cliente");
      } finally {
        setSalvando(false);
      }
      return;
    }
    if (resumoObrigatorio && !resumo.trim()) return toast.error("Descreva o que foi conversado");
    const existente = await buscarProximoContatoFuturo(contato.id, usuarioId);
    if (existente && existente.date !== format(data, "yyyy-MM-dd")) {
      setFutura(existente);
      return;
    }
    await concluir(existente ? "antiga" : undefined);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!salvando) onOpenChange(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{modoInativar ? "Inativar cliente" : "Finalizar atendimento"}</DialogTitle>
            <DialogDescription>
              {contato?.nome} · {ROTULO_CANAL[canal]}
              {obrigatorio && !modoInativar && " — informe a próxima data para continuar."}
            </DialogDescription>
          </DialogHeader>

          {modoInativar ? (
            <div className="space-y-1.5">
              <Label>Motivo para tirar o cliente do fluxo *</Label>
              <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} placeholder="Ex.: empresa fechou, sem interesse..." />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Data do próximo contato *</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start gap-2 font-normal">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        {format(data, "dd/MM/yyyy", { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={data}
                        onSelect={(d) => d && setData(d)}
                        disabled={(d) => d <= new Date()}
                        locale={ptBR}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  {[1, 3, 7, 15].map((d) => (
                    <Button key={d} variant="ghost" size="sm" className="w-9 px-0 text-xs" onClick={() => setData(addDays(new Date(), d))}>
                      {d}d
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>O que foi conversado {resumoObrigatorio ? "*" : "(opcional)"}</Label>
                <Textarea value={resumo} onChange={(e) => setResumo(e.target.value)} rows={3} />
              </div>
            </div>
          )}

          <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
            <Button variant="link" size="sm" className="px-0 text-destructive" onClick={() => setModoInativar((v) => !v)}>
              {modoInativar ? "Voltar" : (<><UserX className="mr-1 h-3.5 w-3.5" />Inativar cliente</>)}
            </Button>
            <div className="flex gap-2">
              {!obrigatorio && (
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>Cancelar</Button>
              )}
              <Button onClick={() => void confirmar()} disabled={salvando} variant={modoInativar ? "destructive" : "default"}>
                {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {modoInativar ? "Inativar" : "Confirmar"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConflitoDataDialog
        futura={futura}
        nova={data}
        onCancelar={() => setFutura(null)}
        onEscolher={(e) => void concluir(e)}
      />
    </>
  );
}
