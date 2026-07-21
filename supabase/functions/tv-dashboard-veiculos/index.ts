import { authenticateDevice, corsHeaders, json, serviceClient } from "../_shared/tv-auth.ts";

const cores = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316",
  "#6366F1", "#14B8A6", "#A855F7", "#84CC16", "#E11D48", "#0EA5E9", "#22C55E", "#FACC15",
];

function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return r * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function statusPorPosicao(posicao: any) {
  if (!posicao?.data_hora) return "offline";
  const minutos = (Date.now() - new Date(posicao.data_hora).getTime()) / 60000;
  if (minutos >= 10) return "offline";
  return Number(posicao.velocidade || 0) > 5 ? "movendo" : "parado";
}

async function motoristasAtuais(sb: any, veiculoIds: string[]) {
  const out: Record<string, any> = {};
  if (!veiculoIds.length) return out;
  const { data: cvVehicles } = await sb.from("cv_vehicles").select("id, veiculo_id").in("veiculo_id", veiculoIds);
  const cvList = cvVehicles || [];
  if (!cvList.length) return out;

  const refIso = new Date().toISOString();
  const { data: moves } = await sb.from("cv_vehicle_movements")
    .select("vehicle_id, driver_id, exit_time, entry_time")
    .in("vehicle_id", cvList.map((v: any) => v.id))
    .lte("exit_time", refIso)
    .order("exit_time", { ascending: false });

  const chosen: Record<string, any> = {};
  const driverIds = new Set<string>();
  for (const m of moves || []) {
    if (chosen[m.vehicle_id]) continue;
    const covers = !m.entry_time || new Date(m.entry_time).getTime() >= Date.now();
    if (covers || !chosen[m.vehicle_id]) {
      chosen[m.vehicle_id] = m;
      if (m.driver_id) driverIds.add(m.driver_id);
    }
  }
  if (!driverIds.size) return out;

  const { data: drivers } = await sb.from("cv_drivers").select("id, name, phone").in("id", Array.from(driverIds));
  const driverMap = new Map((drivers || []).map((d: any) => [d.id, d]));
  for (const cv of cvList) {
    const move = chosen[cv.id];
    const driver = move ? driverMap.get(move.driver_id) : null;
    out[cv.veiculo_id] = driver ? { nome: driver.name, telefone: driver.phone || null, exit_time: move.exit_time } : null;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await authenticateDevice(req);
  if (!auth) return json({ error: "não autenticado" }, 401);

  const sb = serviceClient();
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const { data: veiculos } = await sb.from("veiculos")
    .select("*")
    .eq("estabelecimento_id", auth.estabelecimentoId)
    .eq("ativo", true)
    .order("placa");
  const vehicleList = veiculos || [];
  const ids = vehicleList.map((v: any) => v.id);

  const posicaoMap: Record<string, any> = {};
  const kmRodadosHoje: Record<string, number> = {};
  if (ids.length) {
    const { data: posicoesRecentes } = await sb.from("veiculo_posicoes")
      .select("*")
      .in("veiculo_id", ids)
      .order("data_hora", { ascending: false })
      .limit(Math.max(ids.length * 12, 120));
    for (const p of posicoesRecentes || []) if (!posicaoMap[p.veiculo_id]) posicaoMap[p.veiculo_id] = p;

    const { data: posicoesHoje } = await sb.from("veiculo_posicoes")
      .select("veiculo_id, lat, lng, data_hora")
      .in("veiculo_id", ids)
      .gte("data_hora", hoje.toISOString())
      .order("data_hora", { ascending: true });
    const porVeiculo: Record<string, any[]> = {};
    for (const p of posicoesHoje || []) (porVeiculo[p.veiculo_id] ||= []).push(p);
    for (const id of ids) {
      const pontos = porVeiculo[id] || [];
      let total = 0;
      for (let i = 1; i < pontos.length; i++) total += distanciaKm(pontos[i - 1].lat, pontos[i - 1].lng, pontos[i].lat, pontos[i].lng);
      kmRodadosHoje[id] = Math.round(total * 10) / 10;
    }
  }

  const [{ data: precos }, { data: paradas }, motoristas] = await Promise.all([
    sb.from("combustiveis_precos").select("*").eq("estabelecimento_id", auth.estabelecimentoId).maybeSingle(),
    sb.from("logistica_paradas_marcadas").select("*, veiculo:veiculos(placa, descricao)").eq("estabelecimento_id", auth.estabelecimentoId).eq("ativa", true).order("created_at", { ascending: false }),
    motoristasAtuais(sb, ids),
  ]);

  return json({
    estabelecimento_id: auth.estabelecimentoId,
    precosCombustivel: {
      gasolina: precos?.preco_gasolina || 5.5,
      diesel: precos?.preco_diesel || 5.8,
      etanol: precos?.preco_etanol || 4.2,
    },
    kmRodadosHoje,
    paradasMarcadas: paradas || [],
    veiculos: vehicleList.map((v: any, index: number) => {
      const ultima = posicaoMap[v.id];
      return {
        ...v,
        status: statusPorPosicao(ultima),
        ultima_posicao: ultima,
        ultima_atualizacao: ultima?.data_hora,
        cor: cores[index % cores.length],
        motorista_atual: motoristas[v.id] || null,
      };
    }),
  });
});