// Gera o PDF de "Velocidades Excedidas" no servidor (porta de src/lib/logistica/relatorioVelocidade.ts)
// e devolve a URL pública do arquivo no storage.
import { createClient } from "npm:@supabase/supabase-js@2";
import { jsPDF } from "npm:jspdf@2.5.2";
import * as autoTableMod from "npm:jspdf-autotable@3.8.4";
// interop: em Deno o módulo pode vir como namespace
const autoTable: any = (autoTableMod as any).default ?? (autoTableMod as any).autoTable ?? autoTableMod;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const PERIODO_DIAS: Record<string, number> = { semanal: 7, mensal: 30, semestral: 180 };
const PERIODO_LABEL: Record<string, string> = {
  semanal: "Semanal (últimos 7 dias)",
  mensal: "Mensal (últimos 30 dias)",
  semestral: "Semestral (últimos 180 dias)",
};
const LIMITE_PADRAO_GLOBAL = 80;

const fmtData = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
const fmtHora = (d: Date) =>
  d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

type Veiculo = {
  id: string;
  placa: string | null;
  descricao: string | null;
  tipo_veiculo: string | null;
  limite_velocidade: number | null;
};

async function limitesConfig(estabelecimentoId: string) {
  const { data } = await admin
    .from("logistica_config")
    .select("limites_velocidade_tipo, limite_velocidade_global")
    .eq("estabelecimento_id", estabelecimentoId)
    .maybeSingle();
  return {
    porTipo: ((data as any)?.limites_velocidade_tipo ?? {}) as Record<string, number>,
    global: Number((data as any)?.limite_velocidade_global) || null,
  };
}

function limiteDoVeiculo(
  v: Veiculo,
  padrao: number,
  cfg: { porTipo: Record<string, number>; global: number | null },
) {
  if (Number(v.limite_velocidade) > 0) return Number(v.limite_velocidade);
  const tipo = (v.tipo_veiculo || "").toLowerCase();
  const doTipo = Number(cfg.porTipo?.[tipo] ?? cfg.porTipo?.[v.tipo_veiculo || ""]);
  if (doTipo > 0) return doTipo;
  if (cfg.global && cfg.global > 0) return cfg.global;
  return padrao || LIMITE_PADRAO_GLOBAL;
}

/** Dimensões de PNG/JPEG sem depender do DOM. */
function dimensoesImagem(bytes: Uint8Array): { w: number; h: number } | null {
  // PNG
  if (bytes.length > 24 && bytes[0] === 0x89 && bytes[1] === 0x50) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { w: dv.getUint32(16), h: dv.getUint32(20) };
  }
  // JPEG
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    while (i < bytes.length - 9) {
      if (bytes[i] !== 0xff) { i++; continue; }
      const marker = bytes[i + 1];
      const len = dv.getUint16(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { h: dv.getUint16(i + 5), w: dv.getUint16(i + 7) };
      }
      i += 2 + len;
    }
  }
  return null;
}

function toBase64(bytes: Uint8Array) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function carregarLogo(estabelecimentoId: string) {
  try {
    const { data } = await admin
      .from("ecommerce_config")
      .select("logo_url")
      .eq("estabelecimento_id", estabelecimentoId)
      .maybeSingle();
    const url = (data as any)?.logo_url;
    if (!url) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const dims = dimensoesImagem(bytes);
    if (!dims) return null;
    const mime = bytes[0] === 0x89 ? "image/png" : "image/jpeg";
    return {
      dataUrl: `data:${mime};base64,${toBase64(bytes)}`,
      formato: mime === "image/png" ? "PNG" : "JPEG",
      largura: dims.w,
      altura: dims.h,
    };
  } catch {
    return null;
  }
}

interface Evento {
  data: string;
  hora: string;
  placa: string;
  motorista: string;
  velocidade: number;
  limite: number;
  ts: number;
}

async function buscarEventos(opts: {
  estabelecimentoId: string;
  periodo: string;
  limiteKmh: number;
  veiculoIds?: string[];
}) {
  const fim = new Date();
  const inicio = new Date(fim.getTime() - (PERIODO_DIAS[opts.periodo] ?? 7) * 86400000);
  const padrao = Number(opts.limiteKmh) || LIMITE_PADRAO_GLOBAL;
  const cfg = await limitesConfig(opts.estabelecimentoId);

  let q = admin
    .from("veiculos")
    .select("id, placa, descricao, tipo_veiculo, limite_velocidade")
    .eq("estabelecimento_id", opts.estabelecimentoId);
  if (opts.veiculoIds?.length) q = q.in("id", opts.veiculoIds);
  const { data: veiculos } = await q;
  const lista = (veiculos ?? []) as Veiculo[];
  if (!lista.length) return { eventos: [] as Evento[], inicio, fim };

  const placaPorId = new Map(lista.map((v) => [v.id, v.placa || v.descricao || "—"]));
  const limitePorId = new Map(lista.map((v) => [v.id, limiteDoVeiculo(v, padrao, cfg)]));
  const menorLimite = Math.min(...Array.from(limitePorId.values()));
  const ids = lista.map((v) => v.id);

  const { data: posicoes } = await admin
    .from("veiculo_posicoes")
    .select("veiculo_id, velocidade, data_hora")
    .in("veiculo_id", ids)
    .gt("velocidade", menorLimite)
    .gte("data_hora", inicio.toISOString())
    .lte("data_hora", fim.toISOString())
    .order("data_hora", { ascending: true })
    .limit(5000);

  const brutos = ((posicoes ?? []) as any[]).filter(
    (p) => Number(p.velocidade) > (limitePorId.get(p.veiculo_id) ?? padrao),
  );
  if (!brutos.length) return { eventos: [] as Evento[], inicio, fim };

  const { data: cvvs } = await admin.from("cv_vehicles").select("id, veiculo_id").in("veiculo_id", ids);
  const cvvList = (cvvs ?? []) as Array<{ id: string; veiculo_id: string }>;
  const cvvPorVeiculo = new Map(cvvList.map((c) => [c.veiculo_id, c.id]));

  let movs: any[] = [];
  const nomePorDriver = new Map<string, string>();
  if (cvvList.length) {
    const { data: m } = await admin
      .from("cv_vehicle_movements")
      .select("vehicle_id, driver_id, exit_time, entry_time")
      .in("vehicle_id", cvvList.map((c) => c.id))
      .lte("exit_time", fim.toISOString())
      .order("exit_time", { ascending: false })
      .limit(3000);
    movs = (m ?? []) as any[];
    const driverIds = Array.from(new Set(movs.map((x) => x.driver_id).filter(Boolean)));
    if (driverIds.length) {
      const { data: drivers } = await admin.from("cv_drivers").select("id, name").in("id", driverIds);
      for (const d of (drivers ?? []) as any[]) nomePorDriver.set(d.id, d.name);
    }
  }

  const motoristaEm = (veiculoId: string, ts: number) => {
    const cvvId = cvvPorVeiculo.get(veiculoId);
    if (!cvvId) return "Não informado";
    for (const m of movs) {
      if (m.vehicle_id !== cvvId) continue;
      const saida = new Date(m.exit_time).getTime();
      const volta = m.entry_time ? new Date(m.entry_time).getTime() : Infinity;
      if (ts >= saida && ts <= volta) return nomePorDriver.get(m.driver_id) || "Não informado";
    }
    return "Não informado";
  };

  const vistos = new Set<string>();
  const eventos: Evento[] = [];
  for (const p of brutos) {
    const d = new Date(p.data_hora);
    const chave = `${p.veiculo_id}:${Math.floor(d.getTime() / 60000)}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    eventos.push({
      data: fmtData(d),
      hora: fmtHora(d),
      placa: placaPorId.get(p.veiculo_id) || "—",
      motorista: motoristaEm(p.veiculo_id, d.getTime()),
      velocidade: Math.round(Number(p.velocidade) || 0),
      limite: limitePorId.get(p.veiculo_id) ?? padrao,
      ts: d.getTime(),
    });
  }
  eventos.sort((a, b) => a.motorista.localeCompare(b.motorista, "pt-BR") || a.ts - b.ts);
  return { eventos, inicio, fim };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const estabelecimentoId = String(body.estabelecimento_id || "");
    if (!estabelecimentoId) throw new Error("estabelecimento_id obrigatório");
    const periodo = String(body.periodo || "semanal");
    const limiteKmh = Number(body.limite_kmh) || LIMITE_PADRAO_GLOBAL;
    const incluirGrafico = body.incluir_grafico !== false;

    const { eventos, inicio, fim } = await buscarEventos({
      estabelecimentoId,
      periodo,
      limiteKmh,
      veiculoIds: body.veiculo_ids,
    });
    const logo = await carregarLogo(estabelecimentoId);

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const largura = doc.internal.pageSize.getWidth();
    const margem = 12;
    let y = 14;

    if (logo) {
      try {
        const maxW = 32, maxH = 18;
        const escala = Math.min(maxW / logo.largura, maxH / logo.altura);
        const w = logo.largura * escala;
        const h = logo.altura * escala;
        doc.addImage(logo.dataUrl, logo.formato, margem, y - 4 + (maxH - h) / 2, w, h, undefined, "FAST");
      } catch { /* logo inválido */ }
    }

    const titulo = String(body.titulo || "").trim() || "Relatório de Velocidades Excedidas no Período";
    doc.setFont("helvetica", "bold").setFontSize(15);
    doc.text(titulo, largura / 2, y + 4, { align: "center" });
    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text(
      `${PERIODO_LABEL[periodo] ?? periodo}  ·  ${fmtData(inicio)} a ${fmtData(fim)}  ·  limite por veículo (padrão ${limiteKmh} km/h)`,
      largura / 2,
      y + 10,
      { align: "center" },
    );
    doc.text(`${eventos.length} ocorrência(s)`, largura / 2, y + 15, { align: "center" });
    y += 24;

    autoTable(doc, {
      startY: y,
      head: [["Data", "Placa", "Motorista", "Hora", "Limite", "Velocidade excedida"]],
      body: eventos.map((e) => [
        e.data,
        e.placa,
        e.motorista,
        e.hora,
        `${e.limite} km/h`,
        `${e.velocidade} km/h (+${Math.max(0, e.velocidade - Number(e.limite || 0))})`,
      ]),
      styles: { fontSize: 8, cellPadding: 1.8, overflow: "linebreak" },
      headStyles: { fillColor: [220, 38, 38], textColor: 255 },
      alternateRowStyles: { fillColor: [246, 247, 250] },
      margin: { left: margem, right: margem },
    });
    y = (doc as any).lastAutoTable.finalY + 12;

    if (incluirGrafico && eventos.length) {
      const contagem = new Map<string, number>();
      for (const e of eventos) contagem.set(e.motorista, (contagem.get(e.motorista) || 0) + 1);
      const ranking = Array.from(contagem.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
      const maxVal = Math.max(...ranking.map((r) => r[1]));
      const alturaGrafico = ranking.length * 8 + 22;
      if (y + alturaGrafico > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage();
        y = 18;
      }
      doc.setFont("helvetica", "bold").setFontSize(12);
      doc.text("Quem mais excede a velocidade", margem, y);
      y += 7;
      const xBar = margem + 45;
      const larguraMax = largura - xBar - margem - 14;
      doc.setFont("helvetica", "normal").setFontSize(8);
      for (const [nome, qtd] of ranking) {
        const w = Math.max(1.5, (qtd / maxVal) * larguraMax);
        doc.setTextColor(30);
        doc.text(nome.length > 26 ? `${nome.slice(0, 25)}…` : nome, margem, y + 3.6);
        doc.setFillColor(220, 38, 38);
        doc.rect(xBar, y, w, 5, "F");
        doc.text(String(qtd), xBar + w + 2, y + 3.8);
        y += 8;
      }
      doc.setTextColor(0);
    }

    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal").setFontSize(8);
      doc.text(
        `Gerado em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}  ·  Página ${i} de ${total}`,
        largura - margem,
        doc.internal.pageSize.getHeight() - 8,
        { align: "right" },
      );
    }

    const bytes = new Uint8Array(doc.output("arraybuffer") as ArrayBuffer);
    const filename = `relatorio-velocidade-${periodo}-${Date.now()}.pdf`;
    const path = `logistica/velocidade/${filename}`;
    const { error } = await admin.storage
      .from("report-assets")
      .upload(path, bytes, { contentType: "application/pdf", upsert: true });
    if (error) throw error;
    const url = admin.storage.from("report-assets").getPublicUrl(path).data.publicUrl;

    return new Response(JSON.stringify({ ok: true, url, filename, eventos: eventos.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[logistica-relatorio-pdf]", e);
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
