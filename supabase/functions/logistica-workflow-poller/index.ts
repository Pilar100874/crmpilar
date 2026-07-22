import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Admin = ReturnType<typeof createClient>;

/**
 * Poller server-side das automações de logística.
 * Roda a cada 1 min via pg_cron e detecta veículos parados / em excesso de
 * velocidade mesmo sem ninguém logado no sistema.
 *
 * - Persiste os marcadores em `logistica_paradas_marcadas`.
 * - Dispara UMA notificação por transição (via `enviar-notificacao`) para os
 *   admins do estabelecimento — evita spam usando `logistica_workflow_state`.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Carrega automações ativas
    const { data: automacoes } = await admin
      .from("logistica_automacoes")
      .select("id, nome, estabelecimento_id, flow_data")
      .eq("ativo", true);

    if (!automacoes?.length) return json({ ok: true, automacoes: 0 });

    // Agrupa por estabelecimento para carregar veículos 1x cada
    const porEst = new Map<string, typeof automacoes>();
    for (const a of automacoes) {
      if (!a.estabelecimento_id) continue;
      const arr = porEst.get(a.estabelecimento_id) || [];
      arr.push(a);
      porEst.set(a.estabelecimento_id, arr);
    }

    let disparos = 0, markers = 0;

    for (const [estId, automs] of porEst) {
      const veiculos = await carregarVeiculosComPos(admin, estId);
      if (!veiculos.length) continue;

      for (const automacao of automs) {
        const nodes = ((automacao.flow_data as any)?.nodes || []) as any[];
        if (!nodes.length) continue;

        for (const node of nodes) {
          const t = node.data?.type;
          const cfg = node.data?.config || {};

          if (t === "condicao_parado") {
            const tempoMin = Number(cfg.tempo_minutos) || 30;
            for (const v of veiculos) {
              if (!v.pos) continue;
              const parado = (v.pos.velocidade || 0) === 0;
              const minParado = Math.floor((Date.now() - new Date(v.pos.data_hora).getTime()) / 60000);
              if (parado && minParado >= tempoMin) {
                const chave = `parado:${automacao.id}:${v.id}`;
                const jaAtivo = await estadoAtivo(admin, chave);
                if (cfg.marcar_no_mapa) {
                  markers += await upsertMarker(admin, estId, automacao, v, minParado, cfg);
                }
                if (!jaAtivo) {
                  await marcarAtivo(admin, chave, automacao.id, v.id, "parado");
                  await notificarTransicao(admin, estId, automacao.nome, `🅿️ ${v.nome || v.placa || v.id} parado há ${minParado} min`);
                  disparos++;
                }
              } else {
                // condição não mais atendida → limpa estado para permitir novo disparo futuro
                await limparEstado(admin, `parado:${automacao.id}:${v.id}`);
              }
            }
          }

          if (t === "condicao_velocidade") {
            const limite = Number(cfg.velocidade_maxima) || 80;
            for (const v of veiculos) {
              if (!v.pos) continue;
              const vel = v.pos.velocidade || 0;
              if (vel > limite) {
                const chave = `velocidade:${automacao.id}:${v.id}`;
                const jaAtivo = await estadoAtivo(admin, chave);
                if (!jaAtivo) {
                  await marcarAtivo(admin, chave, automacao.id, v.id, "velocidade");
                  await notificarTransicao(admin, estId, automacao.nome, `⚠️ ${v.nome || v.placa || v.id} a ${Math.round(vel)} km/h (limite ${limite})`);
                  disparos++;
                }
              } else {
                await limparEstado(admin, `velocidade:${automacao.id}:${v.id}`);
              }
            }
          }
        }
      }
    }

    return json({ ok: true, disparos, markers });
  } catch (e) {
    console.error("logistica-workflow-poller error", e);
    return json({ error: e instanceof Error ? e.message : "erro" }, 500);
  }
});

async function carregarVeiculosComPos(admin: Admin, estId: string) {
  const { data: veics } = await admin
    .from("veiculos")
    .select("id, placa, nome")
    .eq("estabelecimento_id", estId);
  if (!veics?.length) return [];

  const ids = veics.map((v: any) => v.id);
  const { data: pos } = await admin
    .from("veiculo_posicoes")
    .select("veiculo_id, lat, lng, velocidade, data_hora")
    .in("veiculo_id", ids)
    .order("data_hora", { ascending: false })
    .limit(2000);

  const posMap = new Map<string, any>();
  for (const p of pos || []) {
    if (!posMap.has(p.veiculo_id)) posMap.set(p.veiculo_id, p);
  }
  return veics.map((v: any) => ({ ...v, pos: posMap.get(v.id) || null }));
}

async function estadoAtivo(admin: Admin, chave: string): Promise<boolean> {
  const { data } = await admin.from("logistica_workflow_state").select("chave").eq("chave", chave).maybeSingle();
  return !!data;
}
async function marcarAtivo(admin: Admin, chave: string, automacao_id: string, veiculo_id: string, condicao: string) {
  await admin.from("logistica_workflow_state").upsert({
    chave, automacao_id, veiculo_id, condicao,
    ativa_desde: new Date().toISOString(),
    ultimo_disparo_em: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}
async function limparEstado(admin: Admin, chave: string) {
  await admin.from("logistica_workflow_state").delete().eq("chave", chave);
}

async function upsertMarker(admin: Admin, estId: string, automacao: any, v: any, minutos: number, cfg: any) {
  const categoriaTempo =
    minutos >= 30 ? "mais_30" : minutos >= 15 ? "15_30" : minutos >= 5 ? "5_15" : "menos_5";
  const { data: existing } = await admin
    .from("logistica_paradas_marcadas")
    .select("id")
    .eq("veiculo_id", v.id)
    .eq("estabelecimento_id", estId)
    .maybeSingle();
  const legenda = `${cfg.legenda_parada || `Parado há ${minutos} min`} (${automacao.nome})`;
  const payload = {
    veiculo_id: v.id,
    estabelecimento_id: estId,
    lat: v.pos.lat,
    lng: v.pos.lng,
    tempo_parado_minutos: minutos,
    categoria_tempo: categoriaTempo,
    icone_parada: cfg.icone_parada || "MapPin",
    cor_icone_parada: cfg.cor_icone_parada || "#EAB308",
    legenda_parada: legenda,
  };
  if (existing) {
    await admin.from("logistica_paradas_marcadas").update(payload).eq("id", existing.id);
  } else {
    await admin.from("logistica_paradas_marcadas").insert({ ...payload, data_inicio: new Date().toISOString(), automacao_id: automacao.id });
  }
  return 1;
}

async function notificarTransicao(admin: Admin, estId: string, nomeAutomacao: string, mensagem: string) {
  // Envia para todos os admins do estabelecimento
  const { data: admins } = await admin
    .from("usuarios")
    .select("id")
    .eq("estabelecimento_id", estId)
    .eq("tipo", "admin")
    .limit(20);
  if (!admins?.length) return;
  const rows = admins.map((u: any) => ({
    usuario_id: u.id,
    estabelecimento_id: estId,
    tipo: "logistica",
    titulo: nomeAutomacao,
    mensagem,
    lida: false,
  }));
  await admin.from("notificacoes_log").insert(rows);
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
