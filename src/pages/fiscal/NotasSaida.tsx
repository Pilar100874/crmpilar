import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Eye, Copy, FilePlus2, Search } from "lucide-react";
import { brl, dataBr, useContextoInterno } from "@/lib/estoque/contexto";
import { SITUACOES_NFE, rotuloSituacao } from "@/lib/fiscal/situacaoNfe";

import {TituloFiscal,PainelFiscal,SeloSituacao,tomSituacao} from '@/components/fiscal/TituloFiscal';
const sb = supabase as any;
const VISOES: Record<string, { titulo: string; situacoes?: string[]; finalidade?: number }> = {
  emitidas: { titulo: "NF-e Emitidas" },
  rascunhos: { titulo: "Rascunhos", situacoes: ["rascunho", "aguardando_calculo", "validada"] },
  rejeitadas: { titulo: "Notas Rejeitadas", situacoes: ["rejeitada", "erro_comunicacao", "desconhecida"] },
  canceladas: { titulo: "Notas Canceladas", situacoes: ["cancelada"] },
  devolucoes: { titulo: "Devoluções", finalidade: 4 },
};

export default function NotasSaida({ visaoFixa }: { visaoFixa?: string } = {}) {
  const { visao: visaoRota = "emitidas" } = useParams();
  const visao = visaoFixa ?? visaoRota;
  const v = VISOES[visao] ?? VISOES.emitidas;
  const ctx = useContextoInterno();
  const nav = useNavigate();
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
      <div className="flex items-center gap-2"><TituloFiscal icone={FileText} titulo={v.titulo} descricao="Encontre, abra e acompanhe as notas desta lista"/></div>
      <PainelFiscal className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 space-y-1.5 sm:max-w-sm"><Label>Número / chave / destinatário</Label><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder="Digite para buscar" value={busca} onChange={(e) => setBusca(e.target.value)} /></div></div>
        {!v.situacoes && <div className="space-y-1.5"><Label>Situação</Label><Select value={sit} onValueChange={setSit}><SelectTrigger className="w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todas as situações</SelectItem>{SITUACOES_NFE.map((s) => <SelectItem key={s.valor} value={s.valor}>{s.rotulo}</SelectItem>)}</SelectContent></Select></div>}
        <Button className="ml-auto" onClick={() => nav("/faturamento/nova")}><FilePlus2 className="mr-2 h-4 w-4" />Emitir NF-e</Button>
      </PainelFiscal>
      <PainelFiscal className="p-0 sm:p-0">
        {lista.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma nota encontrada. Para emitir, use Faturar Pedidos ou Emitir NF-e.</p> : <>
          <div className="hidden grid-cols-[auto_7rem_6rem_minmax(0,1fr)_8rem_7rem] gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-semibold uppercase text-muted-foreground lg:grid"><span className="w-[4.5rem]">Ações</span><span>Situação</span><span>Série/Nº</span><span>Destinatário</span><span className="text-right">Valor total</span><span>Emissão</span></div>
          <ul className="divide-y">{lista.map((n) => (
            <li key={n.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-muted/30 lg:grid-cols-[auto_7rem_6rem_minmax(0,1fr)_8rem_7rem]">
              <div className="row-span-3 flex gap-1 lg:row-span-1">
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-info/10 text-info" title="Abrir nota" onClick={() => nav(`/faturamento/nfe/${n.id}`)}><Eye className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-muted" title="Duplicar nota" onClick={() => nav(`/faturamento/nova?duplicar=${n.id}`)}><Copy className="h-4 w-4" /></Button>
              </div>
              <span><SeloSituacao tom={tomSituacao(n.situacao)}>{rotuloSituacao(n.situacao)}{n.ambiente === "homologacao" ? " · teste" : ""}</SeloSituacao></span>
              <span className="font-semibold">{n.numero ? `${n.serie ?? "-"}/${n.numero}` : "Sem número"}</span>
              <div className="min-w-0"><p className="truncate text-sm font-medium">{n.participante_nome ?? "Destinatário não informado"}</p>{n.chave && <p className="truncate text-xs text-muted-foreground">{n.chave}</p>}{n.mensagem_sefaz && n.situacao !== "autorizada" && <p className="truncate text-xs text-destructive">{n.mensagem_sefaz}</p>}</div>
              <span className="text-sm font-semibold lg:text-right">{brl(Number(n.valor_total ?? 0))}</span>
              <span className="text-sm text-muted-foreground">{dataBr(n.data_emissao ?? n.created_at)}</span>
            </li>))}</ul></>}
      </PainelFiscal>
    </div>
  );
}
