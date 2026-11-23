import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import { useContextoInterno } from "@/lib/estoque/contexto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FiscalEmissionEngine } from "@/lib/fiscal/servicoFiscal";
import { validarInutilizacao } from "@/lib/fiscal/documentoFiscal";

import {TituloFiscal} from '@/components/fiscal/TituloFiscal';
const sb = supabase as any;
const TIPOS: Record<string, string> = { cancelamento: "Cancelamento", carta_correcao: "Carta de correção", inutilizacao: "Inutilização", ciencia: "Ciência da operação", confirmacao: "Confirmação da operação", desconhecimento: "Desconhecimento", nao_realizada: "Operação não realizada" };
export default function EventosFiscais() {
  const ctx = useContextoInterno();
  const [ev, setEv] = useState<any[]>([]);
  const [tx, setTx] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]); const [inut, setInut] = useState({ serie: '', inicio: '', fim: '', texto: '' }); const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!ctx.estabelecimentoId) return;
    sb.from("nfe_eventos").select("*, notas_fiscais(numero, serie)").eq("estabelecimento_id", ctx.estabelecimentoId).order("created_at", { ascending: false }).limit(300).then(({ data }: any) => setEv(data ?? []));
    sb.from("nfe_transmissoes").select("*, notas_fiscais(numero, serie)").eq("estabelecimento_id", ctx.estabelecimentoId).order("created_at", { ascending: false }).limit(300).then(({ data }: any) => setTx(data ?? []));
    sb.from("nfe_series").select("id, serie, unidade_id, ambiente, unidades(nome)").eq("estabelecimento_id", ctx.estabelecimentoId).eq("ativa", true).then(({ data }: any) => setSeries(data ?? []));
  }, [ctx.estabelecimentoId]);
  const linha = (titulo: string, sub: string, badge: string, quando: string, id: string) => (
    <Card key={id}><CardContent className="flex items-start justify-between gap-2 p-3"><div className="min-w-0"><p className="truncate font-medium">{titulo}</p><p className="truncate text-sm text-muted-foreground">{sub}</p><p className="text-xs text-muted-foreground">{new Date(quando).toLocaleString("pt-BR")}</p></div><Badge variant="outline">{badge}</Badge></CardContent></Card>
  );
  return (
    <div className="space-y-4 p-3 sm:p-6">
      <div className="flex items-center gap-2"><TituloFiscal icone={History} titulo="Eventos Fiscais" descricao="Cancelamentos, cartas de correção e inutilizações de numeração"/></div>
      <section className="space-y-2 border-b pb-4"><h2 className="font-medium">Inutilizar numeração</h2>
        <div className="grid gap-2 grid-cols-2 lg:grid-cols-4"><div className="col-span-2"><Label>Série *</Label><Select value={inut.serie || undefined} onValueChange={(v) => setInut({ ...inut, serie: v })}><SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger><SelectContent>{series.map((s) => <SelectItem key={s.id} value={s.id}>{s.unidades?.nome} · série {s.serie} · {s.ambiente === "producao" ? "Produção" : "Homologação"}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Número inicial *</Label><Input type="number" min="1" value={inut.inicio} onChange={(e) => setInut({ ...inut, inicio: e.target.value })} /></div><div><Label>Número final *</Label><Input type="number" min="1" value={inut.fim} onChange={(e) => setInut({ ...inut, fim: e.target.value })} /></div></div>
        <div><Label>Justificativa *</Label><Textarea value={inut.texto} onChange={(e) => setInut({ ...inut, texto: e.target.value })} /></div>
        <Button disabled={busy} onClick={async () => { const s = series.find((x) => x.id === inut.serie); const erro = !s ? "Escolha a série" : validarInutilizacao(Number(inut.inicio), Number(inut.fim), inut.texto); if (erro) return toast.error(erro); setBusy(true); try { const r = await FiscalEmissionEngine.executar({ acao: "inutilizacao", serie_id: s.id, unidade_id: s.unidade_id, ambiente: s.ambiente, inicio: Number(inut.inicio), fim: Number(inut.fim), texto: inut.texto.trim() }); toast[r.aceito ? "success" : "info"](r.mensagem ?? "Na fila do Coletor"); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); } }}>Enviar inutilização</Button>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-2"><h2 className="font-medium">Eventos</h2>{ev.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p> : ev.map((e) => linha(TIPOS[e.tipo] ?? e.tipo, e.notas_fiscais ? `NF-e ${e.notas_fiscais.numero}` : e.justificativa ?? "", e.situacao, e.created_at, e.id))}</section>
        <section className="space-y-2"><h2 className="font-medium">Histórico de transmissões</h2>{tx.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma transmissão registrada.</p> : tx.map((t) => linha(t.notas_fiscais ? `NF-e ${t.notas_fiscais.numero ?? "sem número"}` : "Nota", t.mensagem ?? "", t.resultado === "erro_comunicacao" ? "Erro de comunicação" : t.resultado, t.created_at, t.id))}</section>
      </div>
    </div>
  );
}
