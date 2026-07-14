import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

export interface LayoutPreset {
  id: string;
  nome: string;
  largura_mm: number;
  altura_mm: number;
  colunas: number;
  gap_mm: number;
}

export const LAYOUTS: LayoutPreset[] = [
  { id: "100x30x1", nome: "100 x 30 mm (1 coluna)", largura_mm: 100, altura_mm: 30, colunas: 1, gap_mm: 2 },
  { id: "50x30x2",  nome: "50 x 30 mm (2 colunas)", largura_mm: 50,  altura_mm: 30, colunas: 2, gap_mm: 2 },
  { id: "100x25x1", nome: "100 x 25 mm (1 coluna)", largura_mm: 100, altura_mm: 25, colunas: 1, gap_mm: 2 },
  { id: "100x50x1", nome: "100 x 50 mm (1 coluna)", largura_mm: 100, altura_mm: 50, colunas: 1, gap_mm: 2 },
];

export type ElementType = "text" | "image" | "barcode_ean13" | "barcode_ean14" | "qrcode";

export interface EtiquetaElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  content: string;
  fontSize?: number;
  bold?: boolean;
  align?: "left" | "center" | "right";
}

export interface SavedTemplate {
  id: string;
  nome: string;
  layoutId: string;
  elements: EtiquetaElement[];
  updatedAt: number;
}

export interface TemplateDefaults {
  ean13?: string;
  ean14?: string;
}

export const PRODUCT_VARS: { key: string; label: string }[] = [
  { key: "nome", label: "Nome" },
  { key: "codigo", label: "Código / SKU" },
  { key: "descricao", label: "Descrição" },
  { key: "preco_tabela", label: "Preço" },
  { key: "preco_minimo", label: "Preço Mínimo" },
  { key: "ean_13", label: "EAN 13" },
  { key: "ean_14_1", label: "EAN 14 (1)" },
  { key: "ean_14_2", label: "EAN 14 (2)" },
  { key: "gtin", label: "GTIN" },
  { key: "marca", label: "Marca" },
  { key: "cor", label: "Cor" },
  { key: "tamanho", label: "Tamanho" },
  { key: "material", label: "Material" },
  { key: "ncm", label: "NCM" },
  { key: "peso_unitario", label: "Peso" },
  { key: "estoque", label: "Estoque" },
];

const templatesKey = (estab: string) => `zebra_templates_v2_${estab}`;
const defaultsKey = (estab: string) => `zebra_template_defaults_${estab}`;

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function loadTemplates(estab: string): SavedTemplate[] {
  try {
    const raw = localStorage.getItem(templatesKey(estab));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function saveTemplates(estab: string, templates: SavedTemplate[]) {
  localStorage.setItem(templatesKey(estab), JSON.stringify(templates));
}

export function loadDefaults(estab: string): TemplateDefaults {
  try {
    const raw = localStorage.getItem(defaultsKey(estab));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveDefaults(estab: string, defs: TemplateDefaults) {
  localStorage.setItem(defaultsKey(estab), JSON.stringify(defs));
}

export function getTemplateForBarcode(estab: string, kind: "ean13" | "ean14"): SavedTemplate | null {
  const defs = loadDefaults(estab);
  const id = defs[kind];
  if (!id) return null;
  return loadTemplates(estab).find(t => t.id === id) || null;
}

export function defaultTemplate(layout: LayoutPreset): EtiquetaElement[] {
  return [
    { id: uid(), type: "text", x: 2, y: 1.5, w: layout.largura_mm - 4, h: 4, content: "{{nome}}", fontSize: 9, bold: true, align: "left" },
    { id: uid(), type: "text", x: 2, y: 6, w: layout.largura_mm - 4, h: 3.5, content: "Cód: {{codigo}}", fontSize: 7, align: "left" },
    { id: uid(), type: "barcode_ean13", x: 2, y: layout.altura_mm - 15, w: Math.min(50, layout.largura_mm - 4), h: 12, content: "{{ean_13}}" },
  ];
}

export function interpolate(text: string, product: any): string {
  return (text || "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const v = product?.[key];
    if (v === null || v === undefined || v === "") return "";
    if (key === "preco_tabela" || key === "preco_minimo") {
      const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
      if (!isNaN(n)) return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
    return String(v);
  });
}

export async function renderBarcodeDataURL(value: string, format: "EAN13" | "ITF14"): Promise<string> {
  try {
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, value, { format, width: 2, height: 60, displayValue: true, margin: 0, fontSize: 14 });
    return canvas.toDataURL("image/png");
  } catch { return ""; }
}

export async function renderQRDataURL(value: string): Promise<string> {
  try { return await QRCode.toDataURL(value || " ", { margin: 0, width: 200 }); }
  catch { return ""; }
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export async function buildPrintHTML(layout: LayoutPreset, elements: EtiquetaElement[], items: any[]): Promise<string> {
  const pageWidth = layout.largura_mm * layout.colunas + layout.gap_mm * (layout.colunas - 1);
  const pageHeight = layout.altura_mm;

  const renderCell = async (product: any) => {
    const parts: string[] = [];
    for (const el of elements) {
      const value = interpolate(el.content, product || {});
      let inner = "";
      if (el.type === "text") {
        inner = `<div style="width:100%;height:100%;font-size:${el.fontSize || 8}pt;font-weight:${el.bold ? 700 : 400};text-align:${el.align || "left"};line-height:1.05;overflow:hidden;">${escapeHtml(value)}</div>`;
      } else if (el.type === "image") {
        inner = value ? `<img src="${value}" style="width:100%;height:100%;object-fit:contain;"/>` : "";
      } else if (el.type === "barcode_ean13") {
        const d = await renderBarcodeDataURL(value.replace(/\D/g, "").slice(0, 13) || "0000000000000", "EAN13");
        inner = `<img src="${d}" style="width:100%;height:100%;object-fit:contain;"/>`;
      } else if (el.type === "barcode_ean14") {
        const d = await renderBarcodeDataURL(value.replace(/\D/g, "").slice(0, 14) || "00000000000000", "ITF14");
        inner = `<img src="${d}" style="width:100%;height:100%;object-fit:contain;"/>`;
      } else if (el.type === "qrcode") {
        const d = await renderQRDataURL(value || " ");
        inner = `<img src="${d}" style="width:100%;height:100%;object-fit:contain;"/>`;
      }
      parts.push(`<div style="position:absolute;left:${el.x}mm;top:${el.y}mm;width:${el.w}mm;height:${el.h}mm;overflow:hidden;">${inner}</div>`);
    }
    return `<div style="position:relative;width:${layout.largura_mm}mm;height:${layout.altura_mm}mm;box-sizing:border-box;">${parts.join("")}</div>`;
  };

  const pageHTMLs: string[] = [];
  for (const prod of items) {
    const cells: string[] = [];
    for (let c = 0; c < layout.colunas; c++) cells.push(await renderCell(prod));
    pageHTMLs.push(`<div class="page" style="display:flex;gap:${layout.gap_mm}mm;width:${pageWidth}mm;height:${pageHeight}mm;">${cells.join("")}</div>`);
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Etiquetas Zebra</title>
<style>
  @page { size: ${pageWidth}mm ${pageHeight}mm; margin: 0; }
  html,body { margin:0; padding:0; }
  body { font-family: Arial, sans-serif; }
  .page { page-break-after: always; overflow: hidden; }
  .page:last-child { page-break-after: auto; }
</style></head><body>${pageHTMLs.join("")}</body></html>`;
}

export async function printZebraLabels(template: SavedTemplate, product: any, quantity: number) {
  const layout = LAYOUTS.find(l => l.id === template.layoutId);
  if (!layout) throw new Error("Layout do template não encontrado");
  const items = Array.from({ length: Math.max(1, quantity) }, () => product);
  const html = await buildPrintHTML(layout, template.elements, items);
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) throw new Error("Popup bloqueado pelo navegador. Habilite popups para este site.");
  w.document.open();
  w.document.write(html);
  w.document.close();
  // Espera imagens (barcodes/QR) carregarem antes de imprimir
  const doPrint = () => {
    try {
      const imgs = Array.from(w.document.images || []);
      const pending = imgs.filter(i => !i.complete);
      if (pending.length === 0) { w.focus(); w.print(); return; }
      let remaining = pending.length;
      const done = () => { if (--remaining <= 0) { w.focus(); w.print(); } };
      pending.forEach(i => { i.addEventListener("load", done); i.addEventListener("error", done); });
      // fallback
      setTimeout(() => { try { w.focus(); w.print(); } catch {} }, 1500);
    } catch { try { w.focus(); w.print(); } catch {} }
  };
  if (w.document.readyState === "complete") setTimeout(doPrint, 100);
  else w.addEventListener("load", () => setTimeout(doPrint, 100));
}
