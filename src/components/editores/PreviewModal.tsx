import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, FileDown, Layers } from "lucide-react";
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
  titulo: string;
  missing?: string[];
  mergeConfig?: MergeConfig | null;
  onSave?: () => void;
}

export function PreviewModal({
  open, onOpenChange, templateHtml, html = "", titulo,
  missing = [], mergeConfig, onSave,
}: Props) {
  const pageRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const [loadingRows, setLoadingRows] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mergeConfig?.tabela) {
      setLoadingRows(true);
      runMergeConfig(mergeConfig)
        .then((r) => { setRows(r); setIdx(0); })
        .finally(() => setLoadingRows(false));
    } else {
      setRows([]);
      setIdx(0);
    }
  }, [open, mergeConfig]);

  const registroLabel = (r: any): string => {
    if (!r) return "";
    return r.nome || r.nome_fantasia || r.razao_social || r.titulo || r.numero_pedido || r.numero || r.id || "";
  };

  /** Renderiza o HTML de um registro específico (ou o html cru se sem merge). */
  const renderForRow = (row: any): string => {
    if (!templateHtml) return html;
    const dados: Record<string, any> = { data_atual: new Date().toLocaleDateString("pt-BR") };
    if (row && mergeConfig?.alias) dados[mergeConfig.alias] = row;
    if (row) Object.assign(dados, row);
    return renderTemplate(templateHtml, dados, { highlightMissing: true }).html;
  };

  const renderCleanForRow = (row: any): string => {
    if (!templateHtml) return html;
    const dados: Record<string, any> = { data_atual: new Date().toLocaleDateString("pt-BR") };
    if (row && mergeConfig?.alias) dados[mergeConfig.alias] = row;
    if (row) Object.assign(dados, row);
    return renderTemplate(templateHtml, dados, { highlightMissing: false }).html;
  };

  const currentHtml = useMemo(
    () => (rows.length ? renderForRow(rows[idx]) : renderForRow(null)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, idx, templateHtml, html, mergeConfig?.alias],
  );

  // ---------- Ações ----------
  const pdfAtual = async () => {
    if (!pageRef.current) return;
    setBusy(true);
    try { await downloadPdf(pageRef.current, { filename: `${titulo}${rows.length ? `_${idx + 1}` : ""}` }); }
    finally { setBusy(false); }
  };

  const pdfTodos = async () => {
    if (!rows.length) return pdfAtual();
    setBusy(true);
    const { default: jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-99999px;top:0;background:#fff;";
    document.body.appendChild(host);
    try {
      for (let i = 0; i < rows.length; i++) {
        const el = document.createElement("div");
        el.style.cssText = "width:210mm;min-height:297mm;padding:20mm;box-sizing:border-box;font-family:Arial,sans-serif;font-size:12pt;line-height:1.5;color:#000;background:#fff;";
        el.innerHTML = renderCleanForRow(rows[i]);
        host.appendChild(el);
        const blob = await elementToPdf(el);
        // Anexa páginas do blob individual ao pdf principal
        const bytes = new Uint8Array(await blob.arrayBuffer());
        // Fallback simples: gera cada registro como PDF independente e baixa concatenado via imagem
        // Para manter simples, usamos html2canvas por registro:
        host.removeChild(el);
        // Adiciona página no PDF principal usando canvas
        const html2canvas = (await import("html2canvas")).default;
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
        void bytes;
      }
      const url = URL.createObjectURL(pdf.output("blob"));
      const a = document.createElement("a");
      a.href = url; a.download = `${titulo}_todos.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`PDF gerado com ${rows.length} registros`);
    } catch (e: any) {
      toast.error("Erro ao gerar PDF: " + (e?.message ?? ""));
    } finally {
      document.body.removeChild(host);
      setBusy(false);
    }
  };

  const imprimirAtual = () => printHtml(renderCleanForRow(rows[idx] ?? null));

  const imprimirTodos = () => {
    if (!rows.length) return imprimirAtual();
    const paginas = rows.map((r, i) =>
      `<section style="page-break-after:${i < rows.length - 1 ? "always" : "auto"};padding:20mm;">${renderCleanForRow(r)}</section>`
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
            <FileDown className="h-4 w-4 mr-1" /> PDF {rows.length ? "atual" : ""}
          </Button>
          <Button size="sm" variant="outline" onClick={imprimirAtual} disabled={busy}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir {rows.length ? "atual" : ""}
          </Button>
          {rows.length > 1 && (
            <>
              <Button size="sm" variant="secondary" onClick={pdfTodos} disabled={busy}>
                <Layers className="h-4 w-4 mr-1" /> PDF de todos ({rows.length})
              </Button>
              <Button size="sm" variant="secondary" onClick={imprimirTodos} disabled={busy}>
                <Printer className="h-4 w-4 mr-1" /> Imprimir todos
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => downloadHtml(currentHtml, titulo)}>
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

        {(loadingRows || rows.length > 0) && (
          <div className="flex items-center gap-3 border-b p-2 bg-background">
            {loadingRows ? (
              <span className="text-xs text-muted-foreground">Carregando registros…</span>
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

        <div className="flex-1 overflow-auto bg-muted/20 p-6">
          <div
            ref={pageRef}
            className="bg-white text-black shadow-xl mx-auto"
            style={{ width: "210mm", minHeight: "297mm", padding: "20mm", boxSizing: "border-box", fontFamily: "Arial, sans-serif", fontSize: "12pt", lineHeight: 1.5 }}
            dangerouslySetInnerHTML={{ __html: currentHtml || '<p style="color:#999;text-align:center;padding:40px;">Documento vazio. Adicione conteúdo no editor.</p>' }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
