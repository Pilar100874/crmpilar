import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { limiteDoVeiculo, LIMITE_PADRAO_GLOBAL, carregarLimitesVelocidade } from '@/lib/logistica/limitesVelocidade';


export type PeriodoRelatorio = 'semanal' | 'mensal' | 'semestral';

export const PERIODO_LABEL: Record<PeriodoRelatorio, string> = {
  semanal: 'Semanal (últimos 7 dias)',
  mensal: 'Mensal (últimos 30 dias)',
  semestral: 'Semestral (últimos 180 dias)',
};

const PERIODO_DIAS: Record<PeriodoRelatorio, number> = {
  semanal: 7,
  mensal: 30,
  semestral: 180,
};

export interface EventoVelocidade {
  data: string;      // dd/MM/yyyy
  hora: string;      // HH:mm
  placa: string;
  motorista: string;
  velocidade: number;
  limite: number;    // limite aplicado ao veículo
  ts: number;
}


export interface RelatorioVelocidadeOpcoes {
  estabelecimentoId: string;
  periodo: PeriodoRelatorio;
  limiteKmh: number;
  titulo?: string;
  incluirGrafico?: boolean;
  veiculoIds?: string[];
}

export interface RelatorioVelocidadeResultado {
  eventos: EventoVelocidade[];
  blob: Blob;
  filename: string;
  url: string | null;
  inicio: Date;
  fim: Date;
}

const fmtData = (d: Date) => d.toLocaleDateString('pt-BR');
const fmtHora = (d: Date) =>
  d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Busca os eventos de velocidade excedida no período. */
export async function buscarEventosVelocidade(
  opts: RelatorioVelocidadeOpcoes
): Promise<{ eventos: EventoVelocidade[]; inicio: Date; fim: Date }> {
  const fim = new Date();
  const inicio = new Date(fim.getTime() - PERIODO_DIAS[opts.periodo] * 86400000);
  const limitePadrao = Number(opts.limiteKmh) || LIMITE_PADRAO_GLOBAL;
  await carregarLimitesVelocidade(opts.estabelecimentoId);


  let qVeic = supabase
    .from('veiculos')
    .select('id, placa, descricao, tipo_veiculo, limite_velocidade')
    .eq('estabelecimento_id', opts.estabelecimentoId);
  if (opts.veiculoIds?.length) qVeic = qVeic.in('id', opts.veiculoIds);
  const { data: veiculos } = await qVeic;

  const lista = (veiculos ?? []) as Array<{
    id: string;
    placa: string;
    descricao: string | null;
    tipo_veiculo: string | null;
    limite_velocidade: number | null;
  }>;
  if (!lista.length) return { eventos: [], inicio, fim };

  const placaPorId = new Map(lista.map((v) => [v.id, v.placa || v.descricao || '—']));
  // Limite efetivo por veículo (cadastro > tipo > padrão do bloco)
  const limitePorId = new Map(lista.map((v) => [v.id, limiteDoVeiculo(v, limitePadrao)]));
  const menorLimite = Math.min(...Array.from(limitePorId.values()));
  const ids = lista.map((v) => v.id);

  const { data: posicoes } = await supabase
    .from('veiculo_posicoes')
    .select('veiculo_id, velocidade, data_hora')
    .in('veiculo_id', ids)
    .gt('velocidade', menorLimite)
    .gte('data_hora', inicio.toISOString())
    .lte('data_hora', fim.toISOString())
    .order('data_hora', { ascending: true })
    .limit(5000);

  const brutos = ((posicoes ?? []) as Array<{ veiculo_id: string; velocidade: number; data_hora: string }>)
    .filter((p) => Number(p.velocidade) > (limitePorId.get(p.veiculo_id) ?? limitePadrao));
  if (!brutos.length) return { eventos: [], inicio, fim };


  // Motoristas: resolve pelo movimento de veículo vigente no instante do evento
  const { data: cvvs } = await (supabase as any)
    .from('cv_vehicles')
    .select('id, veiculo_id')
    .in('veiculo_id', ids);
  const cvvList = ((cvvs ?? []) as Array<{ id: string; veiculo_id: string }>);
  const cvvPorVeiculo = new Map(cvvList.map((c) => [c.veiculo_id, c.id]));

  let movs: Array<{ vehicle_id: string; driver_id: string; exit_time: string; entry_time: string | null }> = [];
  const nomePorDriver = new Map<string, string>();
  if (cvvList.length) {
    const { data: m } = await supabase
      .from('cv_vehicle_movements')
      .select('vehicle_id, driver_id, exit_time, entry_time')
      .in('vehicle_id', cvvList.map((c) => c.id))
      .lte('exit_time', fim.toISOString())
      .order('exit_time', { ascending: false })
      .limit(3000);
    movs = (m ?? []) as any[];
    const driverIds = Array.from(new Set(movs.map((x) => x.driver_id).filter(Boolean)));
    if (driverIds.length) {
      const { data: drivers } = await supabase
        .from('cv_drivers')
        .select('id, name')
        .in('id', driverIds);
      for (const d of (drivers ?? []) as any[]) nomePorDriver.set(d.id, d.name);
    }
  }

  const motoristaEm = (veiculoId: string, ts: number): string => {
    const cvvId = cvvPorVeiculo.get(veiculoId);
    if (!cvvId) return 'Não informado';
    for (const m of movs) {
      if (m.vehicle_id !== cvvId) continue;
      const saida = new Date(m.exit_time).getTime();
      const volta = m.entry_time ? new Date(m.entry_time).getTime() : Infinity;
      if (ts >= saida && ts <= volta) return nomePorDriver.get(m.driver_id) || 'Não informado';
    }
    return 'Não informado';
  };

  // Deduplica por veículo + minuto (evita dezenas de pontos do mesmo excesso)
  const vistos = new Set<string>();
  const eventos: EventoVelocidade[] = [];
  for (const p of brutos) {
    const d = new Date(p.data_hora);
    const chave = `${p.veiculo_id}:${Math.floor(d.getTime() / 60000)}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    eventos.push({
      data: fmtData(d),
      hora: fmtHora(d),
      placa: placaPorId.get(p.veiculo_id) || '—',
      motorista: motoristaEm(p.veiculo_id, d.getTime()),
      velocidade: Math.round(Number(p.velocidade) || 0),
      limite: limitePorId.get(p.veiculo_id) ?? limitePadrao,
      ts: d.getTime(),

    });
  }

  // Ordena por motorista (e data dentro de cada motorista)
  eventos.sort((a, b) =>
    a.motorista.localeCompare(b.motorista, 'pt-BR') || a.ts - b.ts
  );

  return { eventos, inicio, fim };
}

type LogoCarregado = { dataUrl: string; largura: number; altura: number };

async function carregarLogo(estabelecimentoId: string): Promise<LogoCarregado | null> {
  try {
    const { data } = await supabase
      .from('ecommerce_config')
      .select('logo_url')
      .eq('estabelecimento_id', estabelecimentoId)
      .maybeSingle();
    const url = (data as any)?.logo_url;
    if (!url) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
    if (!dataUrl) return null;

    // Mede as dimensões reais para preservar a proporção no PDF.
    const dims = await new Promise<{ w: number; h: number } | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
    if (!dims) return null;

    return { dataUrl, largura: dims.w, altura: dims.h };
  } catch {
    return null;
  }
}

/** Gera o PDF do relatório de velocidades excedidas e faz upload para o storage. */
export async function gerarRelatorioVelocidadePDF(
  opts: RelatorioVelocidadeOpcoes
): Promise<RelatorioVelocidadeResultado> {
  const { eventos, inicio, fim } = await buscarEventosVelocidade(opts);
  const logo = await carregarLogo(opts.estabelecimentoId);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const largura = doc.internal.pageSize.getWidth();
  const margem = 12;
  let y = 14;

  if (logo) {
    try {
      // Caixa máxima do logo: 32 x 18 mm, mantendo a proporção original.
      const maxW = 32;
      const maxH = 18;
      const escala = Math.min(maxW / logo.largura, maxH / logo.altura);
      const w = logo.largura * escala;
      const h = logo.altura * escala;
      const formato = logo.dataUrl.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
      doc.addImage(logo.dataUrl, formato, margem, y - 4 + (maxH - h) / 2, w, h, undefined, 'FAST');
    } catch { /* logo inválido */ }
  }


  const titulo = opts.titulo?.trim() || 'Relatório de Velocidades Excedidas no Período';
  doc.setFont('helvetica', 'bold').setFontSize(15);
  doc.text(titulo, largura / 2, y + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal').setFontSize(9);
  doc.text(
    `${PERIODO_LABEL[opts.periodo]}  ·  ${fmtData(inicio)} a ${fmtData(fim)}  ·  limite por veículo (padrão ${opts.limiteKmh} km/h)`,
    largura / 2,
    y + 10,
    { align: 'center' }
  );
  doc.text(`${eventos.length} ocorrência(s)`, largura / 2, y + 15, { align: 'center' });
  y += 24;

  autoTable(doc, {
    startY: y,
    head: [['Data', 'Placa', 'Motorista', 'Hora', 'Limite', 'Velocidade excedida']],
    body: eventos.map((e) => [
      e.data,
      e.placa,
      e.motorista,
      e.hora,
      `${e.limite} km/h`,
      `${e.velocidade} km/h (+${Math.max(0, e.velocidade - Number(e.limite || 0))})`,
    ]),

    styles: { fontSize: 8, cellPadding: 1.8, overflow: 'linebreak' },
    headStyles: { fillColor: [220, 38, 38], textColor: 255 },
    alternateRowStyles: { fillColor: [246, 247, 250] },
    margin: { left: margem, right: margem },
  });
  y = (doc as any).lastAutoTable.finalY + 12;

  if (opts.incluirGrafico !== false && eventos.length) {
    const contagem = new Map<string, number>();
    for (const e of eventos) contagem.set(e.motorista, (contagem.get(e.motorista) || 0) + 1);
    const ranking = Array.from(contagem.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const maxVal = Math.max(...ranking.map((r) => r[1]));
    const alturaGrafico = ranking.length * 8 + 22;

    if (y + alturaGrafico > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      y = 18;
    }

    doc.setFont('helvetica', 'bold').setFontSize(12);
    doc.text('Quem mais excede a velocidade', margem, y);
    y += 7;

    const xLabel = margem;
    const xBar = margem + 45;
    const larguraMax = largura - xBar - margem - 14;
    doc.setFont('helvetica', 'normal').setFontSize(8);

    for (const [nome, qtd] of ranking) {
      const w = Math.max(1.5, (qtd / maxVal) * larguraMax);
      doc.setTextColor(30);
      doc.text(nome.length > 26 ? `${nome.slice(0, 25)}…` : nome, xLabel, y + 3.6);
      doc.setFillColor(220, 38, 38);
      doc.rect(xBar, y, w, 5, 'F');
      doc.text(String(qtd), xBar + w + 2, y + 3.8);
      y += 8;
    }
    doc.setTextColor(0);
  }

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal').setFontSize(8);
    doc.text(
      `Gerado em ${new Date().toLocaleString('pt-BR')}  ·  Página ${i} de ${total}`,
      largura - margem,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'right' }
    );
  }

  const blob = doc.output('blob') as Blob;
  const filename = `relatorio-velocidade-${opts.periodo}-${Date.now()}.pdf`;

  let url: string | null = null;
  try {
    const path = `logistica/velocidade/${filename}`;
    const { error } = await supabase.storage
      .from('report-assets')
      .upload(path, blob, { contentType: 'application/pdf', upsert: true });
    if (!error) {
      url = supabase.storage.from('report-assets').getPublicUrl(path).data.publicUrl;
    }
  } catch { /* upload opcional */ }

  return { eventos, blob, filename, url, inicio, fim };
}
