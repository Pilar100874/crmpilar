import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileInput } from "lucide-react";
import { brl, dataBr, useContextoInterno } from "@/lib/estoque/contexto";

const sb = supabase as any;
export default function PainelEntradas() {
  const ctx = useContextoInterno();
  const [notas, setNotas] = useState<any[]>([]);
  const [conf, setConf] = useState<Record<string, any>>({});
  useEffect(() => {
    if (!ctx.estabelecimentoId) return;
    (async () => {
      const [n, c] = await Promise.all([
        sb.from("notas_fiscais").select("id, numero, serie, participante_nome, valor_total, data_emissao, created_at").eq("estabelecimento_id", ctx.estabelecimentoId).eq("tipo", "entrada").order("created_at", { ascending: false }).limit(500),
        sb.from("nfe_entrada_conferencia").select("nota_id, situacao").eq("estabelecimento_id", ctx.estabelecimentoId).limit(5000),
      ]);
      setNotas(n.data ?? []); setConf(Object.fromEntries((c.data ?? []).map((x: any) => [x.nota_id, x])));
    })();
  }, [ctx.estabelecimentoId]);
  const total = useMemo(() => notas.reduce((s, n) => s + Number(n.valor_total ?? 0), 0), [notas]);
  const semConf = notas.filter((n) => !conf[n.id] || conf[n.id].situacao === "pendente").length;
  const diverg = notas.filter((n) => conf[n.id]?.situacao === "divergente").length;
  return (
    <div className="space-y-4 p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><FileInput className="h-6 w-6 text-primary" /><h1 className="text-xl font-semibold sm:text-2xl">Painel de Entradas</h1></div><Button asChild><Link to="/estoque/entrada">Importar XML</Link></Button></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Notas recebidas", notas.length], ["Valor total", brl(total)], ["Sem conferência", semConf], ["Com divergência", diverg]].map(([t, v]) => <Card key={t as string}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t}</p><p className="text-lg font-semibold">{v}</p></CardContent></Card>)}
      </div>
      <div className="grid gap-3 md:grid-cols-2">{notas.slice(0, 50).map((n) => (
        <Card key={n.id}><CardContent className="space-y-1 p-4">
          <div className="flex items-center justify-between gap-2"><span className="truncate font-medium">{n.participante_nome ?? "Fornecedor"}</span><Badge variant="outline">{conf[n.id]?.situacao === "aprovada" ? "Conferida" : conf[n.id]?.situacao === "divergente" ? "Divergência" : "Sem conferência"}</Badge></div>
          <p className="text-sm text-muted-foreground">NF-e {n.numero ?? "-"} · {dataBr(n.data_emissao ?? n.created_at)} · {brl(Number(n.valor_total ?? 0))}</p>
        </CardContent></Card>))}</div>
    </div>
  );
}
