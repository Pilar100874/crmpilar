import { supabase } from "@/integrations/supabase/client";
import type { PlanoTipo } from "./manutencao";

export interface CatalogItem {
  id: string;
  estabelecimento_id: string | null;
  codigo: string | null;
  tipo_veiculo: string;
  sistema: string;
  componente: string;
  acao: string;
  interval_principal: number | null;
  interval_days: number | null;
  regra: string;
  tol_principal: number;
  tol_days: number;
  criticidade: string;
  fabricante: string | null;
  observacoes: string | null;
  pecas: string | null;
  no_roteiro: boolean;
  ativo: boolean;
}

export const CRITICIDADES = ["Crítica", "Alta", "Média", "Baixa"] as const;

export const nomeItem = (i: Pick<CatalogItem, "componente" | "acao">) =>
  `${i.componente} — ${i.acao}`.toUpperCase();

/** Converte a regra de vencimento da biblioteca no tipo usado no plano do veículo. */
export function tipoDoItem(i: CatalogItem): PlanoTipo {
  const temPrincipal = !!i.interval_principal;
  const temDias = !!i.interval_days;
  if (temPrincipal && temDias) return "ambos";
  if (temDias) return "dias";
  return "km";
}

export async function listarCatalogo(): Promise<CatalogItem[]> {
  const { data, error } = await supabase
    .from("cv_maintenance_catalog")
    .select("*")
    .order("tipo_veiculo")
    .order("sistema")
    .order("componente");
  if (error) throw error;
  return (data ?? []) as any as CatalogItem[];
}

export async function listarTiposFrota(): Promise<string[]> {
  const { data } = await supabase.from("cv_maintenance_catalog").select("tipo_veiculo");
  return Array.from(new Set((data ?? []).map((r: any) => r.tipo_veiculo as string))).sort();
}

/** Itens do roteiro (vindos da biblioteca), incluindo os adicionados avulsos. */
export const ORIGENS_ROTEIRO = ["catalogo", "catalogo_avulso"];

/** Adiciona itens avulsos da biblioteca ao veículo (não são removidos pela sincronização). */
export async function adicionarItensRoteiro(
  vehicle: { id: string; estabelecimento_id: string | null; current_km: number },
  itens: CatalogItem[],
): Promise<number> {
  if (!itens.length) return 0;
  const registros = itens.map(i => ({
    vehicle_id: vehicle.id,
    estabelecimento_id: vehicle.estabelecimento_id,
    catalog_item_id: i.id,
    origem: "catalogo_avulso",
    name: nomeItem(i),
    tipo: tipoDoItem(i),
    interval_km: i.interval_principal,
    interval_days: i.interval_days,
    last_done_km: vehicle.current_km ?? 0,
    last_done_at: new Date().toISOString(),
    alert_km_antecedencia: i.tol_principal ?? 0,
    alert_days_antecedencia: i.tol_days ?? 0,
    pecas: i.pecas ?? null,
    active: true,
  }));
  const { error } = await supabase.from("cv_maintenance_plans").insert(registros as any);
  if (error) throw error;
  return registros.length;
}

/**
 * Cria/atualiza os planos do veículo a partir dos itens da biblioteca marcados
 * como parte do roteiro padrão do tipo de frota do veículo.
 */
export async function sincronizarRoteiro(vehicle: {
  id: string;
  estabelecimento_id: string | null;
  current_km: number;
  fleet_type?: string | null;
}): Promise<{ criados: number; removidos: number }> {
  if (!vehicle.fleet_type) throw new Error("Defina o tipo de frota do veículo antes de aplicar o roteiro padrão.");

  const { data: itens } = await supabase
    .from("cv_maintenance_catalog")
    .select("*")
    .eq("tipo_veiculo", vehicle.fleet_type)
    .eq("ativo", true)
    .eq("no_roteiro", true);

  const lista = (itens ?? []) as any as CatalogItem[];

  // itens avulsos já vinculados não devem ser duplicados nem removidos
  const { data: avulsos } = await supabase
    .from("cv_maintenance_plans")
    .select("catalog_item_id")
    .eq("vehicle_id", vehicle.id)
    .eq("origem", "catalogo_avulso");
  const idsAvulsos = new Set((avulsos ?? []).map((p: any) => p.catalog_item_id).filter(Boolean));

  const { data: existentes } = await supabase
    .from("cv_maintenance_plans")
    .select("id, catalog_item_id")
    .eq("vehicle_id", vehicle.id)
    .eq("origem", "catalogo");

  const atuais = (existentes ?? []) as any[];
  const mapAtuais = new Map(atuais.filter(p => p.catalog_item_id).map(p => [p.catalog_item_id as string, p.id as string]));

  const novos = lista.filter(i => !mapAtuais.has(i.id) && !idsAvulsos.has(i.id));

  if (novos.length) {
    const registros = novos.map(i => ({
      vehicle_id: vehicle.id,
      estabelecimento_id: vehicle.estabelecimento_id,
      catalog_item_id: i.id,
      origem: "catalogo",
      name: nomeItem(i),
      tipo: tipoDoItem(i),
      interval_km: i.interval_principal,
      interval_days: i.interval_days,
      last_done_km: vehicle.current_km ?? 0,
      last_done_at: new Date().toISOString(),
      alert_km_antecedencia: i.tol_principal ?? 0,
      alert_days_antecedencia: i.tol_days ?? 0,
      pecas: i.pecas ?? null,
      active: true,
    }));
    const { error } = await supabase.from("cv_maintenance_plans").insert(registros as any);
    if (error) throw error;
  }

  // remove planos vindos da biblioteca que saíram do roteiro
  const idsRoteiro = new Set(lista.map(i => i.id));
  const obsoletos = atuais.filter(p => !p.catalog_item_id || !idsRoteiro.has(p.catalog_item_id)).map(p => p.id);
  if (obsoletos.length) {
    await supabase.from("cv_maintenance_plans").delete().in("id", obsoletos);
  }

  return { criados: novos.length, removidos: obsoletos.length };
}
