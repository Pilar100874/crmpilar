import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CalendarPlus, Copy, FileText, Lightbulb, Loader2, Package, Percent, Plus, Repeat, ShoppingCart, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PainelAtendimentoHeader } from "./PainelAtendimentoHeader";
import { analisarHabitos, carregarComprasJuntas, carregarHabitosCliente, roteiroAbordagem, type AnaliseHabitos } from "@/lib/atendimento/auxiliarVendas";
import { cn } from "@/lib/utils";

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const dataBR = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");

interface Props {
  clienteId: string;
  nome: string;
  onClose: () => void;
  onNovoOrcamento?: () => void;
  onAgendarRetorno?: () => void;
  onAbrirOrcamentos?: () => void;
}

function Secao({ titulo, icon: Icon, children }: { titulo: string; icon: typeof Package; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Icon className="h-4 w-4 text-primary" /> {titulo}</h3>
      {children}
    </section>
  );
}

/** Auxiliar de vendas em tela central: hábitos do cliente, oportunidades e roteiro. Somente leitura. */
export function AuxiliarVendasPanel({ clienteId, nome, onClose, onNovoOrcamento, onAgendarRetorno, onAbrirOrcamentos }: Props) {
  const [analise, setAnalise] = useState<AnaliseHabitos | null>(null);
  const [juntos, setJuntos] = useState<{ produtoId: string; nome: string; vezes: number }[]>([]);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let ativo = true;
    setAnalise(null); setErro(false); setJuntos([]);
    carregarHabitosCliente(clienteId)
      .then((r) => {
        if (!ativo) return;
        const a = analisarHabitos(r);
        setAnalise(a);
        void carregarComprasJuntas(clienteId, a.produtosFrequentes.map((p) => p.produtoId)).then((j) => ativo && setJuntos(j)).catch(() => {});
      })
      .catch(() => ativo && setErro(true));
    return () => { ativo = false; };
  }, [clienteId]);

  const roteiro = useMemo(() => (analise ? roteiroAbordagem(nome, analise) : ""), [analise, nome]);
  const maxMes = analise ? Math.max(1, ...analise.serieMensal.map((m) => m.valor)) : 1;

  const indicadores = analise ? [
    { icon: TrendingUp, rotulo: "Ticket médio", valor: analise.ticketMedio ? moeda(analise.ticketMedio) : "—" },
    { icon: ShoppingCart, rotulo: "Total comprado", valor: moeda(analise.valorTotal), sub: `${analise.totalPedidos} pedido(s)` },
    { icon: Repeat, rotulo: "Compra a cada", valor: analise.intervaloMedioDias ? `${analise.intervaloMedioDias} dias` : "—", sub: analise.diasDesdeUltima !== null ? `há ${analise.diasDesdeUltima} dias sem comprar` : undefined, alerta: analise.compraAtrasada },
    { icon: CalendarClock, rotulo: "Próxima compra", valor: dataBR(analise.proximaCompraPrevista), alerta: analise.compraAtrasada },
    { icon: Wallet, rotulo: "Prazo preferido", valor: analise.condicaoPreferida ?? "—" },
    { icon: Percent, rotulo: "Desconto médio", valor: analise.descontoMedio !== null ? `${analise.descontoMedio.toFixed(1)}%` : "—" },
    { icon: FileText, rotulo: "Conversão", valor: analise.conversao !== null ? `${Math.round(analise.conversao * 100)}%` : "—", sub: `${analise.totalOrcamentos} orçamento(s)` },
    { icon: TrendingUp, rotulo: "Maior pedido", valor: analise.maiorPedido ? moeda(analise.maiorPedido) : "—" },
  ] : [];

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <PainelAtendimentoHeader title="Auxiliar de vendas" subtitle={nome} icon={Lightbulb} onClose={onClose} actions={
        <div className="flex flex-wrap gap-1">
          {onAgendarRetorno && <Button size="sm" variant="outline" onClick={onAgendarRetorno}><CalendarPlus className="mr-1 h-4 w-4" /> Agendar</Button>}
          {onNovoOrcamento && <Button size="sm" onClick={onNovoOrcamento}><Plus className="mr-1 h-4 w-4" /> Novo orçamento</Button>}
        </div>
      } />
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
        {erro && <p className="text-sm text-destructive">Não foi possível analisar os hábitos deste cliente.</p>}
        {!erro && !analise && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Analisando hábitos do cliente…</p>}
        {analise && (
          <div className="mx-auto max-w-5xl space-y-4">
            <section className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"><Sparkles className="h-4 w-4 text-primary" /> O que oferecer agora</h3>
              <ul className="space-y-1.5">
                {analise.sugestoes.map((s) => <li key={s} className="flex gap-2 text-sm text-foreground"><span className="text-primary">•</span><span className="min-w-0 break-words">{s}</span></li>)}
                {juntos[0] && <li className="flex gap-2 text-sm text-foreground"><span className="text-primary">•</span><span className="min-w-0 break-words">Outros clientes que compram os mesmos itens também levam {juntos.slice(0, 2).map((j) => j.nome).join(" e ")} — sugira como complemento.</span></li>}
              </ul>
            </section>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {indicadores.map((i) => (
                <div key={i.rotulo} className={cn("min-w-0 rounded-lg border bg-card p-3", i.alerta ? "border-destructive/40" : "border-border")}>
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><i.icon className="h-3 w-3" /> {i.rotulo}</p>
                  <p className={cn("truncate text-base font-semibold", i.alerta ? "text-destructive" : "text-foreground")}>{i.valor}</p>
                  {i.sub && <p className="truncate text-[11px] text-muted-foreground">{i.sub}</p>}
                </div>
              ))}
            </div>

            <Secao titulo="Roteiro de abordagem" icon={Copy}>
              <p className="whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3 text-sm text-foreground">{roteiro}</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => { void navigator.clipboard.writeText(roteiro).then(() => toast.success("Roteiro copiado")); }}>
                <Copy className="mr-1 h-4 w-4" /> Copiar
              </Button>
            </Secao>

            <div className="grid gap-4 lg:grid-cols-2">
              <Secao titulo="Produtos mais comprados" icon={Package}>
                {analise.produtosFrequentes.length ? (
                  <div className="space-y-1.5">
                    {analise.produtosFrequentes.map((p) => (
                      <div key={p.produtoId} className="flex items-center justify-between gap-2 border-b border-border/50 pb-1.5 text-sm last:border-0">
                        <span className="min-w-0 truncate text-foreground" title={p.nome}>{p.nome}</span>
                        <span className="shrink-0 text-right text-[11px] text-muted-foreground">{p.vezes}x · {p.quantidadeMedia} un. · {moeda(p.ultimoPreco)} · {dataBR(p.ultimaCompra)}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">Sem produtos em pedidos finalizados.</p>}
              </Secao>

              <div className="space-y-4">
                <Secao titulo="Faltou no último pedido" icon={AlertTriangle}>
                  {analise.produtosSumidos.length ? (
                    <div className="flex flex-wrap gap-1">{analise.produtosSumidos.map((p) => <span key={p.produtoId} className="rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs text-foreground">{p.nome} · {p.vezes}x</span>)}</div>
                  ) : <p className="text-sm text-muted-foreground">Nenhum item recorrente ficou de fora.</p>}
                </Secao>
                <Secao titulo="Comprados junto por outros clientes" icon={Sparkles}>
                  {juntos.length ? (
                    <div className="flex flex-wrap gap-1">{juntos.map((p) => <span key={p.produtoId} className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs text-foreground">{p.nome} · {p.vezes}x</span>)}</div>
                  ) : <p className="text-sm text-muted-foreground">Sem dados suficientes para venda cruzada.</p>}
                </Secao>
              </div>
            </div>

            <Secao titulo="Compras nos últimos 12 meses" icon={TrendingUp}>
              <div className="flex h-28 items-end gap-1">
                {analise.serieMensal.map((m) => (
                  <div key={m.mes} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${m.mes}: ${moeda(m.valor)}`}>
                    <div className="w-full rounded-t bg-primary/70" style={{ height: `${Math.max(2, (m.valor / maxMes) * 90)}px` }} />
                    <span className="truncate text-[9px] text-muted-foreground">{m.mes}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Primeira compra: {dataBR(analise.primeiraCompra)} · Última: {dataBR(analise.ultimaCompra)}
                {analise.mesesFortes.length ? ` · Meses mais fortes: ${analise.mesesFortes.join(", ")}` : ""}
              </p>
            </Secao>

            <div className="grid gap-4 lg:grid-cols-2">
              <Secao titulo="Orçamentos em aberto" icon={FileText}>
                {analise.orcamentosAbertos.length ? (
                  <div className="space-y-1">
                    {analise.orcamentosAbertos.slice(0, 5).map((o) => <p key={o.id} className="flex justify-between text-sm"><span>{dataBR(o.data)}</span><span className="font-medium">{moeda(o.valor)}</span></p>)}
                    {onAbrirOrcamentos && <Button size="sm" variant="link" className="h-auto p-0" onClick={onAbrirOrcamentos}>Ver orçamentos</Button>}
                  </div>
                ) : <p className="text-sm text-muted-foreground">Nenhum orçamento em aberto.</p>}
              </Secao>
              <Secao titulo="Objeções e perdas" icon={AlertTriangle}>
                <p className="text-sm text-foreground">{analise.perdidos} orçamento(s) perdido(s)</p>
                {analise.motivosPerda.map((m) => <p key={m} className="mt-1 break-words text-xs text-muted-foreground">“{m}”</p>)}
              </Secao>
            </div>
            <p className="text-[11px] text-muted-foreground">Análise feita com os orçamentos e pedidos salvos deste contato. Nada é criado ou enviado automaticamente.</p>
          </div>
        )}
      </div>
    </div>
  );
}
