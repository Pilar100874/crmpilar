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
  /** Modo inicial: "pdf" (padrão) mostra apenas exportação PDF; "print" mostra apenas impressão. */
  initialMode?: "pdf" | "print";
}

export function PreviewModal({
  open, onOpenChange, templateHtml, html = "", pages, titulo,
  missing = [], mergeConfig, onSave, initialMode = "pdf",
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


  const [mode, setMode] = useState<"pdf" | "print">("pdf");

  const renderPages = () => {
    if (pages && pages.length > 0) {
      return pages.map((pHtml, i) => (
        <PagePaper key={i} index={i} total={pages.length} html={pHtml} refEl={i === 0 ? pageRef : undefined} />
      ));
    }
    if (rows.length > 1) {
      return rows.map((r, i) => (
        <PagePaper
          key={i}
          index={i}
          total={rows.length}
          label={registroLabel(r)}
          html={renderForRow(r)}
          refEl={i === idx ? pageRef : undefined}
        />
      ));
    }
    return (
      <PagePaper
        index={0}
        total={1}
        html={currentHtml || '<p style="color:#999;text-align:center;padding:40px;">Documento vazio. Adicione conteúdo no editor.</p>'}
        refEl={pageRef}
        single
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-5 py-3 border-b bg-gradient-to-r from-background to-muted/40">
          <DialogTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Pré-visualização — <span className="text-muted-foreground font-normal">{titulo}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {totalItems > 1
              ? `${totalItems} registro(s) prontos para exportar ou imprimir.`
              : "Confira o documento antes de exportar."}
            {missing.length > 0 && (
              <span className="ml-2 text-amber-600">
                ⚠ Campos vazios: {missing.slice(0, 5).join(", ")}{missing.length > 5 ? "…" : ""}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "pdf" | "print")} className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between gap-3 px-4 py-2 border-b bg-background">
            <TabsList className="h-9">
              <TabsTrigger value="pdf" className="gap-1.5">
                <FileDown className="h-4 w-4" /> PDF
              </TabsTrigger>
              <TabsTrigger value="print" className="gap-1.5">
                <Printer className="h-4 w-4" /> Imprimir
              </TabsTrigger>
            </TabsList>

            {(loadingRows || totalItems > 1) && (
              <div className="flex-1 flex justify-center">
                {loadingRows ? (
                  <span className="text-xs text-muted-foreground">Carregando registros…</span>
                ) : pages && pages.length > 0 ? (
                  <RegistroNavigator total={pages.length} index={pageIdx} onChange={setPageIdx} label={`Página ${pageIdx + 1}`} />
                ) : (
                  <RegistroNavigator total={rows.length} index={idx} onChange={setIdx} label={registroLabel(rows[idx])} />
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => downloadHtml(getCleanHtml(currentIdx), titulo)}>
                <Download className="h-4 w-4 mr-1" /> HTML
              </Button>
              {onSave && (
                <Button size="sm" variant="outline" onClick={onSave}>Salvar histórico</Button>
              )}
            </div>
          </div>

          {/* ===== PDF ===== */}
          <TabsContent value="pdf" className="flex-1 flex flex-col min-h-0 m-0 data-[state=inactive]:hidden">
            <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-950/20 dark:to-amber-950/20">
              <span className="text-[11px] uppercase tracking-wide font-semibold text-rose-700 dark:text-rose-300 mr-2">
                Exportar PDF
              </span>
              <Button size="sm" onClick={pdfAtual} disabled={busy} className="bg-rose-600 hover:bg-rose-700 text-white">
                <FileDown className="h-4 w-4 mr-1" />
                {totalItems > 1 ? `Página ${currentIdx + 1}` : "Baixar PDF"}
              </Button>
              {totalItems > 1 && (
                <>
                  <Button size="sm" variant="outline" onClick={pdfUnico} disabled={busy}>
                    <Layers className="h-4 w-4 mr-1" /> 1 PDF único ({totalItems})
                  </Button>
                  <Button size="sm" variant="outline" onClick={pdfSeparados} disabled={busy}>
                    <Files className="h-4 w-4 mr-1" /> {totalItems} PDFs separados
                  </Button>
                </>
              )}
            </div>
            <div className="flex-1 overflow-auto bg-[radial-gradient(circle_at_20%_20%,hsl(var(--muted))_0%,hsl(var(--background))_60%)] p-8 space-y-8">
              {renderPages()}
            </div>
          </TabsContent>

          {/* ===== Imprimir ===== */}
          <TabsContent value="print" className="flex-1 flex flex-col min-h-0 m-0 data-[state=inactive]:hidden">
            <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-950/20 dark:to-indigo-950/20">
              <span className="text-[11px] uppercase tracking-wide font-semibold text-sky-700 dark:text-sky-300 mr-2">
                Impressão
              </span>
              <Button size="sm" onClick={imprimirAtual} disabled={busy} className="bg-sky-600 hover:bg-sky-700 text-white">
                <Printer className="h-4 w-4 mr-1" />
                {totalItems > 1 ? `Imprimir página ${currentIdx + 1}` : "Imprimir"}
              </Button>
              {totalItems > 1 && (
                <Button size="sm" variant="outline" onClick={imprimirTodos} disabled={busy}>
                  <Printer className="h-4 w-4 mr-1" /> Imprimir todas ({totalItems})
                </Button>
              )}
              <span className="text-[11px] text-muted-foreground ml-2">
                A caixa de diálogo do navegador permitirá escolher páginas específicas.
              </span>
            </div>
            <div className="flex-1 overflow-auto bg-neutral-200 dark:bg-neutral-900 p-8 space-y-8">
              {renderPages()}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

interface PagePaperProps {
  index: number;
  total: number;
  html: string;
  label?: string;
  refEl?: React.RefObject<HTMLDivElement>;
  single?: boolean;
}
function PagePaper({ index, total, html, label, refEl, single }: PagePaperProps) {
  return (
    <div className="mx-auto" style={{ width: "210mm" }}>
      {!single && (
        <div className="text-[11px] text-muted-foreground mb-1.5 flex items-center justify-between px-1">
          <span className="font-medium">Página {index + 1} de {total}</span>
          {label && <span className="truncate max-w-[60%] text-right opacity-80">{label}</span>}
        </div>
      )}
      <div
        ref={refEl}
        data-pdf-section
        className="bg-white text-black shadow-2xl ring-1 ring-black/5 rounded-sm"
        style={{
          width: "210mm",
          minHeight: "297mm",
          padding: "20mm",
          boxSizing: "border-box",
          fontFamily: "Arial, sans-serif",
          fontSize: "12pt",
          lineHeight: 1.5,
          pageBreakAfter: "always",
          breakAfter: "page",
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
