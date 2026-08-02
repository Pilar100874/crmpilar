import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Plug, RefreshCw, Wrench } from "lucide-react";
import type { ConectorRegistro } from "@/lib/aip/conectores";

interface Props {
  conectores: ConectorRegistro[];
  ultimaSync: Date | null;
  sincronizando: boolean;
  onSincronizar: () => void;
}

/** Tempo relativo em pt-BR: "há 3 min", "há 2 h". */
function tempoDesde(data: Date | null, agora: number): string {
  if (!data) return "nunca sincronizado";
  const s = Math.max(0, Math.floor((agora - data.getTime()) / 1000));
  if (s < 60) return "há poucos segundos";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d > 1 ? "s" : ""}`;
}

export function ConectoresSyncStatus({ conectores, ultimaSync, sincronizando, onSincronizar }: Props) {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const resumo = useMemo(() => {
    const disponiveis = conectores.filter((c) => c.disponivel);
    const indisponiveis = conectores.length - disponiveis.length;
    const comErro = conectores.filter((c) => !!c.ultimo_erro).length;
    const ferramentas = conectores.reduce((acc, c) => acc + (c.ferramentas?.length ?? 0), 0);
    return { total: conectores.length, disponiveis: disponiveis.length, indisponiveis, comErro, ferramentas };
  }, [conectores]);

  const desatualizado = !ultimaSync || agora - ultimaSync.getTime() > 30 * 60 * 1000;

  return (
    <Card className="border-border/70">
      <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
        <div className="flex items-center gap-2">
          {desatualizado ? (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          )}
          <div>
            <p className="text-sm font-medium">Conectores</p>
            <p className="text-xs text-muted-foreground">
              {tempoDesde(ultimaSync, agora)}
              {ultimaSync && ` · ${ultimaSync.toLocaleString("pt-BR")}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline" className="gap-1">
            <Plug className="h-3 w-3" />
            {resumo.disponiveis}/{resumo.total} disponíveis
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Wrench className="h-3 w-3" />
            {resumo.ferramentas} ferramentas
          </Badge>
          {resumo.indisponiveis > 0 && (
            <Badge variant="secondary">{resumo.indisponiveis} indisponíveis</Badge>
          )}
          {resumo.comErro > 0 && <Badge variant="destructive">{resumo.comErro} com erro</Badge>}
        </div>

        <Button
          size="sm"
          variant="outline"
          className="ml-auto h-8"
          disabled={sincronizando}
          onClick={onSincronizar}
        >
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${sincronizando ? "animate-spin" : ""}`} />
          Sincronizar
        </Button>
      </CardContent>
    </Card>
  );
}
