import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { brl, useContextoInterno } from "@/lib/estoque/contexto";
import { porMes, resumoFaturamento } from "@/lib/fiscal/situacaoNfe";

import {TituloFiscal} from '@/components/fiscal/TituloFiscal';
const sb = supabase as any;
const hoje = new Date();
const inicioPadrao = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1).toISOString().slice(0, 10);

export default function PainelFaturamento() {
  const ctx = useContextoInterno();
  const [notas, setNotas] = useState<any[]>([]);
  const [aguardando, setAguardando] = useState(0);
  const [inicio, setInicio] = useState(inicioPadrao);
  const [fim, setFim] = useState(hoje.toISOString().slice(0, 10));
  useEffect(() => {
    if (!ctx.estabelecimentoId) return;
    (async () => {
      const [n, o, f] = await Promise.all([
        sb.from("notas_fiscais").select("situacao, valor_total, data_emissao, created_at, orcamento_id").eq("estabelecimento_id", ctx.estabelecimentoId).eq("tipo", "saida").gte("created_at", inicio).lte("created_at", `${fim}T23:59:59`).limit(5000),
        sb.from("orcamentos").select("id", { count: "exact", head: false }).eq("estabelecimento_id", ctx.estabelecimentoId).eq("etapa", "finalizado").limit(2000),
        sb.from("notas_fiscais").select("orcamento_id").eq("estabelecimento_id", ctx.estabelecimentoId).eq("tipo", "saida").neq("situacao", "cancelada").not("orcamento_id", "is", null).limit(5000),
      ]);
      setNotas(n.data ?? []);
      const faturados = new Set((f.data ?? []).map((x: any) => x.orcamento_id));
      setAguardando((o.data ?? []).filter((x: any) => !faturados.has(x.id)).length);
    })();
  }, [ctx.estabelecimentoId, inicio, fim]);
  const r = useMemo(() => resumoFaturamento(notas), [notas]);
  const meses = useMemo(() => porMes(notas), [notas]);
  const cards = [
    ["Faturado no período", brl(r.total)], ["NF-e autorizadas", r.emitidas], ["Rejeitadas", r.rejeitadas], ["Canceladas", r.canceladas],
    ["Pendentes", r.pendentes], ["Pedidos aguardando", aguardando], ["Valor médio por nota", brl(r.ticketMedio)],
  ];
  return (
    <div className="space-y-4 p-3 sm:p-6">
      <div className="flex items-center gap-2"><TituloFiscal icone={BarChart3} titulo="Painel de Faturamento" descricao="Resumo do faturamento e das notas do período"/></div>
      <div className="flex flex-wrap gap-3">
        <div><Label>De</Label><Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
        <div><Label>Até</Label><Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(([t, v]) => <Card key={t as string}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t}</p><p className="text-lg font-semibold">{v}</p></CardContent></Card>)}
      </div>
      <Card><CardContent className="p-4">
        <p className="mb-2 text-sm font-medium">Evolução mensal (notas autorizadas)</p>
        {meses.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma nota autorizada no período.</p> :
          <div className="h-64"><ResponsiveContainer><BarChart data={meses}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="mes" /><YAxis /><Tooltip formatter={(v: number) => brl(v)} /><Bar dataKey="valor" fill="hsl(var(--primary))" /></BarChart></ResponsiveContainer></div>}
      </CardContent></Card>
    </div>
  );
}
