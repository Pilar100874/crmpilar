import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, Printer, FileDown, Layers, FileText, Files } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { downloadPdf, downloadHtml, printHtml, elementToPdf } from "@/lib/editores/pdfExport";
import { renderTemplate } from "@/lib/editores/mergeEngine";
import { runMergeConfig } from "@/lib/editores/runMergeConfig";
import type { MergeConfig } from "@/components/editores/MergeBuilderDialog";
import { RegistroNavigator } from "@/components/editores/RegistroNavigator";
import { toast } from "@/lib/toast-config";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Template HTML original com {{campos}}. Se omitido, usa `html` já renderizado. */
  templateHtml?: string;
  /** HTML já renderizado (fallback quando não há mergeConfig). */
  html?: string;
  /** Páginas já renderizadas (uma por registro). Se fornecido, ignora mergeConfig/rows. */
  pages?: string[];
  titulo: string;
  missing?: string[];
  mergeConfig?: MergeConfig | null;
  onSave?: () => void;
}

export function PreviewModal({
  open, onOpenChange, templateHtml, html = "", pages, titulo,
  missing = [], mergeConfig, onSave,
}: Props) {
  const pageRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const [loadingRows, setLoadingRows] = useState(false);
  const [busy, setBusy] = useState(false);

  // Normaliza: aceita mergeConfig com { configs: [...] } (formato do ModeloEditor)
  const effectiveMerge = useMemo(() => {
    const anyMc: any = mergeConfig;
    if (!anyMc) return null;
    if (Array.isArray(anyMc.configs) && anyMc.configs.length) {
      const primary =
        anyMc.configs.find((c: any) => c?.primary) ||
        anyMc.configs.find((c: any) => c?.tabela || (c?.mode === "sql" && c?.sql)) ||
        anyMc.configs[0];
      return primary ?? null;
    }
    return anyMc;
  }, [mergeConfig]);

  useEffect(() => {
    if (!open) return;
    if (effectiveMerge?.tabela || (effectiveMerge?.mode === "sql" && effectiveMerge?.sql)) {
      setLoadingRows(true);
      runMergeConfig(effectiveMerge)
        .then((r) => { setRows(r); setIdx(0); })
        .finally(() => setLoadingRows(false));
    } else {
      setRows([]);
      setIdx(0);
    }
  }, [open, effectiveMerge]);

  const registroLabel = (r: any): string => {
    if (!r) return "";
    return r.nome || r.nome_fantasia || r.razao_social || r.titulo || r.numero_pedido || r.numero || r.id || "";
  };

  /** Renderiza o HTML de um registro específico (ou o html cru se sem merge). */
  const renderForRow = (row: any): string => {
    if (!templateHtml) return html;
    const dados: Record<string, any> = { data_atual: new Date().toLocaleDateString("pt-BR") };
    if (row && effectiveMerge?.alias) dados[effectiveMerge.alias] = row;
    if (row) Object.assign(dados, row);
    return renderTemplate(templateHtml, dados, { highlightMissing: true }).html;
  };

  const renderCleanForRow = (row: any): string => {
    if (!templateHtml) return html;
    const dados: Record<string, any> = { data_atual: new Date().toLocaleDateString("pt-BR") };
    if (row && effectiveMerge?.alias) dados[effectiveMerge.alias] = row;
    if (row) Object.assign(dados, row);
    return renderTemplate(templateHtml, dados, { highlightMissing: false }).html;
  };

  const currentHtml = useMemo(
    () => (rows.length ? renderForRow(rows[idx]) : renderForRow(null)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, idx, templateHtml, html, effectiveMerge?.alias],
  );

  // ---------- Fonte unificada de páginas ----------
  const totalItems = pages && pages.length > 0 ? pages.length : rows.length;
  const getCleanHtml = (i: number): string => {
    if (pages && pages.length > 0) return pages[Math.min(i, pages.length - 1)] ?? "";
    if (rows.length) return renderCleanForRow(rows[Math.min(i, rows.length - 1)]);
    return html;
  };

  const [pageIdx, setPageIdx] = useState(0);
  useEffect(() => { setPageIdx(0); }, [pages, rows.length]);
  const currentIdx = pages && pages.length > 0 ? pageIdx : idx;

  const buildPageEl = (html: string): HTMLDivElement => {
    const el = document.createElement("div");
    el.style.cssText = "width:210mm;min-height:297mm;padding:20mm;box-sizing:border-box;font-family:Arial,sans-serif;font-size:12pt;line-height:1.5;color:#000;background:#fff;";
    el.innerHTML = html;
    return el;
  };

  // ---------- Ações ----------
  const pdfAtual = async () => {
    setBusy(true);
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-99999px;top:0;background:#fff;";
    document.body.appendChild(host);
    try {
      const el = buildPageEl(getCleanHtml(currentIdx));
      host.appendChild(el);
      await downloadPdf(el, { filename: `${titulo}${totalItems > 1 ? `_${currentIdx + 1}` : ""}` });
    } finally {
      document.body.removeChild(host);
      setBusy(false);
    }
  };

  const pdfUnico = async () => {
    if (totalItems <= 1) return pdfAtual();
    setBusy(true);
    const { default: jsPDF } = await import("jspdf");
    const html2canvas = (await import("html2canvas")).default;
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-99999px;top:0;background:#fff;";
    document.body.appendChild(host);
    try {
      for (let i = 0; i < totalItems; i++) {
        const el = buildPageEl(getCleanHtml(i));
        host.appendChild(el);
        const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#fff", logging: false });
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const imgH = (canvas.height * pageW) / canvas.width;
        let heightLeft = imgH;
        let position = 0;
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pageW, imgH);
        heightLeft -= pageH;
        while (heightLeft > 0) {
          position = heightLeft - imgH;
          pdf.addPage();
          pdf.addImage(imgData, "JPEG", 0, position, pageW, imgH);
          heightLeft -= pageH;
        }
        host.removeChild(el);
      }
      const url = URL.createObjectURL(pdf.output("blob"));
      const a = document.createElement("a");
      a.href = url; a.download = `${titulo}_todos.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`PDF único gerado com ${totalItems} registros`);
    } catch (e: any) {
      toast.error("Erro ao gerar PDF: " + (e?.message ?? ""));
    } finally {
      document.body.removeChild(host);
      setBusy(false);
    }
  };

  const pdfSeparados = async () => {
    if (totalItems <= 1) return pdfAtual();
    setBusy(true);
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-99999px;top:0;background:#fff;";
    document.body.appendChild(host);
    try {
      for (let i = 0; i < totalItems; i++) {
        const el = buildPageEl(getCleanHtml(i));
        host.appendChild(el);
        await downloadPdf(el, { filename: `${titulo}_${i + 1}` });
        host.removeChild(el);
      }
      toast.success(`${totalItems} PDFs gerados`);
    } catch (e: any) {
      toast.error("Erro ao gerar PDFs: " + (e?.message ?? ""));
    } finally {
      document.body.removeChild(host);
      setBusy(false);
    }
  };

  const imprimirAtual = () => printHtml(getCleanHtml(currentIdx));

  const imprimirTodos = () => {
    if (totalItems <= 1) return imprimirAtual();
    const paginas = Array.from({ length: totalItems }, (_, i) =>
      `<section style="page-break-after:${i < totalItems - 1 ? "always" : "auto"};padding:20mm;">${getCleanHtml(i)}</section>`
    ).join("");
    printHtml(paginas);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] p-0 flex flex-col">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Pré-visualização — {titulo}</DialogTitle>
          <DialogDescription>
            {rows.length > 0
              ? `Navegue entre os ${rows.length} registro(s) e imprima/gere PDF.`
              : "Confira o documento. Campos vazios ficam destacados em amarelo."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 p-3 border-b bg-muted/30">
          <Button size="sm" onClick={pdfAtual} disabled={busy}>
            <FileDown className="h-4 w-4 mr-1" /> PDF {totalItems > 1 ? `página ${currentIdx + 1}` : ""}
          </Button>
          <Button size="sm" variant="outline" onClick={imprimirAtual} disabled={busy}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir {totalItems > 1 ? `página ${currentIdx + 1}` : ""}
          </Button>
          {totalItems > 1 && (
            <>
              <Button size="sm" variant="secondary" onClick={pdfUnico} disabled={busy}>
                <Layers className="h-4 w-4 mr-1" /> PDF único ({totalItems})
              </Button>
              <Button size="sm" variant="secondary" onClick={pdfSeparados} disabled={busy}>
                <FileDown className="h-4 w-4 mr-1" /> PDFs separados ({totalItems})
              </Button>
              <Button size="sm" variant="secondary" onClick={imprimirTodos} disabled={busy}>
                <Printer className="h-4 w-4 mr-1" /> Imprimir todas
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => downloadHtml(getCleanHtml(currentIdx), titulo)}>
            <Download className="h-4 w-4 mr-1" /> HTML
          </Button>
          {onSave && (
            <Button size="sm" variant="secondary" onClick={onSave}>Salvar no histórico</Button>
          )}
          {missing.length > 0 && (
            <span className="ml-auto text-xs text-amber-600">
              ⚠ Vazios: {missing.slice(0, 5).join(", ")}{missing.length > 5 ? "…" : ""}
            </span>
          )}
        </div>

        {(loadingRows || totalItems > 1) && (
          <div className="flex items-center gap-3 border-b p-2 bg-background">
            {loadingRows ? (
              <span className="text-xs text-muted-foreground">Carregando registros…</span>
            ) : pages && pages.length > 0 ? (
              <RegistroNavigator
                total={pages.length}
                index={pageIdx}
                onChange={setPageIdx}
                label={`Página ${pageIdx + 1} de ${pages.length}`}
              />
            ) : (
              <RegistroNavigator
                total={rows.length}
                index={idx}
                onChange={setIdx}
                label={registroLabel(rows[idx])}
              />
            )}
          </div>
        )}


        <div className="flex-1 overflow-auto bg-muted/20 p-6 space-y-6">
          {pages && pages.length > 0 ? (
            pages.map((pHtml, i) => (
              <div key={i} className="mx-auto" style={{ width: "210mm" }}>
                {pages.length > 1 && (
                  <div className="text-[11px] text-muted-foreground mb-1 px-1">
                    Página {i + 1} de {pages.length}
                  </div>
                )}
                <div
                  ref={i === 0 ? pageRef : undefined}
                  data-pdf-section
                  className="bg-white text-black shadow-xl"
                  style={{ width: "210mm", minHeight: "297mm", padding: "20mm", boxSizing: "border-box", fontFamily: "Arial, sans-serif", fontSize: "12pt", lineHeight: 1.5, pageBreakAfter: "always", breakAfter: "page" }}
                  dangerouslySetInnerHTML={{ __html: pHtml }}
                />
              </div>
            ))
          ) : rows.length > 1 ? (
            rows.map((r, i) => (
              <div key={i} className="mx-auto" style={{ width: "210mm" }}>
                <div className="text-[11px] text-muted-foreground mb-1 flex items-center justify-between px-1">
                  <span>Página {i + 1} de {rows.length}</span>
                  <span className="truncate max-w-[60%] text-right">{registroLabel(r)}</span>
                </div>
                <div
                  ref={i === idx ? pageRef : undefined}
                  data-pdf-section
                  className="bg-white text-black shadow-xl"
                  style={{ width: "210mm", minHeight: "297mm", padding: "20mm", boxSizing: "border-box", fontFamily: "Arial, sans-serif", fontSize: "12pt", lineHeight: 1.5, pageBreakAfter: "always", breakAfter: "page" }}
                  dangerouslySetInnerHTML={{ __html: renderForRow(r) }}
                />
              </div>
            ))
          ) : (
            <div
              ref={pageRef}
              data-pdf-section
              className="bg-white text-black shadow-xl mx-auto"
              style={{ width: "210mm", minHeight: "297mm", padding: "20mm", boxSizing: "border-box", fontFamily: "Arial, sans-serif", fontSize: "12pt", lineHeight: 1.5 }}
              dangerouslySetInnerHTML={{ __html: currentHtml || '<p style="color:#999;text-align:center;padding:40px;">Documento vazio. Adicione conteúdo no editor.</p>' }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
