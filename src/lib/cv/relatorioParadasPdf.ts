import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { carregarChecklistPorOrdens, type ChecklistItem } from "./checklist";
import { PRIORIDADE_LABEL, type Prioridade } from "./ordens";
import { carregarPlanosPorId, calcularAtraso } from "./manutencao";

export interface FiltroRelatorioParadas {
  /** vazio = todos os veículos */
  vehicleIds?: string[];
  /** YYYY-MM-DD */
  inicio: string;
  /** YYYY-MM-DD */
  fim: string;
  /** inclui ordens ainda pendentes (independente do período) */
  incluirPendentes?: boolean;
}

const prio = (p: any): Prioridade => (p === "quebra" || p === "aguardar" ? p : "preventiva");
const dt = (v?: string | null) => (v ? new Date(v).toLocaleDateString("pt-BR") : "—");
const km = (v?: number | null) => (v == null ? "—" : Number(v).toLocaleString("pt-BR"));

async function carregarLogo(): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const { data } = await supabase
      .from("ecommerce_config")
      .select("logo_url")
      .not("logo_url", "is", null)
      .limit(1)
      .maybeSingle();
    const url = (data as any)?.logo_url;
    if (!url) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string | null>((r) => {
      const fr = new FileReader();
      fr.onload = () => r(String(fr.result));
      fr.onerror = () => r(null);
      fr.readAsDataURL(blob);
    });
    if (!dataUrl) return null;
    const dims = await new Promise<{ w: number; h: number } | null>((r) => {
      const img = new Image();
      img.onload = () => r({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
      img.onerror = () => r(null);
      img.src = dataUrl;
    });
    if (!dims) return null;
    return { dataUrl, ...dims };
  } catch {
    return null;
  }
}

export async function gerarRelatorioParadasPdf(filtro: FiltroRelatorioParadas) {
  const inicioIso = new Date(`${filtro.inicio}T00:00:00`).toISOString();
  const fimIso = new Date(`${filtro.fim}T23:59:59`).toISOString();

  let vq = supabase.from("cv_vehicles").select("*").order("name");
  if (filtro.vehicleIds?.length) vq = vq.in("id", filtro.vehicleIds);
  const { data: vData } = await vq;
  const veiculos = (vData ?? []) as any[];
  if (!veiculos.length) throw new Error("Nenhum veículo encontrado para o filtro");

  const ids = veiculos.map((v) => v.id);
  const { data: oData } = await supabase
    .from("cv_defect_reports")
    .select("*")
    .in("vehicle_id", ids)
    .order("reported_at", { ascending: false });
  const todas = (oData ?? []) as any[];

  const noPeriodo = (o: any) => {
    const ref = o.data_baixa || o.resolved_at || o.reported_at;
    return ref >= inicioIso && ref <= fimIso;
  };
  const ordens = todas.filter(
    (o) => noPeriodo(o) || (filtro.incluirPendentes !== false && o.status !== "resolved"),
  );
  if (!ordens.length) throw new Error("Nenhuma parada de manutenção no período selecionado");

  const checklists = await carregarChecklistPorOrdens(ordens.map((o) => o.id));
  const logo = await carregarLogo();

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const larguraPg = doc.internal.pageSize.getWidth();
  const margem = 12;
  let y = 14;

  if (logo) {
    try {
      const maxW = 30, maxH = 16;
      const esc = Math.min(maxW / logo.w, maxH / logo.h);
      const w = logo.w * esc, h = logo.h * esc;
      const fmt = logo.dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
      doc.addImage(logo.dataUrl, fmt, margem, y - 4, w, h, undefined, "FAST");
    } catch { /* logo inválido */ }
  }

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório de Paradas de Manutenção", larguraPg / 2, y + 2, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Período: ${dt(inicioIso)} a ${dt(fimIso)}  •  ${veiculos.length} veículo(s)  •  Emitido em ${new Date().toLocaleString("pt-BR")}`,
    larguraPg / 2, y + 8, { align: "center" },
  );
  y += 16;

  const pecasGerais = new Set<string>();
  let totalOrdens = 0, totalFeitos = 0, totalPendentes = 0, custoTotal = 0;

  for (const v of veiculos) {
    const minhas = ordens.filter((o) => o.vehicle_id === v.id);
    if (!minhas.length) continue;

    if (y > 250) { doc.addPage(); y = 16; }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${v.name ?? "—"} — ${v.plate ?? "—"}`, margem, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(`KM atual: ${km(v.current_km)}`, larguraPg - margem, y, { align: "right" });
    y += 3;

    const linhas: any[] = [];
    const pecasVeiculo = new Set<string>();
    const atrasoDe = (planId?: string | null) => {
      const plan = planId ? planos[planId] : null;
      if (!plan) return "—";
      const a = calcularAtraso(plan, v.current_km ?? 0);
      return a.atrasado ? a.label.replace("Atrasado ", "") : "Em dia";
    };

    for (const o of minhas) {
      totalOrdens++;
      custoTotal += Number(o.cost ?? 0);
      const chk = (checklists[o.id] ?? []) as ChecklistItem[];
      const situacao = o.status === "resolved" ? "CONCLUÍDA" : "PENDENTE";
      (o.pecas ?? "").split(/[;,\n]/).map((s: string) => s.trim()).filter(Boolean)
        .forEach((p: string) => { pecasVeiculo.add(p); pecasGerais.add(p); });

      linhas.push([
        dt(o.reported_at),
        o.defect_description ?? "—",
        o.status === "resolved" ? "—" : atrasoDe(o.maintenance_plan_id),
        PRIORIDADE_LABEL[prio(o.prioridade)],
        situacao,
        `${dt(o.data_baixa || o.resolved_at)}\n${km(o.km_baixa ?? o.vehicle_km)} km`,
        o.resolved_by ?? "—",
      ]);

      for (const c of chk) {
        const feito = c.feito === true;
        if (feito) totalFeitos++; else totalPendentes++;
        const p = (c as any).pecas as string | null;
        (p ?? "").split(/[;,\n]/).map((s) => s.trim()).filter(Boolean)
          .forEach((x) => { pecasVeiculo.add(x); pecasGerais.add(x); });
        linhas.push([
          "",
          `    ${feito ? "[X]" : "[  ]"} ${c.descricao}${p ? `  (${p})` : ""}${c.observacao ? `\n        Obs.: ${c.observacao}` : ""}`,
          feito ? "—" : atrasoDe((c as any).plan_id),
          "",
          feito ? "FEITO" : "PENDENTE",
          dt(c.done_at),
          c.done_by ?? "—",
        ]);
      }
    }

    autoTable(doc, {
      startY: y + 2,
      margin: { left: margem, right: margem },
      head: [["Aberta em", "Serviço / Checklist", "Atraso", "Prioridade", "Situação", "Baixa (data/KM)", "Responsável"]],
      body: linhas,
      styles: { fontSize: 7.5, cellPadding: 1.5, valign: "middle" },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 16 },
        1: { cellWidth: 62 },
        2: { cellWidth: 22 },
        3: { cellWidth: 20 },
        4: { cellWidth: 18 },
        5: { cellWidth: 24 },
        6: { cellWidth: 24 },
      },
      didParseCell: (d) => {
        const txt = String(d.cell.raw ?? "");
        if (d.section === "body" && d.column.index === 4) {
          if (txt === "PENDENTE") d.cell.styles.textColor = [180, 83, 9];
          if (txt === "FEITO" || txt === "CONCLUÍDA") d.cell.styles.textColor = [21, 128, 61];
        }
        if (d.section === "body" && d.column.index === 2) {
          if (txt.includes("km") || txt.includes("dia")) d.cell.styles.textColor = [190, 18, 60];
          if (txt === "Em dia") d.cell.styles.textColor = [21, 128, 61];
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 4;

    if (pecasVeiculo.size) {
      if (y > 265) { doc.addPage(); y = 16; }
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Peças / insumos:", margem, y);
      doc.setFont("helvetica", "normal");
      const texto = doc.splitTextToSize(
        Array.from(pecasVeiculo).join(" • "),
        larguraPg - margem * 2 - 26,
      );
      doc.text(texto, margem + 26, y);
      y += texto.length * 3.6 + 5;
    }
  }

  if (y > 235) { doc.addPage(); y = 16; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Resumo do período", margem, y);
  y += 2;
  autoTable(doc, {
    startY: y + 2,
    margin: { left: margem, right: margem },
    body: [
      ["Ordens de manutenção", String(totalOrdens)],
      ["Itens de checklist executados", String(totalFeitos)],
      ["Itens de checklist pendentes", String(totalPendentes)],
      ["Custo total registrado", custoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })],
      ["Peças / insumos distintos", String(pecasGerais.size)],
    ],
    styles: { fontSize: 8, cellPadding: 1.8 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } },
    theme: "grid",
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  if (pecasGerais.size) {
    if (y > 260) { doc.addPage(); y = 16; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Lista consolidada de peças / insumos", margem, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const linhas = doc.splitTextToSize(Array.from(pecasGerais).join(" • "), larguraPg - margem * 2);
    doc.text(linhas, margem, y);
    y += linhas.length * 3.6 + 6;
  }

  if (y > 258) { doc.addPage(); y = 20; }
  doc.setFontSize(8);
  doc.text("__________________________________", margem, y + 12);
  doc.text("Mecânico responsável", margem + 6, y + 16);
  doc.text("__________________________________", larguraPg / 2 + 6, y + 12);
  doc.text("Encarregado de manutenção", larguraPg / 2 + 12, y + 16);

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.text(`Página ${i} de ${total}`, larguraPg - margem, doc.internal.pageSize.getHeight() - 8, { align: "right" });
  }

  const nome = `paradas-manutencao_${filtro.inicio}_a_${filtro.fim}.pdf`;
  doc.save(nome);
  return { ordens: totalOrdens, veiculos: veiculos.length, arquivo: nome };
}
