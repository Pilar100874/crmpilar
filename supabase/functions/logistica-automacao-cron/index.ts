// Executor server-side das automações de logística.
// Roda 24/7 via pg_cron (a cada 1-2 min), sem depender de nenhuma tela aberta.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ---------- utilidades ----------
const RAIO_MOVIMENTO_M = 80;

function distanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function minutosDesde(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

// ---------- estado persistido (substitui o localStorage do cliente) ----------
type Estado = Record<string, unknown>;

class EstadoStore {
  private cache = new Map<string, Estado | null>();
  private dirty = new Set<string>();
  private remover = new Set<string>();

  constructor(private estabelecimentoId: string) {}

  async carregar(chaves: string[]) {
    const faltando = chaves.filter((c) => !this.cache.has(c));
    if (!faltando.length) return;
    const { data } = await admin
      .from("logistica_automacao_estado")
      .select("chave, valor")
      .eq("estabelecimento_id", this.estabelecimentoId)
      .in("chave", faltando);
    for (const c of faltando) this.cache.set(c, null);
    for (const row of data ?? []) this.cache.set(row.chave, row.valor as Estado);
  }

  get(chave: string): Estado | null {
    return this.cache.get(chave) ?? null;
  }

  set(chave: string, valor: Estado) {
    this.cache.set(chave, valor);
    this.dirty.add(chave);
    this.remover.delete(chave);
  }

  del(chave: string) {
    this.cache.set(chave, null);
    this.dirty.delete(chave);
    this.remover.add(chave);
  }

  async flush() {
    const upserts = Array.from(this.dirty).map((chave) => ({
      estabelecimento_id: this.estabelecimentoId,
      chave,
      valor: this.cache.get(chave) ?? {},
      expira_em: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }));
    if (upserts.length) {
      await admin
        .from("logistica_automacao_estado")
        .upsert(upserts, { onConflict: "estabelecimento_id,chave" });
    }
    if (this.remover.size) {
      await admin
        .from("logistica_automacao_estado")
        .delete()
        .eq("estabelecimento_id", this.estabelecimentoId)
        .in("chave", Array.from(this.remover));
    }
    this.dirty.clear();
    this.remover.clear();
  }
}

// ---------- agendamento (porta de src/lib/logistica/agendamento.ts) ----------
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
// O agendamento é avaliado no fuso de São Paulo (mesmo do usuário).
const TZ_OFFSET_MIN = -180;

function agoraLocal(): Date {
  const n = new Date();
  return new Date(n.getTime() + (TZ_OFFSET_MIN - -n.getTimezoneOffset()) * 60000);
}

type AgendaCfg = Record<string, any>;

function agendamentoDevido(store: EstadoStore, chave: string, cfg: AgendaCfg): boolean {
  const key = `agenda:${chave}`;
  const modo = cfg.agenda_modo || "diario";
  const estado = store.get(key) as { last?: number } | null;
  const ultimo = Number(estado?.last) || 0;
  const agora = agoraLocal();
  const agoraTs = Date.now();

  if (modo === "intervalo") {
    const intervalo = Math.max(1, Number(cfg.agenda_intervalo_minutos) || 60) * 60000;
    if (agoraTs - ultimo < intervalo) return false;
    store.set(key, { last: agoraTs });
    return true;
  }

  if (modo === "semanal") {
    const dias = cfg.agenda_dias_semana?.length
      ? cfg.agenda_dias_semana
      : ["seg", "ter", "qua", "qui", "sex"];
    if (!dias.includes(DIAS[agora.getUTCDay()])) return false;
  }
  if (modo === "mensal") {
    const dias = cfg.agenda_dias_mes?.length ? cfg.agenda_dias_mes : [1];
    if (!dias.map(Number).includes(agora.getUTCDate())) return false;
  }

  const horarios: string[] = cfg.agenda_horarios?.length ? cfg.agenda_horarios : ["08:00"];
  const tolerancia = Math.max(1, Number(cfg.agenda_tolerancia_minutos) || 5) * 60000;
  const minutosAgora = agora.getUTCHours() * 60 + agora.getUTCMinutes();

  for (const h of horarios) {
    const [hh, mm] = String(h).split(":").map(Number);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) continue;
    const diffMin = minutosAgora - (hh * 60 + mm);
    if (diffMin < 0 || diffMin * 60000 > tolerancia) continue;
    // slot já disparado hoje?
    const slotTs = agoraTs - diffMin * 60000;
    if (ultimo >= slotTs) continue;
    store.set(key, { last: agoraTs });
    return true;
  }
  return false;
}

function periodoAgendamento(cfg: AgendaCfg | null): string {
  const agora = agoraLocal();
  if (!cfg) return `dia:${agora.toISOString().slice(0, 10)}`;
  const modo = cfg.agenda_modo || "diario";
  if (modo === "intervalo") {
    const intervalo = Math.max(1, Number(cfg.agenda_intervalo_minutos) || 60) * 60000;
    return `int:${Math.floor(Date.now() / intervalo)}`;
  }
  const dia = agora.toISOString().slice(0, 10);
  const horarios: string[] = cfg.agenda_horarios?.length ? cfg.agenda_horarios : ["08:00"];
  const minutosAgora = agora.getUTCHours() * 60 + agora.getUTCMinutes();
  let slotAtual = horarios[0];
  for (const h of horarios) {
    const [hh, mm] = String(h).split(":").map(Number);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) continue;
    if (minutosAgora >= hh * 60 + mm) slotAtual = h;
  }
  return `${modo}:${dia}:${slotAtual}`;
}

// ---------- envio ----------
async function invocar(fn: string, body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, data: await res.text().catch(() => "") };
}

function inferContentType(url: string) {
  const l = url.split("?")[0].toLowerCase();
  if (/\.(mp4|mov|webm)$/.test(l)) return "video";
  if (/\.(mp3|ogg|wav|m4a)$/.test(l)) return "audio";
  if (l.endsWith(".pdf")) return "document";
  if (/\.(jpe?g|png|webp|gif|bmp|svg)$/.test(l)) return "image";
  return "document";
}

async function enviarWhatsapp(opts: {
  estabelecimentoId: string;
  telefone: string;
  mensagem: string;
  mediaUrl?: string;
  cfg: any;
}) {
  const digits = String(opts.telefone || "").replace(/\D/g, "");
  if (!digits) return;
  await invocar("send-agent-message", {
    estabelecimento_id: opts.estabelecimentoId,
    telefone: digits,
    mensagem: opts.mensagem,
    text: opts.mensagem,
    caption: opts.mediaUrl ? opts.mensagem : undefined,
    fileUrl: opts.mediaUrl || undefined,
    mediaUrl: opts.mediaUrl || undefined,
    contentType: opts.mediaUrl ? inferContentType(opts.mediaUrl) : undefined,
    canal: "whatsapp",
    whatsappSessionId: opts.cfg?.whatsappSessionId || null,
    whatsappSessionName: opts.cfg?.whatsappSessionName || null,
    whatsappNumeroId: opts.cfg?.whatsappNumeroId || null,
    origem: "logistica_automacao_cron",
  });
}

// motorista atual por veículo (mesma regra do cvDriverLookup do app)
async function motoristasAtuais(veiculoIds: string[]) {
  const out: Record<string, { nome: string; telefone: string | null } | null> = {};
  if (!veiculoIds.length) return out;
  const { data: cvvs } = await admin
    .from("cv_vehicles")
    .select("id, veiculo_id")
    .in("veiculo_id", veiculoIds);
  const lista = (cvvs ?? []) as Array<{ id: string; veiculo_id: string }>;
  if (!lista.length) return out;

  const { data: moves } = await admin
    .from("cv_vehicle_movements")
    .select("vehicle_id, driver_id, exit_time, entry_time")
    .in("vehicle_id", lista.map((v) => v.id))
    .lte("exit_time", new Date().toISOString())
    .order("exit_time", { ascending: false });

  const escolhido: Record<string, string> = {};
  for (const m of (moves ?? []) as any[]) {
    if (escolhido[m.vehicle_id]) continue;
    escolhido[m.vehicle_id] = m.driver_id;
  }
  const ids = Array.from(new Set(Object.values(escolhido)));
  if (!ids.length) return out;
  const { data: drivers } = await admin
    .from("cv_drivers")
    .select("id, name, phone")
    .in("id", ids);
  const dmap = new Map((drivers ?? []).map((d: any) => [d.id, d]));
  for (const cvv of lista) {
    const d = dmap.get(escolhido[cvv.id]);
    out[cvv.veiculo_id] = d ? { nome: d.name, telefone: d.phone ?? null } : null;
  }
  return out;
}

// ---------- núcleo ----------
type Veic = {
  id: string;
  placa: string;
  motorista?: string | null;
  status: "movendo" | "parado" | "offline";
  pos: { lat: number; lng: number; velocidade: number; data_hora: string } | null;
};

async function carregarVeiculos(estabelecimentoId: string): Promise<Veic[]> {
  const { data: veiculos } = await admin
    .from("veiculos")
    .select("id, placa, motorista")
    .eq("estabelecimento_id", estabelecimentoId)
    .eq("ativo", true);
  const lista = (veiculos ?? []) as any[];
  if (!lista.length) return [];

  const { data: posicoes } = await admin
    .from("veiculo_posicoes")
    .select("veiculo_id, lat, lng, velocidade, data_hora")
    .in("veiculo_id", lista.map((v) => v.id))
    .gte("data_hora", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
    .order("data_hora", { ascending: false });

  const ultima = new Map<string, any>();
  for (const p of posicoes ?? []) if (!ultima.has(p.veiculo_id)) ultima.set(p.veiculo_id, p);

  return lista.map((v) => {
    const pos = ultima.get(v.id) ?? null;
    let status: Veic["status"] = "offline";
    if (pos && minutosDesde(pos.data_hora) <= 30) {
      status = Number(pos.velocidade) > 5 ? "movendo" : "parado";
    }
    return { id: v.id, placa: v.placa, motorista: v.motorista, status, pos };
  });
}

async function processarEstabelecimento(estabelecimentoId: string) {
  const store = new EstadoStore(estabelecimentoId);
  const { data: automacoes } = await admin
    .from("logistica_automacoes")
    .select("id, nome, flow_data")
    .eq("estabelecimento_id", estabelecimentoId)
    .eq("ativo", true);
  if (!automacoes?.length) return { automacoes: 0, disparos: 0 };

  const veiculos = await carregarVeiculos(estabelecimentoId);
  let disparos = 0;
  const marcacoes: any[] = [];

  for (const automacao of automacoes as any[]) {
    const nodes = (automacao.flow_data?.nodes ?? []) as any[];
    if (!Array.isArray(nodes) || !nodes.length) continue;

    const zonas = nodes
      .filter((n) => n.data?.type === "condicao_zona_isenta")
      .map((n) => n.data?.config || {})
      .filter((c: any) => Number.isFinite(Number(c.zona_lat)) && Number.isFinite(Number(c.zona_lng)))
      .map((c: any) => ({
        lat: Number(c.zona_lat),
        lng: Number(c.zona_lng),
        raio: Number(c.zona_raio_metros) || 200,
      }));
    const dentroZona = (lat: number, lng: number) =>
      zonas.some((z) => distanciaMetros(lat, lng, z.lat, z.lng) <= z.raio);

    const tempoNode = nodes.find((n) => n.data?.type === "acao_tempo_parado_mapa");
    const enderecoNode = nodes.find((n) => n.data?.type === "acao_endereco_mapa");
    const paradoNode = nodes.find((n) => n.data?.type === "condicao_parado");
    const repetirNode = nodes.find((n) => n.data?.type === "condicao_repetir_parado");
    const agendaNode = nodes.find((n) => n.data?.type === "gatilho_agendamento");

    // Veículos elegíveis pela condição "Veículo Parado"
    let elegiveis = veiculos;
    if (paradoNode) {
      const pc = paradoNode.data?.config || {};
      const cond = Array.isArray(pc.condicoes_tempo) && pc.condicoes_tempo.length
        ? pc.condicoes_tempo
        : [{ tempo_minutos: Number(pc.tempo_minutos) || 30 }];
      const limite = Math.min(...cond.map((c: any) => Number(c.tempo_minutos) || 30));
      elegiveis = veiculos.filter((v) => {
        if (!v.pos) return false;
        // Parado = não está em movimento (inclui rastreador offline com última velocidade 0)
        if (v.status === "movendo" || Number(v.pos.velocidade) > 5) return false;
        if (dentroZona(v.pos.lat, v.pos.lng)) return false;
        return minutosDesde(v.pos.data_hora) >= limite;
      });

      console.log("[cron][dbg]", automacao.nome, {elegiveis: elegiveis.length, endereco: !!enderecoNode, tempo: !!tempoNode, marcar: !!pc.marcar_no_mapa});
      // Marcações no mapa (tempo parado)
      if (pc.marcar_no_mapa || tempoNode || enderecoNode) {
        for (const v of elegiveis) {
          const min = minutosDesde(v.pos!.data_hora);
          const categoria = min >= 30 ? "mais_30" : min >= 15 ? "15_30" : min >= 5 ? "5_15" : "menos_5";
          marcacoes.push({
            veiculo_id: v.id,
            lat: v.pos!.lat,
            lng: v.pos!.lng,
            tempo_parado_minutos: min,
            categoria_tempo: categoria,
            icone_parada: pc.icone_parada || "MapPin",
            cor_icone_parada: tempoNode?.data?.config?.cor_tempo || pc.cor_icone_parada || "#EAB308",
            legenda_parada: `${pc.legenda_parada || `Parado há ${min} min`} (${automacao.nome})`,
            automacao_id: automacao.id,
            mostrar_tempo: !!tempoNode,
            mostrar_endereco: !!enderecoNode,
            endereco_curto: enderecoNode?.data?.config?.endereco_curto !== false,
            data_inicio: v.pos!.data_hora,
          });
        }
      }
    }

    // Chaves de estado necessárias
    const chaves: string[] = [];
    if (agendaNode) chaves.push(`agenda:${automacao.id}:${agendaNode.id}`);
    for (const v of elegiveis) {
      chaves.push(`unico:${automacao.id}:${v.id}`);
      if (repetirNode) chaves.push(`repetir:${automacao.id}:${repetirNode.id}:${v.id}`);
    }
    await store.carregar(chaves);

    // Quais veículos disparam ações neste ciclo
    let veiculosAcao: Veic[] = [];
    if (agendaNode) {
      const devido = agendamentoDevido(
        store,
        `${automacao.id}:${agendaNode.id}`,
        agendaNode.data?.config || {},
      );
      veiculosAcao = devido ? (paradoNode ? elegiveis : elegiveis.slice(0, 1)) : [];
    } else if (repetirNode) {
      const intervaloMin = Math.max(1, Number(repetirNode.data?.config?.repetir_intervalo_minutos) || 15);
      veiculosAcao = elegiveis.filter((v) => {
        const key = `repetir:${automacao.id}:${repetirNode.id}:${v.id}`;
        const pos = v.pos!;
        let est = store.get(key) as any;
        if (est && distanciaMetros(est.lat, est.lng, pos.lat, pos.lng) > RAIO_MOVIMENTO_M) est = null;
        const agoraTs = Date.now();
        if (!est) {
          store.set(key, { last: agoraTs, count: 1, lat: pos.lat, lng: pos.lng, desde: agoraTs });
          return true;
        }
        if (agoraTs - Number(est.last || 0) < intervaloMin * 60000) return false;
        store.set(key, { ...est, last: agoraTs, count: Number(est.count || 0) + 1 });
        return true;
      });
      // libera veículos que voltaram a se mover
      for (const v of veiculos) {
        if (v.status === "parado") continue;
        store.del(`repetir:${automacao.id}:${repetirNode.id}:${v.id}`);
      }
    } else if (!paradoNode) {
      // Sem gatilho e sem condição: não dispara (evita envio contínuo)
      veiculosAcao = [];
    } else {
      // Disparo único por parada
      veiculosAcao = elegiveis.filter((v) => {
        const key = `unico:${automacao.id}:${v.id}`;
        const pos = v.pos!;
        const est = store.get(key) as any;
        if (est && distanciaMetros(est.lat, est.lng, pos.lat, pos.lng) <= RAIO_MOVIMENTO_M) return false;
        store.set(key, { lat: pos.lat, lng: pos.lng, ts: Date.now() });
        return true;
      });
      for (const v of veiculos) {
        if (v.status !== "movendo") continue;
        store.del(`unico:${automacao.id}:${v.id}`);
      }
    }

    if (!veiculosAcao.length) {
      await store.flush();
      continue;
    }

    const periodo = periodoAgendamento(agendaNode ? agendaNode.data?.config || {} : null);
    const travas = new Map<string, boolean>();
    const podeEnviar = async (destinatario: string) => {
      if (repetirNode) return true; // repetição intencional
      const key = `dup:${automacao.id}:${periodo}:${destinatario}`;
      if (travas.has(key)) return false;
      await store.carregar([key]);
      if (store.get(key)) return false;
      store.set(key, { ts: Date.now() });
      travas.set(key, true);
      return true;
    };

    const linkLoc = (v: Veic) =>
      v.pos ? `https://www.google.com/maps?q=${v.pos.lat},${v.pos.lng}` : null;

    const aplicarVars = (msg: string, v?: Veic, motorista?: string) => {
      if (!msg) return msg;
      const alvo = v || veiculosAcao[0];
      const placa = v
        ? v.placa
        : Array.from(new Set(veiculosAcao.map((x) => x.placa).filter(Boolean))).join(", ");
      return msg
        .replace(/\{placa\}/gi, placa || "")
        .replace(/\{motorista\}/gi, motorista || alvo?.motorista || "")
        .replace(/\{velocidade\}/gi, String(Math.round(alvo?.pos?.velocidade ?? 0)))
        .replace(/\{data\}/gi, agoraLocal().toISOString().slice(0, 10).split("-").reverse().join("/"))
        .replace(/\{hora\}/gi, agoraLocal().toISOString().slice(11, 16));
    };

    // Bloco "Gerar Relatório PDF" — gerado no máximo uma vez por ciclo
    const relatorioNode = nodes.find((n: any) => n.data?.type === "acao_relatorio_pdf");
    let relatorioUrl: string | null = null;
    let relatorioGerado = false;
    const obterRelatorioPdf = async (): Promise<string | null> => {
      if (relatorioGerado) return relatorioUrl;
      relatorioGerado = true;
      if (!relatorioNode) return null;
      try {
        const rc = relatorioNode.data?.config || {};
        const { data } = await invocar("logistica-relatorio-pdf", {
          estabelecimento_id: estabelecimentoId,
          periodo: rc.relatorio_periodo || "semanal",
          limite_kmh: Number(rc.relatorio_limite_kmh) || 80,
          titulo: rc.relatorio_titulo || undefined,
          incluir_grafico: rc.relatorio_grafico !== false,
        });
        const json = JSON.parse(data || "{}");
        relatorioUrl = json?.url || null;
      } catch (e) {
        console.error("[cron] falha ao gerar relatório PDF", e);
      }
      return relatorioUrl;
    };

    for (const node of nodes) {
      const tipo = node.data?.type as string;
      const config = node.data?.config || {};
      const enviarLoc = !!config.enviar_localizacao;
      const TAG = "📍 Localização atual";
      const comLoc = (msg: string, v?: Veic) => {
        if (!enviarLoc || msg.includes(TAG)) return msg;
        const alvo = v || veiculosAcao.find((x) => x.pos);
        const l = alvo ? linkLoc(alvo) : null;
        return l ? `${msg}\n\n${TAG}: ${l}` : msg;
      };

      if (tipo === "acao_relatorio_pdf") {
        await obterRelatorioPdf();
      }

      if (tipo === "acao_whatsapp") {
        const destino = config.destino_tipo || (config.usar_telefone_cliente ? "cliente" : "numero");
        const tpl = String(config.mensagem || "");
        const textoAntes = String(config.texto_antes || "").trim();
        const mediaUrl = String(config.media_url || "").trim() || undefined;
        const prefixo = (m: string) => (textoAntes ? `${textoAntes}\n\n${m}` : m);

        // Anexar relatório PDF gerado (enviado por último, após o texto)
        let pdfUrl: string | null = null;
        if (config.anexar_relatorio) pdfUrl = await obterRelatorioPdf();
        const enviarPdf = async (tel: string) => {
          if (!pdfUrl) return;
          await enviarWhatsapp({
            estabelecimentoId,
            telefone: tel,
            mensagem: String(config.relatorio_legenda || "Relatório em anexo"),
            mediaUrl: pdfUrl,
            cfg: config,
          });
        };

        if (destino === "motorista_atual") {
          const map = await motoristasAtuais(veiculosAcao.map((v) => v.id));
          for (const v of veiculosAcao) {
            const mot = map[v.id];
            const digits = (mot?.telefone || "").replace(/\D/g, "");
            const tel = digits ? (digits.length <= 11 ? `55${digits}` : digits) : "";
            if (!tel) continue;
            if (!(await podeEnviar(`${node.id}:${tel}`))) continue;
            const mensagem = prefixo(comLoc(aplicarVars(tpl, v, mot?.nome || ""), v));
            await enviarWhatsapp({ estabelecimentoId, telefone: tel, mensagem, mediaUrl, cfg: config });
            await enviarPdf(tel);
            disparos++;
          }
        } else {
          const listaRaw: string[] = Array.isArray(config.telefones) && config.telefones.length
            ? config.telefones
            : [config.telefone || ""];
          const lista = Array.from(new Set(listaRaw.map((t) => String(t || "").trim()).filter(Boolean)));
          let motoristaNome = "";
          if (/\{motorista\}/i.test(tpl)) {
            const map = await motoristasAtuais(veiculosAcao.map((v) => v.id));
            motoristaNome = Array.from(
              new Set(veiculosAcao.map((v) => map[v.id]?.nome).filter(Boolean) as string[]),
            ).join(", ");
          }
          const mensagem = prefixo(comLoc(aplicarVars(tpl, undefined, motoristaNome)));
          for (const tel of lista) {
            if (!(await podeEnviar(`${node.id}:${tel}`))) continue;
            await enviarWhatsapp({ estabelecimentoId, telefone: tel, mensagem, mediaUrl, cfg: config });
            await enviarPdf(tel);
            disparos++;
          }
          if (config.disparar_bot && config.bot_flow_id) {
            await invocar("executar-bot-flow", {
              flowId: config.bot_flow_id,
              estabelecimentoId,
              origem: "logistica_automacao_cron",
              variaveis: { automacao_nome: automacao.nome },
            });
          }
        }
      }


      if (tipo === "acao_email") {
        const to = String(config.email_destino || "").trim();
        const subject = String(config.assunto_email || "").trim();
        if (to && subject && (await podeEnviar(`${node.id}:${to}`))) {
          const corpo = comLoc(aplicarVars(String(config.corpo_email || "")));
          await invocar("send-email", { to, subject, html: corpo, text: corpo });
          disparos++;
        }
      }

      if (tipo === "acao_webhook" || tipo === "webhook") {
        const url = String(config.url || "").trim();
        if (url) {
          try {
            await fetch(url, {
              method: (config.method || "POST").toUpperCase(),
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                automacao: { id: automacao.id, nome: automacao.nome },
                veiculos: veiculosAcao.map((v) => ({ id: v.id, placa: v.placa, pos: v.pos })),
              }),
            });
            disparos++;
          } catch (e) {
            console.error("[cron] webhook falhou", e);
          }
        }
      }

      if (
        tipo === "acao_notificacao" ||
        tipo === "enviar_aviso_sistema" ||
        tipo === "acao_aviso_sistema"
      ) {
        const titulo = config.titulo_notificacao || config.titulo || "Notificação";
        const mensagem = comLoc(aplicarVars(String(config.corpo_notificacao || config.mensagem || "")));
        if (mensagem && (await podeEnviar(`${node.id}:aviso`))) {
          await admin.from("avisos_sistema").insert({
            estabelecimento_id: estabelecimentoId,
            titulo,
            mensagem,
            tipo: config.tipo || "info",
            destinatarios_tipo: config.destinatarios_tipo || "todos",
            destinatarios_ids: config.destinatarios_ids || null,
            destinatarios_roles: config.destinatarios_roles || null,
            ativo: true,
          });
          disparos++;
        }
      }
    }

    await store.flush();
  }

  // Persiste marcações no mapa e limpa as de veículos em movimento
  await persistirMarcacoes(estabelecimentoId, marcacoes, veiculos);

  return { automacoes: automacoes.length, disparos };
}

// Geocodificação reversa (Nominatim) para o balão de endereço
async function enderecoDe(lat: number, lng: number, curto: boolean): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=pt-BR`;
    const res = await fetch(url, { headers: { "User-Agent": "PilarCRM/1.0 (logistica-automacao)" } });
    if (!res.ok) return null;
    const json = await res.json();
    const a = json?.address || {};
    const rua = a.road || a.pedestrian || a.residential || a.suburb || "";
    const numero = a.house_number ? `, ${a.house_number}` : "";
    const bairro = a.suburb || a.neighbourhood || a.city_district || "";
    const cidade = a.city || a.town || a.village || a.municipality || "";
    const uf = a.state_code || a.state || "";
    if (curto) {
      const partes = [rua ? `${rua}${numero}` : "", bairro].filter(Boolean);
      return partes.length ? partes.join(" - ") : (json?.display_name ?? null);
    }
    const partes = [rua ? `${rua}${numero}` : "", bairro, cidade, uf].filter(Boolean);
    return partes.length ? partes.join(" - ") : (json?.display_name ?? null);
  } catch (e) {
    console.error("[cron] geocodificação reversa falhou", e);
    return null;
  }
}

async function persistirMarcacoes(estabelecimentoId: string, marcacoes: any[], veiculos: Veic[]) {
  console.log("[cron][persist] inicio", marcacoes.length);
  const marcados = new Set(marcacoes.map((m) => m.veiculo_id));
  const emMovimento = veiculos.filter((v) => v.status === "movendo" && !marcados.has(v.id)).map((v) => v.id);
  if (emMovimento.length) {
    await admin
      .from("logistica_paradas_marcadas")
      .delete()
      .eq("estabelecimento_id", estabelecimentoId)
      .in("veiculo_id", emMovimento);
  }

  // Mescla marcações do mesmo veículo vindas de automações diferentes
  // (ex.: uma com "tempo parado" e outra com "endereço no mapa").
  const marcacoesMescladas = new Map<string, any>();
  for (const m of marcacoes) {
    const atual = marcacoesMescladas.get(m.veiculo_id);
    if (!atual) {
      marcacoesMescladas.set(m.veiculo_id, { ...m });
      continue;
    }
    marcacoesMescladas.set(m.veiculo_id, {
      ...atual,
      mostrar_tempo: !!atual.mostrar_tempo || !!m.mostrar_tempo,
      mostrar_endereco: !!atual.mostrar_endereco || !!m.mostrar_endereco,
      endereco_curto: atual.mostrar_endereco ? atual.endereco_curto : m.endereco_curto,
    });
  }

  console.log("[cron][persist] mescladas", marcacoesMescladas.size);
  for (const m of Array.from(marcacoesMescladas.values())) {
    const { data: existing, error: errSel } = await admin
      .from("logistica_paradas_marcadas")
      .select("id, lat, lng, data_inicio, endereco")
      .eq("estabelecimento_id", estabelecimentoId)
      .eq("veiculo_id", m.veiculo_id)
      .maybeSingle();
    console.log("[cron][persist] item", m.veiculo_id, { existing: !!existing, errSel: errSel?.message });

    if (existing) {
      const mudou =
        distanciaMetros(Number(existing.lat), Number(existing.lng), m.lat, m.lng) > RAIO_MOVIMENTO_M;
      const inicio = !mudou && existing.data_inicio
        ? new Date(existing.data_inicio) <= new Date(m.data_inicio)
          ? existing.data_inicio
          : m.data_inicio
        : m.data_inicio;
      let endereco = (existing as any).endereco ?? null;
      if (m.mostrar_endereco && (mudou || !endereco)) {
        endereco = (await enderecoDe(m.lat, m.lng, m.endereco_curto !== false)) ?? endereco;
      }
      if (!m.mostrar_endereco) endereco = null;
      const { error: errUpd } = await admin
        .from("logistica_paradas_marcadas")
        .update({
          lat: m.lat,
          lng: m.lng,
          tempo_parado_minutos: Math.max(0, minutosDesde(inicio)),
          categoria_tempo: m.categoria_tempo,
          icone_parada: m.icone_parada,
          cor_icone_parada: m.cor_icone_parada,
          legenda_parada: m.legenda_parada,
          data_inicio: inicio,
          mostrar_tempo: m.mostrar_tempo,
          mostrar_endereco: !!m.mostrar_endereco,
          endereco,
        })
        .eq("id", existing.id);
      if (errUpd) console.error("[cron] falha ao atualizar marcação", existing.id, errUpd);
      else console.log("[cron] marcação atualizada", existing.id, m.veiculo_id, m.mostrar_endereco);
    } else {
      const endereco = m.mostrar_endereco
        ? await enderecoDe(m.lat, m.lng, m.endereco_curto !== false)
        : null;
      const { endereco_curto: _ec, ...campos } = m;
      const { error: errIns } = await admin.from("logistica_paradas_marcadas").insert({
        ...campos,
        endereco,
        estabelecimento_id: estabelecimentoId,
      });
      if (errIns) console.error("[cron][persist] falha insert", m.veiculo_id, errIns.message, errIns.details);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    let estabelecimentoId: string | null = null;
    try {
      const body = await req.json();
      estabelecimentoId = body?.estabelecimento_id ?? null;
    } catch { /* chamada do cron sem body válido */ }

    let ids: string[];
    if (estabelecimentoId) {
      ids = [estabelecimentoId];
    } else {
      const { data } = await admin
        .from("logistica_automacoes")
        .select("estabelecimento_id")
        .eq("ativo", true);
      ids = Array.from(new Set((data ?? []).map((r: any) => r.estabelecimento_id).filter(Boolean)));
    }

    const resultados: Record<string, unknown> = {};
    for (const id of ids) {
      try {
        resultados[id] = await processarEstabelecimento(id);
      } catch (e) {
        console.error("[logistica-cron] erro no estabelecimento", id, e);
        resultados[id] = { erro: String((e as Error)?.message || e) };
      }
    }

    // limpeza de estados expirados
    await admin
      .from("logistica_automacao_estado")
      .delete()
      .lt("expira_em", new Date().toISOString());

    return new Response(JSON.stringify({ ok: true, estabelecimentos: ids.length, resultados }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[logistica-cron] falha geral", e);
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
