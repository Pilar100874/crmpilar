import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/lib/toast-config";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Automacao {
  id: string;
  name: string;
  description: string | null;
}

interface Props {
  disabled?: boolean;
}

const btnClass =
  "h-9 px-3 rounded-xl bg-card border border-border/30 shadow-sm flex items-center gap-2 hover:bg-muted hover:border-border/50 hover:shadow-md transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm";

export default function AutomacoesChatTool({ disabled }: Props) {
  const [automacoes, setAutomacoes] = useState<Automacao[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, setPending] = useState<Automacao | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const estId = await getEstabelecimentoId();
        if (!estId) return;
        const { data, error } = await supabase
          .from("marketing_automations" as any)
          .select("id, name, description, config, active")
          .eq("estabelecimento_id", estId)
          .eq("active", true);
        if (error) throw error;
        const filtered = (data || []).filter((a: any) => {
          const cfg = a.config || {};
          if (cfg.tipo_disparo !== "manual") return false;
          const local = cfg.local_disponivel;
          const arr = Array.isArray(local) ? local : local ? [local] : [];
          return arr.includes("chat");
        });
        setAutomacoes(filtered.map((a: any) => ({ id: a.id, name: a.name, description: a.description })));
      } catch (e) {
        console.error("Erro ao carregar automações de chat:", e);
      }
    })();
  }, []);

  const handlePick = (a: Automacao) => {
    setPickerOpen(false);
    setPending(a);
  };

  const handleRun = async () => {
    if (!pending) return;
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("marketing-automation-execute", {
        body: { automationId: pending.id },
      });
      if (error) throw error;
      toast.success(`Automação "${pending.name}" iniciada!`);
      setPending(null);
    } catch (e: any) {
      toast.error(`Falha ao executar: ${e?.message ?? e}`);
    } finally {
      setRunning(false);
    }
  };

  if (automacoes.length === 0) return null;

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setPickerOpen(true)}
              className={btnClass}
            >
              <Zap size={16} className="text-primary" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Executar uma automação</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecione a automação</DialogTitle>
            <DialogDescription>
              Escolha qual automação deseja executar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
            {automacoes.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => handlePick(a)}
                className="text-left p-3 rounded-lg border border-border/40 hover:bg-muted hover:border-border transition-all flex items-start gap-3"
              >
                <Zap size={16} className="text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{a.name}</div>
                  {a.description ? (
                    <div className="text-xs text-muted-foreground line-clamp-2">{a.description}</div>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Executar automação</AlertDialogTitle>
            <AlertDialogDescription>
              Confirma a execução da automação <strong>{pending?.name}</strong>?
              {pending?.description ? <><br />{pending.description}</> : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={running}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRun} disabled={running}>
              {running ? "Executando..." : "Executar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
