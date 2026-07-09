// Exportação de HTML para PDF via html2canvas + jsPDF.
// Preparada para futura evolução (DOCX etc.).
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export interface PdfExportOptions {
  filename?: string;
  format?: "a4" | "letter";
  orientation?: "portrait" | "landscape";
  scale?: number;
}

/** Gera PDF a partir de um elemento renderizado. Retorna Blob. */
export async function elementToPdf(el: HTMLElement, opts: PdfExportOptions = {}): Promise<Blob> {
  const canvas = await html2canvas(el, {
    scale: opts.scale ?? 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });
  const imgData = canvas.toDataURL("image/jpeg", 0.95);

  const pdf = new jsPDF({
    unit: "mm",
    format: opts.format ?? "a4",
    orientation: opts.orientation ?? "portrait",
  });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // Escala imagem para largura da página, mantendo proporção
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;

  let heightLeft = imgH;
  let position = 0;

  pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
  heightLeft -= pageH;

  while (heightLeft > 0) {
    position = heightLeft - imgH;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
    heightLeft -= pageH;
  }

  return pdf.output("blob");
}

export async function downloadPdf(el: HTMLElement, opts: PdfExportOptions = {}): Promise<void> {
  const blob = await elementToPdf(el, opts);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = (opts.filename ?? "documento") + ".pdf";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Renderiza vários HTMLs num único PDF (uma "página lógica" após a outra). */
export async function renderHtmlsToPdf(htmls: string[], opts: PdfExportOptions = {}): Promise<Blob> {
  const pdf = new jsPDF({
    unit: "mm",
    format: opts.format ?? "a4",
    orientation: opts.orientation ?? "portrait",
  });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-10000px;top:0;";
  document.body.appendChild(container);

  try {
    for (let i = 0; i < htmls.length; i++) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:210mm;min-height:297mm;padding:20mm;box-sizing:border-box;background:#fff;color:#000;font-family:Arial,sans-serif;font-size:12pt;line-height:1.5;";
      el.innerHTML = htmls[i];
      container.appendChild(el);

      const canvas = await html2canvas(el, {
        scale: opts.scale ?? 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      let heightLeft = imgH;
      let position = 0;
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
        heightLeft -= pageH;
      }
      container.removeChild(el);
    }
  } finally {
    document.body.removeChild(container);
  }

  return pdf.output("blob");
}

export async function downloadHtmlsPdf(htmls: string[], opts: PdfExportOptions = {}): Promise<void> {
  const blob = await renderHtmlsToPdf(htmls, opts);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = (opts.filename ?? "documento") + ".pdf";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadHtml(html: string, filename = "documento"): void {
  const full = `<!doctype html><html><head><meta charset="utf-8"><title>${filename}</title></head><body>${html}</body></html>`;
  const blob = new Blob([full], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename + ".html";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function printHtml(html: string): void {
  const w = window.open("", "_blank", "width=800,height=1000");
  if (!w) return;
  w.document.write(
    `<html><head><meta charset="utf-8"><title>Imprimir</title><style>
      body{font-family:Arial,sans-serif;padding:20mm;color:#000;background:#fff}
      table{border-collapse:collapse;width:100%}
      table,th,td{border:1px solid #ccc;padding:4px}
      h1{font-size:24px} h2{font-size:20px} h3{font-size:16px}
    </style></head><body>${html}</body></html>`,
  );
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
    w.close();
  }, 300);
}
