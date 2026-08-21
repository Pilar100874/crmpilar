import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ExportOptions {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  filename?: string;
  orientation?: "portrait" | "landscape";
}

export function exportToPdf({
  title,
  headers,
  rows,
  filename,
  orientation = "portrait",
}: ExportOptions) {
  const doc = new jsPDF({ orientation });
  
  const now = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text(title, 14, 20);

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Gerado em ${now} • Pilar Ferramentas`, 14, 28);

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 34,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 30, 60], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 245, 250] },
    margin: { left: 14, right: 14 },
  });

  addPageFooters(doc);

  const safeName = filename || title.toLowerCase().replace(/\s+/g, "-");
  doc.save(`${safeName}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

function addPageFooters(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

interface ToolWithPhoto {
  name: string;
  type: string;
  warehouse: string;
  status: string;
  purchaseDate: string;
  value: string;
  photoUrl: string | null;
}

export async function exportToolsPdfWithPhotos(
  tools: ToolWithPhoto[],
  onProgress?: (current: number, total: number) => void
) {
  const doc = new jsPDF({ orientation: "landscape" });
  const now = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  const imgSize = 18;
  const rowHeight = 22;

  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text("Relatório de Ferramentas (com Foto)", 14, 20);

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Gerado em ${now} • Pilar Ferramentas • ${tools.length} ferramentas`, 14, 28);

  // Load all images first
  const imageCache: Map<string, string | null> = new Map();
  for (let i = 0; i < tools.length; i++) {
    const tool = tools[i];
    if (tool.photoUrl) {
      onProgress?.(i + 1, tools.length);
      const base64 = await loadImageAsBase64(tool.photoUrl);
      imageCache.set(tool.photoUrl, base64);
    }
  }

  // Build table with image placeholders
  const headers = ["Foto", "Nome", "Tipo", "Almoxarifado", "Status", "Data Compra", "Valor"];
  const body = tools.map((t) => ["", t.name, t.type, t.warehouse, t.status, t.purchaseDate, t.value]);

  autoTable(doc, {
    head: [headers],
    body,
    startY: 34,
    styles: { fontSize: 8, cellPadding: 3, minCellHeight: rowHeight },
    headStyles: { fillColor: [30, 30, 60], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 245, 250] },
    columnStyles: { 0: { cellWidth: imgSize + 6 } },
    margin: { left: 14, right: 14 },
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        const tool = tools[data.row.index];
        if (tool?.photoUrl) {
          const base64 = imageCache.get(tool.photoUrl);
          if (base64) {
            try {
              const x = data.cell.x + (data.cell.width - imgSize) / 2;
              const y = data.cell.y + (data.cell.height - imgSize) / 2;
              doc.addImage(base64, "JPEG", x, y, imgSize, imgSize);
            } catch {
              // Skip image if it can't be added
            }
          }
        }
      }
    },
  });

  addPageFooters(doc);
  doc.save(`ferramentas-com-foto-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
