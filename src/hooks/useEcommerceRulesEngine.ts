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

/**
 * Motor de regras do e-commerce.
 * Lê regras ativas da tabela ecommerce_rules, interpreta o fluxo (nodes/edges)
 * e retorna as ações que devem ser disparadas.
 * 
 * Por enquanto, avalia apenas ações que não dependem de carrinho/cliente
 * (popup, banner, mensagem, destaque) — ou seja, ações "incondicionais"
 * ou condicionadas apenas por período/horário/dia da semana.
 */
export function useEcommerceRulesEngine() {
  const [popupActions, setPopupActions] = useState<(RuleAction & { ruleId: string; ruleName: string })[]>([]);
  const [bannerActions, setBannerActions] = useState<(RuleAction & { ruleId: string; ruleName: string })[]>([]);
  const [vitrineActions, setVitrineActions] = useState<(RuleAction & { ruleId: string; ruleName: string })[]>([]);
  const [freteActions, setFreteActions] = useState<(RuleAction & { ruleId: string; ruleName: string })[]>([]);
  const [discountActions, setDiscountActions] = useState<(RuleAction & { ruleId: string; ruleName: string })[]>([]);
  const [paymentActions, setPaymentActions] = useState<(RuleAction & { ruleId: string; ruleName: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAndProcessRules();
  }, []);

  const loadAndProcessRules = async () => {
    try {
      const estabId = localStorage.getItem("estabelecimentoId");
      if (!estabId) { setLoading(false); return; }

      const now = new Date().toISOString();

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

        // Find all action nodes reachable from start
        const actionNodes = getReachableActions(nodes, edges);

        for (const actionNode of actionNodes) {
          const nodeType = actionNode.data?.type;
          const config = actionNode.data?.config || {};
          const label = actionNode.data?.label || "";

          // Check if any temporal conditions block this rule
          const conditionNodes = getConditionNodesForAction(actionNode, nodes, edges);
          if (!evaluateConditions(conditionNodes)) continue;

          const actionEntry = { type: nodeType, config, label, ruleId: rule.id, ruleName: rule.nome };

          if (nodeType === "acao_popup_promocional") {
            popups.push(actionEntry);
          } else if (nodeType === "acao_banner_promocional") {
            banners.push(actionEntry);
          } else if (nodeType === "acao_destaque_vitrine") {
            vitrines.push(actionEntry);
          } else if (nodeType === "acao_frete_gratis" || nodeType === "acao_desconto_frete" || nodeType === "acao_frete_fixo") {
            fretes.push(actionEntry);
          }
        }
      }

      setPopupActions(popups);
      setBannerActions(banners);
      setVitrineActions(vitrines);
      setFreteActions(fretes);
    } catch (err) {
      console.error("[RulesEngine] Erro:", err);
    } finally {
      setLoading(false);
    }
  };

  return { popupActions, bannerActions, vitrineActions, freteActions, loading };
}

/**
 * Encontra todos os nós de ação alcançáveis a partir do nó "inicio_regra"
 */
function getReachableActions(nodes: any[], edges: any[]): any[] {
  const startNode = nodes.find(n => n.data?.type === "inicio_regra");
  if (!startNode) return [];

  const visited = new Set<string>();
  const queue = [startNode.id];
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
    }

    // Follow edges from current
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
  // Walk backwards from the action to find condition nodes
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
        if (type.startsWith("condicao_")) {
          conditions.push(sourceNode);
        }
        queue.push(sourceNode.id);
      }
    }
  }

  return conditions;
}

/**
 * Avalia condições temporais (período, dia da semana, horário).
 * Condições de carrinho/cliente são ignoradas neste contexto (seriam avaliadas no checkout).
 */
function evaluateConditions(conditionNodes: any[]): boolean {
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
      // Condições de carrinho/cliente são ignoradas aqui (passam automaticamente)
      default:
        break;
    }
  }

  return true;
}
