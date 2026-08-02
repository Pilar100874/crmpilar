import { useEffect, useMemo, useState } from "react";
import { db, useEstabelecimento } from "@/lib/aip/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download } from "lucide-react";

interface Linha {
  dia: string;
  execucoes: number;
  tokens: number;
  custo: number;
}

export default function HistoricoPage() {
  const estabelecimentoId = useEstabelecimento();
  const [dias, setDias] = useState(30);
  const [registros, setRegistros] = useState<any[] | null>(null);

  useEffect(() => {
    if (!estabelecimentoId) return;
    const desde = new Date();
    desde.setDate(desde.getDate() - dias);
    db.from("aip_executions")
      .select("created_at, tokens_input, tokens_output, custo, modelo, origem, status")
      .eq("estabelecimento_id", estabelecimentoId)
      .gte("created_at", desde.toISOString())
      .order("created_at", { ascending: false })
      .then(({ data }: any) => setRegistros(data ?? []));
  }, [estabelecimentoId, dias]);

  const porDia: Linha[] = useMemo(() => {
    const mapa = new Map<string, Linha>();
    (registros ?? []).forEach((r) => {
      const dia = new Date(r.created_at).toLocaleDateString("pt-BR");
      const atual = mapa.get(dia) ?? { dia, execucoes: 0, tokens: 0, custo: 0 };
      atual.execucoes += 1;
      atual.tokens += (r.tokens_input ?? 0) + (r.tokens_output ?? 0);
      atual.custo += Number(r.custo ?? 0);
      mapa.set(dia, atual);
    });
    return Array.from(mapa.values());
  }, [registros]);

  const porModelo = useMemo(() => {
    const mapa = new Map<string, { modelo: string; execucoes: number; tokens: number; custo: number }>();
    (registros ?? []).forEach((r) => {
      const modelo = r.modelo ?? "—";
      const atual = mapa.get(modelo) ?? { modelo, execucoes: 0, tokens: 0, custo: 0 };
      atual.execucoes += 1;
      atual.tokens += (r.tokens_input ?? 0) + (r.tokens_output ?? 0);
      atual.custo += Number(r.custo ?? 0);
      mapa.set(modelo, atual);
    });
    return Array.from(mapa.values()).sort((a, b) => b.custo - a.custo);
  }, [registros]);

  const totalCusto = porDia.reduce((s, l) => s + l.custo, 0);
  const totalTokens = porDia.reduce((s, l) => s + l.tokens, 0);
  const maxCusto = Math.max(...porDia.map((l) => l.custo), 0.0001);

  const exportarCsv = () => {
    const linhas = [
      "dia;execucoes;tokens;custo",
      ...porDia.map((l) => `${l.dia};${l.execucoes};${l.tokens};${l.custo.toFixed(4)}`),
    ].join("\n");
    const blob = new Blob([linhas], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `historico-agentes-${dias}d.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {[7, 30, 90].map((d) => (
          <Button key={d} size="sm" variant={dias === d ? "default" : "outline"} onClick={() => setDias(d)}>
            {d} dias
          </Button>
        ))}
        <Button size="sm" variant="outline" className="ml-auto" onClick={exportarCsv}>
          <Download className="mr-2 h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Execuções</p>
            <p className="text-xl font-semibold">{registros?.length ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Tokens</p>
            <p className="text-xl font-semibold">{totalTokens.toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Custo total</p>
            <p className="text-xl font-semibold">
              {totalCusto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Custo por dia</CardTitle>
        </CardHeader>
        <CardContent>
          {!registros ? (
            <Skeleton className="h-32 w-full" />
          ) : porDia.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados no período.</p>
          ) : (
            <div className="space-y-2">
              {porDia.map((l) => (
                <div key={l.dia} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-xs text-muted-foreground">{l.dia}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(4, (l.custo / maxCusto) * 100)}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-xs">
                    {l.custo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Consumo por modelo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {porModelo.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados no período.</p>
          ) : (
            porModelo.map((m) => (
              <div key={m.modelo} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{m.modelo}</Badge>
                  <span className="text-xs text-muted-foreground">{m.execucoes} execução(ões)</span>
                </div>
                <div className="flex gap-4 text-sm">
                  <span>{m.tokens.toLocaleString("pt-BR")} tokens</span>
                  <span className="font-medium">
                    {m.custo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
