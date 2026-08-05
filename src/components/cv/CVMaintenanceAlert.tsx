import { useState } from "react";
import { AlertTriangle, Wrench, Loader2, CheckCircle, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { gerarOrdemManutencao, gerarOrdemAgrupada, type AlertaManutencao } from "@/lib/cv/manutencao";

interface Props {
  alertas: AlertaManutencao[];
  compact?: boolean;
  driverId?: string | null;
  movementId?: string | null;
  vehicleKm?: number | null;
  vehicleId?: string | null;
  onGerado?: () => void;
}

/** Bloco chamativo de alertas de manutenção exibido nos cards de veículo. */
export function CVMaintenanceAlert({ alertas, compact, driverId, movementId, vehicleKm, vehicleId, onGerado }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  if (!alertas?.length) return null;

  const vencidos = alertas.filter((a) => a.vencido);
  const pendentes = alertas.filter((a) => !a.ordemAberta);
  const tone = vencidos.length
    ? "border-destructive bg-destructive/10 text-destructive"
    : "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400";

  const gerar = async (a: AlertaManutencao) => {
    setBusy(a.plan.id);
    try {
      const r = await gerarOrdemManutencao({ plan: a.plan, detalhe: a.detalhe, driverId, movementId, vehicleKm });
      toast[r.criado ? "success" : "info"](
        r.criado ? "Ordem de manutenção gerada para o encarregado" : "Já existe uma ordem aberta para este serviço",
      );
      onGerado?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar ordem");
    } finally {
      setBusy(null);
    }
  };

  const gerarTudo = async () => {
    if (!vehicleId) return;
    setBusy("__todos__");
    try {
      const r = await gerarOrdemAgrupada({ vehicleId, alertas, driverId, movementId, vehicleKm });
      toast[r.criado ? "success" : "info"](
        r.criado
          ? `Ordem gerada com checklist de ${r.itens} item(ns) para o encarregado`
          : "Todos os itens já possuem ordem aberta",
      );
      onGerado?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar ordem");
    } finally {
      setBusy(null);
    }
  };

  if (compact) {
    return (
      <div className={`mt-2 rounded-md border-2 px-2 py-1 text-[11px] font-semibold flex items-center gap-1 animate-pulse ${tone}`}>
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        {vencidos.length ? `${vencidos.length} manutenção(ões) vencida(s)` : `${alertas.length} manutenção(ões) próxima(s)`}
      </div>
    );
  }


  return (
    <div className={`rounded-lg border-2 p-3 space-y-2 ${tone}`}>
      <div className="flex items-center gap-2 font-bold text-sm">
        <AlertTriangle className="h-4 w-4 animate-pulse" />
        Manutenção pendente
      </div>
      {alertas.map((a) => (
        <div key={a.plan.id} className="flex items-center justify-between gap-2 rounded-md bg-background/70 px-2 py-1.5">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{a.plan.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{a.detalhe}</p>
          </div>
          {a.ordemAberta ? (
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle className="h-3.5 w-3.5" /> Ordem aberta
            </span>
          ) : (
            <Button size="sm" variant="outline" className="h-7 text-[11px] shrink-0" disabled={busy === a.plan.id} onClick={() => gerar(a)}>
              {busy === a.plan.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wrench className="h-3 w-3 mr-1" />}
              Gerar ordem
            </Button>
          )}
        </div>
      ))}
      {vehicleId && pendentes.length > 1 && (
        <Button
          size="sm" variant="secondary" className="w-full h-8 text-[11px]"
          disabled={busy === "__todos__"} onClick={gerarTudo}
        >
          {busy === "__todos__" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ListChecks className="h-3 w-3 mr-1" />}
          Gerar 1 ordem com checklist ({pendentes.length} itens)
        </Button>
      )}
    </div>

  );
}
