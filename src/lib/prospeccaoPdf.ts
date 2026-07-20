import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PdfCol {
  header: string;
  key: string;
}

export function gerarPdfProspeccao(titulo: string, colunas: PdfCol[], linhas: any[], filename: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFontSize(14);
  doc.text(titulo, 14, 14);
  doc.setFontSize(9);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} · ${linhas.length} registro(s)`, 14, 20);

  autoTable(doc, {
    startY: 24,
    head: [colunas.map((c) => c.header)],
    body: linhas.map((r) => colunas.map((c) => {
      const v = r[c.key];
      if (v == null) return '';
      return String(v);
    })),
    styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 8, right: 8 },
  });

  doc.save(filename);
}
