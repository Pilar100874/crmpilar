import { supabase } from "@/integrations/supabase/client";

export type PlanoTipo = "km" | "dias" | "ambos";

export interface MaintenancePlan {
  id: string;
  estabelecimento_id: string | null;
  vehicle_id: string;
  name: string;
  tipo: PlanoTipo;
  interval_km: number | null;
  interval_days: number | null;
  last_done_km: number;
  last_done_at: string;
  alert_km_antecedencia: number;
  alert_days_antecedencia: number;
  active: boolean;
  /** Peças/insumos necessários (ex.: filtro de óleo, óleo 15W40) */
  pecas?: string | null;
}

export interface AlertaManutencao {
  plan: MaintenancePlan;
  vencido: boolean;
  proximo: boolean;
  detalhe: string;
  /** Já existe um defeito/avaria aberto para este plano */
  ordemAberta: boolean;
}

const dias = (a: Date, b: Date) => Math.floor((a.getTime() - b.getTime()) / 86400000);

/** Avalia um plano em relação ao KM atual do veículo e à data de hoje. */
export function avaliarPlano(plan: MaintenancePlan, currentKm: number): Omit<AlertaManutencao, "ordemAberta"> {
  const partes: string[] = [];
  let vencido = false;
  let proximo = false;

  if ((plan.tipo === "km" || plan.tipo === "ambos") && plan.interval_km) {
    const alvo = plan.last_done_km + plan.interval_km;
    const restante = alvo - currentKm;
    if (restante <= 0) {
      vencido = true;
      partes.push(`vencido há ${Math.abs(restante).toLocaleString("pt-BR")} km`);
    } else if (restante <= plan.alert_km_antecedencia) {
      proximo = true;
      partes.push(`faltam ${restante.toLocaleString("pt-BR")} km`);
    } else {
      partes.push(`faltam ${restante.toLocaleString("pt-BR")} km`);
    }
  }

  if ((plan.tipo === "dias" || plan.tipo === "ambos") && plan.interval_days) {
    const alvo = new Date(plan.last_done_at);
    alvo.setDate(alvo.getDate() + plan.interval_days);
    const restante = dias(alvo, new Date());
    if (restante <= 0) {
      vencido = true;
      partes.push(`vencido há ${Math.abs(restante)} dia(s)`);
    } else if (restante <= plan.alert_days_antecedencia) {
      proximo = true;
      partes.push(`faltam ${restante} dia(s)`);
    } else {
      partes.push(`faltam ${restante} dia(s)`);
    }
  }

  return { plan, vencido, proximo: proximo && !vencido, detalhe: partes.join(" · ") };
}

/** Carrega planos + defeitos abertos e retorna somente os alertas (vencidos/próximos) por veículo. */
export async function carregarAlertasManutencao(
  vehicles: { id: string; current_km: number }[],
): Promise<Record<string, AlertaManutencao[]>> {
  const ids = vehicles.map((v) => v.id);
  if (ids.length === 0) return {};

  const [{ data: plans }, { data: defects }] = await Promise.all([
    supabase.from("cv_maintenance_plans").select("*").in("vehicle_id", ids).eq("active", true),
    supabase
      .from("cv_defect_reports")
      .select("id, maintenance_plan_id, status")
      .in("vehicle_id", ids)
      .neq("status", "resolved"),
  ]);

  const abertos = new Set(
    ((defects ?? []) as any[]).map((d) => d.maintenance_plan_id).filter(Boolean) as string[],
  );

  // itens de checklist ainda não concluídos também contam como ordem aberta
  const ordensAbertas = ((defects ?? []) as any[]).map((d) => d.id);
  if (ordensAbertas.length) {
    const { data: chk } = await supabase
      .from("cv_maintenance_checklist")
      .select("plan_id, feito")
      .in("defect_report_id", ordensAbertas);
    ((chk ?? []) as any[]).forEach((c) => {
      if (c.plan_id && c.feito !== true) abertos.add(c.plan_id as string);
    });
  }


  const out: Record<string, AlertaManutencao[]> = {};
  for (const v of vehicles) {
    const meus = ((plans ?? []) as any as MaintenancePlan[]).filter((p) => p.vehicle_id === v.id);
    const alertas = meus
      .map((p) => ({ ...avaliarPlano(p, v.current_km ?? 0), ordemAberta: abertos.has(p.id) }))
      .filter((a) => a.vencido || a.proximo);
    if (alertas.length) out[v.id] = alertas;
  }
  return out;
}

/** Gera uma ordem (defeito/avaria) de manutenção preventiva para o encarregado. */
export async function gerarOrdemManutencao(params: {
  plan: MaintenancePlan;
  detalhe: string;
  estabelecimentoId?: string | null;
  driverId?: string | null;
  movementId?: string | null;
  reportedBy?: string | null;
  vehicleKm?: number | null;
}) {
  const { plan, detalhe } = params;
  const { data: existente } = await supabase
    .from("cv_defect_reports")
    .select("id")
    .eq("maintenance_plan_id", plan.id)
    .neq("status", "resolved")
    .maybeSingle();
  if (existente) return { id: existente.id, criado: false };

  const { data, error } = await supabase
    .from("cv_defect_reports")
    .insert({
      vehicle_id: plan.vehicle_id,
      estabelecimento_id: params.estabelecimentoId ?? plan.estabelecimento_id,
      maintenance_plan_id: plan.id,
      driver_id: params.driverId ?? null,
      movement_id: params.movementId ?? null,
      vehicle_km: params.vehicleKm ?? null,
      defect_description: `MANUTENÇÃO PREVENTIVA: ${plan.name} (${detalhe})`,
      reported_by: params.reportedBy ?? "Sistema (plano de manutenção)",
      status: "pending",
    } as any)
    .select("id")
    .single();
  if (error) throw error;

  await supabase.from("cv_maintenance_checklist").insert({
    estabelecimento_id: params.estabelecimentoId ?? plan.estabelecimento_id,
    defect_report_id: data.id,
    plan_id: plan.id,
    descricao: `${plan.name} (${detalhe})`,
    ordem: 0,
  } as any);

  return { id: data.id, criado: true };
}

/**
 * Gera uma única ordem de manutenção preventiva agrupando todos os itens vencidos
 * ou próximos do vencimento, com checklist obrigatório para o encarregado.
 */
export async function gerarOrdemAgrupada(params: {
  vehicleId: string;
  estabelecimentoId?: string | null;
  alertas: AlertaManutencao[];
  driverId?: string | null;
  movementId?: string | null;
  vehicleKm?: number | null;
  reportedBy?: string | null;
}) {
  const pendentes = params.alertas.filter(a => !a.ordemAberta);
  if (pendentes.length === 0) return { criado: false, itens: 0 };

  const estab = params.estabelecimentoId ?? pendentes[0].plan.estabelecimento_id;
  const { data, error } = await supabase
    .from("cv_defect_reports")
    .insert({
      vehicle_id: params.vehicleId,
      estabelecimento_id: estab,
      driver_id: params.driverId ?? null,
      movement_id: params.movementId ?? null,
      vehicle_km: params.vehicleKm ?? null,
      defect_description: `MANUTENÇÃO PREVENTIVA (${pendentes.length} item(ns) do roteiro)`,
      reported_by: params.reportedBy ?? "Sistema (roteiro de manutenção)",
      status: "pending",
    } as any)
    .select("id")
    .single();
  if (error) throw error;

  const itens = pendentes.map((a, idx) => ({
    estabelecimento_id: estab,
    defect_report_id: data.id,
    plan_id: a.plan.id,
    descricao: `${a.plan.name} (${a.detalhe})`,
    ordem: idx,
  }));
  const { error: e2 } = await supabase.from("cv_maintenance_checklist").insert(itens as any);
  if (e2) throw e2;

  return { criado: true, itens: itens.length, id: data.id };
}

