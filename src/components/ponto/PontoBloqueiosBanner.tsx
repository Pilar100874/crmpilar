import { useEffect, useState } from "react";
import { Lock, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface Props {
  empresaId?: string | null;
  /** Filtrar bloqueios que cobrem este intervalo (opcional). */
  dataInicio?: string;
  dataFim?: string;
  className?: string;
}

interface Bloqueio {
  tipo: "fechamento" | "exportacao";
  inicio: string;
  fim: string;
  rotulo: string;
}

/**
 * Mostra ao usuário quais períodos estão bloqueados (fechados ou exportados),
 * explicando por que certas alterações não podem ser feitas.
 */
export function PontoBloqueiosBanner({ empresaId, dataInicio, dataFim, className }: Props) {
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!empresaId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const lista: Bloqueio[] = [];

      const { data: fechs } = await supabase
        .from("ponto_periodos_fechamento")
        .select("mes_referencia")
        .eq("empresa_id", empresaId)
        .order("mes_referencia", { ascending: false })
        .limit(12);

      fechs?.forEach((f: any) => {
        const ini = f.mes_referencia;
        const d = new Date(ini);
        const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0)
          .toISOString()
          .slice(0, 10);
        lista.push({
          tipo: "fechamento",
          inicio: ini,
          fim,
          rotulo: `Fechamento ${new Date(ini).toLocaleDateString("pt-BR", {
            month: "2-digit",
            year: "numeric",
          })}`,
        });
      });

      const { data: exps } = await supabase
        .from("ponto_export_logs")
        .select("periodo_inicio,periodo_fim,layout_nome,status")
        .eq("empresa_id", empresaId)
        .eq("status", "gerado")
        .order("periodo_inicio", { ascending: false })
        .limit(12);

      exps?.forEach((e: any) => {
        lista.push({
          tipo: "exportacao",
          inicio: e.periodo_inicio,
          fim: e.periodo_fim,
          rotulo: `Exportação ${e.layout_nome || ""} (${new Date(
            e.periodo_inicio
          ).toLocaleDateString("pt-BR")} a ${new Date(e.periodo_fim).toLocaleDateString(
            "pt-BR"
          )})`,
        });
      });

      // Filtrar por intervalo, se informado
      let filtrados = lista;
      if (dataInicio && dataFim) {
        filtrados = lista.filter(
          (b) => !(b.fim < dataInicio || b.inicio > dataFim)
        );
      }

      if (!cancelled) {
        setBloqueios(filtrados);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [empresaId, dataInicio, dataFim]);

  if (loading || bloqueios.length === 0) return null;

  return (
    <Alert className={className}>
      <Lock className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        Períodos bloqueados para alteração
        <Badge variant="secondary">{bloqueios.length}</Badge>
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <p className="text-sm text-muted-foreground flex items-start gap-1">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>
            Batidas, ajustes, atestados, férias, escalas, feriados e banco de horas
            ficam protegidos nesses períodos. Para alterar, vá em{" "}
            <strong>Ponto › Exportação</strong> e reabra o período correspondente.
          </span>
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {bloqueios.slice(0, 8).map((b, i) => (
            <Badge
              key={i}
              variant={b.tipo === "exportacao" ? "default" : "outline"}
              className="font-normal"
            >
              {b.rotulo}
            </Badge>
          ))}
          {bloqueios.length > 8 && (
            <Badge variant="outline">+{bloqueios.length - 8} outros</Badge>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
