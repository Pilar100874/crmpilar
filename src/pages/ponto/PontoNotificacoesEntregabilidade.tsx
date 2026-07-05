import { useEffect, useMemo, useState } from "react";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
const supabase = supabaseTyped as any;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw, BarChart3, CheckCircle2, XCircle, Ban, Clock, Copy, DollarSign } from "lucide-react";

const CUSTO_SMS_UNIT = 0.08; // R$ por SMS enviado (ajustável)
const CUSTO_WHATSAPP_UNIT = 0.03; // R$ por mensagem WhatsApp (utility)
import { Link } from "react-router-dom";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

export default function PontoNotificacoesEntregabilidade() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [estId, setEstId] = useState<string | null>(null);

  const carregar = async (id: string) => {
    setLoading(true);
    const desde = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data } = await supabase.from("ponto_notificacoes_envios")
      .select("*").eq("estabelecimento_id", id).gte("created_at", desde)
      .order("created_at", { ascending: false }).limit(500);
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const id = await getEstabelecimentoId();
      setEstId(id);
      if (id) await carregar(id);
    })();
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const porStatus = rows.reduce((acc: any, r: any) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
    const porCanal = rows.reduce((acc: any, r: any) => {
      if (!acc[r.canal]) acc[r.canal] = { total: 0, enviado: 0, falha: 0 };
      acc[r.canal].total++;
      if (r.status === "enviado" || r.status === "confirmado") acc[r.canal].enviado++;
      if (r.status === "falha") acc[r.canal].falha++;
      return acc;
    }, {});
    return { total, porStatus, porCanal };
  }, [rows]);

  const badgeStatus = (s: string) => {
    const map: any = {
      enviado: ["bg-green-500/15 text-green-700 dark:text-green-400", CheckCircle2],
      confirmado: ["bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", CheckCircle2],
      falha: ["bg-red-500/15 text-red-700 dark:text-red-400", XCircle],
      bloqueado_quiet: ["bg-amber-500/15 text-amber-700 dark:text-amber-400", Clock],
      bloqueado_ratelimit: ["bg-orange-500/15 text-orange-700 dark:text-orange-400", Ban],
      deduplicado: ["bg-slate-500/15 text-slate-700 dark:text-slate-400", Copy],
    };
    const [cls, Icon] = map[s] || ["bg-muted", CheckCircle2];
    return <Badge className={`${cls} border-0`}><Icon className="w-3 h-3 mr-1" />{s}</Badge>;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />Entregabilidade — Notificações do Ponto
          </h1>
          <p className="text-muted-foreground text-sm">Últimos 30 dias — máx. 500 registros.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/ponto/notificacoes"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Link></Button>
          <Button variant="outline" onClick={() => estId && carregar(estId)} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />Atualizar
          </Button>
        </div>
      </div>

      {/* KPIs por status */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {["enviado","confirmado","falha","bloqueado_quiet","bloqueado_ratelimit","deduplicado"].map(s => (
          <Card key={s}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{s}</div>
              <div className="text-2xl font-bold">{stats.porStatus[s] || 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Por canal */}
      <Card>
        <CardHeader><CardTitle>Por canal</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {["push","email","sms","whatsapp","webhook","any"].map(c => {
              const s = stats.porCanal[c];
              if (!s) return null;
              const taxa = s.total ? Math.round((s.enviado / s.total) * 100) : 0;
              return (
                <div key={c} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="font-medium uppercase text-sm">{c}</div>
                    <Badge variant={taxa >= 90 ? "default" : taxa >= 70 ? "secondary" : "destructive"}>{taxa}%</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {s.enviado} entregues / {s.total} total • {s.falha} falhas
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader><CardTitle>Últimos envios</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr><th className="p-2">Quando</th><th>Tipo</th><th>Canal</th><th>Destino</th><th>Status</th><th>Erro</th></tr>
              </thead>
              <tbody>
                {rows.slice(0, 200).map(r => (
                  <tr key={r.id} className="border-b hover:bg-muted/40">
                    <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                    <td className="p-2">{r.tipo}</td>
                    <td className="p-2">{r.canal}</td>
                    <td className="p-2 truncate max-w-[180px]">{r.destinatario || "-"}</td>
                    <td className="p-2">{badgeStatus(r.status)}</td>
                    <td className="p-2 text-red-600 dark:text-red-400 truncate max-w-[240px]">{r.erro || ""}</td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum envio registrado ainda.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
