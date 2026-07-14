import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimento";

export interface WhatsappSessionOption {
  id: string;
  session_name: string;
  phone_number: string | null;
  status: string;
}

export async function fetchWhatsappSessions(
  estabelecimentoId?: string | null
): Promise<WhatsappSessionOption[]> {
  let estabId = estabelecimentoId ?? null;
  if (!estabId) {
    try {
      estabId = await getEstabelecimentoId();
    } catch {
      estabId = null;
    }
  }
  let query = supabase
    .from("whatsapp_sessions")
    .select("id, session_name, phone_number, status")
    .order("session_name");
  if (estabId) query = query.eq("estabelecimento_id", estabId);
  const { data } = await query;
  return (data as any) || [];
}

export interface SessionUsage {
  tipo: string;
  tabela: string;
  id: string;
  nome: string;
}

const WORKFLOW_TABLES: Array<{ tabela: string; tipo: string; nomeCol: string }> = [
  { tabela: "bot_flows", tipo: "Bot / Fluxo de atendimento", nomeCol: "name" },
  { tabela: "omnichannel_flows", tipo: "Fluxo Omnichannel", nomeCol: "nome" },
  { tabela: "logistica_automacoes", tipo: "Automação da Logística", nomeCol: "nome" },
  { tabela: "automacoes_vendas", tipo: "Automação de Vendas", nomeCol: "nome" },
  { tabela: "ai_studio_workflows", tipo: "Workflow do AI Studio", nomeCol: "name" },
];

/**
 * Escaneia todas as tabelas de workflows procurando por referências (em texto)
 * à sessão de WhatsApp informada. Como flow_data é JSON, casting simples para texto
 * e ilike '%<id>%' é a maneira mais confiável de detectar qualquer uso.
 */
export async function checkWhatsappSessionUsage(
  sessionId: string,
  extraNeedle?: string | null
): Promise<SessionUsage[]> {
  const needles = [sessionId, extraNeedle].filter(Boolean) as string[];
  const usages: SessionUsage[] = [];

  for (const { tabela, tipo, nomeCol } of WORKFLOW_TABLES) {
    try {
      const { data } = await (supabase as any)
        .from(tabela)
        .select(`id, ${nomeCol}, flow_data`);
      const rows = (data as any[]) || [];
      for (const r of rows) {
        let hay = "";
        try { hay = JSON.stringify(r.flow_data ?? ""); } catch { hay = ""; }
        if (!hay) continue;
        if (needles.some((n) => hay.includes(n))) {
          usages.push({
            tipo,
            tabela,
            id: r.id,
            nome: (r as any)[nomeCol] || "(sem nome)",
          });
        }
      }
    } catch (e) {
      // tabela indisponível ou sem coluna flow_data: ignora
    }
  }

  return usages;
}
