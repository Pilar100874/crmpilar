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
