import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ETAPAS: Record<string, string> = {
  orcamento: "Orçamento", negociacao: "Negociação", aprovacao_gerencia: "Aprovação Gerência",
  finalizado: "Finalizado", ganho: "Ganho", perdido: "Perdido",
};
const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function PedidosPorCondicao({ usuarioId, inicio, fim }: { usuarioId?: string; inicio: string; fim: string }) {
  const [linhas, setLinhas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [agrupar, setAgrupar] = useState<"etapa" | "pagamento">("etapa");

  useEffect(() => {
    if (!inicio || !fim) return;
    setCarregando(true);
    supabase.from("orcamentos")
      .select("id, etapa, valor_total, created_at, condicoes_pagamento:condicao_pagamento_id(nome)")
      .or(`vendedor_id.eq.${usuarioId},vendedor_id.is.null`)
      .gte("created_at", `${inicio}T00:00:00`).lte("created_at", `${fim}T23:59:59`)
      .limit(5000)
      .then(({ data, error }) => {
        if (error) {
          // fallback sem relação de condição
          supabase.from("orcamentos").select("id, etapa, valor_total, created_at, condicao_pagamento_id")
            .or(`vendedor_id.eq.${usuarioId},vendedor_id.is.null`).gte("created_at", `${inicio}T00:00:00`).lte("created_at", `${fim}T23:59:59`).limit(5000)
            .then(({ data: d2 }) => { setLinhas(d2 || []); setCarregando(false); });
          return;
        }
        setLinhas(data || []); setCarregando(false);
      });
  }, [usuarioId, inicio, fim]);

  const grupos = useMemo(() => {
    const m = new Map<string, { nome: string; qtd: number; valor: number }>();
    linhas.forEach((o) => {
      const nome = agrupar === "etapa"
        ? ETAPAS[o.etapa] || o.etapa || "Sem status"
        : o.condicoes_pagamento?.nome || "Sem condição informada";
      const g = m.get(nome) || { nome, qtd: 0, valor: 0 };
      g.qtd += 1; g.valor += Number(o.valor_total || 0);
      m.set(nome, g);
    });
    const ordem = ["Orçamento", "Negociação", "Aprovação Gerência", "Finalizado", "Ganho", "Perdido"];
    const lista = [...m.values()];
    if (agrupar === "etapa") return lista.sort((a, b) => (ordem.indexOf(a.nome) < 0 ? 98 : ordem.indexOf(a.nome)) - (ordem.indexOf(b.nome) < 0 ? 98 : ordem.indexOf(b.nome)));
    return lista.sort((a, b) => b.valor - a.valor);
  }, [linhas, agrupar]);
  const totalValor = grupos.reduce((s, g) => s + g.valor, 0);
  const totalQtd = grupos.reduce((s, g) => s + g.qtd, 0);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Funil de vendas</h2>
        <Select value={agrupar} onValueChange={(v) => setAgrupar(v as any)}>
          <SelectTrigger className="w-56 max-w-full" aria-label="Agrupar pedidos por"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="etapa">Por status do pedido</SelectItem>
            <SelectItem value="pagamento">Por condição de pagamento</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="text-sm text-muted-foreground">{totalQtd} pedidos no período • {brl(totalValor)}</p>
      {carregando ? <p className="text-sm text-muted-foreground">Carregando…</p> : grupos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum pedido no período.</p>
      ) : (
        <div className="flex flex-col items-center gap-1.5">
          {grupos.map((g, i) => {
            const largura = 100 - (i * 60) / Math.max(grupos.length, 1);
            return (
              <div key={g.nome} style={{ width: `${largura}%` }} className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-primary/10 px-4 py-2.5 ring-1 ring-primary/20">
                <span className="min-w-0 truncate text-sm font-medium">{g.nome}</span>
                <span className="shrink-0 text-sm"><strong>{brl(g.valor)}</strong> <span className="text-muted-foreground">• {g.qtd}</span></span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
