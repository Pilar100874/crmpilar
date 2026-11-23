import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText } from "lucide-react";
import { brl, dataBr, useContextoInterno } from "@/lib/estoque/contexto";
import { SITUACOES_NFE, rotuloSituacao } from "@/lib/fiscal/situacaoNfe";

const sb = supabase as any;
const VISOES: Record<string, { titulo: string; situacoes?: string[]; finalidade?: number }> = {
  emitidas: { titulo: "NF-e Emitidas" },
  rascunhos: { titulo: "Rascunhos", situacoes: ["rascunho", "aguardando_calculo", "validada"] },
  rejeitadas: { titulo: "Notas Rejeitadas", situacoes: ["rejeitada", "erro_comunicacao", "desconhecida"] },
  canceladas: { titulo: "Notas Canceladas", situacoes: ["cancelada"] },
  devolucoes: { titulo: "Devoluções", finalidade: 4 },
};

export default function NotasSaida() {
  const { visao = "emitidas" } = useParams();
  const v = VISOES[visao] ?? VISOES.emitidas;
  const ctx = useContextoInterno();
  const [notas, setNotas] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [sit, setSit] = useState("todas");
  useEffect(() => {
    if (!ctx.estabelecimentoId) return;
    let q = sb.from("notas_fiscais").select("id, numero, serie, chave, data_emissao, created_at, participante_nome, valor_total, situacao, ambiente, mensagem_sefaz").eq("estabelecimento_id", ctx.estabelecimentoId).eq("tipo", "saida").order("created_at", { ascending: false }).limit(500);
    if (v.situacoes) q = q.in("situacao", v.situacoes);
    if (v.finalidade) q = q.eq("finalidade_emissao", v.finalidade);
    q.then(({ data }: any) => setNotas(data ?? []));
  }, [ctx.estabelecimentoId, visao]);
  const lista = useMemo(() => notas.filter((n) => (sit === "todas" || n.situacao === sit) && `${n.numero ?? ""} ${n.chave ?? ""} ${n.participante_nome ?? ""}`.toLowerCase().includes(busca.toLowerCase())), [notas, busca, sit]);
  return (
    <div className="space-y-4 p-3 sm:p-6">
      <div className="flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /><h1 className="text-xl font-semibold sm:text-2xl">{v.titulo}</h1></div>
      <div className="flex flex-wrap gap-3">
        <Input className="max-w-xs" placeholder="Número, chave ou cliente" value={busca} onChange={(e) => setBusca(e.target.value)} />
        {!v.situacoes && <Select value={sit} onValueChange={setSit}><SelectTrigger className="w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todas as situações</SelectItem>{SITUACOES_NFE.map((s) => <SelectItem key={s.valor} value={s.valor}>{s.rotulo}</SelectItem>)}</SelectContent></Select>}
      </div>
      {lista.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma nota encontrada. A emissão é feita em Faturar Pedidos.</p> :
        <div className="grid gap-3 md:grid-cols-2">{lista.map((n) => (
          <Card key={n.id}><CardContent className="space-y-1 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{n.numero ? `NF-e ${n.numero} · série ${n.serie ?? "-"}` : "Sem número"}</span><Badge variant={n.situacao === "autorizada" ? "default" : "outline"}>{rotuloSituacao(n.situacao)}{n.ambiente === "homologacao" ? " (teste)" : ""}</Badge></div>
            <p className="truncate text-sm">{n.participante_nome ?? "Destinatário não informado"}</p>
            <p className="text-sm text-muted-foreground">{dataBr(n.data_emissao ?? n.created_at)} · {brl(Number(n.valor_total ?? 0))}</p>
            {n.chave && <p className="break-all text-xs text-muted-foreground">{n.chave}</p>}
            {n.mensagem_sefaz && n.situacao !== "autorizada" && <p className="text-xs text-destructive">{n.mensagem_sefaz}</p>}
          </CardContent></Card>))}</div>}
    </div>
  );
}
