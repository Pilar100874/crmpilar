import { useEffect, useMemo, useState } from "react";
import { format, startOfMonth } from "date-fns";
import { Filter, List, Receipt, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PainelAtendimentoHeader } from "@/components/atendimento/PainelAtendimentoHeader";
import { carregarEquipeVisivel } from "@/lib/atendimento/equipeVisivel";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

const ETAPAS: Record<string, string> = {
  orcamento: "Orçamento", negociacao: "Negociação", aprovacao_gerencia: "Aprovação Gerência",
  finalizado: "Finalizado", ganho: "Ganho", perdido: "Perdido",
};
const ORDEM = ["orcamento", "negociacao", "aprovacao_gerencia", "finalizado", "ganho", "perdido"];
const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const rotulo = (e?: string) => (e ? ETAPAS[e] || e : "Sem status");

interface Props { onClose: () => void; onAbrirPedido: (pedido: any) => void }

export default function MeusPedidosPanel({ onClose, onAbrirPedido }: Props) {
  const hoje = format(new Date(), "yyyy-MM-dd");
  const [inicio, setInicio] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [fim, setFim] = useState(hoje);
  const [modo, setModo] = useState<"lista" | "funil">("lista");
  const [etapa, setEtapa] = useState("todos");
  const [agrupar, setAgrupar] = useState<"etapa" | "pagamento">("etapa");
  const [linhas, setLinhas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!inicio || !fim) return;
    let ativo = true;
    setCarregando(true);
    void (async () => {
      const estab = await getEstabelecimentoId();
      const equipe = estab ? await carregarEquipeVisivel(estab) : null;
      if (!equipe) { if (ativo) { setLinhas([]); setCarregando(false); } return; }
      const ids = equipe.papel === "gerente" ? [equipe.usuarioId, ...equipe.membros.map((m) => m.id)] : [equipe.usuarioId];
      const { data } = await (supabase as any).from("orcamentos")
        .select("id, numero, etapa, valor_total, created_at, cliente_id, empresa_id, customers:cliente_id(nome), empresas:empresa_id(nome_fantasia, nome), condicoes_pagamento:condicao_pagamento_id(nome), vendedor:vendedor_id(nome)")
        .in("vendedor_id", ids)
        .gte("created_at", `${inicio}T00:00:00`).lte("created_at", `${fim}T23:59:59`)
        .order("created_at", { ascending: false }).limit(5000);
      if (ativo) { setLinhas(data || []); setCarregando(false); }
    })();
    return () => { ativo = false; };
  }, [inicio, fim]);

  const filtrados = useMemo(() => linhas.filter((o) => etapa === "todos" || o.etapa === etapa), [linhas, etapa]);
  const grupos = useMemo(() => {
    const m = new Map<string, { chave: string; nome: string; qtd: number; valor: number }>();
    linhas.forEach((o) => {
      const chave = agrupar === "etapa" ? o.etapa || "" : o.condicoes_pagamento?.nome || "Sem condição informada";
      const nome = agrupar === "etapa" ? rotulo(o.etapa) : chave;
      const g = m.get(chave) || { chave, nome, qtd: 0, valor: 0 };
      g.qtd += 1; g.valor += Number(o.valor_total || 0);
      m.set(chave, g);
    });
    const lista = [...m.values()];
    const pos = (c: string) => (ORDEM.indexOf(c) < 0 ? 98 : ORDEM.indexOf(c));
    return agrupar === "etapa" ? lista.sort((a, b) => pos(a.chave) - pos(b.chave)) : lista.sort((a, b) => b.valor - a.valor);
  }, [linhas, agrupar]);
  const totalValor = filtrados.reduce((s, o) => s + Number(o.valor_total || 0), 0);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <PainelAtendimentoHeader
        title="Meus pedidos" subtitle="Pedidos por status, com visão de funil" icon={Receipt}
        onClose={onClose} closeLabel="Fechar Meus pedidos"
        actions={
          <div className="flex rounded-lg border border-border p-0.5">
            <Button size="sm" variant={modo === "lista" ? "secondary" : "ghost"} className="h-7 gap-1 px-2 text-xs" onClick={() => setModo("lista")}><List className="h-3.5 w-3.5" />Lista</Button>
            <Button size="sm" variant={modo === "funil" ? "secondary" : "ghost"} className="h-7 gap-1 px-2 text-xs" onClick={() => setModo("funil")}><TrendingDown className="h-3.5 w-3.5" />Funil</Button>
          </div>
        }
      />
      <div className="flex flex-wrap items-end gap-3 border-b border-border px-4 py-3 sm:px-6">
        <label className="text-xs text-muted-foreground">De<Input type="date" aria-label="Data inicial" value={inicio} onChange={(e) => setInicio(e.target.value)} className="mt-1 w-36" /></label>
        <label className="text-xs text-muted-foreground">Até<Input type="date" aria-label="Data final" value={fim} onChange={(e) => setFim(e.target.value)} className="mt-1 w-36" /></label>
        {modo === "lista" ? (
          <Select value={etapa} onValueChange={setEtapa}>
            <SelectTrigger className="w-48" aria-label="Filtrar por status"><Filter className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {ORDEM.map((e) => <SelectItem key={e} value={e}>{ETAPAS[e]}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <Select value={agrupar} onValueChange={(v) => setAgrupar(v as any)}>
            <SelectTrigger className="w-56" aria-label="Agrupar funil por"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="etapa">Por status do pedido</SelectItem>
              <SelectItem value="pagamento">Por condição de pagamento</SelectItem>
            </SelectContent>
          </Select>
        )}
        <span className="ml-auto text-sm text-muted-foreground">{filtrados.length} pedidos • <strong className="text-foreground">{brl(totalValor)}</strong></span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {carregando ? <p className="text-sm text-muted-foreground">Carregando…</p>
          : linhas.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum pedido no período.</p>
          : modo === "funil" ? (
            <div className="flex flex-col items-center gap-1.5">
              {grupos.map((g, i) => (
                <button
                  key={g.chave} type="button"
                  style={{ width: `${100 - (i * 60) / Math.max(grupos.length, 1)}%` }}
                  onClick={() => { if (agrupar === "etapa") { setEtapa(g.chave || "todos"); setModo("lista"); } }}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-primary/10 px-4 py-3 text-left ring-1 ring-primary/20 transition-colors hover:bg-primary/15"
                >
                  <span className="min-w-0 truncate text-sm font-medium">{g.nome}</span>
                  <span className="shrink-0 text-sm"><strong>{brl(g.valor)}</strong> <span className="text-muted-foreground">• {g.qtd}</span></span>
                </button>
              ))}
            </div>
          ) : filtrados.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum pedido com este status.</p> : (
            <div className="divide-y divide-border">
              {filtrados.map((o) => (
                <button key={o.id} type="button" onClick={() => onAbrirPedido(o)} className="flex w-full min-w-0 items-center justify-between gap-3 py-3 text-left hover:bg-muted/40">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{o.empresas?.nome_fantasia || o.empresas?.nome || o.customers?.nome || "Sem cliente"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {o.numero ? `#${o.numero} • ` : ""}{format(new Date(o.created_at), "dd/MM/yyyy")}{o.customers?.nome ? ` • ${o.customers.nome}` : ""}{o.vendedor?.nome ? ` • ${o.vendedor.nome}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold">{brl(Number(o.valor_total || 0))}</p>
                    <span className="text-[11px] text-muted-foreground">{rotulo(o.etapa)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
