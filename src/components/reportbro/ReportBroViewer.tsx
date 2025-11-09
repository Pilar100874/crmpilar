import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileDown } from "lucide-react";
import { toast } from "sonner";
import "reportbro-designer/dist/reportbro.css";

export function ReportBroViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    loadReportFromStorage();
  }, []);

  useEffect(() => {
    if (reportData && containerRef.current) {
      renderStructuredView(reportData);
    }
  }, [reportData]);

  const loadReportFromStorage = () => {
    try {
      const jsonStr = localStorage.getItem("reportbro_preview");

      if (!jsonStr) {
        toast.error("Nenhum relatório para visualizar. Volte e clique em Visualizar novamente.");
        return;
      }

      const data = JSON.parse(jsonStr);
      if (!data || typeof data !== 'object') {
        toast.error("Dados do relatório inválidos");
        return;
      }

      setReportData(data);
      console.log("Relatório carregado:", data);
    } catch (error) {
      console.error("Erro ao carregar relatório:", error);
      toast.error(`Erro ao carregar relatório: ${error}`);
    }
  };

  const renderStructuredView = (data: any) => {
    if (!containerRef.current) return;

    const elements = data.docElements || [];
    const parameters = data.parameters || [];

    containerRef.current.innerHTML = `
      <div class="max-w-5xl mx-auto bg-white shadow-lg rounded-lg p-8 space-y-6">
        <div class="border-b pb-4">
          <h1 class="text-2xl font-bold text-gray-900">Preview do Relatório</h1>
          <p class="text-sm text-gray-600 mt-1">
            ${elements.length} elemento(s) • ${parameters.length} parâmetro(s)
          </p>
        </div>

        ${elements.length > 0 ? `
          <div class="space-y-4">
            <h2 class="text-lg font-semibold text-gray-800">Elementos do Relatório</h2>
            <div class="grid gap-3">
              ${elements.map((el: any, idx: number) => `
                <div class="border rounded-lg p-4 bg-gray-50">
                  <div class="flex items-start justify-between mb-2">
                    <span class="text-sm font-medium text-gray-700">
                      ${el.elementType || el.type || 'elemento'} #${idx + 1}
                    </span>
                    <span class="text-xs text-gray-500">
                      Posição: ${el.x || 0}, ${el.y || 0} | Tamanho: ${el.width || 0}×${el.height || 0}
                    </span>
                  </div>
                  ${el.content ? `
                    <div class="text-sm text-gray-900 mt-2 p-2 bg-white rounded border">
                      ${el.content}
                    </div>
                  ` : ''}
                  ${el.text ? `
                    <div class="text-sm text-gray-900 mt-2 p-2 bg-white rounded border">
                      ${el.text}
                    </div>
                  ` : ''}
                  ${el.dataSource ? `
                    <div class="text-xs text-gray-600 mt-2">
                      Fonte de dados: <strong>${el.dataSource}</strong>
                    </div>
                  ` : ''}
                  ${el.source ? `
                    <div class="text-xs text-gray-600 mt-2">
                      URL: ${el.source}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : '<p class="text-gray-500 text-center py-8">Nenhum elemento no relatório</p>'}

        ${parameters.length > 0 ? `
          <div class="space-y-4">
            <h2 class="text-lg font-semibold text-gray-800">Parâmetros Configurados</h2>
            <div class="grid gap-2">
              ${parameters.map((p: any) => `
                <div class="p-3 bg-blue-50 rounded border border-blue-200">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-sm font-medium text-blue-900">${p.name}</span>
                    <span class="text-xs text-blue-600">${p.type || 'string'}${p.arrayItemType ? ' (array de ' + p.arrayItemType + ')' : ''}</span>
                  </div>
                  ${p.children && p.children.length > 0 ? `
                    <div class="mt-2 pl-3 border-l-2 border-blue-300 space-y-1">
                      ${p.children.map((c: any) => `
                        <div class="text-xs text-blue-700">
                          • ${c.name} <span class="text-blue-500">(${c.type})</span>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                  ${p.testData ? `
                    <details class="mt-2">
                      <summary class="text-xs text-blue-600 cursor-pointer">Ver dados de teste</summary>
                      <pre class="text-xs bg-white p-2 rounded mt-1 overflow-x-auto">${typeof p.testData === 'string' ? p.testData.substring(0, 200) : JSON.stringify(p.testData).substring(0, 200)}...</pre>
                    </details>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p class="text-sm text-yellow-800">
            <strong>Nota:</strong> Esta é uma visualização estrutural do relatório. A renderização visual completa (PDF/HTML) está em desenvolvimento.
          </p>
        </div>
      </div>
    `;
  };

  const handleExportPDF = () => {
    toast.info("Exportação PDF em desenvolvimento");
    window.print();
  };

  const handleGoBack = () => {
    if (window.opener) {
      window.close();
    } else {
      window.location.href = "/relatorios";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="h-14 border-b flex items-center justify-between px-4 bg-card">
        <Button variant="ghost" size="sm" onClick={handleGoBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      <div ref={containerRef} className="p-4">
        {!reportData && (
          <div className="max-w-2xl mx-auto text-center text-muted-foreground py-16">
            Carregando relatório...
          </div>
        )}
      </div>
    </div>
  );
}
