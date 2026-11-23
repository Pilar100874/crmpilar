import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Eye, Copy, Plus, Search, Eraser, ArrowLeft, Printer } from "lucide-react";
import { baixarArquivoFiscal } from "@/lib/fiscal/servicoFiscal";
import { toast } from "sonner";
import { brl, dataBr, useContextoInterno } from "@/lib/estoque/contexto";
import { SITUACOES_NFE, rotuloSituacao } from "@/lib/fiscal/situacaoNfe";

import {tomSituacao} from '@/components/fiscal/TituloFiscal';
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
  const [ini, setIni] = useState("");
  const [fimD, setFimD] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => {
    if (!ctx.estabelecimentoId) return;
    let q = sb.from("notas_fiscais").select("id, numero, serie, chave, data_emissao, created_at, participante_nome, valor_total, situacao, ambiente, mensagem_sefaz").eq("estabelecimento_id", ctx.estabelecimentoId).eq("tipo", "saida").order("created_at", { ascending: false }).limit(500);
    if (v.situacoes) q = q.in("situacao", v.situacoes);
    if (v.finalidade) q = q.eq("finalidade_emissao", v.finalidade);
    q.then(({ data }: any) => setNotas(data ?? []));
  }, [ctx.estabelecimentoId, visao]);
  const lista = useMemo(() => notas.filter((n) => (sit === "todas" || n.situacao === sit) && (!ini || (n.data_emissao ?? n.created_at).slice(0, 10) >= ini) && (!fimD || (n.data_emissao ?? n.created_at).slice(0, 10) <= fimD) && `${n.numero ?? ""} ${n.chave ?? ""} ${n.participante_nome ?? ""}`.toLowerCase().includes(busca.toLowerCase())), [notas, busca, sit, ini, fimD]);
  const DOT: Record<string, string> = { sucesso: "bg-success", perigo: "bg-destructive", alerta: "bg-warning", info: "bg-info", neutro: "bg-muted-foreground", primario: "bg-primary" };
  const totalLista = lista.reduce((t, n) => t + Number(n.valor_total ?? 0), 0);
  const limpar = () => { setBusca(""); setSit("todas"); setIni(""); setFimD(""); };
  return (
    <div className="flex min-h-full flex-col gap-3 p-3 sm:p-6">
      <section className="rounded-md border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-3 sm:px-5">
          <FileText className="h-5 w-5 text-primary" /><h1 className="text-lg font-semibold">{v.titulo} – Listagem</h1><span className="flex-1" />
          <Button variant="outline" size="sm" onClick={limpar}><Eraser className="mr-2 h-4 w-4" />Limpar</Button>
        </div>
        <div className="grid gap-3 p-3 sm:grid-cols-2 sm:px-5 lg:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2"><Label>Número / chave / destinatário</Label><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder="Digite para buscar" value={busca} onChange={(e) => setBusca(e.target.value)} /></div></div>
          <div className="space-y-1.5"><Label>Data inicial</Label><Input type="date" value={ini} onChange={(e) => setIni(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Data final</Label><Input type="date" value={fimD} onChange={(e) => setFimD(e.target.value)} /></div>
          {!v.situacoes && <div className="space-y-1.5"><Label>Situação</Label><Select value={sit} onValueChange={setSit}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todas</SelectItem>{SITUACOES_NFE.map((s) => <SelectItem key={s.valor} value={s.valor}>{s.rotulo}</SelectItem>)}</SelectContent></Select></div>}
        </div>
        <div className="px-3 sm:px-5">
          {lista.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma nota encontrada. Para emitir, clique em Novo.</p> : <>
            <div className="hidden grid-cols-[1.5rem_8rem_6rem_7.5rem_minmax(0,1fr)_7rem_4.5rem] gap-3 rounded-t bg-muted/60 px-2 py-2 text-xs font-semibold uppercase text-muted-foreground lg:grid"><span /><span>Situação</span><span>Série/Nº</span><span>Emissão</span><span>Destinatário</span><span className="text-right">Total</span><span>Ações</span></div>
            <ul className="divide-y border-b text-sm">{lista.map((n) => (
              <li key={n.id} onClick={() => setSel(sel === n.id ? null : n.id)} className={`grid cursor-pointer grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-2 py-1.5 lg:grid-cols-[1.5rem_8rem_6rem_7.5rem_minmax(0,1fr)_7rem_4.5rem] ${sel === n.id ? "bg-primary/10" : "hover:bg-muted/40"}`}>
                <input type="radio" readOnly checked={sel === n.id} aria-label="Selecionar nota" className="accent-primary" />
                <span className="flex items-center gap-1.5 whitespace-nowrap"><span className={`h-2.5 w-2.5 rounded-full ${DOT[tomSituacao(n.situacao)]}`} />{rotuloSituacao(n.situacao)}{n.ambiente === "homologacao" && <span className="text-xs text-muted-foreground">· teste</span>}</span>
                <span className="col-start-2 lg:col-start-auto">{n.numero ? `${n.numero} - ${n.serie ?? "-"}` : "—"}</span>
                <span className="col-start-2 text-muted-foreground lg:col-start-auto">{dataBr(n.data_emissao ?? n.created_at)}</span>
                <span className="col-start-2 min-w-0 truncate lg:col-start-auto" title={n.mensagem_sefaz ?? ""}>{n.participante_nome ?? "Destinatário não informado"}{n.mensagem_sefaz && n.situacao !== "autorizada" && <span className="block truncate text-xs text-destructive">{n.mensagem_sefaz}</span>}</span>
                <span className="col-start-2 font-medium lg:col-start-auto lg:text-right">{brl(Number(n.valor_total ?? 0))}</span>
                <span className="col-start-3 row-start-1 flex gap-1 lg:col-start-auto lg:row-start-auto" onClick={(e) => e.stopPropagation()}>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" title="Abrir nota" onClick={() => nav(`/faturamento/nfe/${n.id}`)}><Eye className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-success" disabled={n.situacao !== "autorizada"} title="DANFE" onClick={() => baixarArquivoFiscal(n.id, "danfe").catch((e) => toast.error(e.message))}><Printer className="h-4 w-4" /></Button>
                </span>
              </li>))}</ul></>}
          <div className="flex flex-wrap items-center gap-6 py-3"><div><p className="text-[10px] font-semibold uppercase text-muted-foreground">Registros</p><p className="font-semibold text-primary">{lista.length}</p></div><div><p className="text-[10px] font-semibold uppercase text-muted-foreground">Total</p><p className="font-semibold text-primary">{brl(totalLista)}</p></div></div>
        </div>
      </section>
      <div className="sticky bottom-0 z-10 -mx-3 mt-auto flex flex-wrap items-center gap-2 border-t bg-card px-3 py-3 sm:-mx-6 sm:px-6">
        <Button onClick={() => nav("/faturamento/nova")}><Plus className="mr-2 h-4 w-4" />Novo</Button>
        <Button variant="secondary" disabled={!sel} onClick={() => nav(`/faturamento/nova?duplicar=${sel}`)}><Copy className="mr-2 h-4 w-4" />Duplicar</Button>
        <Button variant="outline" disabled={!sel} onClick={() => nav(`/faturamento/nfe/${sel}`)}><Eye className="mr-2 h-4 w-4" />Abrir</Button>
        <Button variant="ghost" className="ml-auto" onClick={() => nav(-1)}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
      </div>
    </div>
  );
}
