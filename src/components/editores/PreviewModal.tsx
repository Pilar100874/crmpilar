import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, FileDown, X } from "lucide-react";
import { useRef } from "react";
import { downloadPdf, downloadHtml, printHtml } from "@/lib/editores/pdfExport";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  html: string;
  titulo: string;
  missing?: string[];
  onSave?: () => void;
}

export function PreviewModal({ open, onOpenChange, html, titulo, missing = [], onSave }: Props) {
  const pageRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] p-0 flex flex-col">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Pré-visualização — {titulo}</DialogTitle>
          <DialogDescription>Confira o documento antes de gerar. Campos vazios ficam destacados em amarelo.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 p-3 border-b bg-muted/30">
          <Button size="sm" onClick={async () => { if (pageRef.current) await downloadPdf(pageRef.current, { filename: titulo }); }}>
            <FileDown className="h-4 w-4 mr-1" /> Gerar PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => printHtml(html)}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadHtml(html, titulo)}>
            <Download className="h-4 w-4 mr-1" /> Baixar HTML
          </Button>
          {onSave && (
            <Button size="sm" variant="secondary" onClick={onSave}>
              Salvar no histórico
            </Button>
          )}
          {missing.length > 0 && (
            <span className="ml-auto text-xs text-amber-600 flex items-center gap-1">
              ⚠ Campos vazios: {missing.slice(0, 5).join(", ")}{missing.length > 5 ? "…" : ""}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-auto bg-muted/20 p-6">
          <div
            ref={pageRef}
            className="bg-white text-black shadow-xl mx-auto"
            style={{ width: "210mm", minHeight: "297mm", padding: "20mm", boxSizing: "border-box", fontFamily: "Arial, sans-serif", fontSize: "12pt", lineHeight: 1.5 }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
