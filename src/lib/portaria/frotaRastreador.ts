// Posição real da frota, direto do rastreador: diz quem está na estrada e quem
// está no pátio (não depende de alguém ter registrado saída/entrada na portaria).
import { supabase } from "@/integrations/supabase/client";

export type StatusFrota = "estrada" | "patio" | "parado" | "offline";

export interface FrotaPosicao {
  veiculoId: string;
  cvVehicleId: string | null;
  placa: string;
  descricao: string | null;
  unidadeId: string | null;
  unidadeNome: string | null;
  lat: number | null;
  lng: number | null;
  velocidade: number;
  dataHora: string | null;
  status: StatusFrota;
  distanciaKm: number | null;
  motorista: string | null;
  whatsapp: string | null;
  desde: string | null;
}

/** Raio (km) em volta da unidade considerado "dentro do pátio". */
const RAIO_PATIO_KM = 0.4;
/** Sem posição nova nesse tempo (min) o rastreador é considerado offline. */
const MIN_OFFLINE = 90;
/** Acima dessa velocidade (km/h) o veículo é considerado em movimento. */
const VEL_MOVIMENTO = 3;

export function distanciaKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const rad = (v: number) => (v * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const rotuloStatusFrota: Record<StatusFrota, string> = {
  estrada: "Na estrada",
  patio: "No pátio",
  parado: "Parado fora do pátio",
  offline: "Sem sinal",
};

export async function carregarFrotaPosicao(unidadeId?: string | null): Promise<FrotaPosicao[]> {
  let q = supabase
    .from("veiculos")
    .select("id, placa, descricao, motorista, unidade_id")
    .eq("ativo", true);
  if (unidadeId) q = q.eq("unidade_id", unidadeId);
  const [veic, unid] = await Promise.all([
    q.order("placa"),
    supabase.from("unidades").select("id, nome, latitude, longitude"),
  ]);

  const veiculos = (veic.data ?? []) as any[];
  if (!veiculos.length) return [];
  const ids = veiculos.map((v) => v.id);

  const desde = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const [pos, cv, movs] = await Promise.all([
    supabase
      .from("veiculo_posicoes")
      .select("veiculo_id, lat, lng, velocidade, data_hora")
      .in("veiculo_id", ids)
      .gte("data_hora", desde)
      .order("data_hora", { ascending: false })
      .limit(5000),
    supabase.from("cv_vehicles").select("id, veiculo_id, plate").not("veiculo_id", "is", null),
    supabase
      .from("cv_vehicle_movements")
      .select("id, vehicle_id, exit_time, helper_name, cv_drivers(name, phone)")
      .eq("status", "out"),
  ]);

  const unidades = new Map<string, any>(((unid.data ?? []) as any[]).map((u) => [u.id, u]));
  const ultima = new Map<string, any>();
  ((pos.data ?? []) as any[]).forEach((p) => {
    if (!ultima.has(p.veiculo_id)) ultima.set(p.veiculo_id, p);
  });

  const cvPorVeiculo = new Map<string, any>();
  ((cv.data ?? []) as any[]).forEach((c) => cvPorVeiculo.set(c.veiculo_id, c));
  const movPorCv = new Map<string, any>();
  ((movs.data ?? []) as any[]).forEach((m) => {
    if (!movPorCv.has(m.vehicle_id)) movPorCv.set(m.vehicle_id, m);
  });

  const agora = Date.now();

  const todasUnidades = ((unid.data ?? []) as any[]).filter(
    (u) => u.latitude != null && u.longitude != null,
  );

  return veiculos.map((v) => {
    const p = ultima.get(v.id);
    const u = v.unidade_id ? unidades.get(v.unidade_id) : null;
    const vel = Number(p?.velocidade ?? 0);
    const idadeMin = p?.data_hora ? (agora - new Date(p.data_hora).getTime()) / 60000 : Infinity;

    let dist: number | null = null;
    if (p && u?.latitude != null && u?.longitude != null) {
      dist = distanciaKm(Number(p.lat), Number(p.lng), Number(u.latitude), Number(u.longitude));
    }

    // Pátio = perto da própria unidade OU de qualquer outra unidade da empresa.
    let distQualquer: number | null = null;
    if (p) {
      for (const un of todasUnidades) {
        const d = distanciaKm(Number(p.lat), Number(p.lng), Number(un.latitude), Number(un.longitude));
        if (distQualquer == null || d < distQualquer) distQualquer = d;
      }
    }

    let status: StatusFrota;
    if (!p || idadeMin > MIN_OFFLINE) status = "offline";
    else if (distQualquer != null && distQualquer <= RAIO_PATIO_KM) status = "patio";
    else if (vel > VEL_MOVIMENTO) status = "estrada";
    else status = distQualquer == null ? "patio" : "parado";


    const cvv = cvPorVeiculo.get(v.id);
    const mov = cvv ? movPorCv.get(cvv.id) : null;

    return {
      veiculoId: v.id,
      cvVehicleId: cvv?.id ?? null,
      placa: v.placa,
      descricao: v.descricao ?? null,
      unidadeId: v.unidade_id ?? null,
      unidadeNome: u?.nome ?? null,
      lat: p ? Number(p.lat) : null,
      lng: p ? Number(p.lng) : null,
      velocidade: Math.round(vel),
      dataHora: p?.data_hora ?? null,
      status,
      distanciaKm: dist,
      motorista: mov?.cv_drivers?.name ?? v.motorista ?? null,
      whatsapp: mov?.cv_drivers?.phone ?? null,
      desde: mov?.exit_time ?? p?.data_hora ?? null,
    } as FrotaPosicao;
  });
}
