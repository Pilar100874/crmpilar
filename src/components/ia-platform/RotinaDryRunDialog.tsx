import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle2, Copy, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { CheckDryRun, ResultadoDryRun } from "@/lib/aip/dryRun";

const ICONES: Record<CheckDryRun["nivel"], JSX.Element> = {
  ok: <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />,
  alerta: <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />,
  erro: <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />,
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  nome: string;
  resultado: ResultadoDryRun | null;
}

export function RotinaDryRunDialog({ open, onOpenChange, nome, resultado }: Props) {
  const grupos = useMemo(() => {
    if (!resultado) return [];
    const mapa = new Map<string, CheckDryRun[]>();
    for (const c of resultado.checks) {
      mapa.set(c.grupo, [...(mapa.get(c.grupo) ?? []), c]);
    }
    return [...mapa.entries()];
  }, [resultado]);

  const totais = useMemo(() => {
    const c = resultado?.checks ?? [];
    return {
      erros: c.filter((x) => x.nivel === "erro").length,
      alertas: c.filter((x) => x.nivel === "alerta").length,
      ok: c.filter((x) => x.nivel === "ok").length,
    };
  }, [resultado]);

  const payloadTexto = resultado ? JSON.stringify(resultado.payload, null, 2) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Teste (dry-run) — {nome || "rotina sem nome"}</DialogTitle>
        </DialogHeader>

        {resultado && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={resultado.ok ? "outline" : "destructive"}>
                {resultado.ok ? "Pronta para executar" : "Correções necessárias"}
              </Badge>
              <Badge variant="secondary">{totais.ok} ok</Badge>
              {totais.alertas > 0 && <Badge variant="secondary">{totais.alertas} alerta(s)</Badge>}
              {totais.erros > 0 && <Badge variant="destructive">{totais.erros} erro(s)</Badge>}
              <span className="text-xs text-muted-foreground">Nenhuma execução real foi disparada.</span>
            </div>

            <div className="grid gap-2 rounded-lg border border-border p-3 text-xs sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground">Destino</p>
                <p className="font-medium">{resultado.destino}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Agendamento</p>
                <p className="font-medium">{resultado.resumoCron}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Próxima execução</p>
                <p className="font-medium">
                  {resultado.proxima ? new Date(resultado.proxima).toLocaleString("pt-BR") : "—"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {grupos.map(([grupo, checks]) => (
                <div key={grupo} className="space-y-1">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">{grupo}</p>
                  <ul className="space-y-1">
                    {checks.map((c, i) => (
                      <li key={`${grupo}-${i}`} className="flex gap-2 rounded-md border border-border p-2">
                        {ICONES[c.nivel]}
                        <div className="min-w-0">
                          <p className="text-sm">{c.titulo}</p>
                          {c.detalhe && (
                            <p className="break-words text-xs text-muted-foreground">{c.detalhe}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Prévia do payload</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(payloadTexto);
                    toast.success("Payload copiado");
                  }}
                >
                  <Copy className="mr-1 h-3.5 w-3.5" /> Copiar
                </Button>
              </div>
              <ScrollArea className="h-56 rounded-lg border border-border">
                <pre className="whitespace-pre-wrap p-3 text-[11px]">{payloadTexto}</pre>
              </ScrollArea>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
