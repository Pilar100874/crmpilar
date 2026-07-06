// Verifica, para cada visita pendente do dia, se existe rastro de presença
// dentro do raio/tempo definidos pela regra de monitoramento aplicável.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Ocorrencia {
  id: string;
  estabelecimento_id: string;
  programacao_id: string;
  usuario_id: string | null;
  data_prevista: string;
  janela_inicio: string;
  janela_fim: string;
  status: string;
}

interface Programacao {
  id: string;
  lat: number | null;
  lng: number | null;
  responsavel_tipo: string;
  filial_id: string | null;
  regra_monitoramento_id: string | null;
}

interface Regra {
  id: string;
  fonte_localizacao: "veiculo" | "celular" | "ambos";
  raio_metros: number;
  tempo_minimo_min: number;
  exigir_janela_horario: boolean;
  escopo: string;
  usuario_id: string | null;
  filial_id: string | null;
  ativa: boolean;
}

function haversine(a: [number, number], b: [number, number]) {
  const R = 6371000;
  const [lat1, lng1] = a; const [lat2, lng2] = b;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const hoje = new Date().toISOString().slice(0, 10);
  const agora = new Date();

  const { data: ocorrencias, error } = await supabase
    .from("visita_ocorrencias")
    .select("*")
    .eq("data_prevista", hoje)
    .eq("status", "pendente");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const progIds = [...new Set((ocorrencias as Ocorrencia[]).map(o => o.programacao_id))];
  if (progIds.length === 0) {
    return new Response(JSON.stringify({ ok: true, verificadas: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: programacoes } = await supabase
    .from("visita_programacoes")
    .select("id, lat, lng, responsavel_tipo, filial_id, regra_monitoramento_id")
    .in("id", progIds);
  const progMap = new Map<string, Programacao>((programacoes || []).map((p: any) => [p.id, p as Programacao]));

  // Carrega regras uma vez
  const estabIds = [...new Set((ocorrencias as Ocorrencia[]).map(o => o.estabelecimento_id))];
  const { data: regras } = await supabase
    .from("visita_regras_monitoramento")
    .select("*")
    .in("estabelecimento_id", estabIds)
    .eq("ativa", true);
  const regrasMap = new Map<string, Regra>((regras || []).map((r: any) => [r.id, r as Regra]));
  const regrasList = (regras || []) as Regra[];

  function resolveRegra(prog: Programacao, ocor: Ocorrencia): Regra | null {
    if (prog.regra_monitoramento_id) {
      const r = regrasMap.get(prog.regra_monitoramento_id);
      if (r?.ativa) return r;
    }
    if (ocor.usuario_id) {
      const r = regrasList.find(r => r.escopo === "usuario" && r.usuario_id === ocor.usuario_id);
      if (r) return r;
    }
    if (prog.filial_id) {
      const r = regrasList.find(r => r.escopo === "filial" && r.filial_id === prog.filial_id);
      if (r) return r;
    }
    return regrasList.find(r => r.escopo === "global") ?? null;
  }

  let verificadas = 0;
  let realizadas = 0;

  for (const ocor of ocorrencias as Ocorrencia[]) {
    const prog = progMap.get(ocor.programacao_id);
    if (!prog || prog.lat == null || prog.lng == null) continue;

    const regra = resolveRegra(prog, ocor);
    if (!regra) continue;

    const janelaIni = new Date(`${ocor.data_prevista}T${ocor.janela_inicio}`);
    const janelaFim = new Date(`${ocor.data_prevista}T${ocor.janela_fim}`);
    const rangeStart = regra.exigir_janela_horario ? janelaIni : new Date(`${ocor.data_prevista}T00:00:00`);
    const rangeEnd = regra.exigir_janela_horario ? janelaFim : new Date(`${ocor.data_prevista}T23:59:59`);

    // Busca posições candidatas
    const candidatos: Array<{ lat: number; lng: number; data_hora: string; fonte: "veiculo" | "celular"; veiculo_id?: string | null; usuario_id?: string | null }> = [];

    if (regra.fonte_localizacao === "celular" || regra.fonte_localizacao === "ambos") {
      let q = supabase.from("usuario_posicoes")
        .select("usuario_id,lat,lng,data_hora")
        .eq("estabelecimento_id", ocor.estabelecimento_id)
        .gte("data_hora", rangeStart.toISOString())
        .lte("data_hora", rangeEnd.toISOString());
      if (ocor.usuario_id) q = q.eq("usuario_id", ocor.usuario_id);
      const { data: pos } = await q;
      for (const p of pos || []) candidatos.push({ ...p, fonte: "celular" });
    }

    if (regra.fonte_localizacao === "veiculo" || regra.fonte_localizacao === "ambos") {
      // Busca posições do estabelecimento no período; sem vínculo veículo↔usuário
      // simples nesta versão, considera todas as posições de veículos do estab.
      const { data: veiculos } = await supabase
        .from("veiculos").select("id").eq("estabelecimento_id", ocor.estabelecimento_id);
      const vids = (veiculos || []).map((v: any) => v.id);
      if (vids.length > 0) {
        const { data: pos } = await supabase
          .from("veiculo_posicoes")
          .select("veiculo_id,lat,lng,data_hora")
          .in("veiculo_id", vids)
          .gte("data_hora", rangeStart.toISOString())
          .lte("data_hora", rangeEnd.toISOString());
        for (const p of pos || []) candidatos.push({ ...p, fonte: "veiculo" });
      }
    }

    // Ordena por data e procura permanência contínua dentro do raio
    candidatos.sort((a, b) => a.data_hora.localeCompare(b.data_hora));

    let dentroDesde: Date | null = null;
    let minDist = Number.POSITIVE_INFINITY;
    let hit: { chegada: Date; saida: Date; fonte: "veiculo" | "celular"; veiculo_id?: string | null; lat: number; lng: number } | null = null;

    const alvoLat = prog.lat as number;
    const alvoLng = prog.lng as number;

    for (const c of candidatos) {
      const d = haversine([c.lat, c.lng], [alvoLat, alvoLng]);
      if (d <= regra.raio_metros) {
        if (dentroDesde == null) dentroDesde = new Date(c.data_hora);
        const permanencia = (new Date(c.data_hora).getTime() - dentroDesde.getTime()) / 60000;
        if (d < minDist) minDist = d;
        if (permanencia >= regra.tempo_minimo_min) {
          hit = {
            chegada: dentroDesde,
            saida: new Date(c.data_hora),
            fonte: c.fonte,
            veiculo_id: (c as any).veiculo_id ?? null,
            lat: c.lat, lng: c.lng,
          };
        }
      } else {
        if (hit) break; // já cumpriu, sai
        dentroDesde = null;
      }
    }

    verificadas++;
    if (hit) {
      const dentroJanela = hit.chegada >= janelaIni && hit.chegada <= janelaFim;
      const status = dentroJanela ? "realizada" : "fora_horario";
      const dur = Math.round((hit.saida.getTime() - hit.chegada.getTime()) / 60000);
      await supabase.from("visita_ocorrencias").update({
        status,
        verificada_em: new Date().toISOString(),
        hora_chegada: hit.chegada.toISOString(),
        hora_saida: hit.saida.toISOString(),
        duracao_min: dur,
        fonte_deteccao: hit.fonte,
        veiculo_id: hit.veiculo_id,
        distancia_metros: minDist,
        lat_registro: hit.lat,
        lng_registro: hit.lng,
        observacao_auto: dentroJanela ? "Presença detectada dentro da janela" : "Presença detectada fora da janela",
      }).eq("id", ocor.id);
      realizadas++;
    } else if (agora > janelaFim) {
      // Janela encerrada e nada detectado
      await supabase.from("visita_ocorrencias").update({
        status: "nao_realizada",
        verificada_em: new Date().toISOString(),
        observacao_auto: "Janela encerrada sem detecção de presença",
      }).eq("id", ocor.id);
    }
  }

  return new Response(JSON.stringify({ ok: true, verificadas, realizadas }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
