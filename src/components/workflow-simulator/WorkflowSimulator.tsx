import { useEffect, useMemo, useState } from "react";
import { Node, Edge } from "@xyflow/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  X,
  Play,
  SkipForward,
  RotateCcw,
  ShoppingCart,
  ClipboardList,
  Megaphone,
  CheckCircle2,
  AlertCircle,
  Pause,
} from "lucide-react";

export type SimulatorKind = "ecommerce" | "automacao-vendas" | "ads";

interface BlockDef {
  type: string;
  label: string;
  description?: string;
  icon?: string;
  color?: string;
}

interface WorkflowSimulatorProps {
  open: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
  kind: SimulatorKind;
  blockDefinitions: BlockDef[];
  onHighlightNode?: (nodeId: string | null) => void;
}

interface LogEntry {
  nodeId: string;
  label: string;
  message: string;
  status: "ok" | "skip" | "stop" | "error";
  time: string;
}

const KIND_META: Record<SimulatorKind, { title: string; subtitle: string; icon: any }> = {
  ecommerce: {
    title: "Simulador de Visitante",
    subtitle: "Carrinho fake percorrendo regras do e-commerce",
    icon: ShoppingCart,
  },
  "automacao-vendas": {
    title: "Simulador de Pedido",
    subtitle: "Pedido fake percorrendo a automação de vendas",
    icon: ClipboardList,
  },
  ads: {
    title: "Simulador de Campanha",
    subtitle: "Métricas fake percorrendo a automação de ads",
    icon: Megaphone,
  },
};

function findStartNode(nodes: Node[], edges: Edge[]): Node | null {
  if (nodes.length === 0) return null;
  const startPreferred = nodes.find((n) => {
    const t = (n.data as any)?.type as string | undefined;
    return t === "inicio_regra" || t === "iniciar_validacao" || t === "start" || t === "trigger";
  });
  if (startPreferred) return startPreferred;
  const incoming = new Set(edges.map((e) => e.target));
  return nodes.find((n) => !incoming.has(n.id)) || nodes[0];
}

function pickNextNode(current: Node, nodes: Node[], edges: Edge[]): Node | null {
  const outgoing = edges.filter((e) => e.source === current.id);
  if (outgoing.length === 0) return null;
  // Prefer 'sim' or 'faixa-0' style; otherwise first.
  const preferred = outgoing.find((e) => e.sourceHandle === "sim") || outgoing[0];
  return nodes.find((n) => n.id === preferred.target) || null;
}

function brlNumber(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function WorkflowSimulator({
  open,
  onClose,
  nodes,
  edges,
  kind,
  blockDefinitions,
  onHighlightNode,
}: WorkflowSimulatorProps) {
  const meta = KIND_META[kind];
  const KindIcon = meta.icon;

  // Scenario state (kind-specific)
  const [ecomScenario, setEcomScenario] = useState({ produto: "Camiseta Premium", quantidade: 2, precoUnit: 89.9, cupom: "" });
  const [vendasScenario, setVendasScenario] = useState({ cliente: "Cliente Exemplo", valor: 1500, formaPagamento: "Pix" });
  const [adsScenario, setAdsScenario] = useState({ campanha: "Black Friday", orcamentoDiario: 200, publico: "Lookalike 1%" });

  // Engine state
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);

  // Derived contextual fake screen state
  const [discountPct, setDiscountPct] = useState(0);
  const [freteGratis, setFreteGratis] = useState(false);
  const [statusPedido, setStatusPedido] = useState("Aguardando processamento");
  const [aprovacaoNecessaria, setAprovacaoNecessaria] = useState(false);
  const [impressoes, setImpressoes] = useState(1240);
  const [cliques, setCliques] = useState(58);
  const [gasto, setGasto] = useState(0);
  const [estadoCampanha, setEstadoCampanha] = useState("Ativa");

  const reset = () => {
    setCurrentNodeId(null);
    setRunning(false);
    setFinished(false);
    setLog([]);
    setDiscountPct(0);
    setFreteGratis(false);
    setStatusPedido("Aguardando processamento");
    setAprovacaoNecessaria(false);
    setImpressoes(1240);
    setCliques(58);
    setGasto(0);
    setEstadoCampanha("Ativa");
    onHighlightNode?.(null);
  };

  useEffect(() => {
    if (!open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    onHighlightNode?.(currentNodeId);
  }, [currentNodeId, onHighlightNode]);

  const subtotal = useMemo(() => ecomScenario.quantidade * ecomScenario.precoUnit, [ecomScenario]);
  const totalEcom = useMemo(() => subtotal * (1 - discountPct / 100), [subtotal, discountPct]);
  const ctr = impressoes ? ((cliques / impressoes) * 100).toFixed(2) : "0.00";
  const cpc = cliques ? (gasto / cliques).toFixed(2) : "0.00";

  const interpretNode = (node: Node): { msg: string; status: LogEntry["status"] } => {
    const data: any = node.data || {};
    const type: string = data.type || "";
    const cfg: any = data.config || {};

    // Visual feedback per kind
    if (kind === "ecommerce") {
      if (type === "aplicar_desconto_percentual" && cfg.percentual != null) {
        setDiscountPct((d) => Math.min(100, d + Number(cfg.percentual)));
        return { msg: `Aplicado desconto de ${cfg.percentual}%`, status: "ok" };
      }
      if (type === "frete_gratis") {
        setFreteGratis(true);
        return { msg: "Frete grátis liberado", status: "ok" };
      }
      if (type === "popup_personalizado" || type === "chat_proativo" || type === "destacar_elemento") {
        return { msg: `Ação ao visitante disparada: ${data.label || type}`, status: "ok" };
      }
      if (type === "oferecer_cupom_instantaneo" && cfg.codigo) {
        return { msg: `Cupom instantâneo entregue: ${cfg.codigo}`, status: "ok" };
      }
    }
    if (kind === "automacao-vendas") {
      if (type === "valida_faixa_faturamento") {
        return { msg: `Verificando faixa para R$ ${vendasScenario.valor}`, status: "ok" };
      }
      if (type === "condicao_se") {
        return { msg: "Avaliando condição (caminho 'Sim')", status: "ok" };
      }
      if (type === "aprovar_pedido") {
        setStatusPedido("Aprovado");
        return { msg: "Pedido aprovado", status: "ok" };
      }
      if (type === "reprovar_pedido") {
        setStatusPedido("Reprovado");
        return { msg: "Pedido reprovado", status: "stop" };
      }
      if (type === "solicitar_aprovacao") {
        setAprovacaoNecessaria(true);
        setStatusPedido("Aguardando aprovação");
        return { msg: "Solicitando aprovação manual", status: "ok" };
      }
    }
    if (kind === "ads") {
      if (type === "aumentar_orcamento" && cfg.percentual != null) {
        setGasto((g) => g + Number(cfg.percentual));
        return { msg: `Orçamento aumentado em ${cfg.percentual}%`, status: "ok" };
      }
      if (type === "pausar_campanha") {
        setEstadoCampanha("Pausada");
        return { msg: "Campanha pausada", status: "stop" };
      }
      if (type === "ativar_campanha") {
        setEstadoCampanha("Ativa");
        return { msg: "Campanha ativada", status: "ok" };
      }
    }

    return { msg: data.label || type || "Bloco executado", status: "ok" };
  };

  const stepFrom = (node: Node) => {
    const data: any = node.data || {};
    const label = String(data.label || blockDefinitions.find((b) => b.type === data.type)?.label || data.type || "Bloco");
    const time = new Date().toLocaleTimeString("pt-BR");

    if (data.isSkipped) {
      setLog((l) => [...l, { nodeId: node.id, label, message: "Bloco pulado (skip ativo)", status: "skip", time }]);
      const next = pickNextNode(node, nodes, edges);
      if (next) {
        setCurrentNodeId(next.id);
      } else {
        setFinished(true);
        setRunning(false);
      }
      return;
    }

    const { msg, status } = interpretNode(node);
    setLog((l) => [...l, { nodeId: node.id, label, message: msg, status, time }]);

    if (data.isBreakpoint) {
      setRunning(false);
      setLog((l) => [...l, { nodeId: node.id, label, message: "Pausa (breakpoint). Use 'Próximo bloco' para continuar.", status: "stop", time }]);
      return;
    }

    if (status === "stop") {
      setFinished(true);
      setRunning(false);
      return;
    }

    const next = pickNextNode(node, nodes, edges);
    if (next) {
      setCurrentNodeId(next.id);
    } else {
      setFinished(true);
      setRunning(false);
      setLog((l) => [...l, { nodeId: node.id, label: "Fim", message: "Fluxo concluído", status: "ok", time: new Date().toLocaleTimeString("pt-BR") }]);
    }
  };

  const handleStart = () => {
    reset();
    const start = findStartNode(nodes, edges);
    if (!start) return;
    setRunning(true);
    setCurrentNodeId(start.id);
    setTimeout(() => stepFrom(start), 50);
  };

  const handleStep = () => {
    if (!currentNodeId) {
      handleStart();
      return;
    }
    const node = nodes.find((n) => n.id === currentNodeId);
    if (!node) return;
    stepFrom(node);
  };

  if (!open) return null;

  return (
    <div className="w-full sm:w-[420px] h-full border-l border-border bg-card flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-2 rounded-lg bg-primary/15">
            <KindIcon className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">{meta.title}</h3>
            <p className="text-[11px] text-muted-foreground truncate">{meta.subtitle}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Contextual fake screen */}
          {kind === "ecommerce" && (
            <Card className="p-3 bg-gradient-to-br from-emerald-500/5 to-emerald-500/0 border-emerald-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground">Carrinho do visitante</span>
                {freteGratis && <Badge variant="outline" className="text-emerald-600 border-emerald-500/50 text-[10px]">Frete grátis</Badge>}
              </div>
              <div className="text-xs space-y-1.5">
                <div className="flex justify-between"><span className="text-muted-foreground">Produto</span><span className="font-medium">{ecomScenario.produto}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Qtd × Preço</span><span>{ecomScenario.quantidade} × {brlNumber(ecomScenario.precoUnit)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{brlNumber(subtotal)}</span></div>
                {discountPct > 0 && (
                  <div className="flex justify-between text-emerald-600"><span>Desconto</span><span>-{discountPct.toFixed(0)}%</span></div>
                )}
                <Separator />
                <div className="flex justify-between text-sm font-bold"><span>Total</span><span>{brlNumber(totalEcom)}</span></div>
              </div>
            </Card>
          )}

          {kind === "automacao-vendas" && (
            <Card className="p-3 bg-gradient-to-br from-blue-500/5 to-blue-500/0 border-blue-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground">Pedido em validação</span>
                <Badge variant="outline" className="text-blue-600 border-blue-500/50 text-[10px]">{statusPedido}</Badge>
              </div>
              <div className="text-xs space-y-1.5">
                <div className="flex justify-between"><span className="text-muted-foreground">Cliente</span><span className="font-medium">{vendasScenario.cliente}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Valor</span><span>{brlNumber(vendasScenario.valor)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pagamento</span><span>{vendasScenario.formaPagamento}</span></div>
                {aprovacaoNecessaria && (
                  <div className="mt-2 p-2 rounded bg-amber-500/10 text-amber-700 text-[11px] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Aprovação manual solicitada
                  </div>
                )}
              </div>
            </Card>
          )}

          {kind === "ads" && (
            <Card className="p-3 bg-gradient-to-br from-orange-500/5 to-orange-500/0 border-orange-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground">Campanha em monitoramento</span>
                <Badge variant="outline" className={`text-[10px] ${estadoCampanha === "Ativa" ? "text-emerald-600 border-emerald-500/50" : "text-red-600 border-red-500/50"}`}>{estadoCampanha}</Badge>
              </div>
              <div className="text-xs space-y-1.5">
                <div className="flex justify-between"><span className="text-muted-foreground">Campanha</span><span className="font-medium">{adsScenario.campanha}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Público</span><span>{adsScenario.publico}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Impressões</span><span>{impressoes.toLocaleString("pt-BR")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Cliques</span><span>{cliques}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">CTR</span><span>{ctr}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">CPC</span><span>R$ {cpc}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Gasto</span><span>{brlNumber(gasto)}</span></div>
              </div>
            </Card>
          )}

          {/* Scenario form */}
          <Card className="p-3">
            <div className="text-xs font-semibold text-foreground mb-2">Cenário de teste</div>
            {kind === "ecommerce" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Label className="text-[11px]">Produto</Label>
                  <Input className="h-8 text-xs" value={ecomScenario.produto} onChange={(e) => setEcomScenario({ ...ecomScenario, produto: e.target.value })} />
                </div>
                <div>
                  <Label className="text-[11px]">Quantidade</Label>
                  <Input type="number" min={1} className="h-8 text-xs" value={ecomScenario.quantidade} onChange={(e) => setEcomScenario({ ...ecomScenario, quantidade: Number(e.target.value) || 1 })} />
                </div>
                <div>
                  <Label className="text-[11px]">Preço unit.</Label>
                  <Input type="number" min={0} className="h-8 text-xs" value={ecomScenario.precoUnit} onChange={(e) => setEcomScenario({ ...ecomScenario, precoUnit: Number(e.target.value) || 0 })} />
                </div>
                <div className="col-span-2">
                  <Label className="text-[11px]">Cupom (opcional)</Label>
                  <Input className="h-8 text-xs" value={ecomScenario.cupom} onChange={(e) => setEcomScenario({ ...ecomScenario, cupom: e.target.value })} />
                </div>
              </div>
            )}
            {kind === "automacao-vendas" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Label className="text-[11px]">Cliente</Label>
                  <Input className="h-8 text-xs" value={vendasScenario.cliente} onChange={(e) => setVendasScenario({ ...vendasScenario, cliente: e.target.value })} />
                </div>
                <div>
                  <Label className="text-[11px]">Valor (R$)</Label>
                  <Input type="number" min={0} className="h-8 text-xs" value={vendasScenario.valor} onChange={(e) => setVendasScenario({ ...vendasScenario, valor: Number(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label className="text-[11px]">Pagamento</Label>
                  <Input className="h-8 text-xs" value={vendasScenario.formaPagamento} onChange={(e) => setVendasScenario({ ...vendasScenario, formaPagamento: e.target.value })} />
                </div>
              </div>
            )}
            {kind === "ads" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Label className="text-[11px]">Campanha</Label>
                  <Input className="h-8 text-xs" value={adsScenario.campanha} onChange={(e) => setAdsScenario({ ...adsScenario, campanha: e.target.value })} />
                </div>
                <div>
                  <Label className="text-[11px]">Orçamento diário</Label>
                  <Input type="number" min={0} className="h-8 text-xs" value={adsScenario.orcamentoDiario} onChange={(e) => setAdsScenario({ ...adsScenario, orcamentoDiario: Number(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label className="text-[11px]">Público</Label>
                  <Input className="h-8 text-xs" value={adsScenario.publico} onChange={(e) => setAdsScenario({ ...adsScenario, publico: e.target.value })} />
                </div>
              </div>
            )}
          </Card>

          {/* Controls */}
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={handleStart}>
              <Play className="w-3.5 h-3.5 mr-1" /> Iniciar
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={handleStep} disabled={!currentNodeId || finished}>
              <SkipForward className="w-3.5 h-3.5 mr-1" /> Próximo
            </Button>
            <Button size="sm" variant="outline" onClick={reset}>
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Execution log */}
          <Card className="p-3">
            <div className="text-xs font-semibold text-foreground mb-2 flex items-center justify-between">
              <span>Execução</span>
              {finished && <Badge variant="outline" className="text-emerald-600 border-emerald-500/50 text-[10px]">Concluído</Badge>}
            </div>
            {log.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic">Clique em Iniciar para simular o fluxo passo a passo.</p>
            ) : (
              <ul className="space-y-1.5">
                {log.map((entry, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[11px]">
                    {entry.status === "ok" && <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />}
                    {entry.status === "skip" && <SkipForward className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />}
                    {entry.status === "stop" && <Pause className="w-3 h-3 text-orange-500 mt-0.5 shrink-0" />}
                    {entry.status === "error" && <AlertCircle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground truncate">{entry.label}</span>
                        <span className="text-muted-foreground text-[10px] shrink-0">{entry.time}</span>
                      </div>
                      <div className="text-muted-foreground">{entry.message}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
