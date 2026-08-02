import { CheckModelo, ResultadoValidacao } from "@/lib/aip/validarModelo";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONES = {
  ok: CheckCircle2,
  alerta: AlertTriangle,
  erro: XCircle,
} as const;

const CORES = {
  ok: "text-emerald-600",
  alerta: "text-amber-600",
  erro: "text-destructive",
} as const;

interface Props {
  resultado: ResultadoValidacao;
  compacto?: boolean;
}

/** Mostra, em linguagem simples, se o modelo está pronto para rodar. */
export default function ValidacaoModeloPanel({ resultado, compacto }: Props) {
  const grupos = resultado.checks.reduce<Record<string, CheckModelo[]>>((acc, c) => {
    (acc[c.grupo] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={resultado.ok ? "default" : "destructive"}>
            {resultado.ok ? "Pronto para rodar" : "Precisa de ajustes"}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {resultado.erros} bloqueio(s) · {resultado.alertas} aviso(s)
          </span>
          <span className="ml-auto text-sm font-medium">{resultado.pontuacao}%</span>
        </div>
        <Progress value={resultado.pontuacao} className="mt-3 h-2" />
      </div>

      <div className="space-y-3">
        {Object.entries(grupos).map(([grupo, itens]) => (
          <div key={grupo} className="space-y-1.5">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{grupo}</p>
            {itens
              .filter((c) => (compacto ? c.nivel !== "ok" : true))
              .map((c, idx) => {
                const Icone = ICONES[c.nivel];
                return (
                  <div
                    key={`${c.titulo}-${idx}`}
                    className="flex items-start gap-2 rounded-lg border border-border p-2.5"
                  >
                    <Icone className={cn("mt-0.5 h-4 w-4 shrink-0", CORES[c.nivel])} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{c.titulo}</p>
                      {c.detalhe && (
                        <p className="text-xs text-muted-foreground">{c.detalhe}</p>
                      )}
                      {c.nivel !== "ok" && c.comoResolver && (
                        <p className="mt-1 text-xs text-primary">Como resolver: {c.comoResolver}</p>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}
