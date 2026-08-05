import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { gerarOrdemAgrupada, type AlertaManutencao } from "@/lib/cv/manutencao";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  alertas: AlertaManutencao[];
  vehicleLabel?: string;
  vehicleId?: string | null;
  vehicleKm?: number | null;
  driverId?: string | null;
  movementId?: string | null;
  onGerado?: () => void;
}

/**
 * Popup exibido ao selecionar o veículo na entrada/saída.
 * Apenas informa as manutenções vencidas/próximas — a ordem de serviço
 * é gerada automaticamente e fica disponível em Paradas de Manutenção.
 */
export function CVMaintenanceVencidasDialog({
  open, onOpenChange, alertas, vehicleLabel, vehicleId, vehicleKm, driverId, movementId, onGerado,
}: Props) {
  const [gerando, setGerando] = useState(false);
  const [gerou, setGerou] = useState(false);
  const feito = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !vehicleId) return;
    const pendentes = alertas.filter((a) => !a.ordemAberta);
    if (!pendentes.length) { setGerou(false); return; }
    if (feito.current === vehicleId) return;
    feito.current = vehicleId;
    setGerando(true);
    gerarOrdemAgrupada({ vehicleId, alertas, driverId, movementId, vehicleKm })
      .then((r) => { setGerou(!!r.criado); if (r.criado) onGerado?.(); })
      .catch(() => {})
      .finally(() => setGerando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vehicleId]);

  useEffect(() => { if (!open) feito.current = null; }, [open]);

  const vencidos = alertas.filter((a) => a.vencido);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Manutenções pendentes {vehicleLabel ? `— ${vehicleLabel}` : ""}
          </DialogTitle>
          <DialogDescription>
            {vencidos.length
              ? `${vencidos.length} item(ns) vencido(s) neste veículo.`
              : "Itens próximos do vencimento neste veículo."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {alertas.map((a) => (
            <div
              key={a.plan.id}
              className={`rounded-md border-2 px-3 py-2 ${
                a.vencido
                  ? "border-destructive bg-destructive/10"
                  : "border-amber-500 bg-amber-500/10"
              }`}
            >
              <p className="text-sm font-semibold text-foreground">{a.plan.name}</p>
              <p className="text-xs text-muted-foreground">{a.detalhe}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {gerando ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando ordem de serviço automaticamente...</>
          ) : (
            <><CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
              {gerou
                ? "Ordem de serviço gerada automaticamente e disponível em Paradas de Manutenção."
                : "Ordem de serviço já registrada em Paradas de Manutenção."}
            </>
          )}
        </p>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Entendi, continuar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
