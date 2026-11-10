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
    if (!usuarioId || !inicio || !fim) return;
    setCarregando(true);
    supabase.from("orcamentos")
      .select("id, etapa, valor_total, created_at, condicoes_pagamento:condicao_pagamento_id(nome)")
      .eq("vendedor_id", usuarioId)
      .gte("created_at", `${inicio}T00:00:00`).lte("created_at", `${fim}T23:59:59`)
      .limit(5000)
      .then(({ data, error }) => {
        if (error) {
          // fallback sem relação de condição
          supabase.from("orcamentos").select("id, etapa, valor_total, created_at, condicao_pagamento_id")
            .eq("vendedor_id", usuarioId).gte("created_at", `${inicio}T00:00:00`).lte("created_at", `${fim}T23:59:59`).limit(5000)
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
    return [...m.values()].sort((a, b) => b.valor - a.valor);
  }, [linhas, agrupar]);
  const totalValor = grupos.reduce((s, g) => s + g.valor, 0);
  const totalQtd = grupos.reduce((s, g) => s + g.qtd, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Meus pedidos por condição</h2>
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
        <div className="divide-y divide-border">
          {grupos.map((g) => (
            <div key={g.nome} className="py-3">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <span className="min-w-0 break-words text-sm font-medium">{g.nome}</span>
                <span className="shrink-0 text-sm"><strong>{brl(g.valor)}</strong> <span className="text-muted-foreground">• {g.qtd}</span></span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${totalValor ? (g.valor / totalValor) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
