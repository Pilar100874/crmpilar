import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type LinhaRelatorio = { unidade: string; funcionario: string; epi: string; ca: string; entrega: string; vencimento: string; situacao: string };

/** Agrupa as linhas por unidade (ordem alfabética), ordenando por vencimento. */
export function agruparPorUnidade(linhas: LinhaRelatorio[]): [string, LinhaRelatorio[]][] {
  const m = new Map<string, LinhaRelatorio[]>();
  for (const l of linhas) m.set(l.unidade, [...(m.get(l.unidade) ?? []), l]);
  return [...m.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
    .map(([u, ls]) => [u, ls.sort((x, y) => x.vencimento.localeCompare(y.vencimento))]);
}

const br = (d: string) => (d ? d.split("-").reverse().join("/") : "—");

export function gerarPdfVencimentos(linhas: LinhaRelatorio[], titulo: string) {
  const doc = new jsPDF();
  const grupos = agruparPorUnidade(linhas);
  doc.setFontSize(14); doc.text(titulo, 14, 16);
  doc.setFontSize(9); doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, 14, 22);
  let y = 28;
  if (!grupos.length) doc.text("Nenhum EPI vencido ou vencendo.", 14, y);
  for (const [unidade, ls] of grupos) {
    doc.setFontSize(11); doc.text(`Unidade: ${unidade} (${ls.length})`, 14, y);
    autoTable(doc, {
      startY: y + 2,
      head: [["Funcionário", "EPI", "CA", "Entrega", "Vencimento", "Situação"]],
      body: ls.map((l) => [l.funcionario, l.epi, l.ca, br(l.entrega), br(l.vencimento), l.situacao]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [60, 60, 60] },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
    if (y > 270) { doc.addPage(); y = 16; }
  }
  doc.save(`epi-vencimentos-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export type FichaPdf = {
  funcionario: string; email: string; unidade: string; setor: string;
  exigidos: string[];
  linhas: { data: string; epi: string; quantidade: number; ca: string; motivo: string; troca: string; devolucao: string }[];
};

/** Ficha de controle de entrega de EPI do funcionário (NR-6), com campo de assinatura em papel. */
export function gerarPdfFicha(f: FichaPdf) {
  const doc = new jsPDF();
  doc.setFontSize(14); doc.text("Ficha de Controle de Entrega de EPI", 14, 16);
  doc.setFontSize(9);
  doc.text(`Funcionário: ${f.funcionario}`, 14, 24);
  doc.text(`E-mail: ${f.email}`, 110, 24);
  doc.text(`Unidade: ${f.unidade}`, 14, 30);
  doc.text(`Setor: ${f.setor}`, 110, 30);
  const exig = doc.splitTextToSize(`EPIs exigidos pelo setor: ${f.exigidos.length ? f.exigidos.join(", ") : "—"}`, 182);
  doc.text(exig, 14, 36);
  autoTable(doc, {
    startY: 38 + exig.length * 4,
    head: [["Data", "EPI", "Qtd", "CA", "Motivo", "Troca prevista", "Devolução", "Assinatura"]],
    body: f.linhas.map((l) => [br(l.data), l.epi, String(l.quantidade), l.ca, l.motivo, br(l.troca), l.devolucao || "—", ""]),
    styles: { fontSize: 8, minCellHeight: 9 },
    columnStyles: { 7: { cellWidth: 32 } },
    headStyles: { fillColor: [60, 60, 60] },
  });
  let y = (doc as any).lastAutoTable.finalY + 10;
  if (y > 250) { doc.addPage(); y = 20; }
  const termo = doc.splitTextToSize("Declaro ter recebido os EPIs acima, gratuitamente, e ter sido orientado sobre seu uso, guarda e conservação, comprometendo-me a usá-los apenas para a finalidade a que se destinam e a comunicar qualquer alteração que os torne impróprios (NR-6 e art. 158 da CLT).", 182);
  doc.text(termo, 14, y);
  y += termo.length * 4 + 18;
  doc.line(14, y, 100, y); doc.text("Assinatura do funcionário", 14, y + 5);
  doc.line(115, y, 196, y); doc.text("Data", 115, y + 5);
  doc.save(`ficha-epi-${f.funcionario.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

export type FuncSituacao = { funcionario: string; atuais: { epi: string; qtd: number; troca: string; situacao: string }[]; faltam: string[] };

/** PDF por setor: EPIs atuais de cada funcionário e o que falta conforme o setor. */
export function gerarPdfSetores(setores: { setor: string; exigidos: string[]; funcionarios: FuncSituacao[] }[]) {
  const doc = new jsPDF();
  doc.setFontSize(14); doc.text("EPIs por setor — situação dos funcionários", 14, 16);
  doc.setFontSize(9); doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, 14, 22);
  let y = 30;
  for (const s of setores) {
    if (y > 250) { doc.addPage(); y = 16; }
    doc.setFontSize(11); doc.text(`Setor: ${s.setor} (${s.funcionarios.length} funcionário(s))`, 14, y);
    doc.setFontSize(8);
    const ex = doc.splitTextToSize(`Exigidos: ${s.exigidos.join(", ") || "nenhum EPI definido"}`, 182);
    doc.text(ex, 14, y + 5);
    autoTable(doc, {
      startY: y + 7 + ex.length * 3.5,
      head: [["Funcionário", "EPIs atuais (troca prevista)", "Falta entregar"]],
      body: s.funcionarios.length ? s.funcionarios.map((f) => [
        f.funcionario,
        f.atuais.map((a) => `${a.qtd}× ${a.epi} — ${a.situacao}${a.troca ? ` (${br(a.troca)})` : ""}`).join("\n") || "—",
        f.faltam.join("\n") || "Em dia",
      ]) : [["Nenhum funcionário neste setor", "", ""]],
      styles: { fontSize: 8 }, headStyles: { fillColor: [60, 60, 60] },
      columnStyles: { 0: { cellWidth: 45 }, 2: { cellWidth: 50 } },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }
  doc.save(`epi-por-setor-${new Date().toISOString().slice(0, 10)}.pdf`);
}
