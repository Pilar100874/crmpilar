import { useEffect, useState } from "react";
import { Lightbulb, Loader2, Package, CalendarClock, Wallet, Percent, TrendingUp } from "lucide-react";
import { analisarHabitos, carregarHabitosCliente, type AnaliseHabitos } from "@/lib/atendimento/auxiliarVendas";
import { cn } from "@/lib/utils";

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** Barra do auxiliar de vendas: hábitos do cliente e sugestões do que oferecer. Somente leitura. */
export function AuxiliarVendasBarra({ clienteId }: { clienteId: string }) {
  const [analise, setAnalise] = useState<AnaliseHabitos | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let ativo = true;
    setAnalise(null); setErro(false);
    carregarHabitosCliente(clienteId)
      .then((r) => ativo && setAnalise(analisarHabitos(r)))
      .catch(() => ativo && setErro(true));
    return () => { ativo = false; };
  }, [clienteId]);

  if (erro) return <p className="mt-2 text-xs text-destructive">Não foi possível analisar os hábitos deste cliente.</p>;
  if (!analise) return <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Analisando hábitos do cliente…</p>;

  const indicadores = [
    { icon: TrendingUp, rotulo: "Ticket médio", valor: analise.ticketMedio ? moeda(analise.ticketMedio) : "—" },
    { icon: CalendarClock, rotulo: "Compra a cada", valor: analise.intervaloMedioDias ? `${analise.intervaloMedioDias} dias` : "—", alerta: analise.compraAtrasada },
    { icon: Wallet, rotulo: "Prazo preferido", valor: analise.condicaoPreferida ?? "—" },
    { icon: Percent, rotulo: "Conversão", valor: analise.conversao !== null ? `${Math.round(analise.conversao * 100)}%` : "—" },
  ];

  return (
    <div data-auxiliar-vendas className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Auxiliar de vendas</span>
        <span className="text-[11px] text-muted-foreground">{analise.totalPedidos} pedido(s) · {analise.totalOrcamentos} orçamento(s)</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {indicadores.map((i) => (
          <div key={i.rotulo} className={cn("min-w-0 rounded-md border bg-card px-2 py-1.5", i.alerta ? "border-destructive/40" : "border-border")}>
            <p className="flex items-center gap-1 text-[10px] text-muted-foreground"><i.icon className="h-3 w-3" /> {i.rotulo}</p>
            <p className={cn("truncate text-sm font-semibold", i.alerta ? "text-destructive" : "text-foreground")}>{i.valor}</p>
          </div>
        ))}
      </div>
      {analise.produtosFrequentes.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <Package className="h-3 w-3 text-muted-foreground" />
          {analise.produtosFrequentes.map((p) => (
            <span key={p.produtoId} className="max-w-full truncate rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-foreground" title={`${p.vezes}x · média ${p.quantidadeMedia} un. · último ${moeda(p.ultimoPreco)}`}>
              {p.nome} · {p.vezes}x
            </span>
          ))}
        </div>
      )}
      <ul className="mt-2 space-y-1">
        {analise.sugestoes.map((s) => (
          <li key={s} className="flex gap-1.5 text-xs text-foreground"><span className="text-primary">•</span><span className="min-w-0 break-words">{s}</span></li>
        ))}
      </ul>
    </div>
  );
}
