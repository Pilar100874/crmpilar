/**
 * Engine de execução das automações de Ads.
 *
 * Percorre o flow visual (nodes/edges) a partir dos gatilhos (trigger_*),
 * avalia condições (condition_*) com base em métricas fornecidas e executa
 * ações reais (pause/resume/orçamento/webhook/e-mail/whatsapp/push/sms/etc).
 *
 * A avaliação de gatilhos e a aplicação real em plataformas de mídia (Meta,
 * Google, TikTok…) ficam por conta de quem chamar este engine — passe apenas
 * as automações cujos gatilhos já dispararam e as métricas atuais.
 */

import { supabase } from "@/integrations/supabase/client";
import { AdsFlowData } from "@/types/adsFlow";
import { executarBlocoPush } from "@/lib/pushExecutor";
import { executarBlocoSms } from "@/lib/smsExecutor";
import {
  executarBlocoWebhook,
  executarBlocoEmail,
  executarBlocoWhatsapp,
  executarBlocoMensagemInterna,
  executarBlocoAvisoSistema,
} from "@/lib/workflowActionsExecutor";

export interface AdsMetrics {
  roas?: number;
  spend?: number;
  cpc?: number;
  ctr?: number;
  conversions?: number;
  impressions?: number;
  frequency?: number;
  quality_score?: number;
  budget_remaining?: number;
  position?: number;
  platform?: string;
  campaign_id?: string;
  campaign_name?: string;
  device?: string;
  location?: string;
  day_of_week?: number;
  hour?: number;
  [k: string]: any;
}

export interface AdsAutomacao {
  id: string;
  nome: string;
  ativo: boolean;
  flow_data: AdsFlowData;
  estabelecimento_id?: string;
}

export interface AdsExecResult {
  automacao_id: string;
  automacao_nome: string;
  acoes: Array<{ tipo: string; ok: boolean; detalhes?: any }>;
}

const cmp = (v: number, op: string, target: number): boolean => {
  switch (op) {
    case ">": return v > target;
    case ">=": return v >= target;
    case "<": return v < target;
    case "<=": return v <= target;
    case "==": case "=": return v === target;
    case "!=": return v !== target;
    default: return false;
  }
};

function evalTrigger(type: string, cfg: any, m: AdsMetrics): boolean {
  const op = cfg.operator || cfg.op || ">=";
  const val = Number(cfg.value ?? cfg.threshold ?? 0);
  switch (type) {
    case "trigger_roas": return m.roas != null && cmp(m.roas, op, val);
    case "trigger_spend": return m.spend != null && cmp(m.spend, op, val);
    case "trigger_cpc": return m.cpc != null && cmp(m.cpc, op, val);
    case "trigger_ctr": return m.ctr != null && cmp(m.ctr, op, val);
    case "trigger_conversions": return m.conversions != null && cmp(m.conversions, op, val);
    case "trigger_impressions": return m.impressions != null && cmp(m.impressions, op, val);
    case "trigger_frequency": return m.frequency != null && cmp(m.frequency, op, val);
    case "trigger_quality_score": return m.quality_score != null && cmp(m.quality_score, op, val);
    case "trigger_budget_depleted": return (m.budget_remaining ?? 0) <= (cfg.threshold ?? 0);
    case "trigger_position": return m.position != null && cmp(m.position, op, val);
    case "trigger_schedule": return true; // agendamento é externo
    default: return true;
  }
}

function evalCondition(type: string, cfg: any, m: AdsMetrics): boolean {
  switch (type) {
    case "condition_platform":
      return !cfg.platform || cfg.platform === m.platform;
    case "condition_campaign":
      return !cfg.campaign_id || cfg.campaign_id === m.campaign_id;
    case "condition_device":
      return !cfg.device || cfg.device === m.device;
    case "condition_location":
      return !cfg.location || cfg.location === m.location;
    case "condition_day_of_week": {
      const days: number[] = cfg.days || [];
      return days.length === 0 || (m.day_of_week != null && days.includes(m.day_of_week));
    }
    case "condition_time": {
      if (m.hour == null) return true;
      const from = Number(cfg.from ?? 0), to = Number(cfg.to ?? 23);
      return m.hour >= from && m.hour <= to;
    }
    case "condition_metric": {
      const metric = cfg.metric as keyof AdsMetrics;
      const v = Number(m[metric]);
      return !isNaN(v) && cmp(v, cfg.operator || ">=", Number(cfg.value ?? 0));
    }
    case "condition_budget_remaining":
      return m.budget_remaining != null && cmp(m.budget_remaining, cfg.operator || "<=", Number(cfg.value ?? 0));
    default: return true;
  }
}

async function updateCampaignStatus(campaignId: string | undefined, status: string, estabId?: string) {
  if (!campaignId) return { ok: false, erro: "sem campaign_id" };
  try {
    const { error } = await supabase
      .from("ads_campanhas" as any)
      .update({ status, atualizado_em: new Date().toISOString() })
      .eq("id", campaignId)
      .eq("estabelecimento_id", estabId ?? "");
    if (error) return { ok: false, erro: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, erro: e?.message || String(e) };
  }
}

async function executeAction(type: string, cfg: any, ctx: {
  automacao: AdsAutomacao; metrics: AdsMetrics;
}): Promise<{ ok: boolean; detalhes?: any }> {
  const { automacao, metrics } = ctx;
  const wfCtx = {
    variaveis: { metrics, automacao: { id: automacao.id, nome: automacao.nome } },
    estabelecimento_id: automacao.estabelecimento_id,
    workflow_tipo: "ads",
    origem: "ads_automacao",
  };
  const campaignId = cfg.campaign_id || metrics.campaign_id;
  switch (type) {
    case "action_pause":
      return updateCampaignStatus(campaignId, "paused", automacao.estabelecimento_id);
    case "action_resume":
    case "action_activate":
      return updateCampaignStatus(campaignId, "active", automacao.estabelecimento_id);
    case "action_archive":
      return updateCampaignStatus(campaignId, "archived", automacao.estabelecimento_id);
    case "action_budget_decrease":
    case "action_budget_increase":
    case "action_bid_adjust":
    case "action_bid_device":
    case "action_schedule_change":
    case "action_duplicate":
    case "action_create_report":
      // Log/marker only — aplicar em plataforma externa fica a cargo do integrador
      return { ok: true, detalhes: { pendente_integracao_externa: true, cfg } };
    case "action_notify":
    case "action_slack":
      return executarBlocoAvisoSistema(
        { titulo: cfg.titulo || `[Ads] ${automacao.nome}`, mensagem: cfg.mensagem || cfg.message || "", tipo: "info", destinatarios_tipo: cfg.destinatarios_tipo || "todos" },
        wfCtx
      );
    case "action_webhook":
      return executarBlocoWebhook(cfg, wfCtx);
    case "action_email":
      return executarBlocoEmail(cfg, wfCtx);
    case "action_aviso_sistema":
      return executarBlocoAvisoSistema(cfg, wfCtx);
    case "action_mensagem_interna":
      return executarBlocoMensagemInterna(cfg, wfCtx);
    case "disparar_push":
      return executarBlocoPush(cfg as any, { ...wfCtx, workflow_id: automacao.id });
    case "enviar_sms":
      return executarBlocoSms(cfg as any, wfCtx);
    default:
      return { ok: false, detalhes: { motivo: `tipo não implementado: ${type}` } };
  }
}

/**
 * Executa uma automação completa contra métricas atuais.
 * Percorre a partir dos triggers válidos, respeitando condições e edges.
 */
export async function executarAdsAutomacao(
  automacao: AdsAutomacao,
  metrics: AdsMetrics
): Promise<AdsExecResult> {
  const result: AdsExecResult = {
    automacao_id: automacao.id,
    automacao_nome: automacao.nome,
    acoes: [],
  };
  if (!automacao.ativo) return result;
  const { nodes = [], edges = [] } = automacao.flow_data || ({} as AdsFlowData);
  if (!nodes.length) return result;

  const byId = new Map<string, any>(nodes.map((n: any) => [n.id, n]));
  const outgoing = (id: string) =>
    edges.filter((e: any) => e.source === id).map((e: any) => byId.get(e.target)).filter(Boolean);

  const visited = new Set<string>();
  const stack: any[] = [];

  // Começa por todos triggers válidos
  for (const node of nodes) {
    const t = node.data?.type as string;
    if (t?.startsWith("trigger_") && evalTrigger(t, node.data?.config || {}, metrics)) {
      stack.push(node);
    }
  }

  while (stack.length) {
    const node = stack.pop();
    if (!node || visited.has(node.id)) continue;
    visited.add(node.id);
    const type = node.data?.type as string;
    const cfg = node.data?.config || {};

    if (type?.startsWith("condition_")) {
      if (!evalCondition(type, cfg, metrics)) continue;
    } else if (type?.startsWith("action_") || type === "disparar_push" || type === "enviar_sms") {
      try {
        const r = await executeAction(type, cfg, { automacao, metrics });
        result.acoes.push({ tipo: type, ok: !!r.ok, detalhes: r.detalhes });
      } catch (e: any) {
        result.acoes.push({ tipo: type, ok: false, detalhes: e?.message || String(e) });
      }
    }

    for (const next of outgoing(node.id)) stack.push(next);
  }

  return result;
}

/**
 * Roda todas as automações ativas de um estabelecimento contra as métricas dadas.
 */
export async function executarAdsAutomacoes(
  estabelecimentoId: string,
  metrics: AdsMetrics
): Promise<AdsExecResult[]> {
  const { data, error } = await supabase
    .from("ads_automacoes")
    .select("id, nome, ativo, flow_data, estabelecimento_id")
    .eq("estabelecimento_id", estabelecimentoId)
    .eq("ativo", true);
  if (error) {
    console.error("[ads-engine] erro ao buscar automações:", error);
    return [];
  }
  const out: AdsExecResult[] = [];
  for (const a of data || []) {
    try {
      out.push(await executarAdsAutomacao(a as any, metrics));
    } catch (e) {
      console.error("[ads-engine] falha em automação", a.id, e);
    }
  }
  return out;
}
