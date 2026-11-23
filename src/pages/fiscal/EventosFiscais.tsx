import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import { useContextoInterno } from "@/lib/estoque/contexto";

const sb = supabase as any;
const TIPOS: Record<string, string> = { cancelamento: "Cancelamento", carta_correcao: "Carta de correção", inutilizacao: "Inutilização", ciencia: "Ciência da operação", confirmacao: "Confirmação da operação", desconhecimento: "Desconhecimento", nao_realizada: "Operação não realizada" };
export default function EventosFiscais() {
  const ctx = useContextoInterno();
  const [ev, setEv] = useState<any[]>([]);
  const [tx, setTx] = useState<any[]>([]);
  useEffect(() => {
    if (!ctx.estabelecimentoId) return;
    sb.from("nfe_eventos").select("*, notas_fiscais(numero, serie)").eq("estabelecimento_id", ctx.estabelecimentoId).order("created_at", { ascending: false }).limit(300).then(({ data }: any) => setEv(data ?? []));
    sb.from("nfe_transmissoes").select("*, notas_fiscais(numero, serie)").eq("estabelecimento_id", ctx.estabelecimentoId).order("created_at", { ascending: false }).limit(300).then(({ data }: any) => setTx(data ?? []));
  }, [ctx.estabelecimentoId]);
  const linha = (titulo: string, sub: string, badge: string, quando: string, id: string) => (
    <Card key={id}><CardContent className="flex items-start justify-between gap-2 p-3"><div className="min-w-0"><p className="truncate font-medium">{titulo}</p><p className="truncate text-sm text-muted-foreground">{sub}</p><p className="text-xs text-muted-foreground">{new Date(quando).toLocaleString("pt-BR")}</p></div><Badge variant="outline">{badge}</Badge></CardContent></Card>
  );
  return (
    <div className="space-y-4 p-3 sm:p-6">
      <div className="flex items-center gap-2"><History className="h-6 w-6 text-primary" /><h1 className="text-xl font-semibold sm:text-2xl">Eventos Fiscais</h1></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-2"><h2 className="font-medium">Eventos</h2>{ev.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p> : ev.map((e) => linha(TIPOS[e.tipo] ?? e.tipo, e.notas_fiscais ? `NF-e ${e.notas_fiscais.numero}` : e.justificativa ?? "", e.situacao, e.created_at, e.id))}</section>
        <section className="space-y-2"><h2 className="font-medium">Histórico de transmissões</h2>{tx.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma transmissão registrada.</p> : tx.map((t) => linha(t.notas_fiscais ? `NF-e ${t.notas_fiscais.numero ?? "sem número"}` : "Nota", t.mensagem ?? "", t.resultado === "erro_comunicacao" ? "Erro de comunicação" : t.resultado, t.created_at, t.id))}</section>
      </div>
    </div>
  );
}
