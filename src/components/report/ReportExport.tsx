import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

interface ReportExportProps {
  layout: any;
  data: any[];
  reportName: string;
}

export function ReportExport({ layout, data, reportName }: ReportExportProps) {
  const [exporting, setExporting] = useState(false);

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const element = document.getElementById("report-preview-export");
      if (!element) {
        toast.error("Elemento de pré-visualização não encontrado");
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(
        imgData,
        "PNG",
        imgX,
        imgY,
        imgWidth * ratio,
        imgHeight * ratio
      );
      pdf.save(`${reportName}.pdf`);
      toast.success("PDF exportado com sucesso");
    } catch (error: any) {
      toast.error("Erro ao exportar PDF: " + error.message);
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = () => {
    if (!data.length) {
      toast.error("Nenhum dado disponível para exportar");
      return;
    }

    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Dados");
      XLSX.writeFile(wb, `${reportName}.xlsx`);
      toast.success("Excel exportado com sucesso");
    } catch (error: any) {
      toast.error("Erro ao exportar Excel: " + error.message);
    }
  };

  const exportToImage = async () => {
    setExporting(true);
    try {
      const element = document.getElementById("report-preview-export");
      if (!element) {
        toast.error("Elemento de pré-visualização não encontrado");
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${reportName}.png`;
          link.click();
          URL.revokeObjectURL(url);
          toast.success("Imagem exportada com sucesso");
        }
      });
    } catch (error: any) {
      toast.error("Erro ao exportar imagem: " + error.message);
    } finally {
      setExporting(false);
    }
  };

  const exportToHTML = () => {
    try {
      const element = document.getElementById("report-preview-export");
      if (!element) {
        toast.error("Elemento de pré-visualização não encontrado");
        return;
      }

      const html = element.outerHTML;
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${reportName}.html`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("HTML exportado com sucesso");
    } catch (error: any) {
      toast.error("Erro ao exportar HTML: " + error.message);
    }
  };

  const exportToJSON = () => {
    try {
      const json = JSON.stringify({ layout, data }, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${reportName}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("JSON exportado com sucesso");
    } catch (error: any) {
      toast.error("Erro ao exportar JSON: " + error.message);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h3 className="font-semibold mb-4">Exportar Relatório</h3>
        <div className="grid grid-cols-2 gap-4">
          <Button onClick={exportToPDF} disabled={exporting}>
            <FileDown className="mr-2 h-4 w-4" />
            Exportar como PDF
          </Button>
          <Button onClick={exportToExcel} disabled={!data.length}>
            <FileDown className="mr-2 h-4 w-4" />
            Exportar como Excel
          </Button>
          <Button onClick={exportToImage} disabled={exporting}>
            <ImageIcon className="mr-2 h-4 w-4" />
            Exportar como Imagem
          </Button>
          <Button onClick={exportToHTML}>
            <FileDown className="mr-2 h-4 w-4" />
            Exportar como HTML
          </Button>
          <Button onClick={exportToJSON}>
            <FileDown className="mr-2 h-4 w-4" />
            Exportar como JSON
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-muted/30 p-4">
        <div
          id="report-preview-export"
          className="bg-white shadow-lg mx-auto relative"
          style={{
            width: "794px",
            minHeight: "1123px",
          }}
        >
          {(layout.elements || []).map((element: any) => (
            <div
              key={element.id}
              style={{
                position: "absolute",
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
              }}
            >
              {/* Renderizar elementos aqui - simplificado para export */}
              <div className="w-full h-full border">
                {element.type}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
