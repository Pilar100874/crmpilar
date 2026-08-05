import { supabase } from "@/integrations/supabase/client";

export interface ChecklistItem {
  id: string;
  defect_report_id: string;
  plan_id: string | null;
  catalog_item_id: string | null;
  descricao: string;
  criticidade: string | null;
  feito: boolean | null;
  observacao: string | null;
  done_at: string | null;
  done_by: string | null;
  ordem: number;
}

export async function carregarChecklist(defectReportId: string): Promise<ChecklistItem[]> {
  const { data } = await supabase
    .from("cv_maintenance_checklist")
    .select("*")
    .eq("defect_report_id", defectReportId)
    .order("ordem");
  return (data ?? []) as any as ChecklistItem[];
}

export async function carregarChecklistPorOrdens(ids: string[]): Promise<Record<string, ChecklistItem[]>> {
  if (!ids.length) return {};
  const { data } = await supabase
    .from("cv_maintenance_checklist")
    .select("*")
    .in("defect_report_id", ids)
    .order("ordem");
  const out: Record<string, ChecklistItem[]> = {};
  ((data ?? []) as any as ChecklistItem[]).forEach(i => {
    (out[i.defect_report_id] ??= []).push(i);
  });
  return out;
}

/**
 * Salva o checklist informado pelo encarregado.
 * Se algum item ficar como "não feito" (ou sem marcação), a ordem permanece pendente.
 */
export async function salvarChecklist(params: {
  defectReportId: string;
  itens: { id: string; feito: boolean | null; observacao?: string | null }[];
  responsavel: string;
}): Promise<{ todosFeitos: boolean; pendentes: number }> {
  const agora = new Date().toISOString();
  for (const i of params.itens) {
    const { error } = await supabase
      .from("cv_maintenance_checklist")
      .update({
        feito: i.feito,
        observacao: i.observacao ?? null,
        done_at: i.feito === true ? agora : null,
        done_by: i.feito === true ? params.responsavel : null,
      })
      .eq("id", i.id);
    if (error) throw error;
  }
  const pendentes = params.itens.filter(i => i.feito !== true).length;
  return { todosFeitos: pendentes === 0, pendentes };
}
