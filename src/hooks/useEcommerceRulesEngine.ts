import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RuleAction {
  type: string;
  config: Record<string, any>;
  label: string;
}

export interface ActiveRule {
  id: string;
  nome: string;
  actions: RuleAction[];
}

export interface CartContext {
  subtotal: number;
  totalQuantity: number;
}

/**
 * Motor de regras do e-commerce.
 * Aceita contexto do carrinho para avaliar condições de valor/quantidade.
 */
export function useEcommerceRulesEngine(cartContext?: CartContext) {
  const [popupActions, setPopupActions] = useState<(RuleAction & { ruleId: string; ruleName: string })[]>([]);
  const [bannerActions, setBannerActions] = useState<(RuleAction & { ruleId: string; ruleName: string })[]>([]);
  const [vitrineActions, setVitrineActions] = useState<(RuleAction & { ruleId: string; ruleName: string })[]>([]);
  const [freteActions, setFreteActions] = useState<(RuleAction & { ruleId: string; ruleName: string })[]>([]);
  const [discountActions, setDiscountActions] = useState<(RuleAction & { ruleId: string; ruleName: string })[]>([]);
  const [paymentActions, setPaymentActions] = useState<(RuleAction & { ruleId: string; ruleName: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAndProcessRules();
  }, [cartContext?.subtotal, cartContext?.totalQuantity]);

  const loadAndProcessRules = async () => {
    try {
      const estabId = localStorage.getItem("estabelecimentoId");
      if (!estabId) { setLoading(false); return; }

      // Check if modo_catalogo is active for current context — skip all rules
      const { data: configData } = await supabase
        .from("ecommerce_config")
        .select("modo_catalogo_b2c, modo_catalogo_b2b")
        .eq("estabelecimento_id", estabId)
        .maybeSingle();
      const isB2B = window.location.pathname.includes("/b2b");
      const catalogActive = isB2B ? configData?.modo_catalogo_b2b : configData?.modo_catalogo_b2c;
      if (catalogActive) { setLoading(false); return; }

      const { data: rules, error } = await supabase
        .from("ecommerce_rules")
        .select("*")
        .eq("estabelecimento_id", estabId)
        .eq("ativo", true);

      if (error || !rules) { setLoading(false); return; }

      const popups: (RuleAction & { ruleId: string; ruleName: string })[] = [];
      const banners: (RuleAction & { ruleId: string; ruleName: string })[] = [];
      const vitrines: (RuleAction & { ruleId: string; ruleName: string })[] = [];
      const fretes: (RuleAction & { ruleId: string; ruleName: string })[] = [];
      const descontos: (RuleAction & { ruleId: string; ruleName: string })[] = [];
      const pagamentos: (RuleAction & { ruleId: string; ruleName: string })[] = [];

      for (const rule of rules) {
        // Check date range
        if (rule.starts_at && new Date(rule.starts_at) > new Date()) continue;
        if (rule.expires_at && new Date(rule.expires_at) < new Date()) continue;

        const flowData = rule.flow_data as any;
        if (!flowData?.nodes || !flowData?.edges) continue;

        const nodes = flowData.nodes as any[];
        const edges = flowData.edges as any[];

        // Find all action nodes reachable from start, respecting conditional routing
        const actionNodes = getReachableActions(nodes, edges, cartContext);

        for (const actionNode of actionNodes) {
          const nodeType = actionNode.data?.type;
          const config = actionNode.data?.config || {};
          const label = actionNode.data?.label || "";

          // Check if any temporal conditions block this rule
          const conditionNodes = getConditionNodesForAction(actionNode, nodes, edges);
          if (!evaluateConditions(conditionNodes, cartContext)) continue;

          const actionEntry = { type: nodeType, config, label, ruleId: rule.id, ruleName: rule.nome };

          if (nodeType === "acao_popup_promocional") {
            popups.push(actionEntry);
          } else if (nodeType === "acao_banner_promocional") {
            banners.push(actionEntry);
          } else if (nodeType === "acao_destaque_vitrine") {
            vitrines.push(actionEntry);
          } else if (nodeType === "acao_frete_gratis" || nodeType === "acao_desconto_frete" || nodeType === "acao_frete_fixo") {
            fretes.push(actionEntry);
          } else if (nodeType === "acao_desconto_percentual" || nodeType === "acao_desconto_fixo" || nodeType === "acao_desconto_progressivo" || nodeType === "acao_compre_x_leve_y") {
            descontos.push(actionEntry);
          } else if (nodeType === "acao_desconto_pix" || nodeType === "acao_desconto_boleto" || nodeType === "acao_parcelas_extras" || nodeType === "acao_regra_pagamento") {
            pagamentos.push(actionEntry);
          } else if (nodeType === "acao_disparar_push") {
            // Side-effect: dispara push (fire-and-forget)
            import("@/lib/pushExecutor").then(({ executarBlocoPush }) => {
              executarBlocoPush(config as any, {
                variaveis: { carrinho: cartContext, regra: rule.nome },
                workflow_id: rule.id,
                workflow_tipo: "marketing",
                origem: "ecommerce_rules",
              }).catch((e) => console.error("[ecom-rules] push falhou:", e));
            });
          } else if (nodeType === "acao_enviar_sms") {
            // Side-effect: envia SMS (fire-and-forget)
            import("@/lib/smsExecutor").then(({ executarBlocoSms }) => {
              executarBlocoSms(config as any, {
                variaveis: { carrinho: cartContext, regra: rule.nome },
                estabelecimento_id: estabId,
                workflow_tipo: "marketing",
                origem: "ecommerce_rules",
              }).catch((e) => console.error("[ecom-rules] SMS falhou:", e));
            });
          }
        }
      }

      setPopupActions(popups);
      setBannerActions(banners);
      setVitrineActions(vitrines);
      setFreteActions(fretes);
      setDiscountActions(descontos);
      setPaymentActions(pagamentos);
    } catch (err) {
      console.error("[RulesEngine] Erro:", err);
    } finally {
      setLoading(false);
    }
  };

  return { popupActions, bannerActions, vitrineActions, freteActions, discountActions, paymentActions, loading };
}

/**
 * Encontra todos os nós de ação alcançáveis a partir do nó "inicio_regra",
 * respeitando blocos condicionais com múltiplas saídas (faixa de valor).
 */
function getReachableActions(nodes: any[], edges: any[], cartContext?: CartContext): any[] {
  const startNode = nodes.find(n => n.data?.type === "inicio_regra");
  if (!startNode) return [];

  // Also find nodes that have no incoming edges (orphan roots) to handle disconnected flows
  const nodesWithIncoming = new Set(edges.map((e: any) => e.target));
  const rootNodes = nodes.filter(n => 
    n.id === startNode.id || 
    (!nodesWithIncoming.has(n.id) && n.data?.type !== "inicio_regra")
  );

  const visited = new Set<string>();
  const queue = rootNodes.map((n: any) => n.id);
  const actionNodes: any[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const node = nodes.find(n => n.id === current);
    if (node) {
      const type = node.data?.type || "";
      if (type.startsWith("acao_")) {
        actionNodes.push(node);
      }

      // Handle multi-output conditional nodes (faixa de valor)
      if (type === "condicao_valor_pedido" && cartContext) {
        const faixas = node.data?.config?.faixas || [];
        const valor = cartContext.subtotal;
        
        // Find which faixa matches
        let matchedHandleId: string | null = null;
        for (let i = 0; i < faixas.length; i++) {
          const faixa = faixas[i];
          const min = parseFloat(faixa.valorMin ?? faixa.valorMinimo ?? "0") || 0;
          const max = parseFloat(faixa.valorMax ?? faixa.valorMaximo ?? "999999999") || 999999999;
          if (valor >= min && valor <= max) {
            matchedHandleId = `faixa-${i}`;
            break;
          }
        }

        if (matchedHandleId) {
          // Only follow edges from the matched handle
          const matchedEdges = edges.filter(e => e.source === current && e.sourceHandle === matchedHandleId);
          for (const edge of matchedEdges) {
            queue.push(edge.target);
          }
        }
        // Don't follow default edges for this node
        continue;
      }
    }

    // Follow all edges from current node (default behavior)
    const outEdges = edges.filter(e => e.source === current);
    for (const edge of outEdges) {
      queue.push(edge.target);
    }
  }

  return actionNodes;
}

/**
 * Encontra os nós de condição que estão no caminho para uma ação
 */
function getConditionNodesForAction(actionNode: any, nodes: any[], edges: any[]): any[] {
  const conditions: any[] = [];
  const visited = new Set<string>();
  const queue = [actionNode.id];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const inEdges = edges.filter(e => e.target === current);
    for (const edge of inEdges) {
      const sourceNode = nodes.find(n => n.id === edge.source);
      if (sourceNode) {
        const type = sourceNode.data?.type || "";
        if (type.startsWith("condicao_") && type !== "condicao_valor_pedido") {
          conditions.push(sourceNode);
        }
        queue.push(sourceNode.id);
      }
    }
  }

  return conditions;
}

/**
 * Avalia condições temporais e de carrinho.
 */
function evaluateConditions(conditionNodes: any[], cartContext?: CartContext): boolean {
  const now = new Date();

  for (const node of conditionNodes) {
    const type = node.data?.type;
    const config = node.data?.config || {};

    switch (type) {
      case "condicao_periodo": {
        if (config.dataInicio && new Date(config.dataInicio) > now) return false;
        if (config.dataFim && new Date(config.dataFim) < now) return false;
        break;
      }
      case "condicao_dia_semana": {
        const dias = config.dias || [];
        if (dias.length > 0) {
          const dayNames = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
          const today = dayNames[now.getDay()];
          if (!dias.includes(today) && !dias.includes(now.getDay())) return false;
        }
        break;
      }
      case "condicao_horario": {
        const horaInicio = config.horaInicio || "00:00";
        const horaFim = config.horaFim || "23:59";
        const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        if (currentTime < horaInicio || currentTime > horaFim) return false;
        break;
      }
      case "condicao_valor_carrinho": {
        if (cartContext) {
          const min = parseFloat(config.valorMinimo || "0") || 0;
          const max = parseFloat(config.valorMaximo || "999999999") || 999999999;
          if (cartContext.subtotal < min || cartContext.subtotal > max) return false;
        }
        break;
      }
      case "condicao_quantidade_itens": {
        if (cartContext) {
          const min = parseInt(config.quantidadeMinima || "0") || 0;
          const max = parseInt(config.quantidadeMaxima || "999999") || 999999;
          if (cartContext.totalQuantity < min || cartContext.totalQuantity > max) return false;
        }
        break;
      }
      default:
        break;
    }
  }

  return true;
}
