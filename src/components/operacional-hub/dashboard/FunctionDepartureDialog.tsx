import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const DEPARTURE_REASONS = [
  "Remanejamento",
  "Apoio a outro setor",
  "Emergência operacional",
  "Treinamento",
  "Reunião/Evento",
  "Manutenção urgente",
  "Solicitação da chefia",
];

interface FunctionDepartureDialogProps {
  onDepartureConfirmed?: () => void;
}

export function FunctionDepartureDialog({ onDepartureConfirmed }: FunctionDepartureDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [observations, setObservations] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleConfirm = async () => {
    if (!reason) {
      toast({ title: "Selecione um motivo", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-function-departure", {
        body: { reason, observations },
      });

      if (error) throw error;

      toast({
        title: "Saída registrada",
        description: `${data.tasks_redistributed} de ${data.tasks_total} tarefas foram redistribuídas.`,
      });

      setOpen(false);
      setReason("");
      setObservations("");
      onDepartureConfirmed?.();
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Erro ao registrar saída",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 border-warning/50 text-warning hover:bg-warning/10 rounded-lg h-9 px-3 text-xs font-semibold"
        onClick={() => setOpen(true)}
      >
        <LogOut className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Saí p/ outra função</span>
        <span className="sm:hidden">Sair</span>
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registrar saída para outra função</AlertDialogTitle>
            <AlertDialogDescription>
              Suas tarefas pendentes serão automaticamente redistribuídas para outro colaborador com a mesma função.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTURE_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Detalhes adicionais..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
              disabled={submitting || !reason}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              {submitting ? "Registrando..." : "Confirmar Saída"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
