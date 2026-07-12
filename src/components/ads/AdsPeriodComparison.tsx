import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Minus, ArrowLeftRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props { estabelecimentoId: string; }
type Range = 7 | 14 | 30 | 90;

const sum = (rows: any[], k: string) => rows.reduce((a, r) => a + (Number(r?.[k]) || 0), 0);
const div = (a: number, b: number) => (b > 0 ? a / b : 0);

export const AdsPeriodComparison: React.FC<Props> = ({ estabelecimentoId }) => {
  const [range, setRange] = useState<Range>(30);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const from = new Date(); from.setDate(from.getDate() - range * 2);
      const { data } = await supabase
        .from("ad_insights")
        .select("data, impressoes, cliques, gasto, conversoes, receita")
        .eq("estabelecimento_id", estabelecimentoId)
        .gte("data", from.toISOString().slice(0, 10))
        .order("data", { ascending: false });
      setRows(data || []);
      setLoading(false);
    })();
  }, [estabelecimentoId, range]);

  const { current, previous } = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - range);
    const cur = rows.filter((r) => new Date(r.data) >= cutoff);
    const prev = rows.filter((r) => new Date(r.data) < cutoff);
    const build = (arr: any[]) => {
      const imp = sum(arr, "impressoes");
      const clk = sum(arr, "cliques");
      const g = sum(arr, "gasto");
      const conv = sum(arr, "conversoes");
      const rev = sum(arr, "receita");
      return { impressoes: imp, cliques: clk, gasto: g, conversoes: conv, receita: rev,
        ctr: div(clk, imp) * 100, cpa: div(g, conv), roas: div(rev, g) };
    };
    return { current: build(cur), previous: build(prev) };
  }, [rows, range]);

  const diff = (a: number, b: number, higherBetter = true) => {
    if (!b) return { pct: 0, cls: "text-muted-foreground", Icon: Minus };
    const p = ((a - b) / b) * 100;
    const good = higherBetter ? p >= 0 : p <= 0;
    return { pct: p, cls: p === 0 ? "text-muted-foreground" : good ? "text-green-600" : "text-red-600", Icon: p === 0 ? Minus : good ? TrendingUp : TrendingDown };
  };

  const cards = [
    { k: "Gasto", cur: current.gasto, prev: previous.gasto, fmt: (v: number) => `R$ ${v.toFixed(2)}`, higher: false },
    { k: "Receita", cur: current.receita, prev: previous.receita, fmt: (v: number) => `R$ ${v.toFixed(2)}`, higher: true },
    { k: "Conversões", cur: current.conversoes, prev: previous.conversoes, fmt: (v: number) => v.toFixed(0), higher: true },
    { k: "ROAS", cur: current.roas, prev: previous.roas, fmt: (v: number) => `${v.toFixed(2)}x`, higher: true },
    { k: "CTR", cur: current.ctr, prev: previous.ctr, fmt: (v: number) => `${v.toFixed(2)}%`, higher: true },
    { k: "CPA", cur: current.cpa, prev: previous.cpa, fmt: (v: number) => `R$ ${v.toFixed(2)}`, higher: false },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-primary" /> Comparativo de período
            </CardTitle>
            <CardDescription>Últimos {range} dias vs. {range} dias anteriores.</CardDescription>
          </div>
          <Select value={String(range)} onValueChange={(v) => setRange(Number(v) as Range)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="14">14 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Carregando…</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {cards.map((c) => {
              const d = diff(c.cur, c.prev, c.higher);
              const Icon = d.Icon;
              return (
                <div key={c.k} className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">{c.k}</div>
                  <div className="text-lg font-semibold">{c.fmt(c.cur || 0)}</div>
                  <div className="text-xs text-muted-foreground">Anterior: {c.fmt(c.prev || 0)}</div>
                  <Badge variant="outline" className={`mt-1 ${d.cls}`}>
                    <Icon className="h-3 w-3 mr-1" /> {d.pct >= 0 ? "+" : ""}{d.pct.toFixed(0)}%
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
