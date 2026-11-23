import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, FileCheck2, FileX2, Ban, Clock, ShoppingCart, Receipt, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { brl, useContextoInterno } from "@/lib/estoque/contexto";
import { porMes, resumoFaturamento } from "@/lib/fiscal/situacaoNfe";

import {TituloFiscal,CardIndicador,PainelFiscal} from '@/components/fiscal/TituloFiscal';
const sb = supabase as any;
const hoje = new Date();
const inicioPadrao = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1).toISOString().slice(0, 10);

export default function PainelFaturamento() {
  const ctx = useContextoInterno();
  const nav = useNavigate();
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
  return (
    <div className="space-y-4 p-3 sm:p-6">
      <div className="flex items-center gap-2"><TituloFiscal icone={BarChart3} titulo="Painel de Faturamento" descricao="Resumo do faturamento e das notas do período"/></div>
      <PainelFiscal className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5"><Label>De</Label><Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Até</Label><Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></div>
        <span className="ml-auto inline-flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm font-semibold text-success"><Receipt className="h-4 w-4" />Faturado: {brl(r.total)}</span>
      </PainelFiscal>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CardIndicador icone={FileCheck2} tom="sucesso" rotulo="Autorizadas" valor={r.emitidas} detalhe={brl(r.total)} onClick={() => nav("/faturamento/notas/emitidas")} />
        <CardIndicador icone={FileX2} tom="alerta" rotulo="Rejeitadas" valor={r.rejeitadas} onClick={() => nav("/faturamento/notas/rejeitadas")} />
        <CardIndicador icone={Ban} tom="perigo" rotulo="Canceladas" valor={r.canceladas} onClick={() => nav("/configuracoes/mais-faturamento?tab=canceladas")} />
        <CardIndicador icone={Clock} tom="neutro" rotulo="Pendentes / rascunhos" valor={r.pendentes} onClick={() => nav("/faturamento/notas/rascunhos")} />
        <CardIndicador icone={ShoppingCart} tom="info" rotulo="Pedidos aguardando faturamento" valor={aguardando} onClick={() => nav("/faturamento")} />
        <CardIndicador icone={TrendingUp} tom="primario" rotulo="Valor médio por nota" valor={brl(r.ticketMedio)} />
      </div>
      <PainelFiscal>
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><BarChart3 className="h-4 w-4 text-primary" />NF-e autorizadas por mês</p>
        {meses.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma nota autorizada no período.</p> :
          <div className="h-64"><ResponsiveContainer><BarChart data={meses}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="mes" /><YAxis /><Tooltip formatter={(v: number) => brl(v)} /><Bar dataKey="valor" radius={[6,6,0,0]} fill="hsl(var(--primary))" /></BarChart></ResponsiveContainer></div>}
      </PainelFiscal>
    </div>
  );
}
