import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";

// Benchmarks públicos aproximados (WordStream/Statista 2024) — CTR %, CPC USD, CVR %, ROAS x
const BENCHMARKS: Record<string, { ctr: number; cpc: number; cvr: number; roas: number }> = {
  ecommerce: { ctr: 1.8, cpc: 1.16, cvr: 2.8, roas: 3.2 },
  varejo: { ctr: 2.3, cpc: 0.88, cvr: 3.6, roas: 4.1 },
  servicos: { ctr: 2.4, cpc: 3.77, cvr: 4.4, roas: 2.7 },
  educacao: { ctr: 3.8, cpc: 2.4, cvr: 3.1, roas: 2.9 },
  saude: { ctr: 3.3, cpc: 2.62, cvr: 4.0, roas: 3.0 },
  imobiliario: { ctr: 3.7, cpc: 2.37, cvr: 2.5, roas: 2.4 },
  b2b: { ctr: 2.4, cpc: 3.33, cvr: 3.0, roas: 2.6 },
  alimentacao: { ctr: 2.7, cpc: 1.95, cvr: 2.4, roas: 4.5 },
};

const SECTORS = [
  { id: "ecommerce", label: "E-commerce" },
  { id: "varejo", label: "Varejo Físico" },
  { id: "servicos", label: "Serviços" },
  { id: "educacao", label: "Educação" },
  { id: "saude", label: "Saúde" },
  { id: "imobiliario", label: "Imobiliário" },
  { id: "b2b", label: "B2B / Indústria" },
  { id: "alimentacao", label: "Alimentação" },
];

interface Props {
  myMetrics?: { ctr?: number; cpc?: number; cvr?: number; roas?: number };
}

const cmp = (mine?: number, bench?: number, higherIsBetter = true) => {
  if (mine == null || bench == null || !bench) return { icon: Minus, cls: "text-muted-foreground", txt: "—" };
  const diff = ((mine - bench) / bench) * 100;
  const good = higherIsBetter ? diff >= 0 : diff <= 0;
  return {
    icon: diff === 0 ? Minus : good ? TrendingUp : TrendingDown,
    cls: good ? "text-green-600" : "text-red-600",
    txt: `${diff >= 0 ? "+" : ""}${diff.toFixed(0)}%`,
  };
};

export const AdsBenchmarks: React.FC<Props> = ({ myMetrics = {} }) => {
  const [sector, setSector] = useState<string>(() => localStorage.getItem("ads_sector") || "ecommerce");
  const b = BENCHMARKS[sector];

  const setSectorPersist = (v: string) => {
    setSector(v);
    localStorage.setItem("ads_sector", v);
  };

  const rows = [
    { k: "CTR", mine: myMetrics.ctr, bench: b.ctr, unit: "%", higherIsBetter: true },
    { k: "CPC", mine: myMetrics.cpc, bench: b.cpc, unit: "US$", higherIsBetter: false },
    { k: "CVR", mine: myMetrics.cvr, bench: b.cvr, unit: "%", higherIsBetter: true },
    { k: "ROAS", mine: myMetrics.roas, bench: b.roas, unit: "x", higherIsBetter: true },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Benchmarks do setor
            </CardTitle>
            <CardDescription>Compare suas métricas com a média do mercado.</CardDescription>
          </div>
          <Select value={sector} onValueChange={setSectorPersist}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SECTORS.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {rows.map((r) => {
            const c = cmp(r.mine, r.bench, r.higherIsBetter);
            const Icon = c.icon;
            return (
              <div key={r.k} className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">{r.k}</div>
                <div className="text-lg font-semibold">
                  {r.mine != null ? `${r.unit === "US$" ? "US$ " : ""}${r.mine.toFixed(2)}${r.unit === "%" ? "%" : r.unit === "x" ? "x" : ""}` : "—"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Mercado: {r.unit === "US$" ? "US$ " : ""}{r.bench}{r.unit === "%" ? "%" : r.unit === "x" ? "x" : ""}
                </div>
                <Badge variant="outline" className={`mt-1 ${c.cls}`}>
                  <Icon className="h-3 w-3 mr-1" /> {c.txt}
                </Badge>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          Fonte: médias públicas WordStream/Statista 2024. Valores em USD, ajuste mental para o seu ticket.
        </p>
      </CardContent>
    </Card>
  );
};
