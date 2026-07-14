import { supabase } from "@/integrations/supabase/client";

export interface MotoristaAtual {
  nome: string;
  telefone: string | null;
  exit_time: string;
}

/**
 * Given a list of Logística veiculo ids, returns a map veiculoId -> driver
 * currently or most recently driving that vehicle at reference date.
 *
 * The link is: cv_vehicles.veiculo_id = logisticaVeiculoId, and the driver comes
 * from the most recent cv_vehicle_movements row for that cv_vehicle whose
 * exit_time <= referenceAt AND (entry_time is null OR entry_time >= referenceAt).
 * Fallback: latest movement with exit_time <= referenceAt.
 */
export async function fetchMotoristasAtuais(
  logisticaVeiculoIds: string[],
  referenceAt: Date = new Date()
): Promise<Record<string, MotoristaAtual | null>> {
  const out: Record<string, MotoristaAtual | null> = {};
  if (!logisticaVeiculoIds.length) return out;

  // Map cv_vehicle -> logistica veiculo
  const { data: cvvs } = await (supabase as any)
    .from("cv_vehicles")
    .select("id, veiculo_id")
    .in("veiculo_id", logisticaVeiculoIds);
  const cvvList = (cvvs ?? []) as Array<{ id: string; veiculo_id: string }>;
  if (!cvvList.length) return out;

  const cvvIds = cvvList.map(v => v.id);
  const refIso = referenceAt.toISOString();

  const { data: moves } = await supabase
    .from("cv_vehicle_movements")
    .select("vehicle_id, driver_id, exit_time, entry_time")
    .in("vehicle_id", cvvIds)
    .lte("exit_time", refIso)
    .order("exit_time", { ascending: false });

  const driverIds = new Set<string>();
  const chosen: Record<string, { driver_id: string; exit_time: string }> = {};
  for (const m of (moves ?? []) as any[]) {
    if (chosen[m.vehicle_id]) continue;
    // Prefer movement that "covers" the reference (still out or returned after ref)
    const stillCovers = !m.entry_time || new Date(m.entry_time) >= referenceAt;
    if (stillCovers || !chosen[m.vehicle_id]) {
      chosen[m.vehicle_id] = { driver_id: m.driver_id, exit_time: m.exit_time };
      driverIds.add(m.driver_id);
    }
  }

  if (!driverIds.size) return out;
  const { data: drivers } = await supabase
    .from("cv_drivers")
    .select("id, name, phone")
    .in("id", Array.from(driverIds));
  const driverMap = new Map<string, { name: string; phone: string | null }>(
    (drivers ?? []).map((d: any) => [d.id, { name: d.name, phone: d.phone ?? null }])
  );

  for (const cvv of cvvList) {
    const pick = chosen[cvv.id];
    if (!pick) { out[cvv.veiculo_id] = null; continue; }
    const d = driverMap.get(pick.driver_id);
    out[cvv.veiculo_id] = d
      ? { nome: d.name, telefone: d.phone, exit_time: pick.exit_time }
      : null;
  }
  return out;
}

export function formatWhatsappNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return digits.length <= 11 ? `55${digits}` : digits;
}
