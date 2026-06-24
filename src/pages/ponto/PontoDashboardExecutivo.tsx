import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Users, AlertTriangle, Clock, Wallet, UserMinus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";

interface Kpi { label: string; value: string; sub?: string; icon: any; tone?: "default"|"good"|"bad"; }

export default function PontoDashboardExecutivo() {
  const { empresaId } = usePontoEmpresa();
  const today = new Date();
  const ini = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0,10);
  const fim = new Date(today.getFullYear(), today.getMonth()+1, 0).toISOString().slice(0,10);
  const [inicio, setInicio] = useState(ini);
  const [termino, setTermino] = useState(fim);
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [topAusencia, setTopAusencia] = useState<any[]>([]);
  const [topHoraExtra, setTopHoraExtra] = useState<any[]>([]);

  const fmtH = (m:number) => `${Math.floor(m/60)}h${String(m%60).padStart(2,"0")}`;

  const load = async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const { data: funcs } = await supabase.from("ponto_funcionarios")
        .select("id, nome, status, admissao, demissao").eq("empresa_id", empresaId);
      const ativos = (funcs||[]).filter(f => !["demitido","desligado","inativo"].includes(f.status));
      const demitidosPeriodo = (funcs||[]).filter(f => f.demissao && f.demissao >= inicio && f.demissao <= termino);
      const admitidosPeriodo = (funcs||[]).filter(f => f.admissao && f.admissao >= inicio && f.admissao <= termino);

      const { data: esp } = await supabase.from("ponto_espelho_diario")
        .select("funcionario_id, data, extra_min, falta_min, atraso_min, abono_min, trabalhado_min")
        .gte("data", inicio).lte("data", termino)
        .in("funcionario_id", ativos.map(f=>f.id));

      const e = esp || [];
      const totalExtra = e.reduce((s,r:any)=>s+(r.extra_min||0),0);
      const totalFalta = e.reduce((s,r:any)=>s+(r.falta_min||0),0);
      const totalAtraso = e.reduce((s,r:any)=>s+(r.atraso_min||0),0);
      const totalTrab = e.reduce((s,r:any)=>s+(r.trabalhado_min||0),0);
      const diasUteis = new Set(e.map((r:any)=>r.data)).size || 1;
      const totalPrev = ativos.length * diasUteis * 8 * 60;
      const absent = totalPrev > 0 ? ((totalFalta + totalAtraso) / totalPrev) * 100 : 0;

      const turnover = ativos.length > 0 ? (demitidosPeriodo.length / ativos.length) * 100 : 0;

      const { data: bh } = await supabase.from("ponto_banco_horas_saldos")
        .select("funcionario_id, saldo_min").in("funcionario_id", ativos.map(f=>f.id));
      const saldoBanco = (bh||[]).reduce((s,r:any)=>s+(r.saldo_min||0),0);

      setKpis([
        { label:"Funcionários ativos", value:String(ativos.length), sub:`+${admitidosPeriodo.length} / -${demitidosPeriodo.length} no período`, icon: Users },
        { label:"Absenteísmo", value:`${absent.toFixed(2)}%`, sub:`${fmtH(totalFalta+totalAtraso)} de faltas+atrasos`, icon: AlertTriangle, tone: absent > 5 ? "bad" : "good" },
        { label:"Horas extras", value: fmtH(totalExtra), sub:`Trabalhado ${fmtH(totalTrab)}`, icon: Clock },
        { label:"Banco de horas", value: fmtH(Math.abs(saldoBanco)), sub: saldoBanco >= 0 ? "saldo positivo" : "saldo negativo", icon: Wallet, tone: saldoBanco < 0 ? "bad" : "good" },
        { label:"Turnover", value:`${turnover.toFixed(2)}%`, sub:`${demitidosPeriodo.length} desligamento(s)`, icon: UserMinus, tone: turnover > 5 ? "bad" : "default" },
      ]);

      // Rankings
      const porFunc = new Map<string,{falta:number;extra:number;nome:string}>();
      for (const f of ativos) porFunc.set(f.id, { falta:0, extra:0, nome:f.nome });
      for (const r of e as any[]) {
        const x = porFunc.get(r.funcionario_id); if (!x) continue;
        x.falta += (r.falta_min||0) + (r.atraso_min||0);
        x.extra += (r.extra_min||0);
      }
      const list = Array.from(porFunc.values());
      setTopAusencia(list.filter(x=>x.falta>0).sort((a,b)=>b.falta-a.falta).slice(0,8));
      setTopHoraExtra(list.filter(x=>x.extra>0).sort((a,b)=>b.extra-a.extra).slice(0,8));
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [empresaId, inicio, termino]);

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-xl font-semibold sm:text-2xl">Dashboard Executivo de Ponto</h2>
        <p className="text-sm text-muted-foreground">Indicadores consolidados de absenteísmo, horas extras, banco de horas e turnover.</p>
      </div>

      <Card><CardContent className="grid gap-3 grid-cols-2 sm:grid-cols-4 p-4">
        <div><Label>Início</Label><Input type="date" value={inicio} onChange={e=>setInicio(e.target.value)} /></div>
        <div><Label>Fim</Label><Input type="date" value={termino} onChange={e=>setTermino(e.target.value)} /></div>
      </CardContent></Card>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k,i)=>{
          const Icon = k.icon;
          const tone = k.tone === "bad" ? "text-destructive" : k.tone === "good" ? "text-emerald-600" : "text-foreground";
          return (
            <Card key={i}><CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>{k.label}</span><Icon className="h-4 w-4" />
              </div>
              <div className={`text-2xl font-bold ${tone}`}>{loading ? "..." : k.value}</div>
              {k.sub && <div className="text-xs text-muted-foreground">{k.sub}</div>}
            </CardContent></Card>
          );
        })}
      </div>

      <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
        <Card><CardContent className="p-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2"><TrendingDown className="h-4 w-4 text-destructive" /> Top ausências</h3>
          {topAusencia.length === 0 ? <p className="text-sm text-muted-foreground">Sem ausências no período.</p> : (
            <table className="w-full text-sm">
              <tbody>{topAusencia.map((x,i)=>(
                <tr key={i} className="border-t"><td className="p-2">{x.nome}</td><td className="p-2 text-right"><Badge variant="destructive">{fmtH(x.falta)}</Badge></td></tr>
              ))}</tbody>
            </table>
          )}
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" /> Top horas extras</h3>
          {topHoraExtra.length === 0 ? <p className="text-sm text-muted-foreground">Sem horas extras no período.</p> : (
            <table className="w-full text-sm">
              <tbody>{topHoraExtra.map((x,i)=>(
                <tr key={i} className="border-t"><td className="p-2">{x.nome}</td><td className="p-2 text-right"><Badge>{fmtH(x.extra)}</Badge></td></tr>
              ))}</tbody>
            </table>
          )}
        </CardContent></Card>
      </div>
    </div>
  );
}
